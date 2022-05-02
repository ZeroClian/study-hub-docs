# shell脚本

```shell
#!/bin/bash
case "$1" in
  "reload")
    # 刷新配置
    sudo docker exec -it <容器名称> bash -c "nginx -s reload"
    ;;
  "test")
    # 检查配置是否正确
    sudo docker exec -it <容器名称> bash -c "nginx -t"
    ;;
  *)
    echo "Usage: sh shell.sh [test|reload]"
exit 1
    ;;
esac
```

```bash
docker run  -p 80:80 --name nginx -v /opt/docker/nginx/nginx.conf:/etc/nginx/nginx.conf -v /opt/docker/nginx/conf.d:/etc/nginx/conf.d -v /opt/docker/nginx/html:/usr/share/nginx/html -v /opt/docker/nginx/logs:/var/log/nginx -d  nginx
```

