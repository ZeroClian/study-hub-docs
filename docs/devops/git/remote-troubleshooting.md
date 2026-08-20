---
title: Git 远程、认证与网络异常
description: 排查远程地址、SSH、HTTPS、代理、认证、连接超时和受限执行环境导致的 Git 访问异常。
---

# Git 远程、认证与网络异常

## 适用场景

本页用于克隆、`fetch`、`push` 或 IDE 访问远程仓库时出现认证失败、连接超时、连接重置、代理异常或权限错误。日常提交和同步流程见[Git 日常工作流](daily-workflow.md)；非快进后的历史整合见[分支整合](branch-integration.md)；整合中出现文本冲突时见[冲突解决](conflict-resolution.md)。

不要在未定位原因时同时改远程地址、全局代理和凭据。Git 配置、本机网络、远端服务状态与受限执行环境是不同的问题域，先分别确认再处理。

## 诊断顺序

按下列顺序从只读检查开始：

1. 确认远程 URL 和协议：运行 `git remote -v`，确认实际使用 SSH 还是 HTTPS，以及读写地址是否符合预期。
2. 读取 Git 配置及其来源：运行 `git config --show-origin --show-scope --get-regexp '(^|[.])proxy$'`，再分别运行 `git config --local --show-origin --show-scope --get-regexp '(^|[.])proxy$'`、`git config --global --show-origin --show-scope --get-regexp '(^|[.])proxy$'` 和 `git config --system --show-origin --show-scope --get-regexp '(^|[.])proxy$'`。某一层没有匹配项时命令会以非零状态结束，这是“未配置”的正常结果。
3. 检查环境变量与系统代理：运行 `env | rg -i '^(http_proxy|https_proxy|all_proxy|no_proxy)='`；代理 URL 可能含认证信息，不能把输出复制到工单、聊天记录或日志。macOS 还可运行 `scutil --proxy` 查看系统代理设置。
4. 检查本地代理端口：若配置指向本地代理，运行 `lsof -nP -iTCP:10809 -sTCP:LISTEN` 确认进程在监听。`10809` 仅是示例，按实际代理协议和端口替换。
5. 用只读远程操作复现：运行 `git ls-remote --heads origin`，以及 `git fetch --dry-run --tags origin <branch>`。前者读取远端引用，后者演练抓取但不更新本地引用；两者都需要网络和远程访问权限。
6. 仅在原因确定后修改仓库级配置。需要判断 Git 是否被 URL 重写时，运行 `git config --show-origin --show-scope --get-regexp '(^|[.])insteadOf$'`，检查 `insteadOf` 是否把预期地址改写到其他协议或主机。

如果同一远程在不同机器都不可用，可在可访问时查看远端服务的官方状态信息；这只能帮助判断服务侧是否异常，不能代替本机配置和权限检查。

## 正常操作

### 查看和修改远程地址

**操作前检查：** 运行 `git remote -v` 和 `git remote get-url origin`，在受控的本地记录中保存旧值及其用途。若 URL 中意外出现认证信息，不要复制或分享该完整值，应先按团队秘密管理流程处理。

**执行：** 确认目标仓库和协议后，使用 `git remote set-url origin <url>` 修改地址；`<url>` 使用不含密码或 Token 的 SSH/HTTPS 标准地址。

**结果验证：** 再次运行 `git remote -v`，然后运行 `git ls-remote --heads origin` 验证读访问。需要恢复时，用已记录的旧值执行 `git remote set-url origin <old-url>`，再重复上述验证。

### 配置并验证 SSH

**操作前检查：** 先运行 `ls -l ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub` 和 `ssh-add -l`，确认已有密钥和 agent 状态。不要为了排障生成新密钥或覆盖已有密钥，也不要输出、上传或粘贴私钥内容。

**执行：** 在 macOS 上，确认目标私钥后可运行 `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`，将已有密钥加入 agent 和钥匙串。`~/.ssh/config` 的 GitHub 示例应使用占位路径，不包含真实账号、主机或密钥内容：

```sshconfig
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
```

`UseKeychain` 是 macOS OpenSSH 的选项；Linux 不应照搬该行，应按发行版的 ssh-agent 或密钥管理方式配置。若网络要求使用别名或 SSH over 443，可另设 `Host github-ssh-443`、`HostName ssh.github.com`、`Port 443`、`User git` 和明确的 `IdentityFile`，并让远程 URL 的主机名与该别名一致。

**结果验证：** 运行 `ssh -T git@github.com`，或对别名运行 `ssh -T git@github-ssh-443`。GitHub 成功认证时也可能以非零退出并提示不提供 shell access；重点检查响应是否表明认证成功，而不是只看退出码。随后运行 `git ls-remote --heads origin` 验证 Git 协议访问。

### 使用 HTTPS 远程

**操作前检查：** 运行 `git remote -v` 确认是 HTTPS 地址，并运行 `git config --show-origin --show-scope --get-all credential.helper` 了解凭据由哪个 helper 管理。不要把密码、Token 或用户名密码组合写入 URL。

**执行：** 使用组织认可的系统 credential helper 或安全凭据管理工具完成认证；Token 仅在其安全提示界面中输入，不在命令历史、文档或仓库配置中硬编码。需要修改地址时仍使用 `git remote set-url origin <url>`，其中 `<url>` 不含凭据。

**结果验证：** 使用 `git ls-remote --heads origin` 检查读取和认证是否成功。若仍失败，按下面“认证失败”区分凭据、账号权限和仓库地址，不要先删除凭据或改写全局设置。

## 异常处理

### SSH 仍要求输入密码

先用 `ssh-add -l` 确认 agent 是否加载目标密钥，并用 `ssh -vT git@github.com` 查看尝试的公钥类型和主机配置，不要输出私钥。常见原因包括 agent 未加载、选中了错误密钥、macOS 钥匙串没有保存已有密钥，以及 `~/.ssh/config` 的主机别名、`HostName`、`User`、`IdentityFile` 或 `Port` 与远程 URL 不一致。

若远程 URL 使用别名，例如 `git@github-ssh-443:owner/repository.git`，应测试相同别名并检查对应 `Host` 配置。只在确认密钥和账号权限后调整该主机块；随后依次执行 `ssh -T` 和 `git ls-remote --heads origin` 验证。

### HTTPS 443 超时或连接重置

`Failed to connect`、443 超时、`Recv failure`、连接重置等通常先指向网络路径、代理或 TLS 中间设备，不能直接认定为 Token 失效。先按“诊断顺序”检查远程 URL、Git 分层代理、环境变量、macOS 系统代理和本地端口，再用 `git ls-remote --heads origin` 或 `git fetch --dry-run --tags origin <branch>` 复现。

已确认需要仅为此仓库访问 GitHub 使用本地 HTTP 代理时，可设置仓库级配置：

```bash
git config --local http.https://github.com.proxy http://127.0.0.1:10809
git config --local --get-regexp '^http\\.https://github\\.com\\.proxy$'
```

该地址和端口只是示例，必须按实际代理协议和端口替换。确认该仓库级配置错误后，使用 `git config --local --unset-all http.https://github.com.proxy` 删除，再执行只读验证。全局代理清理只适用于已经确认错误配置来源的情况，且应先记录旧值；不要因为一次超时就清理全局配置。

### 认证失败

先保存错误类别和操作场景，不要把 401、403、IDE 文案或一次 API 失败一律归因为 Token。HTTPS 应检查 credential helper、Token 是否仍有效及其权限范围、账号是否有仓库访问权限，以及远程地址是否正确；必要时在安全的凭据管理界面更新凭据。SSH 应检查实际提交的公钥对应的账号、该账号的仓库权限、部署密钥限制和远程地址，而不是重建或暴露私钥。

如果命令行与 IDE 的结果不同，分别比较它们使用的远程 URL、协议、Git 可执行文件、代理环境和凭据存储位置。确认远端服务状态可用且本机网络正常后，仍出现访问拒绝时，再联系仓库管理员核对账号和仓库授权。

### 非快进推送被拒绝

停止重复推送，先运行 `git fetch --prune origin`，再使用 `git log --oneline --graph --decorate --all` 查看本地分支和已更新远程跟踪分支的分叉。根据团队策略，把远端变更通过 `merge` 整合，或仅对自己的未共享提交使用 `rebase`；具体选择见[分支整合](branch-integration.md)。若产生冲突，按[冲突解决](conflict-resolution.md)解决、测试并完成整合。

确认历史和测试无误后，使用普通 `git push origin <branch>` 推送。不要用强制推送绕过非快进检查；若发现远端分支疑似被重写，停止操作并先确认团队意图和恢复策略。

### 受限执行环境无法访问远程

普通终端可访问而沙箱、Agent 或 CI 失败时，可能是网络隔离、代理不可见或文件系统权限限制，而不是仓库认证本身。不要擅自向仓库写入代理配置，也不要因恢复读取权限而假定已获得推送授权。

若 Git 报告无法写入 `.git/FETCH_HEAD`、`.git/index` 等并包含 `Operation not permitted`，优先判断为文件系统权限问题，不要按认证失败处理。只为被阻塞的受控操作申请或重试必要权限，不扩大授权范围；读取远程成功与推送授权是两项独立检查。

## 风险提示

- 不输出 Token、私钥或带认证信息的代理 URL，也不将 HTTPS URL 写成含明文 Token 的形式。
- 不凭空清理全局代理、全局凭据或系统网络设置；先确认配置来源、记录旧值，并优先使用仓库级的最小修改。
- 连接恢复只说明当前读取或网络路径可用，不构成推送授权；推送前仍需确认分支、目标远程和团队流程。
- 修改远程地址或 Git 配置前记录旧值和来源；恢复时还原该值后，再用 `git remote -v`、`git ls-remote --heads origin` 或对应的只读配置查询验证。

## 场景速查

| 现象 | 首先检查 | 常见原因 | 安全处理 |
| --- | --- | --- | --- |
| 远程地址不对或协议意外变化 | `git remote -v`、`git remote get-url origin` | 迁移后未更新、URL 被 `insteadOf` 改写 | 记录旧值后用 `git remote set-url` 修改，并用 `git ls-remote --heads origin` 验证。 |
| SSH 要求密码或使用了错误账号 | `ssh-add -l`、`ssh -vT git@github.com` | agent 未加载、错误密钥、钥匙串或别名/端口配置不一致 | 只调整已有密钥和对应主机块；不生成、覆盖或输出私钥。 |
| HTTPS 443 超时或连接重置 | 分层 proxy、环境变量、`scutil --proxy`、本地监听端口 | 失效代理、网络策略、TLS 中间设备 | 先只读复现；原因确认后才设置或删除仓库级代理。 |
| 401、403 或 IDE 认证错误 | 远程 URL、credential helper、SSH 账号和仓库权限 | Token/凭据过期、账号无权限、地址错误 | 在安全凭据管理处更新并复验；不要把错误文案一律当作 Token 问题。 |
| 推送被非快进拒绝 | `git fetch --prune origin`、历史图 | 远端已有新提交或分支被改写 | 按团队策略 merge 或 rebase 自己未共享提交，解决冲突后普通 push。 |
| 终端可用而沙箱或 Agent 失败 | 执行环境的网络和文件权限 | 网络隔离、代理不可见、`.git` 写入被拒绝 | 只重试被阻塞的受控操作；读取恢复不等于可以推送。 |
