---
name: project-wiki
description: "为仓库生成 DeepWiki 风格的项目全景文档：先运行 Node 分析脚本产出结构化元数据（import 图谱、路由/状态检测、文件统计），再按层级编号撰写架构、概念、模块、数据流等页面；支持 VitePress（默认）、Mintlify、Starlight 三套文档引擎。适用于「project wiki / deep wiki / 全景文档 / 新人 onboarding」等意图。"
---

# Project Wiki（DeepWiki 风格项目全景）

本 skill 把**代码当作唯一事实来源**，在仓库根目录生成 **`project-wiki/`**：包含**分析元数据**（`.meta/*.json`）、**扫描报告**（`quality-report.md`）以及 Agent 根据 `doc_plan.json` 撰写的**全景 Markdown**——按编号分层（`1-Introduction > 1.1-Core Packages > 1.2-Vue3 vs Vue2`），对标 [DeepWiki](https://deepwiki.com/) 的阅读体验。

支持 **三套文档引擎**，均可独立或同时启用：

| 引擎 | 目录 | 特点 |
|------|------|------|
| **VitePress**（默认） | `project-wiki/.vitepress/` | Vue 生态、Mermaid 内建、本地搜索 |
| **Mintlify** | `project-wiki/docs.json` | 嵌套 navigation groups、`mermaid` 配置、托管部署简单 |
| **Starlight** | `project-wiki/starlight/` | Astro 驱动、`{ label, items }` 嵌套侧栏、多框架组件 |

灵感来源：[codewiki-generator](https://skills.sh/samzong/samzong/codewiki-generator)（分析脚本 + `doc_plan` + 证据链写作）与 [DeepWiki](https://deepwiki.com/)（自上而下全景阅读）。

## 与 codebase-wiki 的分工

| | codebase-wiki | project-wiki |
|---|----------------|---------------|
| 节奏 | 对话中边学边记 | 一次性「扫仓库 → 出全景」 |
| 内容 | 任意主题笔记 | 层级化全景文档（编号目录树） |
| 驱动 | 用户输入驱动 | `.meta/*.json` 元数据驱动 |
| 适合 | 长期增量笔记 | onboarding、系统设计叙事 |

两者可同时安装，互不冲突。

## 首次接入

1. 安装 skill：

   ```bash
   npx skills add <your-github>/agent-skills --skill project-wiki -a cursor -y
   ```

2. 初始化骨架（`<skill-dir>` 为 skill 目录）：

   ```bash
   # 仅 VitePress（默认）
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki"

   # 同时启用 Mintlify
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack mintlify

   # 同时启用 Starlight
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack starlight

   # 三套全开
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack all
   ```

   常用参数：`--github <url>`（社交链接）、`--force`（覆盖已有文件）、`--stack <list>`（逗号分隔或 `all`）。

3. 安装依赖并预览：

   ```bash
   # VitePress（默认）
   pnpm add -D vitepress
   pnpm run docs:project-wiki:dev

   # Mintlify（需 --stack mintlify 或 all）
   pnpm add -D mintlify
   pnpm run docs:project-wiki:mintlify:dev

   # Starlight（需 --stack starlight 或 all）
   cd project-wiki/starlight && npm install && cd ../..
   pnpm run docs:project-wiki:starlight:dev
   ```

4. 新增或重命名 `.md` 后：

   ```bash
   node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
   ```

   该脚本会**同时更新**所有已初始化的引擎侧栏（VitePress `.vitepress/sidebar.generated.mts`、Mintlify `docs.json`、Starlight `.starlight/sidebar.generated.mjs`）。

## 核心工作流（Agent）

### 0) 语言 & 站点初始化

- 询问用户：「文档正文使用哪种语言？」未指定则**默认中文**
- 若 `project-wiki/` 目录不存在，先运行 `init-project-wiki.mjs`

### 1) 运行分析脚本（必做）

```bash
node <skill-dir>/scripts/analyze-repo.mjs --root . --out-dir project-wiki
```

产出 `project-wiki/.meta/` 下：
- `repo.json` — 包信息、技术栈信号、scripts
- `structure.json` — 目录结构、配置文件、**文件统计**（源码/测试/样式/总量）、最大文件
- `entrypoints.json` — 入口文件、workspace 包、**路由检测**、**状态管理检测**、**网络层检测**、**组件体系检测**
- `imports.json` — **import 图谱**（Hub 文件、Heavy importers、高频外部依赖）
- `doc_plan.json` — **层级编号**的页面计划（`section: "1.1"`, `slug`, `required`, `evidence`, `hints`）

### 2) 代码优先 & 阅读 references

扫描源码、构建配置、入口、路由、状态管理、API 层；`README` / `docs/` 仅作线索，**以代码为准**。

写前必读：
- `references/doc-templates.md` — DeepWiki 风格的页面模板
- `references/structure-and-heuristics.md` — 页面集合启发式规则
- `references/FRONTEND-FOCUS.md` — 前端专项阅读清单

### 3) 按 doc_plan 逐页撰写

遵循 `doc_plan.json` 中的 `section` 编号顺序：

1. **文件命名**：`{section}-{slug最后一段}.md`（如 `1-introduction.md`、`1.1-monorepo-layout.md`）
2. **放置目录**：按 `category` 放入对应子目录（`overview/`、`architecture/`、`modules/`、`dataflow/`、`operations/`）
3. **无证据支撑**的页面（`evidence` 为空且 `required: false`）**可跳过**，在 `quality-report.md` 说明

### 4) 写作质量条（DeepWiki 标准）

每个页面开头必须有 **Relevant source files** 区块：

````markdown
```text
相关源文件：
- src/main.tsx
- src/router/index.ts
- src/store/user.ts
```
````

然后：
- **Visual first** — 用 Mermaid（flowchart / sequence / C4 简化）表达主流程
- **表格优先** — 配置、API、对比等用表格而非长段落
- **Linked** — 关键论断绑定到 `path/to/file.ts:12-40`（可点击跳转源码）
- **Opinionated** — 写明设计取舍、技术债与风险（基于代码，非臆测）
- **层级递进** — 从顶层概述到子系统细节，章节编号与 `doc_plan.section` 一致
- **Mermaid 安全** — 节点 ID 简单；标签避免 `/`、`:`、括号

### 5) 刷新导航

```bash
node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
```

脚本会自动检测已初始化的引擎并更新对应侧栏：
- **VitePress** → `project-wiki/.vitepress/sidebar.generated.mts`（全局 `"/"` key，层级编号分组）
- **Mintlify** → `project-wiki/docs.json`（嵌套 `{ group, pages }` 结构）
- **Starlight** → `project-wiki/starlight/.starlight/sidebar.generated.mjs`（`{ label, items }` 嵌套）

### 6) 交付说明

向用户报告：
- 已生成的文件列表（含编号）
- `doc_plan` 中跳过的页面及原因
- 预览命令（按已启用的引擎列出）：
  - VitePress: `pnpm run docs:project-wiki:dev`
  - Mintlify: `pnpm run docs:project-wiki:mintlify:dev`
  - Starlight: `pnpm run docs:project-wiki:starlight:dev`

## 目录约定（`project-wiki/`）

| 子目录 | 用途 | 编号前缀 |
|--------|------|----------|
| `overview/` | 项目简介、仓库结构、技术栈总览 | `1.x` |
| `architecture/` | 系统分层、组件体系、路由设计 | `2.x` |
| `concepts/` | 核心概念与术语表 | `3.x` |
| `modules/` | 核心模块/包职责剖析 | `4.x` |
| `dataflow/` | 数据流、状态管理、API 层 | `5.x` |
| `operations/` | 构建、测试、部署 | `6.x` |
| `.meta/` | 机器生成 JSON，不手写 | — |

文件命名示例：
- `overview/1-introduction.md`
- `overview/1.1-monorepo-layout.md`
- `architecture/2-system-architecture.md`
- `architecture/2.1-component-system.md`
- `modules/4-core-modules.md`
- `modules/4.1-apps-web.md`

## 何时使用

- 用户要 **DeepWiki / project wiki / 项目地图 / 架构总览 / 新人文档**
- 用户是 **前端**，希望快速理解 **路由、状态、数据请求、组件体系**
- 需要 **可浏览的静态站点** + **可重复运行的分析步骤**

## 资源索引

| 路径 | 说明 |
|------|------|
| `scripts/analyze-repo.mjs` | 深度扫描仓库 → `.meta/*.json`（含 import 图谱、路由/状态检测） |
| `scripts/init-project-wiki.mjs` | 目录骨架 + 三套引擎配置 + `package.json` 脚本（`--stack` 参数） |
| `scripts/regenerate-sidebar.mjs` | 三套引擎侧栏更新（VitePress / Mintlify / Starlight，均支持编号层级） |
| `references/doc-templates.md` | DeepWiki 风格页面模板 |
| `references/structure-and-heuristics.md` | 页面集合与启发式规则 |
| `references/FRONTEND-FOCUS.md` | 前端阅读清单 |
| `references/CONVENTIONS.md` | 文件命名与 frontmatter 规范 |
| `assets/vitepress/` | VitePress 模板（`.vitepress/config.mts`、`INDEX.md`、`sidebar.generated.mts`） |
| `assets/mintlify/` | Mintlify 模板（`docs.json`、`INDEX.mdx`、`run-mintlify.mjs`、`favicon.svg`） |
| `assets/starlight/` | Starlight 模板（`astro.config.mjs`、`package.json`、`sidebar.generated.mjs`） |
