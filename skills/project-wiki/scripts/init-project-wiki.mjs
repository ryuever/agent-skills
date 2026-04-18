#!/usr/bin/env node
/** Markdown + VitePress root (nested under repo root). */
const WIKI_DIR = "project-wiki";

/**
 * Scaffold project-wiki/ + project-wiki/.vitepress for DeepWiki-style docs.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-project-wiki.mjs --root .
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
    title: "Project Wiki",
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
    "docs:project-wiki:dev": `vitepress dev ${WIKI_DIR}`,
    "docs:project-wiki:build": `vitepress build ${WIKI_DIR}`,
    "docs:project-wiki:preview": `vitepress preview ${WIKI_DIR}`,
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
    console.log(`Updated ${pkgPath}`);
  } else {
    console.log("No package.json changes needed");
  }
}

function main() {
  const { root, skillDir, title, github, force } = parseArgs(process.argv);
  const refs = path.join(skillDir, "references", "CONVENTIONS.md");
  const assetsDir = path.join(skillDir, "assets", "vitepress");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }
  if (!fs.existsSync(assetsDir)) {
    console.error(`Missing assets directory: ${assetsDir}`);
    process.exit(1);
  }

  const subdirs = [
    "overview",
    "architecture",
    "concepts",
    "modules",
    "dataflow",
    "operations",
    ".meta",
  ];
  for (const d of subdirs) {
    const dir = path.join(root, WIKI_DIR, d);
    fs.mkdirSync(dir, { recursive: true });
    const g = path.join(dir, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");
  }

  const conventionsDest = path.join(root, WIKI_DIR, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsDest) || force) {
    fs.copyFileSync(refs, conventionsDest);
    console.log(`Wrote ${conventionsDest}`);
  } else {
    console.log(`Skip existing ${conventionsDest}`);
  }

  const socialLinks =
    github && github.length > 0
      ? `{ icon: "github", link: ${JSON.stringify(github)} }`
      : "";

  const replacements = [
    ["__WIKI_TITLE__", title],
    ["__SOCIAL_LINKS__", socialLinks],
  ];

  const vpAssetsDir = path.join(assetsDir, ".vitepress");
  const vpDestDir = path.join(root, WIKI_DIR, ".vitepress");
  copyDirWithReplacements(vpAssetsDir, vpDestDir, replacements, force);

  const indexSrc = path.join(assetsDir, "INDEX.md");
  const indexDest = path.join(root, WIKI_DIR, "INDEX.md");
  if (fs.existsSync(indexSrc)) {
    if (!fs.existsSync(indexDest) || force) {
      let content = fs.readFileSync(indexSrc, "utf8");
      for (const [pattern, value] of replacements) {
        content = content.replaceAll(pattern, value);
      }
      fs.writeFileSync(indexDest, content, "utf8");
      console.log(`Wrote ${indexDest}`);
    } else {
      console.log(`Skip existing ${indexDest}`);
    }
  }

  mergePackageJson(root);

  const regen = path.join(__dirname, "regenerate-sidebar.mjs");
  execFileSync(process.execPath, [regen, "--root", root], { stdio: "inherit" });

  console.log("\nNext steps:");
  console.log("  pnpm add -D vitepress");
  console.log("  pnpm run docs:project-wiki:dev");
  console.log(
    `  node <skill-dir>/scripts/analyze-repo.mjs --root . --out-dir ${WIKI_DIR}`,
  );
  console.log(
    `  After adding Markdown under ${WIKI_DIR}/, re-run: node <skill-dir>/scripts/regenerate-sidebar.mjs --root .`,
  );
}

main();
