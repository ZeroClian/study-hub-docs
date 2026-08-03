---
title: Elasticsearch Docker 部署
description: 使用 Docker 运行 Elasticsearch 7.17 的单节点测试实例。
---

# Elasticsearch Docker 部署

合并两份简短安装记录，保留快速启动和目录挂载两种方式。示例使用 7.17.10；这是旧版本示例，生产环境应按 Elasticsearch 官方兼容矩阵选择版本，并启用认证与 TLS。

## 目录挂载方式

1. 拉取镜像

```bash
docker pull docker.elastic.co/elasticsearch/elasticsearch:7.17.10
```

2. 创建映射文件夹

```bash
sudo mkdir -p /usr/docker/elasticsearch/{config,data,plugins}
sudo chown -R 1000:0 /usr/docker/elasticsearch
```

3. 创建配置文件

```yaml
# /usr/docker/elasticsearch/config/elasticsearch.yml
# 内容
http.host: 0.0.0.0
```

4. 创建容器

```bash
sudo docker run --name elasticsearch7.17 --restart unless-stopped \
 -p 9200:9200 -p 9300:9300 \
 -e "discovery.type=single-node" \
 -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
 -v /usr/docker/elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml \
 -v /usr/docker/elasticsearch/data:/usr/share/elasticsearch/data \
 -v /usr/docker/elasticsearch/plugins:/usr/share/elasticsearch/plugins \
 -d docker.elastic.co/elasticsearch/elasticsearch:7.17.10
```

> Elasticsearch 需要宿主机的 `vm.max_map_count` 满足官方要求；目录挂载的权限也必须允许容器内 `elasticsearch` 用户写入。不要把未启用认证的 9200 端口直接暴露到公网。

Linux 测试机可按官方要求临时调整内核参数（生产环境应通过系统配置持久化并评估影响）：

```bash
sudo sysctl -w vm.max_map_count=262144
```

## 快速启动方式

启动容器
```bash
docker run --name elasticsearch --restart unless-stopped -d \
  -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
  -e "discovery.type=single-node" \
  -p 9200:9200 -p 9300:9300 \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.10
```
