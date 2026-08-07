---
title: 配置与 API
description: 汇总部署环境变量、身份头、主要 HTTP API、SDK 与协议契约。
---

# 配置与 API

本页按“谁读取、影响什么”组织配置，再按稳定边界列出 API。生产配置应固定镜像 tag、使用真实可达地址，并把所有 key 放在环境变量或服务端只读配置中。

## 一键部署配置

| 变量 | 读取者 | 作用与约束 |
| --- | --- | --- |
| `MEMORY_CORE_IMAGE` / `MEMORY_HUB_IMAGE` / `PROXY_IMAGE` | 部署脚本 | 镜像；建议固定版本，`latest` 不会自动刷新，需 `PULL=1` |
| `MEMORY_LLM_BASE_URL/API_KEY/MODEL/PROTOCOL` | Core/Hub | 记忆提炼与 Wiki LLM；协议为 `openai` 或 `anthropic` |
| `PROXY_UPSTREAM_URL/API_KEY/MODEL` | Proxy | 用户请求最终转发的模型 |
| `MEMORY_CORE_PORT` | Docker | 默认 `8420` |
| `PANEL_PORT` | Docker | 默认 `8125` |
| `KNOWLEDGE_PORT` | Docker | 默认 `8424` |
| `PROXY_PORT` | Docker | 默认 `8096` |
| `KNOWLEDGE_PUBLIC_BASE_URL` | Hub/Knowledge | Agent 可达且必须包含 `/v3` |
| `MEMORY_CORE_GATEWAY_API_KEY` | Core | 空值关闭 Bearer gate；非空时当前 Proxy auth/session init 不兼容 |
| `MEMORY_CORE_ADMIN_USERNAME` | 初始化脚本 | 首次生成管理员及 `.admin-key` |

## 各组件关键配置

### MemoryKnowledge

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` / `API_PREFIX` | `8421` / `/v3` | 源码单服务监听配置 |
| `KNOWLEDGE_DATA_DIR` | `./data` | Git 工作树、Wiki 素材和索引根目录 |
| `KNOWLEDGE_DB_PATH` | `./data/knowledge.db` | Drizzle/SQLite 元数据 |
| `LLM_MODE` | `proxy` | 无 per-instance binding 时的全局路由；`proxy` 缺 binding 会显式失败 |
| `LLM_API_KEY` / `LLM_BASE_URL` | 空 | `LLM_MODE=custom` 时使用 |
| `TMC_CALLBACK_URL` | 空 | Panel 根地址，代码追加 callback path；不要带 `/v3` |
| `KNOWLEDGE_AUTO_SYNC_ENABLED` | `false` | CodeGraph 定时同步开关 |
| `KNOWLEDGE_AUTO_SYNC_SCAN_INTERVAL_MIN` | `10` | 扫描周期，限制为 1–60 分钟 |
| `KNOWLEDGE_AUTO_SYNC_MAX_CONCURRENT` | `3` | worker 并发数，限制为 1–20 |
| `KNOWLEDGE_SSRF_CHECK` | 开启 | 设为 `off/false/0/no` 可关闭私网黑名单；HTTPS-only 仍生效 |

### MemoryPanel

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `8123` | Panel 源码后端 |
| `METADATA_INSTANCES_CONFIG` | `./config/metadata-instances.json` | Core 实例注册表，只应服务端读取 |
| `METADATA_REMOTE_TIMEOUT_MS` | `15000` | Core/Skill 请求超时 |
| `UI_DIST_DIR` | `./web/dist` | 生产前端静态资源 |
| `KNOWLEDGE_SERVICE_URL` | `http://127.0.0.1:8421` | 不含 `/v3` |
| `KNOWLEDGE_TIMEOUT_MS` | `15000`（源码） | Knowledge HTTP 客户端超时；示例文件写 `30000`，以部署配置显式值为准 |
| `KNOWLEDGE_LLM_BINDING_SYNC` | `true` | 启动时 best-effort 为每个实例确保 LLM binding |
| `KNOWLEDGE_LLM_PROXY_BASE_URL` | `http://127.0.0.1:8096` | Knowledge 通过 Proxy 调模型的入口 |

### MemoryProxy 与 MemoryCore

Proxy 的完整字段见 `MemoryProxy/config.example.yaml`，大类包括 upstream、listen、auth、session、injection、Core/Knowledge 地址、Redis/SQLite store、rate limit、logging 与 tracing。其优先级是 CLI > YAML > 内置默认，且内置默认关闭多数高级能力；示例 YAML 开启能力不代表不传配置也会开启。

Core 的配置入口是 `MemoryCore/src/config.ts`、`src/gateway/config.ts` 和 `tdai-gateway*.yaml`；存储、embedding、LLM、quota、metadata 和 Skill 均可独立切换实现。配置文件查找优先级是 `TDAI_GATEWAY_CONFIG` → cwd 配置 → dataDir 配置 → env-only；解析错误会被捕获并静默退回 env-only。生产环境应显式设置并核对启动日志，同时设置 `V3_STRICT_ISOLATION=true`，避免缺失隔离字段落入 `default`。

## 身份与请求头

| Header | 作用 |
| --- | --- |
| `Authorization: Bearer ...` | Gateway/Knowledge 可选的服务级凭证，或通用 Proxy 用户 key |
| `x-tdai-service-id` | Core/Knowledge 的实例或租户路由；Knowledge 每个 endpoint 必需 |
| `x-tdai-user-key` | Core meta 验证用户身份；Panel/Proxy 使用 |
| `x-team-id` / `x-agent-id` / `x-task-id` | Proxy 非交互式 session 预选 |
| `x-conversation-id` | Proxy 会话标识，Hermes/OpenClaw 当前需静态提供 |

## API 地图

### MemoryCore v3

| 分组 | 典型路径 | 客户端 |
| --- | --- | --- |
| L0 Conversation | `/v3/conversation/add|query|search|delete|count` | `MemoryClient` |
| L1 Atomic | `/v3/atomic/update|query|search|delete|count` | `MemoryClient` |
| L2 Scenario | `/v3/scenario/ls|read|write|rm|count` | `MemoryClient` |
| L3 Core | `/v3/core/read|write|count` | `MemoryClient` |
| Skill | `/v3/skill/create|update|patch|delete|get|list|search|listing|extract|conversation/*` | `SkillClient` |
| Meta | `/v3/meta/user|team|agent|task|asset|acl|agent-fixed-asset|auth/...` | `MetadataClient` |
| Knowledge 元数据 | `/v3/knowledge/create|get|update|delete|list` | `MetadataClient` |

Knowledge 元数据 API 只登记 `wiki`/`code-graph` 的名称、URL、摘要和归属；内容读取与索引查询属于 Knowledge Service。

### MemoryKnowledge

`openapi.yaml` 声明 28 个管理和查询 endpoint，统一返回 `{ code, message, data }`：

- Wiki：create/get/list/ingest/delete/update-meta，raw/page 文件读写，graph/search。
- CodeGraph：create/get/list/sync/delete/update-meta，以及 search/explore/callers/callees/impact 等白名单工具。
- Agent tools：`POST /v3/tools/list`、`POST /v3/tools/call`。
- 运维：`GET /health`、`GET /v3/auto-sync/status`、`POST /v3/auto-sync/trigger`。
- 控制面内部接口：`/v3/internal/llm-binding/*`。

### MemoryPanel 与 Proxy

Panel 统一挂在 `/api/v1`，其中 `/meta/*` 与 `/skill/*` 主要是校验后透明转发；Chat Memory、Agent overview、Agent cascade delete、Knowledge allocate/callback 是控制层编排路由。Proxy 同时接受 Anthropic `/.../v1/messages` 和 OpenAI `/v1/chat/completions` 语义，并按 URL 中的 Agent source/space 选择 adapter。

## SDK 选择

- TypeScript 包：`@tencentdb-agent-memory/memory-sdk-ts-v2`，版本 `1.0.0-beta.2`；顶层 `MemoryClient` 是 v3 严格隔离版本，另导出 `SkillClient`、`MetadataClient`。
- Python 包：`tencentdb-agent-memory-sdk-python`，版本 `0.2.0`；根模块保留 v2 兼容客户端，`tencentdb_agent_memory.v3` 提供 v3 `MemoryClient`、`SkillClient`、`MetadataClient`，并同时提供同步/异步形态。

> 证据：[`deploy/global-images/.env.example`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/deploy/global-images/.env.example#L15-L84)、[`MemoryKnowledge/.env.example`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryKnowledge/.env.example#L5-L55)、[`MemoryPanel/src/panel/config/panel-config.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryPanel/src/panel/config/panel-config.ts#L41-L65)、[`sdk/memory-core/typescript/src/v3/index.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/sdk/memory-core/typescript/src/v3/index.ts#L1-L42)。
