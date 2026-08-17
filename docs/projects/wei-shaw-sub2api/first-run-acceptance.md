---
title: 首次运行与验收
description: 以分层证据验证 Sub2API 初始化、依赖、鉴权、真实请求与用量闭环。
---

# 首次运行与验收

本文的证据基线是 Sub2API `v0.1.176`、固定提交 `e803e3851c0a7e222cfadeafad7b8636ab959d11`。`待实践验证`：没有在目标服务器、域名或真实上游账号中运行过这些步骤；每一层通过前都不能宣称完成部署。先完成[Docker Compose 部署](./deployment.md)和[配置与安全](./configuration-security.md)，并始终同时加载 `docker-compose.yml` 与 `docker-compose.override.yml`。

## Compose 自动初始化

`源码确认`：目录版 Compose 启用 `AUTO_SETUP=true`；应用首次启动会连接 PostgreSQL 和 Redis、执行迁移并初始化管理员。若未设置管理员密码，程序可能把生成的密码写进日志，因此不应以日志中的临时密码作为长期凭据。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L131-L147) [初始化代码](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L541-L650)

动作：启动后只读取状态和初始化日志；不要通过重新创建数据目录来反复触发初始化。

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=200 sub2api
```

预期结果：`sub2api`、`postgres` 与 `redis` 均已启动，日志中没有迁移、数据库连接或 Redis 认证失败；管理员初始化有明确结果。停止条件：任一容器退出、迁移失败、初始化报错，或管理员密码仅存在于不受保护的日志中。停止后保留日志和数据目录，转到[故障排查](./troubleshooting.md)，不要继续公开入口或创建业务对象。

## 首次登录与安全收口

`源码确认`：Compose 明确传入 `JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY`；`推断`：二者需要跨重启保持不变，否则既有会话或加密的 2FA 数据可能无法继续使用。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L87-L126) 详细的秘密保留和入口边界见[配置与安全](./configuration-security.md)。

动作：在 HTTPS 入口尚未验证时，仅通过受控 SSH 隧道访问回环端口；HTTPS 已验收后，使用受控域名访问。以下仅建立隧道，不传入或回显管理员密码：

```bash
ssh -N -L 18080:127.0.0.1:8080 <operator>@<server>
```

预期结果：操作员能在 `http://127.0.0.1:18080` 完成首次登录，或在已验证 HTTPS 域名完成登录；随后立刻轮换初始管理员密码、启用 2FA，并在受保护的秘密管理流程中保存恢复材料。`待实践验证`：固定版本管理端的具体菜单标签、2FA 引导和恢复材料格式，需在授权环境确认，不能在文档中臆造。

停止条件：只能经公网 HTTP 登录、初始密码仍在使用、`JWT_SECRET`/`TOTP_ENCRYPTION_KEY` 未纳入受保护备份，或 2FA 启用后未做一次重新登录验证。此时停止后续验收，先修正入口和秘密治理。

## 最小对象关系

`源码确认`：网关 API Key 鉴权会关联用户、订阅和允许的分组；请求调度再根据分组、模型和账号选择上游。[API Key 鉴权](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/middleware/api_key_auth.go#L98-L177) [网关处理](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/gateway_handler.go#L255-L317)

以最小、低成本的测试对象建立下列关系，再做真实调用：

```text
受控上游账号 -> 可用分组 -> 测试用户 -> 仅该分组的测试 API Key
```

- 上游账号提供目标协议、模型和授权状态。
- 分组限定该账号可被哪个请求路径选择。
- 测试用户持有受限额度、并发和有效期的 API Key；该 Key 只允许测试分组。

`待实践验证`：管理端的实际菜单名称、字段名、对象创建顺序，以及特定提供商 OAuth 授权流程取决于目标版本和上游账号，必须以受控测试账号实测；不要把推测的 UI 名称写进变更记录。

## 第一层：进程与容器

动作/命令：检查 Compose 服务和 HTTP 进程活性。

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
curl --fail --silent --show-error http://127.0.0.1:8080/health
```

预期结果：服务状态正常，`/health` 返回成功。`源码确认`：该端点只返回 `{"status":"ok"}`，不主动探测 PostgreSQL 或 Redis，因此只能证明 HTTP 进程存活。[健康端点](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/common.go#L9-L14)

停止条件：容器反复重启、健康端点失败或只能从错误的公网路径访问。不要把本层通过当作依赖、登录或业务验收；保留输出后排查。

## 第二层：PostgreSQL 与 Redis

动作/命令：分别检查 PostgreSQL 就绪和带认证的 Redis PING。Redis CLI 继承固定 Compose 配置提供的 `REDISCLI_AUTH`，不在命令中重新设置或输出密码。

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T postgres sh -ec 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T redis redis-cli ping
```

预期结果：`pg_isready` 报告接受连接，Redis 返回 `PONG`。`源码确认`：目录版 Compose 将 PostgreSQL 和 Redis 作为独立持久化服务，Redis 启用密码、AOF 和快照。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262)

停止条件：数据库未就绪、Redis 认证失败或超时。停止真实请求、记录容器日志与版本，不要修改或删除 `postgres_data/`、`redis_data/`。

## 第三层：登录与鉴权

动作/命令：确认轮换后的管理员可登录且 2FA 生效；同时向网关发送一个确定无效的 Key。这个请求不含真实秘密。

```bash
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  -H 'Authorization: Bearer invalid-key-for-acceptance' \
  http://127.0.0.1:8080/v1/models
```

预期结果：管理员重新登录受 2FA 保护；无效 Key 得到受控的拒绝响应而不是成功响应或服务错误。`源码确认`：API Key 中间件在进入网关处理前校验 Key 并检查用户、订阅、分组和资格。[API Key 鉴权](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/middleware/api_key_auth.go#L98-L267)

停止条件：无效 Key 获得成功、管理员无法通过 2FA 重新登录，或只能依赖初始密码。停止创建更多 Key，先检查持久秘密、对象授权和入口。

## 第四层：真实非流式请求

动作/命令：由受控终端以交互方式读取测试 Key，针对测试分组实际支持的端点与模型发起一次低成本、非流式请求。Key 保存在未导出的 shell 变量中，并仅写入模式 `0600` 的临时 curl 配置文件；它不会出现在 curl 参数、shell 历史、工单或录屏中。

```bash
unset SUB2API_TEST_KEY
read -r -s SUB2API_TEST_KEY
printf '\n' >&2
CURL_CONFIG="$(mktemp "${TMPDIR:-/tmp}/sub2api-curl.XXXXXX")"
chmod 600 "$CURL_CONFIG"
trap 'rm -f -- "$CURL_CONFIG"; unset SUB2API_TEST_KEY' EXIT HUP INT TERM
printf '%s\n' \
  'header = "Content-Type: application/json"' \
  "header = \"Authorization: Bearer ${SUB2API_TEST_KEY}\"" \
  > "$CURL_CONFIG"
unset SUB2API_TEST_KEY
curl --config "$CURL_CONFIG" --fail-with-body --silent --show-error \
  --data '{"model":"<approved-test-model>","messages":[{"role":"user","content":"Reply with OK."}],"stream":false}' \
  https://<approved-domain>/v1/chat/completions
rm -f -- "$CURL_CONFIG"
trap - EXIT HUP INT TERM
```

预期结果：请求以成功状态返回一个完整响应，且日志可关联到测试用户、分组和上游账号。`源码确认`：固定版本会选择账号、转发请求并记录用量；具体可用端点和模型仍由上游账号与分组配置决定。[网关路由](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/gateway.go#L175-L494) [请求与用量](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/gateway_handler.go#L444-L589)

停止条件：出现 401/403、无可用账号、模型不受支持、上游失败或 5xx。记录脱敏请求元数据、响应状态和关联日志，不要用更高权限 Key 或更大额度绕过失败。

## 第五层：流式与计费闭环

动作/命令：在同一测试对象上发起一个流式请求，并只在本地终端观察事件。Key 仍只写入模式 `0600` 的临时 curl 配置文件，不作为 curl 参数传入；完成后清除变量和临时文件。

```bash
unset SUB2API_TEST_KEY
read -r -s SUB2API_TEST_KEY
printf '\n' >&2
CURL_CONFIG="$(mktemp "${TMPDIR:-/tmp}/sub2api-curl.XXXXXX")"
chmod 600 "$CURL_CONFIG"
trap 'rm -f -- "$CURL_CONFIG"; unset SUB2API_TEST_KEY' EXIT HUP INT TERM
printf '%s\n' \
  'header = "Content-Type: application/json"' \
  "header = \"Authorization: Bearer ${SUB2API_TEST_KEY}\"" \
  > "$CURL_CONFIG"
unset SUB2API_TEST_KEY
curl --config "$CURL_CONFIG" --no-buffer --silent --show-error \
  --data '{"model":"<approved-test-model>","messages":[{"role":"user","content":"Count from one to three."}],"stream":true}' \
  https://<approved-domain>/v1/chat/completions
rm -f -- "$CURL_CONFIG"
trap - EXIT HUP INT TERM
```

预期结果：能看到首事件和连续事件，而不是请求结束后一次性输出；请求结束后，在受保护的管理端或查询中核对一条对应的用量/计费记录和账号消耗。`源码确认`：网关会处理流式响应，并提交用量记录及扣费或订阅用量更新。[流式处理与用量](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/handler/gateway_handler.go#L444-L589) [计费记录](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/gateway_usage_billing.go#L599-L625) `待实践验证`：具体管理端查询位置和不同上游的 usage 语义需在目标环境确认。

停止条件：事件被缓冲、连接提前断开、取消请求不能受控结束，或无对应的用量/计费记录。先检查[配置与安全](./configuration-security.md)中的 SSE、超时和代理设置；不要因普通 JSON 成功而跳过本层。

## 验收记录模板

将以下模板存入受控变更记录；敏感字段只记录秘密管理器中的引用或脱敏摘要，不记录 API Key、密码、OAuth token、完整请求体或完整响应体。

```markdown
# Sub2API 首次验收记录

- 日期与操作者：
- 环境与受控域名：
- 固定版本 / Commit / 镜像 digest：
- Compose 文件校验与覆盖文件：
- 测试上游、分组、用户、Key 的脱敏标识：

| 层级 | 动作与证据位置 | 预期结果 | 状态（通过/失败/豁免） | 异常、处置与复验时间 |
| --- | --- | --- | --- | --- |
| Compose 自动初始化 |  |  |  |  |
| 第一层：进程与容器 |  |  |  |  |
| 第二层：PostgreSQL 与 Redis |  |  |  |  |
| 第三层：登录与鉴权 |  |  |  |  |
| 第四层：真实非流式请求 |  |  |  |  |
| 第五层：流式与计费闭环 |  |  |  |  |

- 入口、密码轮换与 2FA 证据：
- 备份位置与恢复演练引用：
- 未关闭的待实践验证项、风险接受人和到期日：
```
