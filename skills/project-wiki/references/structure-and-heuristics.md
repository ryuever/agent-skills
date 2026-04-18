# 页面集合与启发式规则

指导 Agent **如何根据 `doc_plan.json` 决定写哪些页面**、合并/拆分策略、以及置信度管理。

---

## 1. 必读输入

| 文件 | 核心字段 |
|------|----------|
| `doc_plan.json` | `section`, `slug`, `required`, `evidence`, `hints` |
| `repo.json` | `signals`（技术栈标签） |
| `structure.json` | `topLevel`, `configFiles`, `fileStats`, `largestFiles` |
| `entrypoints.json` | `candidates`, `routes`, `stateManagement`, `networkLayer`, `components` |
| `imports.json` | `hubFiles`, `heavyImporters`, `topExternalDeps` |

规则：
- `evidence` 为空 **且** `required: false` → **跳过**该页，在 `quality-report.md` 说明
- `required: true` 的页面即使证据较薄也要写（可降低篇幅，标注待验证）
- Agent **可追加**新页面（如发现了脚本未覆盖的子系统），需遵守编号和路径规则

---

## 2. 动态页面语义

| section | slug | 目的 | 无证据时的行为 |
|---------|------|------|----------------|
| 1 | `overview/introduction` | 新人第一张图 | 仍写极简版（基于 `structure.json`） |
| 1.1 | `overview/monorepo-layout` | 工作区布局 | 仅 Monorepo 项目生成 |
| 1.x | `overview/tech-stack` | 技术栈明细 | 始终写（至少有 `package.json`） |
| 2 | `architecture/system-architecture` | 分层与边界 | 有目录结构即可写 |
| 2.1 | `architecture/component-system` | 组件体系 | 组件 > 5 个才生成 |
| 2.2 | `architecture/routing` | 路由系统 | 检测到路由才生成 |
| 3 | `concepts/glossary` | 术语表 | 可选，无类型信号可跳过 |
| 4 | `modules/core-modules` | 模块总览 | 始终写 |
| 4.x | `modules/{pkg-name}` | 单个包/模块 | Monorepo 且包数 ≤ 10 才拆分 |
| 5 | `dataflow/request-and-state` | 数据流总览 | 有状态/网络层信号才写 |
| 5.1 | `dataflow/state-management` | 状态详解 | Store 文件 > 3 才拆分 |
| 5.2 | `dataflow/api-layer` | API 层 | 检测到 API 封装才生成 |
| 6 | `operations/build-and-deploy` | 构建与部署 | 可选，无 scripts 可跳过 |

---

## 3. 规模适配策略

### 小型项目（< 30 源码文件）

- 可合并 Section 1 + 2 为一篇「项目概览与架构」
- 可合并 Section 4 + 5 为一篇「模块与数据流」
- 总页数 3-4 篇即可

### 中型项目（30-300 源码文件）

- 保持 6 个 section 的基本框架
- 每个 section 1-2 篇
- 总页数 6-10 篇

### 大型项目 / Monorepo（> 300 源码文件）

- Section 4 按 workspace 包或功能域拆分
- Section 5 拆分状态管理 + API 层
- Section 2 拆分组件体系 + 路由
- 考虑增加 Section 7（高级主题：性能优化、SSR 策略等）
- 总页数 10-20 篇

### 微前端 / 多入口

- Section 5 数据流用多张 sequence 图，每张对应一个**用户旅程**
- 不要混在一张图里

---

## 4. 置信度与诚实性

- 每篇可在文末增加 **「待验证」** 小节（checklist 格式）
- 文档与 README 冲突时，**以代码为准**并明确指出冲突点
- **不要虚构目录名或文件路径**——必须来自扫描结果或人工确认
- import 图谱基于静态分析，动态 import 和 alias 可能遗漏——在相关页面标注

---

## 5. 编号规则

- 大编号（1, 2, 3...）对应 section 主页
- 子编号（1.1, 1.2, 2.1...）对应子话题页
- 编号在 `doc_plan.json` 中由脚本自动分配，Agent 追加新页面时续接
- 文件名中编号和 slug 用 `-` 连接：`2.1-component-system.md`
- 侧栏按编号数值排序（`regenerate-sidebar.mjs` 自动处理）

---

## 6. 与 codewiki-generator 的差异

- 本 skill 使用 **纯 Node**（`analyze-repo.mjs`），无需 Python
- 分析结果更丰富：含 import 图谱、路由/状态/网络层检测、文件统计
- 页面采用**层级编号**（对标 DeepWiki），而非扁平分类
- 聚焦 VitePress 单一引擎，降低维护成本
- 若团队有自定义扫描器，保留 `doc_plan.json` 的数组结构（`section`, `slug`, `title`, `category`, `required`, `evidence`, `hints`）即可兼容
