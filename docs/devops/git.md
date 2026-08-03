---
title: Git 常用命令与连接排错
description: Git 仓库、分支、SSH 与网络连接常见操作。
---

# Git 常用命令与连接排错

整理 Git 日常命令以及连接 GitHub 时的常见问题。

## 创建仓库
命令|含义
---|---
`git init` | 初始化仓库
`git clone <url>` | 克隆远程仓库
`git add -p` | 逐块确认并添加文件到暂存区，避免把密钥等无关文件一起提交
`git commit -m "message"` | 将暂存区内容提交到仓库

## 分支

`git fetch --all --prune`：获取所有远程更新并清理已删除的远程分支

`git pull --rebase origin main`：获取并以 rebase 方式整合远程 main 分支

`git push <remote> <branch>`：将指定分支上的提交发送到远程代码库


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

## Mac 配置SSH 后 仍需要输入密码解决办法

原因可能是 SSH 私钥未加入 macOS 钥匙串。新建密钥时优先使用 Ed25519：

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

并在 `~/.ssh/config` 中为 GitHub 配置 `UseKeychain yes` 和 `AddKeysToAgent yes`。
## 测试连接

```bash
ssh -T git@github.com
```

## 解决Failed to connect to github.com port 443: Timed out

这个错误表示到 GitHub 的 HTTPS 连接超时，原因可能是网络、代理或防火墙。先确认浏览器和 `curl` 能否访问，再按需清理 Git 的代理配置；不要在不了解来源时复制第三方代理命令。


```bash
git config --global --unset http.proxy
 
git config --global --unset https.proxy
```
