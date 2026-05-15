# Joplin MCP Server

A Model Context Protocol (MCP) server for the [Joplin Data API](https://joplinapp.org/help/api/references/rest_api). This server enables Claude and other MCP clients to interact with your Joplin notebook through a well-designed set of tools.

## Features

### Notes
- **List notes** with pagination and sorting
- **Search notes** using full-text search
- **Get note** details and content
- **Create notes** with Markdown or HTML
- **Update notes** (title, body, todo status)
- **Delete notes** (to trash or permanently)

### Folders (Notebooks)
- **List all folders** as a tree structure
- **Get folder** details
- **Get notes in folder**
- **Create nested folders**
- **Delete folders**

### Tags
- **List all tags**
- **Get tag details**
- **Get notes with tag**
- **Create tags**
- **Add/remove tags from notes**
- **Delete tags**

## Requirements

- Node.js 18+
- Joplin (desktop app) with Web Clipper enabled
- Joplin API token

## Setup

### 1. Get Your API Token

1. Open Joplin
2. Go to **Tools > Options > Web Clipper**
3. Enable the Web Clipper service (if not already enabled)
4. Copy your API token from the **Advanced** section

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Server

```bash
npm run build
```

## Running the Server

### With stdio transport (for local use with Claude):

```bash
export JOPLIN_API_TOKEN="your-token-here"
node dist/index.js
```

### Development mode with auto-reload:

```bash
export JOPLIN_API_TOKEN="your-token-here"
npm run dev
```

## Configuration

### Environment Variables

- `JOPLIN_API_TOKEN` (required): Your Joplin API token
- Default Joplin port: `41184` (auto-discovers within range 41184-41194)

## Available Tools

### Note Tools

#### `joplin_list_notes`
List all notes with pagination and sorting.

```
Parameters:
- limit: 1-100 (default: 20)
- page: Page number (default: 1)
- order_by: Field to sort by (default: 'updated_time')
- order_dir: ASC or DESC (default: DESC)
- fields: Comma-separated field names
- response_format: 'markdown' or 'json' (default: 'markdown')
```

#### `joplin_search_notes`
Search for notes using Joplin's search syntax.

```
Parameters:
- query: Search query (required)
- limit: Maximum results (default: 20)
- response_format: 'markdown' or 'json'
```

#### `joplin_get_note`
Get a specific note by ID with full content.

```
Parameters:
- id: Note ID (required)
- fields: Comma-separated field names
- response_format: 'markdown' or 'json'
```

#### `joplin_create_note`
Create a new note.

```
Parameters:
- title: Note title (required)
- body: Markdown content (optional)
- parent_id: Folder ID (optional)
- is_todo: 0 or 1 (optional)
- todo_due: Unix timestamp in milliseconds (optional)
- response_format: 'markdown' or 'json'
```

#### `joplin_update_note`
Update an existing note.

```
Parameters:
- id: Note ID (required)
- title: New title (optional)
- body: New content (optional)
- todo_completed: Timestamp when marked complete, or 0 for incomplete
- response_format: 'markdown' or 'json'
```

#### `joplin_delete_note`
Delete a note.

```
Parameters:
- id: Note ID (required)
- permanent: true to delete permanently, false for trash (default: false)
```

### Folder Tools

#### `joplin_list_folders`
List all notebooks as a tree structure.

```
Parameters:
- response_format: 'markdown' or 'json'
```

#### `joplin_get_folder`
Get a specific folder by ID.

```
Parameters:
- id: Folder ID (required)
- response_format: 'markdown' or 'json'
```

#### `joplin_get_folder_notes`
Get all notes in a folder.

```
Parameters:
- id: Folder ID (required)
- limit: Maximum notes (default: 20)
- response_format: 'markdown' or 'json'
```

#### `joplin_create_folder`
Create a new folder.

```
Parameters:
- title: Folder name (required)
- parent_id: Parent folder ID (optional)
- response_format: 'markdown' or 'json'
```

#### `joplin_delete_folder`
Delete a folder.

```
Parameters:
- id: Folder ID (required)
- permanent: true to delete permanently, false for trash (default: false)
```

### Tag Tools

#### `joplin_list_tags`
List all tags.

```
Parameters:
- limit: Maximum tags (default: 20)
- response_format: 'markdown' or 'json'
```

#### `joplin_get_tag`
Get a specific tag by ID.

```
Parameters:
- id: Tag ID (required)
- response_format: 'markdown' or 'json'
```

#### `joplin_get_tag_notes`
Get all notes with a specific tag.

```
Parameters:
- id: Tag ID (required)
- limit: Maximum notes (default: 20)
- response_format: 'markdown' or 'json'
```

#### `joplin_create_tag`
Create a new tag.

```
Parameters:
- title: Tag name (required)
- response_format: 'markdown' or 'json'
```

#### `joplin_add_tag_to_note`
Add a tag to a note.

```
Parameters:
- tag_id: Tag ID (required)
- note_id: Note ID (required)
```

#### `joplin_remove_tag_from_note`
Remove a tag from a note.

```
Parameters:
- tag_id: Tag ID (required)
- note_id: Note ID (required)
```

#### `joplin_delete_tag`
Delete a tag.

```
Parameters:
- id: Tag ID (required)
- permanent: true to delete permanently, false for trash (default: false)
```

## Architecture

### Project Structure

```
joplin-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Configuration constants
│   ├── utils.ts              # Utility functions
│   ├── joplin-client.ts      # Joplin API client
│   └── tools/
│       ├── notes.ts          # Note management tools
│       ├── folders.ts        # Folder management tools
│       └── tags.ts           # Tag management tools
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── dist/                     # Compiled JavaScript (generated)
└── README.md                 # This file
```

### Design Decisions

1. **Composable API Client**: The `JoplinClient` class handles all HTTP communication, error handling, and token management. This keeps API logic centralized and easy to test.

2. **Tool-First Architecture**: Each domain (notes, folders, tags) has its own tool file, making the codebase modular and maintainable.

3. **Response Formats**: All tools support both Markdown (human-readable) and JSON (machine-readable) formats, allowing flexible integration.

4. **Error Handling**: Clear, actionable error messages guide users toward solutions (e.g., authentication errors include instructions for getting the token).

5. **Pagination**: List tools support pagination with `limit` and `page` parameters, preventing memory exhaustion with large datasets.

## Development

### Build

```bash
npm run build
```

### Development with Auto-Reload

```bash
npm run dev
```

### Clean

```bash
npm run clean
```

## Error Handling

The server provides clear error messages for common issues:

- **Missing API Token**: Instructs user how to get their token
- **Connection Errors**: Suggests checking if Joplin is running
- **Authentication Errors**: Indicates the token may be invalid
- **Not Found Errors**: Specifies which resource wasn't found
- **Rate Limiting**: Advises waiting before retrying

## Security Considerations

- **Token Storage**: The API token should be stored in environment variables, not in code
- **Token in URLs**: Tokens are passed securely as query parameters in HTTPS requests (all Joplin API calls use HTTP localhost by default)
- **No Token Logging**: Tokens are never logged or included in error messages

## Limitations

- The Joplin Web Clipper service must be running
- Full-text search is only available for notes (folders and tags use case-insensitive prefix matching)
- File upload for resources is not yet implemented (can be added in future versions)
- Encryption is not handled by this server (handled by Joplin)

## Future Enhancements

- [ ] Resource management (upload, download, list)
- [ ] Revision management (get note history)
- [ ] Event streaming (monitor changes in real-time)
- [ ] Batch operations (bulk create/update)
- [ ] Custom field support
- [ ] Notebook sharing management

## Testing

The server includes evaluation tests in `evaluations.xml` that verify:

1. Note CRUD operations
2. Folder hierarchy management
3. Tag assignment and filtering
4. Search functionality
5. Pagination handling

Run evaluations with the MCP evaluation framework.

## Contributing

Improvements and bug reports are welcome. Please ensure:

1. Code passes `npm run build` without errors
2. Types are strict (no `any` types)
3. Error messages are helpful and actionable
4. New tools include comprehensive descriptions

## License

MIT

## Support

For issues related to:
- **Joplin API**: See [Joplin Data API Documentation](https://joplinapp.org/help/api/references/rest_api)
- **MCP Protocol**: See [Model Context Protocol](https://modelcontextprotocol.io)
- **This Server**: Check the error message and ensure Joplin is running with Web Clipper enabled
