---
title: Spring 项目搭建与工程配置
description: Spring 多模块项目、Eureka 服务与客户端、公共配置和常见问题。
---

# Spring 项目搭建与工程配置

围绕项目初始化与工程配置，将原先零散的搭建步骤集中到一篇文档。

## 项目初始化

### 将 Maven 项目修改为父子项目
1. 新建一个maven空模块
2. 删除父模块的src目录

maven父子模块结构：父模块只需要 pom.xml,子模块是正常的 maven 项目.

Maven父子模块增加jar包依赖：先在父pom.xml中增加jar包依赖，再在子pom.xml中增加jar包依赖，子pom.xml中不带版本号。

> spring boot 流行的原因就是它大大的简化了 java 开发配置，只需要一个类，有一个main函数，就可以启动Java项目，极大的提高了开发效率。


### 优化日志

1. 修改启动类

日志类：org.slf4j.Logger
```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaApplication {

    private static final Logger LOG =  LoggerFactory.getLogger(EurekaApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(EurekaApplication.class);
        Environment env = app.run(args).getEnvironment();
        LOG.info("启动成功!!!");
        LOG.info("Eureka地址:\thttp://127.0.0.1:{}",env.getProperty("server.port"));
    }

}
```
2. 添加配置文件：`logback.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- 修改一下路径-->
    <property name="PATH" value="/log/course/eureka"></property>

    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
<!--            <Pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %highlight(%-5level) %blue(%-50logger{50}:%-4line) %msg%n</Pattern>-->
            <pattern>%d{ss.SSS} %highlight(%-5level) %blue(%-30logger{30}:%-4line) %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="TRACE_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${PATH}/trace.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${PATH}/trace.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level %-50logger{50}:%-4line %green(%-8X{UUID}) %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="ERROR_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${PATH}/error.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${PATH}/error.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level %-50logger{50}:%-4line %green(%-8X{UUID}) %msg%n</pattern>
        </encoder>
        <filter class="ch.qos.logback.classic.filter.LevelFilter">
            <level>ERROR</level>
            <onMatch>ACCEPT</onMatch>
            <onMismatch>DENY</onMismatch>
        </filter>
    </appender>

    <root level="INFO">
        <appender-ref ref="STDOUT" />
        <appender-ref ref="TRACE_FILE" />
        <appender-ref ref="ERROR_FILE" />
    </root>
</configuration>
```

3. 修改Mapper日志打印级别

   1. 添加配置

      ```yml
      logging:
        level:
          com.course.mapper: trace
      ```

   2. 日志

      ![202208271748030](https://github.com/ZeroClian/picture/blob/master/img/202208271748030.png?raw=true)

### 相同配置抽离到公共模块

在公共模块下的 resource 下新建 config 以区分引用方自身的 application.yml 配置文件

![](https://github.com/ZeroClian/picture/blob/master/img/公共配置.png?raw=true)

## Eureka 服务与客户端

### 服务端
1. 引入依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```
2. 编写配置文件

```yml
spring:
  application:
    name: eureka

server:
  port: 8761

eureka:
  client:
    fetch-registry: false # 获取注册中心
    register-with-eureka: false # 注册到注册中心
```
3. 启动类添加注解：`@EnableEurekaServer`


### 客户端
1. 引入依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```
2. 编写配置文件

```yml
spring:
  application:
    name: system

server:
  port: 9001

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

3. 现代 Spring Cloud Netflix Eureka 客户端通常通过 starter 自动注册，不再需要 `@EnableEurekaClient`；旧版本项目可以按对应版本文档添加该注解。

### 效果展示
访问：`http://127.0.0.1:8761/`

![https://github.com/ZeroClian/picture/blob/master/img/20220823165120.png?raw=true](https://github.com/ZeroClian/picture/blob/master/img/20220823165120.png?raw=true)

## 常用文档

### Maven

依赖检索：[https://mvnrepository.com](https://mvnrepository.com)

## 常见问题

### Param ‘serviceName‘ is illegal, serviceName is blank

- 整合 nacos，启动时报：Param ‘serviceName‘ is illegal, serviceName is blank
  配置：
```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-dependencies</artifactId>
  <version>2021.0.1</version>
  <type>pom</type>
  <scope>import</scope>
</dependency>
```
  原因：较新的 Spring Cloud 默认不会自动加载 `bootstrap.yml`。如果项目仍采用 bootstrap 配置方式，需要添加 `spring-cloud-starter-bootstrap`；新项目也可以按版本文档改用 `spring.config.import`。
