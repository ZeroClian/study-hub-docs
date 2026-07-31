---
title: Vue + Spring Boot 部署与自动化发布
description: 前后端分离项目的手动部署与 GitHub Actions 持续发布。
---

# Vue + Spring Boot 部署与自动化发布

按“先手动理解部署链路，再自动化发布”的顺序合并两篇实践文章。

## 手动部署

> 本文章主要讲如何手动部署前后端分离项目，分**前端部署**和**后端部署**，部署所用项目获取：关注公众号发送:
`cloud`

### 前言

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


### 前端部署

##### 1. 新建目录

用于存放项目 build 后的资源

```
cd /
mkdir www
cd /www
mkdir html
```

##### 2. 项目构建

- 执行 `pnpm run build`

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116001513.png?raw=true)

- 将生成的 dist 目录上传到刚才创建的 `/www/html/` 下

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116001833.png?raw=true)



##### 3. 安装 nginx

- 安装：[Nginx安装](/devops/environments.html#nginx)

- 修改配置：`vim /usr/local/nginx/conf/nginx.conf `

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116002831.png?raw=true)

- 访问 ip:80 验证



### 后端部署

##### 1. Package

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

##### 2. 制作基础镜像

因为运行 jar 包需要 jdk 环境，项目使用的是 jdk17，因此需要据此制作一个含有 jdk17 的基础镜像，选用 ubuntu 为基础来进行制作

[安装docker](/devops/docker.html)

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
  
##### 3. 制作服务镜像

- 同样的方式，在上传的cloud-service.jar所在目录下新建 Dockerfile 文件，执行：`docker build -t cloud-service .`

  ```bash
  FROM jdk17
  ADD cloud-service.jar /cloud-service.jar
  ENTRYPOINT ["java","-jar","/cloud-service.jar"]
  ```

  最后我们会得到三个镜像：

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116013954.png?raw=true)


##### 4. 启动容器

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

## GitHub Actions 自动发布

> [GitHub Action 官方文档](https://docs.github.com/zh/actions/learn-github-actions/understanding-github-actions)
> 
> [GitHub Action 中使用 Docker 的官方文档](https://docs.docker.com/build/ci/github-actions/)
>
> 所用项目代码获取：公众号发送`cloud`

### 前言

在上一篇[Vue+SpringBoot手动部署](/devops/application-deployment.html)文章中，我们完成了前后端分离项目的部署，但随着开发的进行，我们每次更新都手动打包上传部署，那无疑是十分繁琐且固定，那是否可以让这一步骤自动触发执行呢？答案当然是可以的，市面上有许多的持续集成与部署的组件可以使用，如：Jenkins、GitLab CI等等。

但因为我们是个人前期开发的小项目，可以使用更为简便的 GitHub Action 来实现持续集成，只需要编辑一个配置文件即可。

官网对于GitHub Action的介绍：是一种持续集成和持续交付 (CI/CD) 平台，可用于自动执行生成、测试和部署管道。（[详细的使用说明请自行阅读文档](https://docs.github.com/zh/actions/learn-github-actions/understanding-github-actions)）

### 前端项目

#### 配置
在项目目录下创建`.github/workflows`目录，编辑配置文件 deploy,yml

```yaml
name: 'Deployment To Cloud'

on:
  workflow_dispatch:
  push:
    branches: [main]
  
jobs:
  deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup node
        uses: actions/setup-node@v3
        with:
          node-version: 16.14.x
      - name: install && build
        run: pnpm install && pnpm run build
        
      - name: upload file
        uses: kostyaten/ssh-server-deploy@v4
        with: 
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          password: ${{ secrets.PASSWORD }}
          port: 22
          scp_source: "./dist"
          scp_target: ${{ secrets.TARGET }}
```

#### 验证

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162016.png)

可以看到dist目录也已经上传到了服务器

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162306.png)


### 后端项目

#### 配置

以sevice模块为例子，在项目下创建Dockerfile文件并编辑

```
FROM zeroclian/jdk17
MAINTAINER ZeroClian
ADD service/target/cloud-service.jar /cloud-service.jar
ENTRYPOINT ["java","-jar","/cloud-service.jar"]
```
- `FROM`: 拉取基础环境镜像
- `MAINTAINER`: 添加镜像作者信息
- `ADD`: 将指定文件复制到镜像的指定位置下
- `ENTRYPOINT`: 指定容器启动时运行的命令


在项目根目录下创建`.github/workflows`目录，编辑配置文件 deploy,yml

```yaml
name: Java CI with Maven

on:
  push:
    branches: [ main ]
    paths-ignore:
      - '**.md'
  pull_request:
    branches: [ main ]
    paths-ignore:
      - '**.md'

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'adopt'
          cache: 'maven'
      - name: Build with Maven
        run: mvn clean package -DskipTests=true -Dmaven.javadoc.skip=true -B -V
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_PASSWORD }}
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build and Push Service
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./service/Dockerfile
          push: true
          tags: zeroclian/cloud-service:latest
      - name: Build and Push Gateway
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./gateway/Dockerfile
          push: true
          tags: zeroclian/cloud-gateway:latest

```

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162608.png)

#### 验证

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128164425.png)

可以看到相关的镜像已经推送到了 Docker Hub 上

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128163508.png)

这时只需要在服务器上重新拉取最新的镜像，重新启动容器即可完成项目的更新

 ```shell
  docker pull zeroclian/cloud-gateway
  docker pull zeroclian/cloud-service
  docker run -di --name=cloud-gateway -p 9999:9999 zeroclian/cloud-gateway
  docker run -di --name=cloud-service -p 8001:8001 zeroclian/cloud-service
  ```

### 配置解析

- name: 工作流名称，将显示在Actions的All workflows下
- on: 配置触发工作流的事件动作，如push；也可以指定某个分支，排除某个文件
- jobs: 作业组，配置需要执行的一系列步骤，顺序执行
  - name: 作业的名称，会显示到Github Action上，示例中为`deployment` 和 `build` 
  - runs-on: 指定运行的服务器类型
  - steps: 需要执行的命令步骤
    - name: 步骤名
    - run: 执行脚本或运行shell命令
    - uses: 引用其他的workflows文件
    - with: 根据文件的说明，添加所需的配置参数

隐私参数，如用户名、密码等，使用`${{ secrets.XXX }}`或者`${{ env.XXX }}`，参数可在setting里填写，避免泄漏。

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128175331.png)

其他workflows的引用可以直接在编辑文件的时候搜索使用

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128175941.png)

### 总结

至此通过简单的添加几个配置文件，完成了前后端的持续集成（CI），大大减少了重复操作，使我们可以专注于业务的开发。
