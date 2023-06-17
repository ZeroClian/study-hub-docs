## 将Jar包以Service运行

- 切换到service目录：cd /etc/systemd/system
- 编辑服务文件：vi serviceName.service     
  - serviceName 是服务名称，根据实际填写

  ```
  [Unit]
  Description=serviceName.
  After=syslog.target
  After=network.target

  [Service]
  Type=simple

  ExecStart=/usr/bin/java -Xmx700m -jar /root/app/xxx.jar > /root/app/xxx.log

  TimeoutStopSec=0
  PrivateTmp=true

  [Install]
  WantedBy=multi-user.target
  ```
> - 启动服务：`systemctl start serviceName`
> - 停止服务：`systemctl stop serviceName`
> - 服务状态：`systemctl status serviceName`
> - 项目日志：`journalctl -u serviceName`
> 
> - 开机启动：`systemctl enable serviceName`
> - 开机启动查看：`systemctl list-unit-files | grep serviceName`
>   或：`systemctl list-unit-files | grep enable`
> - 查看所有服务开机启动情况：`systemctl list-unit-files`



### 可能出现问题
问题：/usr/bin/java’: No such file or directory
发现原因：是/usr/bin/java未创建软链接
解决方案：
```
[root@loaclhost ~]# echo $JAVA_HOME
/usr/local/jdk/jdk-17.0.5
[root@loaclhost ~]# ln -s -f /usr/local/jdk/jdk-17.0.5/bin/java
```

> 建立软连接：`ln -s 原目录 映射目录`
> 
> 删除软连接：`sudo rm -rf 映射目录`
> 
> 输出：`echo &JAVA_HOME`