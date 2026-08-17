---
home: true
heroImage: /images/study-hub-logo.webp
heroAlt: Study Hub logo
heroText: Study Hub
tagline: 按知识领域重新整理的个人技术知识库
actions:
  - text: 浏览知识地图
    link: /guide/
    type: primary
  - text: GitHub
    link: https://github.com/ZeroClian/study-hub-docs
features:
  - title: Java 后端
    details: Java 基础、Spring 生态、设计模式、工具类与业务集成。
  - title: 数据与中间件
    details: MySQL、Redis、Elasticsearch 的部署、原理与实践。
  - title: 前端与桌面端
    details: Vue、Webpack 与 Electron 项目开发。
  - title: 移动端开发
    details: Swift、SwiftUI、iOS 数据流与 Mars Health 项目实践。
  - title: 运维与工程化
    details: Linux、Docker、环境配置、CI/CD 与应用发布。
  - title: AI 与智能体
    details: 提示词设计、智能体校验与 AI 任务可靠性实践。
  - title: GitHub 项目精读
    details: TencentDB Agent Memory 与 Sub2API 的架构、部署、源码导读与 Agent Runbook。
copyright: false
---

## 关于 Study Hub

这里是我的个人学习知识库。文章已从原先按技术名分散的目录，主要归纳为 **Java 后端、数据与中间件、前端与桌面端、移动端开发、运维与工程化、AI 与智能体、GitHub 项目精读、通用工具**；关联度高的短文已经合并为完整主题。

第一次访问建议从[知识地图](/guide/)开始，也可以直接使用侧栏按领域查找。

## 本地开发

```bash
pnpm install
pnpm docs:validate
pnpm docs:dev
```

生产构建：

```bash
pnpm docs:build
```
