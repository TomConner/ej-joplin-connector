#!/usr/bin/env node

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const SECTION = "[mcp_servers.joplin]";
const RELATIVE_ENTRY = [
  SECTION,
  'command = "node"',
  'args = ["server/index.js"]',
  `cwd = ${JSON.stringify(process.cwd())}`,
  "startup_timeout_sec = 120",
].join("\n");

function replaceSection(contents, replacement) {
  const lines = contents.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === SECTION);

  if (start === -1) {
    const prefix = contents.trim().length === 0 ? "" : contents.endsWith("\n") ? "\n" : "\n\n";
    return `${contents}${prefix}${replacement}\n`;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[[^\]]+\]\s*$/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }

  const updated = [...lines.slice(0, start), ...replacement.split("\n"), ...lines.slice(end)];
  return updated.join("\n").replace(/\n+$/, "\n");
}

async function main() {
  const configPath = path.join(os.homedir(), ".codex", "config.toml");
  const configDir = path.dirname(configPath);

  await fs.mkdir(configDir, { recursive: true });

  let current = "";
  try {
    current = await fs.readFile(configPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const next = replaceSection(current, RELATIVE_ENTRY);
  await fs.writeFile(configPath, next, "utf8");
  process.stdout.write(`Updated ${configPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`codex setup failed: ${message}\n`);
  process.exit(1);
});
