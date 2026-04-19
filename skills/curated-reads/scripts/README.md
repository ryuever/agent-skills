# curated-reads scripts

| 脚本 | 说明 |
|------|------|
| `init-starlight.mjs` | 在目标仓库生成 Starlight 项目骨架 + 二级分类目录 |
| `regenerate-starlight-sidebar.mjs` | 扫描 `src/content/docs/` 重建 `.starlight/sidebar.generated.mjs` |

## 用法

```bash
# 初始化（在目标仓库根执行）
node <skill-dir>/scripts/init-starlight.mjs --root . --title "Curated Reads"

# 重建侧栏（新增/重命名文档后）
node <skill-dir>/scripts/regenerate-starlight-sidebar.mjs --root .
```

## init-starlight.mjs 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--root <dir>` | 目标仓库根目录 | cwd |
| `--skill-dir <dir>` | curated-reads skill 目录 | parent of scripts/ |
| `--title <string>` | 站点标题 | Curated Reads |
| `--github <url>` | GitHub 仓库 URL（用于社交链接） | — |
| `--force` | 覆盖已有文件 | false |
