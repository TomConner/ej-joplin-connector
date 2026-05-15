/**
 * Constants for Joplin MCP server
 */

// API configuration
export const DEFAULT_JOPLIN_PORT = 41184;
export const JOPLIN_PORT_RANGE = [41184, 41185, 41186, 41187, 41188, 41189, 41190, 41191, 41192, 41193, 41194];

// Pagination defaults
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Character limits
export const CHARACTER_LIMIT = 25000;

// Item type IDs
export const ITEM_TYPES = {
  note: 1,
  folder: 2,
  setting: 3,
  resource: 4,
  tag: 5,
  note_tag: 6,
  search: 7,
  alarm: 8,
  master_key: 9,
  item_change: 10,
  note_resource: 11,
  resource_local_state: 12,
  revision: 13,
  migration: 14,
  smart_filter: 15,
  command: 16
} as const;

// Event change types
export const EVENT_TYPES = {
  created: 1,
  updated: 2,
  deleted: 3
} as const;

// Default field lists for API responses
export const DEFAULT_NOTE_FIELDS = ['id', 'parent_id', 'title', 'created_time', 'updated_time', 'is_todo', 'todo_completed'];
export const DEFAULT_FOLDER_FIELDS = ['id', 'parent_id', 'title', 'created_time', 'updated_time'];
export const DEFAULT_TAG_FIELDS = ['id', 'title', 'created_time', 'updated_time'];
export const DEFAULT_RESOURCE_FIELDS = ['id', 'title', 'filename', 'mime', 'size', 'created_time', 'updated_time'];

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;
