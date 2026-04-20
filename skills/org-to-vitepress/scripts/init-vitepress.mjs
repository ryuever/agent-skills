#!/usr/bin/env node
/**
 * Scaffold a VitePress site that serves an org-converted Markdown tree.
 *
 * Usage (from the target repo root, after running convert-org-to-md.mjs):
 *   node <skill>/scripts/init-vitepress.mjs --root . --title "Org Archive"
 *
 * Options:
 *   --root <dir>        Target repository root (default: cwd)
 *   --skill-dir <dir>   Path to the org-to-vitepress skill folder (default: parent of scripts/)
 *   --title <string>    Site title (default: "Org Archive")
 *   --github <url>      Optional GitHub repo URL for social link
 *   --src-dir <name>    VitePress srcDir inside root (default: "org-wiki")
 *   --force             Overwrite generated files if they already exist
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// `npx skills` strips dot-prefixed directories during install; our asset tree
// therefore uses `_vitepress/` and we rename it to `.vitepress/` on copy.
const DOTDIR_RENAME = { _vitepress: ".vitepress" };

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    skillDir: path.join(__dirname, ".."),
    title: "Org Archive",
    github: "",
    srcDir: "org-wiki",
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--skill-dir" && argv[i + 1]) out.skillDir = path.resolve(argv[++i]);
    else if (a === "--title" && argv[i + 1]) out.title = argv[++i];
    else if (a === "--github" && argv[i + 1]) out.github = argv[++i];
    else if (a === "--src-dir" && argv[i + 1]) out.srcDir = argv[++i].replace(/^\.?\/+|\/+$/g, "");
    else if (a === "--force") out.force = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function printHelp() {
  console.log(`init-vitepress.mjs — Scaffold a VitePress site for org-converted markdown.

Options:
  --root <dir>        Target repo root (default: cwd)
  --title <string>    Site title (default: "Org Archive")
  --github <url>      Optional GitHub repo URL
  --src-dir <name>    srcDir inside root (default: "org-wiki")
  --force             Overwrite existing generated files`);
}

function copyDirWithReplacements(srcDir, destDir, replacements, force) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destName = DOTDIR_RENAME[entry.name] || entry.name;
    const destPath = path.join(destDir, destName);
    if (entry.isDirectory()) {
      copyDirWithReplacements(srcPath, destPath, replacements, force);
    } else {
      if (fs.existsSync(destPath) && !force) {
        console.log(`skip existing ${destPath}`);
        continue;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      let content = fs.readFileSync(srcPath, "utf8");
      for (const [pattern, value] of replacements) {
        content = content.replaceAll(pattern, value);
      }
      fs.writeFileSync(destPath, content, "utf8");
      console.log(`wrote ${destPath}`);
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
    "docs:org:dev": "vitepress dev",
    "docs:org:build": "vitepress build",
    "docs:org:preview": "vitepress preview",
  };
  let changed = false;
  for (const [k, v] of Object.entries(scripts)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  }
  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.devDependencies.vitepress) {
    pkg.devDependencies.vitepress = "^1.6.3";
    changed = true;
  }
  if (changed || !fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    console.log(`updated ${pkgPath}`);
  } else {
    console.log("no package.json changes needed");
  }
}

function main() {
  const { root, skillDir, title, github, srcDir, force } = parseArgs(process.argv);
  const assetsDir = path.join(skillDir, "assets", "vitepress");

  if (!fs.existsSync(assetsDir)) {
    console.error(`missing assets directory: ${assetsDir}`);
    process.exit(1);
  }

  // 1. Ensure srcDir exists (convert-org-to-md.mjs usually creates it already)
  const wikiRoot = path.join(root, srcDir);
  fs.mkdirSync(wikiRoot, { recursive: true });

  // 2. Build replacement pairs
  const socialLinks =
    github && github.length > 0
      ? `{ icon: "github", link: ${JSON.stringify(github)} }`
      : "";

  const replacements = [
    ["__WIKI_TITLE__", title],
    ["__SOCIAL_LINKS__", socialLinks],
    ["__SRC_DIR__", srcDir],
  ];

  // 3. Copy assets skeleton into target repo root
  //    assets/vitepress/_vitepress/* → <root>/.vitepress/*
  //    assets/vitepress/INDEX.md     → <root>/<srcDir>/INDEX.md (if missing)
  const vpAssetsDir = path.join(assetsDir, "_vitepress");
  const vpDestDir = path.join(root, ".vitepress");
  copyDirWithReplacements(vpAssetsDir, vpDestDir, replacements, force);

  const indexSrc = path.join(assetsDir, "INDEX.md");
  const indexDest = path.join(wikiRoot, "INDEX.md");
  if (fs.existsSync(indexSrc)) {
    if (!fs.existsSync(indexDest) || force) {
      let content = fs.readFileSync(indexSrc, "utf8");
      for (const [pattern, value] of replacements) {
        content = content.replaceAll(pattern, value);
      }
      fs.writeFileSync(indexDest, content, "utf8");
      console.log(`wrote ${indexDest}`);
    } else {
      console.log(`skip existing ${indexDest}`);
    }
  }

  // 4. Merge package.json
  mergePackageJson(root);

  // 5. Run regenerate-vitepress-sidebar.mjs to build the initial sidebar
  const regen = path.join(__dirname, "regenerate-vitepress-sidebar.mjs");
  if (fs.existsSync(regen)) {
    execFileSync(process.execPath, [regen, "--root", root, "--src-dir", srcDir], {
      stdio: "inherit",
    });
  }

  console.log("\nVitePress scaffold complete.");
  console.log("\nnext steps:");
  console.log("  pnpm install              # or npm install / yarn");
  console.log("  pnpm run docs:org:dev     # open http://localhost:5173/");
  console.log(
    `\nwhenever you add or rename markdown under ${srcDir}/, re-run:`,
  );
  console.log(
    `  node <skill-dir>/scripts/regenerate-vitepress-sidebar.mjs --root . --src-dir ${srcDir}`,
  );
}

main();
