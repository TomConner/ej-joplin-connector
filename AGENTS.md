# Joplin MCP Server — Agent & Maintainer Guide

## Project Structure

```
src/
├── index.ts          # Entry point: MCP server setup, tool registration
├── types.ts          # Joplin data structures, enums (ResponseFormat, SortDirection)
├── constants.ts      # DEFAULT_LIMIT, CHARACTER_LIMIT, REQUEST_TIMEOUT, port range
├── utils.ts          # formatMarkdownNote(), truncateIfNeeded(), convertToMarkdownList()
├── joplin-client.ts  # HTTP client: ping(), get(), post(), put(), delete()
└── tools/
    ├── notes.ts      # Note CRUD, search, todo management
    ├── folders.ts    # Notebook/folder hierarchy
    └── tags.ts       # Tags and note-tag associations
```

## Architecture

Request flow:

```
MCP client request
  → MCP server dispatches to tool handler (index.ts)
  → Tool validates input with Zod schema
  → JoplinClient makes HTTP request
  → Response formatted (Markdown or JSON)
  → truncateIfNeeded() enforces CHARACTER_LIMIT
  → Return to client
```

`JoplinClient` centralizes all HTTP communication, auth, port discovery, and error translation. Tool modules are purely domain logic — they never make HTTP calls directly.

## Design Decisions

### Atomic tools over high-level workflows
Each tool maps 1:1 to a Joplin API operation. LLMs compose them; users understand them individually. Avoid adding "convenience" multi-step tools — they obscure what's happening and complicate error handling.

### Token as query parameter
Required by Joplin API design. Stateless. Never put tokens in headers or log them — the client strips them from error messages.

### Automatic port discovery (41184–41194)
Joplin may grab a different port if 41184 is busy. Discovery probes sequentially and fails with a clear message if nothing responds. Don't hardcode the port.

### Character limit truncation
`truncateIfNeeded()` in `utils.ts` caps responses at `CHARACTER_LIMIT`. LLM context windows are finite; truncated responses include a hint to paginate or filter.

### Zod schema validation on every tool
TypeScript types disappear at runtime. Zod validates inputs and generates readable error messages. Every tool parameter must have a Zod schema — no exceptions.

### Types extend `Record<string, unknown>`
MCP SDK requires this for tool result types. Don't remove it to "clean up" the types.

### Response format parameter
All tools accept `response_format: 'markdown' | 'json'`. Markdown is the default for human-readable output; JSON for programmatic use. Both paths must be tested when modifying a tool.

## Tool Annotations

Every tool declares behavior hints for MCP clients:

```typescript
annotations: {
  readOnlyHint: true/false,    // modifies Joplin state?
  destructiveHint: true/false, // deletes or overwrites?
  idempotentHint: true/false,  // safe to repeat?
  openWorldHint: true          // always true — external service
}
```

Keep these accurate. MCP clients use them for safety decisions.

## Adding a New Tool

1. Add Zod input schema
2. Implement handler — all HTTP via `JoplinClient`, all errors caught and re-thrown as user-friendly strings
3. Register with `server.registerTool()` in `index.ts`
4. Write a comprehensive description with parameter examples (the description is the only docs an LLM sees)
5. Set correct tool annotations
6. Add test case to `evaluations.xml`
7. Record any non-obvious design choice in this file

## Code Quality Standards

- TypeScript strict mode — no `any`, use `unknown` or precise types
- All async operations wrapped in try-catch; errors surface as human-readable messages with no internal stack details exposed
- No token logging anywhere, including error messages
- Tool descriptions must be self-contained — describe parameters, accepted values, and example usage

## Debugging

Verify Joplin is reachable:

```bash
curl http://localhost:41184/ping?token=YOUR_TOKEN
# Expected: "JoplinClipperServer"
```

Add temporary logging to `JoplinClient`:

```typescript
console.error(`GET ${endpoint}`, params);
```

Log tool registration in `index.ts` before `server.connect()`:

```typescript
console.error("Tool registered: joplin_list_notes");
```

All debug logs use `console.error` (stdout is reserved for MCP stdio transport).

## Performance Notes

- `DEFAULT_LIMIT = 20`, max 100 — prevents timeout and context overflow on large notebooks
- `REQUEST_TIMEOUT = 30000ms` — increase only for known-slow networks
- No explicit caching — each request is fresh for consistency. Joplin handles its own caching.

## Security

- Tokens via environment variable only — never in code or config files
- Tokens pass as query parameters (Joplin API requirement); acceptable for localhost
- No SQL injection surface (REST client, not DB)
- Zod validation covers all input boundaries

## Known Limitations

- Web Clipper service must be running in Joplin desktop
- Full-text search available for notes only; folders/tags use prefix matching
- Resource file upload not implemented
- Encryption handled entirely by Joplin — this server does not touch encrypted content
- Exponential backoff for rate limits is not yet implemented (rate-limit errors surface to the caller)

## Future Work

- [ ] Resource management (upload, download, list)
- [ ] Note revision history
- [ ] Bulk / batch operations
- [ ] Event streaming (real-time change monitoring)
- [ ] Exponential backoff on rate limit responses
- [ ] Custom field support
- [ ] Notebook sharing management
