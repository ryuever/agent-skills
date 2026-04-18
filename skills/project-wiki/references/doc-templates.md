# 页面模板（DeepWiki 风格，证据驱动）

以下模板供 Agent 生成各分类页面时套用。对标 [DeepWiki](https://deepwiki.com/) 的呈现方式：每页开头列出相关源文件、用图表先行、表格优于长段落、结论绑定具体文件路径。

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

### 6. 结尾可选

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

## Section 2 — Architecture（架构设计）

### 2. 系统架构（`architecture/2-system-architecture.md`）

1. **架构一句话** + 设计目标
2. **分层架构图**（Mermaid）：

   ```mermaid
   flowchart TB
     UI[UI Layer<br/>React Components] --> State[State Layer<br/>Zustand Stores]
     State --> API[API Layer<br/>Axios + React Query]
     API --> Server[Backend API]
     UI --> Router[Router<br/>React Router v6]
   ```

3. **层级职责表格**：

   | 层级 | 目录 | 职责 | 可依赖 | 禁止依赖 |
   |------|------|------|--------|----------|
   | UI | `src/components/` | 展示与交互 | State, Utils | API 直调 |
   | State | `src/store/` | 全局状态 | API | UI |
   | API | `src/api/` | 网络请求 | Utils | UI, State |

4. **关键设计决策**（2-4 条，每条绑定 evidence）

### 2.1 组件体系

1. 组件分层图（Atomic Design / Feature-based / 自定义）
2. 命名约定与目录结构
3. 关键组件清单（表格：组件 | 路径 | 用途 | props 概要）
4. 设计系统 / UI 库的使用模式

### 2.2 路由系统

1. 路由类型说明（文件系统路由 / 配置式路由）
2. 路由表概览（表格或 Mermaid 图）
3. 布局嵌套与 parallel routes
4. 路由守卫 / 中间件 / 权限控制
5. 代码分割与 lazy loading 策略

---

## Section 3 — Concepts（核心概念）

### 3. 核心概念与术语表

1. **术语表**（表格列：术语 | 含义 | 首次出现位置）
2. **核心类型 / 接口**（精选 3-5 个最重要的，用 TypeScript 代码块展示）
3. **配置项表**（环境变量名 | 用途 | 默认值 | 来源文件）

---

## Section 4 — Modules（核心模块）

### 4. 核心模块剖析

总览章节：
1. **模块依赖关系图**（Mermaid，基于 import 图谱的 Hub 文件数据）
2. **模块概览表格**：

   | 模块 | 路径 | 职责 | 对外 API | 被引用次数 |
   |------|------|------|----------|------------|
   | Auth | `src/modules/auth/` | 认证与授权 | `useAuth`, `authStore` | 15 |

### 4.x 单个模块 / 工作区包

每个重要模块或 workspace 包一篇：

1. **职责一句话**
2. **文件结构**（tree 或表格）
3. **对外 API**（导出、路由、公共 Hook）
4. **主要依赖**（仅最关键的 import 方向）
5. **内部流程图**（Mermaid，如有复杂逻辑）
6. **设计取舍与技术债**

---

## Section 5 — Data Flow（数据流）

### 5. 核心数据流

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

### 5.1 状态管理详解

1. Store 文件清单与职责表格
2. 状态树结构图
3. 副作用处理模式（middleware / effects / subscriptions）
4. 持久化策略（localStorage / URL / cookie）

### 5.2 API 与网络层

1. 请求封装模式（拦截器、重试、缓存）
2. 类型安全策略（代码生成 / 手写类型 / Zod 验证）
3. 错误处理与用户提示
4. Base URL 与环境变量配置
5. WebSocket / SSE（若存在）

---

## Section 6 — Operations（工程运维）

### 6. 构建、测试与部署

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
