---
title: Linux 基础、服务与故障处理
description: Linux 目录、命令、系统管理、软件、Service 和常见问题。
---

# Linux 基础、服务与故障处理

将日常运维所需的 Linux 基础知识、命令和问题排查集中整理。

## Linux 常识

### 目录结构

```
/
├── dev    抽象设备文件
├── boot   内核与启动文件
├── lib    系统库文件
├── bin    基本可执行命令
├── sbin   系统管理命令
├── usr    大多数用户态程序和数据
├── var    经常变化的数据（日志、缓存等）
├── mnt    临时挂载点
├── home   普通用户目录
├── root   root 用户目录
├── etc    配置文件
└── opt    可选的第三方软件
```

### 常用命令

- 创建文件：`touch hello.txt`
- 写入内容（会覆盖原文件）：`echo Thanks > hello.txt`；追加内容使用 `>>`
- 查看内容：`cat hello.txt`
- 复制文件：`cp hello.txt new.txt`；复制目录使用 `cp -r source-dir target-dir`
- 移动文件：`mv hello.txt /home/`；需要覆盖时使用 `mv -f`

#### 用户

- 创建用户：`adduser username`
- 设置密码：`passwd  username`

### 文件属性

`-/rw-/r--/r--`

文件类型/属主权限/属组权限/其他用户权限

各字母意义
  - d：目录
  - -：文件
  - l：链接
  - b：存储设备
  - c：串行设备
  - r：读
  - w：写
  - x：执行

#### 修改文件属性

优先按最小权限设置，例如文件 `chmod 640 文件名`、目录 `chmod 750 目录名`，确有必要时再授予其他用户权限。

r=4，w=2，x=1，777的每一个数字表示不同的权限相加后的数字，比如777表示所有人都有权限（主、组、其他用户）

## 系统与网络管理

### 端口

查看端口号：`sudo lsof -iTCP:PORT -sTCP:LISTEN`（也可使用 `ss -lntp`）

结束进程：先使用 `kill PID`，无响应时再使用 `kill -9 PID`。

开放端口：`sudo firewall-cmd --add-port=3306/tcp --permanent && sudo firewall-cmd --reload`

> --permanent 永久生效,没有此参数重启后失效


### 防火墙

启动： `systemctl start firewalld`

关闭： `systemctl stop firewalld`

查看状态： `systemctl status firewalld`

开机禁用 ： `systemctl disable firewalld`

开机启用 ： `systemctl enable firewalld`

### systemctl

启动一个服务：`systemctl start firewalld.service`

关闭一个服务：`systemctl stop firewalld.service`

重启一个服务：`systemctl restart firewalld.service`

显示一个服务的状态：`systemctl status firewalld.service`

在开机时启用一个服务：`systemctl enable firewalld.service`

在开机时禁用一个服务：`systemctl disable firewalld.service`

查看服务是否开机启动：`systemctl is-enabled firewalld.service`

查看已启用的服务列表：`systemctl list-unit-files | grep enabled`

查看启动失败的服务列表：`systemctl --failed`

### firewalld-cmd

查看版本： `firewall-cmd --version`

查看帮助： `firewall-cmd --help`

显示状态： `firewall-cmd --state`

查看所有打开的端口： `firewall-cmd --zone=public --list-ports`

更新防火墙规则： `firewall-cmd --reload`

查看区域信息： `firewall-cmd --get-active-zones`

查看指定接口所属区域： `firewall-cmd --get-zone-of-interface=eth0`

拒绝所有包：`firewall-cmd --panic-on`

取消拒绝状态： `firewall-cmd --panic-off`

查看是否拒绝： `firewall-cmd --query-panic`

### 查看系统信息

  `cat /etc/os-release`

### 查看系统字体

- `fc-list`：查看所有字体
- `fc-list :lang=zh`：查看中文字体

## 常用软件

### Linux 常用软件安装

#### 文件上传下载


```bash
yum install lrzsz -y
```


#### 文件压缩解压

```bash
yum install unzip zip -y
```

## 将 JAR 包注册为 Service

### 将Jar包以Service运行

- 切换到 service 目录：`cd /etc/systemd/system`
- 编辑服务文件：`sudo vi serviceName.service`
  - `serviceName` 是服务名称，根据实际填写

  ```
  [Unit]
  Description=serviceName.
  After=network-online.target
  Wants=network-online.target

  [Service]
  Type=simple

  Environment="JAVA_HOME=/usr/local/jdk/jdk-17.0.5"
  ExecStart=/usr/local/jdk/jdk-17.0.5/bin/java -Xmx700m -jar /root/app/xxx.jar

  Restart=on-failure
  RestartSec=5
  TimeoutStopSec=30
  PrivateTmp=true

  StandardOutput=append:/root/app/xxx.log
  StandardError=append:/root/app/xxx.log

  [Install]
  WantedBy=multi-user.target
  ```
> - 启动服务：`systemctl start serviceName`
> - 停止服务：`systemctl stop serviceName`
> - 服务状态：`systemctl status serviceName`
> - 项目日志：`journalctl -u serviceName`
> 
> - 开机启动：`systemctl enable serviceName`
> - 开机启动查看：`systemctl list-unit-files | grep serviceName`
>   或：`systemctl list-unit-files | grep enable`
> - 查看所有服务开机启动情况：`systemctl list-unit-files`



#### 可能出现问题
问题：`/usr/bin/java: No such file or directory`
原因：Java 未安装、`JAVA_HOME` 不正确，或 `/usr/bin/java` 软链接不存在。
解决方案：
```
[root@localhost ~]# echo "$JAVA_HOME"
/usr/local/jdk/jdk-17.0.5
[root@localhost ~]# sudo ln -sfn /usr/local/jdk/jdk-17.0.5/bin/java /usr/bin/java
[root@localhost ~]# sudo ln -sfn /usr/local/jdk/jdk-17.0.5/bin/javac /usr/bin/javac
```

> 建立软连接：`ln -s 原目录 映射目录`
> 
> 删除软连接：`sudo rm -f 映射目录`
> 
> 输出环境变量：`echo "$JAVA_HOME"`

## 常见问题

### -bash: ./update.sh: /bin/bash^M: bad interpreter: No such file or directory

出现原因：习惯先在本地把脚本编辑好再上传到服务器，但是发现执行报错，原来是因为文件的格式不对

解决步骤：
- 查看文件格式：`cat -A file`
  - 以`^M$`结尾的为dos格式的文件
  - 以`$`结尾的是unix格式的文件
- 编辑文件：`vim file`
- 更改格式，执行：`:set fileformat=unix`
- 保存退出，执行：`:wq`

### 定位文件报错信息

linux命令：`grep -C <num> "pattern" filename`
