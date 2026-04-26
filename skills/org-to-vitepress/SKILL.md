---
name: org-to-vitepress
description: "把 Emacs Org Mode 文件树批量转换成 Markdown（Pandoc 驱动），并用 VitePress 搭建可本地浏览的文档站点，自动按目录结构生成多级侧栏。适用于'把老的 org-mode 笔记迁移成文档站 / 用 VitePress 把 org 文件 serve 起来 / org to markdown 批量转换'等意图。"
---

# Org Mode → VitePress（Org 笔记归档到文档站）

把散落在一个目录树里的 Emacs **Org Mode**（`.org`）文件批量转换为 Markdown，并用 **VitePress** 搭建可本地预览、可构建部署的文档站点。

核心能力：

1. **转换**：以 [Pandoc](https://pandoc.org/) 为默认引擎，将 `.org` → `.md`（GitHub Flavored Markdown），保留标题、代码块、表格、内链、数学公式，并从 `#+title:` 注入 YAML frontmatter。
2. **素材复刻**：同步复制原目录下的 `.png/.jpg/.jpeg/.gif/.svg/.webp/.pdf` 等资源，保持相对路径不变，确保图片/附件引用不会断。
3. **站点脚手架**：一键初始化 `.vitepress/config.mts`、`INDEX.md`、`package.json` 脚本。
4. **自动侧栏**：扫描目标目录树，按「一级目录 → 二级分组 → 文件」生成 `sidebar.generated.mts`，文档内容写入或重命名后一条命令重跑即可同步。

> 所有脚本仅依赖 Node.js 内置模块（ESM `.mjs`），外部只需要系统里有 `pandoc`（或 `pandoc.app`/brew 安装）。

## 加载策略（Progressive Disclosure）

围绕「先可运行，再精修」分层读取：

| 阶段 | 必读内容 |
| --- | --- |
| 仅验证可转换 | `SKILL.md` + `scripts/convert-org-to-md.mjs` 参数说明 |
| 搭建站点 | 上述 + `scripts/init-vitepress.mjs` |
| 侧栏排版优化 | 上述 + `scripts/regenerate-vitepress-sidebar.mjs` |
| 处理异常与边角案例 | 上述 + `references/CONVENTIONS.md` |

不要默认展开全部故障策略；只有遇到异常再读取对应章节。

## 首次运行闸门（First-run Gate）

首次执行前（目标仓库不存在 `org-wiki/` 或用户未提供 `--source`）先确认：

1. 仅校验环境（检查 `pandoc` + 给出命令，不执行转换）
2. 执行完整流水线（转换 + 初始化 + 侧栏）
3. 仅转换内容（暂不初始化站点）

没有明确确认时，不自动开始大批量转换。

## 何时使用

- 用户提供一个 `.org` 文件树（例如老的 Emacs 笔记、导出归档），希望转换为可读的 Markdown 网站
- 用户说「把 org 文件转成 markdown 然后跑一个 VitePress」「用 vitepress 把 org 目录 serve 起来」「把 org-mode 文档迁移到 Markdown 站点」
- 用户想要在现有仓库里额外增加一个「org 归档阅读站」作为只读文档入口

如果用户只是想**新写**一篇 Markdown，不涉及 `.org` 源文件，不需要使用本 skill。

## 首次接入（人类或 Agent 执行）

1. 用 [skills CLI](https://github.com/vercel-labs/skills) 安装本 skill：

   ```bash
   npx skills add <your-github>/agent-skills --skill org-to-vitepress -a cursor -y
   ```

2. 确认系统里有 `pandoc`（macOS 推荐 `brew install pandoc`；Debian/Ubuntu 用 `sudo apt install pandoc`；Windows 用 `choco install pandoc` 或官方安装包）。

   ```bash
   pandoc --version | head -1   # 至少 2.x，建议 3.x
   ```

3. 在**目标仓库根目录**执行完整流水线（把 `<skill-dir>` 替换为已安装的 `org-to-vitepress` 目录，内含 `scripts/`）：

   ```bash
   # ① org → md（输入：源 org 目录；输出：目标仓库下的 org-wiki/）
   node <skill-dir>/scripts/convert-org-to-md.mjs \
       --source /absolute/path/to/org \
       --dest ./org-wiki

   # ② 脚手架 VitePress（生成 .vitepress/ 与 INDEX.md，注入 package.json 脚本）
   node <skill-dir>/scripts/init-vitepress.mjs \
       --root . --title "Org Archive"

   # ③ 生成/刷新侧栏（任何时候新增/重命名 md 都重跑它）
   node <skill-dir>/scripts/regenerate-vitepress-sidebar.mjs --root .

   # ④ 本地预览
   pnpm install
   pnpm run docs:org:dev
   ```

   首次安装依赖后，开发服务默认监听 `http://localhost:5173/`。

## 目录约定

VitePress 内容根目录默认使用 `org-wiki/`，挂载到 VitePress 的 `srcDir`。目录树按**源 org 目录的一级文件夹**组织（例如 `database/`、`linux/`、`react/`），每个文件夹下的 `.md` 会被自动归类到侧栏的同名分组：

```
<repo-root>/
├── .vitepress/
│   ├── config.mts
│   └── sidebar.generated.mts         # 自动生成，勿手改
├── org-wiki/                         # srcDir（可用 --src-dir 改名）
│   ├── INDEX.md                      # 首页
│   ├── database/
│   │   ├── es-aggregation.md
│   │   └── mongodb-map-reduce.md
│   ├── linux/
│   │   └── ...
│   └── react/
│       └── ...
└── package.json                      # 注入 docs:org:dev / build / preview 脚本
```

> `srcDir` 可通过 `--src-dir` 自定义（例如 `docs`、`org-archive`），三个脚本保持一致传入即可。

## 转换细节与约定

详细内容见 `references/CONVENTIONS.md`（Agent 按需阅读）。关键点速览：

- **引擎**：`pandoc -f org -t gfm+tex_math_dollars --wrap=preserve`；若命令缺失，脚本会给出**安装提示**并退出
- **文件名**：小写、空格→连字符、去除 shell 危险字符（如 `*`、`^`、`~`、反引号）；冲突追加 `-2`/`-3` 后缀
- **Frontmatter**：自动注入 `title`（来自 `#+title:`、否则首个 H1，否则去掉后缀的文件名）、`source`（源 org 的相对路径）
- **素材复制**：保持相对路径一致的图片/PDF/GIF/SVG/WebP 与 org 同步复制到 `org-wiki/<dir>/<file>`
- **跳过项**：没有任何可读文本的 `.org` 文件（空壳或二进制残留）、非 `.org` 后缀的临时文件（如 `*.org_archive`、`*.org~`、Emacs 临时缓冲名 `^ls`、`bbdb`、以 `.u1conflict` 结尾的冲突文件等）
- **并发**：Pandoc 进程并发默认 `min(8, CPU)`，用 `--concurrency N` 调节

## Agent 工作流（针对本 skill 的触发场景）

当用户给出一个 `.org` 目录并希望搭建文档站时：

### 第 0 步：确认输入输出

向用户确认：

1. **源 org 目录的绝对路径**（例如 `/Users/.../Downloads/org`）
2. **目标仓库根目录**（默认：当前仓库）
3. **站点标题**（默认 "Org Archive"，用户可覆盖）
4. **srcDir 名称**（默认 `org-wiki`）

### 第 1 步：检查 pandoc

执行 `pandoc --version`。若缺失：

- macOS：建议 `brew install pandoc`
- Debian/Ubuntu：`sudo apt install pandoc`
- 其他：引导到 <https://pandoc.org/installing.html>

**不要**自动替用户安装系统软件；给出命令让用户自行确认。

### 第 2 步：执行转换

```bash
node <skill-dir>/scripts/convert-org-to-md.mjs --source <org-dir> --dest ./org-wiki
```

转换后向用户汇报：**成功多少个、跳过多少个（列出前 10 个原因）、失败多少个**。失败的文件写入 `.org-conversion-errors.log`。

### 第 3 步：脚手架 VitePress

```bash
node <skill-dir>/scripts/init-vitepress.mjs --root . --title "Org Archive"
```

### 第 4 步：生成侧栏并预览

> **必做检查**：只要本次工作流中发生了文档的**新增、删除或重命名**，就**必须**在结束前执行下方 sidebar 脚本。如果跳过此步骤，侧栏导航将与实际文档不同步，用户在站点中无法找到新文档或仍能看到已删除的文档入口。

```bash
node <skill-dir>/scripts/regenerate-vitepress-sidebar.mjs --root .
pnpm install   # 或 npm install / yarn
pnpm run docs:org:dev
```

### 第 5 步：向用户汇报

- 转换结果摘要（成功 / 跳过 / 失败计数）
- 站点访问地址（默认 `http://localhost:5173/`）
- 后续运维提示：**新增或重命名 md 后，只需重跑第 4 步的 sidebar 脚本**，不必再走转换流水线

## 与 architecture-diagram 自动联动

`init-vitepress.mjs` 会自动检测目标仓库是否存在 `architecture-diagrams/`：

- 若存在：自动生成桥接文件
  - `<srcDir>/ARCHITECTURE-DIAGRAM-LINKS.md`（默认 `org-wiki/`）
  - `architecture-diagrams/ORG-TO-VITEPRESS-LINKS.md`
- 若不存在：跳过，不影响 org-to-vitepress 正常使用

手工补联动（可选）：

```bash
node <skill-dir>/scripts/link-architecture-diagrams.mjs --root . --source-dir org-wiki
```

## 反模式

| 反模式 | 正确做法 |
|--------|----------|
| 手改 `.vitepress/sidebar.generated.mts` | 改内容 → 重跑 `regenerate-vitepress-sidebar.mjs` |
| 把 `.org` 复制进 `org-wiki/` 再让 VitePress 渲染 | VitePress 只认 Markdown；必须走 `convert-org-to-md.mjs` |
| 用 sed/awk 自己写 org→md 正则 | 绝大多数 org 语法会被破坏；始终通过 pandoc 转 |
| 把源 `.org` 目录当 srcDir 直接指向 | 站点会报大量解析错误；必须先产出 `.md` |
| 在 SKILL.md 之外修改 scripts/ 里文件的同时不回滚到上游 skill 包 | 本地改动请 PR 到 skill 包；目标仓库不应保留定制脚本 |

## 失败模式与排查

| 现象 | 可能原因 | 排查 |
|------|----------|------|
| `command not found: pandoc` | 未安装 pandoc | 按第 1 步提示安装 |
| 部分文件转换后变空 | 源 `.org` 本身没有有效内容（只包含 `#+TITLE:`） | 查看 `.org-conversion-errors.log`，保留原始文件名但标记为 stub |
| 图片在 VitePress 中 404 | 图片未被脚本识别（非默认扩展名）或相对路径跨出 srcDir | 在 `convert-org-to-md.mjs` 的 `ASSET_EXTS` 列表中追加；跨目录引用需要手动调整 |
| 中文文件名被转成拼音或乱码 | 旧版 macOS 在 APFS 之外的磁盘上 `readdir` 返回 NFD 编码 | 统一在转换前 `rsync -a --iconv=utf-8-mac,utf-8` 一次 |
| 侧栏分组过深过乱 | 源 org 子目录本身很深 | 通过在目标仓库根加 `--max-depth 2` 限制侧栏层级 |

---

更多写作/转换约定，见 [`references/CONVENTIONS.md`](references/CONVENTIONS.md)。
