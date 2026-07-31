---
title: IDEA 开发效率
description: IDEA 热部署与代码生成器配置。
---

# IDEA 开发效率

汇总项目开发阶段常用的 IDEA 效率配置。

## 热部署

> 热部署比正常启动更快
1. 引入依赖

   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-devtools</artifactId>
   </dependency>
   ```

2. 设置idea

   ![202208271727944](https://github.com/ZeroClian/picture/blob/master/img/202208271727944.png?raw=true)

3. 运行时自动编译

   1. 双击 shift 进入 Registry

   ![202208271731380](https://github.com/ZeroClian/picture/blob/master/img/202208271731380.png?raw=true)

   2. 勾选

      ![202208271736567](https://github.com/ZeroClian/picture/blob/master/img/202208271736567.png?raw=true)

## 代码生成器

1. 父 pom 文件引入插件

   ```xml
   <!-- mybatis generator 自动生成代码插件 -->
   <plugin>
       <groupId>org.mybatis.generator</groupId>
       <artifactId>mybatis-generator-maven-plugin</artifactId>
       <version>1.3.7</version>
       <configuration>
           <configurationFile>src/main/resources/generator/generatorConfig.xml</configurationFile>
           <overwrite>true</overwrite>
           <verbose>true</verbose>
       </configuration>
       <dependencies>
           <dependency>
               <groupId>mysql</groupId>
               <artifactId>mysql-connector-java</artifactId>
               <version>5.1.49</version>
           </dependency>
       </dependencies>
   </plugin>
   ```

2. 在公共模块的 resource 下新建目录 generator ，增加`generatorConfig.xml`

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE generatorConfiguration
           PUBLIC "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
           "http://mybatis.org/dtd/mybatis-generator-config_1_0.dtd">
   
   <generatorConfiguration>
       <context id="Mysql" targetRuntime="MyBatis3" defaultModelType="flat">
   
           <property name="autoDelimitKeywords" value="true"/>
           <property name="beginningDelimiter" value="`"/>
           <property name="endingDelimiter" value="`"/>
   
           <!--覆盖生成XML文件-->
           <plugin type="org.mybatis.generator.plugins.UnmergeableXmlMappersPlugin" />
           <!-- 生成的实体类添加toString()方法 -->
           <plugin type="org.mybatis.generator.plugins.ToStringPlugin" />
   
           <!-- 不生成注释 -->
           <commentGenerator>
               <property name="suppressAllComments" value="true"/>
           </commentGenerator>
   
           <jdbcConnection driverClass="com.mysql.jdbc.Driver"
                           connectionURL="jdbc:mysql://47.106.120.147:3306/course"
                           userId="course"
                           password="course">
           </jdbcConnection>
   
           <!-- domain类的位置 -->
           <javaModelGenerator targetProject="src\main\java"
                               targetPackage="com.course.domain"/>
   
           <!-- mapper xml的位置 -->
           <sqlMapGenerator targetProject="src\main\resources"
                            targetPackage="mapper"/>
   
           <!-- mapper类的位置 -->
           <javaClientGenerator targetProject="src\main\java"
                                targetPackage="com.course.mapper"
                                type="XMLMAPPER" />
   
   <!--        <table tableName="test" domainObjectName="Test"/>-->
   
       </context>
   </generatorConfiguration>
   ```

   3. 新增 maven 命令

      ![](https://github.com/ZeroClian/picture/blob/master/img/generator的maven.png?raw=true)
