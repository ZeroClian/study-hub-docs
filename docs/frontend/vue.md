---
title: Vue 3 项目搭建与 Webpack
description: 创建 Vue 3 项目、配置路由并理解 Webpack。
---

# Vue 3 项目搭建与 Webpack

把 Vue 项目初始化与构建工具基础放在同一篇入门文档中。

## 创建 Vue 3 项目

### 创建 Vue 3 项目

Vue CLI 已进入维护模式，新项目建议使用官方的 [`create-vue`](https://vuejs.org/guide/quick-start.html)（基于 Vite）：

> Vue CLI 仅建议用于维护已有项目；新项目请以 [Vue 官方快速开始](https://vuejs.org/guide/quick-start.html) 和 [Vue CLI 状态说明](https://cli.vuejs.org/) 为准。

```bash
npm create vue@latest
# 或
pnpm create vue@latest
```

如果需要维护已有的 Vue CLI 项目，再使用下面的命令：

- 安装依赖：`npm install -g @vue/cli`
- 查看安装结果：`vue --version`

![vue安装结果](https://github.com/ZeroClian/picture/blob/master/img/vue安装结果.png?raw=true)

- 升级：`npm update -g @vue/cli`
- 创建项目：`vue create admin`
- 选择相应的配置

### 安装 vue-router

- 安装依赖：`npm install vue-router@4`（或 `pnpm add vue-router@4`）
- 在 src 下新建 router 文件夹 并新建 `index.js` 文件
```js
import { createRouter, createWebHashHistory } from "vue-router";
const routes = [
    {
        path: '/',
        component: () => import('../views/HelloWorld')
    },
    {
        path: '/login',
        component: () => import('../views/login.vue')
    }
];
const router = createRouter({
    history: createWebHashHistory(),
    routes
});
export default router;
```
- main.js 修改为

```js
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

createApp(App).use(router).mount("#app");
```

### 修改配置

- 在 admin 目录下增加 `.eslintrc.js` 文件：

```js
module.exports = {
  root: true,
  env: { node: true },
  // Vue 3 项目使用 vue3-essential；若使用 Flat Config，请按 ESLint 版本改用 eslint.config.js
  extends: ["plugin:vue/vue3-essential", "eslint:recommended"],
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-undef": "off",
    "vue/no-unused-vars": "off",
    "vue/require-v-for-key": "off",
    "vue/multi-word-component-names": "off",
  },
};
```

- 在 Vue CLI 项目的 `vue.config.js` 中增加 `lintOnSave: false`（这不是 ESLint 配置）：

```js
const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
});
```

- Vue CLI 项目启动：`npm run serve`
- Vite 项目启动：`npm run dev`

## Webpack 基础

### 什么是webpack？
> webpack 是前端项目工程化的具体解决方案。

主要功能：提供友好的前端模块化开发支持，以及代码压缩混淆、浏览器端 JavaScript 兼容性处理和性能优化等能力。
