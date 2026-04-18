# 前端项目深度阅读清单（Agent 补充视角）

当 `repo.json.signals` 或 `entrypoints.json` 表明存在前端框架时，在撰写各 Section 时按以下清单逐项核对（有则写，无则跳过，勿硬编）。

---

## 1. 入口与渲染（→ Section 1, 2）

| 框架 | 关注点 |
|------|--------|
| **Vite** | `index.html` 指向的脚本、`vite.config.*` 的 `resolve.alias`、`plugins`、`define` |
| **Next.js** | `app/` 与 `pages/` 是否并存、`layout.tsx`、`loading.tsx`、Route Handlers、`middleware.ts` |
| **Nuxt** | `nuxt.config.ts` 的 `modules`、`app/` 目录约定、`server/api/` |
| **Astro** | `src/pages/`、islands 架构、`astro.config.*` 的 integrations |
| **CRA / Webpack** | `webpack.config.*` 的 entry/output、`src/index.tsx` |

入口信息来自 `entrypoints.json.candidates`。

---

## 2. 路由（→ Section 2.x）

来自 `entrypoints.json.routes` 的检测结果：

| 模式 | 叙述重点 |
|------|----------|
| **文件系统路由** | 目录约定、动态段 `[id]`、catch-all `[...slug]`、分组 `(group)` |
| **配置式路由** | 路由表文件位置、嵌套布局、index route |
| **React Router v6+** | `createBrowserRouter` vs JSX Routes、loader/action 数据路由 |
| **Vue Router** | `createRouter` 配置、navigation guards、route meta |
| **TanStack Router** | `createRootRoute`、type-safe 路由、search params |

补充关注：
- **代码分割**: `React.lazy()` / `defineAsyncComponent` / 动态 `import()`
- **权限路由**: ProtectedRoute / middleware / beforeEach guard
- **布局嵌套**: Layout 组件树、Outlet / router-view

---

## 3. 状态管理（→ Section 5.1）

来自 `entrypoints.json.stateManagement` 的检测结果：

| 方案 | 深入方向 |
|------|----------|
| **Redux Toolkit** | `configureStore` 位置、slice 文件列表、`createAsyncThunk` 使用、middleware |
| **Zustand** | `create()` 的 store 文件、selector 模式、`persist` 中间件 |
| **Pinia** | `defineStore` 文件列表、composition vs options 风格 |
| **MobX** | `makeAutoObservable` 的 store 类、reaction/autorun |
| **React Context** | Provider 层级关系、Context 文件清单、避免 re-render 策略 |
| **TanStack Query / SWR** | `queryClient` 配置、`staleTime`、cache 策略、mutation 模式 |

补充关注：
- **状态持久化**: localStorage / sessionStorage / cookie / URL search params
- **状态初始化**: SSR hydration / loader data / default values
- **DevTools**: Redux DevTools / Zustand DevTools 配置

---

## 4. 网络层（→ Section 5.2）

来自 `entrypoints.json.networkLayer` 的检测结果：

| 模式 | 深入方向 |
|------|----------|
| **Axios 封装** | instance 创建、interceptor（request/response）、error 处理 |
| **Fetch 封装** | wrapper 函数、headers 注入、timeout 处理 |
| **tRPC** | router 定义、client 创建、procedure 类型 |
| **GraphQL** | schema / queries / mutations 位置、codegen 配置 |
| **OpenAPI 生成** | 生成器工具（openapi-typescript 等）、生成目录 |

补充关注：
- **Base URL 配置**: `.env.example` 中的 API 地址变量
- **认证 Token**: 注入方式（header interceptor / cookie）
- **错误码映射**: HTTP status → 用户提示的转换逻辑
- **Mock 数据**: MSW / json-server / 本地 mock 文件

---

## 5. 样式与组件体系（→ Section 2.1）

来自 `entrypoints.json.components` 的检测结果：

| 方案 | 关注点 |
|------|--------|
| **Tailwind CSS** | `tailwind.config.*` 的 `theme.extend`、自定义插件 |
| **CSS Modules** | 命名约定、scoped 样式隔离 |
| **CSS-in-JS** | styled-components / Emotion 的 theme provider |
| **UnoCSS** | `uno.config.*`、presets |

组件体系：
- **设计系统**: 内部 `packages/ui` 或外部 UI 库（antd / MUI / shadcn）
- **组件分层**: atoms → molecules → organisms（或 feature-based）
- **命名约定**: PascalCase 文件名、index.tsx barrel export
- **组件文档**: Storybook 配置位置、story 文件模式

---

## 6. 类型系统与代码质量（→ Section 6）

| 工具 | 关注点 |
|------|--------|
| **TypeScript** | `tsconfig.json` 的 `strict`、`paths` 别名、`references` 项目引用 |
| **ESLint** | 规则集（airbnb / standard / 自定义）、import 排序规则 |
| **Prettier / Biome** | 格式化配置、与 ESLint 的集成 |
| **Husky + lint-staged** | pre-commit hook 配置 |

---

## 7. 构建与部署（→ Section 6）

| 环节 | 关注点 |
|------|--------|
| **Bundle 分析** | `vite-plugin-visualizer` / `webpack-bundle-analyzer` |
| **环境变量** | `.env.example` 变量清单、`VITE_` / `NEXT_PUBLIC_` 前缀约定 |
| **Docker** | Dockerfile 构建阶段、nginx 配置 |
| **CI/CD** | GitHub Actions / GitLab CI 的 workflow 文件 |
| **CDN / 部署** | Vercel / Netlify / Cloudflare Pages 配置 |

---

## 8. 叙述风格建议

- 多用 **「从页面到请求」** 的动线，少用抽象名词堆砌
- 组件文件超过 200 行时，**不要全文引用**；用目录索引 + 1 个典型片段
- TypeScript 泛型在 Markdown 中易破坏渲染，放 fenced code block 内
- 表格 > 列表 > 段落，让信息密度最大化
- 每个概念先 Mermaid 图后文字，30 秒内理解 80%
