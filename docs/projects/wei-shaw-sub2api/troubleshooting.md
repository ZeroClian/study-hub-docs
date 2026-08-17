---
title: 故障排查
description: 以保全数据为前提，分层诊断 Sub2API 的容器、状态服务、鉴权、流式与升级问题。
---

# 故障排查

| 现象 | 先检查 | 常见原因 | 安全处理 |
| --- | --- | --- | --- |
| container unhealthy | Compose 状态、应用日志、`/health` | 迁移、依赖连接、配置或端口错误 | 保留日志和数据目录；先停止扩大流量 |
| PostgreSQL unavailable | `pg_isready`、postgres 日志、磁盘和认证 | 容器未就绪、密码/数据库名不一致、存储或连接故障 | 不覆盖数据库；先完成逻辑备份可行性评估 |
| Redis unavailable | 带认证的 `PING`、redis 日志、网络 | 密码、AOF、资源或容器网络问题 | 不把 Redis 默认当作可丢弃缓存 |
| login invalid after restart | `JWT_SECRET` 是否持续传入、应用日志 | `.env` 未透传、秘密被替换、入口 Cookie/HTTPS 问题 | 不重置用户数据；用受保护配置副本比对 |
| 2FA invalid after restart | `TOTP_ENCRYPTION_KEY`、时间同步、登录日志 | 加密密钥变更/丢失、时钟偏差、配置未传入 | 保留原密钥和数据，走受控恢复流程 |
| `.env` change ineffective | 合并后的 Compose 配置、容器实际环境 | 变量只被 Compose 插值、未显式透传或需 `config.yaml` | 先确认固定版本配置语义，再做最小 override |
| API key rejected | 测试 Key、用户、分组、订阅/余额、模型 | Key 无效、无权访问分组、账号或模型不可用 | 使用低权限测试对象，日志与 Key 都要脱敏 |
| upstream request failure | 状态码、应用日志、上游账号和 allowlist | 授权失效、模型不支持、上游限流或网络策略 | 不改为高权限 Key，不关闭安全边界来“验证” |
| SSE buffered/disconnected | 首事件时间、代理缓冲/压缩、超时、CDN | 代理重新缓冲、短超时、连接被中间层截断 | 先做低成本流式复现，保留脱敏时间线 |
| sticky session failure | `session_id` 到达应用、Nginx 配置 | 下划线头被忽略、代理未传递或路由策略不一致 | 仅调整受控代理配置并复验，不暴露应用端口 |
| upgrade migration failure | 目标 Release、迁移日志、备份、锁/checksum | 版本不兼容、迁移被改动、依赖未就绪 | 停止升级，不手改已应用迁移或覆盖数据库 |
| rollback mismatch | 当前 schema、旧镜像兼容性、恢复演练 | 误把镜像降级当作数据库回滚 | 用已验证备份或批准的补偿计划恢复，不删除卷 |

本文以 Sub2API `v0.1.176`、固定提交 `e803e3851c0a7e222cfadeafad7b8636ab959d11` 为证据边界。`待实践验证`：具体日志字段、管理端 UI、上游 OAuth 和目标代理行为必须在授权环境验证。部署配置与秘密边界见[Docker Compose 部署](./deployment.md)和[配置与安全](./configuration-security.md)。

## 只读诊断基线

先采集不含秘密的状态和依赖信号，再决定是否实施修复。所有 Compose 命令同时加载基础文件和覆盖文件：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
curl --fail --silent --show-error http://127.0.0.1:8080/health
```

原始 `docker compose ... logs` 只可由授权操作员在不录屏的受保护终端人工审阅，或先在主机侧以严格 allowlist/redaction 生成最小摘要（时间、容器、事件类别、退出码）后再回传。不得先输出全文再脱敏；发现潜在秘密、token、Cookie、请求体或客户数据时，立即停止采集并轮换已暴露凭据。

`源码确认`：`/health` 仅说明 HTTP 进程存活，不能判定 PostgreSQL、Redis、管理员、API Key 或上游请求已可用。[健康端点](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/common.go#L9-L14) 诊断阶段不执行删除数据目录、删除卷或未审阅的重装动作。

## PostgreSQL 与 Redis

诊断动作：分别测试数据库可用性和 Redis 认证。Redis CLI 继承固定 Compose 配置中的 `REDISCLI_AUTH`，不在终端中写入或重设密码。

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T postgres sh -ec 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T redis redis-cli ping
```

`源码确认`：目录版 Compose 为 PostgreSQL 和 Redis 配置独立持久化目录，Redis 还启用密码、AOF 与快照。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262) `推断`：失败时应先区分容器未启动、认证拒绝、磁盘/内存耗尽和网络超时，再变更一个受控变量并重试。

修复边界：不要通过删除 `postgres_data/` 或 `redis_data/` 解决启动失败。数据库恢复、Redis 状态取舍和目录迁移必须遵循[运维、备份与升级](./operations.md)中的备份与隔离演练流程。

## 登录、2FA 与配置透传

诊断动作：以受控副本核对 `.env`、`docker-compose.yml`、`docker-compose.override.yml` 的变更记录。以下 `.env` 检查只输出变量名及 `set`/`missing` 状态，空值（如 `JWT_SECRET=`）同样是 `missing`，绝不输出值：

```bash
for ENV_KEY in JWT_SECRET TOTP_ENCRYPTION_KEY; do
  if grep -Eq "^${ENV_KEY}=[^[:space:]].*" .env; then
    printf '%s: set\n' "$ENV_KEY"
  else
    printf '%s: missing\n' "$ENV_KEY"
  fi
done

# 此 grep 仅证明 Compose 文本中出现变量名，不证明运行容器实际收到该值。
for ENV_KEY in JWT_SECRET TOTP_ENCRYPTION_KEY; do
  if grep -Eq "(\\$\\{?${ENV_KEY}\\}?|${ENV_KEY}:)" \
    docker-compose.yml docker-compose.override.yml; then
    printf '%s: referenced\n' "$ENV_KEY"
  else
    printf '%s: not referenced\n' "$ENV_KEY"
  fi
done

# 仅从运行中的 sub2api 容器输出固定键名及 set/missing 状态。
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T sub2api sh -ec '
    for ENV_KEY in JWT_SECRET TOTP_ENCRYPTION_KEY; do
      case "$ENV_KEY" in
        JWT_SECRET) ENV_VALUE=${JWT_SECRET:-} ;;
        TOTP_ENCRYPTION_KEY) ENV_VALUE=${TOTP_ENCRYPTION_KEY:-} ;;
      esac
      if [ -n "$ENV_VALUE" ]; then
        printf "%s=set\\n" "$ENV_KEY"
      else
        printf "%s=missing\\n" "$ENV_KEY"
      fi
    done
    unset ENV_VALUE
  '
```

`源码确认`：目录版 Compose 没有 `env_file: .env`；只有在 Compose `environment` 中明确引用的值才会进入容器，`JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY` 是已显式传入的持久秘密。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L44-L180) [秘密配置](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L87-L126)

诊断结论：`.env` 的 `missing` 表示源文件没有非空值；`referenced`/`not referenced` 仅为 Compose 文本引用证据，不能证明变量进入容器；容器检查的 `missing` 才说明运行时未收到非空值。若源文件已更新而运行时状态或行为未改变，变更可能尚未应用到运行中的容器，需要在维护窗口重建受影响服务。修复边界：若变量没有透传，先确认该固定版本是否支持它，再在已审阅的 override 中作最小补充或使用已验证的 `data/config.yaml`。在获批变更后，才重建应用容器并复验：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --force-recreate sub2api
```

登录或 2FA 在重启后失效时，保留原有数据与密钥，检查秘密连续性和时钟；不得以删除用户或重新初始化替代恢复。

## API Key 与上游请求

诊断动作：先发一个无效 Key 请求确认拒绝路径，再用低权限测试 Key 对目标分组实际支持的模型执行低成本非流式请求。无效 Key 示例不含真实秘密：

```bash
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  -H 'Authorization: Bearer invalid-key-for-diagnosis' \
  http://127.0.0.1:8080/v1/models
```

`源码确认`：API Key 中间件会校验 Key，并检查用户、订阅、允许分组及资格；请求处理再按分组、模型和账号选择上游。[API Key 鉴权](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/middleware/api_key_auth.go#L98-L267) [账号选择](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/gateway_handler.go#L255-L317)

修复边界：依次收敛 Key、用户、分组、订阅/余额、账号状态、模型和 URL allowlist；不要把生产管理员 Key 写入调试命令、临时关闭 allowlist，或用未审阅的提供商 OAuth 流程覆盖问题。`待实践验证`：具体上游凭据、UI 菜单和模型兼容性需要在授权测试账号上确认。

## SSE 与粘性会话

诊断动作：使用受限测试 Key 发起一次低成本流式请求，记录首事件、连续事件、完成或断开时间；同时检查入口代理的缓冲、压缩、读写超时和 CDN 行为。`官方资料`：上游边缘安全指南要求为 SSE/WebSocket 处理缓冲、压缩、Upgrade 头和长超时，普通 JSON 成功不足以说明流式链路正常。[边缘安全指南](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/EDGE_SECURITY.md#L78-L146)

`源码确认`：`session_id` 等下划线请求头参与多账号粘性会话；Nginx 可能忽略这类头，需要 `underscores_in_headers on;`。[中文 README](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L218-L226)

修复边界：只在受控代理配置中逐项修改并重测流式、取消和粘性行为；不为绕过代理问题而直接公开 `8080`，不把 CDN 或任意客户端传入的转发头当作可信来源。更完整的入口要求见[配置与安全](./configuration-security.md)。

## 升级迁移与回退

诊断动作：保留目标 Release、当前/目标镜像 digest、迁移日志和可恢复备份的证据，先识别失败发生在制品、依赖、迁移锁、checksum 还是应用启动。`源码确认`：迁移按顺序执行并验证 checksum；修改已应用迁移会被拒绝。[迁移执行器](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/migrations_runner.go#L96-L216)

修复边界：停止升级与新写入，保留现有数据库和日志。`官方资料`：迁移是前向的，镜像降级不是数据库回滚。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L149-L153) 只有已验证的升级前备份恢复路径或经负责人批准的补偿计划才能处理 schema 不匹配；先在隔离环境演练，绝不通过删除卷、手改迁移记录或覆盖生产数据库来试错。
