# Project Wiki 文档规范

约束仓库根目录下 **`project-wiki/`** 内由本 skill 生成的全景文档。

---

## 1. 目录与编号

| 目录 | 用途 | 编号 |
|------|------|------|
| `overview/` | 项目简介、仓库结构、技术栈 | `1`, `1.1`, `1.2` ... |
| `architecture/` | 系统分层、组件体系、路由 | `2`, `2.1`, `2.2` ... |
| `concepts/` | 术语、核心类型、配置约定 | `3`, `3.1` ... |
| `modules/` | 模块/包职责剖析 | `4`, `4.1`, `4.2` ... |
| `dataflow/` | 数据流、状态管理、API 层 | `5`, `5.1`, `5.2` ... |
| `operations/` | 构建、测试、部署 | `6`, `6.1` ... |

---

## 2. 文件命名

格式：`{section}-{slug}.md`

- `section` 使用 `doc_plan.json` 中的编号（点号替换为点号本身）
- `slug` 使用小写连字符，来自 `doc_plan.json` 的 slug 最后一段
- 禁止大写、下划线、空格

示例：
- `overview/1-introduction.md`
- `overview/1.1-monorepo-layout.md`
- `architecture/2-system-architecture.md`
- `architecture/2.1-component-system.md`
- `modules/4.1-apps-web.md`

---

## 3. Frontmatter（必填）

```yaml
---
section: "2.1"
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

1. 第一行用 **`相关源文件`** fenced text 块列出证据路径（对标 DeepWiki "Relevant source files"）
2. **图先文后** — 每个核心概念先 Mermaid 图或表格，再文字解释
3. **表格优于段落** — 配置、API 清单、对比等用表格
4. 所有重要结论绑定到**具体文件路径**（带行号：`file.ts:12-40`）
5. Mermaid 节点 ID 使用字母数字，标签简短
6. TypeScript 泛型放 fenced code block 内，避免裸 `<>` 破坏渲染

---

## 5. `.meta/` 目录

由 `analyze-repo.mjs` 生成。包含：
- `repo.json` — 包信息、技术栈信号
- `structure.json` — 目录结构、文件统计
- `entrypoints.json` — 入口、路由、状态、网络层、组件检测
- `imports.json` — import 图谱
- `doc_plan.json` — 层级编号的页面计划

Agent 撰写前应读取 `doc_plan.json`，写完后更新 `quality-report.md` 中的已覆盖说明。
