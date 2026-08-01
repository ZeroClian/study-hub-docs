---
title: 微信扫码登录
description: 企业微信 OAuth2 与公众号扫码登录流程。
---

# 微信扫码登录

将企业微信和公众号两类扫码登录方案放在一起，方便比较授权与回调流程。

## 企业微信扫码登录

> 参考文献
> 
> ❗️❗️❗️该接口文档曾经调整过，接入前请以企业微信开发者文档中的当前 OAuth 流程为准；不要把这篇旧示例直接当作生产配置。
> 
> - [扫码授权登录](https://developer.work.weixin.qq.com/document/path/91025)

### 配置企业微信应用设置

#### 1.设置可信域名

![](https://github.com/ZeroClian/picture/blob/master/img/设置可信域名1.png?raw=true)

![](https://github.com/ZeroClian/picture/blob/master/img/设置可信域名2.png?raw=true)

> ❗️可信域名必须与企业主体相同或相关联

#### 2.设置授权回调域

![](https://github.com/ZeroClian/picture/blob/master/img/企业微信授权登录.png?raw=true)

![](https://github.com/ZeroClian/picture/blob/master/img/20220917173222.png?raw=true)

> ❗️授权回调域必须与可信域名一致；如果设置了端口，端口也要保持一致，详情以开发文档为准。
>
> ❗️该回调域名需要提前解析到服务器 IP 地址，并使用 HTTPS 保护回调链路。

#### 3.将ip地址添加到白名单



### OAuth2

#### 1.构造授权链接

```java
String encodeUrl = URLEncoder.encode(props.getOauth2CallbackUrl(), StandardCharsets.UTF_8);
// state 应为服务端生成的一次性随机值，并与当前登录会话绑定，不能直接使用用户可预测的 ID
String state = stateStore.createAndSave(session.getId());
String url = "https://open.work.weixin.qq.com/wwopen/sso/qrConnect?" +
            "appid=" + props.getCorpid() +
            "&agentid=" + props.getAgentid() +
            "&redirect_uri=" + encodeUrl +
            "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
```

参数说明

| 参数    | 必须 | 说明                                                         |
| ------- | ---- | ------------------------------------------------------------ |
| appid   | 是   | 企业微信的CorpID，在企业微信管理端查看                       |
| agentid | 是   | 授权方的网页应用ID，在具体的网页应用中查看                   |
| redirect_uri | 是 | 重定向地址，需要进行 URL Encode |
| state   | 否   | 用于保持请求和回调的状态，授权请求后原样带回给企业。建议使用服务端保存的一次性随机值并在回调时校验，避免 CSRF |
| lang    | 否   | 自定义语言，支持zh、en；lang为空则从Headers读取[Accept-Language](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Accept-Language)，默认值为zh |

> 若用户不在agentid所指应用的可见范围，扫码时会提示无权限。
>
> 假定当前 
>
> 企业CorpID：wxCorpId 
>
> 开启授权登录的应用ID：1000000 
>
> 登录跳转链接：https://api.3dept.com
>
> state设置为：服务端生成的一次性随机值（示例中省略）
>
> 需要配置的授权回调域为：api.3dept.com 
>
> 根据URL规范，将上述参数分别进行UrlEncode，得到拼接的OAuth2链接为：
>
>  https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=wxCorpId&agentid=1000000&redirect_uri=https%3A%2F%2Fapi.3dept.com&state=STATE

#### 2.授权成功后回调

- 成功：重定向到 `redirect_uri` 会携带 `code` 和 `state` 参数。服务端应先校验 `state`，再用 `code` 换取身份信息；`code` 只能使用一次且不能记录到日志。

  ```
  redirect_uri?code=CODE&state=STATE
  ```

- 失败：重定向到`redirect_uri`，但不会携带code，仅有state参数

- 回调业务按需处理

## 公众号扫码登录

公众号扫码登录实现

步骤：

- 用户访问登录界面（发起请求，服务端生成 token 和 ticket 给前端）
- 前端携带token和ticket循环请求后端
- 用户扫码并同意授权，微信返回临时凭证
- 后端使用凭证换取 openid/用户信息，完成登录或注册；轮询凭证应设置短 TTL，避免无限等待
- 前端获取后端返回的登录结果，使用 HttpOnly、Secure、SameSite Cookie 保存会话，登录完成

> 不要把 `AppSecret`、长期 access token 或用户隐私信息放到前端；回调和轮询接口应校验状态、限制频率，并使用 HTTPS。
