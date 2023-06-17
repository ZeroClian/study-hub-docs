# Nacos

> 官方文档地址：[Nacos](https://nacos.io/zh-cn/docs/what-is-nacos.html)
> 注：Nacos的运行需要以至少2C4g60g*3的机器配置下运行。

## Linux安装
  - 需要有JDK环境：[安装JDK步骤](/环境/jdk.md)
```bash
unzip nacos-server-$version.zip 或者 tar -xvf nacos-server-$version.tar.gz
cd nacos/bin
```
  - 启动：`sh startup.sh -m standalone`
  - 停止：`sh shutdown.sh`

![](https://github.com/ZeroClian/picture/blob/master/img/20230117221703.png?raw=true)

  - 访问：`http://ip:8848/nacos/`