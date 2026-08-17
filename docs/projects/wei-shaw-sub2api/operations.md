---
title: 运维、备份与升级
description: 以可恢复备份、隔离演练和固定制品控制 Sub2API 的日常维护与升级。
---

# 运维、备份与升级

本文基于 Sub2API `v0.1.176`、固定提交 `e803e3851c0a7e222cfadeafad7b8636ab959d11`。`待实践验证`：本文没有替代目标环境的备份、恢复或升级演练。运行命令均同时加载基础 Compose 文件和覆盖文件；首次部署与秘密边界见[Docker Compose 部署](./deployment.md)和[配置与安全](./configuration-security.md)。

## 日常观察

每日或每次变更后，分别观察应用、PostgreSQL、Redis、入口代理和真实请求，而非只查看 `/health`：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=200 sub2api
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=100 postgres
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=100 redis
curl --fail --silent --show-error http://127.0.0.1:8080/health
```

`源码确认`：`/health` 只代表 HTTP 进程活性，不探测 PostgreSQL 或 Redis；Redis 还承担并发、限流和调度辅助状态，因此不能被简单当作无关缓存。[健康端点](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/common.go#L9-L14) [Redis 状态职责](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/concurrency_cache.go#L357-L377) [调度缓存](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/scheduler_cache.go#L222-L269)

`推断`：日志采集必须脱敏，避免把 Authorization、Cookie、OAuth token 或请求正文写入工单。入口代理、SSE 首事件延迟、上游错误、数据库连接、Redis 认证、磁盘空间和备份任务应分别告警；普通 JSON 成功不能代替流式验收。

## 备份范围

完整、可恢复的备份范围至少包括：

- 加密保存的 `.env`、`docker-compose.yml`、`docker-compose.override.yml`、镜像 tag/digest 与受控反向代理配置；
- PostgreSQL 逻辑备份，作为用户、账号、分组、Key、用量和迁移等核心业务状态的恢复依据；
- `data/`、`postgres_data/`、`redis_data/` 的存在性、大小、挂载方式和恢复策略评估；
- Redis 的持久化状态或经明确批准、可验证的重建策略，不能默认其总是可丢弃；
- 备份校验、保留期、异地副本、恢复负责人和最近一次恢复演练证据。

`源码确认`：目录版 Compose 将上述三个数据路径分别绑定到应用、PostgreSQL 和 Redis，Redis 配置 AOF 与快照；PostgreSQL 是核心耐久状态，Redis 也保存运行态辅助数据。[目录版 Compose](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L262) [数据所有权](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/ent.go#L45-L78) [Redis 并发状态](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/concurrency_cache.go#L417-L464)

不要把运行中的 PostgreSQL 数据目录复制当作唯一备份；目录级冷备只能在维护窗口、所有相关服务停止且恢复步骤已演练时使用。

## PostgreSQL 逻辑备份

动作：在部署目录创建受保护的 custom-format 逻辑备份。备份与恢复必须使用与源 PostgreSQL 兼容的客户端，恢复目标不得低于 dump 所需版本；本例明确不携带源对象所有者和权限，恢复后由目标环境的最小权限策略重新授予。命令让数据库容器读取自己的连接变量，不打印密码；备份产物本身仍应按敏感数据处理。

```bash
umask 077
mkdir -p backups
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  exec -T postgres sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "backups/sub2api-$(date +%Y%m%d-%H%M%S).dump"
```

预期结果：生成非零大小的 custom-format dump，并记录其校验、数据库版本、镜像 digest 和生成时间。`源码确认`：应用启动时使用 PostgreSQL，迁移文件是 schema 演进的权威来源；逻辑备份应在升级前完成并经过恢复演练。[Ent 初始化](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/ent.go#L21-L78) [迁移执行器](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/migrations_runner.go#L96-L216)

若命令失败、文件为空或无法读取，停止升级与迁移；保留现状，先解决存储、权限或数据库健康问题。

## 内置 S3 备份

`源码确认`：固定版本的备份服务将 PostgreSQL dump/restore 作为独立操作，并通过 S3 接口上传、下载和管理备份对象；它不是整机备份。[备份服务](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/backup_service.go#L28-L92) [S3 存储实现](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/backup_s3_store.go#L18-L60)

使用内置 S3 备份前，确认对象存储端点、桶、区域、最小权限凭据、保留期和下载恢复路径都受控。`源码确认`：备份配置的守卫会要求可用的 TOTP 加密密钥，相关敏感配置经该密钥加密处理；因此恢复同一份配置或 S3 备份时必须保留原有的 `TOTP_ENCRYPTION_KEY`。[备份配置守卫](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/backup_service.go#L338-L379) [备份配置加密](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/service/backup_service.go#L1243-L1260) 不要在页面、命令历史或验收记录中写入对象存储访问密钥。

`待实践验证`：固定版本管理端中的 S3 备份配置路径、计划任务界面和不同 S3 兼容服务的语义需在隔离环境验证。即使内置任务显示成功，仍需验证对象存在、可下载且可恢复，并保留 `.env`、Compose 和数据目录评估。

## 恢复演练

恢复演练必须在隔离主机或独立的 Compose 项目中进行，绝不对生产数据库执行试验性 `pg_restore`。下例创建专用目录、项目名和新的 PostgreSQL 18 命名卷；不要让它使用生产 Compose、生产数据库地址或生产数据目录。操作员必须先在变更记录中固定一个不可变的 `postgres@sha256:...` 镜像 digest，并提供已验证的 custom-format dump 路径；两项预检都在创建目标前完成。

```bash
(
  set -eu
  set +x

  printf '%s' 'Recorded PostgreSQL 18 digest (postgres@sha256:<64 lowercase hex>): ' >&2
  IFS= read -r POSTGRES_IMAGE
  if ! printf '%s\n' "$POSTGRES_IMAGE" | grep -Eq '^postgres@sha256:[0-9a-f]{64}$'; then
    printf '%s\n' 'A recorded immutable postgres@sha256 digest is required.' >&2
    exit 64
  fi
  printf '%s' 'Verified custom-format dump absolute path: ' >&2
  IFS= read -r SOURCE_DUMP
  case "$SOURCE_DUMP" in
    /*) ;;
    *) printf '%s\n' 'Use an absolute dump path so it remains valid inside the drill directory.' >&2; exit 64 ;;
  esac
  test -n "$SOURCE_DUMP"
  test -f "$SOURCE_DUMP"
  test -s "$SOURCE_DUMP"

  DRILL_PROJECT="sub2api-restore-drill-$(date +%Y%m%d%H%M%S)-$$"
  DRILL_DIR="$PWD/$DRILL_PROJECT"
  umask 077
  mkdir -p "$DRILL_DIR"
  cd "$DRILL_DIR"

  unset DRILL_POSTGRES_PASSWORD
  printf '%s' 'Isolated PostgreSQL password: ' >&2
  read -r -s DRILL_POSTGRES_PASSWORD
  printf '\n' >&2
  : > .env
  chmod 600 .env
  printf '%s\n' \
    "POSTGRES_IMAGE=$POSTGRES_IMAGE" \
    'POSTGRES_DB=sub2api_restore_drill' \
    'POSTGRES_USER=sub2api_restore' \
    "POSTGRES_PASSWORD=$DRILL_POSTGRES_PASSWORD" \
    > .env
  unset DRILL_POSTGRES_PASSWORD

  cat > compose.restore.yml <<'YAML'
services:
  postgres:
    image: ${POSTGRES_IMAGE}
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - restore_pg_data:/var/lib/postgresql/data
volumes:
  restore_pg_data:
YAML

  docker compose -p "$DRILL_PROJECT" -f compose.restore.yml config -q
  docker compose -p "$DRILL_PROJECT" -f compose.restore.yml up -d postgres
  READY=0
  ATTEMPT=1
  while [ "$ATTEMPT" -le 30 ]; do
    if docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
      exec -T postgres pg_isready -U sub2api_restore -d sub2api_restore >/dev/null 2>&1; then
      READY=1
      break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
  done
  [ "$READY" -eq 1 ]
  docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
    exec -T postgres pg_isready -U sub2api_restore -d sub2api_restore

  INITIAL_TABLE_COUNT="$(docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
    exec -T postgres psql -U sub2api_restore -d sub2api_restore -tA \
    -c "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') AND schemaname NOT LIKE 'pg_toast%';")"
  case "$INITIAL_TABLE_COUNT" in
    ''|*[!0-9]*) printf '%s\n' 'Target table count is not numeric.' >&2; exit 1 ;;
  esac
  [ "$INITIAL_TABLE_COUNT" -eq 0 ]

  docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
    cp "$SOURCE_DUMP" postgres:/tmp/source.dump
  docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
    exec -T postgres sh -ec 'pg_restore --no-owner --no-privileges --single-transaction --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/source.dump'

  RESTORED_TABLE_COUNT="$(docker compose -p "$DRILL_PROJECT" -f compose.restore.yml \
    exec -T postgres psql -U sub2api_restore -d sub2api_restore -tA \
    -c "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') AND schemaname NOT LIKE 'pg_toast%';")"
  case "$RESTORED_TABLE_COUNT" in
    ''|*[!0-9]*) printf '%s\n' 'Restored table count is not numeric.' >&2; exit 1 ;;
  esac
  [ "$RESTORED_TABLE_COUNT" -gt 0 ]
  printf 'Restored non-system table count: %s\n' "$RESTORED_TABLE_COUNT"
)
```

预期结果：在 30 秒内就绪、恢复前非系统表数为 `0`，`pg_restore` 成功后非系统表数为正整数。随后以相同固定应用镜像、独立网络和保留的 `TOTP_ENCRYPTION_KEY` 启动隔离应用，抽样核对管理员、2FA、账号、分组、用户、API Key 和用量记录，并运行一次低成本真实请求。`推断`：只有此类演练能证明 dump、配置和应用版本可共同恢复；生产环境不应为了“测试恢复”覆盖现有数据。

失败时保留隔离项目、日志、restore 输出和备份文件，评估迁移版本、配置秘密和备份完整性；不要删除演练卷来掩盖失败。不要在生产上尝试修复性恢复。

## 整机迁移

迁移前先冻结写入或安排维护窗口，完成新的逻辑备份并确认目标主机具备相同或已审阅的 Docker、Compose、CPU 架构、端口和入口配置。停止源栈后才评估是否复制目录状态；所有 Compose 操作仍使用两个文件：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml stop
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
```

`官方资料`：目录版部署建议在迁移前停止服务再整体复制部署目录。[目录版 Compose 注释](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L15-L20) `推断`：目标机还应恢复 `.env`、Compose/override、应用数据和经评估的 Redis 状态，并使用已记录的镜像 digest；不要在源机仍写入时复制 `postgres_data/`。

新主机启动后，按[首次运行与验收](./first-run-acceptance.md)完整重跑分层验收，再切换入口流量。迁移失败时保持源环境与原始备份，不删除任何数据目录。

## 升级前门槛

满足以下全部条件才允许进入升级窗口：

- 已完成可读取且有校验的 PostgreSQL 逻辑备份，并有近期隔离恢复演练；
- 已保留 `.env`、Compose/override、`data/` 状态评估、Redis 评估和当前镜像 digest；
- 已阅读目标 Release、目标部署文件与迁移变化，明确兼容性、维护窗口和回退负责人；
- 已将目标镜像固定为明确 tag 或 digest，而不是 `latest`；
- 已准备重新运行[首次运行与验收](./first-run-acceptance.md)的五层证据。

`源码确认`：迁移按顺序和校验执行，已应用迁移被修改会失败；这要求先审阅迁移并保留可恢复备份。[迁移执行器](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/migrations_runner.go#L96-L216)

## 固定版本升级

先在受控变更中记录旧 tag/digest、目标 tag/digest、Release 链接和迁移摘要；在审核后的 `docker-compose.override.yml` 中固定**应用**目标制品。PostgreSQL 与 Redis 镜像升级必须有各自固定 digest、兼容性审阅、备份/恢复证据和独立变更批准，不能随应用升级命令附带更新。然后只拉取并重建应用服务：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml config -q
docker compose -f docker-compose.yml -f docker-compose.override.yml pull sub2api
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --no-deps sub2api
docker compose -f docker-compose.yml -f docker-compose.override.yml ps sub2api
docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail=200 sub2api
```

预期结果：目标镜像已拉取、服务稳定，迁移没有错误。随后重新执行[首次运行与验收](./first-run-acceptance.md)的进程、PostgreSQL、Redis、登录/鉴权、非流式、流式和用量闭环。停止条件：迁移、依赖、登录、流式或记录任一层失败；停止扩大流量并保全证据。

## 镜像与数据库回滚

`官方资料`：上游明确说明数据库迁移是前向的；单纯改回旧镜像不等于数据库回滚。[部署说明](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/README.md#L149-L153) `源码确认`：迁移有顺序与 checksum 保护，不能通过手改已应用迁移把 schema 倒回去。[迁移执行器](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/repository/migrations_runner.go#L189-L216)

镜像回退只适用于已确认数据库兼容的场景。若升级已改变数据库，恢复路径必须是经过验证的升级前 PostgreSQL 备份，或由负责人批准并审阅的补偿计划；先停止写入和流量，再在隔离环境确认恢复方案，不能把旧镜像作为数据库回滚按钮。Redis、`.env`、`TOTP_ENCRYPTION_KEY` 和应用数据也应按备份范围判断是否需要一并恢复。

## 运维交付清单

- [ ] 当前 Commit、镜像 tag/digest、Compose 与 override 的受控副本已记录。
- [ ] `.env` 的受保护备份引用、`JWT_SECRET` 与 `TOTP_ENCRYPTION_KEY` 保留策略已交接，秘密本身未出现在文档或工单。
- [ ] PostgreSQL 逻辑备份的校验、位置、保留期和最近恢复演练证据已交接。
- [ ] `data/`、`postgres_data/`、`redis_data/` 的归属、大小、备份或重建决策已记录；Redis 未被默认视为可丢弃。
- [ ] 应用、PostgreSQL、Redis、入口代理、流式请求和上游错误的日志/告警责任人明确。
- [ ] 升级门槛、维护窗口、失败停止条件、数据库恢复负责人和补偿审批人明确。
- [ ] 所有 `待实践验证` 项有状态、证据位置、例外原因和复验日期。
