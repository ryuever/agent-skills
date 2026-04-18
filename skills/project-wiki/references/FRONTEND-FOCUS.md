# 前端项目阅读清单（Agent 补充视角）

当 `repo.json.signals` 表明存在 **React / Vue / Svelte / Next / Nuxt / Astro / Vite / Webpack** 等时，在撰写 `architecture`、`modules`、`dataflow` 时优先核对下列线索（有则写，无则跳过，勿硬编）。

---

## 1. 入口与渲染

- **Vite**：`index.html` 指向的脚本、`vite.config.*` 的 alias、plugins。
- **Next.js**：`app/` 与 `pages/` 是否并存、`layout.tsx`、`loading.tsx`、Route Handlers。
- **Nuxt / Astro**：内容路由、`src/pages` 或 `src/app` 约定。

---

## 2. 路由

- 声明式路由表（React Router、Vue Router、TanStack Router 等）所在文件。
- 文件系统路由规则（Next/Nuxt/SvelteKit）。
- 布局嵌套与 parallel routes（若存在）。

---

## 3. 状态与数据获取

- 全局 store：`store.ts`、`*.slice.ts`、`pinia`、`zustand` 等目录模式。
- 服务端状态：React Query / SWR / RTK Query 的 `queryClient` 与默认 `staleTime` 等（点到为止）。
- **Context**：列出「跨多层级传递」的 Provider 文件。

---

## 4. 样式与组件体系

- CSS Modules、Tailwind、`styled-*`、UnoCSS 的配置文件路径。
- 设计系统 / 组件库：内部 `packages/ui` 或外部依赖（来自 `dependencies`）。

---

## 5. 网络层

- `fetch` 封装、`axios` instance、`openapi` 生成客户端目录。
- API base URL 与环境变量（`.env.example`）。

---

## 6. 质量与类型

- `tsconfig.json` 的 `strict`、path aliases。
- ESLint / Prettier / Stylelint 配置文件。

---

## 7. 给前端读者的叙述风格

- 多用 **「从页面到请求」** 的动线，少用抽象名词堆砌。
- 组件文件超过 200 行时，**不要全文引用**；用目录索引 + 1 个典型片段。
- TypeScript 泛型在 Markdown 中易破坏 VitePress；skill 已配置将裸 `<>` 转义，但仍建议代码放 ` ```ts ` 块内。
