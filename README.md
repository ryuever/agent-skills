# agent-skills

Personal [Agent Skills](https://agentskills.io) collection (layout similar to [antfu/skills](https://github.com/antfu/skills)), installable with the [skills CLI](https://github.com/vercel-labs/skills).

This repository is meant to be **its own Git project** (clone or fork it, then publish under your GitHub account).

## Skills

| Skill | Summary |
| --- | --- |
| [codebase-wiki](./skills/codebase-wiki/SKILL.md) | Archive study notes under `codebase-wiki/` with IDs, `INDEX`, `references`, and optional VitePress (`srcDir: ./codebase-wiki`). Includes Node scripts to scaffold the site and regenerate sidebar/nav. |
| [project-wiki](./skills/project-wiki/SKILL.md) | DeepWiki-style project panorama: deep analysis (import graph, route/state/API detection, file stats) → hierarchical numbered docs under `project-wiki/`; supports VitePress (default), Mintlify, and Starlight. Frontend-first. |
| [curated-reads](./skills/curated-reads/SKILL.md) | Curate external tech articles (blogs, tweets, newsletters) with confidence scoring, explicit conflict handling, and volume-adaptive output; uses Starlight as doc engine. |
| [org-to-vitepress](./skills/org-to-vitepress/SKILL.md) | Batch-convert an Emacs Org-mode directory tree to Markdown via Pandoc and scaffold a VitePress site to serve it, with auto-generated multi-level sidebar from the folder structure. |
| [architecture-diagram](./skills/architecture-diagram/SKILL.md) | Generate architecture diagrams as standalone HTML + inline SVG from system descriptions; includes reusable template, conventions, init script, and multi-style examples (dark/light/blueprint/editorial). |

## Skill Design Principles

Recent optimization focuses on a lightweight "router-first" pattern inspired by strong editorial skills:

- `SKILL.md` acts as the task router; deep details stay in `references/` and are loaded on demand.
- Each skill now defines a **First-run Gate** to avoid silent heavy writes in uninitialized target repos.
- Workflows prefer a **minimum viable path first** (generate one usable result, then enrich).
- Navigation/scripts are treated as sync steps, not mandatory upfront reads.

This keeps agent context smaller, reduces accidental over-generation, and improves first-use safety.

## Install (Cursor & others)

```bash
npx skills add <your-github>/agent-skills --skill codebase-wiki -a cursor -y
npx skills add <your-github>/agent-skills --skill project-wiki -a cursor -y
npx skills add <your-github>/agent-skills --skill curated-reads -a cursor -y
npx skills add <your-github>/agent-skills --skill org-to-vitepress -a cursor -y
npx skills add <your-github>/agent-skills --skill architecture-diagram -a cursor -y
```

Local checkout while developing:

```bash
npx skills add ./agent-skills --skill codebase-wiki -a cursor -y
npx skills add ./agent-skills --skill project-wiki -a cursor -y
npx skills add ./agent-skills --skill curated-reads -a cursor -y
npx skills add ./agent-skills --skill org-to-vitepress -a cursor -y
npx skills add ./agent-skills --skill architecture-diagram -a cursor -y
```

## Bootstrap VitePress + `codebase-wiki/` in a target repo

From the **target project root** (after the skill is installed under `.cursor/skills/` or equivalent):

```bash
node ./.cursor/skills/codebase-wiki/scripts/init-vitepress.mjs --root . --title "My Codebase Wiki"
```

Options:

- `--skill-dir <path>` — if the skill is not at `./.cursor/skills/codebase-wiki`, point to the folder that contains `scripts/` and `references/`.
- `--force` — overwrite generated `INDEX.md` / `.vitepress/config.mts` if they already exist.
- `--github <url>` — optional GitHub link for the VitePress theme.

Then install VitePress (the script merges `package.json` scripts and adds a `vitepress` devDependency entry):

```bash
pnpm add -D vitepress
pnpm run docs:wiki:dev
```

After you add or rename Markdown files under `codebase-wiki/architecture|discussion|reference|roadmap/`:

```bash
node ./.cursor/skills/codebase-wiki/scripts/regenerate-sidebar.mjs --root .
```

If `architecture-diagrams/` already exists, codebase-wiki init auto-creates bridge files:

- `codebase-wiki/ARCHITECTURE-DIAGRAM-LINKS.md`
- `architecture-diagrams/CODEBASE-WIKI-LINKS.md`

## Bootstrap `project-wiki/` in a target repo

From the **target project root** (after the skill is installed):

```bash
# Initialize with VitePress (default)
node ./.cursor/skills/project-wiki/scripts/init-project-wiki.mjs --root . --title "Project Wiki"

# Or enable all three engines at once
node ./.cursor/skills/project-wiki/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack all

# Run deep analysis (import graph, route/state detection, file stats)
node ./.cursor/skills/project-wiki/scripts/analyze-repo.mjs --root . --out-dir project-wiki
```

Optional flags: `--github <url>`, `--force`, `--stack <list>` (comma-separated: `vitepress`, `mintlify`, `starlight`, or `all`).

### Preview by engine

```bash
# VitePress (default)
pnpm add -D vitepress
pnpm run docs:project-wiki:dev

# Mintlify (requires --stack mintlify or all)
pnpm add -D mintlify
pnpm run docs:project-wiki:mintlify:dev

# Starlight (requires --stack starlight or all)
cd project-wiki/starlight && npm install && cd ../..
pnpm run docs:project-wiki:starlight:dev
```

### Regenerate sidebar

After adding or renaming Markdown under `project-wiki/overview|architecture|concepts|modules|dataflow|operations/`:

```bash
node ./.cursor/skills/project-wiki/scripts/regenerate-sidebar.mjs --root .
```

This updates **all** initialized engines' sidebars simultaneously (VitePress, Mintlify, Starlight).

## Bootstrap `curated-reads/` in a target repo

From the **target project root** (after the skill is installed):

```bash
node ./.cursor/skills/curated-reads/scripts/init-starlight.mjs --root . --title "Curated Reads"
```

Install dependencies and preview:

```bash
pnpm install
pnpm run docs:reads:dev
```

After you add or rename Markdown files under `curated-reads/src/content/docs/`:

```bash
node ./.cursor/skills/curated-reads/scripts/regenerate-starlight-sidebar.mjs --root .
```

## Convert an Emacs Org-mode tree and serve with VitePress

Prerequisite: install `pandoc` (`brew install pandoc` on macOS).

From the **target project root** (after the skill is installed):

```bash
# 1) Convert .org → .md (mirrors directory structure, copies image/PDF assets)
node ./.cursor/skills/org-to-vitepress/scripts/convert-org-to-md.mjs \
    --source /absolute/path/to/org \
    --dest ./org-wiki

# 2) Scaffold VitePress (.vitepress/config.mts + INDEX.md + package.json scripts)
node ./.cursor/skills/org-to-vitepress/scripts/init-vitepress.mjs \
    --root . --title "Org Archive"

# 3) Preview
pnpm install
pnpm run docs:org:dev      # http://localhost:5173/
```

Whenever you add or rename Markdown under `org-wiki/`:

```bash
node ./.cursor/skills/org-to-vitepress/scripts/regenerate-vitepress-sidebar.mjs --root .
```

## Bootstrap `architecture-diagrams/` in a target repo

From the **target project root** (after the skill is installed):

```bash
node ./.cursor/skills/architecture-diagram/scripts/init-architecture-diagram.mjs --root .
```

This creates `architecture-diagrams/template.html` and `architecture-diagrams/CONVENTIONS.md`.

Then create a diagram file from template:

```bash
cp ./architecture-diagrams/template.html ./architecture-diagrams/20260421-my-system-architecture.html
```

If compatible knowledge skills already exist (`codebase-wiki/`, `project-wiki/`, `curated-reads/`, `org-wiki/`), init auto-creates bridge files:

- `<source-dir>/ARCHITECTURE-DIAGRAM-LINKS.md`
- `architecture-diagrams/<SOURCE-NAME>-LINKS.md`

Style references live in the skill package:

- `./.cursor/skills/architecture-diagram/examples/minimal-dark.html`
- `./.cursor/skills/architecture-diagram/examples/minimal-light.html`
- `./.cursor/skills/architecture-diagram/examples/blueprint-grid.html`
- `./.cursor/skills/architecture-diagram/examples/editorial-cards.html`

## Update

```bash
npx skills update codebase-wiki -y
npx skills update project-wiki -y
npx skills update curated-reads -y
npx skills update org-to-vitepress -y
npx skills update architecture-diagram -y
```

## Cross-skill Linking with `architecture-diagram`

When `architecture-diagrams/` exists, these init scripts now auto-detect and create bridge files:

- `codebase-wiki` init → `codebase-wiki/ARCHITECTURE-DIAGRAM-LINKS.md` + `architecture-diagrams/CODEBASE-WIKI-LINKS.md`
- `project-wiki` init → `project-wiki/ARCHITECTURE-DIAGRAM-LINKS.md` + `architecture-diagrams/PROJECT-WIKI-LINKS.md`
- `curated-reads` init → `curated-reads/ARCHITECTURE-DIAGRAM-LINKS.md` + `architecture-diagrams/CURATED-READS-LINKS.md`
- `org-to-vitepress` init → `<srcDir>/ARCHITECTURE-DIAGRAM-LINKS.md` + `architecture-diagrams/ORG-TO-VITEPRESS-LINKS.md`

And when `architecture-diagram` is initialized, it auto-detects those source dirs and creates the same bridge files from its side.

## License

MIT
