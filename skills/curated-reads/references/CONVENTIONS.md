# Curated Reads 文档书写规范

本规范约束仓库根目录下 `curated-reads/` 及 `src/content/docs/` 内所有 AI 辅助生成的技术阅读文档。

---

## 1. 目录分类（二级体系）

每篇文档必须归入**一级分类**，并可选归入**二级细分**。物理路径在 `src/content/docs/` 下。

### 一级分类

| 分类 | 目录 | 编号前缀 | 适用场景 |
|------|------|----------|----------|
| AI & ML | `ai/` | AI-xxx | 人工智能、机器学习、深度学习、LLM、Agent 等 |
| Engineering | `engineering/` | ENG-xxx | 软件工程、系统设计、架构、编程语言 |
| Frontend | `frontend/` | FE-xxx | 前端框架、UI/UX、浏览器技术、Web 标准 |
| DevOps & Infra | `devops/` | OPS-xxx | 运维、云原生、CI/CD、可观测性 |
| Product & Design | `product/` | PD-xxx | 产品设计、用户体验、商业策略 |
| Misc | `misc/` | M-xxx | 无法归入以上分类的文章 |

### 二级细分（按需增长）

二级目录嵌套在一级目录下，Agent 在首次写入时按需创建。以下为常见二级分类：

| 一级 | 二级 | 目录 | 说明 |
|------|------|------|------|
| ai | agent | `ai/agent/` | AI Agent、多智能体、工具调用 |
| ai | llm | `ai/llm/` | 大语言模型、Prompt Engineering、微调 |
| ai | mlops | `ai/mlops/` | ML 工程化、模型训练与部署 |
| ai | research | `ai/research/` | 论文解读、前沿研究 |
| engineering | system-design | `engineering/system-design/` | 系统设计、分布式架构 |
| engineering | language | `engineering/language/` | 编程语言、类型系统、运行时 |
| engineering | best-practices | `engineering/best-practices/` | 工程实践、代码质量、重构 |
| frontend | framework | `frontend/framework/` | React/Vue/Svelte/Astro 等 |
| frontend | tooling | `frontend/tooling/` | 构建工具、包管理器、开发工具链 |
| devops | cloud | `devops/cloud/` | 云服务、Kubernetes、容器 |
| devops | observability | `devops/observability/` | 监控、日志、链路追踪 |
| product | strategy | `product/strategy/` | 产品策略、增长、商业模式 |
| product | ux | `product/ux/` | 用户体验设计、交互设计 |

> 如果某篇文章不属于已有的二级分类，可直接创建新的二级目录，并在 INDEX.md 中注册。

---

## 2. 文件命名

- 使用 **`YYYYMMDD-`** 日期前缀 + **小写字母** + **连字符** 分隔：`20250419-claude-code-session-management.md`
- 日期取文档首次创建日期（与 frontmatter `created` 字段一致）
- 名称应简洁且具有描述性，避免无意义缩写
- 禁止使用大写字母、下划线、空格
- 后缀统一为 `.md`

**示例**：
```
# 正确
20250419-claude-code-session-management.md
20250419-ai-agent-team-patterns.md
20260101-kubernetes-security-best-practices.md

# 错误
claude-code.md                              ← 缺少日期前缀
2025-04-19-claude-code.md                   ← 日期格式错误（不要用连字符分隔日期）
AI_Agent_Team.md                            ← 大写 + 下划线
```

---

## 3. 文档结构

每篇文档应包含以下结构（按顺序）：

### 3.1 Frontmatter（YAML 元信息块）

```yaml
---
id: AI-001
title: Claude Code 的 Session 管理与百万上下文窗口
description: >
  Anthropic 官方博客解读：如何通过 session 管理机制高效利用
  Claude Code 的 1M context window。
category: ai
subcategory: agent
created: 2025-04-19
updated: 2025-04-19
tags: [claude, agent, context-window, session-management]
status: draft
confidence: high
difficulty: intermediate
authors:
  - name: Anthropic
    url: https://claude.com/blog
sources:
  - title: "Using Claude Code: Session Management and 1M Context"
    url: "https://claude.com/blog/using-claude-code-session-management-and-1m-context"
references:
  - id: AI-002
    rel: related-to
    file: ../20250419-ai-agent-team-patterns.md
---
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 分类前缀 + 三位数字序号，如 `AI-001` |
| `title` | 是 | 文档标题（中文为主，可中英混合） |
| `description` | 是 | 1-3 句话的简短描述，用于索引和搜索摘要。可使用 YAML 多行语法 `>` |
| `category` | 是 | 一级分类名：`ai` / `engineering` / `frontend` / `devops` / `product` / `misc` |
| `subcategory` | 否 | 二级分类名，如 `agent`、`llm`、`system-design`。未归入二级分类时可省略 |
| `created` | 是 | 创建日期，格式 `YYYY-MM-DD` |
| `updated` | 是 | 最后更新日期，格式 `YYYY-MM-DD`。首次创建时与 `created` 相同 |
| `tags` | 是 | 关键词标签数组，用于检索和关联 |
| `status` | 是 | `draft`（草稿）/ `wip`（进行中）/ `final`（定稿） |
| `difficulty` | 否 | `beginner`（入门）/ `intermediate`（中级）/ `advanced`（高级）|
| `confidence` | **是** | 置信度评估：`high` / `medium` / `low`（见下方评估规则）|
| `authors` | 否 | 原文作者列表，含 `name` 与可选 `url` |
| `sources` | **是** | 原文来源列表（**对本 skill 而言是必填**），含 `title` 与 `url` |
| `references` | 否 | 关联文档列表，记录文档之间的引用关系（见下方说明） |

### 3.1.1 confidence 置信度评估规则

`confidence` 从**时效性**和**权威性**两个维度综合评定：

#### 时效性（Freshness）

| 时效 | 影响 |
|------|------|
| 本周内发布 | 高——代表当前状态 |
| 本月内发布 | 良好——基本可信 |
| 1-6 个月前 | 中等——部分内容可能已过时 |
| 超过 6 个月 | 较低——标注「可能已过时」 |

#### 权威性（Authority）

| 来源类型 | 权威等级 |
|----------|----------|
| 官方文档 / 官方博客 | 最高 |
| 知名技术博客（个人或公司） | 高 |
| 技术会议演讲 / Slides | 高 |
| Newsletter / 文摘聚合 | 中等 |
| 社交媒体推文 / 帖子 | 中等偏低 |
| 论坛讨论 / 评论区 | 低 |

#### 综合判定

| confidence | 条件 |
|------------|------|
| `high` | 权威来源 + 时效性好（6 个月内），或多个独立来源相互印证 |
| `medium` | 单一来源但可信，或权威来源但有时效性顾虑 |
| `low` | 非正式来源、超过 6 个月、存在矛盾信息、缺少佐证 |

#### 措辞适配

正文中根据置信度水平调整措辞——高置信度用肯定句，中等置信度加时间或条件限定，低置信度显式标注不确定性。详见 SKILL.md「置信度评估」章节的示例。

### 3.1.2 references 字段规范

`references` 记录当前文档与同目录树内其他文档的**双向引用关系**。当文档 A 引用文档 B 时，A 和 B 的 frontmatter 中都应包含对彼此的引用。

```yaml
references:
  - id: AI-002
    rel: related-to
    file: ../20250419-ai-agent-team-patterns.md
  - id: ENG-001
    rel: extends
    file: ../../engineering/system-design/20250420-distributed-agent-architecture.md
```

支持的 `rel` 类型：

| rel 值 | 含义 | 反向 rel |
|--------|------|----------|
| `derived-from` | 本文从该文档的话题/需求引出 | `derives` |
| `derives` | 该文档从本文的话题/需求引出 | `derived-from` |
| `related-to` | 与该文档主题相关（对称关系） | `related-to` |
| `extends` | 本文是该文档的扩展/深入 | `extended-by` |
| `extended-by` | 该文档是本文的扩展/深入 | `extends` |
| `supersedes` | 本文替代/废弃该文档 | `superseded-by` |
| `superseded-by` | 本文被该文档替代/废弃 | `supersedes` |
| `compares-with` | 本文与该文档是对比关系（对称） | `compares-with` |

**规则**：
- 添加引用时，**必须同时更新双方**的 `references` 字段
- `id` 为目标文档的编号（如 `AI-002`）
- `file` 使用相对路径指向目标文档
- 无引用关系的文档可省略 `references` 字段

### 3.2 标题

使用一级标题，与 frontmatter 的 `title` 一致：

```markdown
# Claude Code 的 Session 管理与百万上下文窗口
```

### 3.3 概述

紧接标题后提供 1-3 句话的概述，使用引用块：

```markdown
> Anthropic 官方博客解读：如何通过 session 管理机制高效利用
> Claude Code 的 1M context window。
```

### 3.4 来源

**必须包含**来源章节，列出原文链接：

```markdown
## 来源

- [Using Claude Code: Session Management and 1M Context](https://claude.com/blog/...) — Anthropic · 2025-04-19
```

### 3.5 正文（核心内容）

- 使用二级标题（`##`）划分主要章节
- 使用三级标题（`###`）划分子章节
- 对文章进行**理解和总结**，而非简单复制原文
- 提炼核心观点、关键论据、重要结论
- 代码块标注语言：```typescript / ```python 等
- 表格对齐、列表层级不超过 3 层

推荐的正文结构：

```markdown
## 核心内容

### 要点一：xxx
...

### 要点二：xxx
...

## 关键摘录

> 引用原文中特别有价值的段落（保留原文语言）

## 个人笔记 / 延伸思考

对文章的评论、与其他知识点的联系、实践建议等。
```

### 3.6 对比与延伸（可选但推荐）

当同分类下存在主题相关的已有文档时，应增加对比分析章节：

```markdown
## 对比与延伸

本文与 [AI-002 多智能体协作模式](../20250419-ai-agent-team-patterns.md) 的关系：
- 相同点：都关注 Agent 的上下文管理
- 不同点：本文侧重单 Agent session 管理，AI-002 侧重多 Agent 协作
- 互补之处：可以将 session 管理策略应用到多 Agent 场景中
```

### 3.7 References

文档末尾必须包含 References 章节，列出文档间的交叉引用：

```markdown
## References

- [AI-002 多智能体协作模式](../20250419-ai-agent-team-patterns.md) — 相关主题
- [ENG-001 分布式 Agent 架构](../../engineering/system-design/20250420-distributed-agent-architecture.md) — 扩展阅读
```

如果没有关联文档，仍保留章节但标注「暂无关联文档」。

### 3.8 交叉引用格式

引用其他文档时使用相对路径：

```markdown
详见 [AI-002 多智能体协作模式](../20250419-ai-agent-team-patterns.md)
```

---

## 4. 索引维护

每新增或修改一篇文档，**必须同步更新** `curated-reads/INDEX.md`：

1. 在对应分类表格中添加/更新条目
2. 分配下一个可用的编号（如 `AI-004`）
3. 填写文件名、标题、来源、概述

---

## 5. 内容规范

### 5.1 语言

- 主要使用**中文**撰写摘要和分析
- 技术术语保留英文原文，不强行翻译（如 context window、agent、prompt）
- 首次出现的术语给出简要解释
- 关键摘录保留原文语言（英文原文保持英文）

### 5.2 摘要质量

- 摘要不是简单翻译，而是**理解后的重新组织**
- 提炼核心观点，过滤冗余信息
- 标注文章的适用场景和局限性
- 如有争议观点，标注不同声音

### 5.3 图表

- 如果原文有复杂架构，可用 Mermaid 语法重绘关键图表
- 简单关系用 ASCII 表示即可

---

## 6. 状态管理

| 状态 | 含义 | 允许的操作 |
|------|------|------------|
| `draft` | 初稿，内容可能不完整 | 可自由修改 |
| `wip` | 进行中，结构已定但细节待补充 | 可修改，需标注变更 |
| `final` | 定稿，内容已审核确认 | 仅允许勘误修正 |

---

## 7. 去重与合并策略

### 7.1 去重检查

每次新增文档前，扫描已有文档：

1. 检查 `sources` URL 是否已被收录
2. 检查 `tags` 和 `title` 是否有高度重叠
3. 阅读同目录下的文档摘要

### 7.2 合并策略

当多篇文章主题高度一致时：

- 可以将多篇文章合并为一篇**综述文档**
- 综述文档的 `sources` 包含所有原文链接
- 正文中对各篇文章进行对比分析
- 已有的单篇文档标记为 `superseded-by` 新综述

---

## 8. 侧边栏与导航同步

当 `src/content/docs/` 下文档发生变化（新增、重命名、删除）时，在**目标仓库根目录**执行：

```bash
node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
```

该脚本会扫描所有分类目录下的 Markdown（读取 frontmatter 的 `id`、`title`、`category`），重写 `.starlight/sidebar.generated.mjs`。`astro.config.mjs` 从该文件导入 `starlightSidebar`。

---

## 9. 冲突处理

当多篇收录的文章对同一话题持有不同观点时，**必须显式暴露冲突**。

### 规则

1. 不默默选择一方——并列展示各方观点
2. 标注各文章的发布时间，帮助读者理解信息演进
3. 除非有明确官方定论，否则不做裁判
4. 解释冲突可能的原因（版本差异、场景不同、时间演进等）

### 冲突表达模板

```markdown
## 对比与延伸

关于 [话题]，收录的文章存在不同观点：

| 观点 | 来源 | 时间 | 核心论据 |
|------|------|------|----------|
| 方案 A 更优 | [文章1](链接) | 2025-03 | ... |
| 方案 B 更优 | [文章2](链接) | 2025-04 | ... |

**可能的原因**：文章1 基于 v1.x 版本讨论，文章2 基于 v2.0 新特性。
```

冲突文档间应使用 `compares-with` 作为 `rel` 类型进行双向引用。

---

## 10. 综述文档规范

当同一二级分类下文档数量达到 **15 篇以上**时，建议生成综述文档。

### 综述文档特点

- **编号格式**：`{前缀}-S{序号}`（如 `AI-S001`），与单篇文档区分
- **`sources`**：包含所有被综述文章的原文链接
- **正文结构**：按主题聚类，每个聚类给出小结和置信度分布
- 列出 Top 3-5 最高价值来源
- 提供下钻选项（指向各单篇文档）

### 综述 Frontmatter 示例

```yaml
---
id: AI-S001
title: AI Agent 领域综述（2025 Q1）
description: >
  对 2025 年第一季度收录的 18 篇 AI Agent 相关文章进行主题聚类和综合分析。
category: ai
subcategory: agent
created: 2025-04-01
updated: 2025-04-01
tags: [agent, survey, synthesis]
status: draft
confidence: high
sources:
  - title: "文章1标题"
    url: "https://..."
  # ... 列出所有被综述的文章
---
```

### 与被综述文档的关系

- 综述文档对每篇被综述文档添加 `rel: derives` 引用
- 被综述文档无需标记为 `superseded-by`（综述是补充而非替代）
- 除非综述文档完全覆盖了某篇单篇文档的内容，此时单篇可标记为 `superseded-by`

---

## 11. 反模式清单

生成文档时，**必须避免**以下做法：

| 反模式 | 正确做法 |
|--------|----------|
| 按来源逐个罗列 | 按主题组织，合并叙述 |
| 结论埋在大段背景下 | 答案先行，核心观点放最前 |
| 过度摘要丢失细节 | 保留足够细节供读者判断 |
| 矛盾信息默选一方 | 显式暴露冲突，并列观点 |
| 不确定信息用确定措辞 | 按置信度调整措辞 |
| 简单翻译/复制原文 | 理解后重新组织 |
| 省略来源归属 | 每个论点可追溯到原文 |
| 所有文章同等详略 | 按分类文档数量适配粒度 |
