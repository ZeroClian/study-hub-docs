
# 一、安装
基于 Centos 7 系统的安装步骤

1. 系统版本需要3.0以上
 ```bash
#查看版本
uname -r
# 3.10.0-1160.25.1.el7.x86_64
 ```

2. 卸载旧版本
```bash
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

3. yum 包更新到最新
```bash
sudo yum update
```

4. 安装需要的软件包，yum-util 提供 yum-config-manager 功能，另外两个是 devicemapper 驱动依赖的
```bash
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
```

5. 设置 yum 源为阿里云
```bash
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

6. 安装 docker
```bash
sudo yum install docker-ce
```

7. 安装成功，查看版本
```bash
docker -v
or
docker version
```



# 二、设置镜像加速器

## 1. ustc镜像加速器

1. 编辑文件：`vi /etc/docker/daemon.json`

> 显示无权限，编辑不了，则先创建该空文件

2. 添加如下内容
```json
{
"registry-mirrors": ["https://docker.mirrors.ustc.edu.cn"]
}
```

## 2. 阿里云镜像加速器

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/阿里云docker镜像加速.png)

通过修改daemon配置文件`/etc/docker/daemon.json`来使用加速器

```bash
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://bb5nwkjh.mirror.aliyuncs.com"]
}
EOF

sudo systemctl daemon-reload

sudo systemctl restart docker
```



# 三、Docker 的启动与停止

1. 启动 docker：`systemctl start docker`
1. 停止 docker：`systemctl stop docker`
1. 重启 docker：`systemctl restart docker`
1. 查看 docker 状态：`systemctl status docker`
1. 开机启动：`systemctl enable docker`
1. 查看 docker 概要信息：`docker info`
1. 查看帮助文档：`docker --help`



# 四、常用命令

## 1. 帮助文档

```bash
docker version			# docker版本信息
docker info				# docker系统信息
docker 命令 --help 	   # 帮助命令
```

>  文档地址：https://docs.docker.com/reference/
>
>  所有命令都可在文档查到详细信息

## 2. 镜像相关命令

镜像就好比一个模板（类），可以通过这个镜像创建一个或多个容器服务。

### 查看镜像

`docker images [OPTIONS]`

这些镜像都是存储在 Docker 宿主机的 /var/lib/docker 目录下

|    属性    |     含义     |
| :-: | :-: |
| repository | 镜像名称 |
| tag | 镜像标签 |
| image id | 镜像ID |
| created | 镜像创建日期 |
| size | 镜像大小 |

> **删除资源**：`rm -rf /var/lib/docker `

### 搜索镜像

`docker search 镜像名称 [OPTIONS]`

通过网络查找需要的镜像

|    属性     |                         含义                         |
| :-: | :-: |
| name | 仓科名称 |
| description | 镜像描述 |
| stars | 受欢迎程度 |
| official | 是否官方 |
| automated | 自动构建，表示该镜像由 Docker Hub 自动构建流程创建的 |

### 拉取镜像

`docker pull 镜像名称`

```shell
[root@ZeroClian ~]# docker pull mysql
Using default tag: latest			# 如果不写tag，默认是 latest
latest: Pulling from library/mysql
69692152171a: Pull complete 		# 分层下载，docker image的核心，联合文件系统
1651b0be3df3: Pull complete 
951da7386bc8: Pull complete 
0f86c95aa242: Pull complete 
37ba2d8bd4fe: Pull complete 
6d278bb05e94: Pull complete 
497efbd93a3e: Pull complete 
f7fddf10c2c2: Pull complete 
16415d159dfb: Pull complete 
0e530ffc6b73: Pull complete 
b0a4a1a77178: Pull complete 
cd90f92aa9ef: Pull complete 
Digest: sha256:d50098d7fcb25b1fcb24e2d3247cae3fc55815d64fec640dc395840f8fa80969  # 签名
Status: Downloaded newer image for mysql:latest
docker.io/library/mysql:latest 		  # 真实地址

# 两者等价
docker pull mysql
docker pull docker.io/library/mysql:latest 
# 下载5.7版本
docker pull mysql:5.7
```

> 联合文件系统：是一种分层、轻量级并且高性能的文件系统，它支持对文件系统的修改作为一次提交来一层层的叠加，同时可以将不同目录挂载到同一个虚拟文件系统下。
>
> 联合文件系统是 Docker 镜像的基础。镜像可以通过分层来进行继承，基于基础镜像（没有父镜像），可以制作各种具体的应用镜像。不同 Docker 容器就可以共享一些基础的文件系统层，同时再加上自己独有的改动层，大大提高了存储的效率。

### 删除镜像

`docker rmi 镜像ID`

```
# 删除镜像，不询问
docker rmi -f 镜像id
# 删除全部的镜像
docker rmi -f $(docker images -aq)
docker rmi 'docker images -q'
```

### 可选项
|      可选项       |        含义        |
| :---------------: | :----------------: |
|    -a / - -all    |    列出所有镜像    |
|   -q /- - quiet   |   只显示镜像的id   |
| - - filter=[条件] | 筛选满足条件的结果 |

```
# 搜索出 mysql 镜像stars大于3000
docker search mysql --filter=stars=3000
```

## 3. 容器相关命令

有了镜像才可以创建容器

### 查看容器

1. 查看运行中的容器：`docker ps`
1. 查看所有容器：`docker ps -a`
1. 查看最后一次运行的容器：`docker ps -l`
1. 查看停止的容器：`docker ps -f status=exited`

### 创建与启动容器

- 命令：`docker run [options] image`
|  命令  |                             含义                             |                            备注                            |
| :-: | :-: | :-: |
| -i | 表示运行容器 |  |
| -t | 表示容器启动后会进入其命令行 | 加入 it 两个参数后，容器创建就能登陆进去，即分配一个伪终端 |
| --name | 为创建的容器命名 |  |
| -v | 表示目录映射关系（前者是宿主机目录，后者是映射到宿主机上的目录），可以使用多个 -v 做多个目录或者文件映射 | 最好做目录映射，在宿主机上做修改，然后共享到容器上 |
| -d | 在 run 后面加上 -d 参数则会创建一个守护式容器在后台运行 | 这样创建容器后不会自动登陆进去容器 |
| -p | 表示端口映射，前者是宿主机端口，后者是容器内的映射端口，可以使用多个 -p 做多个端口映射 | -p 8080:8080 |

1. 交互式方式创建容器
```bash
docker run -it --name=容器名称 镜像名称:标签 /bin/bash
# 测试
[root@ZeroClian ~]# docker images
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
centos       latest    300e315adb2f   6 months ago   209MB
[root@ZeroClian ~]# docker run -it --name=centos7 centos /bin/bash
[root@b8ac772ea12c /]# 
```
> 退出当前容器：`exit`
>
> 容器不停止退出：`Ctrl + P + Q`

2. 守护式方式创建容器
```shell
//创建
docker run -id --name=容器名称 镜像名称:标签
//登陆
docker exec -it 容器名称（或容器ID）/bin/bash
```

> docker run -d 镜像名
>
> docker 后台运行就必须要有一个前台进程，否则就会自动停止

**停止与启动容器**

- 停止容器：`docker stop 容器名称（或容器ID）`
- 启动容器：`docker start 容器名称（或容器ID）`

### 删除容器

```shell
docker rm 容器id	# 不能删除正在运行的容器，-f 强制删除
docker rm -f $(docker ps -aq)	# 删除所有容器
docker  ps -a -q | xargs docker rm -f	# 删除所有容器
```

### 查看容器IP地址

- 查看容器运行的各种数据：`docker inspect 容器名称（容器ID）`
- 直接输出IP地址：`docker inspect --format='{{.NetworkSettings.IPaddress}}' 容器名称（容器ID）`


## 4. 其他常用命令

### 查看日志

```shell
docker logs -tf --tail [number] 容器id

# docker logs --help
```

### 查看进程

```
docker top 容器id
```

### 查看容器的元数据

```
docker inspect 容器id
```

### 进入当前运行的容器

```shell
# 方式一
docker exec -it 容器id /bin/bash	# 进入后，开启一个新的终端
# 方式二
docker attach 容器id 	# 进入正在运行的终端
```

### 文件拷贝

- 拷贝到容器：`docker cp 需要拷贝的文件或目录 容器名称:容器目录`
- 从容器中拷贝：`docker cp 容器名称:容器目录 需要拷贝的文件或目录`


### 目录挂载

在创建容器的时候，将宿主机的目录与容器内的目录进行映射，从而可以通过修改宿主机某个目录的文件去影响容器。
在创建容器时，添加 -v 宿主机目录 : 容器目录，如：

```bash
docker run -id -v /usr/local/myhtml:/usr/local/myhtml --name=mycentos centos:7
```
如果共享的是多级目录，可能会出现权限不足的提示，这是因为 CentOS 7 中的安全模块 selinux 把权限禁掉了，因此需要添加参数 --privileged=true 来解决挂载的目录没用权限的问题。

## 5. 总结

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/docker命令.png)

# 五、应用部署

## 1. MySQL 部署

1. 拉取镜像
```bash
docker pull centos/mysql-57-centos7
```

2. 创建容器
```bash
docker run -id --name=tensquare_mysql -p 33306:3306 -e MYSQL_ROOT_PASSWORD=123456 centos/mysql-57-centos7
```
`-e` 代表添加环境变量 MYSQL_ROOT_PASSWORD 是 root 用户的登陆密码
`-p` 代表端口映射

3. 进入 mysql 容器
```bash
docker exec -it tensquare_mysql /bin/bash
```

4. 登陆 mysql
```bash
mysql -u root -p
```

5. 远程登陆 mysql

   连接宿主机 IP ，指定端口为 33306



## 2. tomcat部署

1. 拉取镜像：`docker pull tomcat:7-jre7`
1. 创建容器
```bash
docker run -di --name=mytomcat -p 9000:8080 -v /usr/local/webapps:/usr/local/tomcat/webapps tomcat:7-jre7
```


## 3. Nginx部署

1. 拉取镜像：`docker pull nginx`
1. 创建容器
```bash
docker run -di --name=mynginx -p 80:80 nginx
```

3. 进入并查看配置文件

```bash
[root@ZeroClian ~]# docker exec -it mynginx /bin/bash
root@96fd34d42785:/# whereis nginx
nginx: /usr/sbin/nginx /usr/lib/nginx /etc/nginx /usr/share/nginx
root@96fd34d42785:/# cd /etc/nginx
root@96fd34d42785:/etc/nginx# ls
conf.d  fastcgi_params  mime.types  modules  nginx.conf  scgi_params  uwsgi_params
```



## 4. Redis部署

1. 拉取镜像：`docker pull redis`
1. 创建容器
```bash
docker run -di --name=myredis -p 6379:6379 redis
```


# 六、迁移与备份

1. 容器保存为镜像
```bash
docker commit mynginx mynginx_i
```

2. 镜像备份
```bash
docker save -o mynginx.tar mynginx_i
```

3. 镜像恢复与迁移
```bash
docker load -i mynginx.tar
```
     `-i` 输入的文件



# 七、Dockerfile

Dockerfile 是由一系列命令和参数构成的脚本，这些命令应用于基础镜像并最终创建一个新的镜像。

   1. 对于开发人员：可以为开发团队提供一个完全一致的开发环境
   1. 对于测试时人员：可以直接拿开发时所构建的镜像或通过 Dockerfile 文件构建一个新的镜像开始工作
   1. 对于运维人员：在部署时，可以实现应用的无缝移植



## 1. 常用命令

| 命令 | 作用 |
| :---: | :---: |
| FROM image_name:tag | 定义了使用哪个基础镜像启动构建流程 |
| MAINTAINER user_name | 声明镜像的创建者 |
| ENV key value | 设置环境变量（可以写多条） |
| RUN command | 是 Dockerfile 的核心部分（可以写多条） |
| ADD source_dir/file dest_dir/file | 将宿主机的文件复制到容器内，如果是一个压缩文件，将会在复制完成后自动解压 |
| COPY source_dir/file dest_dir/file | 和ADD相似，但是不会解压 |
| WORKDIR path_dir | 设置工作目录 |



## 2. 使用脚本创建镜像

1. 创建 Dockerfile 文件 `vi Dockerfile`（以 jdk 为例）
```bash
FROM centos:7
MAINTAINER ZeroClian
#切换工作目录
WORKDIR /usr
RUN mkdir /usr/local/java
ADD jdk......gz /usr/local/java/
#配置Java环境变量
ENV JAVA_HOME /usr/local/java/jdkxxxxx
ENV JRE_HOME $JAVA_HOME/jre
ENV CLASSPATH $JAVA_HOME/bin/dt.jar:$JAVA_HOME/lib/tools.jar:$JRE_HOME/lib:$CLASSPATH
ENV PATH $JAVA_HOME/bin/:$PATH
```

2. 构建命令：`docker build -t='jdk1.8' .`

   `. `表示在当前目录下寻找 Dockerfile 文件

3. 查看镜像是否建立完成：`docker images`



# 八、Docker 私有仓库



## 1. 建立私有仓库与配置

1. 拉取私有仓库镜像：`docker pull registry`
1. 启动私有仓库容器：`docker run -di --name=registry -p 5000:5000 registry`
1. 打开浏览器输入地址[http://192.168.63.128:5000/v2/_catalog](http://192.168.63.128:5000/v2/_catalog)看到`{"repositories":[]}`表示私有仓库搭建成功并且内容为空
1. 修改 daemon.json
```bash
#修改
vi /etc/docker/daemon.json
#添加以下内容，保存退出
{"insecure-registries":["192.168.63.128:5000"]}
```
此步用于让 docker 信任私有仓库地址（要加逗号）

5. 重启 docker 服务：`systemctl restart docker`



## 2. 镜像上传至私有仓库

1. 标记此镜像为私有仓库的镜像
```bash
docker tag jdk1.8 192.168.63.128:5000/jdk1.8
```

2. 上传标记的镜像
```bash
docker push 192.168.63.128:5000/jdk1.8
```

- 拉取：`docker pull 192.168.63.128:5000/jdk1.8`



