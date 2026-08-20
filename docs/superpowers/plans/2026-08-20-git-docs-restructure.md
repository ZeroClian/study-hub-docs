---
title: Git 常用命令文档重组实施计划
description: 将 Git 单页拆分为总览与五个场景分册，并完成导航和 VuePress 验证。
---

# Git 文档重组实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Git 单页整理为一个稳定总览入口和五个场景分册，使正常操作、异常处理、风险边界与验证步骤清晰分离。

**Architecture:** 保留 `docs/devops/git.md` 及其 `/devops/git.html` 路由作为总览，在 `docs/devops/git/` 下按职责新增日常操作、分支整合、回退恢复、冲突处理和远程异常五页。各命令只由一个页面详细解释，跨页使用相对链接；侧栏和知识地图在内容稳定后统一接入。

**Tech Stack:** Markdown、VuePress 2、vuepress-theme-hope、TypeScript 侧栏配置、Node.js 文档校验脚本、pnpm、Git 2.50.1。

---

## 文件映射

**新建：**

- `docs/devops/git/daily-workflow.md`：初始化、状态、暂存、提交、同步、推送、临时保存和历史查看。
- `docs/devops/git/branch-integration.md`：分支管理、merge、rebase、cherry-pick 和方案选择。
- `docs/devops/git/rollback-recovery.md`：工作区、暂存区、本地提交、共享提交的撤销与 reflog 恢复。
- `docs/devops/git/conflict-resolution.md`：merge、rebase、cherry-pick 冲突的识别、解决、继续与放弃。
- `docs/devops/git/remote-troubleshooting.md`：远程地址、SSH、HTTPS、代理、认证、超时和受限环境排查。

**修改：**

- `docs/devops/git.md`：从混合长文改为专题总览和场景索引。
- `docs/.vuepress/sidebar.ts`：将 Git 单链接改为包含六页的折叠分组。
- `docs/guide/README.md`：为 Git 专题增加总览和五个场景入口。

**不修改：**

- `docs/README.md`：现有“运维与工程化”卡片已覆盖 Git，无需重复入口。
- `docs/.vuepress/config.ts` 和 `docs/.vuepress/theme.ts`：继续保留现有 GitHub Pages `base` 和 `hostname`。
- 其他 DevOps、项目精读、AI 和工具类文档。

## Task 1：建立总览和日常工作流

**Files:**
- Modify: `docs/devops/git.md`
- Create: `docs/devops/git/daily-workflow.md`

- [ ] **Step 1：记录基线并验证现有站点状态**

Run:

```bash
git status --short --branch
pnpm docs:validate
```

Expected：仅出现当前计划文件或已知本地设计提交；校验输出 `Documentation validation passed.`。

- [ ] **Step 2：写出新分册尚不存在的失败检查**

Run:

```bash
test -f docs/devops/git/daily-workflow.md
```

Expected：退出码为 `1`，证明日常工作流分册尚未创建。

- [ ] **Step 3：把总览页改为决策入口**

保留 frontmatter，并改用以下结构：

```markdown
# Git 常用命令与故障处理
## 使用前先确认状态
## 按场景选择文档
## 正常操作与异常处理
## 高风险操作边界
## 推荐阅读路径
```

“按场景选择文档”使用表格链接五个分册；“使用前先确认状态”只保留 `git status --short --branch`、`git branch --show-current`、`git log --oneline --decorate -n 10`、`git remote -v` 四个只读入口。原 Cherry-pick 与代理排查正文迁移到对应分册，总览不重复完整步骤。

- [ ] **Step 4：创建日常工作流分册**

使用以下 frontmatter 和章节：

```markdown
---
title: Git 日常工作流
description: 从初始化、暂存和提交到同步、推送、临时保存与历史查看的常用操作。
---

# Git 日常工作流
## 适用场景
## 正常操作
### 创建或克隆仓库
### 查看当前状态和差异
### 暂存与取消暂存
### 创建和修正提交
### 获取、拉取与推送
### 临时保存未完成工作
### 查看历史和定位改动
## 异常处理
## 风险提示
## 场景速查
```

必须覆盖 `init`、`clone`、`status`、`diff`、`add -p`、`restore --staged`、`commit`、`commit --amend`、`fetch --prune`、`pull --ff-only`、`push`、`stash push -u`、`stash list`、`stash pop`、`log`、`show` 和 `blame`。异常部分覆盖无内容可提交、误暂存、提交到错误分支、`stash pop` 冲突和非快进推送，并链接到对应专业分册。

- [ ] **Step 5：验证总览链接和日常分册格式**

Run:

```bash
pnpm docs:validate
rg -n "^## (适用场景|正常操作|异常处理|风险提示|场景速查)$" docs/devops/git/daily-workflow.md
git diff --check
```

Expected：校验通过；五个固定二级标题各出现一次；`git diff --check` 无输出。

## Task 2：整理分支整合流程

**Files:**
- Create: `docs/devops/git/branch-integration.md`

- [ ] **Step 1：写出页面不存在的失败检查**

Run:

```bash
test -f docs/devops/git/branch-integration.md
```

Expected：退出码为 `1`。

- [ ] **Step 2：创建分支整合分册**

使用以下章节：

```markdown
# Git 分支与代码整合
## 适用场景
## 先选择 merge、rebase 还是 cherry-pick
## 正常操作
### 创建、切换和跟踪分支
### 使用 merge 合并分支
### 使用 rebase 整理本地提交
### 使用 cherry-pick 移植提交
### 删除已经合并的本地分支
## 异常处理
## 风险提示
## 场景速查
```

选择表必须明确：`merge` 保留分支关系；`rebase` 只用于未共享的本地提交整理；`cherry-pick` 用于少量独立提交。正常流程覆盖 `switch -c`、`switch --track`、`merge --ff-only`、普通 `merge`、`rebase <base>`、`cherry-pick <commit>` 和 `branch -d`，每个流程都包含操作前检查与 `status`/`log --graph` 验证。

- [ ] **Step 3：补全整合异常与放弃路径**

异常部分覆盖工作区不干净、分支落后、提交依赖不完整、冲突和误选目标分支。只给出对应流程的 `merge --abort`、`rebase --abort`、`cherry-pick --abort`，冲突细节链接 `conflict-resolution.md`。明确禁止对已共享公共分支默认执行 rebase 或普通强制推送。

- [ ] **Step 4：验证关键路径完整**

Run:

```bash
rg -n "git (merge|rebase|cherry-pick).*--(abort|continue)|git merge --ff-only|git branch -d" docs/devops/git/branch-integration.md
pnpm docs:validate
git diff --check
```

Expected：能定位合并、变基、移植的成功及放弃路径；校验通过且无空白错误。

## Task 3：整理回退与恢复决策

**Files:**
- Create: `docs/devops/git/rollback-recovery.md`

- [ ] **Step 1：写出页面不存在的失败检查**

Run:

```bash
test -f docs/devops/git/rollback-recovery.md
```

Expected：退出码为 `1`。

- [ ] **Step 2：创建回退恢复分册**

使用以下章节：

```markdown
# Git 回退与恢复
## 适用场景
## 先判断改动位于哪一层
## 正常操作
### 丢弃工作区改动
### 取消暂存但保留文件
### 修正最近一次本地提交
### 撤销尚未共享的本地提交
### 撤销已经推送的提交
### 从 reflog 找回提交
## 异常处理
## 风险提示
## 场景速查
```

决策表按“工作区、暂存区、未推送提交、已推送提交、提交疑似丢失”区分。覆盖 `restore <file>`、`restore --staged <file>`、`commit --amend`、`reset --soft`、`reset --mixed`、`revert`、`reflog` 和从找到的 SHA 创建恢复分支。已推送提交默认使用 `revert`。

- [ ] **Step 3：限制破坏性命令**

`reset --hard`、`clean -fd`、`push --force` 只能出现在风险说明中；先提供 `git branch backup/<name>`、`git stash push -u` 或 `git diff > <patch-file>` 等可恢复准备。强制推送只说明团队协调后的 `--force-with-lease`，不把它写成常规解决方案。

- [ ] **Step 4：验证层级与风险措辞**

Run:

```bash
rg -n "工作区|暂存区|未推送|已推送|reflog|reset --hard|force-with-lease" docs/devops/git/rollback-recovery.md
pnpm docs:validate
git diff --check
```

Expected：五类状态与危险命令警示均可定位；校验通过且无空白错误。

## Task 4：建立统一冲突处理手册

**Files:**
- Create: `docs/devops/git/conflict-resolution.md`

- [ ] **Step 1：写出页面不存在的失败检查**

Run:

```bash
test -f docs/devops/git/conflict-resolution.md
```

Expected：退出码为 `1`。

- [ ] **Step 2：创建冲突处理分册**

使用以下章节：

```markdown
# Git 冲突处理
## 适用场景
## 冲突处理总流程
## 正常操作
### 识别冲突文件和当前操作
### 理解并清理冲突标记
### 标记已解决并验证差异
### 继续 merge
### 继续 rebase
### 继续 cherry-pick
## 异常处理
### 放弃当前操作
### 已误删或误选一侧内容
### 冲突解决后测试失败
## 风险提示
## 场景速查
```

识别步骤覆盖 `status`、`diff --name-only --diff-filter=U`、`diff --check` 和冲突标记 `<<<<<<<`、`=======`、`>>>>>>>`。继续流程分别使用 `commit`、`rebase --continue`、`cherry-pick --continue`；放弃流程分别使用对应 `--abort`。

- [ ] **Step 3：解释 ours/theirs 的上下文差异**

明确说明 `ours`/`theirs` 在 rebase 与普通 merge 中的语义容易被误解，因此默认先阅读冲突内容并逐文件编辑，不把 `checkout --ours`、`checkout --theirs` 或批量接受一侧作为通用步骤。要求冲突标记清零、相关测试通过后再继续。

- [ ] **Step 4：验证冲突闭环**

Run:

```bash
rg -n "diff --name-only --diff-filter=U|<<<<<<<|--continue|--abort|ours|theirs" docs/devops/git/conflict-resolution.md
pnpm docs:validate
git diff --check
```

Expected：识别、解决、验证、继续和放弃五个阶段均可定位；校验通过。

## Task 5：迁移并扩充远程异常排查

**Files:**
- Create: `docs/devops/git/remote-troubleshooting.md`
- Modify: `docs/devops/git.md`

- [ ] **Step 1：写出页面不存在的失败检查**

Run:

```bash
test -f docs/devops/git/remote-troubleshooting.md
```

Expected：退出码为 `1`。

- [ ] **Step 2：创建远程异常分册**

使用以下章节：

```markdown
# Git 远程、认证与网络异常
## 适用场景
## 诊断顺序
## 正常操作
### 查看和修改远程地址
### 配置并验证 SSH
### 使用 HTTPS 远程
## 异常处理
### SSH 仍要求输入密码
### HTTPS 443 超时或连接重置
### 认证失败
### 非快进推送被拒绝
### 受限执行环境无法访问远程
## 风险提示
## 场景速查
```

迁移现有 `remote -v`、`remote set-url`、`ssh-add --apple-use-keychain`、`ssh -T`、Git 分层代理、环境变量代理、`scutil --proxy`、本地端口、URL 重写、`ls-remote`、`fetch --dry-run` 和仓库级 GitHub 代理内容。补充“不要回显 Token 或带认证信息的代理 URL”和“恢复访问不等于获得推送授权”。

- [ ] **Step 3：按只读到写入的顺序重排诊断**

顺序固定为：确认远程地址 -> 读取 Git 配置来源 -> 检查环境变量和系统代理 -> 检查本地代理端口 -> 使用 `ls-remote` 或 `fetch --dry-run` 复现 -> 仅在原因确定后修改仓库级配置。全局代理清理只能作为已确认配置错误后的可选动作。

- [ ] **Step 4：验证旧内容完成迁移且总览无重复**

Run:

```bash
rg -n "ssh-add --apple-use-keychain|git ls-remote|fetch --dry-run|scutil --proxy|insteadOf" docs/devops/git/remote-troubleshooting.md
rg -n "ssh-add --apple-use-keychain|scutil --proxy|insteadOf" docs/devops/git.md
pnpm docs:validate
git diff --check
```

Expected：第一条命令能定位全部诊断主题；第二条无输出，证明详细排障已从总览移走；校验通过。

## Task 6：接入导航并完成全链路验证

**Files:**
- Modify: `docs/.vuepress/sidebar.ts`
- Modify: `docs/guide/README.md`

- [ ] **Step 1：更新侧栏 Git 分组**

在“构建、交付与协作”中，用以下分组替换原 `page("Git 常用命令", "/devops/git.html")`：

```ts
group("Git 版本控制", [
  page("专题总览", "/devops/git.html"),
  page("日常工作流", "/devops/git/daily-workflow.html"),
  page("分支与代码整合", "/devops/git/branch-integration.html"),
  page("回退与恢复", "/devops/git/rollback-recovery.html"),
  page("冲突处理", "/devops/git/conflict-resolution.html"),
  page("远程与网络异常", "/devops/git/remote-troubleshooting.html"),
]),
```

- [ ] **Step 2：更新知识地图**

在“构建、交付与协作”中保留 Git 专题总览链接，并在其下新增五项缩进列表，使用相对 `.md` 路径：

```markdown
- [Git 常用命令与故障处理](../devops/git.md)
  - [日常工作流](../devops/git/daily-workflow.md)
  - [分支与代码整合](../devops/git/branch-integration.md)
  - [回退与恢复](../devops/git/rollback-recovery.md)
  - [冲突处理](../devops/git/conflict-resolution.md)
  - [远程与网络异常](../devops/git/remote-troubleshooting.md)
```

- [ ] **Step 3：运行源文件检查**

Run:

```bash
git diff --check
pnpm docs:validate
```

Expected：`git diff --check` 无输出；校验输出 `Documentation validation passed.`。

- [ ] **Step 4：运行本地和 GitHub Pages 生产构建**

Run:

```bash
pnpm docs:build
env GITHUB_ACTIONS=true pnpm docs:build
```

Expected：两次 VuePress 构建均以退出码 `0` 完成，且无失效链接或 Markdown 渲染错误。

- [ ] **Step 5：验证生成页面和项目基址链接**

Run:

```bash
test -f docs/.vuepress/dist/devops/git.html
test -f docs/.vuepress/dist/devops/git/daily-workflow.html
test -f docs/.vuepress/dist/devops/git/branch-integration.html
test -f docs/.vuepress/dist/devops/git/rollback-recovery.html
test -f docs/.vuepress/dist/devops/git/conflict-resolution.html
test -f docs/.vuepress/dist/devops/git/remote-troubleshooting.html
env REQUIRE_RENDERED=true pnpm docs:validate
```

Expected：六个 `test` 命令均返回 `0`；渲染校验输出 `Documentation validation passed.`，生成链接均保留 `/study-hub-docs/` 项目基址。

- [ ] **Step 6：审查最终修改范围**

Run:

```bash
git status --short
git diff --stat
git diff -- docs/devops/git.md docs/devops/git docs/.vuepress/sidebar.ts docs/guide/README.md
```

Expected：正文改造只涉及总览、五个分册、侧栏和知识地图；`docs/README.md`、站点 base、域名和其他专题无变化。除非用户明确要求 Git 交付，否则不提交也不推送正文改造。
