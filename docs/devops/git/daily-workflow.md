---
title: Git 日常工作流
description: 从初始化、暂存和提交到同步、推送、临时保存与历史查看的常用操作。
---

# Git 日常工作流

## 适用场景

本页用于新建或克隆仓库、完成一次小范围改动、与远程同步、临时切换任务，以及定位日常改动来源。分支合并、变基和 Cherry-pick 请进入[分支整合](branch-integration.md)；需要撤销或找回改动请进入[回退与恢复](rollback-recovery.md)；冲突和远程连接问题分别进入[冲突解决](conflict-resolution.md)与[远程异常排查](remote-troubleshooting.md)。

## 正常操作

### 创建或克隆仓库

**操作前检查：** 新项目确认目标目录为空或尚未初始化；已有项目确认远程地址和访问权限。不要在已有 Git 仓库中再次初始化或把仓库克隆到包含同名文件的目录。

**执行：** 新项目使用 `git init` 创建本地仓库；已有远程项目使用 `git clone <repository-url>` 克隆，随后进入克隆得到的目录。

**结果验证：** 使用 `git status` 确认仓库状态；克隆后使用 `git remote -v` 确认远程地址，必要时用 `git log --oneline --decorate -n 10` 查看已获取的提交。

### 查看当前状态和差异

**操作前检查：** 准备提交、拉取、推送或切换分支前，先确认自己位于正确仓库和分支。

**执行：** 使用 `git status` 查看工作区、暂存区和跟踪分支的概况；使用 `git diff` 查看尚未暂存的改动。需要查看已暂存的差异时，使用 `git diff --staged`。

**结果验证：** 确认差异只包含本次要处理的文件；若出现陌生改动，先保留现场并查明来源，不要直接覆盖或删除。

### 暂存与取消暂存

**操作前检查：** 先用 `git status` 和 `git diff` 确认要提交的文件与内容，特别留意配置、密钥和生成文件。

**执行：** 使用 `git add -p` 按差异块选择暂存内容。误暂存时使用 `git restore --staged <file>` 将文件移回工作区，文件本身的修改会保留。

**结果验证：** 使用 `git diff --staged` 检查暂存区，使用 `git diff` 检查未暂存部分，确保两者的边界符合预期。

### 创建和修正提交

**操作前检查：** 确认当前分支正确，且 `git diff --staged` 中只包含一个可独立说明的改动。

**执行：** 使用 `git commit -m "<message>"` 创建提交。仅在最近一次提交尚未共享、且确实需要修正提交内容或说明时，使用 `git commit --amend`；修正前先将需要补充的内容暂存。

**结果验证：** 使用 `git status` 确认暂存区已清空，再使用 `git log --oneline --decorate -n 10` 或 `git show --stat HEAD` 检查最新提交。

### 获取、拉取与推送

**操作前检查：** 先用 `git status` 确认工作区没有需要保留的未提交改动，再用 `git branch --show-current` 和 `git remote -v` 确认目标分支与远程。同步前不应假设远程没有新提交。

**执行：** 使用 `git fetch --prune <remote>` 获取远程更新并清理已删除的远程跟踪分支；确认差异后，使用 `git pull --ff-only <remote> <branch>` 仅在可快进时拉取。完成本地提交后，使用 `git push <remote> <branch>` 推送当前分支。

**结果验证：** 拉取后用 `git log --oneline --decorate -n 10` 检查历史位置。推送后，只有当前分支已正确配置目标 upstream 时，`git status` 才可辅助判断本地分支与远程跟踪分支的关系；否则先用 `git rev-parse HEAD` 获取本地提交 SHA，再用 `git ls-remote --heads <remote> <branch>` 获取目标远程分支的 SHA 并比对。`git ls-remote` 需要远程访问，连接失败时转到[远程异常排查](remote-troubleshooting.md)。

### 临时保存未完成工作

**操作前检查：** 使用 `git status` 确认哪些改动需要暂时离开；未跟踪文件默认不会被保存到普通 stash。

**执行：** 使用 `git stash push -u -m "<message>"` 临时保存已跟踪和未跟踪改动。需要恢复时，先使用 `git stash list` 选择目标，再使用 `git stash pop` 应用并尝试移除该条记录。

**结果验证：** 保存后用 `git status` 确认工作区符合切换任务的条件；恢复后检查 `git status` 和 `git diff`，确认改动完整且没有冲突。

### 查看历史和定位改动

**操作前检查：** 明确要找的是某次提交、某个文件的变更，还是每一行的最后修改者；不要只根据提交标题判断内容。

**执行：** 使用 `git log --oneline --decorate -n 10` 浏览近期历史；使用 `git show <commit>` 查看指定提交的内容；使用 `git blame <file>` 定位文件各行最后由哪次提交修改。

**结果验证：** 结合提交标识、差异内容和上下文确认结论。若要撤销或恢复，不要直接依据 `git blame` 操作，转到[回退与恢复](rollback-recovery.md)确认影响范围。

## 异常处理

| 现象 | 先做什么 | 后续处理 |
| --- | --- | --- |
| 提交时提示没有内容可提交 | 使用 `git status` 确认工作区和暂存区是否确实为空。 | 若没有待提交改动，无需创建空提交；若改动未暂存，回到“暂存与取消暂存”。 |
| 误把文件暂存 | 用 `git diff --staged` 确认误暂存范围。 | 使用 `git restore --staged <file>` 取消暂存；若还需要撤销工作区内容，阅读[回退与恢复](rollback-recovery.md)。 |
| 在错误分支创建了提交 | 立即停止推送，使用 `git branch --show-current` 和 `git log --oneline --decorate -n 10` 记录当前位置。 | 先阅读[分支整合](branch-integration.md)把提交放到正确分支，再按[回退与恢复](rollback-recovery.md)处理错误分支上的提交。 |
| `git stash pop` 发生冲突 | 使用 `git status` 确认冲突文件；不要重复执行 `git stash pop`。 | 按[冲突解决](conflict-resolution.md)逐文件解决并验证；成功恢复前保留 stash 记录，确认后再清理。 |
| 推送被拒绝且提示非快进 | 停止重试推送，使用 `git fetch --prune <remote>` 获取远程状态。 | 比较本地与远程历史；需要整合时阅读[分支整合](branch-integration.md)，不要未经协作确认使用强制推送。 |

## 风险提示

- `git commit --amend` 会重写最近一次提交。已推送或已被协作者基于其继续工作的提交，先沟通后再处理。
- `git stash` 是短期任务切换工具，不是长期备份；重要改动应尽快形成可追踪的提交或采用团队认可的备份方式。
- 拉取前必须检查工作区。未提交改动可能导致拉取失败，或让后续差异难以区分来源。
- 遇到冲突、非快进推送或错误分支提交时，先保留现场并进入对应分册，不要通过反复重试或强制推送掩盖问题。

## 场景速查

| 需求/现象 | 推荐命令或入口 |
| --- | --- |
| 新建一个本地仓库 | `git init`，然后查看 `git status`。 |
| 获取已有远程项目 | `git clone <repository-url>`，然后确认 `git remote -v`。 |
| 提交前确认改了什么 | `git status`、`git diff`、`git diff --staged`。 |
| 只提交部分差异 | `git add -p`。 |
| 取消某个文件的暂存 | `git restore --staged <file>`。 |
| 修正尚未共享的最近提交 | `git commit --amend`；先阅读本页风险提示。 |
| 获取远程更新并避免自动产生合并提交 | `git fetch --prune <remote>`，再使用 `git pull --ff-only <remote> <branch>`。 |
| 临时切换任务且包含未跟踪文件 | `git stash push -u -m "<message>"`，恢复前查看 `git stash list`。 |
| 查某次提交或某行改动来源 | `git show <commit>` 或 `git blame <file>`。 |
| 分支整合、冲突、回退或远程连接失败 | 分别进入[分支整合](branch-integration.md)、[冲突解决](conflict-resolution.md)、[回退与恢复](rollback-recovery.md)、[远程异常排查](remote-troubleshooting.md)。 |
