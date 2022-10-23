### 安装 Vue-Cli

- 安装依赖：`npm install -g @vue/cli` or `cnpm install -g @vue/cli`
- 查看安装结果： `vue --version`

![vue安装结果](http://cdn.liancode.top/img/vue安装结果.png)

- 升级： `npm update -g @vue/cli`
- 创建项目：`vue create admin`
- 选择相应的配置

### 安装 vue-router

- 安装依赖：`npm install vue-router@4` or `yarn add vue-router@4`
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
import { createApp } from 'vue'
import App from './App.vue'
import router from "./router";
createApp(App).use(router).mount('#app')
  ```

### 修改配置

- 在 admin 目录下增加 `.eslintrc.js` 文件
  ```js
module.exports = {
    root: true,
    env: {
        node: true
    },
    'extends': [
        'plugin:vue/essential',
        'eslint:recommended'
    ],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-undef': 'off',
        'vue/no-unused-vars': 'off',
        'vue/require-v-for-key': 'off',
        'vue/multi-word-component-names': 0,
    },
    parserOptions: {
        // parser: 'babel-eslint'
    }
};
  ```

- 增加配置 `lintOnSave: false` 如下所示：
  ```js
  module.exports = defineConfig({
    transpileDependencies: true,
    lintOnSave: false
  })
  ```
- 启动：`npm run serve`
