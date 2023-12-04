
## 1.进入容器

- docker attach

- docker exec 

-d ：后台启动容器

-it：进入并执行命令

例如： `docker exec -it 容器ID/容器名称 bash`

两者区别

attach 直接进入容器启动命令的终端，不会启动新的进程

exec 在容器中打开新的终端，并且可以启动新的进程

需要在终端查看启动命令的输出用attach，否则用exec

> 查看启动命令的输出也可以使用 docker logs -f 容器ID

## 2.容器状态

- 启动容器：docker start
- 停止容器：docker stop
- 重启容器：docker restart （本质为依次stop、start）

- 暂停容器：docker pause
- 取消暂停：docker unpause
- 删除容器：docker rm
- 创建容器：docker create

> - 批量删除所有已经退出的容器：
>
>   `docker rm -v $(docker ps -aq -f status=exited)`
>
> - 希望容器能够自动重启可以设置`--restart=always`；也可以设置为`--restart=on-failure:3`，意思是启动进程退出代码非0，则重启容器，最多重启3次
>
> - run 实际是 create 和 start 的组合
> - stop 、kill 的退出，不会自动重启

## 3.资源限制

- 内存限额

`-m/--memory`：设置内存的使用限额，例如100MB、2GB

`--memory-swap`：设置内存+swap的使用限额

> 默认情况下参数为-1，即没有限制，当指定 -m 而不指定 --memory-swap 时， --memory-swap 默认为 -m 的两倍



