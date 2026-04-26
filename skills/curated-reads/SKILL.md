---
name: curated-reads
description: "将外部技术博客、推文、Newsletter 等资讯链接整理为分类文档，进行内容摘要与归档，维护 INDEX 与 references 图；使用 Starlight 作为站点模板。适用于'整理这篇文章 / 收藏这个链接 / 归档技术资讯'等意图。"
---

# Curated Reads（技术阅读策展）

将外部技术文章、博客、推文、Newsletter 等链接整理为**可长期维护的分类文档**，写入目标仓库根目录的 **`curated-reads/`**，使用 **Starlight**（Astro 集成）作为文档站点引擎。

内容目录 `src/content/docs/`，配置文件 `astro.config.mjs`。

详细书写规范见本 skill 包内 `references/CONVENTIONS.md`；初始化后的目标仓库内会复制一份到 `curated-reads/CONVENTIONS.md`。

模板文件存放在 `assets/starlight/` 目录下，初始化脚本通过复制 + 变量替换的方式生成骨架。

## 加载策略（Progressive Disclosure）

默认按任务阶段读取规则，优先保证产出速度与一致性：

| 用户请求 | 必读内容 |
| --- | --- |
| 归档单篇链接 | `SKILL.md` + `references/CONVENTIONS.md` |
| 多篇对比/冲突处理 | 上述 + 本文「冲突处理」章节 |
| 批量整理专题 | 上述 + 本文「按量级适配输出」章节 |
| 仅维护导航 | 上述 + `scripts/regenerate-starlight-sidebar.mjs` 说明 |

避免一开始做全量历史回顾，先完成当前请求，再补充跨文档关联。

## 首次运行闸门（First-run Gate）

当目标仓库首次使用本 skill（不存在 `curated-reads/`）时，先询问用户选择：

1. 初始化 Starlight 骨架并继续归档（推荐）
2. 先只输出文章摘要，不落盘
3. 输出初始化与后续命令清单，由用户稍后执行

未确认前不直接创建目录与文档。

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

## 置信度评估

对每篇收录的文章，从**时效性**和**权威性**两个维度评估置信度，并记录在 frontmatter 的 `confidence` 字段中。

### 时效性（Freshness）

| 时效 | 置信度影响 |
|------|------------|
| 本周内发布 | 高——代表当前状态 |
| 本月内发布 | 良好——基本可信 |
| 1-6 个月前 | 中等——部分内容可能已过时，需标注 |
| 超过 6 个月 | 较低——标注为「可能已过时」，建议寻找更新来源 |

### 权威性（Authority）

| 来源类型 | 权威等级 |
|----------|----------|
| 官方文档 / 官方博客 | 最高——一手信息 |
| 知名技术博客（个人或公司） | 高——有专业背书 |
| 技术会议演讲 / Slides | 高——经过筛选 |
| Newsletter / 文摘聚合 | 中等——二手转述 |
| 社交媒体推文 / 帖子 | 中等偏低——非正式、可能缺少上下文 |
| 论坛讨论 / 评论区 | 低——观点性强，需交叉验证 |

### 置信度表达

在文档正文中，根据置信度水平调整措辞：

**高置信度**（多个权威来源一致）：
```markdown
Claude Code 支持通过 session 管理机制利用完整的 1M context window。
```

**中等置信度**（单一来源或有时效性顾虑）：
```markdown
根据 Anthropic 今年初的博客文章，Claude Code 支持 1M context window，
但具体的 session 管理策略可能已有更新。
```

**低置信度**（旧文章、非正式来源或信息矛盾）：
```markdown
一条来自 X/Twitter 的讨论提到了某种 Agent 协作模式，但缺少正式文档佐证。
该信息的准确性有待验证。
```

## 冲突处理

当多篇文章对同一话题持有不同观点时，**必须显式暴露冲突**，绝不能默默选择一方。

### 冲突处理规则

1. **识别冲突**：同一话题的不同文章给出了矛盾结论、不同推荐方案或相反数据
2. **并列展示**：在「对比与延伸」章节中列出各方观点
3. **标注时间线**：注明各文章的发布时间，帮助读者判断信息演进
4. **不做裁判**：除非有明确的官方定论，否则不判定哪方「正确」
5. **提供上下文**：解释冲突可能的原因（版本差异、场景不同、时间演进等）

### 冲突表达模板

```markdown
## 对比与延伸

关于 [话题]，收录的文章存在不同观点：

| 观点 | 来源 | 时间 | 核心论据 |
|------|------|------|----------|
| 方案 A 更优 | [文章1](链接) | 2025-03 | ... |
| 方案 B 更优 | [文章2](链接) | 2025-04 | ... |

**可能的原因**：文章1基于 v1.x 版本讨论，文章2基于 v2.0 新特性。
两者的结论在各自的前提下都成立。
```

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

### 第 2 步：评估置信度

根据「置信度评估」章节的规则，评估文章的时效性和权威性：

1. 判断文章的发布时间（精确到月份）
2. 判断来源的权威等级
3. 综合得出 `confidence` 值：`high` / `medium` / `low`
4. 如果置信度为 `low`，在文档中显式标注风险

### 第 3 步：检查已有文档——去重、关联与冲突检测

**在生成新文档前，必须执行此步骤：**

1. 扫描同一二级分类目录下的已有文档
2. 阅读已有文档的 frontmatter（`tags`、`title`、`description`）和正文摘要
3. 判断是否存在**主题高度相关**的已有文档
4. **检测观点冲突**：如果新文章与已有文档在同一话题上持不同立场，标记为冲突
5. 根据关联程度决定策略：

| 关联程度 | 策略 |
|----------|------|
| **完全重复**（同一篇文章） | 跳过，告知用户已存在 |
| **高度相关且观点一致** | 建议合并或在已有文档中增加补充章节 |
| **高度相关但观点冲突** | 新建文档，双向添加 `compares-with` 引用，在两篇文档中都增加冲突对比表 |
| **部分相关**（有交叉但侧重不同） | 新建文档，双向添加 `references` |
| **无关联** | 直接新建文档 |

### 第 4 步：确定编号

读取 `curated-reads/INDEX.md` 对应分类表格中的最大编号，分配下一个序号（如当前最大 AI-003 → 新文 AI-004）。

### 第 5 步：生成文档

遵循 `curated-reads/CONVENTIONS.md`（与本包 `references/CONVENTIONS.md` 一致）。

**文件命名**：`YYYYMMDD-` + 小写连字符 slug + `.md`，日期与 frontmatter `created` 一致；禁止大写、下划线、空格。

**Frontmatter**（必填项见 CONVENTIONS；常用字段）：

- `id`、`title`、`description`、`category`、`subcategory`、`created`、`updated`、`tags`、`status`（新建默认 `draft`）
- `sources`（**必填**：原文 URL 列表，含 title 和 url）
- `confidence`（**必填**：`high` / `medium` / `low`）
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

（可选）与同分类已有文档的对比分析。存在冲突时必须显式列出。

## References

- 文档间的交叉引用链接
```

### 第 6 步：维护 references（双向）

为新文与被引用文同时更新 `references`，并更新被引用文的 `updated` 日期。`rel` 取值与反向关系见 `references/CONVENTIONS.md` 表格。

### 第 7 步：更新 INDEX

在 `curated-reads/INDEX.md` 对应分类表格中追加一行：编号、链接、标题、来源、概述。

### 第 8 步：同步侧栏

> **必做检查**：只要本次工作流中发生了文档的**新增、删除或重命名**，就**必须**在结束前执行下方 sidebar 脚本。如果跳过此步骤，侧栏导航将与实际文档不同步，用户在站点中无法找到新文档或仍能看到已删除的文档入口。

在仓库根运行：

```bash
node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
```

以重写 `.starlight/sidebar.generated.mjs`（侧栏从各篇 frontmatter 的 `id`、`title`、`category` 生成）。

### 第 9 步：向用户确认

报告：文件路径、编号、分类（一级+二级）、标题、置信度、内容摘要、是否有关联或冲突文档、本次 references 变更、侧栏是否已重新生成。

## 与 architecture-diagram 自动联动

初始化脚本会自动检测目标仓库是否存在 `architecture-diagrams/`：

- 若存在：自动生成桥接文件
  - `curated-reads/ARCHITECTURE-DIAGRAM-LINKS.md`
  - `architecture-diagrams/CURATED-READS-LINKS.md`
- 若不存在：跳过，不影响 curated-reads 正常使用

手工补联动（可选）：

```bash
node <skill-dir>/scripts/link-architecture-diagrams.mjs --root .
```

## 按量级适配输出

当同一分类下积累了较多文档时，根据数量选择不同的整理策略：

### 少量文档（1-5 篇）

详细展示每篇文档的摘要和关键观点，无需额外综合。

### 中量文档（5-15 篇）

按主题聚类分组，每组给出小结：

```markdown
### Agent 上下文管理（3 篇）
- AI-001：聚焦 session 管理...
- AI-003：讨论多 Agent 间上下文传递...
- AI-005：对比不同框架的上下文策略...

**小结**：三篇文章从单 Agent → 多 Agent → 跨框架三个层次递进讨论了上下文管理。
```

### 大量文档（15+ 篇）

自动触发**综述文档**生成建议：

1. 按主题聚类，产出高层综述
2. 标注每个聚类的文章数量和置信度分布
3. 列出 Top 3-5 最高价值来源
4. 提供下钻选项（按二级分类或标签进一步探索）

综述文档的编号使用 `{前缀}-S{序号}` 格式（如 `AI-S001`），与单篇文档区分。

## 反模式清单

生成文档时，**必须避免**以下做法：

| 反模式 | 正确做法 |
|--------|----------|
| 按来源逐个罗列（「来源A说...来源B说...」） | **按主题组织**，将不同来源的相关信息合并叙述 |
| 把答案/结论埋在大段背景介绍之下 | **答案先行**：核心观点放在最前面 |
| 过度摘要导致关键细节丢失 | 保留足够细节让读者判断是否需要阅读原文 |
| 遇到矛盾信息时默默选一个 | **显式暴露冲突**，并列展示不同观点 |
| 不确定的信息用确定性措辞表述 | 根据置信度调整措辞，标注不确定性 |
| 简单翻译/复制原文 | **理解后重新组织**，提炼核心观点 |
| 省略来源归属 | 每个论点都要可追溯到原文来源 |
| 对所有文章使用相同详略程度 | 根据分类下文档数量**适配输出粒度** |
