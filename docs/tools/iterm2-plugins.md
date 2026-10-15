---
title: iTerm2 插件常用命令速查
description: 当前已安装的 fzf、zoxide、fzf-tab、Git 别名、历史命令、解压插件与 Powerlevel10k 使用笔记。
---

# iTerm2 插件常用命令速查

按本机 2026-10-15 的配置整理：iTerm2 + Oh My Zsh + Powerlevel10k。以下增强主要由 Zsh 插件和命令行工具提供，新开终端标签页即可加载。

## 最常用的几个操作

| 想做什么 | 操作 | 说明 |
| --- | --- | --- |
| 找以前执行过的命令 | `Ctrl + R` | 输入关键词，选择历史命令 |
| 找文件或目录并填入路径 | `Ctrl + T` | 搜索当前目录下的文件和目录 |
| 补全命令、路径或分支 | `Tab` | 出现候选列表后，继续输入关键词筛选 |
| 接受灰色命令建议 | 光标在行尾按 `→` | 填入建议内容，再按回车执行 |
| 跳转常用目录 | `z 关键词` | 例如 `z study-hub` |
| 从多个目录中选择 | `zi 关键词` | 例如 `zi game` |

fzf 搜索列表中可以用 `↑` / `↓` 选择，`Enter` 确认，`Esc` 取消。`Ctrl + R` 确认后会把命令填回输入行，再按一次回车才执行；`Ctrl + T` 和 Tab 补全确认后也只填入内容。

## zoxide：快速切目录

```zsh
z study-hub           # 跳到匹配 study-hub 的常用目录
z game hub            # 用多个关键词缩小匹配范围
zi game               # 列出匹配目录，手动选择
z -                   # 回到上一个目录
z ..                  # 返回上级目录
```

第一次访问目录时先用 `cd 完整路径`，之后就可以用 `z 关键词`。它会逐渐记住访问过的目录；没有匹配时，先确认是否已经进入过该目录。

## fzf-tab：可搜索的 Tab 补全

先输入下面的内容，再按 `Tab`：

```zsh
cd ~/Documents/       # 补全目录
git switch           # 在 switch 后加空格，补全本地分支
git add              # 在 add 后加空格，补全文件
```

有多个候选时，输入关键词筛选，再用方向键和回车确认。只有一个匹配项时可能直接补全。

## Git 插件：常用缩写

在 Git 仓库目录中使用：

| 缩写 | 等价命令 | 用途 |
| --- | --- | --- |
| `gst` | `git status` | 查看工作区状态 |
| `gss` | `git status --short` | 简短查看变更文件 |
| `gd` | `git diff` | 查看尚未暂存的修改 |
| `gds` | `git diff --staged` | 查看已暂存的修改 |
| `glog` | `git log --oneline --decorate --graph` | 查看简洁提交图 |
| `ga 文件名` | `git add 文件名` | 暂存指定文件 |
| `gaa` | `git add --all` | 暂存全部新增、修改和删除 |
| `gcmsg "说明"` | `git commit -m "说明"` | 提交已暂存的修改 |
| `gcb 分支名` | `git checkout -b 分支名` | 创建并切换分支 |
| `gl` | `git pull` | 拉取并整合远程变更 |
| `gp` | `git push` | 推送当前分支 |

记不住缩写时，输入 `alias gst` 就能查看它对应的完整命令。更完整的流程见 [Git 日常工作流](../devops/git/daily-workflow.md)。

## history 与 extract：查历史、解压

```zsh
h                     # 查看近期历史命令
hl                    # 分页查看历史，按 q 退出
hs docker             # 查找包含 docker 的历史命令
hsi docker            # 忽略大小写查找

extract archive.zip   # 解压 ZIP
extract archive.tar.gz # 解压 tar.gz
```

平时找历史命令优先用 `Ctrl + R`。`extract` 会根据后缀选择解压工具，部分格式需要额外安装对应工具。

## 自动建议、语法高亮与主题

| 已安装项目 | 平时怎么用 |
| --- | --- |
| zsh-autosuggestions | 输入命令时显示灰色历史建议，在行尾按 `→` 接受 |
| zsh-syntax-highlighting | 输入时自动高亮；颜色用于辅助识别命令，不代表命令执行一定成功 |
| Powerlevel10k | 自动显示目录、Git 等提示信息；输入 `p10k configure` 可重新配置主题 |

## 配置与排查

插件列表保存在 `~/.zshrc` 的 `plugins=(...)` 中，主题配置在 `~/.p10k.zsh`。

```zsh
type z zi extract     # 检查目录跳转和解压函数是否加载
alias gst             # 检查 Git 别名
fzf --version         # 查看 fzf 版本
zoxide --version      # 查看 zoxide 版本
```

快捷键或命令未生效时，先新开一个 iTerm2 标签页，再执行上面的检查。

参考：[fzf](https://github.com/junegunn/fzf#key-bindings-for-command-line) · [zoxide](https://github.com/ajeetdsouza/zoxide#getting-started) · [fzf-tab](https://github.com/Aloxaf/fzf-tab#usage) · [Oh My Zsh 插件](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins)
