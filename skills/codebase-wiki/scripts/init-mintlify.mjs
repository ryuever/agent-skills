#!/usr/bin/env node
/** Wiki Markdown root inside the target repo (Mintlify content directory). */
const WIKI_DIR = "codebase-wiki";

/**
 * Scaffold codebase-wiki/ + Mintlify docs.json for the codebase-wiki workflow.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-mintlify.mjs --root .
 *
 * Options:
 *   --root <dir>       Target repository root (default: cwd)
 *   --skill-dir <dir>  Path to the codebase-wiki skill folder (default: parent of scripts/)
 *   --title <string>   Wiki title (default: Codebase Wiki)
 *   --color <hex>      Primary brand color (default: #0D9373)
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
    color: "#0D9373",
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--skill-dir" && argv[i + 1])
      out.skillDir = path.resolve(argv[++i]);
    else if (a === "--title" && argv[i + 1]) out.title = argv[++i];
    else if (a === "--color" && argv[i + 1]) out.color = argv[++i];
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

/**
 * Build the Mintlify docs.json configuration.
 * Navigation groups will be populated by regenerate-navigation.mjs.
 */
function buildDocsJson(title, color) {
  return JSON.stringify(
    {
      $schema: "https://mintlify.com/docs.json",
      theme: "mint",
      name: title,
      colors: {
        primary: color,
        light: color,
        dark: color,
      },
      favicon: "/favicon.svg",
      navigation: {
        groups: [
          {
            group: "首页",
            pages: ["INDEX"],
          },
          {
            group: "架构分析",
            pages: [],
          },
          {
            group: "技术讨论",
            pages: [],
          },
          {
            group: "参考手册",
            pages: [],
          },
          {
            group: "规划路线",
            pages: [],
          },
        ],
      },
      footer: {
        socials: {},
      },
    },
    null,
    2,
  ) + "\n";
}

/**
 * Build Mintlify-compatible INDEX.mdx landing page.
 */
function buildIndexMdx(title) {
  return `---
title: ${title}
description: "${title} — 架构分析、技术讨论、参考手册与路线图"
---

# ${title}

源码阅读与概念笔记

> 本目录（\`codebase-wiki/\`）存放 AI 辅助生成的分析文档、技术讨论、参考手册与规划路线。
> 书写规范请参考 [CONVENTIONS](./CONVENTIONS)。

## 快速导航

<CardGroup cols={2}>
  <Card title="架构分析" icon="building" href="/architecture">
    模块职责、依赖与系统设计笔记。
  </Card>
  <Card title="技术讨论" icon="comments" href="/discussion">
    方案对比、概念辨析与深度笔记。
  </Card>
  <Card title="参考手册" icon="book" href="/reference">
    目录结构与速查。
  </Card>
  <Card title="规划路线" icon="road" href="/roadmap">
    差距分析、优先级与待办。
  </Card>
</CardGroup>

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
  const { root, skillDir, title, color, force } = parseArgs(process.argv);
  const refs = path.join(skillDir, "references", "CONVENTIONS.md");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }

  // Create directory structure
  const dirs = [
    `${WIKI_DIR}/architecture`,
    `${WIKI_DIR}/discussion`,
    `${WIKI_DIR}/reference`,
    `${WIKI_DIR}/roadmap`,
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }

  // Create .gitkeep files
  for (const d of ["architecture", "discussion", "reference", "roadmap"]) {
    const g = path.join(root, WIKI_DIR, d, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");
  }

  // Copy CONVENTIONS.md
  const conventionsDest = path.join(root, WIKI_DIR, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsDest) || force) {
    fs.copyFileSync(refs, conventionsDest);
    console.log(`Wrote ${conventionsDest}`);
  } else {
    console.log(`Skip existing ${conventionsDest}`);
  }

  // Write INDEX.mdx (Mintlify uses .mdx)
  writeIfAbsent(
    path.join(root, WIKI_DIR, "INDEX.mdx"),
    buildIndexMdx(title),
    force,
  );

  // Write docs.json inside codebase-wiki/
  writeIfAbsent(
    path.join(root, WIKI_DIR, "docs.json"),
    buildDocsJson(title, color),
    force,
  );

  // Write a minimal favicon placeholder
  const faviconPath = path.join(root, WIKI_DIR, "favicon.svg");
  if (!fs.existsSync(faviconPath) || force) {
    writeIfAbsent(
      faviconPath,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📖</text></svg>\n`,
      force,
    );
  }

  // Run regenerate-navigation.mjs to populate navigation
  const regen = path.join(__dirname, "regenerate-navigation.mjs");
  if (fs.existsSync(regen)) {
    execFileSync(process.execPath, [regen, "--root", root], {
      stdio: "inherit",
    });
  }

  console.log("\nMintlify scaffold complete!");
  console.log("\nNext steps:");
  console.log("  npm i -g mint          # Install Mintlify CLI");
  console.log(
    `  cd ${path.relative(process.cwd(), path.join(root, WIKI_DIR))} && mint dev   # Preview locally`,
  );
  console.log(
    `  After adding Markdown under ${WIKI_DIR}/, re-run: node <skill-dir>/scripts/regenerate-navigation.mjs --root .`,
  );
}

main();
