# codebase-wiki scripts

本目录包含 codebase-wiki skill 的初始化与导航生成脚本，支持 **VitePress**、**Mintlify** 和 **Starlight**（Astro）三种文档引擎。

---

## 脚本一览

| 脚本 | 引擎 | 用途 |
|------|------|------|
| `init-vitepress.mjs` | VitePress | 初始化 `codebase-wiki/` + `.vitepress/` 骨架 |
| `regenerate-sidebar.mjs` | VitePress | 重建 `.vitepress/sidebar.generated.mts` |
| `init-mintlify.mjs` | Mintlify | 初始化 `codebase-wiki/` + `docs.json` 骨架 |
| `regenerate-navigation.mjs` | Mintlify | 重建 `codebase-wiki/docs.json` 中的 `navigation.groups` |
| `init-starlight.mjs` | Starlight | 初始化 `src/content/docs/` + `astro.config.mjs` 骨架 |
| `regenerate-starlight-sidebar.mjs` | Starlight | 重建 `.starlight/sidebar.generated.mjs` |

---

## VitePress

### 初始化

```bash
node <skill-dir>/scripts/init-vitepress.mjs --root . --title "我的 Wiki"
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--root <dir>` | 目标仓库根目录 | `cwd` |
| `--skill-dir <dir>` | codebase-wiki skill 目录 | 脚本上级目录 |
| `--title <string>` | Wiki 标题 | `Codebase Wiki` |
| `--github <url>` | GitHub 仓库 URL（用于主题社交链接） | 空 |
| `--force` | 覆盖已有文件 | `false` |

### 安装与预览

```bash
pnpm add -D vitepress
pnpm run docs:wiki:dev
```

### 文档变更后重建侧栏

```bash
node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
```

---

## Mintlify

### 初始化

```bash
node <skill-dir>/scripts/init-mintlify.mjs --root . --title "我的 Wiki" --color "#0D9373"
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--root <dir>` | 目标仓库根目录 | `cwd` |
| `--skill-dir <dir>` | codebase-wiki skill 目录 | 脚本上级目录 |
| `--title <string>` | Wiki 标题 | `Codebase Wiki` |
| `--color <hex>` | 主题主色调 | `#0D9373` |
| `--force` | 覆盖已有文件 | `false` |

### 安装与预览

```bash
npm i -g mint
cd codebase-wiki && mint dev
```

### 文档变更后重建导航

```bash
node <skill-dir>/scripts/regenerate-navigation.mjs --root .
```

---

## Starlight（Astro）

### 初始化

```bash
node <skill-dir>/scripts/init-starlight.mjs --root . --title "我的 Wiki"
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--root <dir>` | 目标仓库根目录 | `cwd` |
| `--skill-dir <dir>` | codebase-wiki skill 目录 | 脚本上级目录 |
| `--title <string>` | Wiki 标题 | `Codebase Wiki` |
| `--github <url>` | GitHub 仓库 URL（用于社交链接） | 空 |
| `--force` | 覆盖已有文件 | `false` |

### 安装与预览

```bash
pnpm install
pnpm run docs:wiki:dev
```

### 文档变更后重建侧栏

```bash
node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
```

### 注意事项

- Starlight 使用 Astro 内容集合，内容目录为 `src/content/docs/`（而非 `codebase-wiki/`）
- 文档按 `architecture/`、`discussion/`、`reference/`、`roadmap/` 子目录组织
- 侧栏配置生成到 `.starlight/sidebar.generated.mjs`，由 `astro.config.mjs` 导入
- 支持 `.md` 和 `.mdx` 格式
