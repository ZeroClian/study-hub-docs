---
title: Spring 数据访问：MyBatis 与 MyBatis-Plus
description: 在 Spring 项目中集成 MyBatis 和 MyBatis-Plus。
---

# Spring 数据访问：MyBatis 与 MyBatis-Plus

将持久层的两套实践放在一起，便于对照基础 MyBatis 与 MyBatis-Plus 的配置和代码。

## MyBatis

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

    ![202208271704986](https://github.com/ZeroClian/picture/blob/master/img/202208271704986.png?raw=true)

## MyBatis-Plus

> 官网：[MyBatis-Plus](https://baomidou.com/)
>
> 注：复杂查询去官方文档查看

### 引入依赖

```xml
<!-- https://mvnrepository.com/artifact/com.baomidou/mybatis-plus-boot-starter -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.2.0</version>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
</dependency>
<!-- 引入阿里数据库连接池 -->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid</artifactId>
    <version>1.1.6</version>
</dependency>

<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
```

### 代码编写

- 编写`application.yml`配置

  ```yaml
  spring:
    application:
      name: service
    # 数据源配置
    datasource:
      driver-class-name: com.mysql.cj.jdbc.Driver
      url: jdbc:mysql://localhost:3306/course?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&rewriteBatchedStatements=true
      username: course
      password: course
      type: com.alibaba.druid.pool.DruidDataSource
  mybatis-plus:
    mapper-locations: classpath:mapper/*.xml
    # 以下配置均有默认值,可以不设置
    global-config:
      db-config:
        #主键类型 AUTO:"数据库ID自增" INPUT:"用户输入ID",ID_WORKER:"全局唯一ID (数字类型唯一ID)", UUID:"全局唯一ID UUID";
        id-type: auto
        #字段策略 IGNORED:"忽略判断"  NOT_NULL:"非 NULL 判断")  NOT_EMPTY:"非空判断"
        field-strategy: NOT_EMPTY
        #数据库类型
        db-type: MYSQL
    configuration:
      # 是否开启自动驼峰命名规则映射:从数据库列名到Java属性驼峰命名的类似映射
      map-underscore-to-camel-case: true
      # 返回map时true:当查询数据为空时字段返回为null,false:不加这个查询数据为空时，字段将被隐藏
      call-setters-on-nulls: true
      # 这个配置会将执行的sql打印出来，在开发或测试的时候可以用
      log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  ```

- 启动类上增加扫描注解

  ```
  //“cn.zeroclian.dao”为dao存放路径
  @MapperScan(basePackages = {"cn.zeroclian.dao"})
  ```

- 编写配置类

  ```java
  /**
   * @author ZeroClian
   * @date 2023-01-05 21:45
   */
  @Configuration
  public class MybatisPlusConfig {
      /**
       * 分页插件
       */
      @Bean
      public PaginationInterceptor paginationInterceptor() {
          return new PaginationInterceptor();
      }
  }
  ```

- 使用代码示例

  1.实体类

  ```java
  /**
   * TableName中的值对应着表名
   * @author ZeroClian
   * @date 2023-01-05 21:46
   */
  @Data
  @TableName("user_info")
  public class UserInfo {
  
      /**
       * 主键
       * // @TableId中可以决定主键的类型,不写会采取默认值,默认值可以在yml中配置
       * AUTO: 数据库ID自增
       * INPUT: 用户输入ID
       * ID_WORKER: 全局唯一ID，Long类型的主键
       * ID_WORKER_STR: 字符串全局唯一ID
       * UUID: 全局唯一ID，UUID类型的主键
       * NONE: 该类型为未设置主键类型
       */
      @TableId(type = IdType.AUTO)
      private Long id;
      /**
       * 姓名
       */
      private String name;
      /**
       * 年龄
       */
      private Integer age;
      /**
       * 技能
       */
      private String skill;
      /**
       * 评价
       */
      private String evaluate;
      /**
       * 分数
       */
      private Long fraction;
  }
  ```

  2.dao、service、serviceImpl、controller

  ```Java
  /**
   * @author ZeroClian
   * @date 2023-01-05 21:48
   */
  public interface UserInfoDao extends BaseMapper<UserInfo> {
  }
  
  public interface UserInfoService extends IService<UserInfo> {
  }
  
  @Service
  public class UserInfoServiceImpl extends ServiceImpl<UserInfoDao, UserInfo> implements UserInfoService {
  }
  
  @RestController
  @RequestMapping("/user_info")
  public class UserInfoController {
      @Autowired
      private UserInfoService userInfoService;
  
      @GetMapping("/{userId}")
      public UserInfo getInfo(@PathVariable String userId) {
          return userInfoService.getById(userId);
      }
  
      @GetMapping("/list")
      public List<UserInfo> getInfoList() {
          return userInfoService.list();
      }
  
  
      @PostMapping("/list")
      public Collection<UserInfo> getInfoListByQuery(@RequestBody PageQuery query) {
          QueryWrapper<UserInfo> queryWrapper = new QueryWrapper<UserInfo>().like("name",query.getName());
          return userInfoService.list(queryWrapper);
      }
  
      @GetMapping("/page")
      public IPage<UserInfo> getUserInfoPage(@RequestBody PageQuery query) {
          IPage<UserInfo> page = new Page<>();
          page.setCurrent(query.page);
          page.setSize(query.size);
          return userInfoService.page(page);
      }
  
      @PostMapping("/page")
      public IPage<UserInfo> getUserInfoPageByQuery(@RequestBody PageQuery query) {
          IPage<UserInfo> page = new Page<>();
          page.setCurrent(query.page);
          page.setSize(query.size);
          QueryWrapper<UserInfo> queryWrapper = new QueryWrapper<>();
          queryWrapper.lambda().like(UserInfo::getName,query.getName());
          return userInfoService.page(page,queryWrapper);
      }
  }
  
  
  public class Page {
      public Integer page;
      public Integer size;
  }
  
  @Getter
  @Setter
  public class PageQuery extends Page{
      private String name;
  }
  ```

  3.数据库SQL

  ```sql
  -- ----------------------------
  -- Table structure for user_info
  -- ----------------------------
  DROP TABLE IF EXISTS `user_info`;
  CREATE TABLE `user_info` (
    `id` bigint(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `name` varchar(32) DEFAULT NULL COMMENT '姓名',
    `age` int(11) DEFAULT NULL COMMENT '年龄',
    `skill` varchar(32) DEFAULT NULL COMMENT '技能',
    `evaluate` varchar(64) DEFAULT NULL COMMENT '评价',
    `fraction` bigint(11) DEFAULT NULL COMMENT '分数',
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COMMENT='学生信息表';
  
  -- ----------------------------
  -- Records of user_info
  -- ----------------------------
  BEGIN;
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (1, '小明', 20, '画画', '该学生在画画方面有一定天赋', 89);
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (2, '小兰', 19, '游戏', '近期该学生由于游戏的原因导致分数降低了', 64);
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (3, '张张', 18, '英语', '近期该学生参加英语比赛获得二等奖', 90);
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (4, '大黄', 20, '体育', '该学生近期由于参加篮球比赛,导致脚伤', 76);
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (5, '大白', 17, '绘画', '该学生参加美术大赛获得三等奖', 77);
  INSERT INTO `user_info` (`id`, `name`, `age`, `skill`, `evaluate`, `fraction`) VALUES (7, '小龙', 18, 'JAVA', '该学生是一个在改BUG的码农', 59);
  COMMIT;
  
  SET FOREIGN_KEY_CHECKS = 1;
  ```

  查询结果
  
  ![](https://github.com/ZeroClian/picture/blob/master/img/获取用户信息分页列表查询.png?raw=true)
