#!/usr/bin/env node
/** Wiki Markdown root inside the target repo (VitePress `srcDir`). */
const WIKI_DIR = "codebase-wiki";

/**
 * Scaffold codebase-wiki/ + .vitepress for the codebase-wiki workflow.
 *
 * Usage (from target repo root):
 *   node <path-to-this-skill>/scripts/init-vitepress.mjs --root .
 *
 * Options:
 *   --root <dir>       Target repository root (default: cwd)
 *   --skill-dir <dir>  Path to the codebase-wiki skill folder (default: parent of scripts/)
 *   --title <string>   Wiki title for INDEX hero + VitePress title (default: Codebase Wiki)
 *   --github <url>     Optional GitHub repo URL for theme social link
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
    "docs:wiki:dev": "vitepress dev",
    "docs:wiki:build": "vitepress build",
    "docs:wiki:preview": "vitepress preview",
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

/** @param {string} title @param {string} github */
function buildVitePressConfig(title, github) {
  const social =
    github && github.length > 0
      ? `socialLinks: [{ icon: "github", link: ${JSON.stringify(github)} }],`
      : "socialLinks: [],";

  return `import { defineConfig } from "vitepress";
import type { MarkdownIt } from "markdown-it";
import { wikiNav, wikiSidebar } from "./sidebar.generated.mts";

/**
 * Escape bare angle brackets in prose so TypeScript generics are not parsed as HTML.
 */
function escapeAngleBrackets(md: MarkdownIt) {
  const defaultHtmlInline =
    md.renderer.rules.html_inline ||
    ((tokens, idx) => tokens[idx].content);

  md.renderer.rules.html_inline = (tokens, idx, options, env, self) => {
    const content = tokens[idx].content;
    const htmlTagRe =
      /^<\\/?(div|span|p|br|hr|img|a|b|i|em|strong|code|pre|ul|ol|li|table|thead|tbody|tr|td|th|h[1-6]|blockquote|details|summary|sup|sub|del|ins|mark|ruby|rt|rp|section|article|aside|nav|header|footer|main|figure|figcaption|caption|col|colgroup|dd|dl|dt|fieldset|form|input|label|legend|meter|optgroup|option|output|progress|select|textarea|button|abbr|address|cite|dfn|kbd|s|samp|small|u|var|wbr|slot|template|component|transition|keep-alive|teleport|suspense)[\\s>/]/i;

    if (!htmlTagRe.test(content)) {
      return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    return defaultHtmlInline(tokens, idx, options, env, self);
  };
}

export default defineConfig({
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(`${title} — 架构分析、技术讨论、参考手册与路线图`)},
  lang: "zh-CN",
  srcDir: ${JSON.stringify(`./${WIKI_DIR}`)},
  markdown: {
    defaultHighlightLang: "typescript",
    config: (md) => {
      md.use(escapeAngleBrackets);
    },
  },
  themeConfig: {
    nav: wikiNav,
    sidebar: wikiSidebar,
    search: { provider: "local" },
    ${social}
    footer: {
      message: "AI 辅助生成的技术文档",
      copyright: ${JSON.stringify(title)},
    },
    docFooter: { prev: "上一篇", next: "下一篇" },
    outline: { label: "目录", level: [2, 3] },
    lastUpdated: { text: "最后更新于" },
  },
});
`;
}

function main() {
  const { root, skillDir, title, github, force } = parseArgs(process.argv);
  const refs = path.join(skillDir, "references", "CONVENTIONS.md");
  const tmplIndex = path.join(skillDir, "templates", "codebase-wiki-INDEX.md");

  if (!fs.existsSync(refs)) {
    console.error(`Missing ${refs}`);
    process.exit(1);
  }
  if (!fs.existsSync(tmplIndex)) {
    console.error(`Missing ${tmplIndex}`);
    process.exit(1);
  }

  const dirs = [
    `${WIKI_DIR}/architecture`,
    `${WIKI_DIR}/discussion`,
    `${WIKI_DIR}/reference`,
    `${WIKI_DIR}/roadmap`,
    ".vitepress",
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }

  for (const d of ["architecture", "discussion", "reference", "roadmap"]) {
    const g = path.join(root, WIKI_DIR, d, ".gitkeep");
    if (!fs.existsSync(g)) fs.writeFileSync(g, "", "utf8");
  }

  const conventionsDest = path.join(root, WIKI_DIR, "CONVENTIONS.md");
  if (!fs.existsSync(conventionsDest) || force) {
    fs.copyFileSync(refs, conventionsDest);
    console.log(`Wrote ${conventionsDest}`);
  } else {
    console.log(`Skip existing ${conventionsDest}`);
  }

  const indexBody = fs
    .readFileSync(tmplIndex, "utf8")
    .replaceAll("__WIKI_TITLE__", title);
  writeIfAbsent(path.join(root, WIKI_DIR, "INDEX.md"), indexBody, force);

  mergePackageJson(root);

  const regen = path.join(__dirname, "regenerate-sidebar.mjs");
  execFileSync(process.execPath, [regen, "--root", root], { stdio: "inherit" });

  const vpConfig = path.join(root, ".vitepress", "config.mts");
  writeIfAbsent(vpConfig, buildVitePressConfig(title, github), force);

  console.log("\nNext steps:");
  console.log("  pnpm add -D vitepress   # or npm/yarn if not already installed");
  console.log("  pnpm run docs:wiki:dev");
  console.log(
    `  After adding Markdown under ${WIKI_DIR}/, re-run: node <skill-dir>/scripts/regenerate-sidebar.mjs --root .`,
  );
}

main();
