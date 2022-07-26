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

