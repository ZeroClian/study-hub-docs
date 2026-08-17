---
title: 项目概览
description: Sub2API 的定位、能力、技术栈、适用边界与版本风险。
---

# 项目概览

## 它解决什么问题

`官方资料`：Sub2API 是 AI API 网关平台。用户使用平台签发的 API Key 调用第三方 AI 服务，平台承担鉴权、计费、账号调度、并发和速率控制、请求转发及后台管理，并内置充值支付能力。证据：[`README_CN.md`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L182-L196)。

它的适用场景是把多个上游账号或订阅统一为一个受控的 API 服务：调用方通过一个平台入口和自己的 Key 发起请求，运营方再按账号、分组、并发和计费规则调度上游。实际可用的协议、模型和能力仍取决于部署中的账号平台与分组配置。

## 核心能力

`源码确认`：固定版本暴露 Anthropic Messages、OpenAI Responses/Chat Completions、部分 OpenAI 兼容端点、Gemini `v1beta` 和 Antigravity 等网关入口。证据：[`gateway.go`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/backend/internal/server/routes/gateway.go#L175-L494)。

- 以 API Key、用户、订阅和分组为基础执行访问控制。
- 按平台、账号可用状态、负载和粘性会话调度上游账号。
- 对并发、速率、用量与费用实施平台侧控制和记录。
- 提供内嵌管理界面，用于管理账号、分组、Key、订阅及相关运营对象。
- 支持流式转发；入口代理需要按流式连接的要求配置 SSE/WebSocket 与超时。

## 它不是什么

- **不是大模型推理引擎。** 请求最终仍转发给第三方上游服务。
- **不是通用透明反向代理。** 它理解协议、模型、账号、会话、用量和价格，并据此执行网关逻辑。
- **不是零运维 SaaS。** 自建者仍负责 PostgreSQL、Redis、TLS、秘密、备份、监控与恢复演练。
- **不是上游条款规避工具。** 技术可用不代表账号共享、转售、支付或其他业务模式被服务条款和适用法律允许。

## 技术栈与运行依赖

`官方资料`：README 声明后端采用 Go、Gin、Ent，前端采用 Vue、Vite、TailwindCSS；最低支持口径是 PostgreSQL 15+ 和 Redis 7+。固定版本的官方目录版 Compose 实际使用 PostgreSQL 18 和 Redis 8，因此最低版本说明不能直接等同于该 Compose 部署组合。证据：[`README_CN.md`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L207-L214)、[`docker-compose.local.yml`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L195-L230)。

`推断`：新建环境应先按固定版本 Compose 所选的 PostgreSQL 18 与 Redis 8 镜像组合验收；若改用其他受支持版本或托管服务，则属于新的部署组合，必须重新验证迁移、连接与网关请求。

## 合规与使用边界

`官方资料`：上游声明项目仅供学习研究，要求合法使用，并提示商业使用风险由使用者自行承担。证据：[`README_CN.md`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/README_CN.md#L22-L29)、[`LICENSE`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/LICENSE)。

部署前应独立确认软件许可证、第三方 AI 服务条款、OAuth 凭据处理、API Key 分发、计费支付、日志留存、个人信息与当地法律要求。本文只解释固定版本资料表明的技术边界，不构成法律、商业或上游授权意见。

## 维护与版本特征

`官方资料`：官方快捷脚本从 `main` 获取部署文件，目录版 Compose 的默认应用镜像为 `latest`。证据：[`docker-deploy.sh`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-deploy.sh#L23-L24)、[`docker-compose.local.yml`](https://github.com/Wei-Shaw/sub2api/blob/e803e3851c0a7e222cfadeafad7b8636ab959d11/deploy/docker-compose.local.yml#L22-L43)。

因此本专题固定于 [`v0.1.176`](https://github.com/Wei-Shaw/sub2api/releases/tag/v0.1.176) 和 [`e803e3851c0a7e222cfadeafad7b8636ab959d11`](https://github.com/Wei-Shaw/sub2api/tree/e803e3851c0a7e222cfadeafad7b8636ab959d11)。`推断`：后续 Release 可能改变模型、计费、路由、Compose 和迁移；升级时应重新固定制品并复核对应版本资料，不能把本页结论视为跨版本保证。
