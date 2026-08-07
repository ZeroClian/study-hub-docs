---
title: TencentDB Agent Memory 项目精读
description: 从使用、架构到二次开发，系统理解 TencentDB Agent Memory v2.0.0。
---

# TencentDB Agent Memory 项目精读

这组文档的目标是：**能够使用，并理解到可以二次开发**。它不是上游 README 的翻译，而是以固定源码版本为依据，把部署入口、组件边界、核心链路、API、配置和扩展点重新组织成一条可追溯的学习路径。

## 版本基线

| 项目 | 值 |
| --- | --- |
| 仓库 | [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) |
| 稳定版本 | [`v2.0.0`](https://github.com/TencentCloud/TencentDB-Agent-Memory/releases/tag/v2.0.0) |
| Commit | [`0aff21a2d9f2b8a0354aaa80a2e586aab4054562`](https://github.com/TencentCloud/TencentDB-Agent-Memory/tree/0aff21a2d9f2b8a0354aaa80a2e586aab4054562) |
| 发布日期 | 2026-08-03 |
| 分析方式 | 静态源码阅读；未安装依赖、未运行项目、未执行目标仓库测试 |

源码快照共跟踪 837 个文件。本次为避免无关的大体积下载，稀疏检出省略 `assets/` 下 23 个图片或视频文件；其余源码、文档、配置、部署脚本和 SDK 均纳入分析。仓库清单统计到 814 个文件，其中 696 个是源码型文件。二进制资产不参与本文所述运行时控制流。

## 推荐阅读顺序

1. [项目概览](./overview.md)：先建立产品边界和组件地图。
2. [快速开始](./quick-start.md)：理解官方推荐部署与最小使用闭环。
3. [总体架构](./architecture.md)：看清 Core、Hub、Knowledge 与 Proxy 的职责。
4. [核心工作流](./core-workflows.md)：沿请求、记忆、Skill、Wiki 和 CodeGraph 链路读源码。
5. [配置与 API](./configuration-api.md)：定位环境变量、协议、SDK 和隔离字段。
6. [源码导读](./source-guide.md)：按入口、组装层、领域层进入实现。
7. [二次开发指南](./secondary-development.md)：从变更类型反查模块和契约。
8. [故障排查](./troubleshooting.md)：区分配置错误、异步未完成与已知限制。

## 证据状态

- `源码确认`：来自上述 commit 的源码、配置、示例或 manifest。
- `官方资料`：来自该 commit 的上游 README、安装文档、Changelog 或 GitHub Release。
- `推断`：基于代码结构做出的解释，会说明依据。
- `待实践验证`：部署命令、运行输出、兼容性和性能均未实际执行。

需要特别留意两项缺口：其一，TypeScript SDK 的 `README_CN.md` 仍描述旧包名和旧的默认导出语义，而 `v2.0.0` 的 `package.json` 与 `src/index.ts` 已表明顶层直接导出 v3；本文以源码为准。其二，各模块 manifest 声明了 Vitest/E2E 命令，但这个 tag 没有跟踪对应测试用例文件，因此不能把测试脚本的存在当成测试覆盖已确认。

## 分析边界

本文覆盖仓库内 `MemoryCore`、`MemoryProxy`、`MemoryKnowledge`、`MemoryPanel`、`deploy` 和 TypeScript/Python SDK。前端页面逐组件实现、生成式 Wiki 提示词全文、迁移脚本的每个数据字段，以及省略的媒体资产不做逐行深读。`MemoryProxy/packages/cost-guard` 在该 commit 是未展开的 gitlink，其内部路由算法与 COS 扩展不在本仓库证据中；Core service 模式动态加载的私有 `src/integrations` 也未包含在公开 Git 树中，两者均列为明确的 deferred module。

> 证据：[Release v2.0.0](https://github.com/TencentCloud/TencentDB-Agent-Memory/releases/tag/v2.0.0)、[`CHANGELOG.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/CHANGELOG.md#L12-L28)、[`CONTRIBUTING_CN.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/CONTRIBUTING_CN.md#L15-L31)。
