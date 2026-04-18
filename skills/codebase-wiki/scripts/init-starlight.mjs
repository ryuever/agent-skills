#!/usr/bin/env node
/** Wiki Markdown root inside the target repo (Starlight content directory). */
const WIKI_DIR = "codebase-wiki";

/**
 * Scaffold codebase-wiki/ + Astro Starlight project for the codebase-wiki workflow.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-starlight.mjs --root .
 *
 * Options:
 *   --root <dir>       Target repository root (default: cwd)
 *   --skill-dir <dir>  Path to the codebase-wiki skill folder (default: parent of scripts/)
 *   --title <string>   Wiki title (default: Codebase Wiki)
 *   --github <url>     Optional GitHub repo URL for social link
 *   --force            Overwrite generated files if they already exist
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    skillDir: path.join(__dirname, ".."),
    title: "Codebase Wiki",
    github: "",
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--skill-dir" && argv[i + 1])
      out.skillDir = path.resolve(argv[++i]);
    else if (a === "--title" && argv[i + 1]) out.title = argv[++i];
    else if (a === "--github" && argv[i + 1]) out.github = argv[++i];
    else if (a === "--force") out.force = true;
  }
  return out;
}

function writeIfAbsent(file, content, force) {
  if (fs.existsSync(file) && !force) {
    console.log(`Skip existing ${file}`);
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`Wrote ${file}`);
  return true;
}

function mergePackageJson(root) {
  const pkgPath = path.join(root, "package.json");
  let pkg = { name: path.basename(root), private: true, version: "0.0.0" };
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  }
  pkg.scripts = pkg.scripts || {};
  const scripts = {
    "docs:wiki:dev": "astro dev",
    "docs:wiki:build": "astro build",
    "docs:wiki:preview": "astro preview",
  };
  let changed = false;
  for (const [k, v] of Object.entries(scripts)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  }
  pkg.devDependencies = pkg.devDependencies || {};
  const deps = {
    astro: "^5.7.10",
    "@astrojs/starlight": "^0.34.1",
    sharp: "^0.33.0",
  };
  for (const [k, v] of Object.entries(deps)) {
    if (!pkg.devDependencies[k]) {
      pkg.devDependencies[k] = v;
      changed = true;
    }
  }
  if (changed || !fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    console.log(`Updated ${pkgPath}`);
  } else {
    console.log("No package.json changes needed");
  }
}

/**
 * Build the astro.config.mjs content for Starlight.
 * @param {string} title
 * @param {string} github
 */
function buildAstroConfig(title, github) {
  const socialLine = github
    ? `\n      social: [{ icon: "github", label: "GitHub", href: ${JSON.stringify(github)} }],`
    : "";

  return `import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { starlightSidebar } from "./.starlight/sidebar.generated.mjs";

export default defineConfig({
  integrations: [
    starlight({
      title: ${JSON.stringify(title)},
      description: ${JSON.stringify(`${title} — 架构分析、技术讨论、参考手册与路线图`)},${socialLine}
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
      },
      sidebar: starlightSidebar,
      lastUpdated: true,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      credits: false,
    }),
  ],
});
`;
}

/**
 * Build the content collection config (src/content.config.ts).
 */
function buildContentConfig() {
  return `import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
`;
}

/**
 * Build the INDEX.md landing page for Starlight.
 * Starlight expects content in src/content/docs/.
 */
function buildIndexMd(title) {
  return `---
title: ${title}
description: "${title} — 架构分析、技术讨论、参考手册与路线图"
template: splash
hero:
  title: ${title}
  tagline: 源码阅读与概念笔记
  actions:
    - text: 文档索引
      link: "#文档索引"
      icon: right-arrow
    - text: 书写规范
      link: /conventions/
      variant: minimal
---

import { Card, CardGrid } from "@astrojs/starlight/components";

> 本目录（\`codebase-wiki/\`）存放 AI 辅助生成的分析文档、技术讨论、参考手册与规划路线。
> 书写规范请参考 [CONVENTIONS](/conventions/)。

## 快速导航

<CardGrid>
  <Card title="架构分析" icon="seti:folder">
    模块职责、依赖与系统设计笔记。
  </Card>
  <Card title="技术讨论" icon="comment">
    方案对比、概念辨析与深度笔记。
  </Card>
  <Card title="参考手册" icon="open-book">
    目录结构与速查。
  </Card>
  <Card title="规划路线" icon="rocket">
    差距分析、优先级与待办。
  </Card>
</CardGrid>

## 文档索引

### architecture/ — 架构分析

| # | 文件 | 标题 | 概述 |
|---|------|------|------|
|  |  |  |  |

### discussion/ — 技术讨论

| # | 文件 | 标题 | 概述 |
|---|------|------|------|
|  |  |  |  |

### reference/ — 参考手册

| # | 文件 | 标题 | 概述 |
|---|------|------|------|
|  |  |  |  |

### roadmap/ — 规划路线

| # | 文件 | 标题 | 概述 |
|---|------|------|------|
|  |  |  |  |
`;
}

function main() {
  const { root, skillDir, title, github, force } = parseArgs(process.argv);
  const refs = path.join(skillDir, "references", "CONVENTIONS.md");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }

  // Starlight expects content in src/content/docs/
  const docsDir = path.join(root, "src", "content", "docs");
  const dirs = [
    path.join(docsDir, "architecture"),
    path.join(docsDir, "discussion"),
    path.join(docsDir, "reference"),
    path.join(docsDir, "roadmap"),
    path.join(root, ".starlight"),
  ];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Create .gitkeep files
  for (const d of ["architecture", "discussion", "reference", "roadmap"]) {
    const g = path.join(docsDir, d, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");
  }

  // Also create the codebase-wiki/ symlink-style directories for convention
  // compatibility; Starlight reads from src/content/docs/ but the workflow
  // still expects codebase-wiki/ as the user-facing directory.
  // We create a codebase-wiki/ directory with symlinks to src/content/docs/ subdirs.
  const wikiDir = path.join(root, WIKI_DIR);
  fs.mkdirSync(wikiDir, { recursive: true });

  // Copy CONVENTIONS.md to both locations
  const conventionsDocsDest = path.join(docsDir, "conventions.md");
  if (!fs.existsSync(conventionsDocsDest) || force) {
    // Add Starlight-compatible frontmatter to CONVENTIONS
    const conventionsContent = fs.readFileSync(refs, "utf8");
    const starlightConventions = `---
title: 文档书写规范
description: "Codebase wiki 文档书写规范"
---

${conventionsContent}
`;
    fs.writeFileSync(conventionsDocsDest, starlightConventions, "utf8");
    console.log(`Wrote ${conventionsDocsDest}`);
  } else {
    console.log(`Skip existing ${conventionsDocsDest}`);
  }

  const conventionsWikiDest = path.join(wikiDir, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsWikiDest) || force) {
    fs.copyFileSync(refs, conventionsWikiDest);
    console.log(`Wrote ${conventionsWikiDest}`);
  } else {
    console.log(`Skip existing ${conventionsWikiDest}`);
  }

  // Write INDEX.mdx for Starlight
  writeIfAbsent(
    path.join(docsDir, "index.mdx"),
    buildIndexMd(title),
    force,
  );

  // Write astro.config.mjs
  writeIfAbsent(
    path.join(root, "astro.config.mjs"),
    buildAstroConfig(title, github),
    force,
  );

  // Write src/content.config.ts
  writeIfAbsent(
    path.join(root, "src", "content.config.ts"),
    buildContentConfig(),
    force,
  );

  // Write favicon
  const publicDir = path.join(root, "public");
  fs.mkdirSync(publicDir, { recursive: true });
  writeIfAbsent(
    path.join(publicDir, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📖</text></svg>\n`,
    force,
  );

  // Merge package.json
  mergePackageJson(root);

  // Run regenerate-starlight-sidebar.mjs to create initial sidebar
  const regen = path.join(__dirname, "regenerate-starlight-sidebar.mjs");
  if (fs.existsSync(regen)) {
    execFileSync(process.execPath, [regen, "--root", root], {
      stdio: "inherit",
    });
  }

  console.log("\nStarlight scaffold complete!");
  console.log("\nNext steps:");
  console.log(
    "  pnpm install             # Install dependencies",
  );
  console.log("  pnpm run docs:wiki:dev   # Start dev server");
  console.log(
    `  After adding Markdown under src/content/docs/, re-run: node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .`,
  );
}

main();
