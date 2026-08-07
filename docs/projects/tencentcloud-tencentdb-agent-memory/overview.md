---
title: 项目概览
description: TencentDB Agent Memory 的定位、能力、组件、兼容性、维护状态与限制。
---

# 项目概览

TencentDB Agent Memory 是面向 Agent 团队的“记忆资产”系统。它关注的不只是检索内容，还包括资产由谁拥有、对谁可见、哪个版本有效，以及应该装配给哪个 Agent。系统把工作痕迹整理成四类资产：Chat Memory、Skill、Wiki 和 CodeGraph。

## 四类资产

| 资产 | 解决的问题 | 主要生产路径 | 主要消费路径 |
| --- | --- | --- | --- |
| Chat Memory | 跨会话保存事实、偏好、决策和长期画像 | 对话写为 L0，再异步生成 L1、L2、L3 | Proxy 在请求前召回并注入上下文 |
| Skill | 把已跑通任务提炼成可复用 SOP | 对话/工具调用缓冲、触发提取、审核与版本化 | 搜索命中后注入，或由 Agent 定向配装 |
| Wiki | 把文档变成结构化页面、全文索引和链接图 | Knowledge Service 异步 ingest | `/v3/tools/list`、`/v3/tools/call` 或 Panel 浏览 |
| CodeGraph | 索引代码文件、符号、调用关系和影响路径 | 拉取公开 HTTPS 仓库并构建/同步索引 | 搜索、explore、callers/callees、impact analysis |

`源码确认`：Chat Memory 的 L0-L3 数据面位于 `MemoryCore`；Wiki 与 CodeGraph 的实体内容和索引位于 `MemoryKnowledge`；团队、Agent、ACL、固定资产绑定等管理元数据由 Core 的 v3 meta API 管理；Panel 负责聚合与转发而非保存用户会话。

## 组件边界

| 组件 | 角色 | 关键入口 | 主要持久化 |
| --- | --- | --- | --- |
| `MemoryCore` | 记忆内核、Gateway、元数据与 Skill 数据面 | `src/gateway/server.ts`、`src/core/tdai-core.ts` | SQLite / Tencent Cloud VectorDB、文件或对象存储 |
| `MemoryProxy` | Anthropic/OpenAI 请求代理、会话绑定、记忆与工具注入、对话回流 | `src/index.ts`、`src/server.ts`、`src/handler.ts` | SQLite、Redis 或 KV 抽象保存 session/binding/cache |
| `MemoryKnowledge` | Wiki 与 CodeGraph 的构建、索引和工具查询 | `src/server.ts`、`src/module.ts` | SQLite、文件目录、Wiki/CodeGraph 索引 |
| `MemoryPanel` | 无状态控制后端与 React 管理界面 | `src/index.ts`、`src/panel/http/app.ts` | 不维护本地用户库；通过适配器访问 Core/Knowledge |
| SDK | 面向应用的 v3 Memory、Skill、Metadata 客户端 | TS `src/index.ts`；Python `v3/` | 无 |
| `deploy` | 三镜像启动、健康检查、管理员初始化与清理 | `deploy/global-images/start-all.sh` | Docker volumes 与 `.admin-key` |

这里的 “Memory Hub” 是部署概念：`agentmemory/memory-hub` 镜像把 Panel 与 Knowledge Service 组合起来；源码仍保持两个模块。

## 兼容性与主要依赖

- `MemoryCore` 声明 Node.js `>=22.16.0`；Knowledge、Panel 也要求 Node.js 22 级别。Python SDK 要求 Python `>=3.9`，TypeScript SDK 要求 Node.js `>=18.0.0`。
- Core 的主要依赖包括 AI SDK、SQLite/vector 搜索、OpenTelemetry、Zod 和腾讯向量数据库客户端。
- Knowledge 使用 Hono、Drizzle/SQLite、MiniSearch、Graphology、`@colbymchenry/codegraph` 与 MCP SDK。
- Panel 是 Hono 后端与 React 18/Vite 前端；Proxy 使用 Hono、Redis/SQLite 抽象与可选的 ClickHouse/Langfuse 遥测。
- 仓库按 MIT License 许可，可修改、分发和商用，但需保留版权与许可声明。

## 维护状态

`官方资料`：`v2.0.0` 于 2026-08-03 发布，是分析时最新稳定 Release。该版本首次完整开源四类资产，并补充强制 Skill 归档、CodeGraph 定时同步、双语 Panel 与管理员资产管理。Changelog 仍称产品快速演进，因而二次开发应把 API 版本和镜像 tag 固定下来，不应默认跟随 `latest`。

## 明确限制

- Wiki 与 CodeGraph 是异步构建，创建/ingest/sync 返回不等于已经 `ready`。
- CodeGraph 当前只接受公开 HTTPS 仓库；SSH 和私有仓库未实现。源码还会默认拦截私网、环回和 link-local 主机。
- v3 SDK 强制构造时提供 Team/Agent/User；但 Core 服务端的 `V3_STRICT_ISOLATION` 默认关闭，缺字段时 schema 会补成 `"default"`。生产部署必须显式开启严格隔离并补契约测试，不能只依赖 SDK。
- Hermes/OpenClaw 不能响应交互式 session form，当前必须同时提供 `x-team-id`、`x-agent-id`、`x-task-id`，且 `x-conversation-id` 需要静态配置。
- 部署模板指出：若给 Core 配置非空 Gateway Bearer key，当前 Proxy 不会发送该 header，导致 Proxy 的 auth/sessionInit 失败。
- `源码确认`：Proxy 的 `/v3/admin/rate-limits` GET/PUT/DELETE 路由未调用现有 `checkAdminAuth`，即使其他实例销毁等管理路由有鉴权。将 Proxy 暴露到非可信网络前，应在反向代理层限制访问或先修补该路由。
- Core 未配置 `server.apiKey` 时只警告而不拒绝非 loopback 启动；v1 会放行，而 v2/v3 仍只检查 Bearer 非空和 `x-tdai-service-id`。这不等同于可靠鉴权，外网部署必须配置并验证真实 key。
- `MemoryKnowledge` 开发默认端口是 `8421`，Panel 开发默认 `8123`；一键 Docker 部署映射为 Knowledge `8424`、Panel UI `8125`。排障时不要混用两套端口。
- 测试命令存在，但 `v2.0.0` tag 未跟踪测试用例文件；行为结论来自源码和官方文档，不是本次运行测试的结果。

> 证据：[`LICENSE`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/LICENSE#L1-L25)、[`MemoryCore/src/utils/env-config.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryCore/src/utils/env-config.ts#L148-L162)、[`MemoryKnowledge/src/source-fetcher/git-fetcher.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryKnowledge/src/source-fetcher/git-fetcher.ts#L47-L96)、[`MemoryProxy/src/routes/rate-limits.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryProxy/src/routes/rate-limits.ts#L13-L107)。
