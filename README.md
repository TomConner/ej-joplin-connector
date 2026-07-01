# Joplin MCP Server

MCP server for the [Joplin Data API](https://joplinapp.org/help/api/references/rest_api). Enables Claude and other MCP clients to manage Joplin notebooks.

## Features

- **Notes**: list, search, get, create, update, delete
- **Folders**: list tree, get, get notes, create nested, delete
- **Tags**: list, get, get notes, create, add/remove from notes, delete

## Requirements

- Node.js 18+
- Joplin desktop app with Web Clipper enabled

## Setup

1. In Joplin: **Tools > Options > Web Clipper** → enable it
2. `npm install`
3. `npm run build`

That's it! On the first tool call, Joplin will show a permission prompt — click "Grant authorization" to connect. No manual token copying needed.

## Running

```bash
node server/index.js
```

Dev mode with auto-reload:

```bash
npm run dev
```

## Adding to Claude Code

After building (`npm install && npm run build`), register the server with:

```bash
# from project directory
claude mcp add joplin -- node "$(pwd)/server/index.js"
```

To add it manually instead, edit `~/.claude/settings.json` (user-wide) or `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "joplin": {
      "command": "node",
      "args": ["/absolute/path/to/ej-joplin-connector/server/index.js"]
    }
  }
}
```

Verify it's registered with `claude mcp list`. On the first tool call, you'll be prompted in Joplin to grant access.

## Configuration

- **Authentication**: Automatic. On first use, Joplin shows a permission prompt — click "Grant authorization" to connect. Your token is cached at `~/.config/ej-joplin-connector/token` (mode 0600).
- **`JOPLIN_API_TOKEN` (optional)**: Set this env var to use a fixed token instead of interactive auth (useful for headless/CI setups). If set and invalid, the server will error instead of falling back to interactive auth.
- **Port auto-discovery**: Joplin port is auto-discovered in range 41184–41194.

## License

MIT
