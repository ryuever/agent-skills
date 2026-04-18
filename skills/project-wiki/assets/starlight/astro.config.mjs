import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { starlightSidebar } from "./.starlight/sidebar.generated.mjs";

export default defineConfig({
  integrations: [
    starlight({
      title: "__WIKI_TITLE__",
      description: "__WIKI_TITLE__ — DeepWiki 风格项目全景文档",__SOCIAL_LINKS__
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
