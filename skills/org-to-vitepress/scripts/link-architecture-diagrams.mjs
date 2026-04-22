#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DIAGRAM_DIR = "architecture-diagrams";

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    force: false,
    sourceDir: "org-wiki",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--source-dir" && argv[i + 1]) out.sourceDir = argv[++i];
    else if (a === "--force") out.force = true;
  }
  return out;
}

function writeFileIfNeeded(target, content, force) {
  if (fs.existsSync(target) && !force) {
    console.log(`Skip existing ${target}`);
    return false;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log(`Wrote ${target}`);
  return true;
}

function main() {
  const { root, sourceDir, force } = parseArgs(process.argv);
  const sourceRoot = path.join(root, sourceDir);
  const diagramRoot = path.join(root, DIAGRAM_DIR);

  if (!fs.existsSync(sourceRoot) || !fs.existsSync(diagramRoot)) {
    console.log(`Skip linking: requires both ${sourceDir}/ and ${DIAGRAM_DIR}/`);
    return;
  }

  const sourceBridge = path.join(sourceRoot, "ARCHITECTURE-DIAGRAM-LINKS.md");
  const diagramBridge = path.join(diagramRoot, "ORG-TO-VITEPRESS-LINKS.md");

  writeFileIfNeeded(
    sourceBridge,
    `# Architecture Diagram Links

Bridge file between \`${sourceDir}/\` and \`${DIAGRAM_DIR}/\`.

## Mapping table

| Org Wiki Doc | Diagram HTML | Notes |
| --- | --- | --- |
| | | |

## Suggested usage

- Prefer diagrams for long architecture notes after conversion.
- Keep naming aligned by date + slug for quick lookup.
`,
    force,
  );

  writeFileIfNeeded(
    diagramBridge,
    `# Org-to-VitePress Links

Bridge file between \`${DIAGRAM_DIR}/\` and \`${sourceDir}/\`.

## Mapping table

| Diagram HTML | Org Wiki Doc | Notes |
| --- | --- | --- |
| | | |
`,
    force,
  );

  console.log(`Linked ${sourceDir} <-> ${DIAGRAM_DIR}`);
}

main();
