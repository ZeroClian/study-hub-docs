---
title: 源码导读
description: 以固定提交定位 Sub2API 的启动、配置、路由、迁移、备份和管理 Skill。
---

# 源码导读

本文只讨论上游 [Wei-Shaw/sub2api `v0.1.176`](https://github.com/Wei-Shaw/sub2api/releases/tag/v0.1.176) 的固定提交 [`e803e3851c0a7e222cfadeafad7b8636ab959d11`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11)。`源码确认`表示下列永久链接中的代码直接表明；`推断`会显式标注；真实主机、账号、代理和上游兼容性仍是`待实践验证`。

不要从全部 handler 开始横读。先建立运行时组装图，再沿一个 API Key 请求进入网关，最后阅读会写入数据或外部存储的迁移、备份和管理操作。

## 顶层地图

```text
sub2api/
├── backend/cmd/server/          # 二进制入口与 Wire 组装
├── backend/internal/config/     # config.yaml、环境变量、默认值和校验
├── backend/internal/setup/      # 首次安装、自动初始化、安装锁
├── backend/internal/server/     # Gin 中间件与 HTTP 路由注册
├── backend/internal/handler/    # 协议入站、响应和管理面 handler
├── backend/internal/service/    # 调度、网关、备份等领域编排
├── backend/internal/repository/ # PostgreSQL、Redis 与迁移执行
├── migrations/                  # 编译进二进制的 SQL 迁移
├── deploy/                      # Compose、样例环境变量和边缘部署资料
└── skills/sub2api-admin/        # 管理 API 的 Agent/CLI Skill
```

| 先看哪里 | 读它能回答什么问题 | 不能据此推断什么 |
| --- | --- | --- |
| [`backend/cmd/server/main.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/main.go) | 进程如何在 CLI setup、首次 Web setup、Docker 自动初始化和正常服务之间分流。 | 不能证明目标主机已完成安装、监听地址已受保护，或所有依赖已健康。 |
| [`backend/cmd/server/wire.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/wire.go) 与生成的 [`wire_gen.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/wire_gen.go) | 应用如何把配置、数据连接、service、handler、路由和后台任务组装起来。 | 不要把生成文件里的依赖列表当成稳定公共 API，也不能据此跳过启动测试。 |
| [`backend/internal/config/config.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/config/config.go) | `config.yaml`、环境变量和默认值的加载/校验入口，以及 bootstrap 阶段与完整加载的区别。 | 不能凭默认值判断部署安全；Compose 是否把变量传入容器须另看部署文件。 |
| [`backend/internal/server/router.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/router.go) 与 [`backend/internal/server/routes/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes) | 全局中间件、`/api/v1` 管理面与 `/v1` 网关路由分别从哪里注册。 | 不能只因路由存在就宣称某协议、反向代理、SSE 或上游账号在真实环境可用。 |
| [`backend/internal/handler/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler) 与 [`backend/internal/service/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service) | 入站协议适配、鉴权后调度、上游请求、计费和记录的职责边界。 | 不能从单个 handler 推断所有平台、模型或错误码具有相同语义。 |
| [`backend/internal/repository/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository) 与 [`migrations/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/migrations) | 关系数据、缓存与 schema 变更的落点。 | 不能把“迁移能执行”误作“可以无备份升级或直接降级镜像”。 |
| [`skills/sub2api-admin/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/skills/sub2api-admin) | 已部署实例的账户、分组、代理、兑换码及管理 API 操作顺序。 | 它不是服务器初始化器，不应替代 Compose、秘密管理、反向代理或恢复演练。 |

## 启动与组装

`源码确认`：[`main.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/main.go#L55-L94) 先处理 `--version` 与 `--setup`，随后以 `setup.NeedsSetup()` 决定首次流程；开启 `AUTO_SETUP` 时调用 `AutoSetupFromEnv`，否则启动 setup 路由。正常路径先以 [`LoadForBootstrap`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/main.go#L134-L154) 读取配置，再由 `initializeApplication` 取得完整依赖图。

建议沿这条链阅读：

1. [`main.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/main.go) 确认进程模式、退出信号与启动顺序。
2. [`wire.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/wire.go) 看声明式 provider 集；需要追实际构造时再看 [`wire_gen.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/wire_gen.go)。
3. [`backend/internal/server/http.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/http.go) 与 [`router.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/router.go) 看 HTTP server、公共中间件和路由组装。

`推断`：这条链是排查“进程尚未监听、初始化失败、依赖注入失败或路由未注册”的首选切入点。它不是性能剖析，也不替代实际 `docker compose ... ps`、健康检查和真实网关调用。

## 配置与初始化

`源码确认`：[`LoadForBootstrap`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/config/config.go#L1686-L1707) 允许 bootstrap 阶段暂缺 JWT secret；完整 `Load` 则要求完整配置。[`GetServerAddress`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/config/config.go#L3630-L3665) 用于 setup server 的监听地址。配置加载优先级与字段校验应从同一文件追到具体字段，避免只根据 `.env.example` 猜测实际行为。

首次安装的关键读点如下：

- [`setup.NeedsSetup`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L160-L179) 同时检查配置文件和安装锁，说明删除一个文件不应成为重新初始化的手段。
- [`setup.Install`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L299-L345) 依次测 PostgreSQL/Redis、初始化数据库、创建管理员、写配置并创建安装锁。
- [`AutoSetupFromEnv`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L565-L665) 表明 Docker 自动初始化读取的环境变量集合与流程。
- [`RegisterRoutes`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/handler.go#L21-L36) 表明 setup 路由只在 setup server 分支注册，写操作还受 setup 状态保护。

这些文件能回答“为什么第一次启动进入 setup、Docker 要传哪些基础连接参数、何时会创建管理员和安装锁”。它们不能证明 `.env` 权限、秘密轮换、域名入口或公开暴露已安全配置；这些仍要按[配置与安全](./configuration-security.md)与[首次运行与验收](./first-run-acceptance.md)在授权主机验证。

> [!WARNING]
> `源码确认`：配置缺失时初始化代码可以生成 JWT 或管理员密码并记录结果。生产部署不要把自动生成且可能出现在日志中的值当作秘密交付方式；预先在受保护的 `.env`/秘密管理流程中提供持久值。固定 `JWT_SECRET` 与 `TOTP_ENCRYPTION_KEY` 的理由及 Compose 变量透传见[配置与安全](./configuration-security.md)。

## 网关路由与请求链路

`源码确认`：[`SetupRouter`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/router.go#L22-L95) 先装载日志、请求上下文、CORS、安全响应头和 server timing，再注册路由。[`registerRoutes`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/router.go#L98-L135) 将 `/api/v1` 下的认证、用户与管理路由和根引擎上的网关路由分别注册。

阅读一条网关请求时，按下面的窄路径走：

```text
客户端 /v1 请求
  -> routes.RegisterGatewayRoutes
  -> body/request-id/ops/endpoint middleware
  -> API Key 鉴权与分组约束
  -> 协议/平台选择的 gateway handler
  -> GatewayService 或 OpenAIGatewayService 调度、上游请求、计费/用量记录
```

| 入口 | 读它能回答什么问题 | 不能据此推断什么 |
| --- | --- | --- |
| [`routes/gateway.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/gateway.go#L24-L230) | `/v1` 前缀的中间件顺序、哪些 endpoint 会根据分组平台分派到不同 handler。 | 不能把源码中出现的 endpoint 当成对某个账户已授权的模型列表。 |
| [`middleware/api_key_auth.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/middleware/api_key_auth.go#L98-L267) | API Key 与用户、订阅、允许分组及资格如何在请求进入 handler 前被检查。 | 不能证明某个生产 Key 已正确限制到目标分组，需用受限测试 Key 验收。 |
| [`handler/gateway_handler.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/gateway_handler.go#L255-L317) 及同目录协议 handler | 通用网关处理如何选择账号/执行请求，协议专用实现从哪里继续追。 | 不要据此假设 OpenAI、Claude、Gemini 等兼容路径的流式事件、错误映射和计费完全相同。 |
| [`service/gateway_service.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/gateway_service.go) | 调度、候选账号和上游交互的领域实现入口。 | 单看 service 无法确认入口代理会保留 SSE、WebSocket 或 `session_id` 请求头。 |

`待实践验证`：真实调用还要验证反向代理缓冲/超时、可信转发头、Nginx 下划线请求头、真实上游凭据及模型兼容性。静态路径图不能替代[首次运行与验收](./first-run-acceptance.md)中的低成本非流式与流式验收。

## 数据迁移与备份

### 迁移

`源码确认`：初始化路径通过 [`initializeDatabase`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L354-L375) 调用 [`repository.ApplyMigrations`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/migrations_runner.go#L96-L114)。执行器会取得 PostgreSQL advisory lock、按文件名排序嵌入的 SQL、记录 filename 与 checksum，并拒绝非兼容的已应用迁移 checksum 改动。[`migrations/`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11/migrations) 是变更内容的入口，而不是直接在生产库手工修改 schema 的许可。

读它能回答“为什么迁移并发受限、为何已应用 SQL 被改动会阻塞启动、为什么升级需要保留日志和备份”。不能据此推断镜像回退会回退 schema。`官方资料`明确迁移是前向的；升级、回滚与恢复流程应以[运维、备份与升级](./operations.md)为准。

### 备份

[`service/backup_service.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/backup_service.go) 是备份领域逻辑入口，[`handler/admin/backup_handler.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/admin/backup_handler.go) 把 S3 配置、计划、创建、列举、下载与恢复暴露给管理面。读这两处能回答管理端备份能力如何分层、恢复为何属于高风险写操作。

不能据此推断对象存储凭据已经配置、备份可读、恢复可在生产无损完成，或目录版 Compose 的本地数据已经被纳入备份。`待实践验证`：任何升级前应在隔离环境执行一次恢复演练，留下恢复前后版本、时间点、校验和和验收记录；没有该证据时应停止升级而非假设可回滚。

## 上游管理 Skill

[`skills/sub2api-admin/SKILL.md`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/skills/sub2api-admin/SKILL.md) 是面向已运行实例的管理 Agent 说明。`源码确认`：它要求优先使用 bundled CLI、从只读查询开始、破坏性或批量写入前确认目标、写入后再读回验证；其参考文档还警告账户导出会包含凭据与 token。

适用问题包括账户、分组、代理、兑换码、批量变更和未封装的管理 API。它不能回答 Docker 是否启动、数据库能否连接、初始化是否完成或反向代理是否安全；这些属于部署与验收阶段。使用时把 `SUB2API_BASE_URL` 与管理员凭据仅置于受保护环境，避免回显到聊天、shell 历史、日志和导出文件。

## 推荐阅读顺序

1. [`main.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/cmd/server/main.go) -> `config.go` -> `setup.go`：先确定进程为何处于当前模式。
2. `wire.go`/`wire_gen.go` -> `server/router.go`：再识别依赖由谁创建、HTTP 行为由谁装配。
3. `routes/gateway.go` -> `api_key_auth.go` -> `gateway_handler.go` -> 对应 service：用一个具体 endpoint 走完整请求链路。
4. `migrations_runner.go` -> `migrations/`：在涉及 schema、升级或启动失败时阅读。
5. `backup_service.go` -> `backup_handler.go`：在设计恢复、计划备份或管理面改动时阅读。
6. `skills/sub2api-admin/`：仅当实例已可访问且需要管理对象时使用。

这个顺序优先回答“当前变更会在哪里生效、会写入哪里、如何验证”。只有在需求确实涉及特定协议、支付、OAuth 或后台页面时，再向相应 handler、service、repository 和前端扩展；不要为了理解一个 API Key 失败先读完整项目。

## 二次开发边界

| 变更目标 | 首选切入点 | 必须同步检查 | 验证要求 |
| --- | --- | --- | --- |
| 新增或改动网关 endpoint | `routes/gateway.go` 与对应 handler/service | API Key/分组授权、请求体限制、协议错误与用量记录 | 单元/契约测试，受控上游低成本调用，以及非流式和流式链路验证。 |
| 修改配置项 | `config.go`、Compose/样例配置、实际消费模块 | 默认值、环境变量覆盖、校验与秘密暴露面 | 新旧配置兼容测试；部署前以不输出秘密的校验命令核对传入方式。 |
| 新增 schema | 新的 `migrations/*.sql` 与 repository 代码 | 迁移锁、checksum、不向后修改已应用迁移 | 空库与已有库升级测试；升级前备份、恢复演练和回退说明。 |
| 改动备份/恢复 | `backup_service.go`、`backup_handler.go` 及存储适配 | 身份验证、对象存储权限、保留策略和恢复前置条件 | 隔离恢复演练；不得先在生产用唯一副本验证。 |
| 扩展管理自动化 | `skills/sub2api-admin/` 或明确的 admin route | 最小权限、目标确认、幂等键、写后读取 | 先只读、再小范围写入、最后读回；导出物按秘密处理。 |

所有源码修改都应使用隔离 worktree；工作树与 TDD 是**源码变更**的工程措施，不是纯部署的前置条件。先写清兼容性、数据所有权、失败语义和回滚点，再增加或更新最小回归测试。不得修改已应用 migration、不得以删除数据卷或手改迁移记录绕过失败，也不得把内部 Go 包路径当成已承诺的外部接口。

在交付前至少留下：固定 commit/制品版本、改动文件、测试命令与结果、迁移/备份影响、真实环境验证范围，以及尚未验证的外部依赖。源码阅读能缩小风险，不能把`待实践验证`转写成“已验证”。
