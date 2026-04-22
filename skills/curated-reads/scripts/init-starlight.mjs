#!/usr/bin/env node
/** Content root directory name inside the target repo. */
const READS_DIR = "curated-reads";

/**
 * Scaffold curated-reads/ + Astro Starlight project for the curated-reads workflow.
 *
 * Uses template files from assets/starlight/ instead of generating config
 * strings in code. The script copies the asset skeleton, applies variable
 * substitution, and then runs regenerate-starlight-sidebar.mjs.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-starlight.mjs --root .
 *
 * Options:
 *   --root <dir>       Target repository root (default: cwd)
 *   --skill-dir <dir>  Path to the curated-reads skill folder (default: parent of scripts/)
 *   --title <string>   Site title (default: Curated Reads)
 *   --github <url>     Optional GitHub repo URL for social link
 *   --force            Overwrite generated files if they already exist
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pre-defined first-level category directories. */
const LEVEL1_CATEGORIES = ["ai", "engineering", "frontend", "devops", "product", "misc"];

/** Pre-defined second-level subdirectories (created on demand). */
const LEVEL2_DEFAULTS = {
  ai: ["agent", "llm", "mlops", "research"],
  engineering: ["system-design", "language", "best-practices"],
  frontend: ["framework", "tooling"],
  devops: ["cloud", "observability"],
  product: ["strategy", "ux"],
};

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    skillDir: path.join(__dirname, ".."),
    title: "Curated Reads",
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

/**
 * Recursively copy a directory, applying text replacements to non-binary files.
 * Skips existing files unless `force` is true.
 */
function copyDirWithReplacements(srcDir, destDir, replacements, force) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirWithReplacements(srcPath, destPath, replacements, force);
    } else {
      if (fs.existsSync(destPath) && !force) {
        console.log(`Skip existing ${destPath}`);
        continue;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      let content = fs.readFileSync(srcPath, "utf8");
      for (const [pattern, value] of replacements) {
        content = content.replaceAll(pattern, value);
      }
      fs.writeFileSync(destPath, content, "utf8");
      console.log(`Wrote ${destPath}`);
    }
  }
}

function mergePackageJson(root) {
  const pkgPath = path.join(root, "package.json");
  let pkg = { name: path.basename(root), private: true, version: "0.0.0" };
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  }
  pkg.scripts = pkg.scripts || {};
  const scripts = {
    "docs:reads:dev": "astro dev",
    "docs:reads:build": "astro build",
    "docs:reads:preview": "astro preview",
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

function main() {
  const { root, skillDir, title, github, force } = parseArgs(process.argv);
  const refs = path.join(skillDir, "references", "CONVENTIONS.md");
  const assetsDir = path.join(skillDir, "assets", "starlight");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }
  if (!fs.existsSync(assetsDir)) {
    console.error(`Missing assets directory: ${assetsDir}`);
    process.exit(1);
  }

  // Starlight expects content in src/content/docs/
  const docsDir = path.join(root, "src", "content", "docs");

  // 1. Create first-level category directories with .gitkeep
  for (const cat of LEVEL1_CATEGORIES) {
    const dir = path.join(docsDir, cat);
    fs.mkdirSync(dir, { recursive: true });
    const g = path.join(dir, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");

    // Create default second-level subdirectories
    const subs = LEVEL2_DEFAULTS[cat];
    if (subs) {
      for (const sub of subs) {
        const subDir = path.join(dir, sub);
        fs.mkdirSync(subDir, { recursive: true });
        const sg = path.join(subDir, ".gitkeep");
        if (!fs.existsSync(sg)) fs.writeFileSync(sg, "", "utf8");
      }
    }
  }

  // Also create the curated-reads/ directory for convention compatibility
  const readsDir = path.join(root, READS_DIR);
  fs.mkdirSync(readsDir, { recursive: true });

  // 2. Copy CONVENTIONS.md to both locations
  const conventionsDocsDest = path.join(docsDir, "conventions.md");
  if (!fs.existsSync(conventionsDocsDest) || force) {
    const conventionsContent = fs.readFileSync(refs, "utf8");
    const starlightConventions = `---
title: 文档书写规范
description: "Curated Reads 文档书写规范"
---

${conventionsContent}
`;
    fs.writeFileSync(conventionsDocsDest, starlightConventions, "utf8");
    console.log(`Wrote ${conventionsDocsDest}`);
  } else {
    console.log(`Skip existing ${conventionsDocsDest}`);
  }

  const conventionsReadsDest = path.join(readsDir, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsReadsDest) || force) {
    fs.copyFileSync(refs, conventionsReadsDest);
    console.log(`Wrote ${conventionsReadsDest}`);
  } else {
    console.log(`Skip existing ${conventionsReadsDest}`);
  }

  // 3. Create INDEX.md in curated-reads/
  const indexPath = path.join(readsDir, "INDEX.md");
  if (!fs.existsSync(indexPath) || force) {
    const indexContent = `# Curated Reads 索引

## AI & ML (AI-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |

## Engineering (ENG-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |

## Frontend (FE-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |

## DevOps & Infra (OPS-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |

## Product & Design (PD-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |

## Misc (M-xxx)

| # | 文件 | 标题 | 来源 | 概述 |
|---|------|------|------|------|
|  |  |  |  |  |
`;
    fs.writeFileSync(indexPath, indexContent, "utf8");
    console.log(`Wrote ${indexPath}`);
  } else {
    console.log(`Skip existing ${indexPath}`);
  }

  // 4. Build replacement pairs
  const socialLinks = github
    ? `social: [{ icon: "github", label: "GitHub", href: ${JSON.stringify(github)} }],`
    : "";

  const replacements = [
    ["__WIKI_TITLE__", title],
    ["__SOCIAL_LINKS__", socialLinks],
  ];

  // 5. Copy assets/starlight/ skeleton into target repo root
  copyDirWithReplacements(assetsDir, root, replacements, force);

  // 6. Merge package.json (keep our pinned versions)
  mergePackageJson(root);

  // 7. Run regenerate-starlight-sidebar.mjs to create initial sidebar
  const regen = path.join(__dirname, "regenerate-starlight-sidebar.mjs");
  if (fs.existsSync(regen)) {
    execFileSync(process.execPath, [regen, "--root", root], {
      stdio: "inherit",
    });
  }

  // 8. Auto-link with architecture-diagrams/ when present
  const linker = path.join(__dirname, "link-architecture-diagrams.mjs");
  if (fs.existsSync(linker)) {
    execFileSync(process.execPath, [linker, "--root", root], {
      stdio: "inherit",
    });
  }

  console.log("\nStarlight scaffold complete!");
  console.log("\nNext steps:");
  console.log("  pnpm install              # Install dependencies");
  console.log("  pnpm run docs:reads:dev   # Start dev server");
  console.log(
    `  After adding Markdown under src/content/docs/, re-run: node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .`,
  );
}

main();
