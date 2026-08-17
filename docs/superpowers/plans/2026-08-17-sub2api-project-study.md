---
title: Sub2API 项目精读实施计划
description: 将固定版本研究稿拆分为十篇专题文档并接入 Study Hub 的逐步实施计划。
---

# Sub2API Project Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the fixed-version Sub2API research article into a navigable ten-page project study and self-hosting runbook, then wire it into Study Hub and verify the complete VuePress build.

**Architecture:** Keep `docs/projects/wei-shaw-sub2api/README.md` as the stable entry point and move each operational responsibility into one focused sibling page. Preserve the `v0.1.176` / `e803e385...` evidence boundary throughout, generate machine-readable study metadata only after content stabilizes, and update the centralized VuePress navigation last.

**Tech Stack:** Markdown, VuePress 2, vuepress-theme-hope, TypeScript sidebar configuration, Mermaid, Node.js validation script, pnpm.

---

## File Map

**Create:**

- `docs/projects/wei-shaw-sub2api/overview.md`: product scope, capabilities, stack, legal and operational boundaries.
- `docs/projects/wei-shaw-sub2api/architecture.md`: topology, data ownership, request lifecycle, architectural implications.
- `docs/projects/wei-shaw-sub2api/deployment.md`: deployment choice and reproducible Linux/Compose/HTTPS procedure.
- `docs/projects/wei-shaw-sub2api/configuration-security.md`: configuration reachability, secrets, ingress, proxies, SSE and hardening.
- `docs/projects/wei-shaw-sub2api/first-run-acceptance.md`: initialization, minimum object setup and layered acceptance tests.
- `docs/projects/wei-shaw-sub2api/operations.md`: logs, backup, restore, migration, upgrades and rollback.
- `docs/projects/wei-shaw-sub2api/troubleshooting.md`: symptom-driven diagnostic matrix and safe recovery actions.
- `docs/projects/wei-shaw-sub2api/source-guide.md`: source entry points and upstream admin skill boundary.
- `docs/projects/wei-shaw-sub2api/agent-runbook.md`: skills, phased gates, prohibited actions and handoff evidence.
- `docs/projects/wei-shaw-sub2api/.project-study.json`: source version, document hashes and verification boundary.

**Modify:**

- `docs/projects/wei-shaw-sub2api/README.md`: reduce to index, version baseline, evidence legend and reading routes.
- `docs/.vuepress/sidebar.ts`: add a Sub2API subgroup under GitHub project studies.
- `docs/guide/README.md`: add the project entry and reading objective.
- `docs/README.md`: make GitHub project studies discoverable from the homepage description.

**Do not modify:**

- `.obsidian/app.json`: pre-existing user change.
- `docs/projects/tencentcloud-tencentdb-agent-memory/**`: reference pattern only.
- Any upstream Sub2API source, Compose file, image or deployment host.

### Task 1: Build the project entry and conceptual pages

**Files:**
- Modify: `docs/projects/wei-shaw-sub2api/README.md`
- Create: `docs/projects/wei-shaw-sub2api/overview.md`
- Create: `docs/projects/wei-shaw-sub2api/architecture.md`

- [ ] **Step 1: Rewrite the project index**

Keep the existing frontmatter title. Replace the long-form body with these sections in order:

```markdown
# Sub2API 项目精读与自建指南

## 版本基线
## 推荐阅读顺序
## 三条使用路径
## 证据状态
## 分析边界
```

The version table must retain repository, `v0.1.176`, commit `e803e3851c0a7e222cfadeafad7b8636ab959d11`, image tag and `runtime not verified`. Link all nine sibling pages from the reading sequence.

- [ ] **Step 2: Create the overview page**

Move and refine the research article's project-positioning material into this exact outline:

```markdown
---
title: 项目概览
description: Sub2API 的定位、能力、技术栈、适用边界与版本风险。
---

# 项目概览
## 它解决什么问题
## 核心能力
## 它不是什么
## 技术栈与运行依赖
## 合规与使用边界
## 维护与版本特征
```

Retain the official disclaimer link and the README-versus-Compose PostgreSQL/Redis version discrepancy.

- [ ] **Step 3: Create the architecture page**

Move the Mermaid topology, component table and eight-stage request flow into this outline:

```markdown
---
title: 总体架构
description: Sub2API 的组件拓扑、数据所有权、请求链路和关键架构判断。
---

# 总体架构
## 运行拓扑
## 组件职责与数据所有权
## 一次网关请求怎样运行
## 状态与失败边界
## 关键架构判断
```

Explicitly state that the Go process serves both API and embedded UI, PostgreSQL owns core durable data, Redis is operational state, and `/health` is not dependency readiness.

- [ ] **Step 4: Validate the first split**

Run:

```bash
pnpm docs:validate
rg -n "^## " docs/projects/wei-shaw-sub2api/{README,overview,architecture}.md
git diff --check
```

Expected: validator prints `Markdown frontmatter and code fences are valid.`; the headings match the outlines above; `git diff --check` prints nothing.

- [ ] **Step 5: Commit the conceptual pages**

```bash
git add docs/projects/wei-shaw-sub2api/README.md \
  docs/projects/wei-shaw-sub2api/overview.md \
  docs/projects/wei-shaw-sub2api/architecture.md
git commit -m "docs: structure Sub2API project study"
```

### Task 2: Create the deployment and security guides

**Files:**
- Create: `docs/projects/wei-shaw-sub2api/deployment.md`
- Create: `docs/projects/wei-shaw-sub2api/configuration-security.md`

- [ ] **Step 1: Create the deployment guide**

Use this outline and move the corresponding verified commands from sections 5-7 of the research article:

```markdown
---
title: Docker Compose 部署
description: 在单台 Linux 服务器上以固定版本、目录持久化和 HTTPS 部署 Sub2API。
---

# Docker Compose 部署
## 部署方式选择
## 默认生产拓扑
## 部署前清单
## 下载固定版本文件
## 固定镜像版本与摘要
## 生成并保护配置
## 渲染 Compose 配置
## 启动与首次观察
## 配置 HTTPS
## 下一步
```

Commands must use the fixed commit for raw files, `weishaw/sub2api:0.1.176` in an override, `BIND_HOST=127.0.0.1`, and explicit `-f docker-compose.yml -f docker-compose.override.yml` arguments.

- [ ] **Step 2: Create the configuration and security guide**

Use this outline and preserve links to Compose, `.env.example`, `EDGE_SECURITY.md` and `Caddyfile`:

```markdown
---
title: 配置与安全
description: Sub2API 的配置层级、密钥、可信代理、SSE 与生产入口安全。
---

# 配置与安全
## 配置层级
## `.env` 透传边界
## 必须固定的秘密
## PostgreSQL 与 Redis
## URL Allowlist
## Caddy 基线
## Nginx 基线
## CDN 与可信代理
## SSE、WebSocket 与超时
## 上线安全清单
```

Include the exact warning that official Compose has no `env_file: .env`, so only values referenced under `environment` are passed. Keep `underscores_in_headers on;` for Nginx and explain why `session_id` depends on it.

- [ ] **Step 3: Check deployment cross-links and commands**

Run:

```bash
rg -n "latest|main/deploy|0\.0\.0\.0:8080|down -v|rm -rf" \
  docs/projects/wei-shaw-sub2api/{deployment,configuration-security}.md
pnpm docs:validate
git diff --check
```

Expected: any `latest`, `main`, public port, data deletion or volume deletion occurrence is inside an explicit warning, not a recommended production command; validation passes.

- [ ] **Step 4: Commit deployment documentation**

```bash
git add docs/projects/wei-shaw-sub2api/deployment.md \
  docs/projects/wei-shaw-sub2api/configuration-security.md
git commit -m "docs: add Sub2API deployment and security guides"
```

### Task 3: Create acceptance, operations and troubleshooting pages

**Files:**
- Create: `docs/projects/wei-shaw-sub2api/first-run-acceptance.md`
- Create: `docs/projects/wei-shaw-sub2api/operations.md`
- Create: `docs/projects/wei-shaw-sub2api/troubleshooting.md`

- [ ] **Step 1: Create the first-run acceptance page**

Use this outline:

```markdown
# 首次运行与验收
## Compose 自动初始化
## 首次登录与安全收口
## 最小对象关系
## 第一层：进程与容器
## 第二层：PostgreSQL 与 Redis
## 第三层：登录与鉴权
## 第四层：真实非流式请求
## 第五层：流式与计费闭环
## 验收记录模板
```

Every layer must include command or UI action, expected result, and failure stop condition. Mark UI menu names as `待实践验证` and never embed a real key.

- [ ] **Step 2: Create the operations page**

Use this outline:

```markdown
# 运维、备份与升级
## 日常观察
## 备份范围
## PostgreSQL 逻辑备份
## 内置 S3 备份
## 恢复演练
## 整机迁移
## 升级前门槛
## 固定版本升级
## 镜像与数据库回滚
## 运维交付清单
```

State that built-in backup centers on PostgreSQL and does not replace `.env`, Compose overrides, Redis-state assessment or a tested restore. State that migrations are forward-only and a downgraded image is not a database rollback.

- [ ] **Step 3: Create the troubleshooting page**

Start with a table containing these rows: container unhealthy, PostgreSQL unavailable, Redis unavailable, login invalid after restart, 2FA invalid after restart, `.env` change ineffective, API key rejected, upstream request failure, SSE buffered/disconnected, sticky session failure, upgrade migration failure and rollback mismatch.

For each row include `现象`, `先检查`, `常见原因`, `安全处理`. Follow with focused command sections. Never prescribe deleting data directories.

- [ ] **Step 4: Validate operational safety language**

Run:

```bash
rg -n "rm -rf|down -v|只要.*health|直接.*降级|清空.*数据" \
  docs/projects/wei-shaw-sub2api/{first-run-acceptance,operations,troubleshooting}.md
pnpm docs:validate
git diff --check
```

Expected: destructive phrases occur only as prohibitions; validation passes.

- [ ] **Step 5: Commit operational documentation**

```bash
git add docs/projects/wei-shaw-sub2api/first-run-acceptance.md \
  docs/projects/wei-shaw-sub2api/operations.md \
  docs/projects/wei-shaw-sub2api/troubleshooting.md
git commit -m "docs: add Sub2API acceptance and operations guides"
```

### Task 4: Create the source guide and Agent Runbook

**Files:**
- Create: `docs/projects/wei-shaw-sub2api/source-guide.md`
- Create: `docs/projects/wei-shaw-sub2api/agent-runbook.md`

- [ ] **Step 1: Create the source guide**

Map these fixed-commit entry points: `backend/cmd/server/main.go`, server router and route packages, config loader, setup package, migration runner, backup service, gateway handlers and `skills/sub2api-admin/`. For every path, explain what question it answers and what not to infer from it.

Use this outline:

```markdown
# 源码导读
## 顶层地图
## 启动与组装
## 配置与初始化
## 网关路由与请求链路
## 数据迁移与备份
## 上游管理 Skill
## 推荐阅读顺序
## 二次开发边界
```

- [ ] **Step 2: Create the Agent Runbook**

Use this outline:

```markdown
# Agent 部署 Runbook
## 适用范围
## 必需输入
## Skill 路由
## Phase 0：授权与范围
## Phase 1：制品与主机预检
## Phase 2：秘密与配置
## Phase 3：启动与初始化
## Phase 4：入口与业务验收
## Phase 5：恢复能力与交付
## 禁止事项
## 最终交付模板
```

The skill routing must name `writing-plans`, `systematic-debugging`, `verification-before-completion` and upstream `sub2api-admin`; explain that worktrees/TDD apply only to source changes. Each phase must have inputs, allowed actions, evidence and stop conditions.

- [ ] **Step 3: Validate the guides**

Run:

```bash
rg -n "writing-plans|systematic-debugging|verification-before-completion|sub2api-admin" \
  docs/projects/wei-shaw-sub2api/agent-runbook.md
pnpm docs:validate
git diff --check
```

Expected: all four skill routes are present; validation passes.

- [ ] **Step 4: Commit source and Agent guidance**

```bash
git add docs/projects/wei-shaw-sub2api/source-guide.md \
  docs/projects/wei-shaw-sub2api/agent-runbook.md
git commit -m "docs: add Sub2API source and agent runbooks"
```

### Task 5: Generate project-study metadata

**Files:**
- Create: `docs/projects/wei-shaw-sub2api/.project-study.json`

- [ ] **Step 1: Calculate final document hashes**

Run:

```bash
cd docs/projects/wei-shaw-sub2api
shasum -a 256 README.md overview.md architecture.md deployment.md \
  configuration-security.md first-run-acceptance.md operations.md \
  troubleshooting.md source-guide.md agent-runbook.md
```

Expected: ten SHA-256 lines. Keep this output for the next step.

- [ ] **Step 2: Create the metadata file**

Use schema version `1`, repository `https://github.com/Wei-Shaw/sub2api`, release `v0.1.176`, fixed commit, learning goal `能够理解项目，并按可恢复、可验收的方式完成自建`, the ten exact hashes, official source URLs, deferred modules, and:

```json
"runtime_verified": false
```

Deferred scope must include real upstream-account compatibility, target-host resource capacity, payment providers, complete frontend implementation, high availability and an actual restore drill.

- [ ] **Step 3: Validate JSON and hash coverage**

Run:

```bash
node -e 'const fs=require("fs"); const p="docs/projects/wei-shaw-sub2api/.project-study.json"; const x=JSON.parse(fs.readFileSync(p,"utf8")); if(Object.keys(x.documents).length!==10) process.exit(1); console.log(x.source.release, Object.keys(x.documents).length)'
```

Expected: `v0.1.176 10`.

- [ ] **Step 4: Commit metadata**

```bash
git add docs/projects/wei-shaw-sub2api/.project-study.json
git commit -m "docs: record Sub2API study provenance"
```

### Task 6: Wire navigation and run final verification

**Files:**
- Modify: `docs/.vuepress/sidebar.ts`
- Modify: `docs/guide/README.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Add the sidebar subgroup**

Under `group("GitHub 项目精读", [...])`, append a `group("Sub2API", [...])` after the TencentDB Agent Memory group. Add pages in this order: project home, overview, architecture, Docker Compose deployment, configuration and security, first-run acceptance, operations, troubleshooting, source guide, Agent Runbook.

- [ ] **Step 2: Update the knowledge map**

Under `## GitHub 项目精读`, keep the existing TencentDB link and add:

```markdown
- [Sub2API：项目精读与可复现自建指南](/projects/wei-shaw-sub2api/)
```

- [ ] **Step 3: Update homepage discoverability**

Add a homepage feature titled `GitHub 项目精读` whose details mention architecture, deployment, source reading and Agent runbooks. Update the “关于 Study Hub” category sentence so the category count and list include GitHub project studies.

- [ ] **Step 4: Run complete validation**

Run:

```bash
git diff --check
pnpm docs:validate
pnpm docs:build
```

Expected: no whitespace errors, `Markdown frontmatter and code fences are valid.`, and VuePress prints `success VuePress build completed`.

- [ ] **Step 5: Verify generated pages**

Run:

```bash
for page in index overview architecture deployment configuration-security \
  first-run-acceptance operations troubleshooting source-guide agent-runbook; do
  test -f "docs/.vuepress/dist/projects/wei-shaw-sub2api/${page}.html" || exit 1
done
echo "Sub2API pages rendered: 10"
```

Expected: `Sub2API pages rendered: 10`.

- [ ] **Step 6: Review the final diff and commit navigation**

Run `git status --short` and `git diff --stat 8b6dd32..HEAD` to confirm `.obsidian/app.json` remains outside all commits and only planned documentation files changed.

```bash
git add docs/.vuepress/sidebar.ts docs/guide/README.md docs/README.md
git commit -m "docs: publish Sub2API project study"
```

- [ ] **Step 7: Record final evidence**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: `.obsidian/app.json` may remain modified as the user's pre-existing change; no Sub2API or navigation files remain uncommitted. Report the exact validation/build outputs and reiterate that runtime deployment remains unverified.
