/**
 * Type definitions for Joplin MCP server
 */

export interface JoplinNote extends Record<string, unknown> {
  id: string;
  parent_id: string;
  title: string;
  body?: string;
  body_html?: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed?: number;
  todo_due?: number;
  is_conflict: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  author?: string;
  source_url?: string;
  source?: string;
  is_shared: number;
  share_id?: string;
  markup_language?: number;
  user_created_time?: number;
  user_updated_time?: number;
}

export interface JoplinFolder extends Record<string, unknown> {
  id: string;
  parent_id?: string;
  title: string;
  created_time: number;
  updated_time: number;
  user_created_time?: number;
  user_updated_time?: number;
  is_shared: number;
  share_id?: string;
  icon?: string;
}

export interface JoplinTag extends Record<string, unknown> {
  id: string;
  title: string;
  created_time: number;
  updated_time: number;
  user_created_time?: number;
  user_updated_time?: number;
  parent_id?: string;
}

export interface JoplinResource extends Record<string, unknown> {
  id: string;
  title: string;
  filename: string;
  mime: string;
  created_time: number;
  updated_time: number;
  size: number;
  is_shared: number;
  share_id?: string;
  file_extension?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  has_more: boolean;
  cursor?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: number;
  parent_id?: string;
}

export interface NoteChangeEvent {
  id: number;
  item_type: number;
  item_id: string;
  type: number;
  created_time: number;
}

// Response format enum
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Sort direction
export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC"
}
