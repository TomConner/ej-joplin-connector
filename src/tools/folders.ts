/**
 * Folder (notebook) management tools for Joplin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JoplinClient } from "../joplin-client.js";
import { JoplinFolder, ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

const ResponseFormatEnum = z.enum(["markdown", "json"]).default("markdown");

export function registerFolderTools(server: McpServer, client: JoplinClient): void {
  // List all folders
  const listFoldersSchema = z.object({
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_list_folders",
    {
      title: "List Joplin Folders",
      description: `List all notebooks (folders) in Joplin.

Returns a tree structure showing the hierarchy of notebooks.

Args:
  - response_format: Output format (default: 'markdown')

Returns:
  A tree of all folders with their IDs and titles.`,
      inputSchema: listFoldersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>("/folders");

        function formatFolderTree(folders: any[], indent: string = ""): string {
          let text = "";
          for (const folder of folders) {
            text += `${indent}- **${folder.title}** (${folder.id})\n`;
            if (folder.children && folder.children.length > 0) {
              text += formatFolderTree(folder.children, indent + "  ");
            }
          }
          return text;
        }

        let text = "# Joplin Folders\n\n";
        if (!response || response.length === 0) {
          text += "No folders found.";
        } else {
          text += formatFolderTree(response);
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
            text: `Error listing folders: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get folder by ID
  const getFolderSchema = z.object({
    id: z.string().describe("The folder ID"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_get_folder",
    {
      title: "Get Joplin Folder",
      description: `Get a specific folder by ID.

Args:
  - id: The folder ID (required)
  - response_format: Output format (default: 'markdown')`,
      inputSchema: getFolderSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const folder = await client.get<JoplinFolder>(`/folders/${params.id}`);

        let text = `# Folder: ${folder.title}\n\n`;
        text += `**ID**: ${folder.id}\n`;
        text += `**Created**: ${new Date(folder.created_time).toLocaleString()}\n`;
        text += `**Updated**: ${new Date(folder.updated_time).toLocaleString()}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(folder, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: folder
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting folder: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get notes in folder
  const getFolderNotesSchema = z.object({
    id: z.string().describe("The folder ID"),
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_get_folder_notes",
    {
      title: "Get Notes in Folder",
      description: `Get all notes in a specific folder.

Args:
  - id: The folder ID (required)
  - limit: Maximum notes to return
  - response_format: Output format (default: 'markdown')`,
      inputSchema: getFolderNotesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const response = await client.get<any>(`/folders/${params.id}/notes`, {
          limit: params.limit
        });

        const notes = response.items || [];
        let text = `# Notes in Folder\n\n`;
        text += `Found ${notes.length} note${notes.length !== 1 ? 's' : ''}.\n\n`;

        if (notes.length === 0) {
          text += "No notes in this folder.";
        } else {
          for (const note of notes) {
            text += `## ${note.title} (${note.id})\n`;
            text += `- Updated: ${new Date(note.updated_time).toLocaleString()}\n\n`;
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
            text: `Error getting folder notes: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Create folder
  const createFolderSchema = z.object({
    title: z.string().min(1).describe("Folder title"),
    parent_id: z.string().optional().describe("Parent folder ID"),
    response_format: ResponseFormatEnum
  }).strict();

  server.registerTool(
    "joplin_create_folder",
    {
      title: "Create Joplin Folder",
      description: `Create a new notebook folder.

Args:
  - title: Folder name (required)
  - parent_id: Parent folder ID for nesting
  - response_format: Output format (default: 'markdown')`,
      inputSchema: createFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const data: any = { title: params.title };
        if (params.parent_id) data.parent_id = params.parent_id;

        const folder = await client.post<JoplinFolder>("/folders", data);

        let text = `# Folder Created\n\n`;
        text += `**ID**: ${folder.id}\n`;
        text += `**Title**: ${folder.title}\n`;

        let result = text;
        if (params.response_format === "json") {
          result = JSON.stringify(folder, null, 2);
        }

        return {
          content: [{ type: "text", text: result }],
          structuredContent: folder
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating folder: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete folder
  const deleteFolderSchema = z.object({
    id: z.string().describe("Folder ID"),
    permanent: z.boolean().default(false).describe("Permanently delete instead of moving to trash")
  }).strict();

  server.registerTool(
    "joplin_delete_folder",
    {
      title: "Delete Joplin Folder",
      description: `Delete a folder.

By default, moves to trash. Use permanent=true to permanently delete.

Args:
  - id: Folder ID (required)
  - permanent: Permanently delete (default: false)`,
      inputSchema: deleteFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.delete(`/folders/${params.id}`, {
          permanent: params.permanent ? 1 : 0
        });

        const action = params.permanent ? "permanently deleted" : "moved to trash";
        return {
          content: [{
            type: "text",
            text: `# Folder ${action}\n\nFolder ID: ${params.id}`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting folder: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
