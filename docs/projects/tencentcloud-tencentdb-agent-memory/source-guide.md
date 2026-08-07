---
title: 源码导读
description: TencentDB Agent Memory 的入口、重要符号、阅读顺序与扩展点。
---

# 源码导读

不要从 696 个源码文件逐个横扫。先读部署与服务组装，再沿一个真实请求进入领域模块，最后才看存储和 UI 细节。

## 顶层地图

```text
TencentDB-Agent-Memory/
├── MemoryCore/       # L0-L3、Skill、Gateway、Meta/ACL
├── MemoryProxy/      # Agent 协议、session、注入、转发与回流
├── MemoryKnowledge/  # Wiki、CodeGraph、MCP、构建队列
├── MemoryPanel/      # 无状态控制后端 + React UI
├── sdk/memory-core/  # TypeScript / Python SDK
├── deploy/           # 三镜像部署与组合镜像
├── INSTALL_CN.md
└── CHANGELOG.md
```

## 第一阶段：理解可运行拓扑

1. `README_CN.md`：产品语义与四类资产。
2. `INSTALL_CN.md`：真实使用顺序、端口、客户端接入和已知限制。
3. `deploy/global-images/start-all.sh`：启动顺序与成功条件。
4. `deploy/global-images/start-memory-*.sh`、`start-proxy.sh`：容器环境变量、volume、health check 和网络连接。

这一步回答“几个进程、谁先启动、地址怎么传递”，不要急着阅读算法。

## 第二阶段：沿服务入口阅读

| 模块 | 从这里开始 | 接着读 | 读完应能回答 |
| --- | --- | --- | --- |
| Core | `src/gateway/server.ts:createGatewayServer` | `v2-router.ts`、`skill-handlers.ts`、`metadata/*` | API 如何鉴权、选实例并进入记忆/Skill/meta |
| Core pipeline | `src/core/tdai-core.ts:TdaiCore` | `hooks/auto-capture.ts`、`record/l1-extractor.ts`、`scene/scene-extractor.ts`、`persona/*` | L0-L3 如何异步生长 |
| Proxy | `src/index.ts`、`src/server.ts` | `handler.ts`、`auth.ts`、`session/*`、`injection/pipeline.ts` | 一次请求何时绑定、注入、bypass 和回流 |
| Knowledge | `src/server.ts:createApp` | `module.ts:createKnowledgeModule`、`store/*-service.ts`、`engines/*` | 异步任务、索引和 callback 如何组装 |
| Panel | `src/index.ts`、`src/panel/http/app.ts:buildPanelApp` | `panel-deps.ts`、`kernel/adapters/*`、`http/routes/*` | 控制层如何转发、聚合和编排 |

## 第三阶段：读三条领域主线

### Core 记忆

推荐顺序：

1. `core/conversation/l0-recorder.ts`：原始消息落点。
2. `core/hooks/auto-capture.ts`：何时把 L0 送入后台处理。
3. `core/record/l1-extractor.ts` 与 `l1-dedup.ts`：抽取、合并和写入。
4. `core/scene/scene-extractor.ts`：L1 如何组织成场景文件。
5. `core/persona/persona-trigger.ts` 与 `persona-generator.ts`：L3 的触发和生成。
6. `core/store/factory.ts`、`storage/factory.ts`：不同部署的持久化实现。

### Skill

推荐顺序：

1. `gateway/skill-handlers.ts`：API 语义、schema、quota 和资产同步。
2. `core/skill/skill-core.ts`：领域服务门面。
3. `core/skill/conversation-add/add-handler.ts`：缓冲与归档判定。
4. `conversation-add/trigger-service.ts`：先 archive 后 task 的不变量。
5. `conversation-add/extract-worker.ts`：锁、重试、DLQ 和候选落地。
6. `skill-versioning.ts`、`skill-resource-store.ts`：版本与资源文件。

### Knowledge

推荐顺序：

1. `routes/wiki.ts`、`routes/code-graph.ts`：外部契约。
2. `store/wiki-service.ts`、`code-graph-service.ts`：状态机和清理语义。
3. `store/build-queue.ts`：每资产串行执行。
4. `module.ts`：真实 Wiki/CodeGraph worker。
5. `source-fetcher/git-fetcher.ts`：仓库拉取安全边界。
6. `routes/tools.ts` 与 `mcp/tools.ts`：如何把知识能力暴露给 Agent。

## 公共接口与重要符号

- `MemoryClient`：L0-L3 数据面；`withIsolation` 创建新的隔离上下文而不修改原客户端。
- `SkillClient`：Skill CRUD、版本、文件、search/listing、extract 与 conversation archive。
- `MetadataClient`：Team/User/Agent/Task/Asset/ACL/Knowledge 管理面。
- `KnowledgeClientPort`：Panel 依赖的 Wiki/CodeGraph 抽象。
- `SourceFetcherRegistry.register`：Knowledge 新增仓库来源协议的注册点。
- `BuildQueue.enqueue`：资产级串行任务入口。
- `InjectionPipeline` 与 injector registry：Proxy 新增上下文注入能力的边界。

注意：`MemoryCore/package.json` 的 npm 根入口只导出 `index.ts` 构建产物，实际公共能力是 OpenClaw `register(api)`；`src/core/index.ts` 中的 `TdaiCore`、StorePool、HostAdapter 等虽有源码 barrel，却没有 package subpath export。应用二次开发优先走 Gateway HTTP/官方 SDK，深层源码 import 属于未承诺接口。

## 扩展点

| 需求 | 首选扩展点 | 需要保持的契约 |
| --- | --- | --- |
| 新存储后端 | Core `store/types.ts`、`store/factory.ts`、`storage/adapter.ts` | isolation key、原子写入、搜索返回排序 |
| 新 Agent 客户端 | Proxy `agent-adapters/types.ts` + adapter registry | 请求解析、session key、响应协议与流式语义 |
| 新注入内容 | Proxy `injection/injectors/*` + registry/pipeline | 顺序、预算、失败是否阻断请求 |
| 新知识来源 | Knowledge `ISourceFetcher` + `SourceFetcherRegistry.register` | URL 验证、版本返回、fetch/sync 一致性 |
| 替换 Wiki/CodeGraph worker | `createKnowledgeModule` 的 `wikiWorker`/`codeWorker` 注入 | 状态回调、取消检查点、统计结果 |
| 替换控制面上游 | Panel `kernel/ports/*` 与 adapters | envelope、header、超时与错误映射 |
| 新管理页面 | Panel `web/src/services`、router 与后端 `/api/v1` | 不把服务端 API key 泄露到前端 |

## 测试与示例证据

各 `package.json` 声明了 Vitest、E2E、smoke 和类型检查命令，README 也引用 `tests/`、`__tests__/`；但 `v2.0.0` 的 Git 树没有对应测试用例文件。源码中的 worker 注入、port/interface 和 `onIdle` 明显为可测试性设计，这是架构证据，不是测试已通过的证据。

因此阅读时可以用 SDK README、安装文档和 OpenAPI 作为意图证据，用实际源码确认当前行为；任何部署、兼容性和输出仍标为 `待实践验证`。

> 证据：[`CONTRIBUTING_CN.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/CONTRIBUTING_CN.md#L15-L42)、[`MemoryPanel/src/panel/panel-deps.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryPanel/src/panel/panel-deps.ts#L16-L46)、[`MemoryKnowledge/src/source-fetcher/registry.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryKnowledge/src/source-fetcher/registry.ts#L11-L47)。
