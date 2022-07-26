## 部署

1. 下载 MySQL5.7 镜像

```mysql5
docker pull mysql:5.7
```

2. 创建挂载目录

```
mkdir /usr/docker/mysql/data
mkdir /usr/docker/mysql/conf
mkdir /usr/docker/mysql/log
```

3. 创建容器并挂载数据

```bash
docker run -d --name mysql5.7 -v /usr/docker/mysql/data:/var/lib/mysql -v /usr/docker/mysql/conf:/etc/mysql -v /usr/docker/mysql/log:/var/log/mysql -p 3306:3306 -e TZ=Asiz/Shanghai -e MYSQL_ROOT_PASSWORD=803017ycl.mysql mysql:5.7.37 --character-set-server=utf8mb4 --collation-server=utf8mb4_general_ci
```

## 检查挂载是否有效

1. 上传备份 sql 到宿主机，复制宿主机备份 sql 到容器

```
docker cp /usr/docker/account.sql mysql5.7:/
```

2. 进入 mysql 容器内部，导入sql

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
![2003错误](http://cdn.liancode.top/img/20220726160414.png)

```
GRANT ALL ON *.* TO 'root'@'%' with grant option;
flush privileges; #刷新mysql的系统权限相关表
update user set host='%' where user='root';  #修改root用户的host属性值为"%"
flush privileges; #刷新mysql的系统权限相关表
```

> mysql.user表中Host为"%"的含义：
> 
> – Host列指定了允许用户登录所使用的IP，比如user = root, Host = 192.168.1.1。这里的意思就是说root用户只能通过192.168.1.1的客户端去访问。
> 
> – 而%是个通配符，如果Host = 192.168.1.%，那么就表示只要是IP地址前缀为"192.168.1.“的客户端都可以连接。如果Host = %，表示所有IP都有连接权限。
> 
> – 这也就是为什么在开启远程连接的时候，大部分人为了省事，都会直接把Host改成”%"的缘故。