---
title: Postman 自动化测试与性能压测实战
description: 从 Postman 核心功能、脚本断言和数据驱动，到 Postman CLI、CI 与虚拟用户性能测试的完整实践教程。
---

# Postman 自动化测试与性能压测实战

本文面向已经会发送 HTTP 请求、希望把接口检查做成可重复自动化测试，并进一步开展小到中等规模性能验证的读者。教程分为两个独立案例：

- 自动化案例使用 Postman 官方 Echo API，可直接练习请求、变量、脚本、数据驱动、CLI 和 CI。
- 性能案例使用你自己拥有的本地或测试环境接口，避免对公共服务发起未经授权的负载。

> 本文依据 2026-08-12 可访问的 Postman 官方文档整理。Postman 的界面、套餐能力和 CLI 参数会演进，执行前应再次核对文末对应官方页面。文中的耗时阈值、VU 数和示例结果格式是教学配置，不代表任何接口已经实际达到这些指标。

## 一、Postman 能做什么

Postman 不只是一个“发送 HTTP 请求”的客户端，它把 API 请求及其上下文组织成可复用资产。Collection 可以保存请求、认证、参数、请求头、请求体、示例响应、测试和设置；Environment 用于在本地、测试、生产等目标之间切换变量；Mock Server 用保存的示例模拟接口；Monitor 则按计划运行 Collection 和测试。官方的 [Postman elements 说明](https://learning.postman.com/docs/getting-started/basics/postman-elements/) 对这些对象有完整定义。

| 功能 | 用途 | 本文中的位置 |
| --- | --- | --- |
| Request | 配置 HTTP 方法、URL、参数、Header、Body、认证 | 两个案例的基本执行单元 |
| Collection / Folder | 按业务场景组织请求、脚本和执行顺序 | 自动化套件、性能场景 |
| Variables / Environment | 分离主机、凭据、测试数据和临时值 | `baseUrl`、数据文件、动态 ID |
| Pre-request script | 请求发送前生成数据或调整请求 | 生成 `requestId` |
| Post-response script | 收到响应后解析数据、执行断言、传递值 | 状态码、JSON 结构和业务字段断言 |
| Collection Runner | 按顺序、迭代次数和数据文件批量执行 | 本地功能回归 |
| Postman CLI | 在终端和 CI/CD 中运行 Collection、生成报告和触发性能测试 | 命令行与 GitHub Actions |
| Newman | 开源的传统 Collection CLI | 兼容已有 v2.1 JSON 流程 |
| Performance testing | 以多个虚拟用户循环执行场景并观测延迟、吞吐和错误 | 性能案例 |
| Monitor / Mock Server | 定时健康检查；在真实后端未就绪时模拟响应 | 延伸实践 |

Collection 格式是可移植、机器和人都可读的开放格式，可用于组织请求和描述 API 工作流，详见官方 [Collection 概览](https://learning.postman.com/docs/collections/use-collections/use-collections-overview/)。

## 二、准备工作与基本概念

### 1. 安装工具

功能调试可以使用 Postman 桌面应用或 Web 应用，但性能测试必须使用桌面应用，不能在 Web 应用中配置和运行。Postman 官方提供 Windows、macOS 和 Linux 桌面版，安装方式见 [Install Postman](https://learning.postman.com/docs/getting-started/installation/install-app/)。

如果要在终端或 CI 中运行测试，可安装 Postman CLI：

```bash
npm install -g postman-cli
postman --version
```

这是官方支持的 npm 安装方式；也可以使用 Postman 提供的系统安装脚本，见 [Install the Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-installation/)。

### 2. 理解脚本执行点

Postman 在请求前执行 Pre-request script，在响应返回后执行 Post-response script。脚本运行在 Postman Sandbox 中，可以生成动态数据、设置变量、传递响应字段并编写测试。脚本也可以放在 Collection 或 Folder 层级复用，详见 [Scripts 概览](https://learning.postman.com/docs/tests-and-scripts/write-scripts/intro-to-scripts/)。

核心测试 API 是：

```javascript
pm.test("可读的测试名称", function () {
  pm.expect(actual).to.eql(expected);
});
```

`pm.test()` 定义测试，`pm.expect()` 使用 Chai 的 BDD 断言风格；也可用 `pm.response.to.have.*` 等响应快捷断言。官方语法见 [Writing tests and assertions](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-test-expect)。

### 3. 理解变量作用域

常见作用域由宽到窄为 Global、Collection、Environment、Data、Local，较窄作用域的同名变量优先。脚本中使用 `pm.variables.get("name")` 可取得当前解析结果，数据文件值则可通过 `pm.iterationData.get("name")` 明确访问。完整优先级和 API 见 [Variables reference](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables/)。

实践建议：

- `baseUrl`、非敏感默认值放 Collection 或 Environment。
- 账号、Token 等秘密不要提交到 Collection、Environment 导出文件或仓库；本地交互可使用 Postman Vault，CI 使用 CI 平台的 Secret。
- 每轮测试变化的数据放 Data file，单次请求的临时值放 Local variable。
- 不要依赖 Global variable 隐式传值，否则不同 Collection 更容易互相污染。

## 三、案例一：Postman Echo 数据驱动自动化测试

Postman Echo 是官方提供的请求回显服务，响应会包含收到的请求详情，适合在不依赖真实业务后端的情况下练习 Postman。官方入口和示例见 [Test requests using the Echo API](https://learning.postman.com/docs/developer/echo-api)。本案例只发送少量功能测试请求，不把公共 Echo 服务当作压测目标。

### 目标

创建 `Postman Echo 自动化示例` Collection，对 `POST https://postman-echo.com/post` 完成以下验证：

1. 请求前生成唯一 `requestId`。
2. 使用两组姓名和角色数据分别执行一次。
3. 断言状态码、响应类型、回显字段和动态 ID。
4. 在 Collection Runner、Postman CLI 和 CI 中得到一致的通过/失败判定。

### 步骤 1：创建 Collection 和变量

1. 在侧栏选择 **Collections > New collection**。
2. 名称填写 `Postman Echo 自动化示例`。
3. 打开 Collection 的 **Variables**，添加：

| Variable | Initial value / Current value | 说明 |
| --- | --- | --- |
| `baseUrl` | `https://postman-echo.com` | 官方 Echo 主机 |
| `requestId` | 留空 | Pre-request script 每次覆盖 |

4. 保存 Collection。

切换环境时，推荐把 `baseUrl` 改为 Environment 变量，而请求始终写成 `{{baseUrl}}/...`。Environment 的作用就是让同一组请求指向不同主机并使用相应变量，参见 [Postman elements](https://learning.postman.com/docs/getting-started/basics/postman-elements/)。

### 步骤 2：创建 POST 请求

在 Collection 中新增请求 `01 - Echo user`：

- Method：`POST`
- URL：`{{baseUrl}}/post`
- Header：`Content-Type: application/json`
- Body：选择 **raw > JSON**，填写：

```json
{
  "name": "{{name}}",
  "role": "{{role}}",
  "traceId": "{{requestId}}"
}
```

### 步骤 3：添加 Pre-request script

打开请求的 **Scripts > Pre-request**，输入：

```javascript
const requestId = pm.variables.replaceIn("{{$guid}}");
pm.collectionVariables.set("requestId", requestId);
```

`$guid` 是 Postman 动态变量，脚本中应使用 `pm.variables.replaceIn()` 解析动态变量。每次请求都会生成新值，官方说明见 [Dynamic variables](https://learning.postman.com/docs/tests-and-scripts/write-scripts/variables-list)。

### 步骤 4：添加 Post-response 断言

打开 **Scripts > Post-response**，输入：

```javascript
const responseJson = pm.response.json();
const expectedName = pm.iterationData.get("name") ?? pm.variables.get("name");
const expectedRole = pm.iterationData.get("role") ?? pm.variables.get("role");
const expectedTraceId = pm.collectionVariables.get("requestId");

pm.test("状态码为 200", function () {
  pm.response.to.have.status(200);
});

pm.test("响应 Content-Type 是 JSON", function () {
  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

pm.test("Echo 正确回显 name 和 role", function () {
  pm.expect(responseJson.json).to.be.an("object");
  pm.expect(responseJson.json.name).to.eql(expectedName);
  pm.expect(responseJson.json.role).to.eql(expectedRole);
});

pm.test("Echo 正确回显本次动态 traceId", function () {
  pm.expect(responseJson.json.traceId).to.eql(expectedTraceId);
  pm.expect(responseJson.json.traceId).to.be.a("string").and.not.empty;
});

pm.test("单次响应时间低于教学阈值 2000 ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

这里同时演示了状态码、Header、JSON 结构、业务字段和响应耗时断言。Postman 官方提供了状态码、响应时间、字段类型、深层对象等更多写法，见 [Test script examples](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-examples/)。

> `2000 ms` 只是让练习容易观察失败的教学阈值。真实项目应依据 SLO、网络位置和历史基线设定，不应把一次客户端耗时直接当作容量结论。

### 步骤 5：先手工验证一次

数据驱动运行前，可暂时在 Collection Variables 添加 `name=alice`、`role=admin`，点击 **Send**：

1. 在响应区查看 **Test Results** 是否全部通过。
2. 打开 Postman Console，确认变量已解析且响应 JSON 符合预期。
3. 故意把断言状态码改成 `201` 再发一次，确认测试确实会失败，然后恢复为 `200`。

这一步是在验证“测试能抓住错误”，不能只验证绿色路径。调试时可以使用 `console.log()` 等输出查看请求、响应和变量，见 [Troubleshoot test errors](https://learning.postman.com/docs/tests-and-scripts/write-scripts/troubleshoot-tests/)。

### 步骤 6：准备数据文件

保存为 `echo-data.json`：

```json
[
  {
    "name": "alice",
    "role": "admin"
  },
  {
    "name": "bob",
    "role": "viewer"
  }
]
```

JSON 必须是对象数组，键名与请求中的变量名大小写一致。Collection Runner 会把每一行数据解析为 Data variable；格式要求见 [Run collections using imported data](https://learning.postman.com/docs/tests-and-scripts/running-collections/working-with-data-files/)。

### 步骤 7：在 Collection Runner 执行

1. 选择 Collection，点击 **Run**。
2. Run type 选择 **Functional**，运行位置选择 **Local**。
3. 只勾选 `01 - Echo user`。
4. 在 **Test data** 选择本地 `echo-data.json`。
5. 确认迭代覆盖两行数据后开始运行。
6. 检查每次迭代的请求、测试数量、失败断言和平均响应时间。

Collection Runner 会按选定顺序执行请求，可配置迭代、请求间延迟、测试数据和错误处理等选项，详见 [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/)。自定义数据文件的 GUI 可用性可能受当前套餐限制，应以官方页面和账户界面为准。

### 步骤 8：导出并用 Postman CLI 执行

将 Collection 导出到仓库，例如：

```text
postman/
├── postman-echo.postman_collection.json
└── echo-data.json
```

运行：

```bash
mkdir -p reports
postman collection run ./postman/postman-echo.postman_collection.json \
  --iteration-data ./postman/echo-data.json \
  --reporters cli,junit \
  --reporter-junit-export ./reports/postman-junit.xml \
  --bail failure
```

本地文件路径运行时，Collection 和测试在本地执行；如需把结果发送到 Postman Cloud，则需要登录并使用 Collection ID。Postman CLI 支持 `--iteration-data`、`--bail` 以及 CLI、JSON、JUnit、HTML 报告，详见 [Collection commands](https://learning.postman.com/docs/postman-cli/postman-cli-collections) 和 [CLI reporters](https://learning.postman.com/docs/postman-cli/postman-cli-reporters)。

上面的 JUnit 示例以导出的 JSON Collection 为前提。对于 Postman v12 Native Git 使用的 v3 YAML Collection，官方当前只支持 CLI reporter；流水线迁移到 v3 前要同步调整报告方案。

建议在仓库中提交 Collection 和脱敏测试数据，不提交：

- Postman API Key、业务 Token、Cookie 和真实账号密码。
- 含真实个人信息的 Data file。
- 包含凭据 Current value 的 Environment 导出文件。
- 带完整敏感请求/响应体的测试报告。

### 步骤 9：加入 GitHub Actions

下面的最小工作流从仓库文件运行，不需要把 Postman API Key 写进命令。保存为 `.github/workflows/postman-api-test.yml`：

```yaml
name: Postman API Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  api-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Postman CLI
        run: npm install -g postman-cli

      - name: Run collection
        run: |
          mkdir -p reports
          postman collection run ./postman/postman-echo.postman_collection.json \
            --iteration-data ./postman/echo-data.json \
            --reporters cli,junit \
            --reporter-junit-export ./reports/postman-junit.xml \
            --bail failure
```

测试断言失败时应让命令返回非零退出状态，从而阻止错误变更继续发布；不要使用抑制退出码的选项掩盖失败。Postman 官方也支持在 GitHub Actions 中运行 CLI，见 [Postman CLI with GitHub Actions](https://learning.postman.com/docs/postman-cli/postman-cli-github-actions/)。

如果 CI 需要用 Collection ID、上传云端结果或触发云端能力，把 API Key 放入 GitHub Secret，再通过环境变量登录，不能写进 YAML 或日志：

```yaml
- name: Login to Postman
  env:
    POSTMAN_API_KEY: ${{ secrets.POSTMAN_API_KEY }}
  run: postman login --with-api-key "$POSTMAN_API_KEY"
```

### Newman 是否还要用

已有 v2.1 JSON 流程仍可用 Newman：

```bash
npm install -g newman
mkdir -p reports
newman run ./postman/postman-echo.postman_collection.json \
  --iteration-data ./postman/echo-data.json \
  --reporters cli,junit \
  --reporter-junit-export ./reports/newman-junit.xml \
  --bail
```

但新项目优先使用 Postman CLI。Postman 已明确说明：Newman 不兼容 Postman v12 Native Git 使用的 Collection v3 格式，Newman 只支持 v2.1 JSON；Postman CLI 是官方推荐的迁移方向，见 [Migrate from Newman to Postman CLI](https://learning.postman.com/docs/reference/newman-cli/migrate-to-postman-cli)。如果需要将 Newman 当作 Node.js 库嵌入程序，或维护现有 v2.1 流程，再继续使用它，安装与退出码行为见 [Install and run Newman](https://learning.postman.com/docs/reference/newman-cli/installing-running-newman/)。

## 四、案例二：自有商品查询 API 性能压测

### 先定义边界

性能测试会真实地产生并发流量，只能对你拥有或已获得明确授权的环境执行。不要对 Postman Echo、第三方 API 或生产系统直接照抄下面的 VU 配置。先与服务负责人确认测试窗口、流量上限、停止条件、监控和数据清理方案。

本案例假设你有一个本地或隔离测试接口：

```http
GET {{baseUrl}}/api/products?keyword={{keyword}}&page=1
```

期望返回：

```json
{
  "items": [
    {
      "id": 1001,
      "name": "Example book"
    }
  ],
  "page": 1
}
```

如果你的字段不同，替换请求和断言即可。示例验收目标也只是占位模板：

- 状态和 JSON 结构在负载下仍正确。
- p95 小于 `500 ms`。
- 运行时错误率不高于 `1%`。
- 吞吐随 VU 增长，在服务或施压机饱和前应有合理提升。

### 步骤 1：创建独立性能场景

1. 新建 Collection `商品查询性能测试`，或在业务 Collection 中新建同名 Folder。
2. 新建 Environment `perf-local`，设置 `baseUrl=http://localhost:3000`，按实际服务替换。
3. 新建请求 `Search products`，URL 使用上面的模板。
4. 不要把创建订单、扣库存、发通知等破坏性请求放入循环，除非已设计唯一测试数据和清理流程。
5. 若流程包含登录、查询、详情等多个请求，按真实用户顺序排列；若只评估单接口，Runner 中只选择目标请求。

性能测试中，每个 VU 会按所选顺序循环执行 Collection，请求之间不是随机选择；所有 VU 并行运行。官方执行模型见 [Configure and run performance tests](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/)。

### 步骤 2：加入正确性断言

在 `Search products` 的 Post-response script 中添加：

```javascript
pm.test("状态码为 200", function () {
  pm.response.to.have.status(200);
});

pm.test("返回商品列表和页码", function () {
  const body = pm.response.json();
  pm.expect(body.items).to.be.an("array");
  pm.expect(body.page).to.eql(1);
});
```

压测不能只看“请求发出去了多少”。负载升高时 5xx 或错误业务响应仍可能很快返回，所以必须保留正确性断言，并同时观察 Failure %。

### 步骤 3：准备 VU 数据

保存 `perf-users.csv`：

```csv
keyword
book
phone
laptop
camera
headphone
```

在性能配置中可选择：

- **Ordered**：第一个 VU 用第一行，第二个 VU 用第二行；数据行少于 VU 时，部分 VU 可能拿不到数据。
- **Randomized**：每个 VU 每次运行 Collection 时随机选一行。

性能测试默认让所有 VU 使用相同值，导入 CSV/JSON 才能按 VU 改变数据；具体映射和格式规则见 [Use a data file to simulate virtual users](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-data-files/)。手机号、前导零编号或超长数字应明确按 String 导入，避免被截断。

### 步骤 4：先做冒烟与基线

正式加压前依次执行：

1. **单请求功能检查**：Send 一次，确认请求、认证和断言正确。
2. **单 VU 冒烟**：1 VU、1 分钟，确认没有数据污染和脚本异常。
3. **小流量基线**：10 VU、3 分钟，记录平均响应时间、p95、p99、RPS、Error %、Failure % 和施压机资源。
4. **逐级提升**：例如 10、20、40 VU，每级保持足够时间，只在前一级稳定且资源允许时继续。

Postman 官方建议本地先用 10 到 20 VU 观察系统资源。过多 VU、复杂脚本或施压机 CPU/内存不足会导致吞吐下降和指标失真，甚至终止测试，详见 [Virtual users and system resources](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/#virtual-users-and-system-resources)。

### 步骤 5：选择负载模型

打开 Collection，点击 **Run > Performance**，选择运行位置和场景，然后选择 Load profile：

| 模型 | VU 变化 | 适用问题 |
| --- | --- | --- |
| Fixed | 全程保持最大 VU | 固定并发下能否稳定运行 |
| Ramp up | 从较低 VU 逐步升到最大值 | 性能从何处开始退化 |
| Spike | 从基础负载突然升到最大值，再快速回落 | 突发流量能否扛住并恢复 |
| Peak | 逐步升高、在峰值保持、再逐步回落 | 峰值持续期间及恢复阶段表现 |

这四种模型和 VU 行为由 Postman 官方 [性能配置文档](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/) 定义。

首次建议：

| 配置项 | 教学起点 | 原因 |
| --- | --- | --- |
| Load profile | Ramp up | 容易观察退化拐点 |
| Initial / Max VU | 5 / 20 | 控制起始风险 |
| Duration | 5 分钟 | 覆盖升压与短暂稳定阶段 |
| Data | `perf-users.csv`，Randomized | 避免所有请求命中完全相同关键词 |
| Pass condition | p95 `< 500 ms` | 示例延迟门槛，必须按真实 SLO 调整 |

### 步骤 6：理解指标，而不是只看平均值

Postman 性能报告提供总请求数、RPS、平均响应时间、p90、p95、p99、Error % 和 Failure % 等指标，官方定义见 [Performance metrics](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-metrics/)。

| 指标 | 应该怎样读 |
| --- | --- |
| Requests/second | 实际每秒完成的请求量。增加 VU 后 RPS 不再增长，常提示服务或施压端接近瓶颈 |
| Avg response time | 整体平均耗时，容易掩盖少量极慢请求，不能单独作为结论 |
| p90 / p95 / p99 | 例如 p95 表示 95% 的观测响应时间不高于该值，更适合观察尾延迟 |
| Error % | DNS、TLS、超时、连接失败、未捕获脚本异常等运行时错误占比 |
| Failure % | 至少有一个测试断言失败的请求占比，例如返回 500 被状态码断言捕获 |
| VU | 当前并行执行场景的虚拟用户数，不等同于固定 RPS |
| CPU / Memory | 判断施压机是否先成为瓶颈；资源饱和时的 API 延迟结论不可靠 |

特别注意：`Error %` 和 `Failure %` 不是一回事。官方把 Error 定义为运行时错误，例如 DNS/TLS 失败、超时或未捕获脚本异常；HTTP 500 如果成功收到响应，不应只依赖 Error %，应通过状态码断言反映到 Failure %。错误分类见 [Performance test errors](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-errors)。

分析顺序建议：

1. 先确认施压机 CPU、内存没有饱和。
2. 对齐 VU 时间线，观察 RPS 是否随 VU 上升。
3. 同时比较 p95/p99、Error % 和 Failure %。
4. 下钻到具体请求，找出最慢接口、最高错误请求和首先失败的断言。
5. 对照服务端 CPU、内存、GC、线程池、连接池、数据库慢查询和下游依赖监控。
6. 修复后用相同环境、数据、负载模型和持续时间复测，才有可比性。

### 步骤 7：用 Postman CLI 触发性能测试

性能测试也可通过 CLI 加入流水线。`postman performance run` 使用 Collection ID、需要登录，并由 Postman Cloud 运行指定 Collection 的性能测试；因此本案例的 `localhost` 只适用于同机桌面应用本地运行，使用 CLI 命令时必须改为 Postman Cloud 能访问且已经授权的测试地址。`--duration` 的单位是分钟，负载模型可选 `fixed`、`ramp-up`、`spike`、`peak`，并可用 `avg`、`p90`、`p95`、`p99`、`error_rate` 或 `rps` 设置通过条件。完整参数见 [Monitoring and performance commands](https://learning.postman.com/docs/postman-cli/postman-cli-monitoring)。

```bash
postman login --with-api-key "$POSTMAN_API_KEY"

postman performance run "$POSTMAN_COLLECTION_ID" \
  --environment "$POSTMAN_ENVIRONMENT_ID" \
  --vu-count 20 \
  --duration 5 \
  --load-profile ramp-up \
  --pass-if "less_than(p95, 500)"
```

这些变量应来自 CI Secret 或非敏感 CI Variable，不能在命令、Collection 或日志中写入真实值。先在获授权的测试环境小流量验证，再接入 PR 或部署门禁。Postman 官方的 CLI 性能测试流程和 CI 示例见 [Configure and validate performance tests using the Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-run-performance-test/)。

如果希望同时约束错误率，当前命令的 `--pass-if` 语法应以 `postman performance run --help` 和官方文档为准；不要假设一次命令可组合任意多个条件。业务正确性仍需依靠 Collection 中的 `pm.test()` 断言和 Failure % 检查。

## 五、常见问题与限制

### 1. 本地结果不等于服务端真实性能

本地性能测试同时受施压机 CPU、内存、网络、代理和脚本开销影响。Postman 明确指出 Pre-request / Post-response 脚本会降低单机可模拟的 VU 数；资源不足会造成吞吐降低和指标不准确。容量规划前必须结合系统资源和服务端监控复核。[官方说明](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/#virtual-users-and-system-resources)

### 2. VU 不是 RPS

每个 VU 按顺序循环执行场景，实际 RPS 受接口耗时、请求数量、脚本和网络影响。Postman 的内置模型主要控制 VU 随时间的变化，不保证精确的开放式到达率。若验收合同要求严格固定 RPS、复杂到达模型或分布式容量极限，应评估专用压测工具，并用 Postman 保留功能与轻量性能回归。

### 3. 变量在性能测试中的作用域不同

性能测试期间，Environment、Collection 和 Global 变量的修改会保留在本次运行内，但按 VU 隔离，一个 VU 的修改不会影响另一个 VU；`pm.variables` 创建的 Local variable 只在原请求持续期间有效，不能供后续请求使用。详见 [Variables reference 的性能测试说明](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables/)。因此，多请求流程传值应使用合适的 Collection 或 Environment 作用域，并验证每个 VU 的数据隔离。

### 4. Web、Local、Cloud 和套餐能力不同

- 性能测试不能在 Postman Web 应用中运行，需要桌面应用。
- 本地运行可用于所有套餐，但可承载 VU 受本机资源限制。
- Cloud performance tests 可超越单机限制并持久化详细结果，但属于付费套餐，且官方当前标注为桌面应用中的 Beta。
- 数据文件、报告导出和部分 CLI/协议能力也可能受套餐影响。

这些边界会变化，执行前查看 [性能测试配置](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/) 和当前 [Postman Pricing](https://www.postman.com/pricing/)。

### 5. CLI 和 Newman 的能力不完全相同

Postman CLI 支持较新的 Postman 工作流和 Collection v3；Newman 主要用于 v2.1 JSON Collection，且不支持 v12 Native Git 的 v3 格式。迁移或新建流水线时先确认 Collection 格式，避免本地 GUI 可运行、CI 却无法解析。[官方迁移说明](https://learning.postman.com/docs/reference/newman-cli/migrate-to-postman-cli)

### 6. 不要把客户端响应时间断言当成完整压测

`pm.response.responseTime < 500` 这类断言适合功能回归中的粗粒度门槛；性能结论应基于有持续时间、有并发曲线的运行，并综合 p95/p99、吞吐、错误、断言失败、施压机和服务端监控。单次请求的绿色断言不能证明系统具备目标容量。

## 六、落地检查清单

### 自动化测试

- [ ] Collection 按业务场景组织，请求顺序明确。
- [ ] `baseUrl`、认证和数据已参数化。
- [ ] 断言覆盖状态码、响应类型、关键业务字段和异常路径。
- [ ] 已故意制造失败，验证断言确实能拦截问题。
- [ ] 数据文件已脱敏，变量名大小写一致。
- [ ] 本地 Runner 和 CLI 均可重复执行。
- [ ] CI 失败会返回非零状态，不抑制退出码。
- [ ] JUnit/JSON 报告不泄露 Token、Cookie 或个人信息。

### 性能测试

- [ ] 已获得目标环境和流量规模授权。
- [ ] 场景不包含未清理的破坏性写操作。
- [ ] 先完成 1 VU 冒烟，再从 10 到 20 VU 小步增加。
- [ ] 负载模型、持续时间、测试数据和停止条件已记录。
- [ ] 同时观察 p95/p99、RPS、Error % 与 Failure %。
- [ ] 已确认施压机 CPU、内存和网络没有先饱和。
- [ ] 已关联服务端与依赖监控，不只看 Postman 客户端。
- [ ] 复测保持环境和配置一致，结论不使用虚构或跨环境数据。

## 官方资料索引

- [Postman 基础元素](https://learning.postman.com/docs/getting-started/basics/postman-elements/)
- [Postman Echo API](https://learning.postman.com/docs/developer/echo-api)
- [脚本与 Sandbox](https://learning.postman.com/docs/tests-and-scripts/write-scripts/intro-to-scripts/)
- [`pm.test` 与 `pm.expect`](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-test-expect)
- [变量 API 与作用域](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables/)
- [数据驱动 Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/working-with-data-files/)
- [Postman CLI Collection 命令](https://learning.postman.com/docs/postman-cli/postman-cli-collections)
- [Postman CLI 报告](https://learning.postman.com/docs/postman-cli/postman-cli-reporters)
- [Newman 到 Postman CLI 的迁移](https://learning.postman.com/docs/reference/newman-cli/migrate-to-postman-cli)
- [性能测试配置与 VU 模型](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/)
- [性能指标](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-metrics/)
- [性能测试错误](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-errors)
- [Postman CLI 性能测试](https://learning.postman.com/docs/postman-cli/postman-cli-run-performance-test/)
