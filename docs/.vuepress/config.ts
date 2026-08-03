import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  lang: "zh-CN",
  title: "Study Hub",
  description: "Study Hub 个人学习笔记与技术知识库，记录 Java、Spring、数据库、部署和前端实践。",
  // GitHub Pages publishes this repository as a project site under
  // `/study-hub-docs/`; keep local development at the root path.
  base: process.env.GITHUB_ACTIONS === "true" ? "/study-hub-docs/" : "/",
  head: [
    ["meta", { name: "author", content: "ZeroClian" }],
    ["meta", { name: "theme-color", content: "#3eaf7c" }],
  ],
  bundler: viteBundler(),
  theme,
});
