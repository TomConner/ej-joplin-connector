#!/usr/bin/env node
/**
 * MCP Server for Joplin Data API
 *
 * This server provides tools to interact with your Joplin notebook, including:
 * - Note management (create, read, update, delete, search)
 * - Folder management (create, list, organize)
 * - Tag management (create, list, add/remove tags)
 * - Resource management (list, download)
 *
 * Prerequisites:
 * 1. Joplin must be running with Web Clipper enabled
 * 2. Get your API token from Joplin > Tools > Options > Web Clipper > Advanced
 * 3. Set the JOPLIN_API_TOKEN environment variable
 *
 * Usage:
 * export JOPLIN_API_TOKEN="your-token-here"
 * node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JoplinClient } from "./joplin-client.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerTagTools } from "./tools/tags.js";

// Initialize MCP server
const server = new McpServer({
  name: "joplin-mcp-server",
  version: "1.0.0"
});

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Get API token from environment
  const token = process.env.JOPLIN_API_TOKEN;
  if (!token) {
    console.error(
      "ERROR: JOPLIN_API_TOKEN environment variable is required.\n" +
      "Get your token from: Joplin > Tools > Options > Web Clipper > Advanced\n" +
      "Usage: export JOPLIN_API_TOKEN=\"your-token\" && node dist/index.js"
    );
    process.exit(1);
  }

  try {
    // Connect to Joplin service
    console.error("Connecting to Joplin service...");
    const client = await JoplinClient.findJoplinService(token);
    console.error("Connected to Joplin successfully!");

    // Verify we can ping the service
    const pong = await client.ping();
    console.error(`Pong: ${pong}`);

    // Register all tools
    console.error("Registering tools...");
    registerNoteTools(server, client);
    registerFolderTools(server, client);
    registerTagTools(server, client);
    console.error("All tools registered successfully!");

    // Connect stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server running via stdio");
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
