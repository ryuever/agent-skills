# AGENTS.md

This file provides guidance to AI coding agents working on the `agent-skills` repository.

## Project Overview

Personal [Agent Skills](https://agentskills.io) collection, installable via the [skills CLI](https://github.com/vercel-labs/skills). This is **not** a Node.js application — it is a template library that provides reusable workflows, scripts, and document scaffolding for AI agents (Cursor, Claude Code, etc.).

Layout follows [antfu/skills](https://github.com/antfu/skills) conventions. Each skill lives under `skills/<name>/` and is independently installable.

## Repository Structure

```
.
├── AGENTS.md                          # This file (AI agent guidance)
├── CLAUDE.md -> AGENTS.md             # Symlink for Claude Code
├── .cursor/rules/AGENTS.md -> ../../AGENTS.md  # Symlink for Cursor
├── README.md                          # Human-facing install & usage guide
├── LICENSE                            # MIT
├── .gitignore
│
└── skills/                            # Each subdirectory is an independent skill
    ├── codebase-wiki/                 # Study-notes wiki (A/D/R/P categories)
    │   ├── SKILL.md                   # Skill definition & agent workflow
    │   ├── references/
    │   │   └── CONVENTIONS.md         # Writing conventions
    │   ├── scripts/                   # Node.js (.mjs) init & sidebar scripts
    │   │   ├── init-vitepress.mjs
    │   │   ├── init-mintlify.mjs
    │   │   ├── init-starlight.mjs
    │   │   ├── regenerate-sidebar.mjs
    │   │   ├── regenerate-navigation.mjs
    │   │   └── regenerate-starlight-sidebar.mjs
    │   └── assets/                    # Doc-engine templates (vitepress/mintlify/starlight)
    │
    ├── project-wiki/                  # DeepWiki-style project panorama (1.x–6.x hierarchy)
    │   ├── SKILL.md
    │   ├── references/
    │   │   ├── CONVENTIONS.md
    │   │   ├── doc-templates.md       # DeepWiki page templates
    │   │   ├── structure-and-heuristics.md
    │   │   └── FRONTEND-FOCUS.md      # Frontend-specific reading checklist
    │   ├── scripts/
    │   │   ├── analyze-repo.mjs       # Deep repo analysis → .meta/*.json
    │   │   ├── init-project-wiki.mjs
    │   │   └── regenerate-sidebar.mjs # Tri-engine sidebar sync
    │   └── assets/
    │
    └── curated-reads/                 # External article curation (confidence + conflict)
        ├── SKILL.md
        ├── references/
        │   └── CONVENTIONS.md
        ├── scripts/
        │   ├── init-starlight.mjs
        │   └── regenerate-starlight-sidebar.mjs
        └── assets/
```

## Skills Summary

| Skill | Purpose | Numbering | Doc Engines |
|-------|---------|-----------|-------------|
| **codebase-wiki** | Archive source-code reading notes with categories (Architecture / Discussion / Reference / Roadmap) | `A-xxx` `D-xxx` `R-xxx` `P-xxx` | VitePress, Mintlify, Starlight |
| **project-wiki** | One-shot DeepWiki-style panorama: static analysis → hierarchical numbered docs | `1.x`–`6.x` (overview → operations) | VitePress, Mintlify, Starlight |
| **curated-reads** | Curate external tech articles with confidence scoring & explicit conflict handling | `AI-xxx` `ENG-xxx` `FE-xxx` etc. | Starlight only |

## Key Conventions

### Skill Package Structure

Every skill **must** contain:

- `SKILL.md` — Skill metadata (YAML frontmatter with `name` and `description`) + full agent workflow
- `references/CONVENTIONS.md` — Writing conventions and frontmatter schema
- `scripts/` — Node.js `.mjs` scripts (init scaffolding, sidebar regeneration)
- `assets/` — Doc-engine templates (config files, index pages, sidebar placeholders)

### Script Conventions

- All scripts are **ESM** (`.mjs` extension, no TypeScript compilation needed)
- Scripts run with `node <script> --root <target-repo-root>` — they operate on the **target** project, not this repo
- Common flags: `--root`, `--title`, `--force`, `--stack`, `--github`, `--skill-dir`
- Scripts use only Node.js built-in modules (`fs`, `path`, `url`) — no npm dependencies

### Document Conventions

- **Filename**: `YYYYMMDD-kebab-case-slug.md` (no uppercase, no underscores, no spaces)
- **Frontmatter**: YAML with required fields (`id`, `title`, `description`, `category`, `created`, `updated`, `tags`, `status`)
- **Language**: Chinese by default for document body; keep technical terms in English
- **Source code references**: Use `path/to/file.ts:line-line` format
- **Cross-references**: Bidirectional `references` array in frontmatter with `rel` types (`derived-from`, `related-to`, `extends`, `supersedes`, `compares-with`)

### Directory Naming

- Use **underscore-prefix** (e.g., `_starlight/`) instead of dot-prefix for directories that need to survive `npx skills install` — dot-prefixed dirs get stripped during installation
- Template directories in `assets/` use the engine name directly (`vitepress/`, `mintlify/`, `starlight/`)

## Development Workflow

### Adding a New Skill

1. Create `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Create `skills/<name>/references/CONVENTIONS.md`
3. Create init script(s) in `skills/<name>/scripts/`
4. Add doc-engine templates in `skills/<name>/assets/`
5. Update `README.md` skills table

### Modifying an Existing Skill

1. The `SKILL.md` is the single source of truth for agent behavior — changes here affect how all agents using this skill behave
2. Scripts in `scripts/` are copied to and executed in **target repos** — test changes against a real target project
3. Template files in `assets/` are copied verbatim with variable substitution (`{{title}}`, `{{github}}`, etc.)

### Testing Scripts

There is no automated test suite. Test scripts manually:

```bash
# Test init script against a scratch repo
mkdir /tmp/test-repo && cd /tmp/test-repo && git init
node /path/to/skills/<name>/scripts/init-*.mjs --root . --title "Test"

# Test sidebar regeneration
node /path/to/skills/<name>/scripts/regenerate-sidebar.mjs --root .
```

### Installation (for consumers)

```bash
# Install a skill into a target project (Cursor)
npx skills add ryuever/agent-skills --skill codebase-wiki -a cursor -y

# Local dev checkout
npx skills add ./agent-skills --skill project-wiki -a cursor -y

# Update
npx skills update codebase-wiki -y
```

## Important Notes

- This repo has **no `package.json`**, no build step, no CI — it is purely a content + script repository
- Do **not** add npm dependencies to scripts; use only Node.js built-ins
- The `assets/` directories contain template files that use `INDEX.md` (uppercase) as the home page filename to avoid conflicts with default index behavior
- When editing `SKILL.md` files, remember they serve dual purpose: human documentation AND agent instruction set
- The three skills are independent and can be installed separately; they do not share code
