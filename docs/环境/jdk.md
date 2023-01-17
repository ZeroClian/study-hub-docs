# JDK

1. 上传压缩包至服务器

2. 解压：`tar -zxvf jdk-17_linux-x64_bin.tar.gz -C /usr/local/jdk`

3. 修改环境变量：`vim /etc/profile`
```bash
export JAVA_HOME=/usr/local/jdk/jdk-17.0.5
export CLASSPATH=$JAVA_HOME/lib/
export PATH=$JAVA_HOME/bin:$PATH
```
4. 重新加载环境变量：`source /etc/profile`

![](http://cdn.liancode.top/img/20230117221325.png)