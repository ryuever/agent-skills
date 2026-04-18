---
name: project-wiki
description: "为仓库生成 DeepWiki 风格的项目全景文档：先运行 Node 分析脚本产出 project-wiki/.meta 结构化元数据与 doc_plan，再按模板撰写架构、概念、模块、数据流等页面；可选嵌套 VitePress（project-wiki/.vitepress）。适用于「项目 wiki / deep wiki / 全景文档 / 新人 onboarding 地图」等意图。"
---

# Project wiki（DeepWiki 风格项目全景）

本 skill 把**代码当作唯一事实来源**，在仓库根目录生成 **`project-wiki/`**：默认包含 **分析元数据**（`project-wiki/.meta/*.json`）、**质量说明**（`project-wiki/quality-report.md`），以及由 Agent 根据 `doc_plan.json` 撰写的 **全景 Markdown**（架构、概念、模块、数据流等）。可选 **VitePress** 站点，配置位于 `project-wiki/.vitepress/`（与 `codebase-wiki` 的根级 `.vitepress` 不冲突，适合同一仓库并存）。

灵感来源：[codewiki-generator](https://skills.sh/samzong/samzong/codewiki-generator)（分析脚本 + `doc_plan` + 证据链写作）与 [DeepWiki](https://deepwiki.com/)（自上而下读项目的体验）。本实现使用 **纯 Node**，无需 Python，便于前端仓库直接使用。

## 与 codebase-wiki 的分工

| | codebase-wiki | project-wiki |
|---|----------------|---------------|
| 节奏 | 对话中边学边记 | 一次性或周期性「扫仓库 → 出地图」 |
| 内容 | 任意主题的笔记 | 预设全景模块（架构 / 概念 / 模块 / 数据流等） |
| 元数据 | 以 INDEX + references 为主 | `.meta/*.json` + `doc_plan.json` 驱动页面集合 |

两者可同时安装；`project-wiki` 侧重 **onboarding 与系统设计叙事**，`codebase-wiki` 侧重 **长期增量笔记**。

## 首次接入（人类或 Agent）

1. 安装 skill（示例）：

   ```bash
   npx skills add <your-github>/agent-skills --skill project-wiki -a cursor -y
   ```

2. 在**目标仓库根目录**初始化 VitePress 骨架（将 `<skill-dir>` 换为 skill 目录）：

   ```bash
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki"
   ```

3. 安装 VitePress 并预览：

   ```bash
   pnpm add -D vitepress
   pnpm run docs:project-wiki:dev
   ```

4. **新增或重命名** `project-wiki/` 下各子目录的 `.md` 后，在仓库根执行：

   ```bash
   node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
   ```

## 核心工作流（Agent）

### 0) 文档语言

询问用户：「文档正文使用哪种语言？（如 English / 中文）」若未指定，**默认中文**（本仓库用户多为中文语境；英文项目可显式选 English）。

### 1) 代码优先

扫描源码、构建配置、入口、路由、状态管理、API 层等；`README` / `docs/` 仅作线索，**以代码为准**，并在文中标注文档与代码不一致之处。

### 2) 运行分析脚本（必做）

在**目标仓库根目录**执行（`<skill-dir>` 为含 `scripts/` 的 skill 路径）：

```bash
node <skill-dir>/scripts/analyze-repo.mjs --root . --out-dir project-wiki
```

产出：

- `project-wiki/.meta/repo.json` — 包名、脚本摘要、依赖信号（React/Vue/Next 等）
- `project-wiki/.meta/structure.json` — 顶层目录与关键配置文件路径
- `project-wiki/.meta/entrypoints.json` — 推断的入口文件列表
- `project-wiki/.meta/doc_plan.json` — 建议页面列表（含 `slug`、`required`、证据路径）
- `project-wiki/quality-report.md` — 扫描覆盖说明与后续人工补强建议

### 3) 阅读 `references/` 后撰写

- `references/structure-and-heuristics.md` — 何时合并/拆分页面、如何根据证据取舍
- `references/doc-templates.md` — 各页面类型的固定章节与 Mermaid 建议
- `references/FRONTEND-FOCUS.md` — **前端专项**：路由、状态、请求层、构建工具、Monorepo 应用边界

按 `doc_plan.json` 逐页编写；**无证据支撑的页面可跳过**，并在 `quality-report.md` 或页内「待验证」小节说明。

### 4) 写作质量条（与 codewiki-generator 对齐）

- **Visual first**：用 Mermaid（flowchart / sequence / 简化 C4）表达主流程与数据流
- **Linked**：关键论断绑定到 `path/to/file.ts` 或 frontmatter `evidence`
- **Opinionated**：写明设计取舍、技术债与风险（基于代码，非臆测）
- **Mermaid 安全**：节点 ID 简单；标签避免 `/`、`:`、括号滥用（见模板说明）

每篇正文建议以「相关代码」开头（可用 ` ```text ` 代码块列出证据路径，非一级标题），再展开叙述。

### 5) 刷新侧栏

撰写或移动 Markdown 后：

```bash
node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
```

### 6) 交付说明

向用户报告：已生成/更新的文件、`doc_plan` 中跳过的页、如何运行 `docs:project-wiki:dev`。

## 目录约定（`project-wiki/`）

| 子目录 | 用途 |
|--------|------|
| `overview/` | 项目地图、仓库结构、技术栈摘要 |
| `architecture/` | 分层、边界、关键设计决策 |
| `concepts/` | 核心概念与术语表 |
| `modules/` | 重要目录/包/子应用职责 |
| `dataflow/` | 请求/状态/事件/渲染数据流 |
| `operations/` | 构建、测试、环境变量、发布（有证据才写） |
| `.meta/` | 仅机器生成 JSON，一般不手写 |

页面 `id` 前缀：`O` overview、`A` architecture、`G` concepts、`M` modules、`F` dataflow、`P` operations（与 `regenerate-sidebar` 分组一致）。

## 何时使用

- 用户要 **DeepWiki / project wiki / 项目地图 / 架构总览 / 新人文档**
- 用户是 **前端**，希望快速理解 **路由、状态、数据请求、Monorepo 边界**
- 需要 **可浏览的静态站点** + **可重复运行的分析步骤**

## 资源索引

| 路径 | 说明 |
|------|------|
| `scripts/analyze-repo.mjs` | 扫描仓库 → `.meta` + `quality-report.md` |
| `scripts/init-project-wiki.mjs` | 嵌套 VitePress + 目录骨架 + `package.json` 脚本 |
| `scripts/regenerate-sidebar.mjs` | 根据 frontmatter 生成 `sidebar.generated.mts` |
| `references/doc-templates.md` | 页面模板 |
| `references/structure-and-heuristics.md` | 页面集合与启发式规则 |
| `references/FRONTEND-FOCUS.md` | 前端阅读清单 |
| `references/CONVENTIONS.md` | frontmatter 与文件命名（可与 codebase-wiki 对照） |
