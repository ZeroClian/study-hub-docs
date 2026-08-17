---
title: Docker Compose 部署
description: 在单台 Linux 服务器上以固定版本、目录持久化和 HTTPS 部署 Sub2API。
---

# Docker Compose 部署

本文的证据基线是 Sub2API `v0.1.176`、提交 `e803e3851c0a7e222cfadeafad7b8636ab959d11`。文中的服务器命令尚未在目标环境运行，均属于`待实践验证`；它们不构成上线、法律或上游服务使用许可。

## 部署方式选择

`官方资料`：上游提供目录持久化 Compose、命名卷 Compose、外置 PostgreSQL/Redis 的 standalone Compose、二进制及源码构建等路径。目录持久化方式将状态保存在部署目录，便于单机检查、备份和迁移，因此本文选择它作为默认路径。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L35-L47) [Standalone Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.standalone.yml#L1-L70)

这不是高可用方案。需要跨主机容灾、托管状态服务或容量规划时，应先另行设计和验证，不要直接把单机配置复制到生产集群。

## 默认生产拓扑

本文假定一台受控 Linux 服务器、一个域名和 Docker Compose v2：应用仅在主机回环地址监听，Caddy 或 Nginx 负责公网 HTTPS。

```text
Internet -> 443/TCP -> Caddy or Nginx -> 127.0.0.1:8080 -> Sub2API
                                                     Docker bridge -> PostgreSQL
                                                                   -> Redis
```

`源码确认`：上游目录版 Compose 不发布 PostgreSQL、Redis 的宿主机端口；应用的端口绑定地址由 `BIND_HOST` 参与生成。将应用绑定为 `127.0.0.1` 后，外部请求必须经过反向代理。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L36-L43) [目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262)

`推断`：防火墙只应按管理策略开放 SSH 与 `80/443`；不要把 `8080`、`5432` 或 `6379` 作为公网服务。实际开放端口和云安全组效果仍需在目标环境检查。

## 部署前清单

- [ ] 已获得服务器、域名、DNS、反向代理和防火墙修改权限。
- [ ] Docker Engine 与 Compose v2 可用，磁盘空间可容纳镜像、PostgreSQL、Redis、应用数据和备份。
- [ ] 域名已解析到服务器，`80/443` 未被其他服务占用。
- [ ] 已确定加密备份位置、维护窗口、恢复负责人及可接受的数据丢失窗口。
- [ ] 已准备独立的数据库、Redis、管理员、JWT 与 TOTP 秘密；不在终端录屏、工单或聊天中回显。

`待实践验证`：CPU 架构、磁盘增长、DNS 生效、证书签发及实际资源上限均取决于目标服务器，不能由静态阅读替代。

## 下载固定版本文件

不要执行从上游默认分支下载后立即执行的脚本：`官方资料`表明其快捷脚本读取 `main`，文件内容可能随时间改变。[docker-deploy.sh](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-deploy.sh#L23-L24)

以下下载始终使用固定提交，而不是浮动分支：

```bash
sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/sub2api-deploy
cd /opt/sub2api-deploy

SUB2API_COMMIT=e803e3851c0a7e222cfadeafad7b8636ab959d11
curl --fail --location \
  "https://raw.githubusercontent.com/Wei-Shaw/sub2api/${SUB2API_COMMIT}/deploy/docker-compose.local.yml" \
  --output docker-compose.yml
curl --fail --location \
  "https://raw.githubusercontent.com/Wei-Shaw/sub2api/${SUB2API_COMMIT}/deploy/.env.example" \
  --output .env.example
cp .env.example .env
chmod 600 .env
mkdir -p data postgres_data redis_data backups
shasum -a 256 docker-compose.yml .env.example > source-files.sha256
```

`推断`：将文件校验值连同固定提交写入变更记录，可发现本地文件的意外替换；这不替代对来源、主机访问和镜像制品的审核。

## 固定镜像版本与摘要

`官方资料`：上游目录版 Compose 的应用镜像默认使用 `latest`，属于可变制品。通过覆盖文件将版本固定为本专题的 `0.1.176`。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L22-L43)

创建 `docker-compose.override.yml`：

```yaml
services:
  sub2api:
    image: weishaw/sub2api:0.1.176
```

拉取后记录实际摘要，并在变更记录中保存 tag、摘要和获取日期：

```bash
docker pull weishaw/sub2api:0.1.176
docker image inspect weishaw/sub2api:0.1.176 \
  --format '{{index .RepoDigests 0}}'
```

`推断`：明确 tag 比默认 `latest` 更可复现，但 tag 理论上仍可能被重新推送。严格环境应将记录到的 digest 纳入批准制品，并在后续 Compose 覆盖中按 digest 固定。

## 生成并保护配置

`.env` 仅存放目标服务器生成的真实值，权限应为 `0600` 且不进入 Git。以下是结构示例，尖括号是独立随机值的占位符，不是可直接投入使用的秘密：

```dotenv
BIND_HOST=127.0.0.1
SERVER_PORT=8080
SERVER_MODE=release
TZ=Asia/Shanghai

POSTGRES_USER=sub2api
POSTGRES_DB=sub2api
POSTGRES_PASSWORD=<independent-postgres-secret>
REDIS_PASSWORD=<independent-redis-secret>

ADMIN_EMAIL=<administrator-email>
ADMIN_PASSWORD=<independent-initial-admin-secret>
JWT_SECRET=<persistent-independent-jwt-secret>
TOTP_ENCRYPTION_KEY=<persistent-independent-totp-secret>

SECURITY_URL_ALLOWLIST_ENABLED=true
SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=false
SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=false
SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS=api.example-upstream.com,models.example-upstream.com
```

`源码确认`：目录版 Compose 将这些启动变量显式传给容器。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L87-L126) `推断`：`JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY` 必须跨重启保持不变，分别关系到会话签名和既有加密内容的可读性；在目标环境轮换前应备份并测试恢复。

`源码确认`：目录版 Compose 支持启用 URL allowlist、拒绝不安全 HTTP/私网主机，并以逗号分隔的上游主机列表作为 allowlist。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L128-L152) 上例的两个 `example-upstream.com` 主机只是结构占位符，必须替换为已审核、已验证的真实上游主机。`推断`：allowlist 启用时，不完整的主机列表会拒绝遗漏的上游请求；这是一种预期的 fail-closed 行为，应在上线前以最小真实请求逐项补齐和验证。

私有上游是受控例外：只有确有业务需要且网络边界可验证时，才允许私网主机，并使用精确的上游主机列表、私网路由和最小网络权限；不要为解决单个失败请求而关闭 allowlist 或放开所有私网目标。

高级配置的实际透传边界、代理与长期安全基线见[配置与安全](./configuration-security.md)。

## 渲染 Compose 配置

所有 Compose 命令均显式加载基础文件和覆盖文件，避免遗漏固定镜像或本地覆写：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml config -q
docker compose -f docker-compose.yml -f docker-compose.override.yml config --images
install -m 0600 /dev/null rendered-compose.yaml
docker compose -f docker-compose.yml -f docker-compose.override.yml config > rendered-compose.yaml
```

`官方资料`：`docker compose config` 会解析 Compose 模型，适合在启动前检查合并结果。[Docker Compose config](https://docs.docker.com/reference/cli/docker/compose/config/)

`推断`：`rendered-compose.yaml` 会包含解析后的秘密，因此先以 `0600` 创建文件。它不应提交、上传或放入公开 CI 日志；检查后应依照本地秘密管理策略处理它。

## 启动与首次观察

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml pull
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=200 sub2api
curl --fail --silent http://127.0.0.1:8080/health
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec postgres pg_isready -U sub2api -d sub2api
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec redis redis-cli ping
```

`源码确认`：Compose 启用 `AUTO_SETUP=true`；首次启动会连接 PostgreSQL/Redis、执行迁移并初始化管理员。管理员密码未显式设置时，程序会生成并记录到日志，因此生产入口公开前应提供受保护的独立初始密码。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L131-L147) [setup.go](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L541-L650)

`源码确认`：`/health` 只返回进程状态，不会探测 PostgreSQL 或 Redis；它不能证明管理员登录、上游配置或网关请求可用。[common.go](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/common.go#L9-L14)

首次登录、真实请求和流式响应的验收门槛见[首次运行与验收](./first-run-acceptance.md)。

## 配置 HTTPS

默认采用 Caddy，不将 Caddy 与 Nginx 串联。`官方资料`：上游提供 [Caddyfile](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/Caddyfile#L1-L60)，其基线以客户端直连 Caddy 为前提。

将 `api.example.com` 替换为已解析到本服务器的真实域名，并写入 `/etc/caddy/Caddyfile`：

```text
api.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

验证并加载配置：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl status --no-pager caddy
```

`推断`：防火墙或云安全组应只允许公网访问 `80/tcp` 与 `443/tcp`；SSH 仅允许受控管理来源；`8080` 保持 `127.0.0.1` 绑定，不配置公网入站规则。完成 DNS 和证书签发后，分别验证 HTTPS 健康端点与 HTTP 跳转：

```bash
curl --fail --silent --show-error https://api.example.com/health
curl --head --silent --show-error http://api.example.com
```

若服务器已有 Nginx 运维体系，可改用 Nginx 作为唯一入口。`源码确认`：它必须允许带下划线的请求头，否则 `session_id` 粘性会话头会被忽略。[README_CN.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L218-L226) 无论选用 Caddy 还是 Nginx，都应反向代理至 `127.0.0.1:8080`；SSE/WebSocket、CDN、可信客户端 IP 与源站防火墙的安全要求见[配置与安全](./configuration-security.md)。

`待实践验证`：域名证书签发、浏览器 WebAuthn Origin、长连接稳定性和 CDN 的真实转发行为，需要在授权域名和真实流量下测试。

## 下一步

1. 阅读[配置与安全](./configuration-security.md)，确认 `.env` 透传、秘密保留、入口代理和 allowlist 的实际配置。
2. 阅读[首次运行与验收](./first-run-acceptance.md)，完成依赖、管理员、非流式和流式请求的分层验收。
3. 在升级前阅读[运维、备份与升级](./operations.md)：`官方资料`表明数据库迁移前向执行，单纯更换回旧镜像不等于数据回滚。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L149-L153)
