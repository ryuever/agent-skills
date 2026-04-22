---
name: architecture-diagram
description: "根据系统组件描述生成深色主题架构图（单文件 HTML + 内联 SVG），适用于系统设计评审、技术方案说明、云基础设施可视化与 onboarding 文档配图。兼容 vercel-labs/skills 安装与分发。"
---

# Architecture Diagram（架构图生成）

把自然语言里的系统结构（组件、连接关系、部署边界）转成可直接打开和分享的架构图 HTML 文件。

输出目标：

- 单文件 `.html`（自包含，内联 CSS + SVG）
- 浏览器直接打开，无需额外依赖
- 可持续迭代（增删组件、改布局、改说明卡片）

> 该 skill 参考并兼容了 Cocoon AI 的 architecture-diagram-generator 思路，适配到 `vercel-labs/skills` 安装工作流。

## 何时使用

- 用户说「画系统架构图」「生成基础设施拓扑」「给设计评审做一张总览图」
- 需要把 API、服务、数据库、消息队列、云组件关系可视化
- 需要可归档、可版本管理的 HTML/SVG 产物（而非截图）

不适用场景：

- 只需要文本说明，不需要图
- 需求是时序图/流程图而非架构关系图（建议使用专门图类型 skill）

## 加载策略（Progressive Disclosure）

默认先完成最小可用图，再按需增强：

| 阶段 | 必读内容 |
| --- | --- |
| 首次生成图 | `SKILL.md` + `assets/template.html` |
| 调整视觉规范 | 上述 + `references/CONVENTIONS.md` |
| 批量产图流程 | 上述 + `scripts/init-architecture-diagram.mjs` |

不要一开始就做复杂风格定制，先产出可读版本。

## 首次运行闸门（First-run Gate）

若目标仓库不存在 `architecture-diagrams/`，先询问用户选择：

1. 初始化目录并生成首张图（推荐）
2. 仅输出图的草稿 HTML，不落盘
3. 先初始化模板（不生成具体图）

没有明确确认前，不做批量写入。

## 输入约定

要求用户至少提供：

1. **组件清单**（如 Frontend/API/DB/Queue）
2. **连接关系**（A -> B，协议或端口可选）
3. **部署边界**（可选，如 AWS region/VPC/K8s cluster）

推荐输入格式：

```text
- Frontend: React web
- API: Node.js service
- DB: PostgreSQL
- Cache: Redis
- Message bus: Kafka
- Infra: AWS (ALB + ECS + RDS)

Connections:
- Browser -> ALB (HTTPS)
- ALB -> API (HTTP:8080)
- API -> PostgreSQL (5432)
- API -> Redis (6379)
- API -> Kafka (9092)
```

## 输出流程

### 1) 选模板并命名文件

- 模板：`assets/template.html`
- 多风格参考：`examples/*.html`
- 输出目录：`architecture-diagrams/`
- 文件名：`YYYYMMDD-<slug>.html`（小写+连字符）

### 风格选择建议

- `minimal-dark`：默认工程风，适合技术文档
- `minimal-light`：明亮简洁，适合产品文档或汇报材料
- `blueprint-grid`：基础设施/平台架构，强调边界与网格
- `editorial-cards`：评审叙事风，配合总结卡片讲设计取舍

### 2) 放置组件

- 左到右表示主链路（客户端 -> 服务 -> 数据）
- 边界框用于表示 region/cluster/security group
- 图中同类组件用相同语义色（见 conventions）

### 3) 绘制连接

- 普通数据流：实线箭头
- 认证/安全流：虚线（或 rose 色高亮）
- 连接线应在组件底层，避免遮挡文字标签

### 4) 更新说明卡片

保留三张 summary cards，建议分别承载：

- 核心组件
- 安全与网络边界
- 可扩展性与风险点

### 5) 交付确认

向用户报告：

- 输出文件路径
- 主要组件与连接是否完整覆盖
- 下一轮可修改项（布局/颜色/组件层次）

## 与 codebase-wiki 自动联动

初始化时会自动检测目标仓库是否存在 `codebase-wiki/`：

- 若存在：自动生成桥接文件
  - `<source-dir>/ARCHITECTURE-DIAGRAM-LINKS.md`
  - `architecture-diagrams/<SOURCE-NAME>-LINKS.md`
- 当前内置检测目录：`codebase-wiki/`、`project-wiki/`、`curated-reads/`、`org-wiki/`
- 若都不存在：跳过联动，后续这些 skill 初始化时也会再次自动检测并补齐

## 资源索引

| 路径 | 说明 |
| --- | --- |
| `assets/template.html` | 深色主题架构图基础模板 |
| `examples/README.md` | 示例索引与选型建议 |
| `examples/*.html` | 多风格示例（dark/light/blueprint/editorial） |
| `references/CONVENTIONS.md` | 配色、命名、布局与质量检查规则 |
| `scripts/init-architecture-diagram.mjs` | 在目标仓库初始化 `architecture-diagrams/` 与模板，并自动检测 `codebase-wiki/` 生成 bridge 文件 |
