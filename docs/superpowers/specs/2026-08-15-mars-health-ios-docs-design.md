---
title: Mars Health iOS 项目专题文档设计
description: 面向 Java 后端开发者的 Mars Health iOS 实现讲解与真实数据接入文档设计。
---

# Mars Health iOS 项目专题文档设计

## 目标

在 Study Hub 中新增一组 Mars Health 项目专题文档，让有 Java 后端经验、刚接触 SwiftUI 的开发者能够：

1. 沿真实源码读懂 iOS 客户端的入口、模型、状态、网络请求和页面组合。
2. 理解 SwiftUI 状态驱动 UI 与 Spring 风格分层之间的异同。
3. 区分当前演示数据、iPhone 真机运行、HealthKit 数据和厂商设备数据。
4. 按可执行的阶段把演示数据替换为真实数据，同时保留现有客户端 API 契约。

## 文档结构

新增 `docs/projects/mars-health/` 项目专题：

- `README.md`：项目边界、技术栈、架构总览、阅读顺序和证据状态。
- `ios-implementation.md`：按 `App -> ContentView -> HealthStore -> APIClient -> Models -> 页面组件` 的顺序讲解现有 iOS 代码。
- `real-data-integration.md`：比较 HealthKit 直连与厂商 API/SDK 经 Java 后端接入两条路线，并给出推荐迁移顺序。

## 内容设计

### iOS 实现讲解

- 使用 Java/Spring 对照解释 Swift `struct`、`ObservableObject`、`@Published`、`@StateObject`、`@ObservedObject`、`async/await` 和 `Codable`。
- 使用 Mermaid 展示启动链路、请求链路、状态刷新链路和设备操作链路。
- 覆盖四个底部页面：概览、趋势、设备、我的。
- 说明在线数据与 Preview 降级数据并存的行为，以及当前错误处理的边界。
- API 表格必须以 `APIClient.swift` 和 Java Controller 的实际路径为准。

### 真实数据接入

- 路线 A：HealthKit 在 iOS 端读取 Apple Watch 与健康 App 已汇总的数据，再上传后端或本地展示。
- 路线 B：厂商云 API、服务端 SDK 或 webhook 进入 Java 后端，归一化后继续向 iOS 提供现有 REST 契约。
- 推荐顺序：先定义统一领域模型和来源标识，再接 HealthKit 最小闭环，随后按业务需要接厂商后端 Provider。
- 明确权限、用户授权、数据最小化、去重、时区、单位、增量同步和删除请求等生产约束。
- 所有读数按健康与生活方式信息表述，不提供医学诊断结论。

## 知识库接入

- 在侧栏“移动端开发”下新增“Mars Health 项目实战”分组。
- 在知识地图中增加项目入口和三篇文档的推荐阅读路径。
- 在首页分类描述中补充移动端开发，避免新增内容只能从侧栏发现。

## 范围边界

- 本次只修改 `study-hub-docs` 的 Markdown 与 VuePress 导航文件。
- 不修改 Mars Health 的 Swift、Xcode 或 Java 后端代码。
- 不声称已经完成真实 iPhone、HealthKit、Apple Watch 或厂商设备的端到端验证。
- 文档描述以 2026-08-15 当前工作区源码为基线；工作区存在未提交实现，因此不使用单个 Git commit 作为源码版本标识。

## 验收标准

1. 三篇项目文档均包含 YAML frontmatter，内部链接可解析。
2. iOS 讲解覆盖全部 Swift 源文件和主要页面组件。
3. 真实数据文档同时覆盖 HealthKit 与厂商后端路线，并给出分阶段清单。
4. 侧栏、知识地图和首页均能发现项目专题。
5. `pnpm docs:validate` 与 `pnpm docs:build` 均成功。
