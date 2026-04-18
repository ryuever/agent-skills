---
layout: home

hero:
  name: "__WIKI_TITLE__"
  text: "项目全景文档"
  tagline: 由代码分析驱动的 DeepWiki 风格知识库
  actions:
    - theme: brand
      text: 开始阅读 →
      link: /overview/1-introduction
    - theme: alt
      text: 扫描报告
      link: /quality-report

features:
  - icon: 🗺️
    title: 1. 项目地图
    details: 仓库结构、技术栈信号、推荐阅读顺序。
    link: /overview/1-introduction
  - icon: 🏗️
    title: 2. 架构设计
    details: 系统分层、组件体系、路由设计与边界约束。
    link: /architecture/2-system-architecture
  - icon: 💡
    title: 3. 核心概念
    details: 领域术语、关键类型与环境配置索引。
    link: /concepts/3-glossary
  - icon: 📦
    title: 4. 核心模块
    details: 按目录/包剖析职责、导出 API 与依赖关系。
    link: /modules/4-core-modules
  - icon: 🔄
    title: 5. 数据流
    details: 请求路径、状态管理、错误传播与缓存策略。
    link: /dataflow/5-request-and-state
  - icon: ⚙️
    title: 6. 工程运维
    details: 构建、测试、CI/CD 与环境变量说明。
    link: /operations/6-build-and-deploy
---

> 本文档由 **project-wiki** skill 生成，以代码为唯一事实来源。
>
> 分析脚本产出 import 图谱、路由/状态/网络层检测等元数据，驱动 Agent 按层级编号撰写全景文档。
> 书写规范见 [CONVENTIONS](./CONVENTIONS.md)。
