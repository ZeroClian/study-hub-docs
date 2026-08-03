---
title: MySQL 安装、容器化与权限管理
description: MySQL 在服务器和 Docker 中的部署，以及用户授权管理。
---

# MySQL 安装、容器化与权限管理

将 MySQL 的两种部署方式和后续权限配置串成一条完整路径。

> MySQL 5.7 已结束生命周期。下面保留 `5.7` 镜像是为了兼容旧项目；新项目建议使用仍受支持的 MySQL 8.x，并先在测试环境验证字符集、认证插件和 SQL 兼容性。示例密码均为占位值，不能直接用于生产环境。

## Docker 部署

### 部署

1. 下载镜像（旧项目可将 `8.4` 替换为 `5.7`）

```bash
docker pull mysql:8.4
```

2. 创建挂载目录

```
mkdir -p /root/mysql/{data,conf,log}
```

3. 添加配置文件。编辑 `/root/mysql/conf/my.cnf`：

```bash
[mysql]
# 设置 mysql 客户端默认字符集
default-character-set=utf8mb4
socket=/var/lib/mysql/mysql.sock

[mysqld]
# 基础字符集和连接数
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
sql_mode=NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
symbolic-links=0
# 允许最大连接数
max_connections=200
default-storage-engine=INNODB
lower_case_table_names=1
max_allowed_packet=16M
default-time_zone='+08:00'
```

> 如果必须使用 MySQL 5.7，请将 `collation-server` 改为 `utf8mb4_unicode_ci`，不要直接复用 8.x 的默认排序规则。
>
> `lower_case_table_names` 需要在初始化数据目录前确定；不要在已有数据目录上直接切换该值。

4. 创建容器并挂载数据

```bash
docker run -d --name mysql8.4 \
       -v /root/mysql/data:/var/lib/mysql \
       -v /root/mysql/conf:/etc/mysql/conf.d \
       -v /root/mysql/log:/var/log/mysql \
       -p 3306:3306 \
       -e TZ=Asia/Shanghai \
       -e MYSQL_ROOT_PASSWORD=change-me \
       mysql:8.4
# 不换行命令
docker run -d --name mysql8.4 -v /root/mysql/data:/var/lib/mysql -v /root/mysql/conf:/etc/mysql/conf.d -v /root/mysql/log:/var/log/mysql -p 3306:3306 -e TZ=Asia/Shanghai -e MYSQL_ROOT_PASSWORD=change-me mysql:8.4
```

### 检查挂载是否有效

1. 上传备份 SQL 到宿主机，复制到容器

```
docker cp /root/mysql/account.sql mysql8.4:/
```

2. 进入 MySQL 容器内部 `docker exec -it mysql8.4 mysql -uroot -p`，导入 SQL

```
create database ccjk;
use ccjk;
source /account.sql;
```

3. 数据导入成功后，可以删除并重新创建容器验证数据是否仍在挂载目录中

```
docker stop mysql8.4 && docker rm mysql8.4
```

### 报错
![2003错误](https://github.com/ZeroClian/picture/blob/master/img/20220726160414.png?raw=true)

MySQL 8 不再推荐在 `GRANT` 中同时创建用户和设置密码。先创建账号，再授予最小必要权限；语法可参考官方的 [`CREATE USER`](https://dev.mysql.com/doc/refman/8.4/en/create-user.html) 和 [`GRANT`](https://dev.mysql.com/doc/refman/8.4/en/grant.html) 文档：

```
CREATE USER IF NOT EXISTS 'user'@'192.0.2.%' IDENTIFIED BY 'change-me';
GRANT SELECT, INSERT, UPDATE, DELETE ON db.* TO 'user'@'192.0.2.%';
SHOW GRANTS FOR 'user'@'192.0.2.%';
```

不要把 root 账号开放给 `%`；如确实需要远程管理，使用限定来源地址的独立管理员账号，并通过防火墙限制 3306。使用 `CREATE USER`、`GRANT`、`REVOKE` 后通常不需要手动执行 `FLUSH PRIVILEGES`。

> mysql.user表中Host为"%"的含义：
> 
> – Host 列指定允许用户登录的来源主机，比如 `User = root, Host = 192.168.1.1` 表示该账号只允许从该主机连接。
> 
> – `%` 是通配符；`Host = 192.168.1.%` 表示匹配该网段，`Host = %` 表示不限制来源主机（风险较高）。
> 
> – 这也就是为什么在开启远程连接的时候，大部分人为了省事，都会直接把Host改成”%"的缘故。

## 阿里云服务器安装（传统 RPM 方式）

> 这是 CentOS 7/MySQL 5.7 时代的旧流程。CentOS 7 和 MySQL 5.7 都已结束生命周期，新服务器优先使用受支持发行版和 MySQL 8.x；如果必须维护旧环境，请先备份并在测试机验证。

**第一步**，更新软件索引（不要在生产机上无评估地执行全量升级）

```
sudo yum makecache
```
**第二步**，检测已有安装；卸载时优先使用包管理器，避免 `rpm --nodeps` 破坏依赖

```
rpm -qa | grep mysql
sudo yum remove mysql-community-server mysql-community-client
```
**第三步**，按目标版本从 MySQL 官方仓库选择并安装 RPM（不要继续使用已失效的 `el7-5` 固定地址）

先按目标发行版从 [MySQL 官方 Yum Repository](https://dev.mysql.com/downloads/repo/yum/) 安装对应仓库包，再执行安装命令：

```
sudo yum install mysql-community-server
```

**第四步**，启动 MySQL 服务并设置开机启动

```
sudo systemctl enable --now mysqld
```
查看默认密码

```
grep 'temporary password' /var/log/mysqld.log   
```
**第五步**，首次登录并设置 root 密码。MySQL 8 初始化时通常会生成临时密码，不应默认认为 root 免密。

```
sudo systemctl status mysqld
sudo grep 'temporary password' /var/log/mysqld.log
mysql -u root -p
```
> 只有在无法正常登录且已确认维护窗口的情况下，才考虑临时使用 `--skip-grant-tables`；完成后必须立即移除该配置、重启服务并执行 `ALTER USER`，不要直接修改 `mysql.user` 表。

登录后设置密码：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'change-me';
```

**第六步**，使用新密码登录：

```bash
mysql -u root -p
```

**第七步**，设置开机自启动 MySQL：

```bash
sudo systemctl enable mysqld
```

**第八步**，开启远程服务

```sql
CREATE USER IF NOT EXISTS 'admin'@'192.0.2.%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'192.0.2.%';
```
**第九步**，设置 Linux 防火墙

仅在确有远程访问需求时开放端口，并把来源限制为可信网段：

```bash
sudo firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.0.2.0/24" port protocol="tcp" port="3306" accept' --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-rich-rules
```

[参考教程](https://www.runoob.com/mysql/mysql-install.html)

## 授权与回收权限

### 授权

```sql
CREATE USER IF NOT EXISTS 'course'@'192.0.2.%' IDENTIFIED BY 'change-me';
GRANT SELECT, INSERT, UPDATE, DELETE ON course.* TO 'course'@'192.0.2.%';
```

- all privileges：表示将所有权限授予给用户。

  也可指定具体的权限，如：SELECT、CREATE、DROP等。
- on：表示这些权限对哪些数据库和表生效，格式：数据库名.表名，这里写“*”表示所有数据库，所有表。
 
  如果我要指定将权限应用到test库的user表中，可以这么写：test.user
- to：将权限授予哪个用户。格式：`'用户名'@'登录IP或域名'`。
  
  `%` 表示不限制来源主机；例如 `'course'@'192.168.0.%'` 表示只允许该网段登录。生产环境应尽量使用明确的主机或网段。

### 回收权限

```sql
REVOKE CREATE ON *.* FROM 'course'@'192.0.2.%';
```

### 刷新权限

使用账号管理语句后权限会立即生效，通常不需要手动刷新。只有直接修改授权表（不推荐）或排查旧版本问题时才考虑：

```sql
flush privileges;
```
