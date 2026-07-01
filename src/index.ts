#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JoplinClient } from "./joplin-client.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerTagTools } from "./tools/tags.js";

async function main(): Promise<void> {
  // JoplinClient connects lazily on the first tool call — server starts even if Joplin is not yet open.
  // JOPLIN_API_TOKEN is an optional override for headless/CI use; otherwise the client authenticates
  // interactively against Joplin on first use (same flow as the Web Clipper browser extension).
  const client = new JoplinClient(process.env.JOPLIN_API_TOKEN);

  const server = new McpServer({ name: "joplin-mcp-server", version: "1.0.0" });

  registerNoteTools(server, client);
  registerFolderTools(server, client);
  registerTagTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
