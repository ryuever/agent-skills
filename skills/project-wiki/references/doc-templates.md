# 页面模板（证据驱动）

以下模板供 Agent 生成各分类页面时套用。语言由用户在 workflow 中指定（默认中文）。

---

## 通用块

### 相关代码（每个页面开头）

````markdown
```text
证据路径（来自 frontmatter evidence 或扫描）：
- path/to/a.ts
- path/to/b.tsx
```
````

### Mermaid 注意

- 使用 `flowchart TB` / `sequenceDiagram` / `graph LR` 等常见类型。
- 节点定义示例：`A[App shell]` — ID 仅用字母数字。
- 标签中避免未转义的 `"`、`<>`；少用 `/` 与 `:`。
- 复杂 C4 可拆成多张图。

### 结尾可选

```markdown
## 待验证

- [ ] …
```

---

## O — overview/repo-map

1. 一句话项目定位（从 `package.json` name/description 与 README 首段综合）。
2. 仓库顶层树（表格：路径 | 用途推测 | 置信度）。
3. **推荐阅读顺序**（有序列表，链到本站其他页或占位）。
4. 技术栈表格（来自 `repo.json.signals`）。

---

## A — architecture/system-architecture

1. 架构一句话 + 设计目标（性能、可维护性、团队协作等——需有代码或配置佐证）。
2. 分层图（Mermaid）：如 presentation → state → api → domain（按实际调整）。
3. **边界**：哪些代码禁止依赖哪些层（从 import 模式或 eslint 配置推断）。
4. **关键决策**：2–4 条，每条绑定 `evidence` 路径。

---

## G — concepts/glossary

表格列：`术语` | `含义` | `首次出现位置（文件）`。

可选：配置项表（环境变量名 | 用途 | 默认值来源）。

---

## M — modules/core-modules

每个重要模块一小节：

- 职责一句话
- 对外 API（导出、路由表、公共 hook）
- 主要依赖（仅列最关键的 import 方向）
- 子文件索引（可选表格）

---

## F — dataflow/request-and-state

1. **用户操作 → 状态 → 网络 → UI** 主路径（sequenceDiagram）。
2. 全局状态存放位置（store 文件、Context、URL 等）。
3. 服务端数据（SSR/RSC/loader）与客户端 hydration 边界（若存在）。
4. 错误与加载状态如何传播（简要）。

---

## P — operations/build-and-test

1. `package.json` scripts 说明表。
2. 本地开发最小命令（安装、启动、类型检查、测试）。
3. 构建产物目录与部署相关文件（Dockerfile、CI yaml）— 仅在有文件时写。
