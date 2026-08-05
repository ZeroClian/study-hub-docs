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

## 将指定 commit 移植到另一个分支

`git cherry-pick` 会把指定 commit 的改动应用到当前分支，并创建一个新的 commit。适合将 `master` 上的单个修复或功能提交移植到 `test` 分支。

例如，将 `co3-ui` 的某个 commit 从 `master` 移植到 `test`：

```bash
cd /path/to/co3-ui

# 确认工作区干净，并查看 master 上的提交
git status
git log master --oneline

# 切换并更新 test 分支
git switch test
git pull --ff-only origin test

# 将指定 commit 应用到 test
git cherry-pick <commit-hash>

# 确认无误后推送
git push origin test
```

如果目标 commit 还没有同步到本地，先获取远程分支：

```bash
git fetch origin master test
```

### 处理冲突

发生冲突时，手动修改冲突文件，保留正确内容，然后继续 cherry-pick：

```bash
git status
git add <已解决的文件>
git cherry-pick --continue
git push origin test
```

如果决定放弃本次操作，恢复到 cherry-pick 之前的状态：

```bash
git cherry-pick --abort
```

> 注意：目标 commit 可能依赖 `master` 上的其他提交。应用前先查看 `git show <commit-hash>`；如果依赖较多，优先评估是否应该合并分支，而不是单独 cherry-pick。


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

## GitHub HTTPS 连接超时与代理排查

如果出现 `Failed to connect to github.com port 443`、`Recv failure` 或 `Operation timed out`，先区分是 Git 配置、环境代理、本机网络，还是受限执行环境导致。不要在未确认配置来源前直接清理代理。

### 查询代理信息

先查看远程地址，以及 Git 在各配置层级读取到的代理配置：

```bash
# 查看远程地址
git remote -v

# 查看仓库、用户和系统 Git 配置中的代理，并显示来源
git config --show-origin --show-scope --get-regexp '(^|[.])proxy$'

# 分层查询：没有匹配项时命令会返回非 0，可忽略
git config --local --get-regexp '(^|[.])proxy$'
git config --global --get-regexp '(^|[.])proxy$'
git config --system --get-regexp '(^|[.])proxy$'
```

再检查 Git 配置之外的代理来源：

```bash
# HTTP_PROXY、HTTPS_PROXY、ALL_PROXY、NO_PROXY 等环境变量
env | grep -iE '^(http|https|all|no)_proxy='

# macOS 系统代理
scutil --proxy

# 检查示例本地代理端口是否在监听，按实际端口替换 10809
lsof -nP -iTCP:10809 -sTCP:LISTEN
```

不要把包含代理认证信息的完整输出直接贴到聊天或日志中。还可以检查 Git URL 重写规则，排除远程地址被意外替换：

```bash
git config --show-origin --show-scope --get-regexp '^url\..*\.insteadOf$'
```

### 验证连接

使用只读命令复现 Git 的远端访问，不会合并或修改工作区：

```bash
git ls-remote --heads origin
git fetch --dry-run --tags origin test
```

如果 Git 和环境变量都没有代理，但普通终端可以访问 GitHub、受限执行环境却失败，问题通常来自执行环境的网络隔离，不应擅自给项目写入代理配置。

### 仅为当前仓库配置 GitHub 代理

确认本机代理可用后，可以只对当前仓库、且只对 GitHub 配置代理。下面以 HTTP 代理 `127.0.0.1:10809` 为例，端口和协议需替换为实际值：

```bash
git config --local http.https://github.com.proxy http://127.0.0.1:10809
git config --local --get http.https://github.com.proxy

# 配置后再次验证，不执行合并
git fetch --dry-run --tags origin test
```

验证成功后即可重试：

```bash
git pull --tags origin test
```

如果不再需要该配置，删除当前仓库的 GitHub 专用代理：

```bash
git config --local --unset http.https://github.com.proxy
```

只有确认全局代理配置错误且不再被其他项目使用时，才清理全局配置：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```
