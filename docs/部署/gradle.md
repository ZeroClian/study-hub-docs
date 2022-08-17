## Mac安装

1. 下载压缩包：[gradle6.2.2版本下载](https://gradle.org/next-steps/?version=6.2.2&format=bin)
2. 安装

```bash
sudo mkdir /opt/gradle
sudo unzip -d /opt/gradle gradle-6.2.2-bin.zip
```

3. 配置环境变量

```bash
//打开配置文件
vim ~/.bash_profile
//最后一行添加
export PATH=$PATH:/opt/gradle/gradle-6.2.2/bin
//刷新配置
source ~/.bash_profile
```

4. 检查：``gradle -v``

## Gradle项目结构

```
--build
----gradle
------wrapper
	  --gradle.wrapper.jar
	  --gradle.wrapper.properties
--src
  --main
    --java
    --resources
    --webapp
      --WEB-INF
        --web.xml
      --index.html
  --test
    --java
    --resources
--gradlew
--gradlew.bat 包装器启动脚本
--build.gradle	构建脚本，类似pom.xml
--settings.gradle  设置文件，定义项目及子项目名称信息，和项目一一对应关系
```

## Gradle 常用命令

| 指令                 | 作用                       |
| -------------------- | -------------------------- |
| gradle clean         | 清空 build 目录            |
| gradle classes       | 编译业务代码和配置文件     |
| gradle test          | 编译测试代码，生成测试代码 |
| gradle build         | 构建项目                   |
| gradle build -x test | 跳过测试构建进行构建       |

> gradle 指令要在含有 build.gradle 的目录执行
