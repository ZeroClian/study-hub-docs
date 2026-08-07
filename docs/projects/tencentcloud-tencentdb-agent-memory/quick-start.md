---
title: 快速开始
description: 按官方部署方式理解 TencentDB Agent Memory 的最小可用闭环。
---

# 快速开始

最短路径是用官方脚本拉起三件套：Memory Core、Memory Hub（Panel + Knowledge）和 Memory Proxy。以下命令全部来自固定版本的官方文档，**本次未执行，均为待实践验证**。

## 前置条件

- Docker 可用，并能拉取 `agentmemory/memory-core`、`agentmemory/memory-hub`、`agentmemory/memory-proxy`。
- 两组 LLM 参数：`MEMORY_*` 用于记忆提炼和 Wiki；`PROXY_*` 用于把 Agent 请求转发到上游模型。
- 本地端口 `8420`、`8125`、`8424`、`8096` 未被占用，或在 `.env` 中改为可用端口。

## 1. 准备并校验配置

```bash
git clone --depth 1 --single-branch --branch v2.0.0 \
  https://github.com/TencentCloud/TencentDB-Agent-Memory.git
cd TencentDB-Agent-Memory/deploy/global-images
cp .env.example .env
$EDITOR .env
./verify.sh
```

至少替换：

```dotenv
MEMORY_LLM_BASE_URL=https://example.com/v1
MEMORY_LLM_API_KEY=REPLACE_ME
MEMORY_LLM_MODEL=REPLACE_ME
MEMORY_LLM_PROTOCOL=openai

PROXY_UPSTREAM_URL=https://example.com/v1
PROXY_UPSTREAM_API_KEY=REPLACE_ME
PROXY_UPSTREAM_MODEL=REPLACE_ME
```

`待实践验证`：`verify.sh` 的预期作用是校验 Docker、端口、必填变量和 LLM 连通性；可用 `--skip-llm` 跳过真实 LLM 预检。

## 2. 启动三件套

```bash
./start-all.sh
```

脚本按 Core → Hub → Proxy 顺序启动并等待健康检查。首次启动会创建管理员，生成随机 `sk-mem-...` user key，写入当前部署目录的 `.admin-key`，再调用 `/v3/meta/auth/verify` 自检。

| 地址 | 用途 |
| --- | --- |
| `http://127.0.0.1:8420` | Memory Core API |
| `http://127.0.0.1:8125` | Panel UI |
| `http://127.0.0.1:8424` | Knowledge Service |
| `http://127.0.0.1:8096` | Memory Proxy |

`待实践验证`：成功时脚本会打印服务地址和可复制的 Claude Code 启动命令。

## 3. 建立团队与 Agent

1. 打开 `http://127.0.0.1:8125`，使用 `.admin-key` 登录。
2. 创建业务用户并为其生成独立 user key，避免日常使用管理员 key。
3. 创建 Team、Agent 和 Task，并把业务用户加入 Team。
4. 在 Panel 中导入文档或公开 HTTPS 代码仓库，等待 Wiki/CodeGraph 状态变为 `ready`。

这一步的顺序很重要：Proxy 的会话绑定与资产可见性依赖 `user → team → agent → task` 元数据；仅启动容器并不会自动产生可注入的团队资产。

## 4. 让 Claude Code 经过 Proxy

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8096/claude-code/default
export ANTHROPIC_AUTH_TOKEN='<业务用户的 sk-mem key>'
claude --model '<PROXY_UPSTREAM_MODEL>'
```

首次会话由 Proxy 的 session init 引导选择 Team、Agent 和 Task。绑定成功后，后续轮次才能根据该身份召回 Chat Memory、匹配 Skill，并向 Agent 暴露 Wiki/CodeGraph 工具。

`待实践验证`：预期观察包括 Panel 中出现会话相关资产、L0 对话增加、异步生成 L1/L2/L3，以及匹配资产被注入请求。

## 5. 最小 SDK 调用

TypeScript `v2.0.0` 源码的顶层包直接导出 v3 严格隔离客户端：

```ts
import { MemoryClient } from "@tencentdb-agent-memory/memory-sdk-ts-v2";

const memory = new MemoryClient({
  endpoint: "http://127.0.0.1:8420",
  apiKey: "your-gateway-api-key",
  serviceId: "your-memory-instance-id",
  teamId: "team-1",
  agentId: "agent-1",
  userId: "user-1",
  sessionId: "session-1",
});

await memory.addConversation({
  messages: [
    { role: "user", content: "记住我偏好简洁说明" },
    { role: "assistant", content: "收到" },
  ],
});

const hits = await memory.searchAtomic({ query: "说明偏好", limit: 5 });
```

`待实践验证`：需要按实际部署补齐 Gateway key、实例与隔离三元组。不要照搬 SDK README 中旧的无 `-v2` 包名；以 `package.json` 与 `src/index.ts` 为准。

## 停止与清理

```bash
./stop-all.sh          # 保留 volume 和 admin key
./stop-all.sh --purge  # 删除 volume、admin key 和 proxy config
```

`--purge` 会删除持久化数据，应在确认无需保留资产后再使用。

> 证据：[`INSTALL_CN.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/INSTALL_CN.md#L12-L55)、[`deploy/global-images/start-all.sh`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/deploy/global-images/start-all.sh#L20-L59)、[`sdk/memory-core/typescript/src/index.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/sdk/memory-core/typescript/src/index.ts#L1-L45)。
