---
title: 开发与运行环境配置
description: JDK、Node.js、Nginx 和 Nacos 的环境安装与常用操作。
---

# 开发与运行环境配置

集中记录项目运行依赖的基础环境，减少安装步骤散落在多个目录。

## JDK

### JDK

1. 上传压缩包至服务器，并创建安装目录：`sudo mkdir -p /usr/local/jdk`

2. 解压：`sudo tar -zxf jdk-17_linux-x64_bin.tar.gz -C /usr/local/jdk`

3. 推荐单独创建 `/etc/profile.d/java.sh`：
```bash
export JAVA_HOME=/usr/local/jdk/jdk-17.0.5
export PATH="$JAVA_HOME/bin:$PATH"
```
4. 重新加载并确认版本：`source /etc/profile.d/java.sh && java -version`

![](https://github.com/ZeroClian/picture/blob/master/img/20230117221325.png?raw=true)

## Node.js 与本地文档站

### 本地启动 VuePress

```bash
pnpm install
pnpm docs:dev
```

默认访问地址为 `http://localhost:8080/`。

Node.js 项目建议使用 LTS 版本，并使用 Corepack 固定 pnpm：

```bash
corepack enable
corepack install --global pnpm@11.0.9
node --version
pnpm --version
```

## Nginx

### 卸载
1. 检查是否运行

```bash
ps -ef | grep nginx
```
2. 停止运行

```bash
# 停止并禁止开机启动
sudo systemctl disable --now nginx
```
3. 使用包管理器卸载（源码安装的 Nginx 请按实际 `--prefix` 清理，不要执行不明确的 `rm -rf`）

```bash
sudo yum remove nginx
```

### 安装
1. 解压安装包

```bash
tar zxvf nginx-1.20.2.tar.gz
```
2. 安装相关依赖

```
sudo yum install -y gcc pcre2 pcre2-devel zlib zlib-devel openssl openssl-devel
```
3. 编译安装
```
./configure --with-http_ssl_module --prefix=/usr/local/nginx
make -j"$(nproc)"
sudo make install
```
4. 启动

```
cd /usr/local/nginx/sbin
./nginx
```
5. 访问服务器ip地址出现


### 常用命令
```bash
1、启动nginx
  ./nginx
2、关闭nginx
  ./nginx -s stop
3、重新加载nginx (nginx.conf)
  ./nginx -s reload
4、查看版本号
  ./nginx -v
```




### shell脚本

```shell
#!/bin/bash
CONTAINER_NAME="nginx"
case "$1" in
  "reload")
    # 刷新配置
    sudo docker exec "$CONTAINER_NAME" nginx -s reload
    ;;
  "test")
    # 检查配置是否正确
    sudo docker exec "$CONTAINER_NAME" nginx -t
    ;;
  *)
    echo "Usage: sh shell.sh [test|reload]"
    exit 1
    ;;
esac
```

```bash
mkdir -p /opt/docker/nginx/{conf.d,html,logs}
# 先将有效的 nginx.conf 放入该路径，再创建容器
docker run -d --restart unless-stopped -p 80:80 --name nginx \
  -v /opt/docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/docker/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v /opt/docker/nginx/html:/usr/share/nginx/html:ro \
  -v /opt/docker/nginx/logs:/var/log/nginx \
  nginx:stable
```

## Nacos

### Nacos

> 官方文档地址：[Nacos](https://nacos.io/zh-cn/docs/what-is-nacos.html)
> 机器规格取决于实例数、配置量和流量；“2C4G60G × 3”不是 Nacos 的通用硬性要求。集群通常至少 3 个节点，生产部署请按官方容量规划压测。

#### Linux安装
  - 需要有 JDK 环境：[安装 JDK 步骤](./environments.md#jdk)
```bash
unzip nacos-server-$version.zip
# 或：tar -xzf nacos-server-$version.tar.gz
cd nacos/bin
```
  - 启动：`sh startup.sh -m standalone`
  - 停止：`sh shutdown.sh`

![](https://github.com/ZeroClian/picture/blob/master/img/20230117221703.png?raw=true)

  - 访问：`http://ip:8848/nacos/`

Nacos 2.x 还会使用 9848/9849 等 gRPC 端口；如果通过安全组或防火墙访问集群，请按版本文档一并放行对应端口。
