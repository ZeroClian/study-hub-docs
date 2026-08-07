---
title: 故障排查
description: 基于源码和官方限制定位部署、会话、记忆、Skill、Wiki 与 CodeGraph 问题。
---

# 故障排查

先判断故障属于“同步请求失败”“任务仍在异步处理”还是“官方未支持”。不要仅凭 Panel 没显示内容就重复创建资产。

## 快速定位表

| 现象 | 优先检查 | 源码依据或处理 |
| --- | --- | --- |
| Panel 打不开 | `PANEL_PORT`、memory-hub 容器 health/log | Docker 默认 Panel `8125`，源码开发默认 `8123` |
| 登录 key 无效 | `.admin-key` 是否属于当前 volume；Core `/v3/meta/auth/verify` | `--purge` 会删 key 和 volume；重建后旧 key 失效 |
| Proxy 能回复但没有记忆 | session 是否成功绑定 team/agent/task；是否发生 bypass | 非交互 Agent 必须传完整预选 headers |
| Proxy auth/session init 失败 | `MEMORY_CORE_GATEWAY_API_KEY` 是否非空 | 部署模板明确当前 Proxy 不发送 Core Gateway Bearer header |
| Wiki 一直 pending/processing | LLM binding、Knowledge 日志、callback 地址、任务状态 | `LLM_MODE=proxy` 缺 per-instance binding 会显式失败；同资产串行 |
| CodeGraph 创建失败 | URL 是否 `https://` 且为公网地址；branch 是否存在 | SSH、HTTP、私网与 loopback 默认被拒绝 |
| CodeGraph sync 反复全量 | 查看增量 fetch/index 错误 | worker 在增量失败后删除资产目录并回退新克隆 |
| `/v3/tools/call` 找不到工具 | 先调 `tools/list`，确认资产已 `ready` 且已装配 | 工具使用白名单和租户/资产范围，不支持任意 method |
| SDK 请求串到错误范围 | 检查 `serviceId` 与 `teamId/agentId/userId/sessionId` | v3 三元组必须存在；L2/L3 不使用 session |
| Skill 不出现在资产列表 | 检查 create 后 `ensureSkillAsset` 是否失败 | Skill 落库与 meta asset 登记必须一致；创建路径严格失败 |
| Skill 提取重复或卡住 | 查 archive、task、agent queue、extract lock 与 DLQ | worker 有锁续租、瞬时重试和永久失败路径 |

## Proxy 管理接口安全提示

`源码确认`：`MemoryProxy/src/server.ts` 直接注册 `/v3/admin/rate-limits`，而 `routes/rate-limits.ts` 的读取、更新、删除 handler 都没有调用 `checkAdminAuth()`；同仓库的实例销毁路由则明确调用该检查。这不是“配置 admin key 即自动保护”的情形。

在修补代码前，不要把这些路由暴露到不可信网络。可先由反向代理或网络策略限制整个 `/v3/admin/*`，并把路由级鉴权纳入二次开发的首要修复和回归测试。

Core 也需要单独加固：未配置 `server.apiKey` 时，非 loopback 启动只产生 warning；v1 路由会放行，而 v2/v3 只要求形式上的非空 Bearer 与 service ID。应配置真实 key、开启 `V3_STRICT_ISOLATION`，并用直接 HTTP 请求验证缺 key、伪 key、缺隔离字段都被拒绝。

## Wiki 与 CodeGraph 状态

`create`、`ingest`、`sync` 返回 `202` 或 `{ status: pending }` 时，不应立即查询派生页面或图谱。轮询对应 get/list 状态，或观察 Knowledge → Panel callback。

Knowledge 启动会把上次中断的任务标记为 failed，而不是自动继续；这是避免永久 processing 的恢复策略。确认输入和 LLM/仓库连通性后，需要重新触发 ingest/sync。

同一资产收到并发请求时，busy 是预期保护，不是死锁。`BuildQueue` 按资产 ID 串行执行；其他资产仍可并行。

## 地址与前缀混淆

| 配置 | 正确形态 |
| --- | --- |
| `KNOWLEDGE_PUBLIC_BASE_URL` | Agent 可达，包含 `/v3`，如 `http://host:8424/v3` |
| Panel `KNOWLEDGE_SERVICE_URL` | Knowledge 根地址，不含 `/v3`，如 `http://127.0.0.1:8421` |
| `TMC_CALLBACK_URL` | Panel 根地址，不含 callback path |
| Claude `ANTHROPIC_BASE_URL` | Proxy 路径，如 `http://127.0.0.1:8096/claude-code/default` |

若把 `/v3` 重复或遗漏，常见表现是 404，而不是鉴权错误。

## 非交互式 Agent 的 session bypass

Hermes/OpenClaw 当前不能回答 Proxy 的交互式 Team/Agent/Task 选择表单。必须提供：

```text
Authorization: Bearer <user_key>
x-team-id: <team>
x-agent-id: <agent>
x-task-id: <task>
x-conversation-id: <stable conversation id>
```

缺失 `x-task-id` 时 Proxy 会尝试交互式初始化，客户端无法响应，最终 bypass；请求仍可能拿到上游回答，但记忆注入和对话回流都不会生效。这是最容易被误判为“记忆检索坏了”的情况。

## Skill 提取诊断

按顺序查：

1. conversation buffer 是否追加；handler 是否返回 `archived`。
2. archive 文件是否先写成功；若失败，不应存在 task。
3. task 是否在 mutex 内写入并把 Agent 入队。
4. worker 是否拿到 agent extract lock；锁竞争会 requeue 并等待。
5. archive 是否可读；缺失会被视为 ghost task 并丢弃。
6. extractor 错误属于 transient 还是 permanent；永久失败重试到上限后进入 DLQ。
7. candidate 是否经 sink 写成版本，并同步成 meta asset。

## 文档与源码不一致

TypeScript SDK 的 README 仍说根入口是 v2 兼容、v3 在子路径；`v2.0.0` 的 `src/index.ts` 明确顶层 `export * from "./v3/index.js"`，`package.json` 的实际包名也带 `-v2`。遇到导入或类型错误时，以安装包的 `package.json` exports 和编译产物为准。

## 尚待实践验证

- 三镜像在具体 macOS/Linux、amd64/arm64 环境的实际启动与健康输出。
- 不同 OpenAI/Anthropic 兼容供应商的 tool calling、流式和 token 字段兼容性。
- README 所列 CodeBuddy 版本限制是否已在更高版本修复。
- 各 manifest 声明的 test/E2E/smoke 命令；本 tag 没有跟踪用例，本文也未运行。
- Core service 模式所需的私有 integrations，以及 Proxy `cost-guard` gitlink 内部行为。

> 证据：[`INSTALL_CN.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/INSTALL_CN.md#L391-L425)、[`MemoryProxy/src/server.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryProxy/src/server.ts#L109-L116)、[`MemoryProxy/src/routes/rate-limits.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryProxy/src/routes/rate-limits.ts#L13-L107)、[`MemoryCore/src/core/skill/conversation-add/extract-worker.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryCore/src/core/skill/conversation-add/extract-worker.ts#L320-L371)。
