---
title: 二次开发指南
description: 按变更类型定位模块、契约、不变量和验证边界。
---

# 二次开发指南

二次开发的关键不是先改 UI，而是先确定资产权威归属和请求经过的边界。一个功能通常跨 Proxy、Core/Knowledge 和 Panel 三层，但应只在拥有该语义的组件中落地。

## 变更定位表

| 目标 | 主改模块 | 常见联动 |
| --- | --- | --- |
| 新增一种记忆提炼/召回策略 | `MemoryCore/src/core` | Gateway schema、SDK 类型、Proxy injector |
| 修改 Skill 提取、审核或版本 | `MemoryCore/src/core/skill` | `skill-handlers.ts`、Panel Skill proxy、SDK |
| 新接入 Agent/IDE | `MemoryProxy/src/agent-adapters`、`session`、`injection/agents` | INSTALL 文档、header 预选、协议流式适配 |
| 新增上下文资产注入 | `MemoryProxy/src/injection/injectors` | registry 顺序、预算、Core/Knowledge client |
| 支持新 CodeGraph 来源 | `MemoryKnowledge/src/source-fetcher` | 安全策略、module worker、API schema |
| 扩展 Wiki/CodeGraph 工具 | Knowledge engine + `routes/tools.ts` | MCP tools、Panel client port、前端 service |
| 新增团队/ACL 元数据 | `MemoryCore/src/metadata` | `MetadataClient`、Panel meta action/API |
| 新增 Panel 聚合操作 | `MemoryPanel/src/panel/http/routes` | port/adapter、React service 与页面 |

## 必须保持的不变量

### 隔离与授权

- v3 Memory 写入必须携带 `team + agent + user`；不要使用服务级默认值替代用户身份。
- 同时在服务端开启 `V3_STRICT_ISOLATION`；默认关闭时 Core 会把缺字段补为 `default`，SDK 的构造校验不能保护绕过 SDK 的调用方。
- Knowledge 查询必须先按 `x-tdai-service-id` 限定租户，再用 team/asset ID 查找。跨租户资源应表现为不存在，而不是泄露“无权限”。
- `private` 资产只有 owner 可读；`team`、`restricted` 和 `agent` 绑定的含义由 meta/ACL 层统一决定。不要在 Panel 或 Proxy 自建第二套可见性规则。

### 异步状态

- 创建、ingest、sync 的 HTTP 成功只代表接收任务。状态必须完整覆盖 `pending → processing → ready/failed`。
- 同一 Wiki/CodeGraph 的构建必须串行；删除处理中资产要能通知 worker 取消，并清理 DB、文件和内存句柄。
- 服务重启要把中断任务标为失败，并恢复可复用索引；不能让资源永久停在 `processing`。

### Skill 可靠性

- 先写 archive，再在同一 tasks mutex 内登记 task 和入队 Agent。
- worker 的 agent extract lock 需要续租和最终释放；失败要区分可重试与永久失败。
- Skill 更新追加新版本，`expected_version` 冲突应暴露给调用方，不做静默覆盖。
- Skill 与 meta asset 的 ID 对齐；创建时资产登记失败不能留下“只在 Skill API 可见”的半成品。
- 不要把 `allowExecutable` 当成已生效的上传安全开关：该配置在此 commit 已解析但未传入 `SkillResourceStore`，资源存储也没有执行文件拒绝逻辑。

### Proxy 兼容

- adapter 负责协议差异，通用 handler 不应散落 Claude Code/CodeBuddy 特判。
- injector 必须声明失败语义：可降级的召回失败不要破坏上游请求，身份/授权失败则不能静默注入错误用户的资产。
- 流式响应修改要保持 SSE/Anthropic/OpenAI 结束事件和计费字段一致。

## 推荐实现顺序

1. 在对应的 schema/type/port 中明确输入、输出和错误语义。
2. 在领域服务实现状态变化与不变量，不从路由直接操作存储。
3. 通过 factory/registry/adapter 组装实现。
4. 更新 HTTP route 或 SDK，不让内部存储结构泄露成公共契约。
5. 若需要 Panel，先扩展服务端 port/adapter，再扩展 React service 和页面。
6. 补充单元、契约和跨模块 E2E；该 tag 缺测试文件，应在自己的分支建立可复现基线。

## 本地开发命令

以下是上游建议，**本次未执行，均为待实践验证**：

每个模块按自己的 lockfile 安装，不要在仓库根假设单一 workspace：

```bash
cd MemoryCore && npm test
cd MemoryKnowledge && pnpm typecheck && pnpm test
cd MemoryPanel && pnpm typecheck && pnpm test
cd MemoryProxy && npm test
cd sdk/memory-core/typescript && npm run build && npm test
```

仓库贡献规范要求 Conventional Commits、DCO 签名、新功能补测试、Bug 修复优先补复现测试。不同模块使用 npm 或 pnpm，提交前应遵循模块 lockfile，避免更新无关依赖。

## 版本与契约策略

- 固定 Git tag、镜像 tag 与 SDK 版本；不要把三者的版本号视为相同生命周期。
- TypeScript SDK 在 `v2.0.0` 已把顶层导出切到 v3，但模块 README 仍描述旧默认；二次开发应以 `package.json` exports 与 `src/index.ts` 为准，并同步修正文档。
- `MemoryCore/package.json` 仍标 `2.0.0-beta.1`，仓库 Release 是 `v2.0.0`。这说明仓库 Release 与内部包版本可能不同，发布脚本需分别验证。
- 公共兼容边界优先看 OpenAPI、SDK 公共类型和 Panel `docs/api`；内部 route/DB schema 不应自动承诺稳定。
- Core service 模式依赖公开 Git 树中不存在的动态 `src/integrations`；在没有对应集成包时优先使用 standalone 能力，或把 service 模式列为待补齐依赖，不能假设 OSS 快照可直接构建完整服务版。

> 证据：[`CONTRIBUTING_CN.md`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/CONTRIBUTING_CN.md#L58-L120)、[`MemoryCore/src/core/skill/skill-versioning.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryCore/src/core/skill/skill-versioning.ts#L212-L218)、[`MemoryKnowledge/src/module.ts`](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/0aff21a2d9f2b8a0354aaa80a2e586aab4054562/MemoryKnowledge/src/module.ts#L219-L281)。
