#!/usr/bin/env node
/**
 * Regenerate VitePress sidebar with DeepWiki-style numbered tree structure.
 *
 * Reads frontmatter `section` field from each .md file under project-wiki/
 * and builds a hierarchical sidebar (1 → 1.1 → 1.2, 2 → 2.1, etc.).
 *
 * Also supports Mintlify and Starlight if their config files exist (backward compat).
 *
 * Usage: node regenerate-sidebar.mjs --root <project-root>
 */

import fs from "node:fs";
import path from "node:path";

const WIKI_DIR = "project-wiki";

const CATEGORIES = [
  { dir: "overview", group: "项目地图", prefix: "1" },
  { dir: "architecture", group: "架构设计", prefix: "2" },
  { dir: "concepts", group: "核心概念", prefix: "3" },
  { dir: "modules", group: "核心模块", prefix: "4" },
  { dir: "dataflow", group: "数据流", prefix: "5" },
  { dir: "operations", group: "工程运维", prefix: "6" },
];

function parseArgs(argv) {
  const out = { root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
  }
  return out;
}

/**
 * Parse frontmatter from a markdown file.
 * Supports both new `section` field and legacy `id` field.
 */
function readFrontmatter(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, "utf8"); } catch { return null; }
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const block = m[1];
  const map = {};
  for (const line of block.split(/\r?\n/)) {
    const lm = line.match(/^([\w-]+):\s*(.+)$/);
    if (lm) {
      let val = lm[2].trim();
      // Remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      map[lm[1]] = val;
    }
  }
  return map;
}

/**
 * Parse section number for sorting: "1" → [1], "2.1" → [2, 1], "4.12" → [4, 12]
 */
function parseSectionNum(s) {
  if (!s) return [999];
  return String(s).split(".").map((n) => {
    const num = parseInt(n, 10);
    return isNaN(num) ? 999 : num;
  });
}

function compareSections(a, b) {
  const na = parseSectionNum(a);
  const nb = parseSectionNum(b);
  const len = Math.max(na.length, nb.length);
  for (let i = 0; i < len; i++) {
    const va = na[i] ?? 0;
    const vb = nb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * Legacy id sort key (backward compat with A-001, M-003 style)
 */
function legacyIdToSection(id) {
  if (!id) return null;
  const m = String(id).match(/^([OAGMFP])-(\d{3})$/);
  if (!m) return null;
  const prefixMap = { O: "1", A: "2", G: "3", M: "4", F: "5", P: "6" };
  const major = prefixMap[m[1]] ?? "9";
  const minor = parseInt(m[2], 10);
  return minor === 0 ? major : `${major}.${minor}`;
}

/**
 * Collect metadata from all .md files in a directory.
 */
function collectMetas(dirPath) {
  const items = [];
  if (!fs.existsSync(dirPath)) return items;

  const names = fs.readdirSync(dirPath).filter((n) => n.endsWith(".md")).sort();
  for (const name of names) {
    const fp = path.join(dirPath, name);
    const fm = readFrontmatter(fp);
    if (!fm) continue;

    // Support both new `section` field and legacy `id` field
    let section = fm.section || legacyIdToSection(fm.id);
    if (!section) {
      // Try to extract section from filename: "2.1-component-system.md" → "2.1"
      const fileMatch = name.match(/^(\d+(?:\.\d+)?)-/);
      if (fileMatch) section = fileMatch[1];
    }
    if (!section) continue;

    const title = fm.title || fm.id || name.replace(/\.md$/, "");
    const base = name.replace(/\.md$/i, "");
    items.push({ section, title, base, name });
  }

  items.sort((a, b) => compareSections(a.section, b.section));
  return items;
}

/**
 * Build hierarchical sidebar items from flat list.
 * Major sections (e.g., "2") become group headers.
 * Sub sections (e.g., "2.1") become children under the group.
 */
function buildHierarchicalItems(metas, dir) {
  if (metas.length === 0) return [];

  const groups = [];
  let currentGroup = null;

  for (const meta of metas) {
    const parts = meta.section.split(".");
    const isMajor = parts.length === 1;

    if (isMajor) {
      // Major section — create a new group
      currentGroup = {
        text: `${meta.section}. ${meta.title}`,
        link: `/${dir}/${meta.base}`,
        items: [],
        collapsed: false,
      };
      groups.push(currentGroup);
    } else if (currentGroup) {
      // Sub section — add to current group
      currentGroup.items.push({
        text: `${meta.section} ${meta.title}`,
        link: `/${dir}/${meta.base}`,
      });
    } else {
      // Orphan sub section (no parent major) — create standalone
      groups.push({
        text: `${meta.section} ${meta.title}`,
        link: `/${dir}/${meta.base}`,
        items: [],
      });
    }
  }

  // If a group has no children, simplify it
  return groups.map((g) => {
    if (g.items && g.items.length === 0) {
      return { text: g.text, link: g.link };
    }
    return g;
  });
}

/* ------------------------------------------------------------------ */
/*  VitePress                                                         */
/* ------------------------------------------------------------------ */

function writeVitepress(root) {
  const wikiRoot = path.join(root, WIKI_DIR);
  const vpConfig = path.join(wikiRoot, ".vitepress", "config.mts");
  if (!fs.existsSync(vpConfig)) return;

  const vpDir = path.join(wikiRoot, ".vitepress");
  const outFile = path.join(vpDir, "sidebar.generated.mts");
  fs.mkdirSync(vpDir, { recursive: true });

  // Build sidebar per category
  const sidebar = {};
  const nav = [{ text: "首页", link: "/INDEX" }];

  for (const { dir, group } of CATEGORIES) {
    const dirPath = path.join(wikiRoot, dir);
    const metas = collectMetas(dirPath);
    const items = buildHierarchicalItems(metas, dir);

    // Use a single "/" key for all categories so sidebar shows for all pages
    if (items.length > 0) {
      if (!sidebar["/"]) sidebar["/"] = [];
      sidebar["/"].push({ text: group, items, collapsed: false });

      // Add first page of each category to nav
      const firstLink = items[0].link || (items[0].items && items[0].items[0]?.link);
      if (firstLink) {
        nav.push({ text: group, link: firstLink });
      }
    }
  }

  const banner =
    "// Auto-generated by skills/project-wiki/scripts/regenerate-sidebar.mjs\n" +
    "// Do not edit by hand; re-run the script after adding or renaming docs.\n\n" +
    "// @ts-nocheck\n\n";

  const body =
    `export const wikiSidebar = ${JSON.stringify(sidebar, null, 2)};\n\n` +
    `export const wikiNav = ${JSON.stringify(nav, null, 2)};\n`;

  fs.writeFileSync(outFile, banner + body, "utf8");
  console.log(`  ✓ ${path.relative(root, outFile)}`);
}

/* ------------------------------------------------------------------ */
/*  Mintlify                                                          */
/* ------------------------------------------------------------------ */

/**
 * Build Mintlify navigation groups with hierarchical numbering.
 * Mintlify supports nested groups for sub-pages.
 *
 * Major sections become top-level groups; sub-sections become nested groups
 * within them when there are enough sub-pages.
 */
function writeMintlify(root) {
  const wikiRoot = path.join(root, WIKI_DIR);
  const docsJsonPath = path.join(wikiRoot, "docs.json");
  if (!fs.existsSync(docsJsonPath)) return;

  const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, "utf8"));
  const groups = [{ group: "首页", pages: ["INDEX"] }];

  for (const { dir, group, prefix } of CATEGORIES) {
    const dirPath = path.join(wikiRoot, dir);
    const metas = collectMetas(dirPath);
    if (metas.length === 0) continue;

    // Separate major sections from sub-sections
    const majorMetas = metas.filter((m) => !m.section.includes("."));
    const subMetas = metas.filter((m) => m.section.includes("."));

    if (subMetas.length === 0) {
      // Simple: all pages are flat
      groups.push({
        group: `${prefix}. ${group}`,
        pages: metas.map((row) => `${dir}/${row.base}`),
      });
    } else {
      // Hierarchical: build nested pages array
      // Mintlify nested group structure: pages can contain strings or { group, pages } objects
      const pages = [];
      let currentNested = null;

      for (const meta of metas) {
        const isMajor = !meta.section.includes(".");
        if (isMajor) {
          // Flush any pending nested group
          if (currentNested && currentNested.pages.length > 0) {
            pages.push(currentNested);
          }
          // Add major page directly
          pages.push(`${dir}/${meta.base}`);
          // Start collecting sub-pages (but don't wrap in a group unless there are subs)
          currentNested = { group: `${meta.section}. ${meta.title}`, pages: [] };
        } else {
          if (currentNested) {
            currentNested.pages.push(`${dir}/${meta.base}`);
          } else {
            pages.push(`${dir}/${meta.base}`);
          }
        }
      }
      // Flush last nested group
      if (currentNested && currentNested.pages.length > 0) {
        pages.push(currentNested);
      }

      groups.push({
        group: `${prefix}. ${group}`,
        pages,
      });
    }
  }

  docsJson.navigation = docsJson.navigation || {};
  docsJson.navigation.groups = groups;
  fs.writeFileSync(docsJsonPath, JSON.stringify(docsJson, null, 2) + "\n", "utf8");
  console.log(`  ✓ ${path.relative(root, docsJsonPath)}`);
}

/* ------------------------------------------------------------------ */
/*  Starlight                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build Starlight sidebar with hierarchical numbering.
 * Starlight supports nested items: { label, items: [...] } for groups.
 */
function buildStarlightHierarchicalItems(metas, dir) {
  if (metas.length === 0) return [];

  const items = [];
  let currentGroup = null;

  for (const meta of metas) {
    const parts = meta.section.split(".");
    const isMajor = parts.length === 1;

    if (isMajor) {
      // Flush previous group
      if (currentGroup) {
        if (currentGroup.items.length === 0) {
          // No children — flatten to simple link
          items.push({ label: currentGroup.label, slug: currentGroup.slug });
        } else {
          // Has children — add parent as first item, then children
          items.push({
            label: currentGroup.label,
            items: [
              { label: currentGroup.label, slug: currentGroup.slug },
              ...currentGroup.items,
            ],
          });
        }
      }
      currentGroup = {
        label: `${meta.section}. ${meta.title}`,
        slug: `${dir}/${meta.base}`,
        items: [],
      };
    } else if (currentGroup) {
      currentGroup.items.push({
        label: `${meta.section} ${meta.title}`,
        slug: `${dir}/${meta.base}`,
      });
    } else {
      items.push({
        label: `${meta.section} ${meta.title}`,
        slug: `${dir}/${meta.base}`,
      });
    }
  }

  // Flush last group
  if (currentGroup) {
    if (currentGroup.items.length === 0) {
      items.push({ label: currentGroup.label, slug: currentGroup.slug });
    } else {
      items.push({
        label: currentGroup.label,
        items: [
          { label: currentGroup.label, slug: currentGroup.slug },
          ...currentGroup.items,
        ],
      });
    }
  }

  return items;
}

function writeStarlight(root) {
  const wikiRoot = path.join(root, WIKI_DIR);
  const starRoot = path.join(wikiRoot, "starlight");
  const cfg = path.join(starRoot, "astro.config.mjs");
  if (!fs.existsSync(cfg)) return;

  // Sync markdown files from project-wiki/ to starlight content directory
  const docsDir = path.join(starRoot, "src", "content", "docs");
  for (const { dir } of CATEGORIES) {
    const srcDir = path.join(wikiRoot, dir);
    const destDir = path.join(docsDir, dir);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(srcDir)) continue;
    for (const name of fs.readdirSync(srcDir)) {
      if (!name.endsWith(".md")) continue;
      fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
    }
  }

  // Sync quality-report.md
  const qrSrc = path.join(wikiRoot, "quality-report.md");
  const qrDest = path.join(docsDir, "quality-report.md");
  if (fs.existsSync(qrSrc)) {
    const raw = fs.readFileSync(qrSrc, "utf8");
    const body = raw.startsWith("---") ? raw :
      `---\ntitle: 扫描报告\ndescription: analyze-repo.mjs 生成的扫描报告\n---\n\n${raw}`;
    fs.writeFileSync(qrDest, body, "utf8");
  }

  // Sync CONVENTIONS.md
  const convSrc = path.join(wikiRoot, "CONVENTIONS.md");
  const convDest = path.join(docsDir, "conventions.md");
  if (fs.existsSync(convSrc)) {
    const raw = fs.readFileSync(convSrc, "utf8");
    const body = raw.startsWith("---") ? raw :
      `---\ntitle: 文档书写规范\ndescription: project-wiki 文档书写规范\n---\n\n${raw}`;
    fs.writeFileSync(convDest, body, "utf8");
  }

  // Generate hierarchical sidebar
  const outDir = path.join(starRoot, ".starlight");
  const outFile = path.join(outDir, "sidebar.generated.mjs");
  fs.mkdirSync(outDir, { recursive: true });

  const sidebar = [];
  for (const { dir, group, prefix } of CATEGORIES) {
    const dirPath = path.join(docsDir, dir);
    const metas = collectMetas(dirPath);
    if (metas.length > 0) {
      const items = buildStarlightHierarchicalItems(metas, dir);
      sidebar.push({ label: `${prefix}. ${group}`, items });
    } else {
      sidebar.push({
        label: `${prefix}. ${group}`,
        autogenerate: { directory: dir },
      });
    }
  }

  const banner =
    "// Auto-generated by skills/project-wiki/scripts/regenerate-sidebar.mjs\n" +
    "// Do not edit by hand; re-run the script after adding or renaming docs.\n\n";

  fs.writeFileSync(outFile, banner + `export const starlightSidebar = ${JSON.stringify(sidebar, null, 2)};\n`, "utf8");
  console.log(`  ✓ ${path.relative(root, outFile)}`);
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

function main() {
  const { root } = parseArgs(process.argv);
  const wikiRoot = path.join(root, WIKI_DIR);

  if (!fs.existsSync(wikiRoot)) {
    console.error(`Missing wiki directory: ${wikiRoot}`);
    process.exit(1);
  }

  console.log("\n📖 Regenerating sidebar...\n");
  writeVitepress(root);
  writeMintlify(root);
  writeStarlight(root);
  console.log("\n✅ Done.\n");
}

main();
