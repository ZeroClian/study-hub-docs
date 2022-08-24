> 持久层：负责数据持久化,即将数据存储到数据库或硬盘等，断电也不会丢失数据。
> ORM:对象关系映射。
> Hibernate是全自动ORM Mybatis是半自动ORM,Mybatis可以操作的花样更多，是首选的持久层框架。

1. 引入依赖

需要先在父 pom 的 dependencyManagement 中引入带版本的依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

2. 修改配置文件 application.yml

```yml
spring:
  datasource:
    driver-class-name: com.mysql.jdbc.Driver
    url: jdbc:mysql://localhost:3306//course?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&rewriteBatchedStatements=true
    username: course
    password: course
```