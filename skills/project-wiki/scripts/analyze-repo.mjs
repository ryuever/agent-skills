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
import { execSync as _execSync } from "node:child_process";

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
/*  Code Complexity Analysis                                          */
/* ------------------------------------------------------------------ */

function analyzeCodeComplexity(sourceFiles, maxFiles = 300) {
  const results = {
    fileMetrics: [],       // Per-file complexity data
    hotspots: [],          // Files with highest complexity
    functionLengths: [],   // Longest functions
    deepNesting: [],       // Files with deep nesting
    summary: { avgLinesPerFile: 0, avgFunctionsPerFile: 0, maxNestingDepth: 0 },
  };

  const sampled = sourceFiles.slice(0, maxFiles);
  let totalLines = 0;
  let totalFunctions = 0;

  for (const f of sampled) {
    let content;
    try { content = fs.readFileSync(f.full, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    const lineCount = lines.length;
    totalLines += lineCount;

    // Count functions/methods
    const funcMatches = content.match(
      /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:async\s+)?(?:\w+)\s*\([^)]*\)\s*\{|=>\s*\{)/g
    );
    const funcCount = funcMatches ? funcMatches.length : 0;
    totalFunctions += funcCount;

    // Measure nesting depth (count max nested braces)
    let maxDepth = 0;
    let currentDepth = 0;
    for (const ch of content) {
      if (ch === "{") { currentDepth++; if (currentDepth > maxDepth) maxDepth = currentDepth; }
      else if (ch === "}") currentDepth--;
    }

    // Extract function lengths (approximate: find function boundaries)
    const funcLengths = [];
    const funcRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
    let fm;
    while ((fm = funcRegex.exec(content)) !== null) {
      const name = fm[1] || fm[2] || fm[3];
      const startLine = content.slice(0, fm.index).split("\n").length;
      // Find matching closing brace (approximate)
      let depth = 0;
      let endIdx = fm.index;
      let foundOpen = false;
      for (let i = fm.index; i < content.length && i < fm.index + 5000; i++) {
        if (content[i] === "{") { depth++; foundOpen = true; }
        else if (content[i] === "}") { depth--; if (foundOpen && depth === 0) { endIdx = i; break; } }
      }
      const bodyLength = content.slice(fm.index, endIdx).split("\n").length;
      if (bodyLength > 20) {
        funcLengths.push({ name, file: f.rel, startLine, lines: bodyLength });
      }
    }
    results.functionLengths.push(...funcLengths);

    results.fileMetrics.push({
      file: f.rel,
      lines: lineCount,
      functions: funcCount,
      maxNesting: maxDepth,
      complexity: funcCount * 2 + Math.max(0, maxDepth - 3) * 3 + Math.max(0, lineCount - 300),
    });

    if (maxDepth > 6) {
      results.deepNesting.push({ file: f.rel, depth: maxDepth });
    }
  }

  // Sort and slice
  results.fileMetrics.sort((a, b) => b.complexity - a.complexity);
  results.hotspots = results.fileMetrics.slice(0, 20).map((m) => ({
    file: m.file, lines: m.lines, functions: m.functions,
    maxNesting: m.maxNesting, complexity: m.complexity,
  }));
  results.functionLengths.sort((a, b) => b.lines - a.lines);
  results.functionLengths = results.functionLengths.slice(0, 30);
  results.deepNesting.sort((a, b) => b.depth - a.depth);
  results.deepNesting = results.deepNesting.slice(0, 15);

  results.summary = {
    totalFilesAnalyzed: sampled.length,
    avgLinesPerFile: sampled.length ? Math.round(totalLines / sampled.length) : 0,
    avgFunctionsPerFile: sampled.length ? Math.round(totalFunctions / sampled.length) : 0,
    maxNestingDepth: results.deepNesting.length ? results.deepNesting[0].depth : 0,
    filesOver300Lines: results.fileMetrics.filter((m) => m.lines > 300).length,
    filesOver500Lines: results.fileMetrics.filter((m) => m.lines > 500).length,
    functionsOver50Lines: results.functionLengths.filter((f) => f.lines > 50).length,
  };

  return results;
}

/* ------------------------------------------------------------------ */
/*  Type System Analysis (TypeScript)                                 */
/* ------------------------------------------------------------------ */

function analyzeTypeSystem(rootDir, sourceFiles) {
  const types = {
    coreInterfaces: [],   // Important interfaces/types
    typeFiles: [],         // Dedicated type definition files
    enumDefinitions: [],   // Enums
    genericPatterns: [],   // Generic type usage
    summary: { hasTypeScript: false, typeFileCount: 0, interfaceCount: 0, typeAliasCount: 0, enumCount: 0 },
  };

  const tsFiles = sourceFiles.filter((f) => /\.[cm]?tsx?$/.test(f.ext));
  if (tsFiles.length === 0) return types;
  types.summary.hasTypeScript = true;

  // Check tsconfig
  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  const tsconfig = readJsonSafe(tsconfigPath);
  if (tsconfig) {
    types.tsconfigStrict = tsconfig.compilerOptions?.strict ?? false;
    types.tsconfigTarget = tsconfig.compilerOptions?.target ?? "unknown";
  }

  // Find dedicated type files
  const typeFilePatterns = [/types?\.[td]\.ts$/, /\.d\.ts$/, /types\//, /interfaces?\//,
    /models?\.ts$/, /schema\.ts$/, /contracts?\//];
  for (const f of tsFiles) {
    if (typeFilePatterns.some((p) => p.test(f.rel))) {
      types.typeFiles.push(f.rel);
    }
  }
  types.typeFiles = types.typeFiles.slice(0, 30);
  types.summary.typeFileCount = types.typeFiles.length;

  // Extract interfaces, type aliases, and enums from top type files
  const scanFiles = types.typeFiles.length > 0
    ? tsFiles.filter((f) => types.typeFiles.includes(f.rel) || /types?|model|schema|interface/i.test(f.rel))
    : tsFiles.filter((f) => /types?|model|schema|interface/i.test(f.rel));

  for (const f of scanFiles.slice(0, 50)) {
    let content;
    try { content = fs.readFileSync(f.full, "utf8"); } catch { continue; }

    // Extract exported interfaces
    const ifaceRegex = /export\s+(?:default\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s<>]+))?\s*\{/g;
    let m;
    while ((m = ifaceRegex.exec(content)) !== null) {
      const startLine = content.slice(0, m.index).split("\n").length;
      // Count properties (approximate)
      let depth = 0;
      let endIdx = m.index;
      for (let i = m.index; i < content.length && i < m.index + 5000; i++) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
      }
      const body = content.slice(m.index, endIdx);
      const propCount = (body.match(/^\s+\w+[\?:].*$/gm) || []).length;
      types.coreInterfaces.push({
        name: m[1], kind: "interface", file: f.rel, line: startLine,
        extends: m[2]?.trim() || null, properties: propCount,
      });
      types.summary.interfaceCount++;
    }

    // Extract exported type aliases
    const typeRegex = /export\s+type\s+(\w+)(?:<[^>]+>)?\s*=/g;
    while ((m = typeRegex.exec(content)) !== null) {
      const startLine = content.slice(0, m.index).split("\n").length;
      types.coreInterfaces.push({
        name: m[1], kind: "type", file: f.rel, line: startLine,
        extends: null, properties: 0,
      });
      types.summary.typeAliasCount++;
    }

    // Extract enums
    const enumRegex = /export\s+(?:const\s+)?enum\s+(\w+)\s*\{/g;
    while ((m = enumRegex.exec(content)) !== null) {
      const startLine = content.slice(0, m.index).split("\n").length;
      types.enumDefinitions.push({ name: m[1], file: f.rel, line: startLine });
      types.summary.enumCount++;
    }
  }

  types.coreInterfaces.sort((a, b) => b.properties - a.properties);
  types.coreInterfaces = types.coreInterfaces.slice(0, 40);
  types.enumDefinitions = types.enumDefinitions.slice(0, 20);

  return types;
}

/* ------------------------------------------------------------------ */
/*  Architecture Violation Detection                                  */
/* ------------------------------------------------------------------ */

function detectArchitectureViolations(rootDir, sourceFiles, importGraph) {
  const violations = {
    circularDeps: [],      // Circular import chains
    layerViolations: [],   // Cross-layer dependency violations
    godFiles: [],          // Files with too many responsibilities
    orphanFiles: [],       // Files not imported by anyone
    summary: { circularCount: 0, layerViolationCount: 0, godFileCount: 0, orphanCount: 0 },
  };

  // 1. Detect circular dependencies
  const graph = {}; // adjacency list
  for (const f of sourceFiles) {
    const rawImports = extractImports(f.full);
    const localDeps = [];
    for (const spec of rawImports) {
      if (spec.startsWith(".")) {
        const dir = path.dirname(f.rel);
        let target = path.posix.join(dir, spec);
        const candidates = [target, target + ".ts", target + ".tsx", target + ".js",
          target + ".jsx", target + "/index.ts", target + "/index.tsx", target + "/index.js"];
        const found = candidates.find((c) => sourceFiles.some((sf) => sf.rel === c));
        if (found) localDeps.push(found);
      }
    }
    graph[f.rel] = localDeps;
  }

  // Find cycles using DFS (limit to prevent excessive computation)
  const visited = new Set();
  const inStack = new Set();
  const cycles = [];
  let cycleSearchCount = 0;

  function dfs(node, pathArr) {
    if (cycleSearchCount++ > 20000) return;
    if (inStack.has(node)) {
      const cycleStart = pathArr.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = pathArr.slice(cycleStart).concat(node);
        if (cycle.length <= 8) cycles.push(cycle);
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const dep of (graph[node] || [])) {
      dfs(dep, [...pathArr, node]);
    }
    inStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (cycleSearchCount > 20000) break;
    if (!visited.has(node)) dfs(node, []);
  }

  // Deduplicate cycles
  const cycleSet = new Set();
  for (const c of cycles) {
    const normalized = [...c].sort().join(" -> ");
    if (!cycleSet.has(normalized)) {
      cycleSet.add(normalized);
      violations.circularDeps.push({ chain: c, length: c.length - 1 });
    }
  }
  violations.circularDeps = violations.circularDeps.slice(0, 20);
  violations.summary.circularCount = violations.circularDeps.length;

  // 2. Detect layer violations (common patterns)
  const LAYER_ORDER = [
    { pattern: /^src\/(pages?|views?|routes?)\//i, layer: "page", rank: 1 },
    { pattern: /^src\/components?\//i, layer: "component", rank: 2 },
    { pattern: /^src\/(hooks?|composables?)\//i, layer: "hook", rank: 3 },
    { pattern: /^src\/(store|state|context)\//i, layer: "state", rank: 4 },
    { pattern: /^src\/(services?|api)\//i, layer: "service", rank: 5 },
    { pattern: /^src\/(utils?|helpers?|lib)\//i, layer: "utility", rank: 6 },
    { pattern: /^src\/(types?|models?|interfaces?)\//i, layer: "type", rank: 7 },
  ];

  function getLayer(filePath) {
    for (const l of LAYER_ORDER) {
      if (l.pattern.test(filePath)) return l;
    }
    return null;
  }

  for (const [file, deps] of Object.entries(graph)) {
    const fromLayer = getLayer(file);
    if (!fromLayer) continue;
    for (const dep of deps) {
      const toLayer = getLayer(dep);
      if (!toLayer) continue;
      // Lower rank (infra) should not import higher rank (UI)
      if (fromLayer.rank > toLayer.rank && fromLayer.layer !== "type") {
        violations.layerViolations.push({
          from: file, fromLayer: fromLayer.layer,
          to: dep, toLayer: toLayer.layer,
          message: `${fromLayer.layer} (rank ${fromLayer.rank}) imports ${toLayer.layer} (rank ${toLayer.rank})`,
        });
      }
    }
  }
  violations.layerViolations = violations.layerViolations.slice(0, 30);
  violations.summary.layerViolationCount = violations.layerViolations.length;

  // 3. Detect god files (too many imports + too many importers)
  for (const [file, deps] of Object.entries(graph)) {
    const importedBy = Object.entries(graph).filter(([, d]) => d.includes(file)).length;
    if (deps.length > 15 || importedBy > 20) {
      violations.godFiles.push({
        file, imports: deps.length, importedBy,
        score: deps.length + importedBy,
      });
    }
  }
  violations.godFiles.sort((a, b) => b.score - a.score);
  violations.godFiles = violations.godFiles.slice(0, 15);
  violations.summary.godFileCount = violations.godFiles.length;

  // 4. Detect orphan files (no imports, not imported by anyone, not entry/config)
  const allImported = new Set(Object.values(graph).flat());
  for (const f of sourceFiles) {
    if (!allImported.has(f.rel) && (graph[f.rel] || []).length === 0) {
      if (!/index\.|main\.|app\.|config|test|spec|\.d\.ts/i.test(f.rel)) {
        violations.orphanFiles.push(f.rel);
      }
    }
  }
  violations.orphanFiles = violations.orphanFiles.slice(0, 30);
  violations.summary.orphanCount = violations.orphanFiles.length;

  return violations;
}

/* ------------------------------------------------------------------ */
/*  API Surface Analysis                                              */
/* ------------------------------------------------------------------ */

function analyzeAPISurface(sourceFiles) {
  const api = {
    exportedFunctions: [],
    exportedClasses: [],
    exportedHooks: [],
    exportedComponents: [],
    barrelFiles: [],      // index.ts re-exports
    summary: { totalExports: 0, hookCount: 0, componentCount: 0, classCount: 0, functionCount: 0 },
  };

  for (const f of sourceFiles.slice(0, 500)) {
    let content;
    try { content = fs.readFileSync(f.full, "utf8"); } catch { continue; }

    // Exported functions
    const funcRegex = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g;
    let m;
    while ((m = funcRegex.exec(content)) !== null) {
      const name = m[1];
      const line = content.slice(0, m.index).split("\n").length;
      if (/^use[A-Z]/.test(name)) {
        api.exportedHooks.push({ name, file: f.rel, line });
        api.summary.hookCount++;
      } else {
        api.exportedFunctions.push({ name, file: f.rel, line });
        api.summary.functionCount++;
      }
      api.summary.totalExports++;
    }

    // Exported const functions (arrow)
    const arrowRegex = /export\s+(?:default\s+)?(?:const|let)\s+(\w+)\s*(?::\s*[\w<>\[\]|&\s]+)?\s*=\s*(?:async\s*)?\(/g;
    while ((m = arrowRegex.exec(content)) !== null) {
      const name = m[1];
      const line = content.slice(0, m.index).split("\n").length;
      if (/^use[A-Z]/.test(name)) {
        api.exportedHooks.push({ name, file: f.rel, line });
        api.summary.hookCount++;
      } else if (/^[A-Z]/.test(name) && /return\s*\(?\s*<|React\.createElement/.test(content.slice(m.index, m.index + 2000))) {
        api.exportedComponents.push({ name, file: f.rel, line });
        api.summary.componentCount++;
      } else {
        api.exportedFunctions.push({ name, file: f.rel, line });
        api.summary.functionCount++;
      }
      api.summary.totalExports++;
    }

    // Exported classes
    const classRegex = /export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    while ((m = classRegex.exec(content)) !== null) {
      const line = content.slice(0, m.index).split("\n").length;
      api.exportedClasses.push({ name: m[1], file: f.rel, line });
      api.summary.classCount++;
      api.summary.totalExports++;
    }

    // Barrel files (index.ts with mostly re-exports)
    if (/index\.[tj]sx?$/.test(f.rel)) {
      const reExports = (content.match(/export\s+\{[^}]*\}\s+from/g) || []).length
        + (content.match(/export\s+\*\s+from/g) || []).length;
      if (reExports >= 3) {
        api.barrelFiles.push({ file: f.rel, reExportCount: reExports });
      }
    }
  }

  api.exportedFunctions = api.exportedFunctions.slice(0, 40);
  api.exportedClasses = api.exportedClasses.slice(0, 20);
  api.exportedHooks = api.exportedHooks.slice(0, 30);
  api.exportedComponents = api.exportedComponents.slice(0, 30);
  api.barrelFiles = api.barrelFiles.slice(0, 15);

  return api;
}

/* ------------------------------------------------------------------ */
/*  Dependency Health Analysis                                        */
/* ------------------------------------------------------------------ */

function analyzeDependencyHealth(rootDir) {
  const health = {
    directDeps: [],
    devDeps: [],
    peerDeps: [],
    duplicateRisk: [],    // Deps that may cause version conflicts
    heavyDeps: [],        // Notoriously large deps
    summary: { directCount: 0, devCount: 0, peerCount: 0, totalCount: 0 },
  };

  const pkgPath = path.join(rootDir, "package.json");
  const pkg = readJsonSafe(pkgPath);
  if (!pkg) return health;

  const HEAVY_DEPS = new Set([
    "moment", "lodash", "jquery", "rxjs", "core-js", "polished",
    "@angular/core", "firebase", "aws-sdk", "@aws-sdk",
  ]);

  const processDeps = (deps, category) => {
    if (!deps) return [];
    const result = [];
    for (const [name, version] of Object.entries(deps)) {
      const entry = {
        name, version,
        isWildcard: version === "*" || version === "latest",
        isPinned: /^\d/.test(version),
        isRange: /^[~^]/.test(version),
      };
      result.push(entry);
      if (HEAVY_DEPS.has(name)) {
        health.heavyDeps.push({ name, version, reason: "Known large dependency" });
      }
    }
    return result;
  };

  health.directDeps = processDeps(pkg.dependencies, "direct");
  health.devDeps = processDeps(pkg.devDependencies, "dev");
  health.peerDeps = processDeps(pkg.peerDependencies, "peer");
  health.summary.directCount = health.directDeps.length;
  health.summary.devCount = health.devDeps.length;
  health.summary.peerCount = health.peerDeps.length;
  health.summary.totalCount = health.summary.directCount + health.summary.devCount + health.summary.peerCount;

  // Check for potential duplicates across dep types
  const allNames = new Map();
  for (const d of [...health.directDeps, ...health.devDeps, ...health.peerDeps]) {
    if (allNames.has(d.name)) {
      const existing = allNames.get(d.name);
      if (existing.version !== d.version) {
        health.duplicateRisk.push({ name: d.name, versions: [existing.version, d.version] });
      }
    }
    allNames.set(d.name, d);
  }

  // Check lock file existence
  health.lockFile =
    exists(path.join(rootDir, "pnpm-lock.yaml")) ? "pnpm-lock.yaml" :
    exists(path.join(rootDir, "yarn.lock")) ? "yarn.lock" :
    exists(path.join(rootDir, "package-lock.json")) ? "package-lock.json" :
    exists(path.join(rootDir, "bun.lockb")) ? "bun.lockb" : null;

  return health;
}

/* ------------------------------------------------------------------ */
/*  Test Coverage Analysis                                            */
/* ------------------------------------------------------------------ */

function analyzeTestCoverage(rootDir, allFiles, sourceFiles) {
  const coverage = {
    testFiles: [],
    testFrameworks: [],
    sourceToTestMap: [],  // Source files paired with their tests
    untestedSources: [],  // Source files without corresponding tests
    testDirStructure: [], // Test directory organization
    summary: {
      testFileCount: 0, sourceFileCount: 0, coverageRatio: 0,
      hasTestConfig: false, hasE2E: false,
    },
  };

  const testFiles = allFiles.filter((f) => TEST_PATTERNS.some((p) => p.test(f.rel)));
  const nonTestSourceFiles = sourceFiles.filter((f) => !TEST_PATTERNS.some((p) => p.test(f.rel)));

  coverage.testFiles = testFiles.map((f) => f.rel).slice(0, 50);
  coverage.summary.testFileCount = testFiles.length;
  coverage.summary.sourceFileCount = nonTestSourceFiles.length;
  coverage.summary.coverageRatio = nonTestSourceFiles.length
    ? Math.round((testFiles.length / nonTestSourceFiles.length) * 100) / 100
    : 0;

  // Detect test frameworks
  const testConfigs = [
    { file: "vitest.config.ts", framework: "Vitest" },
    { file: "vitest.config.mts", framework: "Vitest" },
    { file: "jest.config.js", framework: "Jest" },
    { file: "jest.config.ts", framework: "Jest" },
    { file: "jest.config.cjs", framework: "Jest" },
    { file: "playwright.config.ts", framework: "Playwright (E2E)" },
    { file: "cypress.config.ts", framework: "Cypress (E2E)" },
    { file: "cypress.config.js", framework: "Cypress (E2E)" },
  ];
  for (const tc of testConfigs) {
    if (exists(path.join(rootDir, tc.file))) {
      coverage.testFrameworks.push(tc.framework);
      coverage.summary.hasTestConfig = true;
      if (/E2E/.test(tc.framework)) coverage.summary.hasE2E = true;
    }
  }

  // Map source files to test files
  const testBasenames = new Map();
  for (const t of testFiles) {
    const base = path.basename(t.rel)
      .replace(/\.(test|spec)\.[tj]sx?$/, "")
      .replace(/\.(test|spec)$/, "");
    testBasenames.set(base, t.rel);
  }

  const testedSources = new Set();
  for (const sf of nonTestSourceFiles) {
    const base = path.basename(sf.rel).replace(/\.[tj]sx?$/, "");
    if (testBasenames.has(base)) {
      coverage.sourceToTestMap.push({
        source: sf.rel,
        test: testBasenames.get(base),
      });
      testedSources.add(sf.rel);
    }
  }
  coverage.sourceToTestMap = coverage.sourceToTestMap.slice(0, 40);

  // Find untested important sources (exclude type files, index files, etc.)
  for (const sf of nonTestSourceFiles) {
    if (!testedSources.has(sf.rel) && !/index\.[tj]s|\.d\.ts|types?\.|constants?\.|config/i.test(sf.rel)) {
      coverage.untestedSources.push(sf.rel);
    }
  }
  coverage.untestedSources = coverage.untestedSources.slice(0, 40);

  // Test directory structure
  const testDirs = new Set();
  for (const t of testFiles) {
    const dir = path.dirname(t.rel);
    testDirs.add(dir);
  }
  coverage.testDirStructure = [...testDirs].sort().slice(0, 20);

  return coverage;
}

/* ------------------------------------------------------------------ */
/*  Git Activity Analysis                                             */
/* ------------------------------------------------------------------ */

function analyzeGitActivity(rootDir) {
  const git = {
    hotFiles: [],         // Most frequently changed files
    recentChanges: [],    // Recently modified files
    contributors: [],     // Top contributors
    commitFrequency: {},  // Commits per month
    summary: { totalCommits: 0, contributorCount: 0, lastCommitDate: null, repoAge: null },
  };

  // Use imported execSync
  const execSync = _execSync;

  const gitExec = (cmd) => {
    try {
      return execSync(cmd, { cwd: rootDir, encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).trim();
    } catch { return ""; }
  };

  // Check if git repo
  const isGit = gitExec("git rev-parse --is-inside-work-tree");
  if (isGit !== "true") return git;

  // Hot files (most commits)
  const hotRaw = gitExec("git log --format=format: --name-only --diff-filter=ACRM -n 500 | sort | uniq -c | sort -rn | head -30");
  if (hotRaw) {
    for (const line of hotRaw.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (m) git.hotFiles.push({ file: m[2], changeCount: parseInt(m[1]) });
    }
  }

  // Recent changes (last 20)
  const recentRaw = gitExec("git log --format='%H|%an|%ae|%aI|%s' -n 20");
  if (recentRaw) {
    for (const line of recentRaw.split("\n")) {
      const parts = line.split("|");
      if (parts.length >= 5) {
        git.recentChanges.push({
          hash: parts[0].slice(0, 8), author: parts[1],
          email: parts[2], date: parts[3], message: parts.slice(4).join("|"),
        });
      }
    }
  }

  // Contributors
  const contribRaw = gitExec("git shortlog -sn --no-merges -n 20");
  if (contribRaw) {
    for (const line of contribRaw.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (m) git.contributors.push({ name: m[2].trim(), commits: parseInt(m[1]) });
    }
  }

  // Commit frequency (last 12 months)
  const freqRaw = gitExec("git log --format='%aI' --since='12 months ago' | cut -c1-7 | sort | uniq -c");
  if (freqRaw) {
    for (const line of freqRaw.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (m) git.commitFrequency[m[2]] = parseInt(m[1]);
    }
  }

  // Summary
  git.summary.totalCommits = git.contributors.reduce((sum, c) => sum + c.commits, 0);
  git.summary.contributorCount = git.contributors.length;
  git.summary.lastCommitDate = git.recentChanges[0]?.date || null;

  const firstCommitDate = gitExec("git log --reverse --format='%aI' | head -1");
  if (firstCommitDate) {
    const ageMs = Date.now() - new Date(firstCommitDate).getTime();
    git.summary.repoAge = `${Math.round(ageMs / (1000 * 60 * 60 * 24))} days`;
  }

  return git;
}

/* ------------------------------------------------------------------ */
/*  Execution Flow Analysis (GitNexus integration)                    */
/* ------------------------------------------------------------------ */

function analyzeExecutionFlows(rootDir) {
  const flows = {
    detected: false,
    processes: [],
    keyFlows: [],
    summary: { processCount: 0, flowCount: 0 },
  };

  // Try to read GitNexus data if available
  const nexusDir = path.join(rootDir, ".gitnexus");
  if (!exists(nexusDir)) return flows;

  const metaPath = path.join(nexusDir, "meta.json");
  const meta = readJsonSafe(metaPath);
  if (!meta) return flows;

  flows.detected = true;
  flows.summary.processCount = meta.stats?.processes || 0;
  flows.summary.flowCount = meta.stats?.relationships || 0;

  // Try to read process list
  const processDir = path.join(nexusDir, "processes");
  if (exists(processDir)) {
    try {
      const processFiles = fs.readdirSync(processDir).filter((f) => f.endsWith(".json"));
      for (const pf of processFiles.slice(0, 30)) {
        const proc = readJsonSafe(path.join(processDir, pf));
        if (proc?.name) {
          flows.processes.push({
            name: proc.name,
            description: proc.description || null,
            steps: (proc.steps || []).length,
            entryPoint: proc.entryPoint || null,
          });
        }
      }
    } catch { /* ignore */ }
  }

  // Try to extract key flows from the graph database
  const graphPath = path.join(nexusDir, "graph.json");
  const graphData = readJsonSafe(graphPath);
  if (graphData?.nodes) {
    const processNodes = (graphData.nodes || []).filter((n) => n.type === "Process" || n.labels?.includes("Process"));
    for (const pn of processNodes.slice(0, 20)) {
      flows.keyFlows.push({
        name: pn.name || pn.id,
        description: pn.description || null,
      });
    }
  }

  return flows;
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
  complexity, typeSystem, archViolations, apiSurface, depHealth, testCoverage, gitActivity, executionFlows,
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

  // --- 7. Code Quality & Architecture Health ---
  const hasComplexityData = complexity.hotspots.length > 0;
  const hasViolations = archViolations.summary.circularCount > 0 || archViolations.summary.layerViolationCount > 0;

  if (hasComplexityData || hasViolations) {
    pages.push({
      section: "7",
      slug: "quality/code-quality",
      title: "代码质量与架构健康度",
      category: "quality",
      required: true,
      evidence: evidence([
        ...complexity.hotspots.slice(0, 5).map((h) => h.file),
        ...archViolations.circularDeps.slice(0, 3).flatMap((c) => c.chain),
      ]),
      hints: `复杂度热点 ${complexity.hotspots.length} 个, 循环依赖 ${archViolations.summary.circularCount} 个, 层级违规 ${archViolations.summary.layerViolationCount} 个, God 文件 ${archViolations.summary.godFileCount} 个。`,
    });
  }

  // 7.1 Complexity deep dive
  if (complexity.summary.filesOver300Lines > 5) {
    pages.push({
      section: "7.1",
      slug: "quality/complexity-analysis",
      title: "复杂度分析",
      category: "quality",
      required: false,
      evidence: evidence(complexity.hotspots.slice(0, 10).map((h) => h.file)),
      hints: `${complexity.summary.filesOver300Lines} 个文件超过 300 行, ${complexity.summary.functionsOver50Lines} 个函数超过 50 行。按文件和函数维度剖析。`,
    });
  }

  // 7.2 Architecture violations
  if (hasViolations) {
    pages.push({
      section: "7.2",
      slug: "quality/architecture-violations",
      title: "架构违规与改进建议",
      category: "quality",
      required: false,
      evidence: evidence([
        ...archViolations.circularDeps.slice(0, 5).flatMap((c) => c.chain),
        ...archViolations.layerViolations.slice(0, 5).map((v) => v.from),
      ]),
      hints: `循环依赖链、层级违规详解、重构建议。`,
    });
  }

  // --- 8. Type System & API Surface ---
  if (typeSystem.summary.hasTypeScript || apiSurface.summary.totalExports > 10) {
    pages.push({
      section: "8",
      slug: "api/type-system-and-api",
      title: "类型系统与 API Surface",
      category: "api",
      required: typeSystem.summary.hasTypeScript,
      evidence: evidence([
        ...typeSystem.typeFiles.slice(0, 10),
        ...apiSurface.exportedHooks.slice(0, 5).map((h) => h.file),
      ]),
      hints: `${typeSystem.summary.interfaceCount} 个接口, ${typeSystem.summary.typeAliasCount} 个类型别名, ${apiSurface.summary.totalExports} 个导出。`,
    });
  }

  // 8.1 Hooks & composables
  if (apiSurface.summary.hookCount > 5) {
    pages.push({
      section: "8.1",
      slug: "api/hooks-and-composables",
      title: "自定义 Hooks 目录",
      category: "api",
      required: false,
      evidence: evidence(apiSurface.exportedHooks.slice(0, 15).map((h) => h.file)),
      hints: `${apiSurface.summary.hookCount} 个自定义 Hooks。每个 Hook 的用途、参数、返回值。`,
    });
  }

  // --- 9. Project Health Dashboard ---
  pages.push({
    section: "9",
    slug: "health/project-health",
    title: "项目健康仪表盘",
    category: "health",
    required: true,
    evidence: evidence([
      "package.json",
      ...testCoverage.testFiles.slice(0, 5),
      ...gitActivity.hotFiles.slice(0, 5).map((f) => f.file),
    ]),
    hints: `依赖健康 (${depHealth.summary.totalCount} 个依赖), 测试覆盖 (比率 ${testCoverage.summary.coverageRatio}), Git 活跃度 (${gitActivity.summary.totalCommits} 次提交, ${gitActivity.summary.contributorCount} 位贡献者)${executionFlows.detected ? ", 执行流 (" + executionFlows.summary.processCount + " 个流程)" : ""}。`,
  });

  // 9.1 Dependency health detail
  if (depHealth.summary.totalCount > 30 || depHealth.heavyDeps.length > 0) {
    pages.push({
      section: "9.1",
      slug: "health/dependency-health",
      title: "依赖健康度详解",
      category: "health",
      required: false,
      evidence: evidence(["package.json", depHealth.lockFile].filter(Boolean)),
      hints: `${depHealth.summary.directCount} 直接依赖, ${depHealth.heavyDeps.length} 个重量级依赖, ${depHealth.duplicateRisk.length} 个版本冲突风险。`,
    });
  }

  // 9.2 Test coverage detail
  if (testCoverage.summary.testFileCount > 0) {
    pages.push({
      section: "9.2",
      slug: "health/test-coverage",
      title: "测试覆盖分析",
      category: "health",
      required: false,
      evidence: evidence(testCoverage.testFiles.slice(0, 10)),
      hints: `测试框架: ${testCoverage.testFrameworks.join(", ")}。${testCoverage.summary.testFileCount} 个测试文件, 覆盖比 ${testCoverage.summary.coverageRatio}。未覆盖文件清单。`,
    });
  }

  // 9.3 Git activity & evolution
  if (gitActivity.summary.totalCommits > 0) {
    pages.push({
      section: "9.3",
      slug: "health/git-activity",
      title: "Git 活跃度与演化",
      category: "health",
      required: false,
      evidence: evidence(gitActivity.hotFiles.slice(0, 10).map((f) => f.file)),
      hints: `${gitActivity.summary.totalCommits} 次提交, ${gitActivity.summary.contributorCount} 位贡献者, 仓库年龄 ${gitActivity.summary.repoAge || "未知"}。热文件、提交频率趋势。`,
    });
  }

  // 9.4 Execution flows (if GitNexus available)
  if (executionFlows.detected && executionFlows.summary.processCount > 0) {
    pages.push({
      section: "9.4",
      slug: "health/execution-flows",
      title: "执行流全景",
      category: "health",
      required: false,
      evidence: evidence(executionFlows.processes.slice(0, 10).map((p) => p.entryPoint).filter(Boolean)),
      hints: `${executionFlows.summary.processCount} 个关键执行流程。每个流程的入口、步骤、涉及模块。`,
    });
  }

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
  signals, docPlan, fileStats, importGraph, routes, stateManagement, networkLayer, components, outDir,
  complexity, typeSystem, archViolations, apiSurface, depHealth, testCoverage, gitActivity, executionFlows,
}) {
  const now = new Date().toISOString();

  return `# Project Wiki 深度扫描报告

由 \`analyze-repo.mjs\` (Enhanced v2) 在 **${now}** 生成。

## 仓库概况

| 指标 | 值 |
|------|-----|
| 源码文件 | ${fileStats.sourceFiles} |
| 测试文件 | ${fileStats.testFiles} |
| 样式文件 | ${fileStats.styleFiles} |
| 总文件数 | ${fileStats.totalFiles} |
| 总大小 | ${fileStats.totalSizeKB} KB |
| 本地 import 边数 | ${importGraph.totalEdges} |
| 直接依赖 | ${depHealth.summary.directCount} |
| 开发依赖 | ${depHealth.summary.devCount} |
| 导出 API 总数 | ${apiSurface.summary.totalExports} |

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

---

## 代码复杂度分析

| 指标 | 值 |
|------|-----|
| 分析文件数 | ${complexity.summary.totalFilesAnalyzed} |
| 平均文件行数 | ${complexity.summary.avgLinesPerFile} |
| 平均函数数/文件 | ${complexity.summary.avgFunctionsPerFile} |
| 最大嵌套深度 | ${complexity.summary.maxNestingDepth} |
| 超过 300 行的文件 | ${complexity.summary.filesOver300Lines} |
| 超过 500 行的文件 | ${complexity.summary.filesOver500Lines} |
| 超过 50 行的函数 | ${complexity.summary.functionsOver50Lines} |

### 复杂度热点（Top 10）

${complexity.hotspots.slice(0, 10).map((h) => `- \`${h.file}\` — ${h.lines} 行, ${h.functions} 函数, 嵌套 ${h.maxNesting} 层, 复杂度 ${h.complexity}`).join("\n") || "- 无数据"}

### 超长函数（Top 10）

${complexity.functionLengths.slice(0, 10).map((f) => `- \`${f.name}\` in \`${f.file}:${f.startLine}\` — ${f.lines} 行`).join("\n") || "- 无数据"}

---

## 类型系统分析

| 指标 | 值 |
|------|-----|
| TypeScript | ${typeSystem.summary.hasTypeScript ? "是" : "否"} |
| 类型定义文件 | ${typeSystem.summary.typeFileCount} |
| 接口数 | ${typeSystem.summary.interfaceCount} |
| 类型别名 | ${typeSystem.summary.typeAliasCount} |
| 枚举数 | ${typeSystem.summary.enumCount} |
${typeSystem.tsconfigStrict !== undefined ? `| strict 模式 | ${typeSystem.tsconfigStrict ? "开启" : "关闭"} |\n` : ""}

### 核心接口/类型（Top 15）

${typeSystem.coreInterfaces.slice(0, 15).map((t) => `- \`${t.kind} ${t.name}\` in \`${t.file}:${t.line}\`${t.extends ? ` extends ${t.extends}` : ""}${t.properties ? ` (${t.properties} 属性)` : ""}`).join("\n") || "- 无数据"}

---

## 架构违规检测

| 指标 | 值 |
|------|-----|
| 循环依赖 | ${archViolations.summary.circularCount} |
| 层级违规 | ${archViolations.summary.layerViolationCount} |
| God 文件 | ${archViolations.summary.godFileCount} |
| 孤立文件 | ${archViolations.summary.orphanCount} |

${archViolations.circularDeps.length ? "### 循环依赖\n\n" + archViolations.circularDeps.slice(0, 10).map((c) => `- ${c.chain.map((f) => "\`" + f + "\`").join(" -> ")}`).join("\n") : ""}

${archViolations.layerViolations.length ? "\n### 层级违规（Top 10）\n\n" + archViolations.layerViolations.slice(0, 10).map((v) => `- \`${v.from}\` (${v.fromLayer}) imports \`${v.to}\` (${v.toLayer})`).join("\n") : ""}

${archViolations.godFiles.length ? "\n### God 文件（Top 10）\n\n" + archViolations.godFiles.slice(0, 10).map((g) => `- \`${g.file}\` — ${g.imports} imports, ${g.importedBy} importers`).join("\n") : ""}

---

## API Surface

| 指标 | 值 |
|------|-----|
| 总导出 | ${apiSurface.summary.totalExports} |
| 导出函数 | ${apiSurface.summary.functionCount} |
| 导出 Hooks | ${apiSurface.summary.hookCount} |
| 导出组件 | ${apiSurface.summary.componentCount} |
| 导出类 | ${apiSurface.summary.classCount} |
| Barrel 文件 | ${apiSurface.barrelFiles.length} |

${apiSurface.exportedHooks.length ? "### 自定义 Hooks\n\n" + apiSurface.exportedHooks.slice(0, 15).map((h) => `- \`${h.name}\` — \`${h.file}:${h.line}\``).join("\n") : ""}

---

## 依赖健康度

| 指标 | 值 |
|------|-----|
| 直接依赖 | ${depHealth.summary.directCount} |
| 开发依赖 | ${depHealth.summary.devCount} |
| Peer 依赖 | ${depHealth.summary.peerCount} |
| Lock 文件 | ${depHealth.lockFile || "未找到"} |
| 重量级依赖 | ${depHealth.heavyDeps.length} |
| 版本冲突风险 | ${depHealth.duplicateRisk.length} |

${depHealth.heavyDeps.length ? "### 重量级依赖\n\n" + depHealth.heavyDeps.map((d) => `- \`${d.name}@${d.version}\` — ${d.reason}`).join("\n") : ""}

${depHealth.duplicateRisk.length ? "\n### 版本冲突风险\n\n" + depHealth.duplicateRisk.map((d) => `- \`${d.name}\`: ${d.versions.join(" vs ")}`).join("\n") : ""}

---

## 测试覆盖分析

| 指标 | 值 |
|------|-----|
| 测试文件数 | ${testCoverage.summary.testFileCount} |
| 源码文件数 | ${testCoverage.summary.sourceFileCount} |
| 测试/源码比 | ${testCoverage.summary.coverageRatio} |
| 测试框架 | ${testCoverage.testFrameworks.join(", ") || "未检测到"} |
| E2E 测试 | ${testCoverage.summary.hasE2E ? "有" : "无"} |
| 已配对 | ${testCoverage.sourceToTestMap.length} 个文件 |
| 未覆盖 | ${testCoverage.untestedSources.length} 个文件 |

${testCoverage.untestedSources.length ? "### 未覆盖的重要源文件（Top 15）\n\n" + testCoverage.untestedSources.slice(0, 15).map((f) => `- \`${f}\``).join("\n") : ""}

---

## Git 活跃度

| 指标 | 值 |
|------|-----|
| 总提交数 | ${gitActivity.summary.totalCommits} |
| 贡献者 | ${gitActivity.summary.contributorCount} |
| 最近提交 | ${gitActivity.summary.lastCommitDate || "N/A"} |
| 仓库年龄 | ${gitActivity.summary.repoAge || "N/A"} |

${gitActivity.hotFiles.length ? "### 变更频率最高的文件（Top 15）\n\n" + gitActivity.hotFiles.slice(0, 15).map((f) => `- \`${f.file}\` — ${f.changeCount} 次变更`).join("\n") : ""}

${gitActivity.contributors.length ? "\n### 核心贡献者\n\n" + gitActivity.contributors.slice(0, 10).map((c) => `- **${c.name}** — ${c.commits} 次提交`).join("\n") : ""}

${Object.keys(gitActivity.commitFrequency).length ? "\n### 提交频率（近 12 月）\n\n" + Object.entries(gitActivity.commitFrequency).map(([month, count]) => `- ${month}: ${count} 次`).join("\n") : ""}

---

## 执行流分析（GitNexus）

${executionFlows.detected
  ? `- 已检测到 GitNexus 索引
- 执行流数量: ${executionFlows.summary.processCount}
- 关系总数: ${executionFlows.summary.flowCount}
${executionFlows.processes.length ? "\n### 关键执行流\n\n" + executionFlows.processes.slice(0, 15).map((p) => `- **${p.name}**${p.description ? ": " + p.description : ""} (${p.steps} 步)`).join("\n") : ""}`
  : "- 未检测到 GitNexus 索引。运行 \\`npx gitnexus analyze\\` 启用执行流分析。"}

---

## 文档计划 (doc_plan.json)

${docPlan.pages.map((p) => `- **${p.section}** \`${p.slug}\` ${p.required ? "★" : "○"} — ${p.title}\n  - ${p.hints}`).join("\n")}

## 覆盖说明

- 本脚本为**启发式**静态扫描，未执行类型检查或测试
- **import 图谱**仅解析文件前 200 行的静态 import/require
- 动态 import、alias（如 \`@/\`）和 barrel re-export 可能遗漏
- 路由与状态检测基于正则匹配，复杂配置请人工核对
- **复杂度分析**基于启发式度量（函数数量 + 嵌套深度 + 行数），非精确圈复杂度
- **类型系统分析**仅检测显式导出的 interface/type，内部类型未计入
- **架构违规**检测基于目录名推断的层级模型，自定义架构需人工调整规则
- **测试覆盖**基于文件名匹配，非运行时覆盖率

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

  // --- NEW: Deep analysis modules ---
  console.log("  Analyzing code complexity...");
  const complexity = analyzeCodeComplexity(sourceFiles);

  console.log("  Analyzing type system...");
  const typeSystem = analyzeTypeSystem(root, sourceFiles);

  console.log("  Detecting architecture violations...");
  const archViolations = detectArchitectureViolations(root, sourceFiles, importGraph);

  console.log("  Analyzing API surface...");
  const apiSurface = analyzeAPISurface(sourceFiles);

  console.log("  Analyzing dependency health...");
  const depHealth = analyzeDependencyHealth(root);

  console.log("  Analyzing test coverage...");
  const testCoverage = analyzeTestCoverage(root, allFiles, sourceFiles);

  console.log("  Analyzing git activity...");
  const gitActivity = analyzeGitActivity(root);

  console.log("  Checking execution flows (GitNexus)...");
  const executionFlows = analyzeExecutionFlows(root);

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
    complexity, typeSystem, archViolations, apiSurface, depHealth, testCoverage, gitActivity, executionFlows,
  });

  // Write meta files
  console.log("\n  Writing metadata...");
  fs.mkdirSync(metaDir, { recursive: true });
  writeFileEnsured(path.join(metaDir, "repo.json"), JSON.stringify(repoJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "structure.json"), JSON.stringify(structureJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "entrypoints.json"), JSON.stringify(entryJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "imports.json"), JSON.stringify(importsJson, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "complexity.json"), JSON.stringify(complexity, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "types.json"), JSON.stringify(typeSystem, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "violations.json"), JSON.stringify(archViolations, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "api-surface.json"), JSON.stringify(apiSurface, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "dep-health.json"), JSON.stringify(depHealth, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "test-coverage.json"), JSON.stringify(testCoverage, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "git-activity.json"), JSON.stringify(gitActivity, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "execution-flows.json"), JSON.stringify(executionFlows, null, 2) + "\n");
  writeFileEnsured(path.join(metaDir, "doc_plan.json"), JSON.stringify(docPlan, null, 2) + "\n");

  // Quality report
  const qr = generateQualityReport({
    signals, docPlan, fileStats, importGraph, routes, stateManagement, networkLayer, components, outDir,
    complexity, typeSystem, archViolations, apiSurface, depHealth, testCoverage, gitActivity, executionFlows,
  });
  const qrPath = path.join(wikiRoot, "quality-report.md");
  fs.mkdirSync(wikiRoot, { recursive: true });
  fs.writeFileSync(qrPath, qr, "utf8");
  console.log(`  ✓ ${path.relative(process.cwd(), qrPath)}`);

  console.log(`\n✅ Done. ${docPlan.pages.length} pages planned. Next: read .meta/doc_plan.json and author Markdown pages.\n`);
}

main();
