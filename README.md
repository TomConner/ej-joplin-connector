# Joplin MCP Server

MCP server for the [Joplin Data API](https://joplinapp.org/help/api/references/rest_api). Enables Claude and other MCP clients to manage Joplin notebooks.

## Features

- **Notes**: list, search, get, create, update, delete
- **Folders**: list tree, get, get notes, create nested, delete
- **Tags**: list, get, get notes, create, add/remove from notes, delete

## Requirements

- Node.js 18+
- Joplin desktop app with Web Clipper enabled
- Joplin API token

## Setup

1. In Joplin: **Tools > Options > Web Clipper** → enable, copy API token from Advanced section, and paste it into `~/.config/ej-joplin-connector/.joplin-token`
2. `npm install`
3. `npm run build`

## Running

```bash
export JOPLIN_API_TOKEN="$(<~/.config/ej-joplin-connector/.joplin-token)"
node dist/index.js
```

Dev mode with auto-reload:

```bash
export JOPLIN_API_TOKEN="your-token-here"
npm run dev
```

## Adding to Claude Code

After building (`npm install && npm run build`), register the server with:

```bash
# from project directory
claude mcp add joplin -e JOPLIN_API_TOKEN="$(<~/.config/ej-joplin-connector/.joplin-token)" -- node "$(pwd)/server/index.js"
```

To add it manually instead, edit `~/.claude/settings.json` (user-wide) or `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "joplin": {
      "command": "node",
      "args": ["/absolute/path/to/ej-joplin-connector/server/index.js"],
      "env": {
        "JOPLIN_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Verify it's registered with `claude mcp list`.

## Configuration

- `JOPLIN_API_TOKEN` (required): Joplin API token
- Joplin port auto-discovered in range 41184–41194

## License

MIT
