# Docker

> Linux 内核版本需要3.0以上，通过 uname -r 查看，我的为：3.10.0-1127.19.1.el7.x86_64
> 
> 官方文档：[Docker](https://docs.docker.com/engine/install/centos/)

##  卸载

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

## 安装

  1. 安装基础工具包：`yum install -y yum-utils`

  2. 设置镜像仓库

```bash
yum-config-manager \
    --add-repo \
    http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```
  3. 更新软件包索引：`yum makecache fast`
  4. 安装

```bash
yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

<img src="https://github.com/ZeroClian/picture/blob/master/img/20230117230456.png?raw=true" style="zoom:40%;" />