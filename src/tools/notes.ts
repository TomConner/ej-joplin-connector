/**
 * Note management tools for Joplin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JoplinClient } from "../joplin-client.js";
import { JoplinNote, ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT, CHARACTER_LIMIT } from "../constants.js";
import { formatMarkdownNote, truncateIfNeeded } from "../utils.js";

const ResponseFormatEnum = z.enum(["markdown", "json"]).default("markdown");

export function registerNoteTools(server: McpServer, client: JoplinClient): void {
  // List all notes
  const listNotesSchema = z.object({
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
      .describe("Maximum number of notes to return"),
    page: z.number().int().min(1).default(1)
      .describe("Page number for pagination"),
    order_by: z.string().default("updated_time")
      .describe("Field to sort by (e.g., 'updated_time', 'created_time', 'title')"),
    order_dir: z.enum(["ASC", "DESC"]).default("DESC")
      .describe("Sort direction: ASC or DESC"),
    fields: z.string().optional()
      .describe("Comma-separated list of fields to return"),
    response_format: ResponseFormatEnum
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
  }).strict();

  server.registerTool(
    "joplin_list_notes",
    {
      title: "List Joplin Notes",
      description: `List all notes in Joplin. Supports pagination and sorting.

This tool retrieves notes from your Joplin notebook with customizable pagination, sorting, and field selection. By default, it excludes deleted and conflict notes.

Args:
  - limit: Maximum notes to return (1-100, default: 20)
  - page: Page number (default: 1)
  - order_by: Sort field (default: 'updated_time')
  - order_dir: Sort direction - ASC or DESC (default: DESC)
  - fields: Comma-separated field names to include
  - response_format: Output format (default: 'markdown')

Returns:
  List of notes with id, title, creation/update times, and other metadata.

Examples:
  - Get recent notes: use default parameters
  - Get notes from page 2: params with page=2
  - Get notes sorted by title: params with order_by='title'`,
      inputSchema: listNotesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>("/notes", {
          limit: params.limit,
          page: params.page,
          order_by: params.order_by,
          order_dir: params.order_dir,
          fields: params.fields
        });

        const notes = response.items || [];
        let text = `# Notes (Page ${params.page})\n\n`;
        text += `Found ${response.items?.length || 0} notes`;
        if (response.has_more) {
          text += ` (more available)`;
        }
        text += "\n\n";

        if (notes.length === 0) {
          text += "No notes found.";
        } else {
          for (const note of notes) {
            text += `## ${note.title} (${note.id})\n`;
            text += `- **Created**: ${new Date(note.created_time).toLocaleString()}\n`;
            text += `- **Updated**: ${new Date(note.updated_time).toLocaleString()}\n`;
            if (note.is_todo) {
              text += `- **Type**: Todo\n`;
              if (note.todo_completed) {
                text += `- **Status**: Completed\n`;
              }
            }
            text += "\n";
          }
        }

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(response, null, 2);
        }

        result = truncateIfNeeded(result, CHARACTER_LIMIT, "notes");
        return {
          content: [{ type: "text", text: result }],
          structuredContent: response
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error listing notes: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get note by ID
  const getNoteSchema = z.object({
    id: z.string().describe("The note ID"),
    fields: z.string().optional().describe("Comma-separated field names"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_get_note",
    {
      title: "Get Joplin Note",
      description: `Get a specific note by ID.

Retrieves the full content and metadata of a note.

Args:
  - id: The note ID (required)
  - fields: Comma-separated field names to include
  - response_format: Output format (default: 'markdown')`,
      inputSchema: getNoteSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const note = await client.get<JoplinNote>(`/notes/${params.id}`, {
          fields: params.fields
        });

        let text = formatMarkdownNote(note);

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(note, null, 2);
        }

        result = truncateIfNeeded(result, CHARACTER_LIMIT, "note content");
        return {
          content: [{ type: "text", text: result }],
          structuredContent: note
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Create note
  const createNoteSchema = z.object({
    title: z.string().min(1).describe("Note title"),
    body: z.string().optional().describe("Note content in Markdown"),
    parent_id: z.string().optional().describe("Parent folder ID"),
    is_todo: z.number().int().min(0).max(1).optional().describe("1 if this is a todo, 0 otherwise"),
    todo_due: z.number().optional().describe("Todo due date as Unix timestamp"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_create_note",
    {
      title: "Create Joplin Note",
      description: `Create a new note in Joplin.

Creates a new note with the provided title and optional content.

Args:
  - title: Note title (required)
  - body: Note content in Markdown format
  - parent_id: Parent folder ID (if not specified, goes to default location)
  - is_todo: Set to 1 to make this a todo note
  - todo_due: Due date for todo as Unix timestamp in milliseconds
  - response_format: Output format (default: 'markdown')

Returns:
  The created note with its ID and metadata.

Example:
  - Create a simple note: title="Meeting Notes", body="Discussion points..."
  - Create a todo: is_todo=1, title="Task", todo_due=1234567890000`,
      inputSchema: createNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const data: any = {
          title: params.title
        };
        if (params.body) data.body = params.body;
        if (params.parent_id) data.parent_id = params.parent_id;
        if (params.is_todo !== undefined) data.is_todo = params.is_todo;
        if (params.todo_due) data.todo_due = params.todo_due;

        const note = await client.post<JoplinNote>("/notes", data);

        let text = `# Note Created\n\n`;
        text += `**ID**: ${note.id}\n`;
        text += `**Title**: ${note.title}\n`;
        text += `**Created**: ${new Date(note.created_time).toLocaleString()}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(note, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: note
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Update note
  const updateNoteSchema = z.object({
    id: z.string().describe("Note ID"),
    title: z.string().optional().describe("New note title"),
    body: z.string().optional().describe("New note content"),
    todo_completed: z.number().optional().describe("Unix timestamp in milliseconds when todo was completed, or 0 to mark as incomplete"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_update_note",
    {
      title: "Update Joplin Note",
      description: `Update an existing note.

Updates only the fields you provide. Other fields remain unchanged.

Args:
  - id: Note ID (required)
  - title: New note title
  - body: New note content in Markdown
  - todo_completed: Set timestamp to mark todo as complete, or 0 for incomplete
  - response_format: Output format (default: 'markdown')`,
      inputSchema: updateNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const data: any = {};
        if (params.title) data.title = params.title;
        if (params.body !== undefined) data.body = params.body;
        if (params.todo_completed !== undefined) data.todo_completed = params.todo_completed;

        const note = await client.put<JoplinNote>(`/notes/${params.id}`, data);

        let text = `# Note Updated\n\n`;
        text += `**ID**: ${note.id}\n`;
        text += `**Title**: ${note.title}\n`;
        text += `**Updated**: ${new Date(note.updated_time).toLocaleString()}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(note, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: note
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error updating note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete note
  const deleteNoteSchema = z.object({
    id: z.string().describe("Note ID"),
    permanent: z.boolean().default(false).describe("If true, permanently delete; if false, move to trash")
  }).strict();

  server.registerTool(
    "joplin_delete_note",
    {
      title: "Delete Joplin Note",
      description: `Delete a note.

By default, moves the note to trash. Use permanent=true to permanently delete it.

Args:
  - id: Note ID (required)
  - permanent: Permanently delete instead of moving to trash (default: false)`,
      inputSchema: deleteNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.delete(`/notes/${params.id}`, {
          permanent: params.permanent ? 1 : 0
        });

        const action = params.permanent ? "permanently deleted" : "moved to trash";
        return {
          content: [{
            type: "text",
            text: `# Note ${action}\n\nNote ID: ${params.id}`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting note: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Search notes
  const searchNotesSchema = z.object({
    query: z.string().min(1).describe("Search query"),
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_search_notes",
    {
      title: "Search Joplin Notes",
      description: `Search for notes using full-text search.

Supports the Joplin search syntax for advanced queries.

Args:
  - query: Search query (required)
  - limit: Maximum results to return
  - response_format: Output format`,
      inputSchema: searchNotesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>("/search", {
          query: params.query,
          limit: params.limit
        });

        const items = response.items || [];
        let text = `# Search Results for "${params.query}"\n\n`;
        text += `Found ${items.length} result${items.length !== 1 ? 's' : ''}.\n\n`;

        if (items.length === 0) {
          text += "No notes match your search query.";
        } else {
          for (const item of items) {
            text += `## ${item.title} (${item.id})\n`;
            text += "\n";
          }
        }

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(response, null, 2);
        }

        result = truncateIfNeeded(result, CHARACTER_LIMIT, "search results");
        return {
          content: [{ type: "text", text: result }],
          structuredContent: response
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error searching notes: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
