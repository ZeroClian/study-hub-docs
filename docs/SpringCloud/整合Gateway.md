1. 添加依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```
2. 注册到Eureka
  
 - 和[整合Maven](/SpringCloud/整合Maven.md)
 中的客户端一致

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