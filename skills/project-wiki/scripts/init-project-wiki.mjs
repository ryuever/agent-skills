#!/usr/bin/env node
/**
 * Scaffold project-wiki/ with VitePress configuration.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-project-wiki.mjs --root . --title "Project Wiki"
 *
 * Options:
 *   --root <dir>       Target repository root (default: cwd)
 *   --skill-dir <dir>  Path to the project-wiki skill folder (default: parent of scripts/)
 *   --title <string>   Wiki title (default: Project Wiki)
 *   --github <url>     Optional GitHub URL for VitePress social links
 *   --stack <list>     Comma-separated: vitepress (default), mintlify, starlight, or all
 *   --force            Overwrite generated files if they already exist
 */

const WIKI_DIR = "project-wiki";

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
    color: "#0D9373",
    stack: "vitepress",
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--skill-dir" && argv[i + 1]) out.skillDir = path.resolve(argv[++i]);
    else if (a === "--title" && argv[i + 1]) out.title = argv[++i];
    else if (a === "--github" && argv[i + 1]) out.github = argv[++i];
    else if (a === "--color" && argv[i + 1]) out.color = argv[++i];
    else if (a === "--stack" && argv[i + 1]) out.stack = argv[++i];
    else if (a === "--force") out.force = true;
  }
  return out;
}

function stacksFromArg(stackArg) {
  const s = String(stackArg || "vitepress").trim().toLowerCase();
  if (s === "all") return new Set(["vitepress", "mintlify", "starlight"]);
  const parts = s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const allowed = new Set(["vitepress", "mintlify", "starlight"]);
  const picked = parts.filter((p) => allowed.has(p));
  return new Set(picked.length > 0 ? picked : ["vitepress"]);
}

// `npx skills` filters out dotfiles/dotdirs during installation, so assets
// use underscore-prefixed names (e.g. `_vitepress`) that are restored to
// dot-prefixed names (`.vitepress`) when copied into the target repo.
const DOTDIR_RENAME = { _vitepress: ".vitepress", _starlight: ".starlight" };

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
        console.log(`  Skip existing ${destPath}`);
        continue;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      let content = fs.readFileSync(srcPath, "utf8");
      for (const [pattern, value] of Object.entries(replacements)) {
        content = content.replaceAll(pattern, value);
      }
      fs.writeFileSync(destPath, content, "utf8");
      console.log(`  ✓ ${destPath}`);
    }
  }
}

function mergePackageJson(root, stacks) {
  const pkgPath = path.join(root, "package.json");
  let pkg = { name: path.basename(root), private: true, version: "0.0.0" };
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  }
  pkg.scripts = pkg.scripts || {};
  pkg.devDependencies = pkg.devDependencies || {};
  let changed = false;

  if (stacks.has("vitepress")) {
    const scripts = {
      "docs:project-wiki:dev": `vitepress dev ${WIKI_DIR}`,
      "docs:project-wiki:build": `vitepress build ${WIKI_DIR}`,
      "docs:project-wiki:preview": `vitepress preview ${WIKI_DIR}`,
    };
    for (const [k, v] of Object.entries(scripts)) {
      if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
    }
    if (!pkg.devDependencies.vitepress) {
      pkg.devDependencies.vitepress = "^1.6.3";
      changed = true;
    }
  }

  if (stacks.has("mintlify")) {
    const k = "docs:project-wiki:mintlify:dev";
    const v = `node ${WIKI_DIR}/run-mintlify.mjs`;
    if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
    if (!pkg.devDependencies.mintlify) { pkg.devDependencies.mintlify = "^4.2.0"; changed = true; }
  }

  if (stacks.has("starlight")) {
    const scripts = {
      "docs:project-wiki:starlight:dev": `npm run dev --prefix ${WIKI_DIR}/starlight`,
      "docs:project-wiki:starlight:build": `npm run build --prefix ${WIKI_DIR}/starlight`,
      "docs:project-wiki:starlight:preview": `npm run preview --prefix ${WIKI_DIR}/starlight`,
    };
    for (const [k, v] of Object.entries(scripts)) {
      if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
    }
  }

  if (changed || !fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    console.log(`  ✓ Updated ${pkgPath}`);
  }
}

function main() {
  const { root, skillDir, title, github, color, stack, force } = parseArgs(process.argv);
  const stacks = stacksFromArg(stack);

  console.log(`\n🏗️  Initializing project-wiki in ${root}\n`);

  const refs = path.join(skillDir, "references", "CONVENTIONS.md");
  const vpAssetsDir = path.join(skillDir, "assets", "vitepress");
  const mintAssetsDir = path.join(skillDir, "assets", "mintlify");
  const starAssetsDir = path.join(skillDir, "assets", "starlight");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }

  // Create subdirectories
  const subdirs = ["overview", "architecture", "concepts", "modules", "dataflow", "operations", ".meta"];
  for (const d of subdirs) {
    const dir = path.join(root, WIKI_DIR, d);
    fs.mkdirSync(dir, { recursive: true });
    const g = path.join(dir, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");
  }

  // Copy CONVENTIONS
  const conventionsDest = path.join(root, WIKI_DIR, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsDest) || force) {
    fs.copyFileSync(refs, conventionsDest);
    console.log(`  ✓ ${conventionsDest}`);
  }

  const socialLinks = github ? `{ icon: "github", link: ${JSON.stringify(github)} }` : "";
  const starlightSocial = github
    ? `\n      social: [{ icon: "github", label: "GitHub", href: ${JSON.stringify(github)} }],`
    : "";

  // VitePress (default)
  // NOTE: assets use `_vitepress` (not `.vitepress`) because `npx skills`
  // filters out dotfiles/dotdirs during installation. The rename to
  // `.vitepress` happens inside copyDirWithReplacements via DOTDIR_RENAME.
  if (stacks.has("vitepress") && fs.existsSync(vpAssetsDir)) {
    const vpReplacements = { __WIKI_TITLE__: title, __SOCIAL_LINKS__: socialLinks };
    copyDirWithReplacements(
      path.join(vpAssetsDir, "_vitepress"),
      path.join(root, WIKI_DIR, ".vitepress"),
      vpReplacements, force,
    );

    const indexSrc = path.join(vpAssetsDir, "INDEX.md");
    const indexDest = path.join(root, WIKI_DIR, "INDEX.md");
    if (fs.existsSync(indexSrc) && (!fs.existsSync(indexDest) || force)) {
      let content = fs.readFileSync(indexSrc, "utf8");
      for (const [p, v] of Object.entries(vpReplacements)) content = content.replaceAll(p, v);
      fs.writeFileSync(indexDest, content, "utf8");
      console.log(`  ✓ ${indexDest}`);
    }
  }

  // Mintlify (optional backward compat)
  if (stacks.has("mintlify") && fs.existsSync(mintAssetsDir)) {
    copyDirWithReplacements(
      mintAssetsDir,
      path.join(root, WIKI_DIR),
      { __WIKI_TITLE__: title, __PRIMARY_COLOR__: color },
      force,
    );
  }

  // Starlight (optional backward compat)
  if (stacks.has("starlight") && fs.existsSync(starAssetsDir)) {
    copyDirWithReplacements(
      starAssetsDir,
      path.join(root, WIKI_DIR, "starlight"),
      { __WIKI_TITLE__: title, __SOCIAL_LINKS__: starlightSocial },
      force,
    );
    // Write conventions as starlight doc
    const starlightConvDest = path.join(root, WIKI_DIR, "starlight", "src", "content", "docs", "conventions.md");
    if (!fs.existsSync(starlightConvDest) || force) {
      const convContent = fs.readFileSync(refs, "utf8");
      fs.mkdirSync(path.dirname(starlightConvDest), { recursive: true });
      fs.writeFileSync(starlightConvDest,
        `---\ntitle: 文档书写规范\ndescription: project-wiki 文档书写规范\n---\n\n${convContent}`, "utf8");
      console.log(`  ✓ ${starlightConvDest}`);
    }
  }

  // Merge package.json
  mergePackageJson(root, stacks);

  // Run sidebar regeneration
  const regen = path.join(__dirname, "regenerate-sidebar.mjs");
  execFileSync(process.execPath, [regen, "--root", root], { stdio: "inherit" });

  // Print next steps
  console.log("\n📋 Next steps:\n");
  if (stacks.has("vitepress")) {
    console.log("  pnpm add -D vitepress");
    console.log("  pnpm run docs:project-wiki:dev");
  }
  if (stacks.has("mintlify")) {
    console.log("  pnpm add -D mintlify");
    console.log("  pnpm run docs:project-wiki:mintlify:dev");
  }
  if (stacks.has("starlight")) {
    console.log(`  cd ${WIKI_DIR}/starlight && pnpm install && pnpm dev`);
  }
  console.log(`\n  # Run analysis:`);
  console.log(`  node <skill-dir>/scripts/analyze-repo.mjs --root . --out-dir ${WIKI_DIR}`);
  console.log(`\n  # After adding Markdown:`);
  console.log(`  node <skill-dir>/scripts/regenerate-sidebar.mjs --root .`);
  console.log("");
}

main();
