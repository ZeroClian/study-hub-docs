> 持久层：负责数据持久化,即将数据存储到数据库或硬盘等，断电也不会丢失数据。
> ORM:对象关系映射。
> Hibernate是全自动ORM Mybatis是半自动ORM,Mybatis可以操作的花样更多，是首选的持久层框架。



1. 引入依赖

需要先在父 pom 的 dependencyManagement 中引入带版本的依赖

```xml
<!--集成 mybatis -->
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.2.0</version>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>5.1.49</version>
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

mybatis:
  mapper-locations: classpath:/mapper/*.xml
```

3. 扫描 Mapper 的两种方式
   1. 在 *Mapper.class 增加注解`@Mapper`
   2. 在启动类上扫描 Mapper 所在的全限定路径名`@MapperScan("com.course.mapper")`

4. 测试调用
   1. 创建实体类

    ```java
        package com.course.domain;
    
        /**
        * @author ZeroClian
        * @date 2022-08-27 4:06 下午
        */
        public class Test {
            private String id;
            private String name;
    
            public String getId() {
                return id;
            }
    
            public void setId(String id) {
                this.id = id;
            }
    
            public String getName() {
                return name;
            }
    
            public void setName(String name) {
                this.name = name;
            }
        }
    ```
   2. ​	创建Mapper/dto类

    ```java
        /**
        * @author ZeroClian
        * @date 2022-08-27 4:09 下午
        */
        public interface TestMapper {
            public List<Test> list();
        }
    ```
   3. 创建*.xml

    TestMapper.xml

    ```xml
    <?xml version="1.0" encoding="UTF-8" ?>
    <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
    <mapper namespace="com.course.mapper.TestMapper">
        <select id="list" resultType="com.course.domain.Test">
            select id,name from test
        </select>
    </mapper>
    ```
   4. 创建controller和service类（代码省略）
   5. 调用结果

    ![202208271704986](http://cdn.liancode.top/img/202208271704986.png)