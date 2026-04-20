---
title: __WIKI_TITLE__
---

# __WIKI_TITLE__

这里是由 [`org-to-vitepress`](https://agentskills.io) skill 把 Emacs Org Mode 目录批量转换后得到的 Markdown 归档站点。

- 左侧侧栏按源 `.org` 目录的**一级分类**分组，子目录作为二级分组嵌套
- 所有文档都包含 `title` 与 `source`（原 `.org` 相对路径）两个 frontmatter 字段
- 图片、PDF 等附件保持与 `.org` 相同的相对路径，引用原样可用

## 维护

- **新增手写 md** 或 **重命名文件**：重跑 sidebar 脚本即可
  ```bash
  node <skill-dir>/scripts/regenerate-vitepress-sidebar.mjs --root .
  ```
- **新导入一批 .org**：先跑转换、再跑 sidebar
  ```bash
  node <skill-dir>/scripts/convert-org-to-md.mjs --source <org-dir> --dest ./org-wiki
  node <skill-dir>/scripts/regenerate-vitepress-sidebar.mjs --root .
  ```

## 本地开发

```bash
pnpm install
pnpm run docs:org:dev     # http://localhost:5173/
pnpm run docs:org:build   # 生产构建
pnpm run docs:org:preview # 预览构建产物
```
