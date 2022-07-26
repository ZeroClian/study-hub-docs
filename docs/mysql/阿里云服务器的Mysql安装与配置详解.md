**第一步**，更新服务器系统为最新（可省略），出现 Complete 即为完成

```
yum -y update
```
**第二步**,检测是否有安装过，如果有删除，一般没有，没有不显示如何数据

```
rpm -qa | grep mysql
删除命令
rpm -e  --nodeps        mysql-libs-5.1.73-5.e16_6.i686（）对应mysql
```
**第三步**，下载Mysql安装包并安装

```
wget http://repo.mysql.com/mysql-community-release-el7-5.noarch.rpm
rpm -ivh mysql-community-release-el7-5.noarch.rpm
yum update
yum install mysql-server
```

**第四步**，开启Mysql服务

```
systemctl start mysqld.service
或者systemctl start mysqld
```
查看默认密码

```
grep 'temporary password' /var/log/mysqld.log   
```
**第五步**，登陆，由于Mysql自带超级用户root 和一个免密用户，可以直接输入mysql直接登陆，或者根据查询到的密码，登陆，如果不使用密码，需要去修改配置，跳过密码，具体操作如下：
- 查看当前Mysql活动状态，如果运行，则要停止下来

```
查看状态
 systemctl status mysqld
停止
service mysqld stop
```
- 编辑配置文件，添加跳表字段，退出并保存，

```
vim /etc/my.cnf
skip-grant-tables
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200825150436510.png#pic_center)
- 启动并免密进入

```
systemctl start mysqld  //或者用重启语句：service mysqld restart 
mysql -u root
```
- 查询密码格式，如果结构为空，则密码无要求，我这里为空

```
show variables like 'vali%';
```
- 设置root密码

```
update mysql.user set authentication_string=password('123456') where user='root';
```
- 退出并修改 my.cnf 文件，删除免密命令
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200825151004680.png#pic_left)

- 重启MySQL服务

```
service mysqld restart 
```

 **第六步**，使用密码登陆
 

```
Mysql安装成功后，默认的root用户密码为空，你可以使用以下命令来创建root用户的密码：
mysqladmin -u root password "new_password";
但是只能执行一次
```

**第七步**，设置开机自启动mysql
加入到系统服务：`chkconfig --add mysql`
自动启动：`chkconfig mysql on`

**第八步**，开启远程服务

```
grant all privileges on *.* to 'root' @'%' identified by '123456';
flush privileges;
```
**第九步**，设置linux的防火墙
Linux默认拦截3306端口
```
/sbin/iptables -I INPUT -p tcp --dport 3306 -j ACCEPT
/etc/rc.d/init.d/iptables save
或者
开启3306端口
firewall-cmd --zone=public --add-port=3306/tcp --permanent
重启防火墙
firewall-cmd --reload
查看已经开放的端口
firewall-cmd --list-ports
```

[参考教程](https://www.runoob.com/mysql/mysql-install.html)
