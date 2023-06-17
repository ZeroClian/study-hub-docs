## 端口

查看端口号：`lsof -i tcp:port`

杀死进程：`kill -9 PID`

开放端口: `firewall-cmd --add-port=3306/tcp --permanent`

> --permanent 永久生效,没有此参数重启后失效


## 防火墙

启动： `systemctl start firewalld`

关闭： `systemctl stop firewalld`

查看状态： `systemctl status firewalld`

开机禁用 ： `systemctl disable firewalld`

开机启用 ： `systemctl enable firewalld`

## systemctl

启动一个服务：`systemctl start firewalld.service`

关闭一个服务：`systemctl stop firewalld.service`

重启一个服务：`systemctl restart firewalld.service`

显示一个服务的状态：`systemctl status firewalld.service`

在开机时启用一个服务：`systemctl enable firewalld.service`

在开机时禁用一个服务：`systemctl disable firewalld.service`

查看服务是否开机启动：`systemctl is-enabled firewalld.service`

查看已启动的服务列表：`systemctl list-unit-files|grep enabled`

查看启动失败的服务列表：`systemctl --failed`

## firewalld-cmd

查看版本： `firewall-cmd --version`

查看帮助： `firewall-cmd --help`

显示状态： `firewall-cmd --state`

查看所有打开的端口： `firewall-cmd --zone=public --list-ports`

更新防火墙规则： `firewall-cmd --reload`

查看区域信息： `firewall-cmd --get-active-zones`

查看指定接口所属区域： `firewall-cmd --get-zone-of-interface=eth0`

拒绝所有包：`firewall-cmd --panic-on`

取消拒绝状态： `firewall-cmd --panic-off`

查看是否拒绝： `firewall-cmd --query-panic`

## 查看系统信息

  `cat /etc/os-release`

## 查看系统字体

- `fc-list`：查看所有字体
- `fc-list :lang=zh`：查看中文字体