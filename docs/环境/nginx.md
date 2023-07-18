## 卸载
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

## 安装
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


## 常用命令
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




## shell脚本

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

