---
title: MySQL 安装、容器化与权限管理
description: MySQL 在服务器和 Docker 中的部署，以及用户授权管理。
---

# MySQL 安装、容器化与权限管理

将 MySQL 的两种部署方式和后续权限配置串成一条完整路径。

## Docker 部署

### 部署

1. 下载 MySQL5.7 镜像

```sql
docker pull mysql:5.7
```

2. 创建挂载目录

```
mkdir /root/mysql/data
mkdir /root/mysql/conf
mkdir /root/mysql/log
```

3. 添加配置文件，因为挂载的conf.d默认为空，`vi /root/mysql/conf/my.cnf` 添加以下内容

```bash
[mysql]
#设置mysql客户端默认字符集
default-character-set=utf8
socket=/var/lib/mysql/mysql.sock
 
[mysqld]
#mysql5.7以后的不兼容问题处理
sql_mode=NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
# Disabling symbolic-links is recommended to prevent assorted security risks
symbolic-links=0
 
# Settings user and group are ignored when systemd is used.
# If you need to run mysqld under a different user or group,
# customize your systemd unit file for mariadb according to the
# instructions in http://fedoraproject.org/wiki/Systemd
 
#允许最大连接数
max_connections=200
 
#服务端使用的字符集默认为8比特编码的latin1字符集
character-set-server=utf8
 
#创建新表时将使用的默认存储引擎
default-storage-engine=INNODB
lower_case_table_names=1
max_allowed_packet=16M 
 
#设置时区
default-time_zone='+8:00'
 
[mysqld_safe]
log-error=/var/log/mariadb/mariadb.log
pid-file=/var/run/mariadb/mariadb.pid
# include all files from the config directory
 
!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/
```

4. 创建容器并挂载数据

```bash
docker run -d --name mysql5.7 \
       -v /root/mysql/data:/var/lib/mysql \
       -v /root/mysql/conf:/etc/mysql/conf.d \ 
       -v /root/mysql/log:/var/log/mysql \ 
       -p 3306:3306 \
       -e TZ=Asiz/Shanghai \ 
       -e MYSQL_ROOT_PASSWORD=mysql \ 
       mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_general_ci
# 不换行命令
docker run -d --name mysql5.7 -v /root/mysql/data:/var/lib/mysql -v /root/mysql/conf:/etc/mysql/conf.d -v /root/mysql/log:/var/log/mysql -p 3306:3306 -e TZ=Asiz/Shanghai -e MYSQL_ROOT_PASSWORD=mysql mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_general_ci
```

### 检查挂载是否有效

1. 上传备份 sql 到宿主机，复制宿主机备份 sql 到容器

```
docker cp /root/mysql/account.sql mysql5.7:/
```

2. 进入 mysql 容器内部 `docker exec -it mysql5.7 /bin/bash`，导入sql

```
create database ccjk;
use ccjk;
source /account.sql;
```

3. 数据导入成功可以查询后，删除容器，并重新用命令创建容器，查看数据存在

```
docker stop mysql5.7 && docker rm mysql5.7
```

### 报错
![2003错误](https://github.com/ZeroClian/picture/blob/master/img/20220726160414.png?raw=true)

```
允许所有用户可访问
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'QINg0201$' WITH GRANT OPTION;
允许指定Ip用户访问
GRANT ALL PRIVILEGES ON *.* TO 'user'@'ip_xxx' IDENTIFIED BY 'mypassword' WITH GRANT OPTION;
允许指定Ip用户访问指定数据库
GRANT ALL PRIVILEGES ON db.* TO 'user'@'ip_xxx' IDENTIFIED BY 'mypassword' WITH GRANT OPTION;
别忘记执行刷新配置
FLUSH PRIVILEGES;
```

> mysql.user表中Host为"%"的含义：
> 
> – Host列指定了允许用户登录所使用的IP，比如user = root, Host = 192.168.1.1。这里的意思就是说root用户只能通过192.168.1.1的客户端去访问。
> 
> – 而%是个通配符，如果Host = 192.168.1.%，那么就表示只要是IP地址前缀为"192.168.1.“的客户端都可以连接。如果Host = %，表示所有IP都有连接权限。
> 
> – 这也就是为什么在开启远程连接的时候，大部分人为了省事，都会直接把Host改成”%"的缘故。

## 阿里云服务器安装

**第一步**，更新服务器系统为最新（可省略），出现 Complete 即为完成

```
yum -y update
```
**第二步**,检测是否有安装过，如果有删除，一般没有，没有不显示如何数据

```
rpm -qa | grep mysql
删除命令
rpm -e  --nodeps        mysql-libs-5.1.73-5.e16_6.i686（）对应mysql
```
**第三步**，下载Mysql安装包并安装

```
wget http://repo.mysql.com/mysql-community-release-el7-5.noarch.rpm
rpm -ivh mysql-community-release-el7-5.noarch.rpm
yum update
yum install mysql-server
```

**第四步**，开启Mysql服务

```
systemctl start mysqld.service
或者systemctl start mysqld
```
查看默认密码

```
grep 'temporary password' /var/log/mysqld.log   
```
**第五步**，登陆，由于Mysql自带超级用户root 和一个免密用户，可以直接输入mysql直接登陆，或者根据查询到的密码，登陆，如果不使用密码，需要去修改配置，跳过密码，具体操作如下：
- 查看当前Mysql活动状态，如果运行，则要停止下来

```
查看状态
 systemctl status mysqld
停止
service mysqld stop
```
- 编辑配置文件，添加跳表字段，退出并保存，

```
vim /etc/my.cnf
skip-grant-tables
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200825150436510.png#pic_center)
- 启动并免密进入

```
systemctl start mysqld  //或者用重启语句：service mysqld restart 
mysql -u root
```
- 查询密码格式，如果结构为空，则密码无要求，我这里为空

```
show variables like 'vali%';
```
- 设置root密码

```
update mysql.user set authentication_string=password('123456') where user='root';
```
- 退出并修改 my.cnf 文件，删除免密命令
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200825151004680.png#pic_left)

- 重启MySQL服务

```
service mysqld restart 
```

 **第六步**，使用密码登陆
 

```
Mysql安装成功后，默认的root用户密码为空，你可以使用以下命令来创建root用户的密码：
mysqladmin -u root password "new_password";
但是只能执行一次
```

**第七步**，设置开机自启动mysql
加入到系统服务：`chkconfig --add mysql`
自动启动：`chkconfig mysql on`

**第八步**，开启远程服务

```
grant all privileges on *.* to 'root' @'%' identified by '123456';
flush privileges;
```
**第九步**，设置linux的防火墙
Linux默认拦截3306端口
```
/sbin/iptables -I INPUT -p tcp --dport 3306 -j ACCEPT
/etc/rc.d/init.d/iptables save
或者
开启3306端口
firewall-cmd --zone=public --add-port=3306/tcp --permanent
重启防火墙
firewall-cmd --reload
查看已经开放的端口
firewall-cmd --list-ports
```

[参考教程](https://www.runoob.com/mysql/mysql-install.html)

## 授权与回收权限

### 授权

```sql
grant all privileges on *.* to 'course'@'%' identified by 'course' with grant option;
```

- all privileges：表示将所有权限授予给用户。

  也可指定具体的权限，如：SELECT、CREATE、DROP等。
- on：表示这些权限对哪些数据库和表生效，格式：数据库名.表名，这里写“*”表示所有数据库，所有表。
 
  如果我要指定将权限应用到test库的user表中，可以这么写：test.user
- to：将权限授予哪个用户。格式：”用户名”@”登录IP或域名”。
  
  %表示没有限制，在任何主机都可以登录。比如：”course”@”192.168.0.%”，表示course这个用户只能在 192.168.0 IP段登录
- identified by：指定用户的登录密码

### 回收权限

```sql
revoke create on *.* from 'course@%';
```

### 刷新权限

设置完权限一定要执行的命令

```sql
flush privileges;
```
