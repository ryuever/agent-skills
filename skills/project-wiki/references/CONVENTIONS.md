# Project Wiki 文档规范

约束仓库根目录下 **`project-wiki/`** 内由本 skill 生成的全景文档。对标 [DeepWiki](https://deepwiki.com/) 的页面结构与写作风格。

---

## 1. 目录与编号

完整的 13-Section 分类体系（小型项目可合并/跳过部分 Section；大型库/框架可改用子系统分类——详见 `structure-and-heuristics.md` §2.4）：

| 目录 | 用途 | 编号 |
|------|------|------|
| `overview/` | 项目简介、仓库结构、技术栈 | `1`, `1.1`, `1.2` ... |
| `getting-started/` | 安装、快速上手、仓库结构速查 | `2`, `2.1`, `2.2` ... |
| `concepts/` | 核心概念关系、对比矩阵、术语 | `3`, `3.1`, `3.2` ... |
| `configuration/` | 配置层次、权限、环境变量 | `4`, `4.1`, `4.2` ... |
| `architecture/` | 系统分层、组件体系、路由、架构模式 | `5`, `5.1`, `5.2` ... |
| `extensions/` | 扩展机制、Hooks、插件、中间件 | `6`, `6.1`, `6.2` ... |
| `modules/` | 模块/包职责剖析 | `7`, `7.1`, `7.2` ... |
| `dataflow/` | 数据流、状态管理、API 层 | `8`, `8.1`, `8.2` ... |
| `workflows/` | 构建、测试、CI/CD、开发工作流 | `9`, `9.1`, `9.2` ... |
| `best-practices/` | 最佳实践、代码质量、架构违规 | `10`, `10.1`, `10.2` ... |
| `reference/` | API 速查、配置项速查、Hooks 速查 | `11`, `11.1`, `11.2` ... |
| `glossary/` | 术语表 | `12` |
| `health/` | 项目健康仪表盘、依赖/测试/Git/执行流 | `13`, `13.1`, `13.2` ... |
| `.meta/` | 机器生成 JSON，不手写 | — |

---

## 2. 文件命名

格式：`{section}-{slug}.md`

- `section` 使用 `doc_plan.json` 中的编号（点号替换为点号本身）
- `slug` 使用小写连字符，来自 `doc_plan.json` 的 slug 最后一段
- 禁止大写、下划线、空格

示例：
- `overview/1-introduction.md`
- `overview/1.1-monorepo-layout.md`
- `getting-started/2-quick-start.md`
- `getting-started/2.2-repository-structure.md`
- `concepts/3-core-concepts.md`
- `concepts/3.1-commands.md`
- `configuration/4-configuration-system.md`
- `architecture/5-system-architecture.md`
- `architecture/5.1-component-system.md`
- `extensions/6-extension-mechanisms.md`
- `modules/7-core-modules.md`
- `modules/7.1-apps-web.md`
- `dataflow/8-request-and-state.md`
- `workflows/9-development-workflows.md`
- `best-practices/10-best-practices.md`
- `reference/11-reference.md`
- `glossary/12-glossary.md`
- `health/13-project-health.md`

---

## 3. Frontmatter（必填）

```yaml
---
section: "5.1"
title: 组件体系
description: React 组件分层、命名约定与复用模式。
category: architecture
evidence:
  - src/components/
  - src/ui/Button.tsx
---
```

| 字段 | 说明 |
|------|------|
| `section` | `doc_plan.json` 中的编号（字符串），用于侧栏排序 |
| `title` | 页面标题 |
| `description` | 一句话描述 |
| `category` | 分类目录名 |
| `evidence` | 支撑本文的仓库内相对路径 |

可选：`tags`、`status`（`draft` / `final`）。

---

## 4. 正文习惯

### 基础规则

1. 第一行用 **`相关源文件`** fenced text 块列出证据路径（对标 DeepWiki "Relevant source files"）
2. **图先文后** — 每个核心概念先 Mermaid 图或表格，再文字解释
3. **表格优于段落** — 配置、API 清单、对比等用表格
4. 所有重要结论绑定到**具体文件路径**（带行号：`file.ts:12-40`）
5. Mermaid 节点 ID 使用字母数字，标签简短
6. TypeScript 泛型放 fenced code block 内，避免裸 `<>` 破坏渲染

### DeepWiki 增强规则

7. **Sources 行号引用** — 每个 `##` 小节末尾附 `**Sources:** file:line-line, ...`
8. **交叉引用导航** — 使用 `详见 [页面名](相对路径)` 建立页面间链接网络
9. **上下文定位句** — 页面开头用 1-2 句话说明本页位置和相关页面
10. **Comparison Matrix** — 在概念对比场景中使用表格而非分散段落
11. **父页面模式** — Section 主页面包含：一句话概述 + 关系图 + 子页面导航表 + Key Concepts Summary
12. **Component Map** — 子系统父页面用 File | Responsibility 表格映射代码文件（大型库适用）
13. **Architecture Family Table** — 按类型族拆分子页面时，父页面用索引表格导航
14. **Method/Class 速查表** — 核心类的方法用 Method | Purpose | Location 表格展示
15. **参数分组表格** — 配置项/参数 > 15 个时按功能分组展示
16. **Code Entity Mapping** — Glossary 页面中用 Mermaid 图展示概念到代码实体的映射流程
17. **Technical Jargon Table** — 术语表末尾用 Term | Definition | Code Pointer 紧凑表格

---

## 5. `.meta/` 目录

由 `analyze-repo.mjs` 生成。包含：
- `repo.json` — 包信息、技术栈信号
- `structure.json` — 目录结构、文件统计
- `entrypoints.json` — 入口、路由、状态、网络层、组件检测
- `imports.json` — import 图谱
- `complexity.json` — 代码复杂度
- `types.json` — 类型系统
- `violations.json` — 架构违规
- `api-surface.json` — API Surface
- `dep-health.json` — 依赖健康度
- `test-coverage.json` — 测试覆盖
- `git-activity.json` — Git 活跃度
- `execution-flows.json` — 执行流
- `doc_plan.json` — 层级编号的页面计划

Agent 撰写前应读取 `doc_plan.json`，写完后更新 `quality-report.md` 中的已覆盖说明。
