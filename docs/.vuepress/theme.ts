import { hopeTheme } from "vuepress-theme-hope";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://zeroclian.cn/",
  logo: "/images/logo.png",
  favicon: "/images/logo.png",
  author: {
    name: "ZeroClian",
    url: "https://github.com/ZeroClian",
  },
  repo: "https://github.com/ZeroClian/study-hub-docs",
  docsDir: "docs",

  // 使用 Theme Hope 的知识库风格，侧栏标题和链接显式维护，避免中文路径
  // 被当作 URL 编码后的展示文本。
  pure: true,
  focus: false,
  print: false,
  breadcrumb: false,
  sidebar,
  navbar: [
    { text: "首页", link: "/" },
    { text: "GitHub", link: "https://github.com/ZeroClian/study-hub-docs" },
    { text: "CSDN", link: "https://blog.csdn.net/weixin_45636641" },
  ],

  pageInfo: ["Author", "Date", "ReadingTime", "Word"],
  contributors: false,
  editLink: false,
  lastUpdated: true,
  footer: "© 2026 ZeroClian · Study Hub",
  displayFooter: true,

  // 保留并增强现有 Markdown 内容：代码标签、Mermaid、任务列表和 GFM。
  markdown: {
    align: true,
    codeTabs: true,
    mermaid: true,
    gfm: true,
    tasklist: true,
  },

  plugins: {
    // 本地搜索，不需要 Algolia 账号或额外服务。
    slimsearch: true,
  },
});
