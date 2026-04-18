# Project wiki 文档规范

约束仓库根目录下 **`project-wiki/`** 内由本 skill 生成的全景文档（与 `codebase-wiki/` 笔记库分离）。

---

## 1. 分类与编号前缀

| 分类 | 目录 | `id` 前缀 | 用途 |
|------|------|-----------|------|
| 项目地图 | `overview/` | `O-xxx` | 仓库结构、技术栈、阅读顺序 |
| 架构设计 | `architecture/` | `A-xxx` | 分层、边界、关键设计决策 |
| 核心概念 | `concepts/` | `G-xxx` | 术语、领域模型、配置约定 |
| 核心模块 | `modules/` | `M-xxx` | 目录/包职责、依赖关系 |
| 数据流 | `dataflow/` | `F-xxx` | 请求、状态、事件、SSR/CSR 数据路径 |
| 工程运维 | `operations/` | `P-xxx` | 构建、测试、环境变量、发布 |

---

## 2. 文件命名

与 codebase-wiki 对齐：`YYYYMMDD-` + 小写连字符 slug + `.md`；`created` / `updated` 与日期一致；禁止大写与下划线。

---

## 3. Frontmatter（必填）

```yaml
---
id: A-001
title: 系统分层与边界
description: 基于代码入口与目录结构说明各层职责。
category: architecture
created: 2026-04-18
updated: 2026-04-18
tags: [architecture, layers]
status: draft
evidence:
  - src/main.ts
  - vite.config.ts
---
```

| 字段 | 说明 |
|------|------|
| `evidence` | 推荐填写：支撑本文论断的**仓库内相对路径**（来自 `.meta` 或人工补充） |
| `status` | 初次生成多为 `draft`，经人工校验后可改为 `final` |

可选：`sources`（外部文章）、`references`（wiki 内交叉引用）。

---

## 4. 正文习惯

1. 开篇用 **「相关代码」** ` ```text ` 块列出主要证据路径（非 `#` 标题）。
2. 架构与数据流优先使用 **Mermaid**；节点 ID 使用字母数字，标签保持简短。
3. 所有重要结论应能指回 **具体文件路径**（必要时带行号，格式 `path/file.ts:12-40`）。

---

## 5. `.meta/` 目录

由 `analyze-repo.mjs` 生成，可提交也可 `.gitignore`（团队自行约定）。Agent 撰写前应读取 `doc_plan.json`，写完后可酌情更新 `quality-report.md` 中的「已覆盖」说明。
