# Architecture Diagram Conventions

本规范用于约束 `architecture-diagrams/` 下生成的 HTML 架构图。

## 1. 输出格式

- 文件格式：`.html`（单文件自包含）
- 图形：内联 `<svg>`
- 样式：内联 `<style>`
- 禁止依赖本地图片或外部脚本才能渲染主体图

## 2. 文件命名

- 使用 `YYYYMMDD-kebab-case.html`
- 示例：`20260421-saas-core-architecture.html`
- 禁止空格、大写、下划线

## 3. 语义配色（建议）

| 类型 | Fill | Stroke |
| --- | --- | --- |
| Frontend | `rgba(8,51,68,0.4)` | `#22d3ee` |
| Backend | `rgba(6,78,59,0.4)` | `#34d399` |
| Database | `rgba(76,29,149,0.4)` | `#a78bfa` |
| Cloud | `rgba(120,53,15,0.3)` | `#fbbf24` |
| Security | `rgba(136,19,55,0.4)` | `#fb7185` |
| Generic | `rgba(30,41,59,0.5)` | `#94a3b8` |

## 4. 布局规则

- 主链路遵循左到右，减少交叉线
- 组件最小垂直间距建议 32px
- 连接箭头先画，组件后画，降低遮挡
- Legend 放在所有边界框之外（通常底部）

## 5. 文案规则

- 组件名简短明确（如 `API Gateway`, `User Service`, `PostgreSQL`）
- 子标签承载协议/端口/技术栈（如 `HTTPS`, `:5432`, `Node.js`）
- 中文文档可用中英混排，技术名保持英文

## 6. 质量检查清单

生成后至少检查：

1. 所有关键组件都出现在图中
2. 关键连接方向正确（尤其认证链路）
3. 边界框不遮挡组件或 legend
4. 在浏览器 100% 缩放下文字可读
5. 文件可直接双击打开并完整渲染
