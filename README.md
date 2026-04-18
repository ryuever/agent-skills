# agent-skills

Personal [Agent Skills](https://agentskills.io) collection (layout similar to [antfu/skills](https://github.com/antfu/skills)), installable with the [skills CLI](https://github.com/vercel-labs/skills).

This repository is meant to be **its own Git project** (clone or fork it, then publish under your GitHub account).

## Skills

| Skill | Summary |
| --- | --- |
| [codebase-wiki](./skills/codebase-wiki/SKILL.md) | Archive study notes under `codebase-wiki/` with IDs, `INDEX`, `references`, and optional VitePress (`srcDir: ./codebase-wiki`). Includes Node scripts to scaffold the site and regenerate sidebar/nav. |
| [project-wiki](./skills/project-wiki/SKILL.md) | DeepWiki-style project panorama: deep analysis (import graph, route/state/API detection, file stats) → hierarchical numbered docs under `project-wiki/`; supports VitePress (default), Mintlify, and Starlight. Frontend-first. |

## Install (Cursor & others)

```bash
npx skills add <your-github>/agent-skills --skill codebase-wiki -a cursor -y
npx skills add <your-github>/agent-skills --skill project-wiki -a cursor -y
```

Local checkout while developing:

```bash
npx skills add ./agent-skills --skill codebase-wiki -a cursor -y
npx skills add ./agent-skills --skill project-wiki -a cursor -y
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

## Update

```bash
npx skills update codebase-wiki -y
npx skills update project-wiki -y
```

## License

MIT
