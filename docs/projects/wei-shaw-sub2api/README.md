---
title: Sub2API 项目精读与自建指南
description: 基于 Sub2API v0.1.176 的架构研究、可复现 Docker Compose 部署、运维与 Agent 实施手册。
---

# Sub2API 项目精读与自建指南

本专题把固定版本的上游资料整理为一条从项目理解到自建、验收和长期维护的学习路径。它不替代上游 README，也不把静态阅读当作已完成的服务器部署。

> [!WARNING]
> 上游明确要求合法使用，并提示项目仅供学习研究、商业使用风险由使用者自行承担。项目涉及第三方 AI 账号、OAuth 凭据、API Key、计费和支付；上线前必须独立确认软件许可证、上游服务条款、当地法律、隐私与支付合规。本文不构成法律或商业授权意见。证据见 [`README_CN.md`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L22-L29) 与 [`LICENSE`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/LICENSE)。

## 版本基线

| 项目 | 值 |
| --- | --- |
| 官方仓库 | [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) |
| 研究版本 | [`v0.1.176`](https://github.com/Wei-Shaw/sub2api/releases/tag/v0.1.176) |
| 固定 Commit | [`e803e3851c0a7e222cfadeafad7b8636ab959d11`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11) |
| 镜像 | `weishaw/sub2api:0.1.176` 或 `ghcr.io/wei-shaw/sub2api:0.1.176` |
| 实践状态 | `待实践验证`：静态阅读官方文档、部署配置与源码；未在目标服务器执行部署 |

`官方资料`：官方快捷脚本从 `main` 下载部署文件，官方 Compose 又默认使用 `latest`；二者都随时间变化。本文以固定 tag、commit 和镜像 tag 作为讨论基线。证据：[`docker-deploy.sh`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-deploy.sh#L23-L24)、[`docker-compose.local.yml`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L22-L43)。

## 推荐阅读顺序

1. [项目概览](./overview.md)：先确认项目解决的问题、能力边界与版本风险。
2. [总体架构](./architecture.md)：理解运行拓扑、数据所有权和网关请求链路。
3. [Docker Compose 部署](./deployment.md)：以固定制品建立默认单机部署。
4. [配置与安全](./configuration-security.md)：处理秘密、配置透传、反向代理和流式连接。
5. [首次运行与验收](./first-run-acceptance.md)：区分进程活性、依赖可用和真实请求成功。
6. [运维、备份与升级](./operations.md)：准备可恢复的日常维护与变更流程。
7. [故障排查](./troubleshooting.md)：按现象收敛检查和安全处理动作。
8. [源码导读](./source-guide.md)：从路由、配置、迁移和备份入口进入固定版本源码。
9. [Agent 实施 Runbook](./agent-runbook.md)：把授权、阶段门槛、禁止事项和交付证据交给执行 Agent。

## 三条使用路径

| 路径 | 建议顺序 | 适用目标 |
| --- | --- | --- |
| 学习项目 | 概览 -> 架构 -> 源码导读 | 建立产品边界与实现地图，再决定是否自建或二次开发。 |
| 首次自建 | 部署 -> 配置与安全 -> 首次运行与验收 | 在受控服务器上建立固定版本的最小可验收闭环。 |
| 长期维护与自动化 | 运维、故障排查 -> Agent 实施 Runbook | 将备份、升级、故障处理和 Agent 行为变成可审核的流程。 |

## 证据状态

- `源码确认`：固定 commit 中的源码、Compose、配置或脚本直接表明。
- `官方资料`：固定 commit 的 README、部署文档或 GitHub Release 表明。
- `推断`：依据源码组合得出的工程结论，会说明依据。
- `待实践验证`：必须在真实域名、服务器、账号和上游服务上验证。

## 分析边界

本文覆盖 `v0.1.176` / `e803e3851c0a7e222cfadeafad7b8636ab959d11` 中与网关、自建、配置、入口安全、备份和迁移直接相关的上游资料。支付渠道、每一种协议转换、OAuth 变体、后台页面逐组件实现、容量与性能、高可用及第三方账号兼容性不做穷尽分析。

`待实践验证`：目标 CPU/OS、真实上游账号与模型、管理端具体菜单、CDN/Caddy/Nginx 的流式行为、外置 PostgreSQL/Redis 故障切换，以及完整恢复后的 RPO/RTO，均需要在授权的目标环境补证。
