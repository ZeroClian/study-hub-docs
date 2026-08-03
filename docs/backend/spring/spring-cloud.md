---
title: Spring Cloud：Nacos 与 Gateway
description: Spring Cloud 中的 Nacos 配置中心与 Gateway 网关集成。
---

# Spring Cloud：Nacos 与 Gateway

按微服务基础设施归并注册配置中心和网关的接入步骤。

> 示例使用 Spring Boot 2.6.x、Spring Cloud 2021.x 和 Spring Cloud Alibaba 2021.x 的组合。升级到 Boot 3 时必须同步选择兼容的 Spring Cloud/Alibaba 版本，并将 `javax` API 迁移到 `jakarta`。

## Nacos

### 父pom引入依赖

```xml
    <properties>
        <cloud-version>2021.0.1</cloud-version>
        <spring-boot-version>2.6.3</spring-boot-version>
        <nacos-version>2021.0.1.0</nacos-version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot-version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${cloud-version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-nacos-config -->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
                <version>${nacos-version}</version>
            </dependency>
            <!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-nacos-discovery -->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
                <version>${nacos-version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
```

### nacos模块引入依赖

```xml
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-nacos-config -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
        </dependency>
        <!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-nacos-discovery -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-bootstrap</artifactId>
        </dependency>
    </dependencies>
```

### 配置文件

`bootstrap.yml`

```yml
server:
  port: 8000

spring:
  application:
    name: nacos
  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848
        file-extension: yaml
      discovery:
        server-addr: 127.0.0.1:8848
```

### nacos上配置文件

![nacos配置文件](https://github.com/ZeroClian/picture/blob/master/img/20221103171919.png?raw=true)

内容为：
```yml
author: Justin
```

### 测试

```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Justin
 */
@RestController
@RequestMapping("/config")
@RefreshScope
public class ConfigController {

    @Value("${author}")
    public String author;

    @GetMapping("/author")
    public String getAuthor() {
        return author;
    }
}
```

结果：

![结果](https://github.com/ZeroClian/picture/blob/master/img/20221103172216.png?raw=true)

## Gateway

1. 添加依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```
2. 如果 Gateway 也注册到 Eureka，请按[项目搭建与工程配置](./project-setup.html)中的 Eureka 客户端配置接入；较新的 Spring Cloud Netflix 客户端通常由 starter 自动注册。

使用 `lb://` 路由时还应确认项目引入了 Spring Cloud LoadBalancer（Eureka/Nacos starter 是否传递引入取决于版本，必要时显式添加）：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

3. 路由转发

```yml
spring:
  application:
    name: gateway
  cloud:
    gateway:
      routes:
        - id: system
          uri: lb://system
          order: 1
          predicates:
            - Path=/system/**
          filters:
            - StripPrefix=1
```

`lb://system` 依赖服务发现和 Spring Cloud LoadBalancer；如果只转发到固定地址，应改为 `http://host:port`，不要把 `lb://` 当作普通 URL 使用。
