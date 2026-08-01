---
title: Electron 从入门到项目开发
description: Electron 快速开始、项目起步和常用开发组件。
---

# Electron 从入门到项目开发

按认识 Electron、启动项目、进入业务开发的顺序合并原有笔记。

## 初识 Electron

### 一、快速开始

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
{
  "scripts": {
    "dev": "nodemon --watch main.js --exec \"electron .\""
  }
}
```

> 出现安装electron缓慢的问题
>
> ```bash
> npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
> ```

- react
```bash
# Create React App 适合维护旧项目；新项目可使用 Vite：npm create vite@latest
npx create-react-app xxx
```

- axios
```bash
npm install axios --save
```

## 项目起步

安装项目依赖

```bash
npx create-react-app zero-doc
cd zero-doc
npm install electron --save-dev
# 并行命令工具
npm install concurrently --save-dev
# 等待工具
npm install wait-on --save-dev
# 跨平台工具
npm install cross-env --save-dev
# 安装样式库
npm install bootstrap@4.3.1 --save
# 安装图标库
npm i --save @fortawesome/fontawesome-svg-core
npm i --save @fortawesome/free-solid-svg-icons
npm i --save @fortawesome/free-brands-svg-icons
npm i --save @fortawesome/react-fontawesome
# 拼接classNames
npm install classnames --save
# 自定义 CSS 文件依赖（node-sass 已弃用，使用 sass）
npm install sass --save
# 安装md插件
npm install --save react-simplemde-editor easymde
# uuid
npm install --save uuid
```

根目录下新建`main.js`文件

```javascript
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
let mainWindow

ipcMain.handle('app:get-version', () => app.getVersion())

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'))
  }
})
```

由于开启了 `contextIsolation` 并关闭了 `nodeIntegration`，还需要创建 `preload.js`，通过 `contextBridge` 只暴露必要的安全 API；不要把 Node.js 能力直接暴露给渲染进程。

`preload.js` 的最小示例：

```javascript
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
});
```

主进程还需要用 `ipcMain.handle("app:get-version", () => app.getVersion())` 注册对应处理器；只暴露明确的方法，不要把 `ipcRenderer` 或 `require` 整体挂到 `window` 上。

修改`package.json`文件

```json
{
"version": "0.1.0",
"main": "main.js",
"scripts": {
  "dev": "concurrently \"wait-on http://localhost:3000 && electron .\" \"cross-env BROWSER=none npm start\""
}
}
```

启动项目：`npm run dev`

## 开发记录

使用 fortawesome 

- 引入

```javascript
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
```

- 使用

```javascript
<FontAwesomeIcon 
    title='搜索'
    size='lg'
	icon={faSearch} />
```

使用PropTypes进行类型检查

- 引入

```javascript
import PropTypes from 'prop-types'
```

- 使用

```javascript
FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired
}
```
