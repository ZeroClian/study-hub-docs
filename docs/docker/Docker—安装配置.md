## 一、安装
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



## 二、设置镜像加速器

### 1. ustc镜像加速器

1. 编辑文件：`vi /etc/docker/daemon.json`

> ❗显示无权限，编辑不了，则先创建该空文件

2. 添加如下内容
```json
{
"registry-mirrors": ["https://docker.mirrors.ustc.edu.cn"]
}
```

### 2. 阿里云镜像加速器

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