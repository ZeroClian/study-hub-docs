---
title: Git 回退与恢复
description: 按改动所处层级选择 restore、reset、revert 或 reflog，安全回退并恢复提交。
---

# Git 回退与恢复

## 适用场景

本页用于误改文件、误暂存、需要修正本地提交、撤销已共享提交，以及怀疑提交丢失时的处理。先判断改动位于工作区、暂存区、本地未推送提交、已推送提交，还是提交疑似丢失；不同层级的恢复手段和影响不同。

不确定提交是否已推送时，先执行 `git branch -vv` 和 `git status --short --branch`，它们只能提供相对本地远程跟踪引用的线索。然后执行 `git fetch <remote>` 更新引用，并用 `git branch -r --contains <commit>` 检查已抓取的远程分支是否包含该提交；本地的远程跟踪引用不是实时远端状态，未 fetch 前不能据此断言远端没有变化。即使已抓取分支未包含该提交，仍无法排除其他远程或协作者已经获取它时，优先使用 `git revert <commit>` 或先与团队协商，不要执行 amend 或 reset。

## 先判断改动位于哪一层

先执行 `git status --short --branch`，并按需执行 `git diff`、`git diff --staged` 和 `git log --oneline --decorate -n 10`。确认范围前，不要直接覆盖文件、移动分支指针或推送。

| 状态 | 可观察到的信号 | 推荐入口 | 是否改写历史 | 主要影响 |
| --- | --- | --- | --- | --- |
| 工作区 | `git diff` 有输出，改动尚未暂存 | `git restore <file>` | 否 | 丢弃指定文件未暂存的内容；已暂存内容不受影响。 |
| 暂存区 | `git diff --staged` 有输出 | `git restore --staged <file>` | 否 | 取消暂存，文件改动仍留在工作区。 |
| 未推送提交 | fetch 后 `git branch -r --contains <commit>` 未列出已抓取分支 | `git commit --amend` 或 `git reset` | 是 | 仅在团队已明确该提交未被共享时适用；若无法排除他人已获取，改用 revert 或团队协商。 |
| 已推送提交 | 提交已在共享分支或无法排除已被他人获取 | `git revert <commit>` | 否 | 新增反向提交，保留原提交和可追溯历史。 |
| 提交疑似丢失 | 当前分支历史中找不到原提交 | `git reflog` 后建恢复分支 | 否 | 先固定可恢复的 SHA，再决定后续处理。 |

## 正常操作

### 丢弃工作区改动

**操作前检查：** 使用 `git status --short --branch` 和 `git diff -- <file>` 确认 `<file>` 的未暂存改动确实不需要。若内容可能仍有价值，先按“风险提示”创建可恢复副本。

**执行：** 使用 `git restore <file>`，将 `<file>` 的工作区内容恢复为暂存区版本，丢弃该文件未暂存的改动。

**结果验证：** 再次执行 `git diff -- <file>`，预期没有未暂存差异；使用 `git diff --staged -- <file>` 确认原有暂存内容没有被误改。

### 取消暂存但保留文件

**操作前检查：** 使用 `git diff --staged -- <file>` 确认只需取消暂存，不应丢弃工作区内容。

**执行：** 使用 `git restore --staged <file>`，将 `<file>` 从暂存区移回工作区。

**结果验证：** 使用 `git diff --staged -- <file>` 确认该文件不再暂存，再用 `git diff -- <file>` 确认文件改动仍在工作区。

### 修正最近一次本地提交

**操作前检查：** 使用 `git log --oneline --decorate -n 3` 确认目标是最近一次提交。`git branch -vv` 和 `git status --short --branch` 只能给出相对本地远程跟踪引用的线索；执行 `git fetch <remote>` 后，用 `git branch -r --contains <commit>` 检查已抓取远程分支。仍无法排除该提交已在其他远程或被协作者获取时，不要 amend，优先 revert 或与团队协商。需要补充文件内容时，先检查 `git diff` 和 `git diff --staged`。

**执行：** 先将要补充的内容暂存，再使用 `git commit --amend` 修正最近一次本地提交的内容或说明。

**结果验证：** 使用 `git show --stat HEAD` 确认新提交内容，使用 `git status --short --branch` 确认工作区状态。该操作会生成新的提交标识；若发现提交已共享，停止后续推送，改用“撤销已经推送的提交”。

### 撤销尚未共享的本地提交

**操作前检查：** 使用 `git log --oneline --decorate -n 10` 确认要回退到的 `<commit>`。`git branch -vv` 和 `git status --short --branch` 只能提供线索；执行 `git fetch <remote>` 后，用 `git branch -r --contains <commit>` 检查已抓取远程分支。仍无法排除待撤销提交已在其他远程或被协作者获取时，不要 reset，优先 revert 或与团队协商。先执行 `git branch backup/<name>` 固定当前位置，避免选错目标后无引用可查。

**执行：** 需要保留所有改动在暂存区时，使用 `git reset --soft <commit>`；它会移动本地分支指针到 `<commit>`，但保留暂存内容。需要保留文件改动、同时取消暂存时，使用 `git reset --mixed <commit>`，或使用默认形式 `git reset <commit>`；它同样移动本地分支指针，但将改动留在工作区。

**结果验证：** 使用 `git log --oneline --decorate -n 10` 确认分支指向 `<commit>`，用 `git diff --staged` 和 `git diff` 分别确认改动处于预期层级。发现目标选错时，立即停止进一步写操作，按“从 reflog 找回提交”定位原位置。

### 撤销已经推送的提交

**操作前检查：** 使用 `git fetch <remote>` 更新可见的远程跟踪引用，再用 `git branch -r --contains <commit>` 检查已抓取的远程分支是否包含 `<commit>`。`git branch -vv` 和 `git status --short --branch` 只能提供相对本地远程跟踪引用的线索，`git log --oneline --decorate -n 10` 用于核对本地历史位置；这些结果仍不能排除其他远程或协作者已经获取该提交。无法确认未共享时，优先使用 revert 或与团队协商。先阅读该提交的差异，确认反向变更不会超出预期。

**执行：** 使用 `git revert <commit>` 创建一个新的提交来反向应用 `<commit>` 的改动。`revert` 不等同于删除历史：原提交和撤销提交都会保留在历史中。若 `<commit>` 是 merge commit，普通 revert 需要先选择主线父提交；先用 `git show --no-patch --pretty=%P <commit>` 确认父提交及其语义，并与团队协调，再评估使用 `git revert -m <parent-number> <commit>`，不要把主线父提交写死为 1。若 Git 报告冲突，按[冲突解决](conflict-resolution.md)处理文件后使用 `git revert --continue`；不再继续本次撤销时使用 `git revert --abort` 回到开始前状态。

**结果验证：** 使用 `git show --stat HEAD` 确认新建的是撤销提交，并使用测试、构建或项目约定的校验确认行为符合预期。确认无误后，按团队流程使用 `git push <remote> <branch>` 推送该新提交。

### 从 reflog 找回提交

**操作前检查：** 立刻停止 reset、commit、clean 等进一步写操作，记录当前 `git status --short --branch` 和 `git log --oneline --decorate -n 10` 输出。若当前指针也可能需要保留，先使用 `git branch backup/<name>` 建立备份引用。

**执行：** 使用 `git reflog` 查找丢失提交曾指向的 `<sha>`，核对内容后使用 `git branch recovery/<name> <sha>` 创建恢复分支。恢复分支只固定提交，不会改变当前分支。

**结果验证：** 使用 `git log --oneline --decorate recovery/<name>` 和 `git show <sha>` 确认提交内容与预期一致。确认后再从恢复分支选择合适的整合方式；不要在尚未核对内容时再次执行回退操作。

## 异常处理

| 现象 | 先做什么 | 处理边界 |
| --- | --- | --- |
| `restore` 后才发现仍需原内容 | 停止继续覆盖，检查编辑器本地历史、备份和 `git reflog`。 | Git 不保证能找回未提交且未被保存为对象的工作区内容。 |
| `reset` 到错误的提交 | 立即停止写操作，执行 `git reflog` 并建立 `git branch recovery/<name> <sha>`。 | 找回的是仍可由 reflog 定位的提交；先恢复引用，再决定分支如何调整。 |
| `revert` 出现冲突 | 用 `git status` 确认冲突范围，按[冲突解决](conflict-resolution.md)处理。 | 解决并核对后用 `git revert --continue`；无法安全完成时用 `git revert --abort`。 |
| 需要 revert 的是 merge commit | 先用 `git show --no-patch --pretty=%P <commit>` 检查父提交及主线语义，并与团队协调。 | 仅在确认主线父提交后评估 `git revert -m <parent-number> <commit>`；不要把父提交编号固定为 1。 |
| `reflog` 找不到目标 | 停止清理和垃圾回收动作，检查其他本地分支、远程分支、协作者克隆和已有备份。 | reflog 会过期，且从未成为提交或引用的内容不一定存在于 Git 对象库。 |
| 误用 `git reset --hard` | 立即用 `git reflog` 查找重置前的 `<sha>`，并建立恢复分支。 | 已提交对象通常可在 reflog 保存期内恢复；未提交改动可能无法恢复。 |
| 用 `git clean -fd` 删除未跟踪文件 | 停止写操作，检查编辑器历史、系统备份或外部备份。 | 未跟踪文件通常没有 Git 对象可供恢复，Git 通常无法找回。 |

## 风险提示

- `git reset --hard` 会同时移动分支指针并覆盖工作区、暂存区。它只应作为高风险警示，而非本页的常规操作；执行前先确认目标并建立 `git branch backup/<name>`。
- `git clean -fd` 会删除未跟踪文件和目录。它只应作为高风险警示；未跟踪文件通常不在 Git 历史中，删除后 Git 通常无法恢复。
- `git push --force` 会改写远程历史，不是默认方案。仅在团队明确协调后才讨论 `git push --force-with-lease <remote> <branch>`；它会检查远程引用是否仍符合本地预期，但不能替代协作确认。
- 需要保留一个可回退的提交位置时，使用 `git branch backup/<name>`；它不会保存当前未提交的工作区内容。需要临时保存已跟踪和未跟踪改动时，使用 `git stash push -u`；它不包含 ignored 文件，不是长期备份，也不会替代已推送的共享历史。若确需保护 ignored 内容，先评估范围并优先复制到工作区外的受控备份位置，不要轻率使用会把构建产物或秘密无差别纳入 stash 的 `-a`。需要保存可审阅的未提交差异时，使用 `git diff > <patch-file>`；它默认只包含当前未暂存差异，不包含暂存区差异、未跟踪文件，也不能视为二进制内容的完整备份。可按场景检查 `git diff --cached` 并复制额外文件。

## 场景速查

| 需求/现象 | 推荐方式 | 是否改写历史/注意事项 |
| --- | --- | --- |
| 丢弃一个文件的未暂存改动 | `git restore <file>` | 不改写历史；先确认 `git diff -- <file>` 中内容不再需要。 |
| 取消文件暂存但继续保留修改 | `git restore --staged <file>` | 不改写历史；修改会留在工作区。 |
| 补充或改写最近的未共享提交 | `git commit --amend` | 改写最近提交；先 fetch 并检查 `git branch -r --contains <commit>`，无法排除共享时改用 revert 或协商。 |
| 撤销未共享提交并继续编辑内容 | `git reset --soft <commit>` 或 `git reset --mixed <commit>` | 改写本地历史；先 fetch 并检查远程包含关系，无法排除共享时改用 revert 或协商。 |
| 撤销已推送或已共享的提交 | `git revert <commit>` | 不改写历史；产生新的撤销提交，可能需要处理冲突。 |
| 找回疑似丢失的提交 | `git reflog` 后执行 `git branch recovery/<name> <sha>` | 不改写当前分支；先建立恢复分支，再核对内容。 |
| 不确定提交是否已推送 | `git branch -vv`、`git status --short --branch`，然后 `git fetch <remote>` 和 `git branch -r --contains <commit>` | 前两者只提供本地跟踪引用线索；仍无法排除共享时，不要贸然改写历史。 |
