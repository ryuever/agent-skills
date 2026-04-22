#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    skillDir: path.join(__dirname, ".."),
    outDir: "architecture-diagrams",
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--skill-dir" && argv[i + 1]) out.skillDir = path.resolve(argv[++i]);
    else if (a === "--out-dir" && argv[i + 1]) out.outDir = argv[++i];
    else if (a === "--force") out.force = true;
  }
  return out;
}

function writeFileIfNeeded(target, content, force) {
  if (fs.existsSync(target) && !force) {
    console.log(`Skip existing ${target}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log(`Wrote ${target}`);
}

function linkWithSource(root, outDir, force, sourceDir, sourceName) {
  const sourceRoot = path.join(root, sourceDir);
  const diagramRoot = path.join(root, outDir);
  if (!fs.existsSync(sourceRoot) || !fs.existsSync(diagramRoot)) return false;

  const sourceUpper = sourceName.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  writeFileIfNeeded(
    path.join(sourceRoot, "ARCHITECTURE-DIAGRAM-LINKS.md"),
    `# Architecture Diagram Links

Bridge file between \`${sourceDir}/\` and \`${outDir}/\`.

## Mapping table

| Source Doc | Diagram HTML | Notes |
| --- | --- | --- |
| | | |

## Recommended linking

In docs under \`${sourceDir}/\`, add:

\`\`\`md
## 架构图

- [对应架构图](../${outDir}/YYYYMMDD-your-architecture.html)
\`\`\`
`,
    force,
  );

  writeFileIfNeeded(
    path.join(diagramRoot, `${sourceUpper}-LINKS.md`),
    `# ${sourceName} Links

Bridge file between \`${outDir}/\` and \`${sourceDir}/\`.

## Mapping table

| Diagram HTML | Source Doc | Notes |
| --- | --- | --- |
| | | |
`,
    force,
  );

  // Compatibility with older codebase-wiki bridge filenames.
  if (sourceName === "codebase-wiki") {
    const legacyWiki = path.join(sourceRoot, "DIAGRAM-LINKS.md");
    const legacyDiagram = path.join(diagramRoot, "WIKI-LINKS.md");
    if (!fs.existsSync(legacyWiki)) {
      fs.copyFileSync(
        path.join(sourceRoot, "ARCHITECTURE-DIAGRAM-LINKS.md"),
        legacyWiki,
      );
      console.log(`Wrote ${legacyWiki}`);
    }
    if (!fs.existsSync(legacyDiagram)) {
      fs.copyFileSync(
        path.join(diagramRoot, `${sourceUpper}-LINKS.md`),
        legacyDiagram,
      );
      console.log(`Wrote ${legacyDiagram}`);
    }
  }
  return true;
}

function main() {
  const { root, skillDir, outDir, force } = parseArgs(process.argv);
  const targetDir = path.join(root, outDir);
  const templatePath = path.join(skillDir, "assets", "template.html");
  const conventionsPath = path.join(skillDir, "references", "CONVENTIONS.md");

  if (!fs.existsSync(templatePath)) {
    console.error(`Missing ${templatePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(conventionsPath)) {
    console.error(`Missing ${conventionsPath}`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const templateContent = fs.readFileSync(templatePath, "utf8");
  const conventionsContent = fs.readFileSync(conventionsPath, "utf8");

  writeFileIfNeeded(path.join(targetDir, "template.html"), templateContent, force);
  writeFileIfNeeded(path.join(targetDir, "CONVENTIONS.md"), conventionsContent, force);
  writeFileIfNeeded(
    path.join(targetDir, "README.md"),
    `# Architecture Diagrams

This directory is initialized by \`architecture-diagram\` skill.

## Quick start

1. Copy \`template.html\` to a dated filename:
   - \`YYYYMMDD-your-architecture-name.html\`
2. Replace placeholders and adjust SVG components/connections.
3. Open the file in browser to review.

To reinitialize from skill assets:

\`\`\`bash
node <skill-dir>/scripts/init-architecture-diagram.mjs --root . --out-dir ${outDir}
\`\`\`
`,
    force,
  );

  const linkedSources = [
    { dir: "codebase-wiki", name: "codebase-wiki" },
    { dir: "project-wiki", name: "project-wiki" },
    { dir: "curated-reads", name: "curated-reads" },
    { dir: "org-wiki", name: "org-to-vitepress" },
  ].filter((x) => linkWithSource(root, outDir, force, x.dir, x.name));

  console.log("\nArchitecture diagram scaffold complete.");
  console.log(`Next: edit ${path.join(outDir, "template.html")} and save as a dated html file.`);
  console.log("Style references: examples/minimal-dark.html, minimal-light.html, blueprint-grid.html, editorial-cards.html (inside this skill package).");
  if (linkedSources.length > 0) {
    console.log(
      `Auto-linked with: ${linkedSources.map((x) => x.name).join(", ")}.`,
    );
  } else {
    console.log("No supported source directories detected, skip auto-linking bridge.");
  }
}

main();
