---
name: project-wiki
description: "为仓库生成 DeepWiki 风格的项目全景文档：先运行 Node 分析脚本产出结构化元数据（import 图谱、路由/状态检测、文件统计），再按层级编号撰写架构、概念、模块、数据流等页面；支持 VitePress（默认）、Mintlify、Starlight、Fumadocs 四套文档栈（Fumadocs 为内容目录镜像模式）。适用于「project wiki / deep wiki / 全景文档 / 新人 onboarding」等意图。"
---

# Project Wiki（DeepWiki 风格项目全景）

本 skill 把**代码当作唯一事实来源**，在仓库根目录生成 **`project-wiki/`**：包含**分析元数据**（`.meta/*.json`）、**扫描报告**（`quality-report.md`）以及 Agent 根据 `doc_plan.json` 撰写的**全景 Markdown**——按编号分层（`1-Introduction > 1.1-Core Packages > 1.2-Vue3 vs Vue2`），对标 [DeepWiki](https://deepwiki.com/) 的阅读体验。

支持 **四套文档栈**，均可独立或同时启用：

| 引擎 | 目录 | 特点 |
|------|------|------|
| **VitePress**（默认） | `project-wiki/.vitepress/` | Vue 生态、Mermaid 内建、本地搜索 |
| **Mintlify** | `project-wiki/docs.json` | 嵌套 navigation groups、`mermaid` 配置、托管部署简单 |
| **Starlight** | `project-wiki/starlight/` | Astro 驱动、`{ label, items }` 嵌套侧栏、多框架组件 |
| **Fumadocs** | `content/docs/project-wiki/`（可配） | 内容目录镜像模式，保留项目自定义 source/loader 自由度 |

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

   # 启用 Fumadocs（内容目录镜像）
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack fumadocs

   # 自定义 Fumadocs 内容目录
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack fumadocs --content-dir content/docs/project-wiki

   # 四套全开
   node <skill-dir>/scripts/init-project-wiki.mjs --root . --title "Project Wiki" --stack all
   ```

   常用参数：`--github <url>`（社交链接）、`--force`（覆盖已有文件）、`--stack <list>`（逗号分隔或 `all`）、`--content-dir <dir>`（Fumadocs 内容目录）。

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

   # Fumadocs（需 --stack fumadocs 或 all）
   pnpm add -D remark-mermaidjs
   # 将 Fumadocs source/loader 指向 content/docs/project-wiki（或直接读取 project-wiki/）
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
- `complexity.json` — **代码复杂度**（热点文件、超长函数、嵌套深度、复杂度分数）
- `types.json` — **类型系统**（核心 interface/type、类型文件、枚举）
- `violations.json` — **架构违规**（循环依赖、层级违规、God 文件、孤立文件）
- `api-surface.json` — **API Surface**（导出函数/Hooks/组件/类、Barrel 文件）
- `dep-health.json` — **依赖健康度**（重量级依赖、版本冲突、锁文件）
- `test-coverage.json` — **测试覆盖**（源码-测试映射、未覆盖文件、测试框架）
- `git-activity.json` — **Git 活跃度**（热文件、贡献者、提交频率、仓库年龄）
- `execution-flows.json` — **执行流**（GitNexus 流程数据，如有索引）
- `doc_plan.json` — **层级编号**的页面计划（Section 1-9，`section`, `slug`, `required`, `evidence`, `hints`）

### 2) 代码优先 & 阅读 references

扫描源码、构建配置、入口、路由、状态管理、API 层；`README` / `docs/` 仅作线索，**以代码为准**。

写前必读：
- `references/doc-templates.md` — DeepWiki 风格的页面模板（含大型库专用模板）
- `references/structure-and-heuristics.md` — 页面集合启发式规则（含子系统分类策略）
- `references/FRONTEND-FOCUS.md` — 前端专项阅读清单

**大型库/框架**（> 500 源码文件）应参考 `structure-and-heuristics.md` §2.4 "按子系统组织" 和 §4 "大型库/框架" 适配规则，使用子系统分类代替通用分类。

### 3) 按 doc_plan 逐页撰写

遵循 `doc_plan.json` 中的 `section` 编号顺序：

1. **文件命名**：`{section}-{slug最后一段}.md`（如 `1-introduction.md`、`1.1-monorepo-layout.md`）
2. **放置目录**：按 `category` 放入对应子目录（见下方「目录约定」表格）
3. **无证据支撑**的页面（`evidence` 为空且 `required: false`）**可跳过**，在 `quality-report.md` 说明
4. **父页面先行** — 每个 Section 先写父页面（概览 + 关系图 + 子页面导航表），再写子页面
5. **交叉引用** — 每个页面应包含 2-3 个指向相关页面的 `详见 [X](...)` 链接

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
- **表格优先** — 配置、API、对比等用表格而非长段落；概念对比必须使用 **Comparison Matrix**
- **Linked** — 关键论断绑定到 `path/to/file.ts:12-40`（可点击跳转源码）
- **Sources** — 每个 `##` 小节末尾附 `**Sources:** file:line-line, ...` 精确引用
- **Cross-ref** — 页面间使用 `详见 [页面名](相对路径)` 建立导航网络
- **Component Map** — 子系统父页面用 File | Responsibility 表格（大型库适用）
- **Method 速查** — 核心类方法用 Method | Purpose | Location 表格展示
- **参数分组** — 配置项 > 15 个时按功能分组表格
- **Opinionated** — 写明设计取舍、技术债与风险（基于代码，非臆测）
- **层级递进** — 从顶层概述到子系统细节，章节编号与 `doc_plan.section` 一致
- **Mermaid 安全** — 节点 ID 简单；标签避免 `/`、`:`、括号

### 5) 刷新导航

> **必做检查**：只要本次工作流中发生了文档的**新增、删除或重命名**，就**必须**在结束前执行下方 sidebar 脚本。如果跳过此步骤，侧栏导航将与实际文档不同步，用户在站点中无法找到新文档或仍能看到已删除的文档入口。

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
  - Fumadocs: 使用项目自身 dev 命令（并确保 source 指向 `content/docs/project-wiki` 或 `project-wiki/`）

## 目录约定（`project-wiki/`）

完整的 13-Section 分类体系（对标 [DeepWiki](https://deepwiki.com/) 的认知递进设计）：

| 子目录 | 用途 | 编号前缀 | 认知层 |
|--------|------|----------|--------|
| `overview/` | 项目简介、仓库结构、技术栈总览 | `1.x` | 入门层 |
| `getting-started/` | 安装、快速上手、仓库结构速查 | `2.x` | 入门层 |
| `concepts/` | 核心概念关系、对比矩阵、术语 | `3.x` | 概念层 |
| `configuration/` | 配置层次、权限、环境变量 | `4.x` | 概念层 |
| `architecture/` | 系统分层、组件体系、路由、架构模式 | `5.x` | 深入层 |
| `extensions/` | 扩展机制、Hooks、插件、中间件 | `6.x` | 深入层 |
| `modules/` | 核心模块/包职责剖析 | `7.x` | 深入层 |
| `dataflow/` | 数据流、状态管理、API 层 | `8.x` | 深入层 |
| `workflows/` | 构建、测试、CI/CD、开发工作流 | `9.x` | 实战层 |
| `best-practices/` | 最佳实践、代码质量、架构违规 | `10.x` | 实战层 |
| `reference/` | API 速查、配置项速查、Hooks 速查 | `11.x` | 速查层 |
| `glossary/` | 术语表 | `12` | 速查层 |
| `health/` | 项目健康仪表盘、依赖/测试/Git/执行流 | `13.x` | 实战层 |
| `.meta/` | 机器生成 JSON（13 个文件），不手写 | — | — |

文件命名示例：
- `overview/1-introduction.md`
- `getting-started/2-quick-start.md`
- `concepts/3-core-concepts.md`
- `concepts/3.1-commands.md`
- `configuration/4-configuration-system.md`
- `architecture/5-system-architecture.md`
- `architecture/5.1-component-system.md`
- `extensions/6-extension-mechanisms.md`
- `modules/7-core-modules.md`
- `modules/7.1-apps-web.md`
- `reference/11-reference.md`
- `glossary/12-glossary.md`

## 何时使用

- 用户要 **DeepWiki / project wiki / 项目地图 / 架构总览 / 新人文档**
- 用户是 **前端**，希望快速理解 **路由、状态、数据请求、组件体系**
- 需要 **可浏览的静态站点** + **可重复运行的分析步骤**

## 资源索引

| 路径 | 说明 |
|------|------|
| `scripts/analyze-repo.mjs` | 深度扫描仓库 → `.meta/*.json`（含 import 图谱、路由/状态检测） |
| `scripts/init-project-wiki.mjs` | 目录骨架 + 四套文档栈初始化（VitePress / Mintlify / Starlight / Fumadocs 内容镜像）+ `package.json` 合并（`--stack` 参数） |
| `scripts/regenerate-sidebar.mjs` | 三套引擎侧栏更新（VitePress / Mintlify / Starlight，均支持编号层级；Fumadocs 依赖项目自身导航机制） |
| `references/doc-templates.md` | DeepWiki 风格页面模板 |
| `references/structure-and-heuristics.md` | 页面集合与启发式规则 |
| `references/FRONTEND-FOCUS.md` | 前端阅读清单 |
| `references/CONVENTIONS.md` | 文件命名与 frontmatter 规范 |
| `assets/vitepress/` | VitePress 模板（`.vitepress/config.mts`、`INDEX.md`、`sidebar.generated.mts`） |
| `assets/mintlify/` | Mintlify 模板（`docs.json`、`INDEX.mdx`、`run-mintlify.mjs`、`favicon.svg`） |
| `assets/starlight/` | Starlight 模板（`astro.config.mjs`、`package.json`、`sidebar.generated.mjs`） |
