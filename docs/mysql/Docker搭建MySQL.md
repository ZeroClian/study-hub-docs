## 部署

1. 下载 MySQL5.7 镜像

```mysql5
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

## 检查挂载是否有效

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

## 报错
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