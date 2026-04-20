#!/usr/bin/env node
/**
 * Convert a tree of Emacs Org-mode (.org) files into GitHub Flavored Markdown
 * using `pandoc`, preserving the directory structure and mirroring assets
 * (images, PDFs, etc.) into the destination.
 *
 * Usage (from the target repo root):
 *   node <skill>/scripts/convert-org-to-md.mjs \
 *       --source /absolute/path/to/org \
 *       --dest ./org-wiki
 *
 * Options:
 *   --source <dir>       Absolute path to the source directory containing .org files  [required]
 *   --dest <dir>         Output directory (VitePress srcDir), relative or absolute    [required]
 *   --concurrency <n>    Max concurrent pandoc processes (default: min(8, os.cpus))
 *   --force              Overwrite existing .md files instead of skipping
 *   --verbose            Print per-file progress
 *   --dry-run            Do not write any files; just print what would be done
 *
 * Prerequisite:
 *   `pandoc` must be available on PATH. Install:
 *     macOS:   brew install pandoc
 *     Debian:  sudo apt install pandoc
 *     Windows: choco install pandoc   (or https://pandoc.org/installing.html)
 *
 * Output:
 *   - <dest>/<same-relative-path>/<slug>.md       # converted markdown with YAML frontmatter
 *   - <dest>/<same-relative-path>/<asset>         # verbatim copy of images/pdfs etc.
 *   - <dest>/../.org-conversion-errors.log        # appended hard failures
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";

/** Extensions treated as asset files and copied verbatim. */
const ASSET_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".apng",
  ".pdf", ".mp4", ".webm",
]);

/** Filename suffixes/extensions that should be skipped outright. */
const SKIP_EXT = new Set([".org_archive", ".org~", ".u1conflict"]);

/** Regex for filenames that look like Emacs scratch buffers or junk. */
const JUNK_NAME_RE = /^(\*|\^|~|\.)/;

function parseArgs(argv) {
  const out = {
    source: "",
    dest: "",
    concurrency: Math.min(8, os.cpus()?.length ?? 4),
    force: false,
    verbose: false,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source" && argv[i + 1]) out.source = path.resolve(argv[++i]);
    else if (a === "--dest" && argv[i + 1]) out.dest = path.resolve(argv[++i]);
    else if (a === "--concurrency" && argv[i + 1]) out.concurrency = Math.max(1, Number(argv[++i]) | 0);
    else if (a === "--force") out.force = true;
    else if (a === "--verbose") out.verbose = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  if (!out.source || !out.dest) {
    console.error("error: --source and --dest are required.\n");
    printHelp();
    process.exit(2);
  }
  return out;
}

function printHelp() {
  const lines = [
    "convert-org-to-md.mjs — Convert an Org-mode directory tree to Markdown via pandoc",
    "",
    "Usage:",
    "  node convert-org-to-md.mjs --source <dir> --dest <dir> [options]",
    "",
    "Options:",
    "  --source <dir>      Source .org root (absolute path)       [required]",
    "  --dest <dir>        Output markdown root (VitePress srcDir) [required]",
    "  --concurrency <n>   Concurrent pandoc processes (default: min(8, cpus))",
    "  --force             Overwrite existing .md output",
    "  --verbose           Per-file logging",
    "  --dry-run           Plan only, no writes",
  ];
  console.log(lines.join("\n"));
}

/** Verify pandoc exists. Exit with a helpful message if not. */
function ensurePandoc() {
  try {
    const v = execFileSync("pandoc", ["--version"], { encoding: "utf8" })
      .split("\n")[0]
      .trim();
    return v;
  } catch {
    console.error(
      "\nerror: `pandoc` is not available on PATH.\n\n" +
        "Install it, then re-run:\n" +
        "  macOS:     brew install pandoc\n" +
        "  Debian:    sudo apt install pandoc\n" +
        "  Windows:   choco install pandoc   (or https://pandoc.org/installing.html)\n",
    );
    process.exit(127);
  }
}

/**
 * Turn a raw filename (without extension) into a filesystem-safe, lowercase,
 * kebab-case slug.
 */
function slugify(base) {
  let s = base.normalize("NFKC").toLowerCase();
  s = s.replace(/[\s_]+/g, "-");
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  s = s.replace(/[*^~`|:?<>"\\!()\[\]{}@#$%&;,'’‘“”]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s || "untitled";
}

/**
 * Recursively walk a directory and yield all regular-file entries as
 * { absPath, relPath }.
 */
function* walk(dir, relBase = "") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`warn: cannot read ${dir}: ${e.message}`);
    return;
  }
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    if (entry.name.startsWith(".git")) continue;
    const abs = path.join(dir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      yield* walk(abs, rel);
    } else if (entry.isFile()) {
      yield { absPath: abs, relPath: rel };
    }
  }
}

/**
 * Extract a plausible title from an .org file in priority order:
 *   1. #+title: ...    (case-insensitive, first occurrence)
 *   2. First `* ` heading
 *   3. null (caller falls back to slug)
 */
function extractOrgTitle(text) {
  const titleMatch = text.match(/^\s*#\+title:\s*(.+?)\s*$/im);
  if (titleMatch) return titleMatch[1].trim();
  const headingMatch = text.match(/^\*\s+(.+?)\s*$/m);
  if (headingMatch) return headingMatch[1].trim();
  return null;
}

/** YAML-escape a string that will appear inside double quotes. */
function yamlString(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Run pandoc on a single file. Resolves with the generated markdown body
 * (stdout) or rejects with stderr text.
 */
function runPandoc(srcAbs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "pandoc",
      [
        "--from=org",
        "--to=gfm+tex_math_dollars",
        "--wrap=preserve",
        srcAbs,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString("utf8")));
    proc.stderr.on("data", (d) => (err += d.toString("utf8")));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ markdown: out, warnings: err });
      else reject(new Error(err.trim() || `pandoc exited with ${code}`));
    });
  });
}

/**
 * Compute output path for a given source `.org` file and the set of paths
 * already allocated under its output directory. Handles slug conflicts by
 * appending `-2`, `-3`, ...
 */
function computeOutPath(relPath, destRoot, claimed) {
  const dir = path.posix.dirname(relPath);
  const base = path.posix.basename(relPath, path.extname(relPath));
  let slug = slugify(base);
  const dirKey = dir === "." ? "" : dir;
  const takenInDir = claimed.get(dirKey) ?? new Set();
  let candidate = slug;
  let i = 2;
  while (takenInDir.has(candidate)) {
    candidate = `${slug}-${i++}`;
  }
  takenInDir.add(candidate);
  claimed.set(dirKey, takenInDir);
  const relOut = dir === "." ? `${candidate}.md` : path.posix.join(dir, `${candidate}.md`);
  return {
    relOut,
    absOut: path.join(destRoot, ...relOut.split("/")),
  };
}

/**
 * Run an async worker pool over `items`; calls `handler(item)` for each with
 * up to `concurrency` in flight.
 */
async function runPool(items, concurrency, handler) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        await handler(items[i], i);
      } catch (e) {
        // `handler` should catch its own errors; treat anything leaking here as fatal
        throw e;
      }
    }
  });
  await Promise.all(workers);
}

async function main() {
  const opts = parseArgs(process.argv);
  const pandocVersion = ensurePandoc();

  if (!fs.existsSync(opts.source) || !fs.statSync(opts.source).isDirectory()) {
    console.error(`error: --source is not a directory: ${opts.source}`);
    process.exit(2);
  }
  if (!opts.dryRun) {
    fs.mkdirSync(opts.dest, { recursive: true });
  }

  console.log(`pandoc:    ${pandocVersion}`);
  console.log(`source:    ${opts.source}`);
  console.log(`dest:      ${opts.dest}`);
  console.log(`concurrency: ${opts.concurrency}`);
  if (opts.dryRun) console.log("(dry-run: no files will be written)");
  console.log("");

  /** @type {Array<{ absPath: string; relPath: string; ext: string }>} */
  const orgFiles = [];
  /** @type {Array<{ absPath: string; relPath: string }>} */
  const assetFiles = [];
  const skippedByName = [];

  for (const f of walk(opts.source)) {
    const ext = path.extname(f.relPath).toLowerCase();
    const basename = path.basename(f.relPath);

    if (SKIP_EXT.has(ext)) {
      skippedByName.push({ relPath: f.relPath, reason: `ext-skip (${ext})` });
      continue;
    }
    if (JUNK_NAME_RE.test(basename)) {
      skippedByName.push({ relPath: f.relPath, reason: "junk-name" });
      continue;
    }
    if (ext === ".org") {
      orgFiles.push({ ...f, ext });
    } else if (ASSET_EXTS.has(ext)) {
      assetFiles.push(f);
    } else {
      skippedByName.push({ relPath: f.relPath, reason: `unsupported-ext (${ext || "none"})` });
    }
  }

  console.log(`found ${orgFiles.length} .org files, ${assetFiles.length} assets, skipped ${skippedByName.length}`);

  // ── Copy assets first ─────────────────────────────────────────────────
  let assetsCopied = 0;
  let assetsSkipped = 0;
  for (const a of assetFiles) {
    const out = path.join(opts.dest, ...a.relPath.split("/"));
    if (fs.existsSync(out) && !opts.force) {
      assetsSkipped++;
      continue;
    }
    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(a.absPath, out);
    }
    assetsCopied++;
    if (opts.verbose) console.log(`asset  ${a.relPath}`);
  }
  console.log(`assets: copied ${assetsCopied}, existing kept ${assetsSkipped}`);

  // ── Convert org files in parallel ─────────────────────────────────────
  const claimed = new Map();
  // Pre-compute output paths (synchronously, to make slug collisions deterministic)
  const plans = orgFiles.map((f) => {
    const { relOut, absOut } = computeOutPath(f.relPath, opts.dest, claimed);
    return { ...f, relOut, absOut };
  });

  const results = { converted: 0, skippedExisting: 0, empty: 0, failed: 0 };
  const errorLog = [];

  await runPool(plans, opts.concurrency, async (p) => {
    if (fs.existsSync(p.absOut) && !opts.force) {
      results.skippedExisting++;
      if (opts.verbose) console.log(`skip   ${p.relPath} (exists)`);
      return;
    }
    let raw;
    try {
      raw = fs.readFileSync(p.absPath, "utf8");
    } catch (e) {
      results.failed++;
      errorLog.push(`${p.relPath}: read failed — ${e.message}`);
      return;
    }
    const title = extractOrgTitle(raw) || path.basename(p.relPath, ".org");

    let body = "";
    try {
      const { markdown } = await runPandoc(p.absPath);
      body = markdown.trim();
    } catch (e) {
      results.failed++;
      errorLog.push(`${p.relPath}: ${String(e.message || e).split("\n")[0]}`);
      return;
    }

    if (!body) {
      results.empty++;
      if (opts.verbose) console.log(`empty  ${p.relPath}`);
    }

    const frontmatter =
      `---\n` +
      `title: ${yamlString(title)}\n` +
      `source: ${yamlString(p.relPath)}\n` +
      `---\n\n`;
    const finalMd = frontmatter + (body || `> _No content extracted from \`${p.relPath}\`._\n`) + "\n";

    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(p.absOut), { recursive: true });
      fs.writeFileSync(p.absOut, finalMd, "utf8");
    }
    results.converted++;
    if (opts.verbose) console.log(`write  ${p.relOut}`);
  });

  // ── Persist error log ────────────────────────────────────────────────
  if (errorLog.length > 0 && !opts.dryRun) {
    const logPath = path.join(path.dirname(opts.dest), ".org-conversion-errors.log");
    const ts = new Date().toISOString();
    fs.appendFileSync(
      logPath,
      `# ${ts}\n` + errorLog.map((l) => `- ${l}`).join("\n") + "\n\n",
      "utf8",
    );
    console.log(`error log: ${logPath}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("");
  console.log("=".repeat(60));
  console.log("summary");
  console.log("-".repeat(60));
  console.log(`  converted       : ${results.converted}`);
  console.log(`  skipped (exists): ${results.skippedExisting}`);
  console.log(`  empty output    : ${results.empty}`);
  console.log(`  failed          : ${results.failed}`);
  console.log(`  assets copied   : ${assetsCopied}`);
  console.log(`  assets kept     : ${assetsSkipped}`);
  console.log(`  skipped by name : ${skippedByName.length}`);
  if (skippedByName.length > 0) {
    console.log("\n  first 10 name-based skips:");
    for (const s of skippedByName.slice(0, 10)) {
      console.log(`    - ${s.relPath}  (${s.reason})`);
    }
  }
  console.log("=".repeat(60));

  if (results.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
