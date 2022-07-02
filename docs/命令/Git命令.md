## 创建仓库
命令|含义
---|---
git init | 初始化仓库
git clone | 拷贝一份远程仓库
git add . | 添加文件到暂存区
git commit | 将暂存区内容添加到仓库中

## 分支

`git pull origin --tags`：拉去远程分支合并到本地

`git push [variable name] [branch]`：将指定分支上的提交发送到远程代码库


## 修改上传方式
1. 查看当前地址

```bash
git remote -v
```
2. 修改

```bash
git remote set-url origin https://xxx.git
```
> 同样可以将https方式设置为ssh方式