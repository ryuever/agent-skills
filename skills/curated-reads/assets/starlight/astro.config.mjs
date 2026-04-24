import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import remarkMermaid from "remark-mermaidjs";
import { starlightSidebar } from "./.starlight/sidebar.generated.mjs";

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
  integrations: [
    starlight({
      title: "__WIKI_TITLE__",
      description: "__WIKI_TITLE__ — 技术阅读策展与知识归档",
      __SOCIAL_LINKS__
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
      },
      sidebar: starlightSidebar,
      lastUpdated: true,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      credits: false,
    }),
  ],
});
