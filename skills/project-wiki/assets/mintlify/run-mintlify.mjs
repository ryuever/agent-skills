#!/usr/bin/env node
/**
 * Run Mintlify dev server with cwd = this file's directory (project-wiki/).
 * Invoked from repo root: node project-wiki/run-mintlify.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync("npx", ["mintlify", "dev"], {
  cwd: here,
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
