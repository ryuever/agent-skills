#!/usr/bin/env node
/**
 * Deep-analyze a repository and emit project-wiki/.meta/*.json + quality-report.md
 *
 * Produces richer metadata than a shallow scan:
 *   - repo.json        — package info, signals, scripts, package manager
 *   - structure.json    — top-level tree + config files + file stats
 *   - entrypoints.json  — entry files + workspace packages
 *   - imports.json      — lightweight import graph (top importers / exported modules)
 *   - doc_plan.json     — hierarchical page plan with numbered sections
 *
 * Usage:
 *   node analyze-repo.mjs --root <repo> --out-dir project-wiki [--depth deep]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "coverage",
  ".next", ".nuxt", ".output", ".turbo", ".cache", ".parcel-cache",
  "out", "storybook-static", "cdk.out", ".vercel", ".svelte-kit",
  ".vitepress", ".starlight", "project-wiki", "codebase-wiki",
  "__pycache__", ".pytest_cache", ".mypy_cache", ".tox",
]);

const SOURCE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  ".vue", ".svelte", ".astro",
]);

const STYLE_EXTS = new Set([".css", ".scss", ".sass", ".less", ".styl"]);
const TEST_PATTERNS = [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /__tests__/];
const CONFIG_FILES = [
  "vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs",
  "next.config.js", "next.config.mjs", "next.config.ts",
  "webpack.config.js", "webpack.config.cjs",
  "astro.config.mjs", "astro.config.ts",
  "nuxt.config.ts", "svelte.config.js", "remix.config.js",
  "angular.json", "tailwind.config.js", "tailwind.config.ts",
  "postcss.config.js", "postcss.config.cjs", "postcss.config.mjs",
  "tsconfig.json", "jsconfig.json",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
  ".eslintrc.cjs", ".eslintrc.js", ".eslintrc.json",
  "playwright.config.ts", "vitest.config.ts", "vitest.config.mts",
  "jest.config.js", "jest.config.cjs", "jest.config.ts",
  "pnpm-workspace.yaml", "lerna.json", "turbo.json",
  "biome.json", "biome.jsonc", "dprint.json",
  ".prettierrc", ".prettierrc.js", ".prettierrc.json",
  "wrangler.toml", "vercel.json", "netlify.toml",
  "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
  ".env.example", ".env.local.example",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { root: process.cwd(), outDir: "project-wiki", depth: "deep" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) out.root = path.resolve(argv[++i]);
    else if (a === "--out-dir" && argv[i + 1]) out.outDir = argv[++i];
    else if (a === "--depth" && argv[i + 1]) out.depth = argv[++i];
  }
  return out;
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

/* ------------------------------------------------------------------ */
/*  Walk & collect files                                              */
/* ------------------------------------------------------------------ */

function walkAll(rootDir, maxFiles = 8000) {
  const files = [];
  const queue = [rootDir];
  let scanned = 0;

  while (queue.length && files.length < maxFiles) {
    const dir = queue.shift();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (++scanned > 50000) return files;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        queue.push(full);
      } else if (e.isFile()) {
        const rel = path.relative(rootDir, full).split(path.sep).join("/");
        const ext = path.extname(e.name).toLowerCase();
        let size = 0;
        try { size = fs.statSync(full).size; } catch { /* skip */ }
        files.push({ rel, ext, size, full });
      }
    }
  }
  return files;
}

/* ------------------------------------------------------------------ */
/*  File statistics                                                   */
/* ------------------------------------------------------------------ */

function computeFileStats(files) {
  const stats = {
    totalFiles: files.length,
    sourceFiles: 0,
    testFiles: 0,
    styleFiles: 0,
    totalSizeKB: 0,
    byExtension: {},
    largestFiles: [],
    directories: new Set(),
  };

  for (const f of files) {
    stats.totalSizeKB += f.size / 1024;
    const ext = f.ext || "(no ext)";
    stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;

    if (SOURCE_EXTS.has(f.ext)) stats.sourceFiles++;
    if (STYLE_EXTS.has(f.ext)) stats.styleFiles++;
    if (TEST_PATTERNS.some((p) => p.test(f.rel))) stats.testFiles++;

    const dir = f.rel.split("/").slice(0, 2).join("/");
    stats.directories.add(dir);
    stats.largestFiles.push({ rel: f.rel, sizeKB: Math.round(f.size / 1024) });
  }

  stats.largestFiles.sort((a, b) => b.sizeKB - a.sizeKB);
  stats.largestFiles = stats.largestFiles.slice(0, 20);
  stats.totalSizeKB = Math.round(stats.totalSizeKB);
  stats.directories = [...stats.directories].sort();

  return stats;
}

/* ------------------------------------------------------------------ */
/*  Import graph (lightweight)                                        */
/* ------------------------------------------------------------------ */

const IMPORT_RE = /(?:import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

function extractImports(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, "utf8"); } catch { return []; }
  // Only scan first 200 lines to stay fast
  const lines = content.split("\n").slice(0, 200).join("\n");
  const imports = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(lines)) !== null) {
    const spec = m[1] || m[2];
    if (spec) imports.push(spec);
  }
  return imports;
}

function buildImportGraph(rootDir, sourceFiles) {
  const graph = {}; // rel -> { imports: string[], importedBy: string[] }
  const localImports = []; // [{ from, to }]

  for (const f of sourceFiles) {
    const rawImports = extractImports(f.full);
    const resolved = [];
    for (const spec of rawImports) {
      if (spec.startsWith(".")) {
        // Resolve relative
        const dir = path.dirname(f.rel);
        let target = path.posix.join(dir, spec);
        // Try common extensions
        const candidates = [target, target + ".ts", target + ".tsx", target + ".js",
          target + ".jsx", target + "/index.ts", target + "/index.tsx",
          target + "/index.js"];
        const found = candidates.find((c) =>
          sourceFiles.some((sf) => sf.rel === c));
        if (found) {
          resolved.push(found);
          localImports.push({ from: f.rel, to: found });
        }
      } else {
        resolved.push(spec); // npm package
      }
    }
    graph[f.rel] = { imports: resolved, importedBy: [] };
  }

  // Build importedBy
  for (const { from, to } of localImports) {
    if (graph[to]) {
      graph[to].importedBy.push(from);
    }
  }

  // Identify hub files (most imported)
  const hubFiles = Object.entries(graph)
    .filter(([, v]) => v.importedBy.length > 0)
    .sort((a, b) => b[1].importedBy.length - a[1].importedBy.length)
    .slice(0, 30)
    .map(([rel, v]) => ({ file: rel, importedByCount: v.importedBy.length }));

  // Identify heavy importers (files that import the most)
  const heavyImporters = Object.entries(graph)
    .sort((a, b) => b[1].imports.length - a[1].imports.length)
    .slice(0, 20)
    .map(([rel, v]) => ({ file: rel, importCount: v.imports.length }));

  // External dependency usage frequency
  const extDeps = {};
  for (const [, v] of Object.entries(graph)) {
    for (const imp of v.imports) {
      if (!imp.startsWith(".") && !imp.startsWith("/")) {
        const pkg = imp.startsWith("@") ? imp.split("/").slice(0, 2).join("/") : imp.split("/")[0];
        extDeps[pkg] = (extDeps[pkg] || 0) + 1;
      }
    }
  }
  const topExternalDeps = Object.entries(extDeps)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, usageCount: count }));

  return { hubFiles, heavyImporters, topExternalDeps, totalEdges: localImports.length };
}

/* ------------------------------------------------------------------ */
/*  Route & state detection                                           */
/* ------------------------------------------------------------------ */

function detectRoutes(rootDir, sourceFiles) {
  const routes = { type: "unknown", files: [], patterns: [] };

  // File-system routing (Next.js app/ or pages/)
  const appDir = sourceFiles.filter((f) => f.rel.startsWith("app/") || f.rel.startsWith("src/app/"));
  const pagesDir = sourceFiles.filter((f) => f.rel.startsWith("pages/") || f.rel.startsWith("src/pages/"));

  if (appDir.some((f) => /layout\.[tj]sx?$/.test(f.rel))) {
    routes.type = "filesystem-app-router";
    routes.files = appDir.filter((f) => /page\.[tj]sx?$|layout\.[tj]sx?$|loading\.[tj]sx?$|error\.[tj]sx?$/.test(f.rel))
      .map((f) => f.rel).slice(0, 40);
    routes.patterns.push("Next.js App Router / file-system routing");
  } else if (pagesDir.length > 0) {
    routes.type = "filesystem-pages";
    routes.files = pagesDir.filter((f) => SOURCE_EXTS.has(f.ext)).map((f) => f.rel).slice(0, 40);
    routes.patterns.push("Next.js Pages Router / file-system routing");
  }

  // React Router / TanStack Router / Vue Router
  for (const f of sourceFiles) {
    if (/route[rs]?\.[tj]sx?$|router\.[tj]sx?$/i.test(f.rel)) {
      let content = "";
      try { content = fs.readFileSync(f.full, "utf8").slice(0, 3000); } catch { continue; }
      if (/createBrowserRouter|createHashRouter|RouterProvider/.test(content)) {
        routes.type = "react-router";
        routes.files.push(f.rel);
        routes.patterns.push("React Router v6+ (data router)");
      } else if (/Route\s|<Route|<Routes/.test(content)) {
        routes.type = "react-router-classic";
        routes.files.push(f.rel);
        routes.patterns.push("React Router (JSX routes)");
      } else if (/createRouter|createWebHistory|createWebHashHistory/.test(content)) {
        routes.type = "vue-router";
        routes.files.push(f.rel);
        routes.patterns.push("Vue Router");
      } else if (/createRouter.*routeTree|createRootRoute/.test(content)) {
        routes.type = "tanstack-router";
        routes.files.push(f.rel);
        routes.patterns.push("TanStack Router");
      }
    }
  }

  return routes;
}

function detectStateManagement(sourceFiles) {
  const state = { stores: [], patterns: [] };

  for (const f of sourceFiles) {
    let content = "";
    try { content = fs.readFileSync(f.full, "utf8").slice(0, 2000); } catch { continue; }

    if (/createSlice|configureStore|createAsyncThunk/.test(content)) {
      state.stores.push(f.rel);
      if (!state.patterns.includes("Redux Toolkit")) state.patterns.push("Redux Toolkit");
    }
    if (/create\s*\(\s*\(set|useStore/.test(content) && /zustand/.test(content)) {
      state.stores.push(f.rel);
      if (!state.patterns.includes("Zustand")) state.patterns.push("Zustand");
    }
    if (/defineStore/.test(content)) {
      state.stores.push(f.rel);
      if (!state.patterns.includes("Pinia")) state.patterns.push("Pinia");
    }
    if (/createContext|useContext/.test(content) && /Provider/.test(content)) {
      // Only flag context if it looks like a real state provider (not just theme/i18n)
      if (f.rel.match(/store|state|context|provider/i) && !f.rel.match(/theme|i18n|locale/i)) {
        state.stores.push(f.rel);
        if (!state.patterns.includes("React Context")) state.patterns.push("React Context");
      }
    }
    if (/useQuery|useMutation|QueryClient/.test(content)) {
      if (!state.patterns.includes("TanStack Query / SWR")) state.patterns.push("TanStack Query / SWR");
    }
    if (/observable|makeAutoObservable|makeObservable/.test(content)) {
      state.stores.push(f.rel);
      if (!state.patterns.includes("MobX")) state.patterns.push("MobX");
    }
  }

  state.stores = [...new Set(state.stores)].slice(0, 20);
  return state;
}

/* ------------------------------------------------------------------ */
/*  API / network layer detection                                     */
/* ------------------------------------------------------------------ */

function detectNetworkLayer(sourceFiles) {
  const network = { clients: [], patterns: [] };

  for (const f of sourceFiles) {
    if (!/api|service|client|fetch|request|http/i.test(f.rel)) continue;
    let content = "";
    try { content = fs.readFileSync(f.full, "utf8").slice(0, 2000); } catch { continue; }

    if (/axios\.create|new\s+Axios|axios\.\w+/.test(content)) {
      network.clients.push(f.rel);
      if (!network.patterns.includes("Axios")) network.patterns.push("Axios");
    }
    if (/fetch\(|globalThis\.fetch|window\.fetch/.test(content) && f.rel.match(/api|service|client|request/i)) {
      network.clients.push(f.rel);
      if (!network.patterns.includes("Fetch API wrapper")) network.patterns.push("Fetch API wrapper");
    }
    if (/createTRPCClient|trpc\.|initTRPC/.test(content)) {
      network.clients.push(f.rel);
      if (!network.patterns.includes("tRPC")) network.patterns.push("tRPC");
    }
    if (/graphql|gql\s*`|useQuery.*gql/.test(content)) {
      network.clients.push(f.rel);
      if (!network.patterns.includes("GraphQL")) network.patterns.push("GraphQL");
    }
  }

  network.clients = [...new Set(network.clients)].slice(0, 15);
  return network;
}

/* ------------------------------------------------------------------ */
/*  Component / UI detection                                          */
/* ------------------------------------------------------------------ */

function detectComponents(rootDir, sourceFiles) {
  const components = {
    directories: [],
    designSystem: null,
    totalComponents: 0,
  };

  // Common component directories
  const compDirs = ["src/components", "src/ui", "components", "packages/ui", "src/shared",
    "src/common", "lib/components", "app/components"];
  for (const d of compDirs) {
    const count = sourceFiles.filter((f) => f.rel.startsWith(d + "/") && SOURCE_EXTS.has(f.ext)).length;
    if (count > 0) {
      components.directories.push({ path: d, fileCount: count });
      components.totalComponents += count;
    }
  }

  // Detect design system / UI library
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = readJsonSafe(pkgPath) || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const uiLibs = [
    "antd", "@ant-design/icons", "@mui/material", "@chakra-ui/react",
    "@mantine/core", "@radix-ui/react-dialog", "shadcn-ui",
    "@headlessui/react", "element-plus", "naive-ui", "arco-design/web-react",
  ];
  for (const lib of uiLibs) {
    if (deps[lib]) {
      components.designSystem = lib;
      break;
    }
  }

  return components;
}

/* ------------------------------------------------------------------ */
/*  Dependencies & signals                                            */
/* ------------------------------------------------------------------ */

function collectDeps(pkg) {
  return { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
}

function detectSignals(deps) {
  const keys = Object.keys(deps || {});
  const has = (n) => keys.some((k) => k === n || k.startsWith(n + "/"));
  const signals = [];
  const checks = [
    ["react", "react"], ["vue", "vue"], ["svelte", "svelte"],
    ["next", "next"], ["nuxt", "nuxt"], ["astro", "astro"],
    ["@remix-run", "remix"], ["vite", "vite"], ["webpack", "webpack"],
    ["typescript", "typescript"], ["tailwindcss", "tailwind"],
    ["@tanstack/react-query", "tanstack-query"], ["swr", "swr"],
    ["@reduxjs/toolkit", "redux-toolkit"], ["redux", "redux"],
    ["zustand", "zustand"], ["pinia", "pinia"], ["mobx", "mobx"],
    ["axios", "axios"], ["trpc", "trpc"], ["graphql", "graphql"],
    ["playwright", "playwright"], ["vitest", "vitest"], ["jest", "jest"],
    ["eslint", "eslint"], ["prettier", "prettier"], ["biome", "biome"],
    ["storybook", "storybook"], ["@storybook", "storybook"],
    ["electron", "electron"], ["tauri", "tauri"],
    ["react-native", "react-native"], ["expo", "expo"],
    ["three", "threejs"], ["@react-three", "r3f"],
    ["d3", "d3"], ["echarts", "echarts"],
    ["prisma", "prisma"], ["drizzle-orm", "drizzle"],
    ["socket.io", "socketio"], ["ws", "websocket"],
    ["i18next", "i18n"], ["react-i18next", "i18n"],
    ["zod", "zod"], ["yup", "yup"], ["joi", "joi"],
    ["msw", "msw"],
  ];
  for (const [pkg, signal] of checks) {
    if (has(pkg) && !signals.includes(signal)) signals.push(signal);
  }
  return signals;
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
          if (p?.name) {
            const subFiles = [];
            try {
              for (const e of fs.readdirSync(sub)) subFiles.push(e);
            } catch { /* ignore */ }
            out.push({
              name: p.name,
              path: path.relative(root, sub).split(path.sep).join("/"),
              description: p.description || null,
              hasSrc: subFiles.includes("src"),
            });
          }
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Entrypoints                                                       */
/* ------------------------------------------------------------------ */

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
    "src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts",
    "src/app.tsx", "src/App.tsx", "app/layout.tsx", "app/page.tsx",
    "app/root.tsx", "pages/_app.tsx", "pages/_app.ts", "pages/index.tsx",
    "src/routes/+layout.svelte", "src/app.html",
    "server/index.ts", "server/main.ts", "src/server.ts",
  ];
  for (const c of common) push(c);

  return [...new Set(candidates)].slice(0, 40);
}

/* ------------------------------------------------------------------ */
/*  Top-level structure                                               */
/* ------------------------------------------------------------------ */

function listTopLevel(root) {
  const out = [];
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith(".")) continue;
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(root, name);
    let type = "file";
    let childCount = 0;
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        type = "dir";
        try { childCount = fs.readdirSync(full).length; } catch { /* ok */ }
      }
    } catch { continue; }
    out.push({ name, type, childCount });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function findConfigFiles(root, allFiles) {
  const configSet = new Set(CONFIG_FILES);
  const found = [];
  // Root-level
  for (const rel of CONFIG_FILES) {
    if (exists(path.join(root, rel))) found.push(rel);
  }
  // Nested (from walk)
  for (const f of allFiles) {
    const base = path.basename(f.rel);
    if (configSet.has(base) && f.rel.includes("/")) found.push(f.rel);
  }
  return [...new Set(found)].sort().slice(0, 80);
}

/* ------------------------------------------------------------------ */
/*  Doc plan — hierarchical, DeepWiki-style                           */
/* ------------------------------------------------------------------ */

function buildDocPlan({
  entrypoints, configs, workspacePkgs, structure, signals, routes, stateManagement,
  networkLayer, components, fileStats, importGraph,
}) {
  const evidence = (arr) => [...new Set(arr.filter(Boolean))].slice(0, 25);
  const pages = [];

  // --- 1. Introduction ---
  pages.push({
    section: "1",
    slug: "overview/introduction",
    title: "项目简介",
    category: "overview",
    required: true,
    evidence: evidence(["package.json", "README.md", ...entrypoints.slice(0, 3)]),
    hints: "一句话定位、功能概要、技术栈表格、仓库结构树。",
  });

  // 1.1 Monorepo layout (if applicable)
  if (workspacePkgs.length > 0) {
    pages.push({
      section: "1.1",
      slug: "overview/monorepo-layout",
      title: "Monorepo 布局与工作区",
      category: "overview",
      required: true,
      evidence: evidence(["package.json", "pnpm-workspace.yaml", ...workspacePkgs.map((w) => w.path + "/package.json")]),
      hints: "列出所有 workspace 包及其职责、依赖关系图。",
    });
  }

  // 1.2 Tech stack
  pages.push({
    section: workspacePkgs.length > 0 ? "1.2" : "1.1",
    slug: "overview/tech-stack",
    title: "技术栈总览",
    category: "overview",
    required: true,
    evidence: evidence(["package.json", ...configs.slice(0, 10)]),
    hints: `检测到的信号: ${signals.join(", ") || "无"}。用表格列出框架、构建工具、测试、代码质量等。`,
  });

  // --- 2. Architecture ---
  pages.push({
    section: "2",
    slug: "architecture/system-architecture",
    title: "系统架构",
    category: "architecture",
    required: true,
    evidence: evidence([...configs.filter((c) => /vite|next|webpack|astro|nuxt|tsconfig/.test(c)), ...entrypoints.slice(0, 8)]),
    hints: "分层架构图（Mermaid）、模块边界、依赖方向。",
  });

  // 2.1 Component system
  if (components.totalComponents > 5) {
    pages.push({
      section: "2.1",
      slug: "architecture/component-system",
      title: "组件体系",
      category: "architecture",
      required: false,
      evidence: evidence(components.directories.map((d) => d.path + "/")),
      hints: `共 ${components.totalComponents} 个组件文件${components.designSystem ? "，UI 库: " + components.designSystem : ""}。组件分层、命名约定、复用模式。`,
    });
  }

  // 2.2 Routing
  if (routes.files.length > 0) {
    pages.push({
      section: components.totalComponents > 5 ? "2.2" : "2.1",
      slug: "architecture/routing",
      title: "路由系统",
      category: "architecture",
      required: false,
      evidence: evidence(routes.files.slice(0, 15)),
      hints: `路由类型: ${routes.type}。${routes.patterns.join(", ")}。路由表、嵌套布局、守卫/中间件。`,
    });
  }

  // --- 3. Core Concepts ---
  pages.push({
    section: "3",
    slug: "concepts/glossary",
    title: "核心概念与术语表",
    category: "concepts",
    required: false,
    evidence: evidence([...configs.filter((c) => /tsconfig|eslint/.test(c))]),
    hints: "领域术语、核心类型/接口、配置项表（环境变量名 | 用途 | 默认值）。",
  });

  // --- 4. Core Modules ---
  pages.push({
    section: "4",
    slug: "modules/core-modules",
    title: "核心模块剖析",
    category: "modules",
    required: true,
    evidence: evidence([
      ...structure.filter((s) => s.type === "dir").map((s) => s.name + "/"),
      ...entrypoints.slice(0, 10),
    ]),
    hints: `Hub 文件（被引用最多）: ${importGraph.hubFiles.slice(0, 5).map((h) => h.file).join(", ")}。按目录剖析职责、导出 API、依赖关系。`,
  });

  // 4.x Per-workspace-package modules (Monorepo)
  if (workspacePkgs.length > 0 && workspacePkgs.length <= 10) {
    for (let i = 0; i < workspacePkgs.length; i++) {
      const wp = workspacePkgs[i];
      pages.push({
        section: `4.${i + 1}`,
        slug: `modules/${wp.path.replace(/\//g, "-")}`,
        title: `${wp.name}`,
        category: "modules",
        required: false,
        evidence: evidence([wp.path + "/package.json", wp.path + "/src/"]),
        hints: `工作区包: ${wp.name}${wp.description ? " — " + wp.description : ""}`,
      });
    }
  }

  // --- 5. Data Flow ---
  pages.push({
    section: "5",
    slug: "dataflow/request-and-state",
    title: "核心数据流",
    category: "dataflow",
    required: stateManagement.patterns.length > 0 || networkLayer.patterns.length > 0,
    evidence: evidence([...stateManagement.stores.slice(0, 10), ...networkLayer.clients.slice(0, 10), "package.json"]),
    hints: `状态管理: ${stateManagement.patterns.join(", ") || "无"}。网络层: ${networkLayer.patterns.join(", ") || "无"}。`,
  });

  // 5.1 State management detail
  if (stateManagement.stores.length > 3) {
    pages.push({
      section: "5.1",
      slug: "dataflow/state-management",
      title: "状态管理详解",
      category: "dataflow",
      required: false,
      evidence: evidence(stateManagement.stores),
      hints: `${stateManagement.patterns.join(" + ")}。Store 文件列表、状态树结构、副作用处理。`,
    });
  }

  // 5.2 API / network layer
  if (networkLayer.clients.length > 0) {
    pages.push({
      section: stateManagement.stores.length > 3 ? "5.2" : "5.1",
      slug: "dataflow/api-layer",
      title: "API 与网络层",
      category: "dataflow",
      required: false,
      evidence: evidence(networkLayer.clients),
      hints: `${networkLayer.patterns.join(", ")}。请求封装、拦截器、错误处理、基础 URL 配置。`,
    });
  }

  // --- 6. Operations ---
  pages.push({
    section: "6",
    slug: "operations/build-and-deploy",
    title: "构建、测试与部署",
    category: "operations",
    required: false,
    evidence: evidence([
      "package.json",
      ...configs.filter((c) => /vitest|jest|playwright|docker|vercel|netlify|wrangler/.test(c)),
    ]),
    hints: `测试文件数: ${fileStats.testFiles}。package.json scripts 说明、CI/CD、环境变量。`,
  });

  // Renumber sections to be contiguous
  let currentMajor = 0;
  let currentMinor = 0;
  let lastMajor = "";
  for (const page of pages) {
    const parts = page.section.split(".");
    if (parts.length === 1) {
      currentMajor++;
      currentMinor = 0;
      page.section = String(currentMajor);
      lastMajor = page.section;
    } else {
      currentMinor++;
      page.section = `${lastMajor}.${currentMinor}`;
    }
  }

  return { generatedAt: new Date().toISOString(), pages };
}

/* ------------------------------------------------------------------ */
/*  Quality report                                                    */
/* ------------------------------------------------------------------ */

function generateQualityReport({
  signals, docPlan, fileStats, importGraph, routes, stateManagement, networkLayer, components, outDir
}) {
  const now = new Date().toISOString();

  return `# Project Wiki 扫描报告

由 \`analyze-repo.mjs\` 在 **${now}** 生成。

## 仓库概况

| 指标 | 值 |
|------|-----|
| 源码文件 | ${fileStats.sourceFiles} |
| 测试文件 | ${fileStats.testFiles} |
| 样式文件 | ${fileStats.styleFiles} |
| 总文件数 | ${fileStats.totalFiles} |
| 总大小 | ${fileStats.totalSizeKB} KB |
| 本地 import 边数 | ${importGraph.totalEdges} |

## 技术栈信号

${signals.length ? signals.map((s) => `- \`${s}\``).join("\n") : "- （未检测到典型前端栈）"}

## 路由系统

- 类型: \`${routes.type}\`
${routes.patterns.length ? routes.patterns.map((p) => `- ${p}`).join("\n") : "- 未检测到路由配置"}
${routes.files.length ? "\n关键路由文件:\n" + routes.files.slice(0, 10).map((f) => `- \`${f}\``).join("\n") : ""}

## 状态管理

${stateManagement.patterns.length ? stateManagement.patterns.map((p) => `- ${p}`).join("\n") : "- 未检测到状态管理库"}
${stateManagement.stores.length ? "\nStore 文件:\n" + stateManagement.stores.slice(0, 10).map((f) => `- \`${f}\``).join("\n") : ""}

## 网络层

${networkLayer.patterns.length ? networkLayer.patterns.map((p) => `- ${p}`).join("\n") : "- 未检测到 API 封装层"}

## 组件体系

- 组件文件总数: ${components.totalComponents}
${components.designSystem ? `- UI 库: \`${components.designSystem}\`` : ""}
${components.directories.length ? components.directories.map((d) => `- \`${d.path}/\` — ${d.fileCount} 个文件`).join("\n") : ""}

## Hub 文件（被引用最多）

${importGraph.hubFiles.slice(0, 15).map((h) => `- \`${h.file}\` (${h.importedByCount} 次被引用)`).join("\n") || "- 无足够数据"}

## 高频外部依赖

${importGraph.topExternalDeps.slice(0, 15).map((d) => `- \`${d.name}\` — ${d.usageCount} 次 import`).join("\n") || "- 无足够数据"}

## 文档计划 (doc_plan.json)

${docPlan.pages.map((p) => `- **${p.section}** \`${p.slug}\` ${p.required ? "★" : "○"} — ${p.title}\n  - ${p.hints}`).join("\n")}

## 覆盖说明

- 本脚本为**启发式**静态扫描，未执行类型检查或测试
- **import 图谱**仅解析文件前 200 行的静态 import/require
- 动态 import、alias（如 \`@/\`）和 barrel re-export 可能遗漏
- 路由与状态检测基于正则匹配，复杂配置请人工核对

## 后续动作

1. Agent 阅读 \`references/doc-templates.md\` 与 \`references/FRONTEND-FOCUS.md\`
2. 按 \`doc_plan.json\` 中的 \`section\` 编号在 \`${outDir}/\` 各子目录创建 Markdown
3. 运行 \`regenerate-sidebar.mjs\` 更新侧栏
`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

function main() {
  const { root, outDir, depth } = parseArgs(process.argv);
  const wikiRoot = path.join(root, outDir);
  const metaDir = path.join(wikiRoot, ".meta");

  console.log(`\n📊 Analyzing ${root} ...\n`);

  // Basic info
  const pkgPath = path.join(root, "package.json");
  const pkg = readJsonSafe(pkgPath) || {};
  const deps = collectDeps(pkg);
  const signals = detectSignals(deps);
  const structure = listTopLevel(root);
  const entrypoints = guessEntrypoints(root, pkg);
  const workspacePkgs = findWorkspacePackages(root);

  // Deep scan
  console.log("  Scanning files...");
  const allFiles = walkAll(root);
  const sourceFiles = allFiles.filter((f) => SOURCE_EXTS.has(f.ext));
  const configs = findConfigFiles(root, allFiles);
  const fileStats = computeFileStats(allFiles);

  console.log(`  Found ${allFiles.length} files (${sourceFiles.length} source)`);

  // Import graph
  console.log("  Building import graph...");
  const importGraph = depth === "deep"
    ? buildImportGraph(root, sourceFiles)
    : { hubFiles: [], heavyImporters: [], topExternalDeps: [], totalEdges: 0 };

  // Detect patterns
  console.log("  Detecting routes...");
  const routes = detectRoutes(root, sourceFiles);

  console.log("  Detecting state management...");
  const stateManagement = detectStateManagement(sourceFiles.slice(0, 500));

  console.log("  Detecting network layer...");
  const networkLayer = detectNetworkLayer(sourceFiles.slice(0, 500));

  console.log("  Detecting components...");
  const components = detectComponents(root, sourceFiles);

  // Build outputs
  const repoJson = {
    name: pkg.name || path.basename(root),
    version: pkg.version || null,
    private: pkg.private ?? null,
    description: pkg.description || null,
    scripts: pkg.scripts || {},
    signals,
    packageManager:
      (pkg.packageManager || "").split("@")[0] ||
      (exists(path.join(root, "pnpm-lock.yaml")) ? "pnpm" : null) ||
      (exists(path.join(root, "yarn.lock")) ? "yarn" : null) ||
      (exists(path.join(root, "bun.lockb")) ? "bun" : null) ||
      (exists(path.join(root, "package-lock.json")) ? "npm" : null),
    workspaces: Boolean(pkg.workspaces),
  };

  const structureJson = {
    topLevel: structure,
    configFiles: configs,
    fileStats: {
      totalFiles: fileStats.totalFiles,
      sourceFiles: fileStats.sourceFiles,
      testFiles: fileStats.testFiles,
      styleFiles: fileStats.styleFiles,
      totalSizeKB: fileStats.totalSizeKB,
      byExtension: fileStats.byExtension,
    },
    largestFiles: fileStats.largestFiles,
  };

  const entryJson = {
    candidates: entrypoints,
    workspacePackages: workspacePkgs,
    routes,
    stateManagement,
    networkLayer,
    components,
  };

  const importsJson = {
    hubFiles: importGraph.hubFiles,
    heavyImporters: importGraph.heavyImporters,
    topExternalDeps: importGraph.topExternalDeps,
    totalEdges: importGraph.totalEdges,
  };

  const docPlan = buildDocPlan({
    entrypoints, configs, workspacePkgs, structure, signals,
    routes, stateManagement, networkLayer, components, fileStats, importGraph,
  });

  // Write meta files
  console.log("\n  Writing metadata...");
  fs.mkdirSync(metaDir, { recursive: true });
  writeFileEnsured(path.join(metaDir, "repo.json"), JSON.stringify(repoJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "structure.json"), JSON.stringify(structureJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "entrypoints.json"), JSON.stringify(entryJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "imports.json"), JSON.stringify(importsJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "doc_plan.json"), JSON.stringify(docPlan, null, 2) + "\n");

  // Quality report
  const qr = generateQualityReport({
    signals, docPlan, fileStats, importGraph, routes, stateManagement, networkLayer, components, outDir,
  });
  const qrPath = path.join(wikiRoot, "quality-report.md");
  fs.mkdirSync(wikiRoot, { recursive: true });
  fs.writeFileSync(qrPath, qr, "utf8");
  console.log(`  ✓ ${path.relative(process.cwd(), qrPath)}`);

  console.log(`\n✅ Done. ${docPlan.pages.length} pages planned. Next: read .meta/doc_plan.json and author Markdown pages.\n`);
}

main();
