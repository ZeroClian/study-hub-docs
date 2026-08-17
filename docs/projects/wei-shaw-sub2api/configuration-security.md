---
title: 配置与安全
description: Sub2API 的配置层级、密钥、可信代理、SSE 与生产入口安全。
---

# 配置与安全

本文只依据 Sub2API `v0.1.176` 的固定提交 `e803e3851c0a7e222cfadeafad7b8636ab959d11` 及其上游部署资料。`待实践验证`：以下配置尚未在目标域名、CDN、服务器或真实上游账号中运行，不应据此宣称已通过安全审查或生产验证。

## 配置层级

| 层级 | 推荐用途 | 生效确认方式 |
| --- | --- | --- |
| `.env` | Compose 插值和已显式引用的启动变量 | 查看脱敏后的渲染 Compose 配置 |
| `docker-compose.override.yml` | 固定镜像、追加已审核的环境变量、资源或挂载 | 使用基础文件与 override 一起渲染 |
| `data/config.yaml` | 应用高级配置 | 确认挂载、应用读取路径和运行后行为 |
| 管理后台 | 账号、分组、API Key 等持久业务对象 | 用受限测试对象进行功能验证 |

`源码确认`：目录版 Compose 绑定 `./data`、`./postgres_data` 与 `./redis_data`，并在应用服务上定义若干环境变量和数据挂载。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L44-L180) [目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262)

`推断`：先选择能表达配置所有权的层级，再检查渲染结果和行为；只修改一个文本文件而未确认其被容器读取，不能视为完成配置。

## `.env` 透传边界

`源码确认`：官方目录版 Compose **没有** `env_file: .env`。`.env` 用于 Compose 的变量插值，只有 Compose `environment` 中逐项引用的值会进入应用容器；`.env.example` 中存在但未被引用的高级变量，不会仅因写入 `.env` 而自动生效。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L44-L180) [.env.example](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/.env.example#L1-L12)

处理高级变量的顺序：

1. 使用 `docker compose -f docker-compose.yml -f docker-compose.override.yml config` 查看合并后的模型，但只在受保护终端中处理其中的秘密。
2. 若变量确实受该版本支持且未透传，在 `docker-compose.override.yml` 的对应服务 `environment` 中显式添加。
3. 若该功能由应用配置文件承载，创建并挂载 `data/config.yaml`；先按固定版本的配置注释确认键、路径与优先级。[配置文件](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/config.example.yaml)
4. 重启后用日志、管理端读回或受控行为测试确认，不能只检查 `.env` 源文件。

`待实践验证`：具体配置键的覆盖优先级及所有高级变量在目标镜像中的行为，必须在固定镜像和隔离测试数据上确认。

## 必须固定的秘密

`.env` 应设为 `0600`，由秘密管理流程生成、备份和轮换，且不得提交到版本库。每个值必须相互独立；示例中的尖括号不是秘密：

```dotenv
POSTGRES_PASSWORD=<independent-postgres-secret>
REDIS_PASSWORD=<independent-redis-secret>
ADMIN_PASSWORD=<independent-initial-admin-secret>
JWT_SECRET=<persistent-independent-jwt-secret>
TOTP_ENCRYPTION_KEY=<persistent-independent-totp-secret>
```

`源码确认`：目录版 Compose 读取 `JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY`。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L87-L126) `推断`：保持 `JWT_SECRET` 不变才能维持既有登录会话的签名连续性；更换或遗失 `TOTP_ENCRYPTION_KEY` 会影响既有 2FA 与其他加密数据的解密恢复。

`推断`：轮换这两个值是有状态变更，而不是普通重启动作。应先备份、定义失效影响和恢复计划，再在维护窗口实施并进行登录/2FA 回归测试。

## PostgreSQL 与 Redis

`源码确认`：目录版 Compose 使用独立 PostgreSQL 与 Redis 服务、目录持久化，并为 Redis 配置密码、AOF 和快照；两者未映射宿主机端口。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262)

- PostgreSQL：使用独立数据库和最小权限帐户；数据库目录、备份与恢复演练属于同一责任面。
- Redis：设置独立的 `REDIS_PASSWORD`，不把 Redis 作为可任意丢弃的公网缓存；认证密码、持久化与网络边界都需要保留。
- 网络：不要公开 DB/Redis 端口。若改用托管服务，使用其 TLS、ACL 和私网连接能力，先在 Sub2API 主机验证 DNS、证书、认证和连通性。

`推断`：上游 Compose 中适用于内部 Docker 网络的连接参数，不能原样视为公网托管数据库的安全配置。外置服务的 TLS、故障切换和连接池均为`待实践验证`项。

## URL Allowlist

`源码确认`：固定版本的目录版 Compose 将 URL allowlist 默认设置为关闭，同时允许不安全 HTTP 与私网主机。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L128-L152)

生产应根据实际要调用的上游收紧：启用 allowlist，并只列入精确主机名或 `*.example.com` 形式的主机通配符，不使用 CIDR、IP 地址或地址范围。allowlist 启用时，上游 URL 必须使用 HTTPS；`SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP` 仅在 allowlist 关闭时生效。私有上游是受控例外：若业务确需访问私网服务，应将 `SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS` 显式设为 `true`，采用精确的内部 DNS 主机名、私网路由和最小网络权限，并做连通性回归；不要因为测试失败就把所有私网地址重新开放。

`待实践验证`：allowlist 的精确语法、默认覆盖关系和每个上游要求均应在固定镜像、授权上游与测试请求中验证。

## Caddy 基线

`官方资料`：上游提供 [Caddyfile](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/Caddyfile#L1-L60)，其基线适合“客户端直接连接 Caddy”的场景。应用应仍指向 `127.0.0.1:8080`，而不是向公网暴露应用端口。

直接使用 Caddy 时，客户端地址来自实际 TCP 对端；入口应覆盖不受信任的转发头，并只允许经 HTTPS 进入。`源码确认`：上游边缘安全文档特别说明，直接 Caddy 的客户端 IP 处理不应原样套用到 CDN 后方。[EDGE_SECURITY.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L148-L201)

`推断`：Caddy 的证书自动化、DNS、HTTP 到 HTTPS 跳转和流式代理行为均需在目标域名验证；不要因为本地回环访问成功而认定公网入口已安全。

## Nginx 基线

Nginx 的 `http` 块必须包含：

```nginx
underscores_in_headers on;
```

`源码确认`：Sub2API 使用 `session_id` 等带下划线的请求头进行多账号粘性会话；Nginx 默认可能忽略此类头，导致粘性会话失效或调度行为偏离预期。[README_CN.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L218-L226)

在站点位置中，反向代理目标应为 `http://127.0.0.1:8080`，并显式设置受控的 Host、协议和客户端地址头。不要透传客户端自行提交的 `X-Forwarded-For` 作为可信地址链；应由处于网络边界的 Nginx 覆盖或按已验证的上游代理规则重建。

`推断`：Nginx 的实际头部策略、TLS 版本、站点隔离与 reload 行为须结合现有站点配置复核，不能只粘贴片段后假定安全。

## CDN 与可信代理

`源码确认`：上游边缘安全指南要求把“直连 Caddy”与“CDN 在前”分开设计；当 CDN 位于前方时，可信客户端 IP 只能来自已认证的 CDN 出口和受控转发头，而不能把任意客户端声称的 IP 当真。[EDGE_SECURITY.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L30-L67) [EDGE_SECURITY.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L148-L201)

设计只能二选一地清晰表达：

- **直连 Caddy/Nginx**：入口代理看到真实 TCP 客户端；不信任互联网传入的转发头。
- **CDN 在前**：源站防火墙仅允许 CDN 已公布且已验证的出口网段；反向代理只从这些网段接受 CDN 规定的客户端 IP 头，并覆盖其他来源的同名头。

`推断`：CDN 的 IP 范围变更、回源协议及具体头名称是供应商和时间敏感信息，应以选定 CDN 的当前官方资料维护。CDN/WAF 能在应用前吸收一部分带宽与 TLS 压力，但不消除源站防火墙、应用限流、监控和容量责任。

## SSE、WebSocket 与超时

`官方资料`：上游边缘安全指南提供 SSE、WebSocket、缓冲、压缩与超时的代理基线；普通 JSON 成功不能证明流式链路正确。[EDGE_SECURITY.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L78-L146)

代理的实现至少应满足：

- SSE 响应关闭代理缓冲，`text/event-stream` 不压缩。
- SSE 和 WebSocket 使用足以覆盖预期模型生成时间的读写/发送超时；不要将短全局响应超时施加给长连接。
- 升级 WebSocket 所需的连接与 Upgrade 头按代理产品要求传递。
- 以真实流式请求观察首事件、持续事件、客户端取消和超时，而不是只测非流式接口。

`推断`：代理、CDN、负载均衡器的任一层都可能重新缓冲、压缩或截断流，因此需在每次入口或版本变更后复测。应用内限流不能单独抵御带宽耗尽或大规模 DDoS；此类流量应在 CDN/WAF、网络与主机资源边界共同处理。[EDGE_SECURITY.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L203-L209)

## 上线安全清单

- [ ] 应用绑定 `127.0.0.1:8080`；DB/Redis 没有公网监听或安全组放行。
- [ ] `.env` 权限为 `0600`，持久 `JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY` 已纳入受保护备份与轮换计划。
- [ ] PostgreSQL、Redis 和应用数据目录具备可恢复备份，不以删目录或清卷作为排错手段。
- [ ] 镜像 tag、实际 digest、固定提交与渲染结果的脱敏摘要已记录。
- [ ] URL allowlist 已按真实上游收紧，私网例外已显式记录并测试。
- [ ] Caddy 或 Nginx 只选其一作为入口；Nginx 已启用 `underscores_in_headers on;`。
- [ ] 直连与 CDN 模式的可信 IP 策略、源站防火墙和转发头策略一致。
- [ ] SSE/WebSocket 已用真实流式请求验证，未只依赖健康检查或普通 JSON。
- [ ] CDN/WAF、入口限流、日志脱敏、监控和 DDoS 响应责任已明确；这不是法律、合规或容量批准的替代品。

下一步进入[首次运行与验收](./first-run-acceptance.md)，将进程活性、依赖可用、管理员登录和真实网关请求分别验证。
