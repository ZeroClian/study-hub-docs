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

![nacos配置文件](http://cdn.liancode.top/img/20221103171919.png)

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

![结果](http://cdn.liancode.top/img/20221103172216.png)

