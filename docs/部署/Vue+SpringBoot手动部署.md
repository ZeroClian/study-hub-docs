> 本文章主要讲如何手动部署前后端分离项目，分**前端部署**和**后端部署**，部署所用项目获取：关注公众号发送:
`cloud`

## 前言

基于本项目的所需的环境
- 前端
  - node：v16.14.2
  - pnpm：8.6.9
- 后端
  - jdk：17
  - maven：Apache Maven 3.8.1
  - mysql：8.0.28
  - nacos：2.1.1
- 服务器：2核4G（最好）
  - nginx：1.20.2
  - docker：24.0.7


## 前端部署

#### 1. 新建目录

用于存放项目 build 后的资源

```
cd /
mkdir www
cd /www
mkdir html
```

#### 2. 项目构建

- 执行 `pnpm run build`

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116001513.png?raw=true)

- 将生成的 dist 目录上传到刚才创建的 `/www/html/` 下

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116001833.png?raw=true)



#### 3. 安装 nginx

- 安装：[Nginx安装](/环境/nginx.md)

- 修改配置：`vim /usr/local/nginx/conf/nginx.conf `

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116002831.png?raw=true)

- 访问 ip:80 验证



## 后端部署

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
  ```

- 在项目目录下执行:`mvn clean` 和 `mvn package`

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116011617.png?raw=true)
  
- target目录下的jar包上传至服务器

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128141341.png)
![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128141520.png)

  使用 rz 命令上传到服务器上(最好分别建立文件夹存放单独的jar包，便于后面打包生成镜像)

#### 2. 制作基础镜像

因为运行 jar 包需要 jdk 环境，项目使用的是 jdk17，因此需要据此制作一个含有 jdk17 的基础镜像，选用 ubuntu 为基础来进行制作

[安装docker](/环境/docker.md)

- 拉取 ubuntu 镜像：`docker pull ubuntu`

- 新建一个 jdk 目录，将 jdk17的安装包copy到目录下

- 新建 Dockerfile 文件：`vim Dockerfile`

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

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116013123.png?raw=true)

- 在 Dockerfile 文件所在目录执行：`docker build -t jdk17 .`

  将会生成了一个名为 jdk17 的镜像，使用 `docker images` 查看
  
#### 3. 制作服务镜像

- 同样的方式，在上传的cloud-service.jar所在目录下新建 Dockerfile 文件，执行：`docker build -t cloud-service .`

  ```bash
  FROM jdk17
  ADD cloud-service.jar /cloud-service.jar
  ENTRYPOINT ["java","-jar","/cloud-service.jar"]
  ```

  最后我们会得到三个镜像：

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116013954.png?raw=true)


#### 4. 启动容器

- 启动容器，开放端口号

  ```bash
  docker run -di --name=cloud-gateway -p 9999:9999 cloud-gateway
  docker run -di --name=cloud-service -p 8001:8001 cloud-service
  ```

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116014203.png?raw=true)

- 验证是否成功

  ![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128140452.png)

> ❗️注意事项❗️
> - 无法访问时，请检查服务器的安全组是否放开相关端口
> - cloud-nacos不在需要理会，直接nacos安装即可，不需要使用容器启动
> - 若启动后很快容器就停止了，可能是服务器内存不足，可以自行调整容器
> - jdk17安装包获取：公众号发送`jdk17`