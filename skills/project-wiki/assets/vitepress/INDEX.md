---
layout: home

hero:
  name: "__WIKI_TITLE__"
  text: "DeepWiki 风格项目全景"
  tagline: 项目地图 · 架构 · 概念 · 模块 · 数据流 · 运维
  actions:
    - theme: brand
      text: 书写规范
      link: /CONVENTIONS
    - theme: alt
      text: 扫描报告
      link: /quality-report

features:
  - title: 项目地图
    details: 仓库结构、技术栈信号、推荐阅读顺序。
    link: /CONVENTIONS
  - title: 架构与数据流
    details: 分层边界与主路径图示（Mermaid）。
    link: /CONVENTIONS
  - title: 前端友好
    details: 路由、状态、请求层与构建链路的阅读清单。
    link: /CONVENTIONS
  - title: 可重复扫描
    details: 运行 analyze-repo.mjs 刷新 .meta 与 doc_plan。
    link: /quality-report
---

> 本目录（`project-wiki/`）存放 **代码优先** 的项目全景文档。  
> 先运行 skill 中的 `scripts/analyze-repo.mjs` 生成 `.meta/doc_plan.json`，再按 `references/doc-templates.md` 撰写各页。  
> 书写规范见 [CONVENTIONS.md](./CONVENTIONS.md)。

## 快速开始

在**仓库根目录**执行：

```bash
node <skill-dir>/scripts/analyze-repo.mjs --root . --out-dir project-wiki
```

然后根据 `project-wiki/.meta/doc_plan.json` 在子目录中创建 Markdown，并运行：

```bash
node <skill-dir>/scripts/regenerate-sidebar.mjs --root .
pnpm run docs:project-wiki:dev
```

## 文档占位

各分类目录下的页面由 Agent 根据扫描结果创建；创建后侧栏会自动收录带 `id` frontmatter 的文件。

| 分类 | 目录 |
|------|------|
| 项目地图 | `overview/` |
| 架构设计 | `architecture/` |
| 核心概念 | `concepts/` |
| 核心模块 | `modules/` |
| 数据流 | `dataflow/` |
| 工程运维 | `operations/` |
