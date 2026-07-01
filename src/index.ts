#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JoplinClient } from "./joplin-client.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerTagTools } from "./tools/tags.js";

async function main(): Promise<void> {
  const token = process.env.JOPLIN_API_TOKEN;
  if (!token) {
    process.stderr.write(
      "ERROR: JOPLIN_API_TOKEN is not set.\n" +
      "Get your token from: Joplin > Tools > Options > Web Clipper > Advanced\n"
    );
    process.exit(1);
  }

  // JoplinClient connects lazily on the first tool call — server starts even if Joplin is not yet open.
  const client = new JoplinClient(token);

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
