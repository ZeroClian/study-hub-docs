---
title: Sub2API 项目精读与自建教程设计
description: 将 Sub2API 一手资料研究稿整理为可学习、可部署、可由 Agent 执行的多篇项目专题。
---

# Sub2API 项目精读与自建教程设计

## 目标

在 Study Hub 的“GitHub 项目精读”分类中新增一组 Sub2API 专题文档，使读者能够：

1. 理解 Sub2API 的产品边界、核心组件、数据所有权和网关请求链路。
2. 在单台 Linux 云服务器上，以 Docker Compose 目录版和域名 HTTPS 完成可复现部署。
3. 正确处理密钥、配置透传、PostgreSQL、Redis、反向代理、备份恢复和升级回滚。
4. 用分层验收区分进程存活、依赖可用、管理端可用和真实网关请求成功。
5. 把教程直接交给后续 Agent 执行，并通过授权门槛、禁止事项和证据要求控制风险。

## 采用方案

采用“多篇项目精读 + 部署 Runbook”方案。它与现有 TencentDB Agent Memory 专题一致，并将学习、部署和运维责任拆开，避免 486 行研究稿继续增长成难以导航的单页。

不采用以下方案：

- 保留单篇长文：维护成本最低，但查找部署步骤、排障入口和 Agent 验收条件困难。
- 只写快速部署：可以较快启动容器，但无法满足理解项目、查漏补缺和后续自动化实施目标。
- 做完整源码逐模块分析：会扩大到支付、全部协议转换和前端页面实现，超出“先能正确自建”的当前目标。

## 版本和证据基线

- 上游仓库：`Wei-Shaw/sub2api`。
- 研究版本：`v0.1.176`。
- 固定 commit：`e803e3851c0a7e222cfadeafad7b8636ab959d11`。
- 推荐应用镜像：`weishaw/sub2api:0.1.176`，部署时记录实际 digest。
- 事实优先级：固定 commit 源码和部署文件高于概述文字；官方 Release 和 Docker Hub 用于补充发布信息。
- 每篇文档继续使用 `源码确认`、`官方资料`、`推断`、`待实践验证` 四类证据状态。
- 版本敏感内容必须标明基线，不把 2026-08-17 的状态写成永久事实。

## 默认部署边界

教程主线固定为：单台受控 Linux 云服务器、Docker Engine、Compose v2、本地目录持久化、一个域名、宿主机 Caddy 或 Nginx 终止 TLS，Sub2API 只监听 `127.0.0.1:8080`。

PostgreSQL 与 Redis 使用固定版本官方 Compose 中的容器组合，不映射公网端口。Apple `container`、二进制安装、外部数据库和源码构建只做选择说明，不展开为并列的完整教程。

教程不实际登录用户服务器、不收集真实凭据、不配置第三方账号，也不把技术可用解释为上游服务条款允许。

## 文档结构

保留 `docs/projects/wei-shaw-sub2api/`，将现有研究稿重构为以下页面：

- `README.md`：专题入口、版本基线、证据口径、推荐阅读顺序和实践状态。
- `overview.md`：项目定位、核心能力、适用与不适用场景、技术栈和合规边界。
- `architecture.md`：组件拓扑、数据所有权、请求链路、持久化边界和关键架构判断。
- `deployment.md`：部署方式比较，以及默认 Linux + Docker Compose + HTTPS 的端到端步骤。
- `configuration-security.md`：环境变量、Compose 透传、高级配置、密钥、可信代理、SSE 和入口安全。
- `first-run-acceptance.md`：首次初始化、最小对象关系、API Key、分层健康检查和业务验收。
- `operations.md`：日志、监控、备份范围、恢复演练、迁移、升级、镜像回滚和数据库回滚。
- `troubleshooting.md`：按现象、检查、原因和处理动作组织的故障定位表。
- `source-guide.md`：后端入口、路由、配置、迁移、备份和上游管理 skill 的源码导航。
- `agent-runbook.md`：部署 Agent 的输入、skills、阶段门槛、允许动作、禁止事项和交付证据。

新增 `.project-study.json`，记录仓库、release、commit、学习目标、文档清单和 `runtime_verified: false`。文档哈希在内容稳定后生成。

## 内容归属和阅读路径

`README.md` 只承担入口和证据说明，不重复具体部署命令。读者按以下路径使用：

1. 学习路径：概览 -> 架构 -> 源码导读。
2. 首次搭建：部署 -> 配置与安全 -> 首次运行与验收。
3. 长期维护：运维 -> 故障排查。
4. Agent 实施：先读版本基线、部署、配置与安全，再严格执行 Agent Runbook。

跨页重复仅保留必要摘要，详细内容由一个页面负责，其他页面使用相对链接跳转。

## Agent Runbook 设计

Agent 文档明确区分两类能力：

- 搭建阶段：使用 `writing-plans` 形成带检查点的执行计划，使用 `verification-before-completion` 做最终验收，出现异常时使用 `systematic-debugging`，不得凭直觉删除数据重装。
- 运行阶段：优先使用上游 `skills/sub2api-admin` 提供的 CLI 管理账号、分组、代理和兑换码；写操作前先只读列出目标，操作后重新读取验证。

仅在修改 Sub2API 源码时引入 worktree、TDD 和代码评审流程。普通部署不要求创建源码 worktree。

Runbook 的每个阶段都要求输入、动作、通过条件和失败停止条件。秘密只能由用户或目标主机环境提供，Agent 不在聊天、日志或提交中回显 `.env`、Token、OAuth 凭据和导出文件。

## 错误处理与安全原则

- 不执行来自 `main` 的未审阅管道脚本，不使用 `latest` 作为生产制品。
- 不以 `/health` 单点成功宣告完成；必须验证 PostgreSQL、Redis、登录、错误 Key、真实请求、流式响应和用量记录。
- 不公开 `8080`、`5432`、`6379`；反向代理、源站防火墙和可信代理配置作为一个整体验收。
- 不在无可恢复备份时升级；数据库迁移后不以单纯降级镜像作为回滚。
- 不为排障删除数据目录或执行 Compose 的卷清理选项。
- 对 README 与 Compose 的版本差异、`.env` 未透传项和内置备份范围做显式提示。
- 支付、公开注册、商业运营、账号共享和上游条款判断不纳入默认搭建步骤。

## 知识库接入

- 在 `docs/.vuepress/sidebar.ts` 的“GitHub 项目精读”下新增 “Sub2API” 分组及全部专题页面。
- 在 `docs/guide/README.md` 的“GitHub 项目精读”中新增入口和简短阅读目标。
- 更新 `docs/README.md` 首页分类说明，使项目精读内容可从首页被发现。
- 不修改现有 TencentDB Agent Memory 和其他专题的顺序或内容。

## 验收标准

1. 十篇专题文档均有 YAML frontmatter，首页阅读顺序和页面相对链接完整。
2. 重要事实指向固定 commit、固定 Release 或官方文档，不以搜索摘要或二手文章为证据。
3. 部署教程能从空目录走到 HTTPS、管理端登录和最小真实 API 请求验收。
4. 配置文档明确区分 Compose 已透传变量和需要 override/config 文件的高级配置。
5. 运维文档包含备份范围、恢复演练、升级前门槛及数据库回滚边界。
6. Agent Runbook 包含 skills、分阶段停止条件、秘密处理、禁止事项和交付清单。
7. 侧栏、知识地图和首页均能发现 Sub2API 专题。
8. `.project-study.json` 与最终文档清单、commit 和哈希一致。
9. `git diff --check`、`pnpm docs:validate` 和 `pnpm docs:build` 全部成功。

## 非目标

- 不在本次工作中实际部署 Sub2API 或验证真实上游账号。
- 不覆盖每一种模型协议、支付渠道、OAuth 变体和后台页面字段。
- 不安装或发布 `sub2api-admin` skill，只说明何时以及如何复用上游版本。
- 不修改 Sub2API 上游源码、Compose 或镜像。
- 不声称完成性能、容量、高可用、灾备 RPO/RTO 或第三方条款验证。
