---
name: curated-reads
description: "将外部技术博客、推文、Newsletter 等资讯链接整理为分类文档，进行内容摘要与归档，维护 INDEX 与 references 图；使用 Starlight 作为站点模板。适用于'整理这篇文章 / 收藏这个链接 / 归档技术资讯'等意图。"
---

# Curated Reads（技术阅读策展）

将外部技术文章、博客、推文、Newsletter 等链接整理为**可长期维护的分类文档**，写入目标仓库根目录的 **`curated-reads/`**，使用 **Starlight**（Astro 集成）作为文档站点引擎。

内容目录 `src/content/docs/`，配置文件 `astro.config.mjs`。

详细书写规范见本 skill 包内 `references/CONVENTIONS.md`；初始化后的目标仓库内会复制一份到 `curated-reads/CONVENTIONS.md`。

模板文件存放在 `assets/starlight/` 目录下，初始化脚本通过复制 + 变量替换的方式生成骨架。

## 首次接入（人类或 Agent 执行）

1. 用 [skills CLI](https://github.com/vercel-labs/skills) 安装本 skill（示例）：

   ```bash
   npx skills add <your-github>/agent-skills --skill curated-reads -a cursor -y
   ```

2. 在**目标仓库根目录**生成骨架（将 `<skill-dir>` 换成已安装的 `curated-reads` 目录，内含 `scripts/`）：

   ```bash
   node <skill-dir>/scripts/init-starlight.mjs --root . --title "Curated Reads"
   ```

   安装依赖并本地预览：

   ```bash
   pnpm install
   pnpm run docs:reads:dev
   ```

   **新增/重命名** Markdown 后，在仓库根执行：

   ```bash
   node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
   ```

   以重写 `.starlight/sidebar.generated.mjs`（侧栏从各篇 frontmatter 的 `id`、`title`、`category` 生成）。

   > Starlight 的内容目录为 `src/content/docs/`（Astro 内容集合规范），文档按二级分类子目录组织（如 `ai/agent/`、`ai/llm/`、`engineering/system-design/` 等）。

## 何时使用

- 用户分享了外部 URL（博客、推文、技术文章等）并希望整理归档
- 用户说「整理这篇文章」「收藏这个链接」「归档到阅读清单」等
- 用户提供多篇同主题文章，希望进行对比或合并整理
- 用户要求对已有归档文档进行重新梳理、与新文章做对比

## 分类体系（二级）

采用**一级大类 + 二级细分**的目录结构。以下为预置分类，可按需扩展：

| 一级分类 | 目录 | 编号前缀 | 说明 |
|----------|------|----------|------|
| AI & ML | `ai/` | AI-xxx | 人工智能与机器学习全领域 |
| Engineering | `engineering/` | ENG-xxx | 软件工程、架构、系统设计 |
| Frontend | `frontend/` | FE-xxx | 前端技术、框架、UI/UX |
| DevOps & Infra | `devops/` | OPS-xxx | 运维、基础设施、CI/CD |
| Product & Design | `product/` | PD-xxx | 产品设计、用户体验、商业模式 |
| Misc | `misc/` | M-xxx | 无法归入以上分类的文章 |

### 二级细分（示例，按需增长）

| 一级 | 二级目录 | 说明 |
|------|----------|------|
| ai | `ai/agent/` | AI Agent、多智能体系统 |
| ai | `ai/llm/` | 大语言模型、Prompt Engineering |
| ai | `ai/mlops/` | ML 工程化、训练部署 |
| ai | `ai/research/` | 论文解读、前沿研究 |
| engineering | `engineering/system-design/` | 系统设计、分布式架构 |
| engineering | `engineering/language/` | 编程语言、运行时 |
| engineering | `engineering/best-practices/` | 工程实践、代码质量 |
| frontend | `frontend/framework/` | React/Vue/Svelte 等框架 |
| frontend | `frontend/tooling/` | 构建工具、开发工具链 |
| devops | `devops/cloud/` | 云服务、容器编排 |
| devops | `devops/observability/` | 可观测性、监控 |
| product | `product/strategy/` | 产品策略、增长 |
| product | `product/ux/` | 用户体验设计 |

> 二级目录不要求预先创建——Agent 在写入第一篇文档时按需自动建立。

## 工作流

### 第 0 步：抓取与理解外部内容

1. 用户提供 URL 后，使用 WebFetch 工具获取文章内容
2. 阅读并理解全文，提取核心观点、关键论据和结论
3. 如果 URL 无法直接抓取（如需登录、付费墙），请用户提供文章内容或截图

### 第 1 步：判断分类

根据文章内容判断一级和二级分类：

1. 先确定一级大类（ai / engineering / frontend / devops / product / misc）
2. 再确定二级细分，如果现有二级分类不合适，可以新建
3. 用户指定分类时服从用户；否则自动选择最合适的类

### 第 2 步：检查已有文档——去重与关联

**在生成新文档前，必须执行此步骤：**

1. 扫描同一二级分类目录下的已有文档
2. 阅读已有文档的 frontmatter（`tags`、`title`、`description`）和正文摘要
3. 判断是否存在**主题高度相关**的已有文档
4. 根据关联程度决定策略：

| 关联程度 | 策略 |
|----------|------|
| **完全重复**（同一篇文章） | 跳过，告知用户已存在 |
| **高度相关**（同一话题的不同文章） | 建议合并或在已有文档中增加对比章节；新文档在 `## 对比与延伸` 中引用已有文档 |
| **部分相关**（有交叉但侧重不同） | 新建文档，双向添加 `references` |
| **无关联** | 直接新建文档 |

### 第 3 步：确定编号

读取 `curated-reads/INDEX.md` 对应分类表格中的最大编号，分配下一个序号（如当前最大 AI-003 → 新文 AI-004）。

### 第 4 步：生成文档

遵循 `curated-reads/CONVENTIONS.md`（与本包 `references/CONVENTIONS.md` 一致）。

**文件命名**：`YYYYMMDD-` + 小写连字符 slug + `.md`，日期与 frontmatter `created` 一致；禁止大写、下划线、空格。

**Frontmatter**（必填项见 CONVENTIONS；常用字段）：

- `id`、`title`、`description`、`category`、`subcategory`、`created`、`updated`、`tags`、`status`（新建默认 `draft`）
- `sources`（**必填**：原文 URL 列表，含 title 和 url）
- 可选：`references`（文档间关系）、`authors`（原文作者）、`difficulty`（入门/中级/高级）

**正文结构**（推荐模板）：

```markdown
# 文章标题

> 一句话概述本文核心观点。

## 来源

- [原文标题](原文URL) — 作者名 · YYYY-MM-DD

## 核心内容

### 要点一
...

### 要点二
...

## 关键摘录

> 引用原文中特别有价值的段落（保留原文语言）

## 个人笔记 / 延伸思考

对文章的评论、与其他知识点的联系、实践建议等。

## 对比与延伸

（可选）与同分类已有文档的对比分析。

## References

- 文档间的交叉引用链接
```

### 第 5 步：维护 references（双向）

为新文与被引用文同时更新 `references`，并更新被引用文的 `updated` 日期。`rel` 取值与反向关系见 `references/CONVENTIONS.md` 表格。

### 第 6 步：更新 INDEX

在 `curated-reads/INDEX.md` 对应分类表格中追加一行：编号、链接、标题、来源、概述。

### 第 7 步：同步侧栏

在仓库根运行：

```bash
node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
```

以重写 `.starlight/sidebar.generated.mjs`（侧栏从各篇 frontmatter 的 `id`、`title`、`category` 生成）。

### 第 8 步：向用户确认

报告：文件路径、编号、分类（一级+二级）、标题、内容摘要、是否有关联文档、本次 references 变更、侧栏是否已重新生成。
