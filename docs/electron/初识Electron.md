

#### 一、快速开始

```bash
# 克隆示例仓库
git clone https://github.com/electron/electron-quick-start
# 进入项目
cd electron-quick-start
# 安装依赖并运行
npm install && npm start
```

- 安装`nodemon`

```bash
# 全局安装
npm install -g nodemon
# 开发环境安装
npm install nodemon --save-dev
```

- 修改配置`package.json`

```json
odemon --watch main.js --exec \"electron .\"
```

> 出现安装electron缓慢的问题
>
> ```bash
> npm config set ELECTRON_MIRROR https://npm.taobao.org/mirrors/electron/
> ```

