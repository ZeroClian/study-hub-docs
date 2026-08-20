import type { SidebarItemOptions, SidebarOptions } from "vuepress-theme-hope";

const page = (text: string, link: string): SidebarItemOptions => ({ text, link });

const group = (
  text: string,
  children: SidebarItemOptions[],
  expanded = false,
): SidebarItemOptions => ({
  text,
  children,
  collapsible: true,
  expanded,
});

const sidebar: SidebarOptions = [
  page("知识地图", "/guide/"),
  group("计算机基础", [
    page("软件设计师：计算机基础", "/fundamentals/software-design.html"),
  ]),
  group("Java 后端", [
    group("Java 基础", [
      page("ArrayList 源码分析", "/backend/java/arraylist.html"),
      page("链表、栈与队列", "/backend/java/data-structures.html"),
      page("Java 并发基础", "/backend/java/concurrency.html"),
      page("Stream 与日期 API", "/backend/java/stream-and-date.html"),
    ]),
    group("Spring 生态", [
      page("项目搭建与工程配置", "/backend/spring/project-setup.html"),
      page("MyBatis 与 MyBatis-Plus", "/backend/spring/data-access.html"),
      page("Nacos 与 Gateway", "/backend/spring/spring-cloud.html"),
      page("事务与 @Transactional", "/backend/spring/transactions.html"),
    ]),
    group("设计与实战", [
      page("策略模式与观察者模式", "/backend/design-patterns.html"),
      page("IDEA 开发效率", "/backend/idea-productivity.html"),
      page("微信扫码登录", "/backend/wechat-login.html"),
      page("Java Excel 工具类", "/backend/utilities/excel.html"),
      page("Java PDF 工具类", "/backend/utilities/pdf.html"),
    ]),
  ]),
  group("数据与中间件", [
    page("MySQL 安装与权限", "/data/mysql.html"),
    group("Redis", [
      page("持久化、复制与集群", "/data/redis/fundamentals.html"),
      page("分布式锁", "/data/redis/distributed-lock.html"),
      page("多维度滑动窗口限流", "/data/redis/rate-limiting.html"),
    ]),
    page("Elasticsearch Docker 部署", "/data/elasticsearch.html"),
  ]),
  group("前端与桌面端", [
    page("Vue 3 与 Webpack", "/frontend/vue.html"),
    page("Electron 项目开发", "/frontend/electron.html"),
  ]),
  group("移动端开发", [
    page("Java 开发者的 Swift 与 SwiftUI", "/mobile/swift-swiftui-for-java-developers.html"),
    group("Mars Health 项目实战", [
      page("项目专题首页", "/projects/mars-health/"),
      page("iOS 代码实现", "/projects/mars-health/ios-implementation.html"),
      page("真实数据接入", "/projects/mars-health/real-data-integration.html"),
    ]),
  ]),
  group("运维与工程化", [
    group("系统与环境", [
      page("Linux 基础与故障处理", "/devops/linux.html"),
      page("Docker 容器实践", "/devops/docker.html"),
      page("开发与运行环境", "/devops/environments.html"),
    ]),
    group("构建、交付与协作", [
      page("Maven 与 Gradle", "/devops/build-tools.html"),
      page("GitHub Actions 与 Jenkins", "/devops/ci-cd.html"),
      page("应用部署与自动发布", "/devops/application-deployment.html"),
      group("Git 版本控制", [
        page("专题总览", "/devops/git.html"),
        page("日常工作流", "/devops/git/daily-workflow.html"),
        page("分支与代码整合", "/devops/git/branch-integration.html"),
        page("回退与恢复", "/devops/git/rollback-recovery.html"),
        page("冲突处理", "/devops/git/conflict-resolution.html"),
        page("远程与网络异常", "/devops/git/remote-troubleshooting.html"),
      ]),
      page("域名与图床", "/devops/site-operations.html"),
    ]),
  ]),
  group("AI 与智能体", [
    group("提示词与可靠性", [
      page("智能体提示词校验与可靠性", "/ai/agent-prompt-guardrails.html"),
    ]),
  ]),
  group("GitHub 项目精读", [
    group("TencentDB Agent Memory", [
      page("项目精读首页", "/projects/tencentcloud-tencentdb-agent-memory/"),
      page("项目概览", "/projects/tencentcloud-tencentdb-agent-memory/overview.html"),
      page("快速开始", "/projects/tencentcloud-tencentdb-agent-memory/quick-start.html"),
      page("总体架构", "/projects/tencentcloud-tencentdb-agent-memory/architecture.html"),
      page("核心工作流", "/projects/tencentcloud-tencentdb-agent-memory/core-workflows.html"),
      page("配置与 API", "/projects/tencentcloud-tencentdb-agent-memory/configuration-api.html"),
      page("源码导读", "/projects/tencentcloud-tencentdb-agent-memory/source-guide.html"),
      page("二次开发指南", "/projects/tencentcloud-tencentdb-agent-memory/secondary-development.html"),
      page("故障排查", "/projects/tencentcloud-tencentdb-agent-memory/troubleshooting.html"),
    ]),
    group("Sub2API", [
      page("项目精读首页", "/projects/wei-shaw-sub2api/"),
      page("项目概览", "/projects/wei-shaw-sub2api/overview.html"),
      page("总体架构", "/projects/wei-shaw-sub2api/architecture.html"),
      page("部署指南", "/projects/wei-shaw-sub2api/deployment.html"),
      page("配置与安全", "/projects/wei-shaw-sub2api/configuration-security.html"),
      page("首次运行与验收", "/projects/wei-shaw-sub2api/first-run-acceptance.html"),
      page("运维、备份与升级", "/projects/wei-shaw-sub2api/operations.html"),
      page("故障排查", "/projects/wei-shaw-sub2api/troubleshooting.html"),
      page("源码导读", "/projects/wei-shaw-sub2api/source-guide.html"),
      page("Agent 部署 Runbook", "/projects/wei-shaw-sub2api/agent-runbook.html"),
    ]),
  ]),
  group("通用工具", [
    page("Markdown 语法速查", "/tools/markdown.html"),
    page("Postman 自动化测试与压测", "/tools/postman-automation-and-performance-testing.html"),
  ]),
];

export default sidebar;
