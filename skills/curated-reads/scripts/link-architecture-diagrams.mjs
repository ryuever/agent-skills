#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SOURCE_DIR = "curated-reads";
const SOURCE_NAME = "curated-reads";
const DIAGRAM_DIR = "architecture-diagrams";

function parseArgs(argv) {
  const out = { root: process.cwd(), force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
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
  const { root, force } = parseArgs(process.argv);
  const sourceRoot = path.join(root, SOURCE_DIR);
  const diagramRoot = path.join(root, DIAGRAM_DIR);

  if (!fs.existsSync(sourceRoot) || !fs.existsSync(diagramRoot)) {
    console.log(`Skip linking: requires both ${SOURCE_DIR}/ and ${DIAGRAM_DIR}/`);
    return;
  }

  const sourceBridge = path.join(sourceRoot, "ARCHITECTURE-DIAGRAM-LINKS.md");
  const diagramBridge = path.join(diagramRoot, "CURATED-READS-LINKS.md");

  writeFileIfNeeded(
    sourceBridge,
    `# Architecture Diagram Links

Bridge file between \`${SOURCE_DIR}/\` and \`${DIAGRAM_DIR}/\`.

## Mapping table

| Curated Read Doc | Diagram HTML | Notes |
| --- | --- | --- |
| | | |

## Suggested usage

- Use only when article topic is architecture/system design/infrastructure.
- Keep one diagram per topic cluster instead of one per article.
`,
    force,
  );

  writeFileIfNeeded(
    diagramBridge,
    `# Curated Reads Links

Bridge file between \`${DIAGRAM_DIR}/\` and \`${SOURCE_DIR}/\`.

## Mapping table

| Diagram HTML | Curated Read Doc | Notes |
| --- | --- | --- |
| | | |
`,
    force,
  );

  console.log(`Linked ${SOURCE_NAME} <-> ${DIAGRAM_DIR}`);
}

main();
