---
title: 站点运维：域名与图床
description: VuePress 自定义域名和七牛云 PicGo 图床配置。
---

# 站点运维：域名与图床

集中记录文档站发布后的域名与图片资源维护。

## GitHub Pages 自定义域名

### GitHub Pages + VuePress 配置域名

1. 在 `docs/.vuepress/public/` 下创建一个名为 `CNAME` 的文件（没有 `.md` 后缀），内容填写完整域名，例如 `www.example.com`。
2. 执行 `pnpm docs:build`，VuePress 会将 `CNAME` 一起复制到 `docs/.vuepress/dist/`。
3. 如果使用本项目自带的 GitHub Actions，推送到 `main` 后会自动构建并发布；首次使用需要在仓库的 Pages 设置中选择 **GitHub Actions**。

> 自定义域名应使用 HTTPS，并确认 DNS、GitHub Pages 设置和 `CNAME` 内容完全一致。不要把云厂商 AccessKey/SecretKey 写进仓库或截图。

## 七牛云与 PicGo 图床

### 七牛云 + PicGO 搭建自己的图床
#### 七牛云配置
1. 创建空间并绑定域名

![](https://github.com/ZeroClian/picture/blob/master/img/20220601113926.png?raw=true)

2. 创建要绑定的域名

![](https://github.com/ZeroClian/picture/blob/master/img/20220601114305.png?raw=true)

3. 复制 CNAME 值前往配置

![](https://github.com/ZeroClian/picture/blob/master/img/20220601114457.png?raw=true)

#### 域名解析

![](https://github.com/ZeroClian/picture/blob/master/img/20220601115051.png?raw=true)

主机记录参考：

![](https://github.com/ZeroClian/picture/blob/master/img/20220601114857.png?raw=true)

#### 配置PicGO

进入七牛云页面，右上角头像->密钥管理->复制 AccessKey和SecretKey到PicGo中，

- 存储空间名是你第二步建立的空间的名字
- 网址是刚刚绑定的那个二级域名
- 存储区域：七牛云的存储区域（华东 z0，华北 z1，华南 z2，北美 na0，东南亚 as0 ），根据你空间所在的区域，填对应的代码

![](https://github.com/ZeroClian/picture/blob/master/img/20220601115334.png?raw=true)
