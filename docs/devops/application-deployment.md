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
  - Node.js：建议使用仍受支持的 LTS 版本（例如 20 或 22）
  - pnpm：使用项目 `packageManager` 字段指定的版本
- 后端
  - JDK：17
  - Maven：使用项目 Wrapper 或与项目兼容的 Maven 版本
  - MySQL：8.x
  - Nacos：按 Spring Cloud Alibaba 版本矩阵选择
- 服务器：2核4G 起步，实际规格按并发和构建任务压测
  - nginx、Docker：使用发行版仓库或官方渠道当前受支持的版本


### 前端部署

##### 1. 新建目录

用于存放项目构建后的静态资源

```
sudo mkdir -p /www/html
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

- 在项目目录下执行 `./mvnw clean package`（没有 Maven Wrapper 时再使用与项目兼容的 `mvn`）

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116011617.png?raw=true)
  
- target目录下的jar包上传至服务器

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128141341.png)
![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128141520.png)

  使用 rz 命令上传到服务器上(最好分别建立文件夹存放单独的jar包，便于后面打包生成镜像)

##### 2. 制作基础镜像

运行 JAR 包需要 Java 运行时。项目使用 JDK 17 时，可以直接使用带 JRE 的基础镜像，避免自行下载并维护 JDK 压缩包。

[安装docker](/devops/docker.html)

- 拉取基础运行时镜像：`docker pull eclipse-temurin:17-jre`

- 新建 Dockerfile 文件：`vim Dockerfile`

  ```dockerfile
  FROM eclipse-temurin:17-jre
  WORKDIR /app
  ENV TZ=Asia/Shanghai
  ```

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116013123.png?raw=true)

- 在 Dockerfile 文件所在目录执行：`docker build -t jdk17 .`（或直接在服务镜像中使用 `eclipse-temurin:17-jre`）

  将会生成了一个名为 jdk17 的镜像，使用 `docker images` 查看
  
##### 3. 制作服务镜像

- 同样的方式，在上传的cloud-service.jar所在目录下新建 Dockerfile 文件，执行：`docker build -t cloud-service .`

  ```dockerfile
  FROM eclipse-temurin:17-jre
  WORKDIR /app
  COPY cloud-service.jar /app/cloud-service.jar
  ENV TZ=Asia/Shanghai
  ENTRYPOINT ["java", "-jar", "/app/cloud-service.jar"]
  ```

  最后我们会得到三个镜像：

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116013954.png?raw=true)


##### 4. 启动容器

- 启动容器，开放端口号

  ```bash
  docker run -d --restart unless-stopped --name cloud-gateway -p 9999:9999 cloud-gateway
  docker run -d --restart unless-stopped --name cloud-service -p 8001:8001 cloud-service
  ```

  ![](https://github.com/ZeroClian/picture/blob/master/img/20230116014203.png?raw=true)

- 验证是否成功

  ![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128140452.png)

> ❗️注意事项❗️
> - 无法访问时，请检查服务器的安全组是否放开相关端口
> - cloud-nacos 不再需要单独打包；是否使用容器运行 Nacos 取决于部署方案和版本矩阵。
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

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.0.9
      - name: Setup node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: install && build
        run: pnpm install --frozen-lockfile && pnpm run build
        
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

> `kostyaten/ssh-server-deploy` 是第三方 Action。生产环境应固定到经过审核的提交或替换为官方维护的部署方案；优先使用 SSH 私钥而不是密码，并确认目标目录权限和 `dist` 上传路径。

#### 验证

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162016.png)

可以看到dist目录也已经上传到了服务器

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162306.png)


### 后端项目

#### 配置

以 service 模块为例，在项目下创建 Dockerfile 文件并编辑。基础镜像建议固定到受支持的 JRE 版本，不要使用可变的 `latest`。

```dockerfile
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY service/target/cloud-service.jar /app/cloud-service.jar
LABEL org.opencontainers.image.source="https://github.com/ZeroClian/study-hub-docs"
ENTRYPOINT ["java", "-jar", "/app/cloud-service.jar"]
```
- `FROM`: 拉取基础环境镜像
- `LABEL`: 添加镜像元数据（`MAINTAINER` 已废弃）
- `COPY`: 将指定文件复制到镜像的指定位置下；无须自动解压时不要用 `ADD`
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
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'maven'
      - name: Build with Maven
        run: ./mvnw -B -V clean verify -Dmaven.javadoc.skip=true
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_PASSWORD }}
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build and Push Service
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./service/Dockerfile
          push: true
          tags: zeroclian/cloud-service:${{ github.sha }}
      - name: Build and Push Gateway
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./gateway/Dockerfile
          push: true
          tags: zeroclian/cloud-gateway:${{ github.sha }}

```

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128162608.png)

#### 验证

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128164425.png)

可以看到相关的镜像已经推送到了 Docker Hub 上

![](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/20240128163508.png)

这时只需要在服务器上重新拉取对应提交的镜像，重新启动容器即可完成项目的更新

> 上例使用提交 SHA 作为镜像标签，部署脚本必须接收到与本次构建相同的 `IMAGE_TAG`；不要为了省事改回可变的 `latest`。

 ```shell
  IMAGE_TAG=replace-with-commit-sha
  docker pull zeroclian/cloud-gateway:${IMAGE_TAG}
  docker pull zeroclian/cloud-service:${IMAGE_TAG}
  docker rm -f cloud-gateway cloud-service 2>/dev/null || true
  docker run -d --restart unless-stopped --name cloud-gateway -p 9999:9999 zeroclian/cloud-gateway:${IMAGE_TAG}
  docker run -d --restart unless-stopped --name cloud-service -p 8001:8001 zeroclian/cloud-service:${IMAGE_TAG}
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
