1. 下载安装包 [Maven](https://maven.apache.org/download.cgi) 官网
2. 解压到相应目录
3. 配置环境变量

```
vim ~/.zshrc
# maven 配置
export MAVEN_HOME=/opt/maven/apache-maven-3.6.3
export PATH=$PATH:$MAVEN_HOME/bin
# 环境生效
source ~/.zshrc
```
4. 修改下载源配置

   1. 修改本地仓库位置

   ```xml
   <localRepository>/Users/lian/Documents/dev/maven_repository</localRepository>
   ```

   2. 修改仓库地址
   
   ```xml
   <mirror>
       <id>alimaven</id>
       <mirrorOf>central</mirrorOf>
       <name>aliyun maven</name>
       <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
   </mirror>
   ```
   

