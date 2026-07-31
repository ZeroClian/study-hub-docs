---
title: Elasticsearch Docker 部署
description: 使用 Docker 运行 Elasticsearch 7.17。
---

# Elasticsearch Docker 部署

合并两份简短安装记录，保留快速启动和目录挂载两种方式。

## 目录挂载方式

1. 拉取镜像

```
docker pull elasticsearch:7.17.5
```

2. 创建映射文件夹

```
mkdir /usr/docker/elasticsearch/config
mkdir /usr/docker/elasticsearch/data
mkdir /usr/docker/elasticsearch/plugins
```

3. 创建配置文件

```
vim elasticsearch.yml
# 内容
"http.host: 0.0.0.0"
```

4. 创建容器

```
sudo docker run --name elasticsearch7.17 -p 9200:9200  -p 9300:9300 \
 -e "discovery.type=single-node" \
 -e ES_JAVA_OPTS="-Xms256m -Xmx512m" \
 -v /usr/docker/elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml \
 -v /usr/docker/elasticsearch/data:/usr/share/elasticsearch/data \
 -v /usr/docker/elasticsearch/plugins:/usr/share/elasticsearch/plugins \
 -d elasticsearch:7.17.5
```

## 快速启动方式

启动容器
```
docker run --name elasticsearch -d -e ES_JAVA_OPTS="-Xms512m -Xmx512m" -e "discovery.type=single-node" -p 9200:9200 -p 9300:9300 docker.elastic.co/elasticsearch/elasticsearch:7.17.10
```
