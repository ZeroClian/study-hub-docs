---
title: 构建工具：Maven 与 Gradle
description: Maven 环境配置和 Gradle 安装、项目结构与常用命令。
---

# 构建工具：Maven 与 Gradle

将 Java 工程常见构建工具放在一起，便于按项目类型查阅。

## Maven

1. 从 [Maven 官网](https://maven.apache.org/download.cgi) 下载与项目兼容的受支持版本；已有 Maven Wrapper 时优先使用 Wrapper
2. 解压到相应目录
3. 配置环境变量

```
vim ~/.zshrc
# maven 配置
export MAVEN_HOME=/opt/maven/apache-maven-3.9.x
export PATH=$PATH:$MAVEN_HOME/bin
# 环境生效
source ~/.zshrc
```
4. 修改下载源配置

   1. 修改本地仓库位置

   ```xml
   <localRepository>${user.home}/.m2/repository</localRepository>
   ```

   2. 修改仓库地址
   
   ```xml
   <mirror>
       <id>alimaven</id>
       <mirrorOf>central</mirrorOf>
       <name>aliyun maven</name>
       <url>https://maven.aliyun.com/repository/public</url>
   </mirror>
   ```

## Gradle

### Mac安装

1. 新项目优先使用项目自带的 Gradle Wrapper（`./gradlew`），不必全局安装固定版本。需要全局安装时，请从[Gradle 官方下载页](https://gradle.org/releases/)选择受支持版本。
2. 安装（以下版本号仅为示例，应与下载文件名保持一致）

```bash
sudo mkdir /opt/gradle
sudo unzip -d /opt/gradle gradle-8.14-bin.zip
```

3. 配置环境变量

```bash
# macOS 默认使用 zsh；Linux 可改为 ~/.bashrc
vim ~/.zshrc
# 最后一行添加（版本号按实际安装目录调整）
export PATH="/opt/gradle/gradle-8.14/bin:$PATH"
# 刷新配置
source ~/.zshrc
```

4. 检查：`gradle -v`
5. 修改 maven 下载源

在 init.d 目录下新建 init.gradle 文件，添加以下内容

```
allprojects{
	repositories{
		mavenLocal()
		maven {name "Alibaba" ; url "https://maven.aliyun.com/repository/public"}
		mavenCentral()
	}
	buildscript{
		repositories{
		maven {name "Alibaba" ; url 'https://maven.aliyun.com/repository/public'}
		maven {name "M2" ; url 'https://plugins.gradle.org/m2/'}
		}
	}
}
```

### Gradle项目结构

```
project/
├── build/                      # 构建产物
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── src/
│   ├── main/
│   │   ├── java/
│   │   └── resources/
│   └── test/
│       ├── java/
│       └── resources/
├── gradlew                     # Wrapper 启动脚本
├── gradlew.bat
├── build.gradle                # 构建脚本，类似 pom.xml
└── settings.gradle             # 项目及子项目设置
```

### Gradle 常用命令

| 指令                 | 作用                       |
| -------------------- | -------------------------- |
| gradle clean         | 清空 build 目录            |
| `./gradlew classes`       | 编译业务代码和资源     |
| `./gradlew test`          | 编译并执行测试         |
| `./gradlew build`         | 构建项目并执行检查     |
| `./gradlew build -x test` | 跳过测试构建（仅在明确需要时使用） |

> gradle 指令要在含有 build.gradle 的目录执行
