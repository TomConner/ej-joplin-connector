# Joplin MCP Server Development Guide

## Overview

This document describes the architecture and implementation details of the Joplin MCP Server.

## Architecture

### High-Level Design

The server follows MCP best practices with a clean separation of concerns:

```
index.ts (Entry point)
    ↓
JoplinClient (API client)
    ↓
Tools (Note/Folder/Tag management)
    ↓
MCP Server (Request handling)
```

### Core Components

#### 1. JoplinClient (`src/joplin-client.ts`)
- Handles all HTTP communication with the Joplin Data API
- Manages authentication (token-based)
- Implements automatic port discovery (tests ports 41184-41194)
- Provides unified error handling with user-friendly messages
- Methods: `ping()`, `get()`, `post()`, `put()`, `delete()`

**Design Decision**: Centralizing API communication in one class prevents code duplication and makes testing/maintenance easier.

#### 2. Tool Modules
- `src/tools/notes.ts`: Note CRUD, search, and todo management
- `src/tools/folders.ts`: Notebook/folder hierarchy management
- `src/tools/tags.ts`: Tag management and note-tag associations

**Design Decision**: Each domain has its own file, allowing independent testing and making the codebase more modular.

#### 3. Type System (`src/types.ts`)
- Defines all Joplin data structures (Note, Folder, Tag, Resource, etc.)
- Interfaces extend `Record<string, unknown>` to satisfy MCP SDK type requirements
- Enums for ResponseFormat and SortDirection

**Design Decision**: Strong typing prevents runtime errors and improves IDE support.

#### 4. Utilities (`src/utils.ts`)
- `formatMarkdownNote()`: Converts note objects to readable Markdown
- `truncateIfNeeded()`: Prevents responses from exceeding CHARACTER_LIMIT
- `convertToMarkdownList()`: Generic list formatting

### Request Flow

```
Client Request
    ↓
MCP Server dispatches to tool handler
    ↓
Tool validates input with Zod schema
    ↓
JoplinClient makes HTTP request
    ↓
Response formatted (Markdown or JSON)
    ↓
Character limit check
    ↓
Return to client
```

## Implementation Highlights

### Error Handling

The server provides actionable error messages:

```typescript
// Authentication errors include setup instructions
"Authentication failed. Please check your Joplin API token. Error: ..."

// Connection errors suggest troubleshooting
"Cannot connect to Joplin service at http://localhost:41184. 
Is Joplin running with Web Clipper enabled?"

// API errors are specific
"Bad request: Invalid field value"
"Rate limit exceeded. Please wait before retrying."
```

### Response Formats

All tools support both Markdown (human-readable) and JSON (machine-readable):

**Markdown** (default):
```markdown
# Search Results for "project"

Found 5 results.

## Project proposal (abc123)
## Q4 project review (def456)
...
```

**JSON**:
```json
{
  "items": [
    {"id": "abc123", "title": "Project proposal", ...},
    {"id": "def456", "title": "Q4 project review", ...}
  ],
  "has_more": false
}
```

### Pagination

All list tools implement pagination to prevent memory exhaustion:

```typescript
// User specifies how many results
limit: z.number().int().min(1).max(100).default(20)

// Response includes pagination metadata
{
  "items": [...],
  "has_more": true,
  "next_offset": 20,
  "total": 143
}
```

### Tool Annotations

Each tool declares its behavior hints:

```typescript
annotations: {
  readOnlyHint: true,        // Doesn't modify state
  destructiveHint: false,    // Won't delete/overwrite
  idempotentHint: true,      // Can repeat safely
  openWorldHint: true        // Interacts with external service
}
```

## Key Design Decisions

### 1. Comprehensive API Coverage vs. High-Level Workflows

**Decision**: Comprehensive API coverage with atomic tools

**Rationale**: 
- Gives LLMs flexibility to compose operations
- Easier for users to understand what tools do
- Better for advanced workflows

### 2. Token-Based Authentication

**Decision**: Pass token as query parameter to each request

**Rationale**:
- Required by Joplin API design
- Simple and stateless
- Tokens stored in environment variables (not in code)

### 3. Automatic Port Discovery

**Decision**: Test ports 41184-41194 to find running Joplin

**Rationale**:
- Joplin can run on different ports if 41184 is busy
- Eliminates need for manual port configuration
- Provides clear error if not found

### 4. Character Limit Enforcement

**Decision**: Truncate responses that exceed CHARACTER_LIMIT

**Rationale**:
- Context windows are finite
- Prevents overwhelming users with huge responses
- Informs users how to get more data (pagination/filtering)

### 5. Zod Schema Validation

**Decision**: Every tool parameter validated with Zod

**Rationale**:
- Runtime type safety (TypeScript alone isn't enough)
- Clear error messages for invalid input
- Self-documenting parameter constraints

## Testing the Implementation

### Manual Testing

```bash
# Start the server
export JOPLIN_API_TOKEN="your-token-here"
npm run build
node dist/index.js

# In another terminal, test with MCP Inspector or any MCP client
```

### Automated Evaluation

The `evaluations.xml` file contains 10 test scenarios covering:

1. Note listing and querying
2. Full-text search
3. Folder hierarchy traversal
4. Note CRUD operations
5. Tag management
6. Complex multi-step workflows

## Performance Considerations

### Pagination Defaults
- `DEFAULT_LIMIT = 20`: Balanced between responsiveness and data completeness
- Max 100 items: Prevents huge responses that timeout or exceed context

### Caching
- No explicit caching (Joplin API handles this)
- Each request is fresh, ensuring data consistency

### Timeout
- `REQUEST_TIMEOUT = 30000ms`: Reasonable for most operations
- Configurable if needed for slow networks

## Future Enhancements

### Short Term
- [ ] Resource file upload support
- [ ] Note revision history retrieval
- [ ] Bulk note operations
- [ ] Custom field support

### Medium Term
- [ ] Event streaming (monitor changes in real-time)
- [ ] Full-text search aggregation
- [ ] Batch CRUD operations
- [ ] Notebook sharing management

### Long Term
- [ ] Cached layers for frequently accessed data
- [ ] GraphQL query interface
- [ ] Plugin system for custom extensions

## Security Considerations

### Token Management
- Never log or display tokens in error messages
- Always pass tokens as query parameters over HTTPS
- No token persistence in code or config files

### Input Validation
- All parameters validated with Zod
- No SQL injection risk (REST API client, not database)
- Path traversal not possible (Joplin API abstraction)

### API Limits
- Respects Joplin's pagination and rate limiting
- Implements exponential backoff for rate limits (TODO)

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` or proper types)
- Full type coverage for all functions

### Error Handling
- All async operations wrapped in try-catch
- Errors converted to user-friendly messages
- No internal implementation details exposed

### Documentation
- Every tool has comprehensive JSDoc comments
- Parameters documented with examples
- Error conditions explicitly described

## Debugging

### Enable Verbose Logging

```typescript
// In index.ts, add before server.connect():
console.error("Tool registered: joplin_list_notes");
console.error("Tool registered: joplin_create_note");
// ... etc
```

### Test Joplin Connection

```bash
# Verify Joplin is running
curl http://localhost:41184/ping?token=YOUR_TOKEN

# Should return: "JoplinClipperServer"
```

### Inspect Network Requests

```typescript
// Add logging to JoplinClient.get()
console.error(`GET ${endpoint}`, params);
```

## Contributing

When adding new tools:

1. Create appropriate Zod schema for inputs
2. Implement tool handler with error handling
3. Register tool with `server.registerTool()`
4. Include comprehensive description with examples
5. Add test case to `evaluations.xml`
6. Update this document with design notes

## License

MIT
