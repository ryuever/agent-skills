#!/usr/bin/env node
/**
 * Scan src/content/docs/{ai,engineering,frontend,devops,product,misc}/**\/*.md
 * for frontmatter `id` + `title` + `category` + `subcategory`, then rewrite:
 *
 *   1. .starlight/sidebar.generated.mjs  — Astro Starlight sidebar config
 *   2. src/content/docs/index.mdx        — 文档索引表格
 *      (replaces content between AUTO-INDEX-START and AUTO-INDEX-END markers)
 *
 * Supports two-level category structure:
 *   - Level 1: ai, engineering, frontend, devops, product, misc
 *   - Level 2: ai/agent, ai/llm, engineering/system-design, etc.
 *
 * Usage: node regenerate-starlight-sidebar.mjs --root <project-root>
 */

import fs from "node:fs";
import path from "node:path";

const CATEGORIES = [
  { dir: "ai", label: "AI & ML", prefix: "AI" },
  { dir: "engineering", label: "Engineering", prefix: "ENG" },
  { dir: "frontend", label: "Frontend", prefix: "FE" },
  { dir: "devops", label: "DevOps & Infra", prefix: "OPS" },
  { dir: "product", label: "Product & Design", prefix: "PD" },
  { dir: "misc", label: "Misc", prefix: "M" },
];

function parseArgs(argv) {
  const out = { root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) {
      out.root = path.resolve(argv[++i]);
    }
  }
  return out;
}

function readFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const block = m[1];
  const map = {};
  for (const line of block.split(/\r?\n/)) {
    const lm = line.match(/^([\w-]+):\s*(.*)$/);
    if (lm) map[lm[1]] = lm[2].trim().replace(/^["']|["']$/g, "");
  }

  // Parse description (may use YAML folded scalar `>`)
  const descMatch = block.match(/^description:\s*>\s*\r?\n((?:\s+.+\r?\n?)+)/m);
  if (descMatch) {
    map.description = descMatch[1]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
  }

  // Parse first source URL (simplified: grab the first `url:` under `sources:`)
  const srcUrlMatch = block.match(/sources:\s*\r?\n[\s\S]*?url:\s*["']?([^\s"']+)/);
  if (srcUrlMatch) map._sourceUrl = srcUrlMatch[1];
  const srcTitleMatch = block.match(
    /sources:\s*\r?\n[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m,
  );
  if (srcTitleMatch) map._sourceTitle = srcTitleMatch[1];

  return map;
}

/**
 * Extract numeric part from an id like "AI-003" -> 3, "ENG-012" -> 12.
 */
function idNumeric(id) {
  const m = String(id || "").match(/-(\d{3})$/);
  return m ? Number(m[1]) : 999;
}

function compareById(a, b) {
  return idNumeric(a.id) - idNumeric(b.id);
}

/**
 * Recursively find all .md/.mdx files in a directory.
 */
function findMarkdownFiles(dir, basePath = "") {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...findMarkdownFiles(entryPath, relPath));
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      results.push({ absPath: entryPath, relPath });
    }
  }
  return results;
}

/**
 * Capitalize first letter of each word for display labels.
 */
function prettifySubcat(name) {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function main() {
  const { root } = parseArgs(process.argv);
  const docsDir = path.join(root, "src", "content", "docs");
  const outDir = path.join(root, ".starlight");
  const outFile = path.join(outDir, "sidebar.generated.mjs");

  if (!fs.existsSync(docsDir)) {
    console.error(`Missing docs directory: ${docsDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  /**
   * Build Starlight sidebar config with two-level structure.
   * @see https://starlight.astro.build/reference/configuration/#sidebar
   *
   * Also collect data for the index.mdx document index table.
   */
  const sidebar = [];
  /** @type {Map<string, Array<{id:string, slug:string, title:string, sourceUrl:string, sourceTitle:string, description:string, fileName:string}>>} */
  const indexRows = new Map();
  for (const { dir } of CATEGORIES) indexRows.set(dir, []);

  for (const { dir, label } of CATEGORIES) {
    const catDir = path.join(docsDir, dir);
    const files = findMarkdownFiles(catDir);

    // Group files by subdirectory (level 2)
    const topLevel = []; // files directly in the category dir
    const subGroups = new Map(); // subdir -> files

    for (const { absPath, relPath } of files) {
      const fm = readFrontmatter(absPath);
      if (!fm || !fm.id) continue;

      const parts = relPath.split("/");
      const base = parts[parts.length - 1].replace(/\.mdx?$/i, "");
      const fileName = parts[parts.length - 1];

      // Collect index row data
      const slugParts = parts.length === 1 ? [dir, base] : [dir, ...parts.slice(0, -1), base];
      indexRows.get(dir).push({
        id: fm.id,
        slug: slugParts.join("/"),
        title: fm.title || fm.id,
        sourceUrl: fm._sourceUrl || "",
        sourceTitle: fm._sourceTitle || "Source",
        description: fm.description || "",
        fileName,
      });

      if (parts.length === 1) {
        // Direct child of category dir
        const slug = `${dir}/${base}`;
        topLevel.push({
          id: fm.id,
          slug,
          label: `${fm.id} ${fm.title || fm.id}`,
        });
      } else {
        // Nested in subcategory
        const subDir = parts[0];
        if (!subGroups.has(subDir)) subGroups.set(subDir, []);
        subGroups.get(subDir).push({
          id: fm.id,
          slug: slugParts.join("/"),
          label: `${fm.id} ${fm.title || fm.id}`,
        });
      }
    }

    // Build items for this category
    const hasContent = topLevel.length > 0 || subGroups.size > 0;

    if (!hasContent) {
      // Empty category - use autogenerate
      sidebar.push({
        label,
        autogenerate: { directory: dir },
      });
      continue;
    }

    const items = [];

    // Add top-level files first
    topLevel.sort(compareById);
    for (const row of topLevel) {
      items.push({ label: row.label, slug: row.slug });
    }

    // Add subcategory groups
    const sortedSubs = [...subGroups.keys()].sort();
    for (const subKey of sortedSubs) {
      const subItems = subGroups.get(subKey);
      subItems.sort(compareById);

      items.push({
        label: prettifySubcat(subKey),
        items: subItems.map((row) => ({
          label: row.label,
          slug: row.slug,
        })),
      });
    }

    sidebar.push({ label, items });
  }

  // ── Write sidebar ──
  const banner =
    "// Auto-generated by skills/curated-reads/scripts/regenerate-starlight-sidebar.mjs\n" +
    "// Do not edit by hand; re-run the script after adding or renaming docs.\n\n";

  const body = `export const starlightSidebar = ${JSON.stringify(sidebar, null, 2)};\n`;

  fs.writeFileSync(outFile, banner + body, "utf8");
  console.log(`Wrote ${path.relative(root, outFile)}`);

  // ── Write index.mdx document index ──
  const indexFile = path.join(docsDir, "index.mdx");
  if (!fs.existsSync(indexFile)) return;

  const indexRaw = fs.readFileSync(indexFile, "utf8");
  const startTag = "{/* AUTO-INDEX-START";
  const endTag = "{/* AUTO-INDEX-END */}";
  const startIdx = indexRaw.indexOf(startTag);
  const endIdx = indexRaw.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1) {
    console.log("Skipped index.mdx — AUTO-INDEX markers not found");
    return;
  }

  // Build markdown tables
  const lines = [];
  for (const { dir, label } of CATEGORIES) {
    const rows = indexRows.get(dir);
    rows.sort(compareById);

    lines.push(`### ${dir}/ — ${label}`);
    lines.push("");
    lines.push("| # | 文件 | 标题 | 来源 | 概述 |");
    lines.push("|---|------|------|------|------|");

    if (rows.length === 0) {
      lines.push("|  |  |  |  |  |");
    } else {
      for (const row of rows) {
        const fileLink = `[${row.fileName}](/${row.slug}/)`;
        const srcLink = row.sourceUrl
          ? `[${row.sourceTitle}](${row.sourceUrl})`
          : "";
        const desc = row.description.replace(/\|/g, "\\|");
        lines.push(`| ${row.id} | ${fileLink} | ${row.title} | ${srcLink} | ${desc} |`);
      }
    }
    lines.push("");
  }

  // Find the end of the start-tag line
  const startLineEnd = indexRaw.indexOf("\n", startIdx);
  const before = indexRaw.slice(0, startLineEnd + 1);
  const after = indexRaw.slice(endIdx);

  const newIndex = before + "\n## 文档索引\n\n" + lines.join("\n") + after;
  fs.writeFileSync(indexFile, newIndex, "utf8");
  console.log(`Wrote ${path.relative(root, indexFile)} (document index)`);
}

main();
