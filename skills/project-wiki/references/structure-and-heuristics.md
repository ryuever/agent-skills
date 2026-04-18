# 页面集合与启发式规则

本文指导 Agent **如何根据 `project-wiki/.meta/doc_plan.json` 决定写哪些页面**，以及在仓库过大或过小时如何合并或拆分。

---

## 1. 必读输入

1. `doc_plan.json` — 每页的 `slug`、`title`、`category`、`required`、`evidence`
2. `repo.json` — 技术栈信号（如 `react`, `vue`, `next`, `monorepo`）
3. `structure.json` — 顶层目录与配置文件是否存在
4. `entrypoints.json` — 入口文件列表

若 `evidence` 为空且 `required: false`，**跳过该页**并在 `quality-report.md` 末尾追加一行说明。

---

## 2. 默认页面语义

| slug | 目的 | 无证据时的行为 |
|------|------|----------------|
| `overview/repo-map` | 新人第一张图：从入口到主要包 | 仍写极简版，基于 `structure.json` |
| `architecture/system-architecture` | 分层、模块边界、依赖方向 | 有目录结构即可写；缺入口则降置信度 |
| `concepts/glossary` | 术语与核心类型/常量 | 可选；无类型导出信号可跳过 |
| `modules/core-modules` | 按目录或 package 剖析职责 | Monorepo 可拆成多文（见 §3） |
| `dataflow/request-and-state` | 数据如何进出 UI | 无状态管理库且无 `fetch/axios` 线索可弱化为一节 |
| `operations/build-and-test` | scripts、CI、环境变量 | 无 `package.json` scripts 则跳过 |

`doc_plan.json` 由脚本生成；Agent **可追加**新页（如新子应用），并遵守 `CONVENTIONS.md` 的 `id` 与路径规则。

---

## 3. Monorepo 与巨型仓库

- **多个 `package.json`**（workspace）：`modules/` 下可按 **包名** 拆文（`M-010` `apps/web` 等），并增加一篇 `overview/monorepo-layout`（`O-002`）。
- **单包但 `src` 极大**：`modules/` 只覆盖 **顶层子目录** + README 中强调的域；其余放入「待读清单」表格，避免一次生成上百页。
- **微前端 / 多入口**：`dataflow/` 用多张 sequence 图，每张图对应一个 **用户旅程**（如登录、结账），不要混在一张图里。

---

## 4. 置信度与诚实性

- 在文首或文末增加 **「待验证」** 小节：列出需要运行时确认或缺少读权限的路径。
- 文档与 `README` 冲突时，**以代码为准**并点名冲突点。
- 不要虚构目录名；路径必须来自扫描结果或用户确认。

---

## 5. 与 codewiki-generator 的差异

本 skill **不**内置 Python；分析由 `analyze-repo.mjs`（Node）完成，规则更简单、可 fork 扩展。若团队已有自定义扫描器，可替换 `.meta` 生成步骤，只要保留 `doc_plan.json` 的 **数组结构**（`slug`, `title`, `category`, `required`, `evidence`）即可与模板兼容。
