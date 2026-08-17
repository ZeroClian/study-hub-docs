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
- [ ] Docker Engine、Compose v2 与 OpenSSL 可用，磁盘空间可容纳镜像、PostgreSQL、Redis、应用数据和备份。
- [ ] 域名已解析到服务器，`80/443` 未被其他服务占用。
- [ ] 已确定加密备份位置、维护窗口、恢复负责人及可接受的数据丢失窗口。
- [ ] 已准备独立的数据库、Redis、管理员、JWT 与 TOTP 秘密；不在终端录屏、工单或聊天中回显。

`待实践验证`：CPU 架构、磁盘增长、DNS 生效、证书签发及实际资源上限均取决于目标服务器，不能由静态阅读替代。

## 下载固定版本文件

不要执行从上游默认分支下载后立即执行的脚本：`官方资料`表明其快捷脚本读取 `main`，文件内容可能随时间改变。[docker-deploy.sh](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-deploy.sh#L23-L24)

以下步骤只适用于**首次安装**。部署目录已有 `.env`、持久数据或 Compose 文件时，应视为既有部署或升级：停止在此处，先备份并按[运维、备份与升级](./operations.md)处理；绝不重新下载后覆盖 `.env`。

以下命令要求新的或空的部署目录，并始终使用固定提交，而不是浮动分支：

```bash
DEPLOY_DIR=/opt/sub2api-deploy
if [ -e "$DEPLOY_DIR/.env" ]; then
  printf '%s\n' "Refusing to overwrite an existing .env; treat this as an existing deployment." >&2
  exit 1
fi
if [ -d "$DEPLOY_DIR" ] && [ -n "$(find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  printf '%s\n' "Refusing to use a non-empty deployment directory." >&2
  exit 1
fi

sudo install -d -m 0750 -o "$USER" -g "$USER" "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

command -v openssl >/dev/null 2>&1 || {
  printf '%s\n' "OpenSSL is required to generate secrets before creating .env." >&2
  exit 1
}

SUB2API_COMMIT=e803e3851c0a7e222cfadeafad7b8636ab959d11
curl --fail --location \
  "https://raw.githubusercontent.com/Wei-Shaw/sub2api/${SUB2API_COMMIT}/deploy/docker-compose.local.yml" \
  --output docker-compose.yml
curl --fail --location \
  "https://raw.githubusercontent.com/Wei-Shaw/sub2api/${SUB2API_COMMIT}/deploy/.env.example" \
  --output .env.example
cp --no-clobber .env.example .env
chmod 600 .env
mkdir -p data postgres_data redis_data backups
sha256sum docker-compose.yml .env.example > source-files.sha256
```

`推断`：将文件校验值连同固定提交写入变更记录，可发现本地文件的意外替换；这不替代对来源、主机访问和镜像制品的审核。

## 固定镜像版本与摘要

`官方资料`：上游目录版 Compose 的应用镜像默认使用 `latest`，属于可变制品；其 PostgreSQL 与 Redis 也由 Compose 的镜像引用决定。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L22-L43) 首次部署必须把 **Sub2API、PostgreSQL、Redis 三个运行制品**都固定为已批准的 `repository@sha256:...`，不能只固定应用 tag，也不能把本文示例误解为已验证的真实 digest。

先从这个固定提交取得的 Compose 文件确认三项当前镜像来源。`config --images` 只输出镜像引用，可作为不含秘密的有界检查；不要运行或回传完整 `docker compose config`：

```bash
docker compose -f docker-compose.yml config --images
```

`config --images` 或对固定 tag 的拉取只能用于**候选发现**。候选输出（包括 `RepoDigests`）不构成批准来源，不能因为格式正确就自动提升为生产制品，也不能接受其他 registry/repository 的同形 digest。由独立的已批准变更记录或受控制品清单审核来源、平台、digest 与日期后，操作员才将其三条精确值输入以下默认流程。

```bash
set -eu
set +x

printf '%s' 'Approved weishaw/sub2api image from the controlled manifest: ' >&2
IFS= read -r SUB2API_APPROVED_IMAGE
printf '%s' 'Approved postgres image from the controlled manifest: ' >&2
IFS= read -r POSTGRES_APPROVED_IMAGE
printf '%s' 'Approved redis image from the controlled manifest: ' >&2
IFS= read -r REDIS_APPROVED_IMAGE

require_approved_image() {
  IMAGE_VALUE=$1
  EXPECTED_REPOSITORY=$2
  printf '%s\n' "$IMAGE_VALUE" | grep -Eq "^${EXPECTED_REPOSITORY}@sha256:[0-9a-f]{64}$" || {
    printf '%s\n' "Approved image does not exactly match ${EXPECTED_REPOSITORY}@sha256:<64 lowercase hex>." >&2
    exit 64
  }
}

require_approved_image "$SUB2API_APPROVED_IMAGE" 'weishaw/sub2api'
require_approved_image "$POSTGRES_APPROVED_IMAGE" 'postgres'
require_approved_image "$REDIS_APPROVED_IMAGE" 'redis'

docker pull "$SUB2API_APPROVED_IMAGE"
docker pull "$POSTGRES_APPROVED_IMAGE"
docker pull "$REDIS_APPROVED_IMAGE"
```

这三个变量始终来自外部批准记录而非 `docker image inspect`；拉取只是取得已批准的精确制品。写入覆盖文件时只含公开镜像标识；`.env` 和任何展开配置都不写入、上传或发送给 Agent：

```bash
umask 077
OVERRIDE_TMP='docker-compose.override.yml.tmp'
printf '%s\n' \
  'services:' \
  '  sub2api:' \
  "    image: ${SUB2API_APPROVED_IMAGE}" \
  '  postgres:' \
  "    image: ${POSTGRES_APPROVED_IMAGE}" \
  '  redis:' \
  "    image: ${REDIS_APPROVED_IMAGE}" \
  > "$OVERRIDE_TMP"
mv "$OVERRIDE_TMP" docker-compose.override.yml
unset SUB2API_APPROVED_IMAGE POSTGRES_APPROVED_IMAGE REDIS_APPROVED_IMAGE
```

`推断`：明确 tag 仍可能被重新推送；记录、批准并在 Compose 中使用 digest 才能让后续拉取和启动引用同一制品。PostgreSQL 或 Redis 的任何版本变更仍需要各自的兼容性审阅、备份/恢复证据和批准，不能随应用升级顺带更新。

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

首次安装时，以关闭 shell 跟踪的方式生成五个独立秘密，并由操作员输入管理员邮箱和已确认的上游主机列表。以下 Bash 子 shell 只使用 `while`、`case`、`read`、`printf` 将值写入模式为 `0600` 的临时文件；秘密不会出现在 `sed` 或其他外部程序的参数/环境中。无论普通失败还是 HUP/INT/TERM，EXIT cleanup 都会尝试删除 `.env.$$.tmp`；清理失败使整体非零。预检成功后才以同一文件系统内的 `mv` 原子替换 `.env`，并立即清空临时路径，避免 cleanup 误删正式文件：

```bash
(
  set -eu
  set +x
  umask 077
  ENV_TMP=''
  cleanup() {
    status=$?
    trap - EXIT HUP INT TERM
    if [ -n "$ENV_TMP" ] && ! rm -f -- "$ENV_TMP"; then
      status=1
    fi
    unset POSTGRES_PASSWORD REDIS_PASSWORD ADMIN_PASSWORD JWT_SECRET TOTP_ENCRYPTION_KEY
    unset ADMIN_EMAIL SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS UPSTREAM_HOSTS UPSTREAM_HOST
    exit "$status"
  }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM

  BIND_HOST=127.0.0.1
  SECURITY_URL_ALLOWLIST_ENABLED=true
  SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=false
  SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=false

printf '%s' 'Administrator email: ' >&2
IFS= read -r ADMIN_EMAIL
printf '%s' 'Confirmed comma-separated upstream hostnames (exact or *.example.com): ' >&2
IFS= read -r SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS

POSTGRES_PASSWORD="$(openssl rand -hex 32)"
REDIS_PASSWORD="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
TOTP_ENCRYPTION_KEY="$(openssl rand -hex 32)"

ENV_TMP=".env.$$.tmp"
: > "$ENV_TMP"
chmod 600 "$ENV_TMP"

while IFS= read -r ENV_LINE || [ -n "$ENV_LINE" ]; do
  case "$ENV_LINE" in
    BIND_HOST=*|POSTGRES_PASSWORD=*|REDIS_PASSWORD=*|ADMIN_EMAIL=*|ADMIN_PASSWORD=*|JWT_SECRET=*|TOTP_ENCRYPTION_KEY=*|SECURITY_URL_ALLOWLIST_ENABLED=*|SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=*|SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=*|SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS=*)
      ;;
    *)
      printf '%s\n' "$ENV_LINE" >> "$ENV_TMP"
      ;;
  esac
done < .env

printf '%s\n' \
  "BIND_HOST=$BIND_HOST" \
  "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  "REDIS_PASSWORD=$REDIS_PASSWORD" \
  "ADMIN_EMAIL=$ADMIN_EMAIL" \
  "ADMIN_PASSWORD=$ADMIN_PASSWORD" \
  "JWT_SECRET=$JWT_SECRET" \
  "TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY" \
  "SECURITY_URL_ALLOWLIST_ENABLED=$SECURITY_URL_ALLOWLIST_ENABLED" \
  "SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=$SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP" \
  "SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=$SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS" \
  "SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS=$SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS" \
  >> "$ENV_TMP"

get_env_value() {
  ENV_KEY=$1
  ENV_VALUE=
  while IFS= read -r ENV_LINE || [ -n "$ENV_LINE" ]; do
    case "$ENV_LINE" in
      "$ENV_KEY"=*) ENV_VALUE=${ENV_LINE#*=} ;;
    esac
  done < "$ENV_TMP"
}

invalid_value() {
  case "$1" in
    ''|change_this_secure_password|"<"*">") return 0 ;;
    *) return 1 ;;
  esac
}

valid_upstream_hosts() {
  IFS=, read -r -a UPSTREAM_HOSTS <<< "$1"
  ((${#UPSTREAM_HOSTS[@]} > 0)) || return 1
  for UPSTREAM_HOST in "${UPSTREAM_HOSTS[@]}"; do
    [[ "$UPSTREAM_HOST" =~ ^(\*\.)?([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)(\.([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?))+$ ]] || return 1
    [[ "$UPSTREAM_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && return 1
    case "$UPSTREAM_HOST" in
      *example.com|*example-upstream.com) return 1 ;;
    esac
  done
}

PREFLIGHT_FAILED=0
for ENV_KEY in POSTGRES_PASSWORD REDIS_PASSWORD ADMIN_PASSWORD JWT_SECRET TOTP_ENCRYPTION_KEY; do
  get_env_value "$ENV_KEY"
  invalid_value "$ENV_VALUE" && PREFLIGHT_FAILED=1
done

get_env_value BIND_HOST
[ "$ENV_VALUE" = "127.0.0.1" ] || PREFLIGHT_FAILED=1
get_env_value SECURITY_URL_ALLOWLIST_ENABLED
[ "$ENV_VALUE" = "true" ] || PREFLIGHT_FAILED=1
get_env_value SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP
[ "$ENV_VALUE" = "false" ] || PREFLIGHT_FAILED=1
get_env_value SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS
[ "$ENV_VALUE" = "false" ] || PREFLIGHT_FAILED=1
get_env_value ADMIN_EMAIL
if invalid_value "$ENV_VALUE" || [ "$ENV_VALUE" = "admin@example.com" ] || [[ ! "$ENV_VALUE" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  PREFLIGHT_FAILED=1
fi
get_env_value SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS
if invalid_value "$ENV_VALUE" || ! valid_upstream_hosts "$ENV_VALUE"; then
  PREFLIGHT_FAILED=1
fi

if [ "$PREFLIGHT_FAILED" -ne 0 ]; then
  printf '%s\n' "Production .env policy check failed; no values were printed and .env was not replaced." >&2
  exit 1
fi

mv "$ENV_TMP" .env
ENV_TMP=''
unset POSTGRES_PASSWORD REDIS_PASSWORD ADMIN_PASSWORD JWT_SECRET TOTP_ENCRYPTION_KEY
unset ADMIN_EMAIL SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS UPSTREAM_HOSTS UPSTREAM_HOST
)
```

`源码确认`：目录版 Compose 支持启用 URL allowlist，并以逗号分隔的上游主机列表作为 allowlist。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L128-L152) `推断`：启用后，列表项只能是精确主机名或 `*.example.com` 形式的主机通配符；上例的两个 `example-upstream.com` 主机只是结构占位符，必须替换为已审核、已验证的真实上游主机。不完整列表会拒绝遗漏的上游请求，这是预期的 fail-closed 行为，应在上线前以最小真实请求逐项补齐和验证。

allowlist 启用时，上游 URL 必须使用 HTTPS；`SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP` 仅在 allowlist 关闭时才会影响 HTTP 的处理。私有上游是受控例外：只有确有业务需要且网络边界可验证时，才将 `SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS` 设为 `true`，并使用精确的内部 DNS 主机名、私网路由和最小网络权限；不使用 CIDR 或 IP 地址范围作为列表项，也不要为解决单个失败请求而关闭 allowlist 或放开所有私网目标。

高级配置的实际透传边界、代理与长期安全基线见[配置与安全](./configuration-security.md)。

## 渲染 Compose 配置

所有 Compose 命令均显式加载基础文件和覆盖文件，避免遗漏固定镜像或本地覆写。上方的首次安装流程会在原子替换前执行完整生产预检；只有该预检成功后，才执行下列检查或启动命令。既有部署不要重新运行首次安装的秘密生成步骤。

默认只作语法和有界镜像检查，绝不将完整、可能含秘密的 `docker compose config` 持久化为 `rendered-compose.yaml`：

```bash
set -eu
COMPOSE='docker compose -f docker-compose.yml -f docker-compose.override.yml'
$COMPOSE config -q
RENDERED_IMAGES="$($COMPOSE config --images)"
printf '%s\n' "$RENDERED_IMAGES"

for APPROVED_IMAGE in \
  'weishaw/sub2api@sha256:<approved-64-hex-digest>' \
  'postgres@sha256:<approved-64-hex-digest>' \
  'redis@sha256:<approved-64-hex-digest>'
do
  printf '%s\n' "$RENDERED_IMAGES" | grep -Fx -- "$APPROVED_IMAGE" >/dev/null || {
    printf '%s\n' "Missing or mismatched approved image: $APPROVED_IMAGE" >&2
    exit 1
  }
done
[ "$(printf '%s\n' "$RENDERED_IMAGES" | sed '/^$/d' | wc -l | tr -d ' ')" -eq 3 ] || {
  printf '%s\n' 'Expected exactly the three approved runtime image references.' >&2
  exit 1
}
unset RENDERED_IMAGES APPROVED_IMAGE
```

在该代码块中把三个 `<approved-64-hex-digest>` 替换为变更记录中已批准、且前一步实际解析出的值；任一缺失、不匹配或额外运行制品都必须停止启动。`官方资料`：`docker compose config` 会解析 Compose 模型，适合在启动前检查合并结果。[Docker Compose config](https://docs.docker.com/reference/cli/docker/compose/config/)

只有受保护终端中的授权操作员在排障确有必要时，才可以在受限临时文件中审阅全文；不得录屏、上传、粘贴给 Agent 或返回该文件内容。无论普通失败还是 HUP/INT/TERM，EXIT cleanup 都会尝试删除临时文件；清理失败即整体失败：

```bash
(
  set -eu
  set +x
  RENDERED_CONFIG=''
  cleanup() {
    status=$?
    trap - EXIT HUP INT TERM
    if [ -n "$RENDERED_CONFIG" ] && ! rm -f -- "$RENDERED_CONFIG"; then
      status=1
    fi
    exit "$status"
  }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  RENDERED_CONFIG="$(mktemp "${TMPDIR:-/tmp}/sub2api-compose.XXXXXX")"
  chmod 600 "$RENDERED_CONFIG"
  docker compose -f docker-compose.yml -f docker-compose.override.yml config > "$RENDERED_CONFIG"
  # Only the authorized operator reviews this local file without recording it.
)
```

## 启动与首次观察

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  pull sub2api postgres redis
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
curl --fail --silent http://127.0.0.1:8080/health
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T postgres sh -ec 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T redis redis-cli ping
```

原始 `docker compose ... logs` 只可由授权操作员在不录屏的受保护终端人工审阅，或先在主机侧用严格 allowlist/redaction 生成最小摘要（时间、容器、事件类别、退出码）后再返回 Agent。不得先输出全文再脱敏；发现潜在秘密、token、Cookie、请求体或客户数据时，立即停止采集并轮换已暴露凭据。

`源码确认`：Compose 启用 `AUTO_SETUP=true`；首次启动会连接 PostgreSQL/Redis、执行迁移并初始化管理员。管理员密码未显式设置时，程序会生成并记录到日志，因此生产入口公开前应提供受保护的独立初始密码。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L131-L147) [setup.go](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/setup/setup.go#L541-L650)

`源码确认`：`/health` 只返回进程状态，不会探测 PostgreSQL 或 Redis；它不能证明管理员登录、上游配置或网关请求可用。[common.go](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/common.go#L9-L14)

首次登录、真实请求和流式响应的验收门槛见[首次运行与验收](./first-run-acceptance.md)。

## 配置 HTTPS

默认采用 Caddy，不将 Caddy 与 Nginx 串联。先按 [Caddy 官方安装文档](https://caddyserver.com/docs/install) 为目标 Linux 发行版安装 Caddy，并选择会提供 `caddy` systemd 服务的官方安装方式；本文不提供未经该发行版验证的安装命令。若安装后没有 `caddy` 服务，先按官方服务文档完成服务安装，再使用下方 systemd 命令。确认二进制可用：

```bash
caddy version
```

`官方资料`：上游提供 [Caddyfile](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/Caddyfile#L1-L60)，其基线以客户端直连 Caddy 为前提。

将 `api.example.com` 替换为已解析到本服务器的真实域名，并写入 `/etc/caddy/Caddyfile`：

```text
api.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

首次配置时先启用服务，再以 `reload-or-restart` 覆盖“软件包已带默认配置且已自动启动”与“新安装尚未运行”两种状态；之后修改配置时也使用相同的验证和加载顺序：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable caddy
sudo systemctl reload-or-restart caddy
sudo systemctl is-active --quiet caddy
sudo systemctl status --no-pager caddy

# Later Caddyfile changes
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload-or-restart caddy
sudo systemctl is-active --quiet caddy
sudo systemctl status --no-pager caddy
```

`推断`：防火墙或云安全组应只允许公网访问 `80/tcp` 与 `443/tcp`；SSH 仅允许受控管理来源；`8080` 保持 `127.0.0.1` 绑定，不配置公网入站规则。完成 DNS 和证书签发后，分别验证 HTTPS 健康端点与 HTTP 跳转：

```bash
curl --fail --silent --show-error https://api.example.com/health
test "$(curl --head --silent --show-error --output /dev/null --write-out '%{http_code}' http://api.example.com)" = 308
```

若服务器已有 Nginx 运维体系，可改用 Nginx 作为唯一入口。`源码确认`：它必须允许带下划线的请求头，否则 `session_id` 粘性会话头会被忽略。[README_CN.md](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L218-L226) 无论选用 Caddy 还是 Nginx，都应反向代理至 `127.0.0.1:8080`；SSE/WebSocket、CDN、可信客户端 IP 与源站防火墙的安全要求见[配置与安全](./configuration-security.md)。

`待实践验证`：域名证书签发、浏览器 WebAuthn Origin、长连接稳定性和 CDN 的真实转发行为，需要在授权域名和真实流量下测试。

## 下一步

1. 阅读[配置与安全](./configuration-security.md)，确认 `.env` 透传、秘密保留、入口代理和 allowlist 的实际配置。
2. 阅读[首次运行与验收](./first-run-acceptance.md)，完成依赖、管理员、非流式和流式请求的分层验收。
3. 在升级前阅读[运维、备份与升级](./operations.md)：`官方资料`表明数据库迁移前向执行，单纯更换回旧镜像不等于数据回滚。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L149-L153)
