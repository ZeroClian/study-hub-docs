
# Jenkins

> 参考文档：
> [https://juejin.cn/post/6844904198824263687](https://juejin.cn/post/6844904198824263687)

```bash
docker pull jenkins/jenkins:lts
```
```bash
docker run --name jenkins -d -v /usr/docker/jenkins_home:/var/jenkins_home -p 8081:8080 -p 50000:50000 jenkins/jenkins:lts
```
```bash
docker ps | grep jenkins
```
```bash
docker logs jenkins
```
![image.png](https://cdn.nlark.com/yuque/0/2022/png/2577724/1645775817494-b147643c-e12e-485a-93e8-13a9fe71858e.png)
访问 Jenkins ：http://ip:端口号
> 阿里云要开放8081端口

首次登陆需要密码
```bash
//进入jenkins容器
docker exec -it jenkins bash 
//查看密码
cat /var/jenkins_home/secrets/initialAdminPassword 
// ec7796c2418b466f9b07556d28b155d6
```
最后安装插件，设置管理员用户。
> admin admin

