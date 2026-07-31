---
title: 微信扫码登录
description: 企业微信 OAuth2 与公众号扫码登录流程。
---

# 微信扫码登录

将企业微信和公众号两类扫码登录方案放在一起，方便比较授权与回调流程。

## 企业微信扫码登录

> 参考文献
> 
> ❗️❗️❗️该方式已被更新，不在官方文档中，但可用，建议参考最新的文档，链接关联文档已被删除
> 
> - [扫码授权登陆](https://developer.work.weixin.qq.com/document/path/91025)

### 配置企业微信应用设置

#### 1.设置可信域名

![](https://github.com/ZeroClian/picture/blob/master/img/设置可信域名1.png?raw=true)

![](https://github.com/ZeroClian/picture/blob/master/img/设置可信域名2.png?raw=true)

> ❗️可信域名必须与企业主体相同或相关联

#### 2.设置授权回调域

![](https://github.com/ZeroClian/picture/blob/master/img/企业微信授权登录.png?raw=true)

![](https://github.com/ZeroClian/picture/blob/master/img/20220917173222.png?raw=true)

> ❗️授权回调域必须与可信域名一直，如果有设置端口，则端口也要配置一直，详情看开发文档。
>
> ❗️该回调域名提前解析到服务器ip地址

#### 3.将ip地址添加到白名单



### OAuth2

#### 1.构造授权链接

```java
String encodeUrl = URLEncoder.encode(props.getOauth2CallbackUrl(), StandardCharsets.UTF_8);
String url = "https://open.work.weixin.qq.com/wwopen/sso/qrConnect?" +
            "appid=" + props.getCorpid() +
            "&agentid=" + props.getAgentid() +
            "&redirect_uri=" + encodeUrl +
            "&state=" + subject.getUserId();
```

参数说明

| 参数    | 必须 | 说明                                                         |
| ------- | ---- | ------------------------------------------------------------ |
| appid   | 是   | 企业微信的CorpID，在企业微信管理端查看                       |
| agentid | 是   | 授权方的网页应用ID，在具体的网页应用中查看                   |
| c       | 是   | 重定向地址，需要进行UrlEncode                                |
| state   | 否   | 用于保持请求和回调的状态，授权请求后原样带回给企业。该参数可用于防止csrf攻击（跨站请求伪造攻击），建议企业带上该参数，可设置为简单的随机数加session进行校验 |
| lang    | 否   | 自定义语言，支持zh、en；lang为空则从Headers读取[Accept-Language](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Accept-Language)，默认值为zh |

> 若用户不在agentid所指应用的可见范围，扫码时会提示无权限。
>
> 假定当前 
>
> 企业CorpID：wxCorpId 
>
> 开启授权登录的应用ID：1000000 
>
> 登录跳转链接：http://api.3dept.com 
>
> state设置为：weblogin@gyoss9 
>
> 需要配置的授权回调域为：api.3dept.com 
>
> 根据URL规范，将上述参数分别进行UrlEncode，得到拼接的OAuth2链接为：
>
>  https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=wxCorpId&agentid=1000000&redirect_uri=http%3A%2F%2Fapi.3dept.com&state=web_login%40gyoss9

#### 2.授权成功后回调

- 成功：重定向到`redirect_uri`会携带code和state参数

  ```
  redirect_uri?code=CODE&state=STATE
  ```

- 失败：重定向到`redirect_uri`，但不会携带code，仅有state参数

- 回调业务按需处理

## 公众号扫码登录

公众号扫码登陆实现

步骤：

- 用户访问登陆界面（发起请求，服务端生产token和ticket给前端）
- 前端携带token和ticket循环请求后端
- 用户扫码，向公众号发送code验证信息
- 后端接收到微信服务端的回调，使用openid获取用户信息，进行登陆/注册，使用code作为key存入redis
- 前端获取到后端返回的验证成功及用户信息，存入session，登陆成功
