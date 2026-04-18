#!/usr/bin/env node
/**
 * Scan a repository and emit project-wiki/.meta/*.json + quality-report.md
 *
 * Usage:
 *   node analyze-repo.mjs --root <repo> --out-dir project-wiki
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "out",
  "storybook-static",
  "cdk.out",
  ".vercel",
  ".svelte-kit",
]);

const CONFIG_GLOBS_HINTS = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "webpack.config.js",
  "webpack.config.cjs",
  "astro.config.mjs",
  "astro.config.ts",
  "nuxt.config.ts",
  "svelte.config.js",
  "remix.config.js",
  "angular.json",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.cjs",
  "tsconfig.json",
  "jsconfig.json",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".eslintrc.cjs",
  ".eslintrc.js",
  ".eslintrc.json",
  "playwright.config.ts",
  "vitest.config.ts",
  "jest.config.js",
  "jest.config.cjs",
  "pnpm-workspace.yaml",
  "lerna.json",
  "turbo.json",
];

function parseArgs(argv) {
  const out = { root: process.cwd(), outDir: "project-wiki" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--out-dir" && argv[i + 1]) out.outDir = argv[++i];
  }
  return out;
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function walkFindFiles(rootDir, names, maxFiles = 80) {
  const found = new Set();
  const queue = [rootDir];
  let scanned = 0;
  const maxScan = 4000;

  while (queue.length && found.size < maxFiles && scanned < maxScan) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      scanned++;
      if (scanned >= maxScan) break;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        queue.push(full);
      } else if (e.isFile() && names.has(e.name)) {
        found.add(path.relative(rootDir, full).split(path.sep).join("/"));
        if (found.size >= maxFiles) break;
      }
    }
  }
  return [...found].sort();
}

function collectDeps(pkg) {
  const d = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  return d;
}

function detectSignals(deps) {
  const keys = Object.keys(deps || {});
  const has = (n) => keys.some((k) => k === n || k.startsWith(n + "/"));
  const signals = [];
  if (has("react")) signals.push("react");
  if (has("vue")) signals.push("vue");
  if (has("svelte")) signals.push("svelte");
  if (has("next")) signals.push("next");
  if (has("nuxt")) signals.push("nuxt");
  if (has("astro")) signals.push("astro");
  if (has("@remix-run")) signals.push("remix");
  if (has("vite")) signals.push("vite");
  if (has("webpack")) signals.push("webpack");
  if (has("typescript")) signals.push("typescript");
  if (has("tailwindcss")) signals.push("tailwind");
  if (has("@tanstack/react-query")) signals.push("tanstack-query");
  if (has("swr")) signals.push("swr");
  if (has("@reduxjs/toolkit") || has("redux")) signals.push("redux");
  if (has("zustand")) signals.push("zustand");
  if (has("pinia")) signals.push("pinia");
  if (has("mobx")) signals.push("mobx");
  if (has("axios")) signals.push("axios");
  if (has("trpc")) signals.push("trpc");
  if (has("graphql")) signals.push("graphql");
  if (has("playwright")) signals.push("playwright");
  if (has("vitest")) signals.push("vitest");
  if (has("jest")) signals.push("jest");
  if (has("eslint")) signals.push("eslint");
  if (has("prettier")) signals.push("prettier");
  return [...new Set(signals)];
}

function findWorkspacePackages(root) {
  const pkgPath = path.join(root, "package.json");
  const pkg = readJsonSafe(pkgPath);
  if (!pkg) return [];
  const patterns = pkg.workspaces;
  if (!patterns) return [];
  const list = Array.isArray(patterns) ? patterns : patterns.packages;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const pat of list) {
    const base = pat.replace(/\*\*$/, "").replace(/\*$/, "");
    const dir = path.join(root, base);
    if (!exists(dir)) continue;
    try {
      for (const name of fs.readdirSync(dir)) {
        const sub = path.join(dir, name);
        const pp = path.join(sub, "package.json");
        if (fs.existsSync(pp)) {
          const p = readJsonSafe(pp);
          if (p?.name)
            out.push({
              name: p.name,
              path: path.relative(root, sub).split(path.sep).join("/"),
            });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function guessEntrypoints(root, pkg) {
  const candidates = [];
  const push = (rel) => {
    const p = path.join(root, rel);
    if (exists(p)) candidates.push(rel.split(path.sep).join("/"));
  };

  if (pkg?.main) push(pkg.main);
  if (pkg?.module) push(pkg.module);
  if (pkg?.types && pkg.types.endsWith(".ts")) push(pkg.types);

  const html = path.join(root, "index.html");
  if (exists(html)) {
    const raw = fs.readFileSync(html, "utf8");
    const m = raw.match(/src=["']([^"']+)["']/);
    if (m) push(m[1]);
    candidates.push("index.html");
  }

  const common = [
    "src/main.tsx",
    "src/main.ts",
    "src/index.tsx",
    "src/index.ts",
    "src/app.tsx",
    "src/App.tsx",
    "app/layout.tsx",
    "app/root.tsx",
    "pages/_app.tsx",
    "pages/_app.ts",
    "src/routes/+layout.svelte",
    "src/app.html",
  ];
  for (const c of common) push(c);

  return [...new Set(candidates)].slice(0, 40);
}

function listTopLevel(root) {
  const out = [];
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith(".")) continue;
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(root, name);
    let type = "file";
    try {
      type = fs.statSync(full).isDirectory() ? "dir" : "file";
    } catch {
      continue;
    }
    out.push({ name, type });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function findConfigFiles(root) {
  const found = [];
  for (const rel of CONFIG_GLOBS_HINTS) {
    const p = path.join(root, rel);
    if (exists(p)) found.push(rel);
  }
  return [...new Set(found)].sort();
}

function buildDocPlan({ entrypoints, configs, workspacePkgs, structure }) {
  /** Repo-relative paths only (no synthetic tokens). */
  const evidence = (arr) => [...new Set(arr.filter(Boolean))].slice(0, 25);

  const pages = [
    {
      slug: "overview/repo-map",
      title: "项目地图与阅读顺序",
      category: "overview",
      required: true,
      evidence: evidence([
        "package.json",
        "README.md",
        ...entrypoints.slice(0, 5),
      ]),
    },
    {
      slug: "architecture/system-architecture",
      title: "系统架构与边界",
      category: "architecture",
      required: true,
      evidence: evidence([
        ...configs.filter((c) =>
          /vite|next|webpack|astro|nuxt|tsconfig|eslint/.test(c),
        ),
        ...entrypoints.slice(0, 8),
      ]),
    },
    {
      slug: "concepts/glossary",
      title: "核心概念与术语表",
      category: "concepts",
      required: false,
      evidence: evidence([
        ...configs.filter((c) => /tsconfig|eslint|tailwind/.test(c)),
      ]),
    },
    {
      slug: "modules/core-modules",
      title: "核心模块剖析",
      category: "modules",
      required: true,
      evidence: evidence([
        ...structure.filter((s) => s.type === "dir").map((s) => s.name + "/"),
        ...entrypoints.slice(0, 10),
      ]),
    },
    {
      slug: "dataflow/request-and-state",
      title: "核心数据流（请求、状态、渲染）",
      category: "dataflow",
      required: false,
      evidence: evidence([...entrypoints.slice(0, 10), "package.json"]),
    },
    {
      slug: "operations/build-and-test",
      title: "构建、测试与运行",
      category: "operations",
      required: false,
      evidence: evidence([
        "package.json",
        ...configs.filter((c) =>
          /vitest|jest|playwright|eslint|tailwind|postcss/.test(c),
        ),
      ]),
    },
  ];

  if (workspacePkgs.length > 0) {
    pages.splice(1, 0, {
      slug: "overview/monorepo-layout",
      title: "Monorepo 布局与工作区",
      category: "overview",
      required: false,
      evidence: evidence([
        "package.json",
        "pnpm-workspace.yaml",
        ...workspacePkgs.map((w) => w.path + "/package.json"),
      ]),
    });
  }

  return { generatedAt: new Date().toISOString(), pages };
}

function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`Wrote ${file}`);
}

function main() {
  const { root, outDir } = parseArgs(process.argv);
  const wikiRoot = path.join(root, outDir);
  const metaDir = path.join(wikiRoot, ".meta");

  const pkgPath = path.join(root, "package.json");
  const pkg = readJsonSafe(pkgPath) || {};
  const deps = collectDeps(pkg);
  const signals = detectSignals(deps);
  const structure = listTopLevel(root);
  const configs = findConfigFiles(root);
  const entrypoints = guessEntrypoints(root, pkg);
  const workspacePkgs = findWorkspacePackages(root);

  const nameSet = new Set(CONFIG_GLOBS_HINTS);
  const deepConfigs = walkFindFiles(root, nameSet, 60).filter(
    (p) => p.includes("/") && !p.startsWith("node_modules"),
  );

  const repoJson = {
    name: pkg.name || path.basename(root),
    version: pkg.version || null,
    private: pkg.private ?? null,
    description: pkg.description || null,
    scripts: pkg.scripts || {},
    signals,
    packageManager:
      (pkg.packageManager || "").split("@")[0] || (exists(path.join(root, "pnpm-lock.yaml")) ? "pnpm" : null) ||
      (exists(path.join(root, "yarn.lock")) ? "yarn" : null) ||
      (exists(path.join(root, "package-lock.json")) ? "npm" : null),
    workspaces: Boolean(pkg.workspaces),
  };

  const structureJson = {
    topLevel: structure,
    configFiles: [...new Set([...configs, ...deepConfigs])].sort(),
  };

  const entryJson = {
    candidates: entrypoints,
    workspacePackages: workspacePkgs,
  };

  const docPlan = buildDocPlan({
    entrypoints,
    configs: structureJson.configFiles,
    workspacePkgs,
    structure,
  });

  fs.mkdirSync(metaDir, { recursive: true });
  writeFileEnsured(path.join(metaDir, "repo.json"), JSON.stringify(repoJson, null, 2) + "\n");
  writeFileEnsured(
    path.join(metaDir, "structure.json"),
    JSON.stringify(structureJson, null, 2) + "\n",
  );
  writeFileEnsured(
    path.join(metaDir, "entrypoints.json"),
    JSON.stringify(entryJson, null, 2) + "\n",
  );
  writeFileEnsured(path.join(metaDir, "doc_plan.json"), JSON.stringify(docPlan, null, 2) + "\n");

  const qr = `# Project wiki 扫描报告

由 \`analyze-repo.mjs\` 在 **${new Date().toISOString()}** 生成。

## 覆盖说明

- 本脚本为**启发式**扫描，未执行类型检查或测试；复杂别名与动态 import 可能未被收录。
- **入口推断**见 \`.meta/entrypoints.json\`；请人工核对主应用入口。
- **配置文件**见 \`.meta/structure.json\` 中的 \`configFiles\`。

## 技术栈信号（repo.json.signals）

${signals.length ? signals.map((s) => `- ${s}`).join("\n") : "- （未从 dependencies 中识别到典型前端栈）"}

## 建议撰写的页面（doc_plan.json）

${docPlan.pages
  .map(
    (p) =>
      `- **${p.slug}** (${p.required ? "建议必写" : "按需"}) — ${p.title}\n  - evidence 线索: ${p.evidence.slice(0, 8).join(", ")}${p.evidence.length > 8 ? ", …" : ""}`,
  )
  .join("\n")}

## 后续动作

1. Agent 阅读 \`references/doc-templates.md\` 与 \`references/FRONTEND-FOCUS.md\`。
2. 按 \`doc_plan.json\` 在 \`${outDir}/\` 各子目录创建 Markdown（见 skill \`CONVENTIONS.md\`）。
3. 运行 \`regenerate-sidebar.mjs\` 更新 VitePress 侧栏。
`;

  const qrPath = path.join(wikiRoot, "quality-report.md");
  fs.mkdirSync(wikiRoot, { recursive: true });
  fs.writeFileSync(qrPath, qr, "utf8");
  console.log(`Wrote ${qrPath}`);

  console.log("\nDone. Next: read .meta/doc_plan.json and author Markdown pages.");
}

main();
