---
name: codebase-wiki
description: "将对话中的源码阅读与分析整理为规范化 Markdown，归档到项目 codebase-wiki/（architecture/discussion/reference/roadmap）、维护 INDEX 与 references 图；可选 VitePress 或 Mintlify 站点。适用于"保存到 wiki / 归档到 codebase-wiki / 生成学习笔记"等意图。"
---

# Codebase wiki（知识库目录）

把当前对话中的分析整理为**可长期维护**的文档，写入目标仓库根目录的 **`codebase-wiki/`**，并支持三种文档引擎：

- **VitePress**（`srcDir: ./codebase-wiki`）—— 默认选项
- **Mintlify**（内容目录 `codebase-wiki/`，配置文件 `codebase-wiki/docs.json`）
- **Starlight**（Astro 集成，内容目录 `src/content/docs/`，配置文件 `astro.config.mjs`）

详细书写规范见本 skill 包内 `references/CONVENTIONS.md`；初始化后的目标仓库内会复制一份到 `codebase-wiki/CONVENTIONS.md`。

## 首次接入（人类或 Agent 执行）

1. 用 [skills CLI](https://github.com/vercel-labs/skills) 安装本 skill（示例）：

   ```bash
   npx skills add <your-github>/agent-skills --skill codebase-wiki -a cursor -y
   ```

2. 根据所选引擎，在**目标仓库根目录**生成骨架（将 `<skill-dir>` 换成已安装的 `codebase-wiki` 目录，内含 `scripts/`）：

### 方案 A：VitePress（默认）

   ```bash
   node <skill-dir>/scripts/init-vitepress.mjs --root . --title "我的 Wiki"
   ```

   安装 VitePress 并本地预览：

   ```bash
   pnpm add -D vitepress
   pnpm run docs:wiki:dev
   ```

   **新增/重命名** Markdown 后，在仓库根执行：

   ```bash
   node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
   ```

   以重写 `.vitepress/sidebar.generated.mts`（导航与侧栏从各篇 frontmatter 的 `id`、`title` 生成）。

### 方案 B：Mintlify

   ```bash
   node <skill-dir>/scripts/init-mintlify.mjs --root . --title "我的 Wiki" --color "#0D9373"
   ```

   安装 Mintlify CLI 并本地预览：

   ```bash
   npm i -g mint
   cd codebase-wiki && mint dev
   ```

   **新增/重命名** Markdown 后，在仓库根执行：

   ```bash
   node <skill-dir>/scripts/regenerate-navigation.mjs --root .
   ```

   以重写 `codebase-wiki/docs.json` 中的 `navigation.groups`（从各篇 frontmatter 的 `id`、`title` 生成）。

### 方案 C：Starlight（Astro）

   ```bash
   node <skill-dir>/scripts/init-starlight.mjs --root . --title "我的 Wiki"
   ```

   安装依赖并本地预览：

   ```bash
   pnpm install
   pnpm run docs:wiki:dev
   ```

   **新增/重命名** Markdown 后，在仓库根执行：

   ```bash
   node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
   ```

   以重写 `.starlight/sidebar.generated.mjs`（侧栏从各篇 frontmatter 的 `id`、`title` 生成）。

   > Starlight 的内容目录为 `src/content/docs/`（Astro 内容集合规范），文档按 `architecture/`、`discussion/`、`reference/`、`roadmap/` 子目录组织。

## 何时使用

- 用户要求把讨论保存到 `codebase-wiki/`、生成学习笔记、搭建/更新源码 wiki
- 用户说「归档」「写到 wiki」「保存文档」等
- 对话基于外部 URL 展开且用户希望沉淀成文

## 工作流

### 第 0 步：识别外部来源链接

若用户粘贴了网页、Issue、PR、官方文档等 URL 并据此讨论，记录下来；生成文档时在 frontmatter 填写 `sources`，正文增加 `## 来源` 与链接列表。

### 第 1 步：判断分类

| 分类 | 目录 | 编号前缀 | 判断依据 |
|------|------|----------|----------|
| 架构分析 | `codebase-wiki/architecture/` | A-xxx | 模块职责、依赖、系统设计 |
| 技术讨论 | `codebase-wiki/discussion/` | D-xxx | 方案对比、概念辨析、深度笔记 |
| 参考手册 | `codebase-wiki/reference/` | R-xxx | API、索引、示例、速查 |
| 规划路线 | `codebase-wiki/roadmap/` | P-xxx | 计划、差距、优先级、待办 |

用户指定分类时服从用户；否则自动选择最合适的类。

### 第 2 步：确定编号

读取 `codebase-wiki/INDEX.md` 对应分类表格中的最大编号，分配下一个序号（如当前最大 A-003 → 新文 A-004）。

### 第 3 步：生成文档

遵循 `codebase-wiki/CONVENTIONS.md`（与本包 `references/CONVENTIONS.md` 一致）。

**文件命名**：`YYYYMMDD-` + 小写连字符 slug + `.md`，日期与 frontmatter `created` 一致；禁止大写、下划线、空格。

**Frontmatter**（必填项见 CONVENTIONS；常用字段）：

- `id`、`title`、`description`、`category`、`created`、`updated`、`tags`、`status`（新建默认 `draft`）
- 可选：`sources`（外部 URL 列表）、`references`（文档间关系）

**正文**：中文为主，术语保留英文；源码引用写 `path/to/file.ts:行号-行号`；代码块标明语言。

### 源码分析深度偏好

生成 `architecture` 或 `reference` 类文档时，除架构概述外，应包含以下源码级细节（按需取舍，不必全部包含）：

- **代码模式示例**：精选 2-3 个最典型的用法，附完整可运行代码块
- **导入参考**：列出扩展开发所需的 `import` 语句（类型导入与值导入分开）
- **行号引用**：关键实现标注 `file.ts:行号-行号`，便于跳转
- **Type Guard 用法**：如有判别联合，说明正确的窄化方式与常见陷阱

### 第 4 步：维护 references（双向）

为新文与被引用文同时更新 `references`，并更新被引用文的 `updated` 日期。`rel` 取值与反向关系见 `references/CONVENTIONS.md` 表格。

### 第 5 步：更新 INDEX

在 `codebase-wiki/INDEX.md` 对应分类表格中追加一行：编号、链接、标题、概述。

### 第 6 步：同步侧栏与导航

根据项目使用的文档引擎执行对应脚本：

- **VitePress**：在仓库根运行 `node <skill-dir>/scripts/regenerate-sidebar.mjs --root .`
  若目标项目未使用该脚本（旧式手工配置），再按 `references/CONVENTIONS.md` §7.2 手工编辑 `.vitepress/config.mts`。

- **Mintlify**：在仓库根运行 `node <skill-dir>/scripts/regenerate-navigation.mjs --root .`
  若目标项目未使用该脚本，手工编辑 `codebase-wiki/docs.json` 的 `navigation.groups`。

- **Starlight**：在仓库根运行 `node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .`
  若目标项目未使用该脚本，手工编辑 `astro.config.mjs` 中 `starlight()` 的 `sidebar` 配置。

### 第 7 步：向用户确认

报告：文件路径、编号、分类、标题、本次 references 变更、侧栏是否已重新生成。
