---
title: Git 分支与代码整合
description: 说明分支管理以及 merge、rebase、cherry-pick 的选择边界、正常整合流程和异常处理方式。
---

# Git 分支与代码整合

## 适用场景

本页用于创建和切换功能分支、把分支整合到目标分支、整理尚未共享的本地提交，以及将少量独立提交移植到另一条分支。开始前先使用 `git status --short --branch`、`git branch --show-current` 和 `git log --oneline --graph --decorate` 确认工作区、当前分支和历史位置；需要远程最新状态时，先执行 `git fetch --prune <remote>`。

提交撤销或找回进入[回退与恢复](rollback-recovery.md)；发生文本冲突时按[冲突解决](conflict-resolution.md)处理。不要将本页的整合操作用于掩盖错误提交或未确认的远程差异。

## 先选择 merge、rebase 还是 cherry-pick

| 方式 | 适合什么情况 | 历史结果和关键限制 |
| --- | --- | --- |
| `merge` | 需要把一条共享分支整合进当前目标分支，且希望保留分支关系。 | 当前分支能直接快进到 `<branch>` 时，`git merge --ff-only <branch>` 只移动分支指针，不生成 merge commit；历史已分叉时，普通 `git merge <branch>` 会创建 merge commit 记录这次整合。 |
| `rebase` | 需要在提交前整理自己尚未共享的本地提交，使其建立在新的 `<base>` 之上。 | 会重写这些提交的标识和历史；默认不要对公共历史或已被协作者使用的提交执行 rebase。 |
| `cherry-pick` | 只需要迁移少量、彼此相对独立的提交。 | 会在当前分支创建对应的新提交；若提交依赖较多、顺序难以确认或需要整条分支的上下文，应评估 `merge`。 |

选择前先回答三个问题：目标分支是否已经是正确的整合位置、提交是否已共享、所需改动是否能独立于原分支其余提交存在。答案不明确时，先停止写操作并与相关协作者确认。

## 正常操作

### 创建、切换和跟踪分支

**操作前检查：** 使用 `git status` 确认工作区没有需要保留的未提交改动，使用 `git branch --show-current` 确认当前起点。要基于远程分支开始工作时，先执行 `git fetch --prune <remote>`，并使用 `git branch -r` 确认远程跟踪分支存在。

**执行：** 从当前提交创建并切换到新分支时，使用 `git switch -c <branch>`。切换到已有远程跟踪分支并建立本地跟踪关系时，使用 `git switch --track <remote>/<branch>`；这里的 `<remote>/<branch>` 是远程跟踪分支名，例如不应省略远程名。

**结果验证：** 使用 `git status` 确认当前分支及 upstream 状态；使用 `git branch -vv` 确认本地分支跟踪的远程引用；使用 `git log --oneline --graph --decorate -n 10` 检查分支从预期提交开始。

### 使用 merge 合并分支

**操作前检查：** 先切换到接收改动的目标分支，使用 `git branch --show-current` 确认它是正确的目标；使用 `git status` 确认工作区干净。若目标分支跟踪远程，先 `git fetch --prune <remote>`，再确认本地目标分支已按团队约定同步到最新状态。使用 `git log --oneline --graph --decorate` 检查 `<branch>` 与当前分支的分叉情况。

**执行：** 只允许快进、并在无法快进时停止检查策略，使用 `git merge --ff-only <branch>`。需要保留已分叉分支的整合节点时，使用普通 `git merge <branch>`；它在历史已经分叉时创建 merge commit，在可以快进时默认仍可能直接快进。需要每次都保留 merge commit 时，应先与团队规范核对，不要仅为改变图形而临时添加选项。

**结果验证：** 使用 `git status` 确认合并已结束且没有未解决文件；使用 `git log --oneline --graph --decorate -n 20` 确认目标分支已包含 `<branch>` 的提交，并在普通合并产生提交时检查 merge commit 的位置。合并后的测试和构建仍应按项目约定执行。

### 使用 rebase 整理本地提交

**操作前检查：** 只在当前分支的待整理提交尚未共享时继续。使用 `git status` 确认工作区干净，使用 `git branch --show-current` 确认自己位于要整理的分支，使用 `git log --oneline --graph --decorate` 确认 `<base>` 是预期的新基础。若 `<base>` 来自远程，先 `git fetch --prune <remote>` 并确认本地引用已更新。

**执行：** 在当前本地分支上运行 `git rebase <base>`，让本地、未共享的提交依次应用到 `<base>` 之后。不要切到公共基准分支后对其执行 rebase，也不要把已推送并可能被协作者使用的提交当作可随意整理的本地历史。

**结果验证：** 使用 `git status` 确认 rebase 已完成；使用 `git log --oneline --graph --decorate -n 20` 检查当前分支提交已位于 `<base>` 之后。若该分支此前已推送，先和协作者协调其后续同步方式；本页不建议用强制推送解决历史不一致。

### 使用 cherry-pick 移植提交

**操作前检查：** 先切换到接收提交的目标分支，使用 `git branch --show-current` 和 `git status` 确认目标正确且工作区干净。若 `<commit>` 尚未同步到本地，先执行 `git fetch --prune <remote>`。在写入前使用 `git show <commit>` 检查提交实际修改、父提交和可能依赖；若需要多个相互依赖的提交，先确认顺序，或评估改用 `merge`。

**执行：** 在目标分支运行 `git cherry-pick <commit>`。只移植已确认能独立工作的提交；需要多个提交时，按依赖从前到后的顺序逐个执行并在每一步验证，不把“从某个固定分支移植到另一个固定分支”当作通用流程。

**结果验证：** 使用 `git status` 确认移植已结束；使用 `git log --oneline --graph --decorate -n 20` 确认目标分支出现新的对应提交；使用 `git show HEAD` 对照改动内容。随后运行受影响模块的测试或构建，确认隐含依赖没有遗漏。

### 删除已经合并的本地分支

**操作前检查：** 切换到保留该历史的分支，使用 `git branch --show-current` 确认自己不在待删除分支上，再使用 `git log --oneline --graph --decorate` 确认 `<branch>` 的工作已经整合。`git branch -d` 只删除本地分支，且会在 Git 认为该分支尚未合并时拒绝删除。

**执行：** 使用 `git branch -d <branch>` 删除已合并的本地分支。

**结果验证：** 使用 `git status` 确认当前工作区未受影响，使用 `git branch --list <branch>` 确认本地分支已移除；使用 `git log --oneline --graph --decorate -n 20` 再次确认整合后的历史仍可访问。

## 异常处理

| 现象 | 先做什么 | 处理方式 |
| --- | --- | --- |
| 工作区不干净 | 用 `git status` 确认未提交改动的来源和范围。 | 先提交、按需暂存，或保留现场后进入[Git 日常工作流](daily-workflow.md)处理；不要直接开始 merge、rebase 或 cherry-pick。 |
| 目标分支落后 | 先 `git fetch --prune <remote>`，再查看 `git log --oneline --graph --decorate`。 | 按团队约定更新目标分支并重新确认整合位置；不要基于过期远程跟踪引用直接整合或推送。 |
| 提交依赖不完整 | 用 `git show <commit>` 和历史图确认依赖提交及其顺序。 | 评估补齐依赖提交、改用 `merge`，或停止本次移植；不要只因 cherry-pick 成功就假设功能完整。 |
| 进入冲突状态 | 立即用 `git status` 确认当前是 merge、rebase 还是 cherry-pick。 | 按[冲突解决](conflict-resolution.md)解决并验证文件后，再执行对应操作的 `--continue`；若决定放弃，分别使用 `git merge --abort`、`git rebase --abort` 或 `git cherry-pick --abort`。 |
| 误选目标分支 | 停止后续提交、整合和推送，使用 `git branch --show-current`、`git status` 和 `git log --oneline --graph --decorate` 记录现场。 | 操作仍在进行时使用对应的 `git merge --abort`、`git rebase --abort` 或 `git cherry-pick --abort` 返回起点；若操作已完成，进入[回退与恢复](rollback-recovery.md)评估影响，不要直接改写已共享历史。 |

解决冲突后，merge 使用 `git merge --continue`，rebase 使用 `git rebase --continue`，cherry-pick 使用 `git cherry-pick --continue`；这些命令只应在冲突文件已经解决、暂存并完成必要检查后执行。

## 风险提示

- 对公共历史执行 rebase 会改变提交标识，协作者后续同步可能产生重复提交或复杂分叉；默认只整理未共享的本地提交。
- 不要把普通 `git push --force` 当作整合失败、非快进或选错分支的解决方案。即使团队明确协调后需要改写远程历史，也只应在专业流程和充分核对中讨论 `--force-with-lease`，并先评估追加提交或恢复方案。
- `git branch -d <branch>` 只删除已经合并的本地分支。命令拒绝删除未合并分支时，先确认该分支是否仍有需要保留的工作；不要为了绕过检查而直接使用 `-D`。
- `cherry-pick` 复制的是提交效果而非完整分支语境。应用成功不等于依赖、测试数据、配置或后续提交已经一并具备。

## 场景速查

| 目标/现象 | 推荐方式或命令 | 关键限制 |
| --- | --- | --- |
| 从当前提交开始一个独立功能 | `git switch -c <branch>` | 先确认当前分支和工作区；新分支以当前 `HEAD` 为起点。 |
| 基于已有远程分支协作 | `git switch --track <remote>/<branch>` | 先 fetch 并确认远程跟踪分支存在；不要遗漏 `<remote>`。 |
| 将共享分支的完整历史整合到当前目标 | `git merge <branch>` | 在正确目标分支执行；分叉时会创建 merge commit，保留分支关系。 |
| 只接受可快进的整合 | `git merge --ff-only <branch>` | 不能快进就停止，不会自动创建 merge commit。 |
| 在提交前更新本地功能分支的基础 | `git rebase <base>` | 仅用于未共享的本地提交；不要对公共历史变基。 |
| 移植一个经检查的独立修复 | `git show <commit>` 后执行 `git cherry-pick <commit>` | 先检查依赖；依赖多时评估 `merge`。 |
| 整合过程出现冲突 | 解决后执行对应的 `git merge --continue`、`git rebase --continue` 或 `git cherry-pick --continue` | 先按[冲突解决](conflict-resolution.md)解决并暂存；需要放弃则用对应 `--abort`。 |
| 清理确认已整合的本地分支 | `git branch -d <branch>` | 只删除本地且已合并的分支；拒绝删除时先确认，不要直接 `-D`。 |
