---
title: macOS 游戏部署工具：rsync 全量与增量同步
description: 将重复的 scp 上传封装为 deploy-game 命令，按当前项目目录生成远端路径，支持增量、全量和隐藏密码输入。
---

# macOS 游戏部署工具：rsync 全量与增量同步

把游戏构建产物 `dist/` 上传到服务器时，可以将固定的上传步骤封装成全局命令 `deploy-game`。工具从当前工作目录提取游戏名称，再使用 `rsync` 同步到对应目录。

本文整理自 2026-10-07 的「制作游戏部署脚本工具」聊天，保留最终采用的命令接口与实现约定。文中的服务器地址使用示例值；原工具固定了服务器地址，迁移时需要修改脚本。

## 1. 从 scp 上传到 rsync 同步

原始操作每次都需要手动填写游戏目录：

```bash
scp -r dist/. \
  webgame@example.com:/var/www/html/games/purr-and-pour/
```

要同时支持增量和全量，最终采用 `rsync`：

| 模式 | 最终命令 | 核心参数 | 行为 |
| --- | --- | --- | --- |
| 增量 | `deploy-game inc` | `-av --delete` | 传输新增及 rsync 判定有变化的文件，删除远端多余文件 |
| 全量 | `deploy-game full` | `-av --delete --ignore-times` | 强制重新传输全部文件，删除远端多余文件 |

**两种模式都会使用 `--delete`：远端目标游戏目录中，本地 `dist/` 没有的文件会被删除。** 因此该目录应专门存放构建产物，不应混放需要保留的上传文件或手工维护内容。

这里的“全量”通过 `--ignore-times` 强制重新传输，并没有增加“先清空整个目录”的步骤。

## 2. 日常使用

先在游戏项目根目录完成构建，再选择一种部署方式：

```bash
# 按项目实际脚本构建；工具自身不会执行构建
npm run build

# 增量同步
deploy-game inc

# 强制全量同步
deploy-game full

# 隐藏提示输入 SSH 密码
deploy-game inc -p
deploy-game full -p

# 查看帮助
deploy-game --help
```

`-p` 是不带值的开关。执行 `deploy-game inc -p` 后，工具会单独提示输入密码；不要在命令末尾追加明文密码。不加 `-p` 时，由 SSH 使用已有密钥或处理认证。

部署前，工具显示模式、本地目录和远端目录，并要求确认。输入 `y` 或接受的确认形式才继续，其他输入取消部署；不指定模式时显示用法并以非零状态退出。

## 3. 当前目录如何决定远端路径

路径规则如下：

```text
当前工作目录：/path/to/purr-and-pour
本地构建目录：/path/to/purr-and-pour/dist/
远端游戏目录：/var/www/html/games/purr-and-pour/
```

核心 Bash 写法：

```bash
readonly REMOTE_HOST="webgame@example.com"
readonly REMOTE_ROOT="/var/www/html/games"
readonly PROJECT_DIR="$PWD"
readonly GAME_NAME="${PROJECT_DIR##*/}"
readonly DIST_DIR="$PROJECT_DIR/dist"
readonly REMOTE_DESTINATION="$REMOTE_HOST:$REMOTE_ROOT/$GAME_NAME/"
```

`${PROJECT_DIR##*/}` 提取路径的最后一段，达到 `basename "$PWD"` 的效果。它读取的是**执行命令时的工作目录**，所以必须在游戏项目根目录运行，不能在 `dist/` 内运行。

目录名仅允许字母、数字、点、下划线和连字符；空名称、`.`、`..` 以及含空格等不符合规则的名称会被拒绝。

## 4. 同步命令的实现要点

以下为核心同步逻辑摘录，需放在参数解析、目录检查与用户确认之后：

```bash
RSYNC_ARGUMENTS=(-av --delete -e /usr/bin/ssh)

if [[ "$MODE" == "full" ]]; then
  RSYNC_ARGUMENTS+=(--ignore-times)
fi

RSYNC_ARGUMENTS+=(-- "$DIST_DIR/" "$REMOTE_DESTINATION")
/usr/bin/rsync "${RSYNC_ARGUMENTS[@]}"
```

使用数组组装参数，避免将整个命令拼成字符串再执行。源路径 `"$DIST_DIR/"` 末尾的斜杠表示同步 `dist` 内部内容，远端不会额外套一层 `dist`。

原工具还包含以下检查和交互：

- 检查 `rsync` 是否可执行，密码模式额外检查 `/usr/bin/expect`。
- 检查当前目录下的 `dist/` 存在且非空，避免把空构建目录直接用于镜像同步。
- 拒绝未知参数、重复模式和重复 `-p`。
- 通过终端读取部署确认和密码。
- 参数、目录、认证或上传失败时返回非零状态，只有同步成功才显示成功信息。

### 密码模式

最终方案使用 Bash 隐藏读取密码，再通过文件描述符交给 `expect`。`expect` 启动 `rsync` 并响应 SSH 密码提示，避免把密码作为外部进程参数传递或直接写进命令历史。

执行结束后清除密码变量；再次遇到密码提示时按认证失败退出，避免持续重试。该方案依赖终端交互，原聊天没有实现无人值守发布流程。

## 5. 全局命令与 PATH

原聊天记录的安装位置为：

```text
~/.local/bin/deploy-game
```

同时将 `~/.local/bin` 加入了 `~/.zprofile`。若复用这一安装方式，配置内容为：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

新终端读取配置后可直接使用；已有终端可重新加载配置并检查命令位置：

```bash
source ~/.zprofile
command -v deploy-game
deploy-game --help
```

这些是使用与配置说明，本文没有附上完整可安装脚本；核心摘录也不能直接替代完整工具。原聊天记载的安装状态不代表另一台 Mac 已安装，本文整理时没有重新安装或改动终端配置。

## 6. 远端目录不存在时的行为

原方案中，缺少游戏子目录时可以由 `rsync` 创建，但前提是：

- 上级目录 `/var/www/html/games/` 已经存在。
- 部署用户对上级目录具有写权限。

例如上级目录存在而 `purr-and-pour/` 不存在，首次同步可以创建该游戏目录。如果上级目录也不存在或用户没有权限，部署会失败。原工具没有主动执行 `mkdir -p` 来创建整条远端目录链。

## 7. 排查与验证边界

| 现象 | 检查方向 |
| --- | --- |
| 找不到 `deploy-game` | 检查安装路径、可执行权限和当前终端的 `PATH` |
| 提示缺少或空 `dist/` | 确认在项目根目录运行，并先完成构建 |
| 目标游戏目录不正确 | 检查当前工作目录名称和部署前打印的路径 |
| 远端目录创建失败 | 检查上级目录是否存在、部署用户是否有写权限 |
| 密码认证失败 | 检查账号、密码和服务器认证配置；`-p` 后不附带密码值 |
| 远端旧文件消失 | 两种模式都启用了 `--delete`，先核对本地构建内容与远端目标 |

原聊天完成的是本地语法、参数、路径生成、同步参数以及正确/错误密码流程等检查，其中部署使用模拟程序验证。记录明确说明**没有连接或修改真实服务器**，因此不能据此认定真实文件的增量传输、全量传输、同步删除、远端目录创建或网页访问已经验收。

本文仅整理笔记并验证文档，不执行部署。真实环境仍需验证服务器连接、目录权限、同步结果和页面资源加载。

## 来源与延伸阅读

- [原始聊天：制作游戏部署脚本工具](codex://threads/01a11444-24a7-77c1-b96e-e7683c5139df)（需在能够访问该聊天的 Codex 客户端打开）
- [Vue + Spring Boot 部署与自动化发布](./application-deployment.md)
