# 页面模板（DeepWiki 风格，证据驱动）

以下模板供 Agent 生成各分类页面时套用。对标 [DeepWiki](https://deepwiki.com/) 的呈现方式——特别参考了 [shanraisshan/claude-code-best-practice](https://deepwiki.com/shanraisshan/claude-code-best-practice) 的页面结构：每页开头列出相关源文件、用图表先行、表格优于长段落、结论绑定具体文件路径、小节末尾附 Sources 行号引用。

---

## 通用规则

### 1. Relevant source files（每个页面必须）

每个页面在正文第一行用 fenced text 块列出相关源文件（对标 DeepWiki "Relevant source files"）：

````markdown
```text
相关源文件：
- src/main.tsx
- src/router/index.ts:1-45
- src/store/user.ts
- vite.config.ts
```
````

文件路径来自 frontmatter `evidence` 或扫描元数据，**必须是仓库中实际存在的路径**。

**升级模式：Primary Source Files 表格**（对标 transformers 的子系统页面）。当页面涉及一个完整子系统时，用表格替代简单列表，增加 Responsibility 列：

````markdown
```text
Primary Source Files:

| 文件 | 职责 |
|------|------|
| src/generation/utils.py | GenerationMixin 基类与生成入口 |
| src/generation/configuration_utils.py | GenerationConfig 参数管理 |
| src/generation/logits_process.py | Logits 后处理器链 |
```
````

### 2. 标题与编号

页面标题使用 `# {section} {title}` 格式，与 `doc_plan.json` 的 `section` 对齐：

```markdown
# 1. 项目简介
# 2.1 组件体系
# 4.3 packages/shared
```

### 3. 图先文后

**每个核心概念**都应先给一张 Mermaid 图或表格，再写文字解释。读者应该在 30 秒内通过图表理解 80% 的信息。

### 4. Mermaid 安全规则

- 使用 `flowchart TB` / `sequenceDiagram` / `graph LR` 等常见类型
- 节点 ID 仅用字母数字：`A[App Shell]` `B[Router]`
- 标签中避免未转义的 `"`、`<>`；少用 `/` 与 `:`
- 复杂系统拆成多张小图，不要一张巨图

### 5. 代码引用格式

关键论断绑定到具体文件路径和行号：

```markdown
路由配置定义在 `src/router/index.ts:12-45`，使用 `createBrowserRouter` 创建数据路由。
```

### 6. Sources 小节引用（DeepWiki 标准）

每个二级小节（`##`）末尾附 **Sources** 行，标注该小节论断的精确代码依据：

```markdown
**Sources:** `src/router/index.ts:12-45`, `src/config/settings.json:1-30`, `README.md:20-37`
```

### 7. 交叉引用导航

页面间的交叉引用使用以下格式（对标 DeepWiki "For details, see X"）：

```markdown
关于具体配置方法，详见 [配置系统](../configuration/4-configuration-system.md)。
关于实现细节和示例，详见 [架构模式](../architecture/5-system-architecture.md)。
```

### 8. 页面开头的上下文导航

每个页面在 Relevant source files 之后、正文之前，增加上下文定位句：

```markdown
本文档介绍了 X 系统的 Y 方面。关于 Z 的配置，详见 [配置系统](...)。关于实现模式和示例，详见 [架构模式](...)。
```

### 9. 结尾可选

```markdown
## 待验证

- [ ] 动态路由的 lazy loading 策略需运行时确认
- [ ] 环境变量 `VITE_API_BASE` 的默认值需核对
```

---

## Section 1 — Overview（项目地图）

### 1. 项目简介（`overview/1-introduction.md`）

1. **一句话定位**（从 `package.json` name/description + README 首段综合）
2. **核心功能**（3-5 个 bullet points）
3. **技术栈表格**（来自 `repo.json.signals`）：

   | 分类 | 技术 | 配置文件 |
   |------|------|----------|
   | 框架 | React 18 | — |
   | 构建 | Vite 5 | `vite.config.ts` |
   | 路由 | React Router v6 | `src/router/index.ts` |
   | 状态 | Zustand | `src/store/` |
   | 样式 | Tailwind CSS | `tailwind.config.ts` |
   | 测试 | Vitest + Playwright | `vitest.config.ts` |

4. **仓库结构树**（表格或 tree 代码块）：

   | 目录 | 用途 | 文件数 |
   |------|------|--------|
   | `src/` | 应用源码 | 125 |
   | `src/components/` | UI 组件 | 42 |
   | `src/pages/` | 页面组件 | 18 |
   | `public/` | 静态资源 | 5 |

5. **推荐阅读顺序**（有序列表，链到本站其他页）

### 1.1 Monorepo 布局（若 workspace > 0）

1. 工作区包表格（名称 | 路径 | 职责 | 主要依赖）
2. 包依赖关系图（Mermaid flowchart）
3. 共享代码策略

### 1.x 技术栈总览

- 按**框架层、构建层、质量层、部署层**分组的详细表格
- 各工具的版本、配置文件位置、关键配置项
- 与同类技术的选型理由（如有 README 或 PR 记录）

---

## Section 2 — Getting Started（快速上手）

对标 DeepWiki 的 "Getting Started" 章节——让新人在 5 分钟内跑起来。

### 2. 快速上手（`getting-started/2-quick-start.md`）

1. **前置条件表格**：

   | 工具 | 最低版本 | 检查命令 |
   |------|----------|----------|
   | Node.js | 18+ | `node --version` |
   | pnpm | 8+ | `pnpm --version` |

2. **安装步骤**（编号列表，可复制命令）：
   ```bash
   git clone <repo-url>
   cd <project>
   pnpm install
   pnpm dev
   ```

3. **验证成功**（打开浏览器看到什么 / 命令输出什么）

### 2.1 安装与配置详解

1. 依赖管理工具选择（npm / yarn / pnpm / bun）
2. 认证配置（若需要私有 registry 或 token）
3. IDE 推荐配置（VSCode 插件、settings 等）

### 2.2 仓库结构速查（`getting-started/2.2-repository-structure.md`）

1. **目录映射表**（对标 DeepWiki "Directory Structure Mapping"）：

   | 目录 | 系统/功能 | 文件类型 |
   |------|-----------|----------|
   | `.claude/commands/` | 工作流编排 | Markdown |
   | `.claude/agents/` | 自治代理 | Markdown |
   | `src/` | 应用源码 | TypeScript |

2. **核心文件速查**（表格：文件 | 用途 | 何时需要修改）

---

## Section 3 — Core Concepts（核心概念）

对标 DeepWiki 的 "Core Concepts" 章节——父页面用关系图展示所有概念间的关系，每个概念有独立子页面。

### 3. 核心概念总览（`concepts/3-core-concepts.md`）

1. **一句话概述**
2. **系统关系图**（Mermaid flowchart，展示所有核心概念间的关系）：

   ```mermaid
   flowchart TB
     Commands --> Agents
     Commands --> Skills
     Agents --> Skills
     Memory --> Commands
     Memory --> Agents
     Rules --> Memory
   ```

3. **Comparison Matrix**（对比矩阵，**核心模式**）：

   | 概念 | 文件位置 | 上下文 | 调用方式 | 用途 |
   |------|----------|--------|----------|------|
   | **Commands** | `.claude/commands/` | 当前会话 | 用户 `/command` | 工作流编排 |
   | **Agents** | `.claude/agents/` | 隔离上下文 | Agent 工具 | 自治执行 |
   | **Skills** | `.claude/skills/` | 当前或隔离 | Skill 工具/预加载 | 知识注入 |

4. **子页面导航表**：

   | 页面 | 内容 | 详见 |
   |------|------|------|
   | 3.1 Commands | 命令系统详解 | [Commands](./3.1-commands.md) |
   | 3.2 Agents | 代理与子代理 | [Agents](./3.2-agents.md) |

5. **Built-in Components 速查表**（对标 DeepWiki "Built-in Components"，列出项目内置的组件数量）

### 3.x 单个核心概念（每个概念一篇子页面）

每篇子页面结构：

1. **定义与用途**
2. **文件结构**（YAML frontmatter 示例 + 目录位置）
3. **Key Characteristics**（3-5 个特性，分 bullet points）
4. **执行流程图**（Mermaid sequenceDiagram）
5. **配置示例**（完整的、可工作的代码块）
6. **Sources**（行号引用）

---

## Section 4 — Configuration System（配置系统）

对标 DeepWiki 的 "Configuration System" 章节——强调优先级层次和安全边界。

### 4. 配置系统总览（`configuration/4-configuration-system.md`）

1. **配置层次图**（Mermaid flowchart，从高优先级到低优先级）
2. **Configuration Hierarchy Table**（核心表格）：

   | 优先级 | 文件/来源 | 范围 | Git 追踪 | 说明 |
   |--------|-----------|------|----------|------|
   | 1（最高） | 组织策略 | 全组织 | N/A | 无法覆盖 |
   | 2 | CLI 参数 | 单次会话 | N/A | 临时覆盖 |
   | 3 | `.local.json` | 项目 | 否 | 个人偏好 |
   | 4 | `settings.json` | 项目 | 是 | 团队共享 |
   | 5（最低） | `~/.config/` | 用户 | N/A | 全局默认 |

3. **子页面导航表**

### 4.1 权限与安全

1. 权限模型图
2. 沙箱安全边界
3. 允许/禁止的工具清单

### 4.2 环境变量

1. 环境变量清单表格（变量名 | 用途 | 默认值 | 来源文件）
2. 多环境配置（dev / staging / production）

### 4.x 其他配置子话题

按检测到的配置种类动态生成。

---

## Section 5 — Architecture Patterns（架构设计）

### 5. 系统架构（`architecture/5-system-architecture.md`）

1. **架构一句话** + 设计目标
2. **Architecture Layer Table**（对标 DeepWiki "System Architecture Overview"）：

   | 层级 | 文件位置 | 用途 |
   |------|----------|------|
   | Interface | CLI, slash commands | 用户交互入口 |
   | Orchestration | `.claude/commands/`, `.claude/agents/` | 工作流执行 |
   | Supporting | `CLAUDE.md`, `.claude/settings.json` | 上下文与配置 |

3. **分层架构图**（Mermaid）：

   ```mermaid
   flowchart TB
     UI[UI Layer<br/>React Components] --> State[State Layer<br/>Zustand Stores]
     State --> API[API Layer<br/>Axios + React Query]
     API --> Server[Backend API]
     UI --> Router[Router<br/>React Router v6]
   ```

4. **层级职责表格**：

   | 层级 | 目录 | 职责 | 可依赖 | 禁止依赖 |
   |------|------|------|--------|----------|
   | UI | `src/components/` | 展示与交互 | State, Utils | API 直调 |
   | State | `src/store/` | 全局状态 | API | UI |
   | API | `src/api/` | 网络请求 | Utils | UI, State |

5. **关键设计决策**（2-4 条，每条绑定 evidence + Sources 行号）

### 5.1 组件体系

1. 组件分层图（Atomic Design / Feature-based / 自定义）
2. 命名约定与目录结构
3. 关键组件清单（表格：组件 | 路径 | 用途 | props 概要）
4. 设计系统 / UI 库的使用模式

### 5.2 路由系统

1. 路由类型说明（文件系统路由 / 配置式路由）
2. 路由表概览（表格或 Mermaid 图）
3. 布局嵌套与 parallel routes
4. 路由守卫 / 中间件 / 权限控制
5. 代码分割与 lazy loading 策略

### 5.x 其他架构模式

对标 DeepWiki 的 Architecture Patterns 子页面模式。如检测到以下模式，各生成独立子页面：

- **编排模式**（Command → Agent → Skill 三层编排）
- **内存/持久化架构**（Agent Memory Architecture）
- **自演化模式**（Self-Evolution and Documentation Maintenance）
- **团队协作模式**（Agent Teams）

每个模式子页面包含：
1. 模式概述
2. 执行流程图（Mermaid sequenceDiagram）
3. 文件结构与配置示例
4. 使用场景与限制
5. Sources 行号引用

---

## Section 6 — Extension Mechanisms（扩展机制）

对标 DeepWiki 的 "Extension Mechanisms" 章节——文档化项目的所有扩展点。

### 6. 扩展机制总览（`extensions/6-extension-mechanisms.md`）

1. **一句话概述**（项目提供哪些扩展方式）
2. **扩展点总览图**（Mermaid flowchart）
3. **扩展类型对比表**：

   | 扩展类型 | 位置 | 触发方式 | 执行环境 | 用途 |
   |----------|------|----------|----------|------|
   | Hooks | `.hooks/` | 事件驱动 | 确定性脚本 | 自动化 |
   | Plugins | `plugins/` | 注册式 | 主进程 | 功能扩展 |
   | Middleware | `middleware/` | 链式 | 请求管道 | 请求处理 |

### 6.1 Hooks / 生命周期系统

1. 事件清单（表格：事件名 | 触发时机 | 可获取的上下文）
2. Hook 注册方式
3. 示例配置

### 6.2 插件系统

1. 插件结构
2. 注册与加载流程
3. 分发与安装

### 6.x 其他扩展类型

按检测结果动态生成（MCP Servers、CLI Integration 等）。

---

## Section 7 — Modules（核心模块）

### 7. 核心模块剖析

总览章节：
1. **模块依赖关系图**（Mermaid，基于 import 图谱的 Hub 文件数据）
2. **模块概览表格**：

   | 模块 | 路径 | 职责 | 对外 API | 被引用次数 |
   |------|------|------|----------|------------|
   | Auth | `src/modules/auth/` | 认证与授权 | `useAuth`, `authStore` | 15 |

### 7.x 单个模块 / 工作区包

每个重要模块或 workspace 包一篇：

1. **职责一句话**
2. **文件结构**（tree 或表格）
3. **对外 API**（导出、路由、公共 Hook）
4. **主要依赖**（仅最关键的 import 方向）
5. **内部流程图**（Mermaid，如有复杂逻辑）
6. **设计取舍与技术债**

---

## Section 8 — Data Flow（数据流）

### 8. 核心数据流

1. **主数据路径**（sequenceDiagram）：

   ```mermaid
   sequenceDiagram
     participant User
     participant Component
     participant Store
     participant API
     participant Server

     User->>Component: 点击操作
     Component->>Store: dispatch action
     Store->>API: 发起请求
     API->>Server: HTTP Request
     Server-->>API: Response
     API-->>Store: 更新状态
     Store-->>Component: re-render
   ```

2. **全局状态结构**（store 文件、Context、URL 等位置）
3. **服务端数据**（SSR/RSC/loader 与客户端 hydration 边界，若存在）
4. **错误与加载状态传播**

### 8.1 状态管理详解

1. Store 文件清单与职责表格
2. 状态树结构图
3. 副作用处理模式（middleware / effects / subscriptions）
4. 持久化策略（localStorage / URL / cookie）

### 8.2 API 与网络层

1. 请求封装模式（拦截器、重试、缓存）
2. 类型安全策略（代码生成 / 手写类型 / Zod 验证）
3. 错误处理与用户提示
4. Base URL 与环境变量配置
5. WebSocket / SSE（若存在）

---

## Section 9 — Development Workflows（开发工作流）

对标 DeepWiki 的 "Development Workflows" 章节——记录项目中实际使用的开发模式。

### 9. 工作流总览（`workflows/9-development-workflows.md`）

1. **一句话概述**
2. **工作流清单表**：

   | 工作流 | 用途 | 入口命令 | 详见 |
   |--------|------|----------|------|
   | 本地开发 | 日常编码 | `pnpm dev` | [9.1](./9.1-build-and-deploy.md) |
   | 测试 | 质量保障 | `pnpm test` | [9.2](./9.2-testing.md) |
   | CI/CD | 自动部署 | Git push | [9.3](./9.3-ci-cd.md) |

### 9.1 构建与部署

1. **package.json scripts 说明表**：

   | 命令 | 用途 | 底层工具 |
   |------|------|----------|
   | `dev` | 本地开发 | Vite |
   | `build` | 生产构建 | Vite |
   | `test` | 单元测试 | Vitest |
   | `lint` | 代码检查 | ESLint |

2. **本地开发最小命令**
3. **构建产物目录**与部署配置（Dockerfile / CI yaml / Vercel / Netlify）
4. **环境变量表格**（来自 `.env.example`）
5. **CI/CD 流程图**（若有 GitHub Actions / GitLab CI 等）

### 9.2 测试策略

1. 测试框架与配置
2. 测试类型分布（单元 / 集成 / E2E）
3. 测试命名约定与目录结构
4. Mock 策略

### 9.3 CI/CD

1. CI pipeline 流程图（Mermaid）
2. 各阶段说明（lint → test → build → deploy）
3. 分支策略与部署环境映射

### 9.x 其他工作流模式

按检测结果动态生成。如发现以下模式则各生成子页面：

- 跨模型开发工作流（Cross-Model Development）
- 阶段式开发（Plan Mode / Phase-Gated Development）
- RPI 工作流（Research-Plan-Implement）
- 定时任务与长期运行工作流

---

## Section 10 — Best Practices（最佳实践与故障排查）

对标 DeepWiki 的 "Best Practices and Troubleshooting" 章节。

### 10. 最佳实践总览（`best-practices/10-best-practices.md`）

1. **最佳实践清单**（表格：实践 | 原因 | 相关配置/文件）
2. **常见陷阱**（反模式列表，每个附解决方案）
3. **子页面导航表**

### 10.1 代码质量

1. **关键指标仪表盘**（表格）：

   | 维度 | 指标 | 值 | 状态 |
   |------|------|-----|------|
   | 复杂度 | 超过 300 行的文件 | 12 | 需关注 |
   | 架构 | 循环依赖 | 3 | 需修复 |

2. **复杂度热力图**（Top 10 复杂文件）
3. **改进优先级矩阵**

### 10.2 架构违规

1. **循环依赖图**（Mermaid flowchart）
2. **层级违规清单**
3. **重构路线图**（按优先级排列的行动项）

### 10.x 其他实践话题

按项目情况动态生成（Context Engineering、权限配置模式、调试与诊断等）。

---

## Section 11 — Reference（速查索引）

对标 DeepWiki 的 "Reference" 章节——纯速查表，无长段落。

### 11. 参考索引总览（`reference/11-reference.md`）

1. **索引导航表**：

   | 参考 | 条目数 | 详见 |
   |------|--------|------|
   | API 速查 | 42 个导出 | [11.1](./11.1-api-reference.md) |
   | 配置项速查 | 15 个字段 | [11.2](./11.2-config-reference.md) |

### 11.1 API 速查表

纯表格页面（对标 DeepWiki "Commands Reference" / "Settings Fields Reference"）：

| 名称 | 文件 | 类型 | 参数 | 返回值 | 用途 |
|------|------|------|------|--------|------|
| `useAuth` | `src/hooks/useAuth.ts:5` | Hook | — | `AuthState` | 认证状态 |

### 11.2 配置项速查表

| 字段 | 类型 | 默认值 | 文件 | 说明 |
|------|------|--------|------|------|
| `model` | string | `sonnet` | `settings.json` | 默认模型 |

### 11.3 Hooks 速查表

| Hook 名 | 文件 | 参数 | 返回值 | 用途 |
|---------|------|------|--------|------|
| `useAuth` | `src/hooks/useAuth.ts` | — | `{ user, login }` | 认证 |

---

## Section 12 — Glossary（术语表）

对标 DeepWiki 的 "Glossary" 章节——独立的术语速查页面。

### 12. 术语表（`glossary/12-glossary.md`）

对标 transformers 的 Glossary 页面——不仅有术语定义表，还包含 Code Entity Mapping 图和 Technical Jargon Table。

#### 12.a 术语定义表

| 术语 | 定义 | 首次出现 | 相关页面 |
|------|------|----------|----------|
| Hub 文件 | 被 5+ 其他文件导入的文件 | `imports.json` | [7. 模块](../modules/7-core-modules.md) |
| God 文件 | 职责过多、行数过大的文件 | `violations.json` | [10.2 架构违规](../best-practices/10.2-architecture-violations.md) |

术语按字母/拼音排序，每个术语附定义、首次出现位置、链接到相关页面。

#### 12.b Code Entity Mapping（概念到代码的映射图）

对标 transformers Glossary 中的 "Model Loading Lifecycle"、"Trainer Execution Flow" 等 Mermaid 图——将抽象概念映射到具体代码实体的生命周期流程：

```mermaid
flowchart LR
    A["AutoModel.from_pretrained()"] --> B[config.json]
    B --> C[ModelClass 选择]
    C --> D[权重加载]
    D --> E[model.eval()]
```

为项目中最重要的 2-3 个生命周期/流程各画一张映射图，嵌入在术语表页面中。

#### 12.c Technical Jargon Table（技术术语速查表）

在术语定义表之后，用紧凑表格快速索引项目中频繁出现的技术术语——每个附 Code Pointer（精确到文件或类名）：

```markdown
| 术语 | 定义 | Code Pointer |
|------|------|-------------|
| Attention Mask | 控制哪些 token 参与注意力计算 | `modeling_utils.py:AttentionMixin` |
| KV Cache | 缓存 key-value 对以加速自回归生成 | `cache_utils.py:DynamicCache` |
| Logits Processor | 生成时对 logits 进行后处理的链 | `logits_process.py:LogitsProcessorList` |
```

---

## Section 13 — Health（项目健康仪表盘）

### 13. 项目健康仪表盘（`health/13-project-health.md`）

1. **健康度雷达图**（Mermaid 或表格，5 个维度）：

   | 维度 | 分数 | 说明 |
   |------|------|------|
   | 依赖健康 | 7/10 | 2 个重量级依赖 |
   | 测试覆盖 | 4/10 | 覆盖比 0.12 |
   | 代码质量 | 6/10 | 3 个循环依赖 |
   | 活跃度 | 9/10 | 近 30 天有 45 次提交 |
   | 文档完整度 | 5/10 | 缺少 API 文档 |

2. **风险清单**（High / Medium / Low 分级）
3. **改进路线图**（短期 / 中期 / 长期）

### 13.1 依赖健康度详解

1. **依赖分类表格**（直接 / 开发 / Peer）
2. **重量级依赖分析**（大小影响、替代方案）
3. **版本策略**（固定版本 vs 范围版本的占比）
4. **安全风险**（已知的 deprecated 或有漏洞的依赖）
5. **依赖树可视化**（Mermaid flowchart，只展示顶层）

### 13.2 测试覆盖分析

1. **覆盖分布表格**（按目录统计：目录 | 源文件数 | 测试文件数 | 覆盖率）
2. **未覆盖的重要文件**（表格 + 优先级标注）
3. **测试类型分布**（单元测试 / 集成测试 / E2E）
4. **测试策略建议**（哪些模块应优先补充测试）

### 13.3 Git 活跃度与演化

1. **提交频率趋势图**（表格或列表：按月统计）
2. **热文件分析**（频繁变更 = 高风险或核心文件）
3. **贡献者分布**（核心维护者 vs 偶尔贡献者）
4. **代码演化趋势**（文件增长、删除、重命名的趋势）

### 13.4 执行流全景

1. **关键执行流清单**（表格：流程名 | 入口 | 步骤数 | 涉及模块）
2. **关键业务流程图**（Mermaid sequenceDiagram，每个核心流程一张）
3. **跨模块调用链**（展示模块间的协作关系）
4. **性能关键路径**（标注可能的瓶颈点）

---

## 大型库/框架专用模板

以下模板适用于按子系统组织的大型库/框架项目（详见 `structure-and-heuristics.md` §2.4 和 §4 "大型库/框架"）。对标 [huggingface/transformers](https://deepwiki.com/huggingface/transformers) 的页面结构。

### 子系统父页面模板

每个子系统（如 Training System、Generation System）的父页面：

1. **一句话概述** — 该子系统在整体 pipeline 中的位置
2. **Component Map**（核心表格）：

   | 文件 | 职责 |
   |------|------|
   | `src/training/trainer.py` | `Trainer` 主类，训练循环 |
   | `src/training/training_args.py` | `TrainingArguments` 配置 |
   | `src/training/data_collator.py` | 数据整理与 padding |

3. **子系统架构图**（Mermaid flowchart，展示组件间关系）
4. **子页面导航表**
5. **交叉引用** — 链接到依赖的其他子系统

### Architecture Family 父页面模板

当需要按"类型族"拆分时（如模型架构、插件类型）：

1. **一句话概述**
2. **Architecture Family Table**（索引表格）：

   | 架构族 | 代表实现 | 关键差异 | 详见 |
   |--------|----------|----------|------|
   | Encoder-only | BERT, RoBERTa | 双向注意力 | [5.1](./5.1-encoder-models.md) |
   | Decoder-only | GPT-2, LLaMA | 因果注意力 | [5.2](./5.2-decoder-models.md) |

3. **共享基类图**（Mermaid，展示继承关系）
4. **跨架构对比矩阵**（Comparison Matrix）

### 核心类详解页面模板

子系统中的关键类/模块的深入页面：

1. **类定位** — 继承关系 + 文件位置
2. **Method/Class 速查表**：

   | 方法 | 用途 | 位置 |
   |------|------|------|
   | `forward()` | 前向传播 | `modeling_bert.py:300-400` |
   | `from_pretrained()` | 加载预训练权重 | `modeling_utils.py:1200-1350` |

3. **参数分组表格**（当参数 > 15 个时）：

   | 分组 | 关键参数 | 说明 |
   |------|----------|------|
   | **模型结构** | `hidden_size`, `num_layers`, `num_heads` | 模型维度 |
   | **训练控制** | `learning_rate`, `warmup_steps`, `weight_decay` | 优化参数 |
   | **正则化** | `dropout`, `attention_dropout`, `hidden_dropout` | 防过拟合 |

4. **执行流程图**（Mermaid sequenceDiagram，展示方法调用链）
5. **配置示例**（完整可工作代码块）
6. **Sources**
