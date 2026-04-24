import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { wikiNav, wikiSidebar } from "./sidebar.generated.mts";

export default withMermaid(
  defineConfig({
  title: "__WIKI_TITLE__",
  description: "__WIKI_TITLE__ — Emacs Org 笔记归档",
  lang: "zh-CN",
  srcDir: "./__SRC_DIR__",
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    defaultHighlightLang: "text",
    lineNumbers: false,
  },
  themeConfig: {
    nav: wikiNav,
    sidebar: wikiSidebar,
    search: { provider: "local" },
    socialLinks: [__SOCIAL_LINKS__],
    footer: {
      message: "由 org-to-vitepress skill 自动生成",
      copyright: "__WIKI_TITLE__",
    },
    docFooter: { prev: "上一篇", next: "下一篇" },
    outline: { label: "目录", level: [2, 3] },
    lastUpdated: { text: "最后更新于" },
  },
  }),
);
