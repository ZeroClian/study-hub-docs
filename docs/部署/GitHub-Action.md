

[参考文档](https://docs.github.com/zh/actions/learn-github-actions/understanding-github-actions)



使用Github Action 持续集成与部署前端项目

### 什么是GitHub Action ？

GitHub Actions 是一种持续集成和持续交付 (CI/CD) 平台，可用于自动执行生成、测试和部署管道。 我们可以创建工作流程来构建和测试存储库的每个拉取请求，或将合并的拉取请求部署到生产环境。

GitHub Actions 不仅仅是 DevOps，还允许在存储库中发生其他事件时运行工作流程。 例如，可以运行工作流程，以便在有人在您的存储库中创建新问题时自动添加相应的标签。

GitHub 提供 Linux、Windows 和 macOS 虚拟机来运行工作流程，或者可以在自己的数据中心或云基础架构中托管自己的自托管运行器。

### 组件构成

- Workflows

  工作流程是一个可配置的自动化过程，它将运行一个或多个作业。 工作流程由签入到存储库的 YAML 文件定义，并在存储库中的事件触发时运行，也可以手动触发，或按定义的时间表触发。

  工作流程在存储库的 `.github/workflows` 目录中定义，存储库可以有多个工作流程，每个工作流程都可以执行不同的任务集。 例如，您可以有一个工作流程来构建和测试拉取请求，另一个工作流程用于在每次创建发布时部署应用程序，还有一个工作流程在每次有人打开新议题时添加标签。

  可以在另一个工作流中引用工作流。

- Events

  事件是存储库中触发工作流程运行的特定活动。例如，当有人创建拉取请求或将提交推送到存储库时触发工作流按计划运行。

- Jobs

  作业是工作流中在同一运行器上执行的一组步骤。 每个步骤要么是一个将要执行的 shell 脚本，要么是一个将要运行的动作。 步骤按顺序执行，并且相互依赖。 由于每个步骤都在同一运行器上执行，因此可以将数据从一个步骤共享到另一个步骤。 例如，可以有一个生成应用程序的步骤，后跟一个测试已生成应用程序的步骤。

  可以配置作业与其他作业的依赖关系；默认情况下，作业没有依赖关系，并且彼此并行运行。 当一个作业依赖于另一个作业时，它将等待从属作业完成，然后才能运行。 例如，对于没有依赖关系的不同体系结构，可能有多个生成作业，以及一个依赖于这些作业的打包作业。 生成作业将并行运行，当它们全部成功完成后，打包作业将运行。

- Actions

  操作是用于 GitHub Actions 平台的自定义应用程序，它执行复杂但经常重复的任务。 使用操作可帮助减少在工作流程文件中编写的重复代码量。

- Runners

  运行程序是触发工作流时运行工作流的服务器。 每个运行器一次可以运行一个作业。



### workflows

#### 触发工作流

##### 使用事件触发

推送任何分支时触发

```yml
on: push
```

推送或有人创建分支时触发（多事件）

```yml
on: [push, fork]
```

推送到存储库中的 `main` 分支或推送到启用了 GitHub Pages 的分支触发

```yaml
on:
  push:
    branches:
      - main
  page_build:
```

 使用 `on.<event_name>.types` 定义将触发工作流运行的事件活动类型

```yml
on:
  label:
    types:
      - created
```

如果指定多个活动类型，则只需要发生其中一种事件活动类型就可触发工作流。 如果触发工作流的多个事件活动类型同时发生，则将触发多个工作流运行

```yaml
on:
  issues:
    types:
      - opened
      - labeled
```

##### 使用筛选器

- 包括分支

`push` 事件具有 `branches` 筛选器，该筛选器仅在发生目标为与 `branches` 筛选器匹配的分支的推送时（而不是在发生任何推送时）运行工作流。

```yaml
on:
  push:
    branches:
      - main
      - 'releases/**'
```

- 排除分支

  当模式与 `branches-ignore` 模式匹配时，工作流将不会运行

  ```yaml
  on:
    pull_request:
      # Sequence of patterns matched against refs/heads
      branches-ignore:    
        - 'mona/octocat'
        - 'releases/**-alpha'
  ```

### Jobs

#### 创建作业

``jobs.<job_id>.name``设置作业名称，将会显示在GitHub UI中

```yaml
jobs:
  build:
    name: build project
  upload:
    name: upload dist to aliyun
```

- 定义必备作业

```yaml
jobs:
  job1:
  job2:
    needs: job1
  job3:
    needs: [job1, job2]
```

`job1` 必须在 `job2` 开始之前成功完成，并且 `job3` 等待 `job1` 和 `job2` 完成。

```yaml
jobs:
  job1:
  job2:
    needs: job1
  job3:
    if: ${{ always() }}
    needs: [job1, job2]
```

`job3` 使用 `always()` 条件表达式，确保始终在 `job1` 和 `job2` 完成（无论是否成功）后运行。

#### 选择运行器

使用 `jobs.<job_id>.runs-on` 定义要运行作业的计算机类型

目标计算机可以是 [GitHub 托管的运行器](https://docs.github.com/zh/actions/using-jobs/choosing-the-runner-for-a-job#choosing-github-hosted-runners)、[大型运行器](https://docs.github.com/zh/actions/using-jobs/choosing-the-runner-for-a-job#choosing-runners-in-a-group) 或 [自托管运行器](https://docs.github.com/zh/actions/using-jobs/choosing-the-runner-for-a-job#choosing-self-hosted-runners)

```yaml
jobs:
  build:
    name: build project
    runs-on: ubuntu-latest//选择了GitHub托管的运行器
```

若要使用自己的服务器进行运行，需要先将服务器托管到GitHub上，建议仅将自托管运行器用于私有仓库。

#### 在容器中运行

使用 `jobs.<job_id>.container` 创建用于运行作业中尚未指定容器的任何步骤的容器。 如有步骤同时使用脚本和容器操作，则容器操作将运行为同一网络上使用相同卷挂载的同级容器。

若不设置 `container`，所有步骤将直接在 `runs-on` 指定的主机上运行，除非步骤引用已配置为在容器中运行的操作。

> 注意：用于容器中的 `run` 步骤的默认 shell 是 `sh`，而不是 `bash`。 这可以使用 [`jobs.<job_id>.defaults.run`](https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_iddefaultsrun) 或 [`jobs.<job_id>.steps[*].shell`](https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell) 进行替代。

示例：

```yaml
name: CI
on:
  push:
    branches: [ main ]
jobs:
  container-test-job:
    runs-on: ubuntu-latest
    container:
      image: node:18
      env:
        NODE_ENV: development
      ports:
        - 80
      volumes:
        - my_docker_volume:/volume_mount
      options: --cpus 1
    steps:
      - name: Check for dockerenv file
        run: (ls /.dockerenv && echo Found dockerenv) || (echo No dockerenv)
```

只指定容器映像时，可以忽略 `image` 关键词。

```yaml
jobs:
  container-test-job:
    runs-on: ubuntu-latest
    container: node:18
```

使用 `jobs.<job_id>.container.options` 配置其他 Docker 容器资源选项。 有关选项列表，请参阅“[`docker create` 选项](https://docs.docker.com/engine/reference/commandline/create/#options)”。

> **警告：** 不支持 `--network` 和 `--entrypoint` 选项。



#### 设置作业的默认值

将应用于工作流程中的所有作业或作业中所有步骤的默认设置。

设置默认 shell 和工作目录

可以使用 `defaults.run` 为工作流中的所有 [`run`](https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun) 步骤提供默认的 `shell` 和 `working-directory` 选项。

作用于全部

```yaml
defaults:
  run:
    shell: bash
    working-directory: ./scripts
```

作用于某个作业

```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: bash
        working-directory: ./scripts
```



### steps

作业执行的脚本，将按顺序执行

常用参数

- name：标识一个新的脚本

- uses：使用其他工作流文件
  - with：设置所需参数，具体看该工作流文件的使用说明
- run：执行脚本
- env：设置环境变量

单个脚本内可以使用 `env`

示例：

```yaml
jobs:
  example-job:
    runs-on: ubuntu-latest
    steps:
      - name: Connect to PostgreSQL
        run: node client.js
        env:
          POSTGRES_HOST: postgres
          POSTGRES_PORT: 5432
      - name: Check out the repository to the runner
        uses: actions/checkout@v4  
      - name: Make the script files executable
        run: chmod +x my-script.sh my-other-script.sh
      - name: Run the scripts
        run: |
          ./my-script.sh
          ./my-other-script.sh
```
