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
7. 修改但尚未 `git add` 前，运行 `git diff --check` 检查工作区的冲突标记残留和空白错误；暂存后运行 `git diff --cached` 审阅最终内容，再运行 `git diff --cached --check` 检查已暂存的解决结果，并运行受影响模块的测试或构建。
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

**结果验证：** 不要只删除标记而不理解双方意图。保存后用 `git diff -- <file>` 复查最终内容，并在暂存前运行 `git diff --check`，确认没有遗漏调用、配置键、删除操作、重复代码、冲突标记残留或空白错误。

### 标记已解决并验证差异

**操作前检查：** 仅对已经逐处复查、保存的文件执行暂存。先用 `git diff -- <file>` 查看当前手工解决的内容，并运行 `git diff --check` 检查工作区，避免把未检查的自动合并结果一起标记完成。

**执行：** 使用 `git add <file>` 标记单个文件已解决；多个文件时逐个确认并暂存。不要把 `ours` 或 `theirs` 的批量接受当作通用方案：在 rebase 冲突中，`ours` 通常指正在形成的新上游基线或已重放结果，`theirs` 通常指当前正在重放的原分支提交，不能沿用普通 merge 的直觉。无论当前操作为何，默认都应阅读双方改动并逐文件编辑。

**结果验证：** 使用 `git status` 确认不再有未解决路径，使用 `git diff --cached` 审阅已暂存的最终内容，再使用 `git diff --cached --check` 检查已暂存结果的冲突标记残留和空白错误，并运行相关测试。

### 继续 merge

**操作前检查：** 确认 `git status` 不再列出未合并路径，`git diff --cached` 已审阅、`git diff --cached --check` 和相关测试已通过。

**执行：** 已解决的普通 merge 可使用 `git commit` 或 `git merge --continue` 完成；优先遵循 `git status` 给出的下一步提示。

**结果验证：** 使用 `git status` 确认 merge 已结束，再用 `git log --oneline --graph --decorate -n 20` 和测试结果核对整合历史与行为。

### 继续 rebase

**操作前检查：** 确认当前确实处于 rebase，且所有冲突文件已暂存、`git diff --cached` 已审阅、`git diff --cached --check` 和相关测试已通过。

**执行：** 使用 `git rebase --continue` 应用下一次提交。rebase 可能在后续提交再次暂停；每次都回到本页的识别、逐文件解决和验证步骤。

**结果验证：** 用 `git status` 确认 rebase 已结束或明确下一处待处理冲突，再用 `git log --oneline --graph --decorate -n 20` 确认提交顺序和新基线。

### 继续 cherry-pick

**操作前检查：** 确认当前是 cherry-pick，冲突文件已逐个暂存，且已用 `git diff --cached` 审阅移植后的差异、用 `git diff --cached --check` 检查暂存结果，并完成受影响测试。

**执行：** 使用 `git cherry-pick --continue` 创建当前移植提交。若要继续移植其他提交，先确认当前提交已成功结束，再按依赖顺序逐个处理。

**结果验证：** 使用 `git status` 确认操作完成，使用 `git show HEAD` 核对新提交内容，并运行受影响模块的测试或构建。

**revert 的继续：** revert 发生冲突时，也先完成逐文件编辑、`git add <file>`、`git diff --cached` 审阅、`git diff --cached --check` 和相关测试，再使用 `git revert --continue`；放弃路径见“异常处理”。

## 异常处理

### 放弃当前操作

先运行 `git status` 确定当前正在进行的操作，只使用与它对应的放弃命令：merge 使用 `git merge --abort`，rebase 使用 `git rebase --abort`，cherry-pick 使用 `git cherry-pick --abort`，revert 使用 `git revert --abort`。不要混用 `--abort`，也不要在无法确认操作类型时试错。

放弃前使用 `git diff` 检查未暂存内容，并使用 `git diff --cached` 检查已暂存的手工解决内容；`--abort` 旨在返回本次操作开始前的状态，当前未提交的解决工作可能因此丢失。放弃后运行 `git status` 确认操作已结束，再重新评估分支、提交和整合策略。

#### stash pop 发生冲突

`git stash pop` 发生冲突不属于四种可继续或放弃的历史操作：没有通用的 `--continue` 或 `--abort`。先用 `git status` 确认冲突文件，并用 `git stash list` 确认 stash 记录；发生冲突时该 stash 通常不会被删除，不要重复执行 `git stash pop`。

解决时按文件编辑、使用 `git add <file>` 暂存，再用 `git diff --cached` 审阅、`git diff --cached --check` 检查并运行相关测试；完成后自行继续当前工作。决定不保留这次应用结果时，先保护必要内容；没有可套用的通用放弃命令，应按文件恢复，或仅在确认没有其他需要保留的改动时回到已知状态。

### 已误删或误选一侧内容

尚未执行 `git add` 时，可通过编辑器撤销或重新阅读仍在文件中的冲突内容后修正。已经执行 `git add <file>` 时，可使用 `git restore --staged <file>` 取消暂存当前解决结果，同时保留工作区内容供重新编辑；该命令不会恢复未合并索引状态、冲突标记或之前删掉的一侧内容。

若确需把单个文件恢复到冲突前状态，先用 `git diff -- <file>` 检查并保存当前手工解决内容；这种恢复会丢弃该文件当前的手工解决结果。无法确认正确内容时，优先保留现场，必要时放弃当前操作后按正确起点重新发起，而不是猜测性地批量选择一侧。

### 冲突解决后测试失败

测试或构建失败时不要继续执行 `--continue`。先保留失败输出、复现条件和 `git diff`，定位是合并逻辑、依赖、配置还是测试预期不一致；修复后在暂存前重新执行 `git diff --check`，暂存后审阅 `git diff --cached` 并执行 `git diff --cached --check`，再运行相关测试。

无法在当前冲突上下文中安全修复时，使用与 `git status` 所示操作匹配的 `--abort` 返回起点，再调整整合方案。revert 发生冲突并已修复时的继续命令是 `git revert --continue`，同样应在测试通过后才执行。

## 风险提示

- 不要对整个仓库全局搜索替换 `<<<<<<<`、`=======` 或 `>>>>>>>`；这些标记必须结合每个冲突位置的上下文处理。
- 不要盲目接受一侧内容，也不要将 `ours`、`theirs` 视为永远对应同一业务来源。普通 merge 与 rebase 的语境不同，标签容易造成误判。
- 冲突未解决时，不要强制推送、硬重置，或开始另一个 merge、rebase、cherry-pick 或 revert；这些动作会扩大恢复范围并模糊当前现场。
- 敏感配置发生冲突时，不能把凭据、Token、私钥或含认证信息的 URL 提交到仓库或复制到诊断记录中；应按团队的秘密管理方式核对最终配置。

## 场景速查

| 当前状态/现象 | 检查 | 继续 | 放弃 |
| --- | --- | --- | --- |
| merge 提示存在未合并路径 | `git status` 和 `git diff --name-only --diff-filter=U` | 解决、`git add <file>`、审阅 `git diff --cached`、运行 `git diff --cached --check` 和测试后按 status 使用 `git commit` 或 `git merge --continue` | `git merge --abort` |
| rebase 停在某个提交 | `git status` 确认当前提交和冲突文件 | 解决、暂存、审阅 `git diff --cached`、运行 `git diff --cached --check` 和测试后 `git rebase --continue` | `git rebase --abort` |
| cherry-pick 不能自动应用提交 | `git status`、`git show <commit>` 和未合并文件清单 | 解决、暂存、审阅 `git diff --cached`、运行 `git diff --cached --check` 和测试后 `git cherry-pick --continue` | `git cherry-pick --abort` |
| revert 反向应用时冲突 | `git status`、`git show <commit>` 和差异 | 解决、暂存、审阅 `git diff --cached`、运行 `git diff --cached --check` 和测试后 `git revert --continue` | `git revert --abort` |
| stash pop 出现冲突 | `git status`、`git stash list` 和未合并文件清单 | 解决、暂存、审阅 `git diff --cached`、运行 `git diff --cached --check` 和测试后自行继续工作 | 无通用命令；先保护必要内容，再按文件恢复或在确认范围后回到已知状态 |
| 已暂存后发现解决内容错误 | `git diff --cached` 审阅暂存内容、`git diff` 检查工作区 | `git restore --staged <file>` 后重新编辑，暂存前运行 `git diff --check`，再暂存、审阅 `git diff --cached` 并运行 `git diff --cached --check` | 按 `git status` 指示使用对应 `--abort` |
| 测试或构建失败 | 保存失败输出，检查 `git diff`、受影响依赖与配置 | 修复后通过工作区 `git diff --check`，暂存后通过 `git diff --cached --check` 和相关测试再继续 | 无法安全修复时使用对应 `--abort` |
