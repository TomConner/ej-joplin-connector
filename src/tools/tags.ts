/**
 * Tag management tools for Joplin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JoplinClient } from "../joplin-client.js";
import { JoplinTag, ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

const ResponseFormatEnum = z.enum(["markdown", "json"]).default("markdown");

export function registerTagTools(server: McpServer, client: JoplinClient): void {
  // List all tags
  const listTagsSchema = z.object({
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_list_tags",
    {
      title: "List Joplin Tags",
      description: `List all tags in Joplin.

Args:
  - limit: Maximum tags to return
  - response_format: Output format (default: 'markdown')`,
      inputSchema: listTagsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>("/tags", {
          limit: params.limit
        });

        const tags = response.items || [];
        let text = `# Joplin Tags\n\n`;
        text += `Found ${tags.length} tag${tags.length !== 1 ? 's' : ''}.\n\n`;

        if (tags.length === 0) {
          text += "No tags found.";
        } else {
          for (const tag of tags) {
            text += `- **${tag.title}** (${tag.id})\n`;
          }
        }

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(response, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: response
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error listing tags: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get tag by ID
  const getTagSchema = z.object({
    id: z.string().describe("The tag ID"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_get_tag",
    {
      title: "Get Joplin Tag",
      description: `Get a specific tag by ID.

Args:
  - id: The tag ID (required)
  - response_format: Output format (default: 'markdown')`,
      inputSchema: getTagSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const tag = await client.get<JoplinTag>(`/tags/${params.id}`);

        let text = `# Tag: ${tag.title}\n\n`;
        text += `**ID**: ${tag.id}\n`;
        text += `**Created**: ${new Date(tag.created_time).toLocaleString()}\n`;
        text += `**Updated**: ${new Date(tag.updated_time).toLocaleString()}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(tag, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: tag
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting tag: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get notes with tag
  const getTagNotesSchema = z.object({
    id: z.string().describe("The tag ID"),
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_get_tag_notes",
    {
      title: "Get Notes with Tag",
      description: `Get all notes with a specific tag.

Args:
  - id: The tag ID (required)
  - limit: Maximum notes to return
  - response_format: Output format (default: 'markdown')`,
      inputSchema: getTagNotesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>(`/tags/${params.id}/notes`, {
          limit: params.limit
        });

        const notes = response.items || [];
        let text = `# Notes with Tag\n\n`;
        text += `Found ${notes.length} note${notes.length !== 1 ? 's' : ''}.\n\n`;

        if (notes.length === 0) {
          text += "No notes with this tag.";
        } else {
          for (const note of notes) {
            text += `## ${note.title} (${note.id})\n`;
          }
        }

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(response, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: response
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting tag notes: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Create tag
  const createTagSchema = z.object({
    title: z.string().min(1).describe("Tag name"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_create_tag",
    {
      title: "Create Joplin Tag",
      description: `Create a new tag.

Args:
  - title: Tag name (required)
  - response_format: Output format (default: 'markdown')`,
      inputSchema: createTagSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const tag = await client.post<JoplinTag>("/tags", {
          title: params.title
        });

        let text = `# Tag Created\n\n`;
        text += `**ID**: ${tag.id}\n`;
        text += `**Title**: ${tag.title}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(tag, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: tag
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating tag: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Add tag to note
  const addTagToNoteSchema = z.object({
    tag_id: z.string().describe("The tag ID"),
    note_id: z.string().describe("The note ID")
  }).strict();

  server.registerTool(
    "joplin_add_tag_to_note",
    {
      title: "Add Tag to Note",
      description: `Add a tag to a note.

Args:
  - tag_id: The tag ID (required)
  - note_id: The note ID (required)`,
      inputSchema: addTagToNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.post(`/tags/${params.tag_id}/notes`, {
          id: params.note_id
        });

        return {
          content: [{
            type: "text",
            text: `# Tag Added\n\nTag added to note successfully.`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error adding tag to note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Remove tag from note
  const removeTagFromNoteSchema = z.object({
    tag_id: z.string().describe("The tag ID"),
    note_id: z.string().describe("The note ID")
  }).strict();

  server.registerTool(
    "joplin_remove_tag_from_note",
    {
      title: "Remove Tag from Note",
      description: `Remove a tag from a note.

Args:
  - tag_id: The tag ID (required)
  - note_id: The note ID (required)`,
      inputSchema: removeTagFromNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.delete(`/tags/${params.tag_id}/notes/${params.note_id}`);

        return {
          content: [{
            type: "text",
            text: `# Tag Removed\n\nTag removed from note successfully.`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error removing tag from note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete tag
  const deleteTagSchema = z.object({
    id: z.string().describe("Tag ID"),
    permanent: z.boolean().default(false)
  }).strict();

  server.registerTool(
    "joplin_delete_tag",
    {
      title: "Delete Joplin Tag",
      description: `Delete a tag.

Args:
  - id: Tag ID (required)
  - permanent: Permanently delete (default: false)`,
      inputSchema: deleteTagSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.delete(`/tags/${params.id}`, {
          permanent: params.permanent ? 1 : 0
        });

        return {
          content: [{
            type: "text",
            text: `# Tag Deleted\n\nTag deleted successfully.`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting tag: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
