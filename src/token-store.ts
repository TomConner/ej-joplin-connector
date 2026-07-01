import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TOKEN_DIR = join(homedir(), ".config", "ej-joplin-connector");
const TOKEN_PATH = join(TOKEN_DIR, "token");

export function loadCachedToken(): string | null {
  try {
    const raw = readFileSync(TOKEN_PATH, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
}

export function clearCachedToken(): void {
  try {
    rmSync(TOKEN_PATH, { force: true });
  } catch {
    // ignore
  }
}
