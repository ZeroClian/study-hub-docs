> 其意义主要是理解部署的本质是什么，自动化部署就是将重复的步骤改成用脚本的形式来执行，减少了操作，因此记录一下，免得忘记

## 手动部署


### 前端部署

#### 1. 新建目录

用于存放项目 build 后的资源

```
cd /
mkdir www
cd /www
mkdir html
```

#### 2. 项目构建

- 执行 npm run build

  ![](http://cdn.liancode.top/img/20230116001513.png)

- 将生成的 dist 目录上传到刚才创建的 /www/html/ 下

  ![](http://cdn.liancode.top/img/20230116001833.png)

#### 3. 安装 nginx

- 安装：[Nginx安装](/环境/nginx.md)

- 修改配置：vim /usr/local/nginx/conf/nginx.conf 

  ![](http://cdn.liancode.top/img/20230116002831.png)

- 访问 ip:80 

  ![](http://cdn.liancode.top/img/20230116003212.png)



### 后端部署

#### 1. Package

- 子项目的 pom 文件添加打包插件

  ```xml
  <build>
      <finalName>打包后的jar包名</finalName>
      <plugins>
          <plugin>
              <groupId>org.springframework.boot</groupId>
              <artifactId>spring-boot-maven-plugin</artifactId>
              <executions>
                  <execution>
                      <goals>
                          <goal>repackage</goal>
                      </goals>
                  </execution>
              </executions>
          </plugin>
      </plugins>
  </build>
  
  <!-- common 包改为下面内容 -->
  <plugins>
      <plugin>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-maven-plugin</artifactId>
          <configuration>
              <classifier>exec</classifier>
          </configuration>
      </plugin>
  </plugins>
  ```

- 在项目目录下执行： mvn clean 和 mvn package

  ![](http://cdn.liancode.top/img/20230116011617.png)

  使用 rz 命令上传到服务器上，这里为新建了一个目录 /jar 用于存放

#### 2. 制作基础镜像

因为运行 jar 包需要 jdk 环境，项目使用的是 jdk17，因此需要据此制作一个含有 jdk17 的基础镜像，选用 ubuntu 为基础来进行制作

安装docker查看其他文章

- 拉取 ubuntu 镜像：docker pull ubuntu

- 新建一个 jdk 目录，将 jdk17的安装包copy到目录下

- 新建 Dockerfile 文件：vim Dockerfile

  ```
  FROM ubuntu
  MAINTAINER zeroclian
  RUN mkdir /usr/local/jdk
  WORKDIR /usr/local/jdk
  ADD jdk-17_linux-x64_bin.tar.gz /usr/local/jdk
  
  ENV JAVA_HOME /usr/local/jdk/jdk-17.0.5
  ENV CLASSPATH $JAVA_HOME/lib/
  ENV PATH $JAVA_HOME/bin:$PATH
  ```

  ![](http://cdn.liancode.top/img/20230116013123.png)

- 在 Dockerfile 文件所在目录执行：docker build -t jdk17 .

  将会生成了一个名为 jdk17 的镜像，使用 docker images 查看

- 同样的方式，在 jar 目录下新建 Dockerfile 文件，执行：docker build -t cloud-service .

  ```bash
  FROM jdk17
  ADD cloud-service.jar /cloud-service.jar
  ENTRYPOINT ["java","-jar","/cloud-service.jar"]
  ```

  最后我们会得到四个镜像：

  ![](http://cdn.liancode.top/img/20230116013954.png)

#### 3. 启动容器

- 启动容器，开放端口号

  ```bash
  docker run -di --name=cloud-nacos -p 8000:8000 cloud-naocs
  docker run -di --name=cloud-gateway -p 9000:9000 cloud-gateway
  docker run -di --name=cloud-service -p 8001:8001 cloud-service
  ```

  ![](http://cdn.liancode.top/img/20230116014203.png)

- 验证是否成功

  ![](http://cdn.liancode.top/img/20230116014741.png)

