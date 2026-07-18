#!/usr/bin/env node

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "joplin-mcp";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourceDir = path.join(repoRoot, "skills", SKILL_NAME);
const codexHome = process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : path.join(os.homedir(), ".codex");
const destinationDir = path.join(codexHome, "skills", SKILL_NAME);

async function main() {
  await fs.access(sourceDir);
  await fs.mkdir(path.dirname(destinationDir), { recursive: true });

  try {
    await fs.cp(sourceDir, destinationDir, { recursive: true, errorOnExist: true, force: false });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ERR_FS_CP_EEXIST") {
      process.stdout.write(`Skill already installed at ${destinationDir}\n`);
      return;
    }

    throw error;
  }

  process.stdout.write(`Installed Codex skill to ${destinationDir}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`skill install failed: ${message}\n`);
  process.exit(1);
});
