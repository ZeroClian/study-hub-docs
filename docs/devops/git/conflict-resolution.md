---
title: Git 冲突处理
description: 说明如何识别 Git 冲突、逐文件解决并验证差异，以及继续或放弃当前历史操作。
---

# Git 冲突处理

## 适用场景

本页用于 `merge`、`rebase`、`cherry-pick`、`revert` 或 `stash pop` 因同一位置存在不同改动而暂停时。先停止其他会改写历史的操作，只处理当前这一次冲突；分支整合的选择进入[分支整合](branch-integration.md)，已完成操作后的回退与找回进入[回退与恢复](rollback-recovery.md)。

## 冲突处理总流程

按以下顺序处理，过程中不要开始另一个 merge、rebase 或其他历史操作：

1. 停止其他历史操作，保留当前现场。
2. 运行 `git status`，确认当前处于 merge、rebase、cherry-pick、revert 还是其他冲突状态。
3. 运行 `git diff --name-only --diff-filter=U`，列出尚未解决的冲突文件。
4. 逐文件阅读冲突标记和上下文，理解双方改动的意图。
5. 编辑文件，保留或重组正确的业务内容并删除冲突标记。
6. 对每个已解决文件运行 `git add <file>` 标记已解决。
7. 运行 `git diff --check` 检查冲突标记残留和空白错误，并运行受影响模块的测试或构建。
8. 根据 `git status` 提示继续当前操作；不能安全继续时，使用与当前操作对应的放弃命令。

`git add <file>` 只表示 Git 不再把该文件视为未解决冲突，不证明合并后的业务逻辑、配置或测试已经正确。

## 正常操作

### 识别冲突文件和当前操作

**操作前检查：** 先运行 `git status`，它会说明当前正在进行的操作及 Git 期待的下一步。再运行 `git diff --name-only --diff-filter=U` 获取未解决文件清单；不要只根据编辑器标签或一次报错猜测操作类型。

**执行：** 逐个打开清单中的文件，结合提交差异、调用方和测试理解改动来源。需要比较当前工作区与暂存区时，使用 `git diff` 或 `git diff --staged`；必要时使用 `git log`、`git show <commit>` 查阅引入改动的提交。

**结果验证：** 再次运行 `git status`，确认当前操作类型与待解决文件范围清楚。只有当前操作已确认，才能选择后续的 `--continue` 或 `--abort`。

### 理解并清理冲突标记

冲突文件通常包含三类标记：`<<<<<<<` 表示一侧内容的开始，`=======` 分隔两侧内容，`>>>>>>>` 表示另一侧内容的结束。标记旁显示的分支名、提交或临时标签只帮助定位来源，不能替代阅读上下文。

**执行：** 逐处判断两侧改动是否应保留其一、组合，或按新的实现重写，然后删除三类标记。可以使用 VS Code、IntelliJ IDEA 等合并工具辅助查看差异，但命令行和普通编辑器同样可完成；不要依赖某个 GUI 的“接受”按钮来判断业务正确性。

**结果验证：** 不要只删除标记而不理解双方意图。保存后用 `git diff -- <file>` 复查最终内容，确认没有遗漏调用、配置键、删除操作或重复代码。

### 标记已解决并验证差异

**操作前检查：** 仅对已经逐处复查、保存的文件执行暂存。先用 `git diff -- <file>` 查看当前手工解决的内容，避免把未检查的自动合并结果一起标记完成。

**执行：** 使用 `git add <file>` 标记单个文件已解决；多个文件时逐个确认并暂存。不要把 `ours` 或 `theirs` 的批量接受当作通用方案：普通 merge 与 rebase 中这两个标签的语义上下文容易反转或混淆，默认应阅读双方改动并逐文件编辑。

**结果验证：** 使用 `git status` 确认不再有未解决路径，使用 `git diff --check` 检查残留冲突标记和空白错误，并运行相关测试。必要时使用 `git diff --staged` 核对将要继续操作的内容。

### 继续 merge

**操作前检查：** 确认 `git status` 不再列出未合并路径，`git diff --check` 和相关测试已通过。

**执行：** 普通 merge 在全部冲突解决后通常使用 `git commit` 完成 merge commit。若 `git status` 明确提示使用 `git merge --continue`，则按提示继续；两种路径取决于 Git 版本和当前状态，优先遵循 `git status`。

**结果验证：** 使用 `git status` 确认 merge 已结束，再用 `git log --oneline --graph --decorate -n 20` 和测试结果核对整合历史与行为。

### 继续 rebase

**操作前检查：** 确认当前确实处于 rebase，且所有冲突文件已暂存、`git diff --check` 和相关测试已通过。

**执行：** 使用 `git rebase --continue` 应用下一次提交。rebase 可能在后续提交再次暂停；每次都回到本页的识别、逐文件解决和验证步骤。

**结果验证：** 用 `git status` 确认 rebase 已结束或明确下一处待处理冲突，再用 `git log --oneline --graph --decorate -n 20` 确认提交顺序和新基线。

### 继续 cherry-pick

**操作前检查：** 确认当前是 cherry-pick，冲突文件已逐个暂存，且移植后的差异和受影响测试已检查。

**执行：** 使用 `git cherry-pick --continue` 创建当前移植提交。若要继续移植其他提交，先确认当前提交已成功结束，再按依赖顺序逐个处理。

**结果验证：** 使用 `git status` 确认操作完成，使用 `git show HEAD` 核对新提交内容，并运行受影响模块的测试或构建。

## 异常处理

### 放弃当前操作

先运行 `git status` 确定当前正在进行的操作，只使用与它对应的放弃命令：merge 使用 `git merge --abort`，rebase 使用 `git rebase --abort`，cherry-pick 使用 `git cherry-pick --abort`，revert 使用 `git revert --abort`。不要混用 `--abort`，也不要在无法确认操作类型时试错。

放弃前使用 `git diff` 检查是否有需要保留的手工解决内容；`--abort` 旨在返回本次操作开始前的状态，当前未提交的解决工作可能因此丢失。放弃后运行 `git status` 确认操作已结束，再重新评估分支、提交和整合策略。

### 已误删或误选一侧内容

尚未执行 `git add` 时，可通过编辑器撤销或重新阅读仍在文件中的冲突内容后修正。已经执行 `git add <file>` 时，可使用 `git restore --staged <file>` 取消“已解决”标记，然后重新编辑；该命令不会恢复冲突标记，也不会自动找回之前删掉的一侧内容。

若确需把单个文件恢复到冲突前状态，先用 `git diff -- <file>` 检查并保存当前手工解决内容；这种恢复会丢弃该文件当前的手工解决结果。无法确认正确内容时，优先保留现场，必要时放弃当前操作后按正确起点重新发起，而不是猜测性地批量选择一侧。

### 冲突解决后测试失败

测试或构建失败时不要继续执行 `--continue`。先保留失败输出、复现条件和 `git diff`，定位是合并逻辑、依赖、配置还是测试预期不一致；修复后重新执行 `git diff --check` 与相关测试。

无法在当前冲突上下文中安全修复时，使用与 `git status` 所示操作匹配的 `--abort` 返回起点，再调整整合方案。revert 发生冲突并已修复时的继续命令是 `git revert --continue`，同样应在测试通过后才执行。

## 风险提示

- 不要对整个仓库全局搜索替换 `<<<<<<<`、`=======` 或 `>>>>>>>`；这些标记必须结合每个冲突位置的上下文处理。
- 不要盲目接受一侧内容，也不要将 `ours`、`theirs` 视为永远对应同一业务来源。普通 merge 与 rebase 的语境不同，标签容易造成误判。
- 冲突未解决时，不要强制推送、硬重置，或开始另一个 merge、rebase、cherry-pick 或 revert；这些动作会扩大恢复范围并模糊当前现场。
- 敏感配置发生冲突时，不能把凭据、Token、私钥或含认证信息的 URL 提交到仓库或复制到诊断记录中；应按团队的秘密管理方式核对最终配置。

## 场景速查

| 当前状态/现象 | 检查 | 继续 | 放弃 |
| --- | --- | --- | --- |
| merge 提示存在未合并路径 | `git status` 和 `git diff --name-only --diff-filter=U` | 解决、`git add <file>`、检查测试后按 status 使用 `git commit` 或 `git merge --continue` | `git merge --abort` |
| rebase 停在某个提交 | `git status` 确认当前提交和冲突文件 | 解决、暂存、检查测试后 `git rebase --continue` | `git rebase --abort` |
| cherry-pick 不能自动应用提交 | `git status`、`git show <commit>` 和未合并文件清单 | 解决、暂存、检查测试后 `git cherry-pick --continue` | `git cherry-pick --abort` |
| revert 反向应用时冲突 | `git status`、`git show <commit>` 和差异 | 解决、暂存、检查测试后 `git revert --continue` | `git revert --abort` |
| 已暂存后发现解决内容错误 | `git diff --staged` 和 `git diff` | `git restore --staged <file>` 后重新编辑、检查并暂存 | 按 `git status` 指示使用对应 `--abort` |
| 测试或构建失败 | 保存失败输出，检查 `git diff`、受影响依赖与配置 | 修复并重新通过 `git diff --check` 和相关测试后再继续 | 无法安全修复时使用对应 `--abort` |
