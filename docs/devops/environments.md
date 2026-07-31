---
title: 开发与运行环境配置
description: JDK、Node.js、Nginx 和 Nacos 的环境安装与常用操作。
---

# 开发与运行环境配置

集中记录项目运行依赖的基础环境，减少安装步骤散落在多个目录。

## JDK

### JDK

1. 上传压缩包至服务器

2. 解压：`tar -zxvf jdk-17_linux-x64_bin.tar.gz -C /usr/local/jdk`

3. 修改环境变量：`vim /etc/profile`
```bash
export JAVA_HOME=/usr/local/jdk/jdk-17.0.5
export CLASSPATH=$JAVA_HOME/lib/
export PATH=$JAVA_HOME/bin:$PATH
```
4. 重新加载环境变量：`source /etc/profile`

![](https://github.com/ZeroClian/picture/blob/master/img/20230117221325.png?raw=true)

## Node.js 与本地文档站

### 本地启动 VuePress

```bash
pnpm install
pnpm docs:dev
```

默认访问地址为 `http://localhost:8080/`。

## Nginx

### 卸载
1. 检查是否运行

```bash
ps -ef | grep nginx
```
2. 停止运行

```bash
#查找文件
find / -name nginx
#停止
/usr/local/nginx/sbin/nginx -s stop
```
3. 卸载
```bash
rm -rf xxx(查找与出来的与nginx相关的文件)
```
- 如果设置了开机自启，需要执行以下命令
```bash
chkconfig nginx off
rm -rf /etc/init.d/nginx
```
- yum 指令清理

```bash
yum remove nginx
```

### 安装
1. 解压安装包

```bash
tar zxvf nginx-1.20.2.tar.gz
```
2. 安装相关依赖

```
yum install -y gcc
yum install -y pcre pcre-devel
yum install -y zlib zlib-devel
```
3. 编译安装
```
./configure --with-http_ssl_module 
make 
make install
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
case "$1" in
  "reload")
    # 刷新配置
    sudo docker exec -it <容器名称> bash -c "nginx -s reload"
    ;;
  "test")
    # 检查配置是否正确
    sudo docker exec -it <容器名称> bash -c "nginx -t"
    ;;
  *)
    echo "Usage: sh shell.sh [test|reload]"
exit 1
    ;;
esac
```

```bash
docker run  -p 80:80 --name nginx -v /opt/docker/nginx/nginx.conf:/etc/nginx/nginx.conf -v /opt/docker/nginx/conf.d:/etc/nginx/conf.d -v /opt/docker/nginx/html:/usr/share/nginx/html -v /opt/docker/nginx/logs:/var/log/nginx -d  nginx
```

## Nacos

### Nacos

> 官方文档地址：[Nacos](https://nacos.io/zh-cn/docs/what-is-nacos.html)
> 注：Nacos的运行需要以至少2C4g60g*3的机器配置下运行。

#### Linux安装
  - 需要有JDK环境：[安装JDK步骤](/devops/environments.html#jdk)
```bash
unzip nacos-server-$version.zip 或者 tar -xvf nacos-server-$version.tar.gz
cd nacos/bin
```
  - 启动：`sh startup.sh -m standalone`
  - 停止：`sh shutdown.sh`

![](https://github.com/ZeroClian/picture/blob/master/img/20230117221703.png?raw=true)

  - 访问：`http://ip:8848/nacos/`
