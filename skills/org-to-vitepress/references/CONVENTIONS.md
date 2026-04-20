# Org → VitePress 转换与站点规范

本文档约束 `org-to-vitepress` skill 在目标仓库内生成的内容、命名与脚本行为。所有 Agent 对该 skill 做二次改造时请同步更新本文。

---

## 1. 目录约定

| 路径 | 说明 | 是否可手改 |
|------|------|------------|
| `.vitepress/config.mts` | VitePress 主配置；会注入 `__WIKI_TITLE__` / `__SOCIAL_LINKS__` | ✅ 可自定义主题，保留 `import { wikiSidebar, wikiNav }` |
| `.vitepress/sidebar.generated.mts` | 自动生成的侧栏与顶部导航 | ❌ 不可手改，只能重跑脚本 |
| `org-wiki/` | VitePress `srcDir`，也是 `.md` 实际存放位置 | ✅ 内容可增改 |
| `org-wiki/INDEX.md` | 首页，手动维护概述 | ✅ |
| `org-wiki/<cat>/*.md` | 按源 org 顶层目录分组的 Markdown 文档 | ✅ |
| `.org-conversion-errors.log` | 转换失败记录（可提交也可 .gitignore） | ✅ |

`srcDir` 默认 `org-wiki`，可通过 `--src-dir` 覆盖。

---

## 2. 文件命名

`.org` 文件名在转换时会做规范化处理：

1. 统一小写
2. 空格、下划线 `_`、驼峰分隔符 → 连字符 `-`
3. 去除 shell / 文件系统敏感字符：`*`、`^`、`~`、反引号、`|`、`:`、`?`、`<`、`>`、`"`、`\`
4. 合并连续的 `-`、首尾 `-` 去除
5. 冲突（同目录下规范化后同名）追加 `-2`、`-3` …

示例：

```
mongoDB-Map-Reduce.org      →  mongodb-map-reduce.md
redis basic operations.org  →  redis-basic-operations.md
es: explain.org              →  es-explain.md
^ls                          →  （跳过：无 .org 后缀，视为临时/残留）
```

目录名**保持原样**（不做规范化），以便原路径可对照。

---

## 3. Frontmatter

每个生成的 `.md` 文件在正文前注入最小化 YAML frontmatter：

```yaml
---
title: "Map-Reduce in MongoDB"    # 优先顺序: #+title: > 首个 H1 > 文件名去后缀
source: "database/mongoDB-Map-Reduce.org"  # 相对源 org 根目录的原路径
---
```

若源 `.org` 本身就写了 `#+AUTHOR:`、`#+DATE:` 等字段，当前版本**不**透传到 Markdown（避免 pandoc 渲染出冗余的 YAML）。如需保留，改在 `convert-org-to-md.mjs` 里扩展 `extractMeta`。

---

## 4. Pandoc 调用约定

```bash
pandoc \
  --from org \
  --to gfm+tex_math_dollars \
  --wrap=preserve \
  --standalone=false \
  --output <dest.md> \
  <src.org>
```

- `gfm` 而非 `markdown`：与 VitePress 默认解析器（Shiki + markdown-it）兼容最好
- `tex_math_dollars`：保留 `$...$` 行内公式与 `$$...$$` 块公式
- `--wrap=preserve`：不强制换行，保持原段落形状
- 不使用 `--standalone`：避免 pandoc 输出一整份带 H1 标题的 front matter；我们自己注入 frontmatter

若源 org 里使用了 `#+INCLUDE:` 等需要 Emacs 才能展开的特性，pandoc 不会处理，结果会保留原始 `#+INCLUDE:` 字串——在转换日志里标记为 warning，人工复核。

---

## 5. 素材（图片/附件）

自动复制的扩展名白名单：

```
.png .jpg .jpeg .gif .svg .webp .apng .pdf .mp4 .webm
```

复制时**保持与源目录相同的相对路径**。例如源 `app/UIAlertController.png` 被复制到 `org-wiki/app/UIAlertController.png`，原 org 中 `[[file:UIAlertController.png]]` 经 pandoc 转换为 `![](UIAlertController.png)`，相对路径不变，VitePress 能正确解析。

**不在白名单内的扩展名**（如 `.el`、`.log`、`.tex`、`.u1conflict`）：不会复制，也不会报错；如果确有需要，在脚本的 `ASSET_EXTS` 常量中追加。

---

## 6. 侧栏与导航

`regenerate-vitepress-sidebar.mjs` 扫描 `<srcDir>` 下所有 `.md`，按以下规则构建：

- **一级分组**：srcDir 的直接子目录，按字母序排序，作为 `wikiSidebar[/<dir>/]` 的分组 label
- **二级分组**（可选）：若一级目录下还有子目录，产出嵌套的 `items`，使用子目录名做 label（通过 `prettifySubcat` 美化）
- **叶子项 `text`**：优先使用 frontmatter `title`，否则用文件名（去掉 `.md` 后缀）
- **排序**：同层级字母序；若日后引入编号前缀，可在 `compareByFilename` 中加规则

导航 `wikiNav` 取每个一级分组的**第一篇**作为默认入口。

顶层的 `INDEX.md` 不参与分组，作为首页独立存在。

---

## 7. 维护节奏

| 变更类型 | 需要重跑的脚本 |
|----------|----------------|
| 新增一篇手写 md | `regenerate-vitepress-sidebar.mjs` |
| 重命名/移动 md | `regenerate-vitepress-sidebar.mjs` |
| 新增一批 `.org`（增量） | `convert-org-to-md.mjs`（脚本默认跳过已存在的输出，加 `--force` 覆盖）+ `regenerate-vitepress-sidebar.mjs` |
| 修改 VitePress 主题 / 加插件 | 只改 `.vitepress/config.mts`，无需重跑脚本 |
| 修改 skill 本身的脚本 | 改 skill 包本身，走 PR 流程；不要把目标仓库的脚本改好不回传 |

---

## 8. 已知局限

- **Emacs Lisp blocks**（`#+begin_src emacs-lisp ... #+end_src`）在 pandoc 中会被渲染成普通代码块；没有单独的高亮语言映射。
- **`org-babel` 可执行代码块** 不会执行；结果块（`#+RESULTS:`）会原样保留。
- **`#+INCLUDE:`** 不展开；如需内联，先在 Emacs 里 `org-export` 为单文件再喂给 pandoc。
- **`[[id:...]]` 内链** 若指向 org-id，pandoc 无法解析——会输出失效的相对链接，需要人工修订。
- **表格公式** (`#+TBLFM:`) 不会保留计算结果；数值需要在 org 里先 `C-c C-c` 求值后再导出。

以上局限在 `.org-conversion-errors.log` 中只会记录**硬失败**；上述 warning 若想记录，请在 `convert-org-to-md.mjs` 中扩展 `pandoc` 的 stderr 处理。
