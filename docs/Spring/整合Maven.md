## 服务端
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


## 客户端
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

3. 启动类添加注解：`@EnableEurekaClient`

## 效果展示
访问：`http://127.0.0.1:8761/`

![https://github.com/ZeroClian/picture/blob/master/img/20220823165120.png?raw=true](https://github.com/ZeroClian/picture/blob/master/img/20220823165120.png?raw=true)