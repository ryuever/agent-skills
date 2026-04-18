# agent-skills

Personal [Agent Skills](https://agentskills.io) collection (layout similar to [antfu/skills](https://github.com/antfu/skills)), installable with the [skills CLI](https://github.com/vercel-labs/skills).

This repository is meant to be **its own Git project** (clone or fork it, then publish under your GitHub account).

## Skills

| Skill | Summary |
| --- | --- |
| [codebase-wiki](./skills/codebase-wiki/SKILL.md) | Archive study notes under `codebase-wiki/` with IDs, `INDEX`, `references`, and optional VitePress (`srcDir: ./codebase-wiki`). Includes Node scripts to scaffold the site and regenerate sidebar/nav. |

## Install (Cursor & others)

```bash
npx skills add <your-github>/agent-skills --skill codebase-wiki -a cursor -y
```

Local checkout while developing:

```bash
npx skills add ./agent-skills --skill codebase-wiki -a cursor -y
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

## Update

```bash
npx skills update codebase-wiki -y
```

## License

MIT
