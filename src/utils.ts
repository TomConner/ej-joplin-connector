/**
 * Utility functions for formatting and error handling
 */

import { JoplinNote } from "./types.js";
import { CHARACTER_LIMIT } from "./constants.js";

export function formatMarkdownNote(note: JoplinNote): string {
  let text = `# ${note.title}\n\n`;
  text += `**ID**: ${note.id}\n`;
  text += `**Created**: ${new Date(note.created_time).toLocaleString()}\n`;
  text += `**Updated**: ${new Date(note.updated_time).toLocaleString()}\n`;

  if (note.parent_id) {
    text += `**Parent Folder**: ${note.parent_id}\n`;
  }

  if (note.is_todo) {
    text += `**Type**: Todo\n`;
    if (note.todo_completed) {
      text += `**Completed**: ${new Date(note.todo_completed).toLocaleString()}\n`;
    }
    if (note.todo_due) {
      text += `**Due**: ${new Date(note.todo_due).toLocaleString()}\n`;
    }
  }

  if (note.is_shared) {
    text += `**Shared**: Yes\n`;
  }

  text += "\n---\n\n";

  if (note.body) {
    text += note.body;
  } else if (note.body_html) {
    text += `[HTML Content]\n\n${note.body_html}`;
  } else {
    text += "(No content)";
  }

  return text;
}

export function truncateIfNeeded(content: string, limit: number, description: string): string {
  if (content.length > limit) {
    const truncated = content.substring(0, limit);
    return truncated + `\n\n---\n\n**Note**: ${description} was truncated to fit within the character limit. Use specific filters or pagination to retrieve more results.`;
  }
  return content;
}

export function convertToMarkdownList(items: any[], titleField: string = "title", idField: string = "id"): string {
  return items.map(item => `- **${item[titleField]}** (${item[idField]})`).join("\n");
}
