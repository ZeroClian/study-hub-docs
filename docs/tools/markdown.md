---
title: Markdown 语法速查
description: Markdown 标题、文本、列表、链接、代码和表格语法。
---

# Markdown 语法速查

常用 Markdown 写法的集中速查表。

## 标题
```
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

## 文本样式
*强调文本* _强调文本_ `*强调文本* _强调文本_`

**加粗文本** __加粗文本__ `**加粗文本** __加粗文本__`

==标记文本==  `==标记文本==`（需要主题或插件支持，并非所有 Markdown 渲染器都支持）

~~删除文本~~  `~~删除文本~~`

> 引用文本

H~2~O 是液体。  `H~2~O 是液体。`（下标语法取决于渲染器）

2^10^ 运算结果是 1024。 `2^10^ 运算结果是 1024。`（上标语法取决于渲染器）

## 列表

- 项目
  * 项目
    + 项目

1. 项目1
2. 项目2
3. 项目3

- [ ] 计划任务
- [x] 完成任务

```
- [ ] 计划任务
- [x] 完成任务
```

## 链接

链接: [link](https://www.csdn.net/).

图片: ![Alt](/images/study-hub-logo.webp)

缩放图片40%：`<img src="/images/study-hub-logo.webp" style="zoom:40%;" />`

## 代码

下面展示一些 `内联代码片`。

```
// A code block
var foo = 'bar';
```

```javascript
// An highlighted block
var foo = 'bar';
```

## 表格
项目     | Value
-------- | ------
电脑  | $1600
手机  | $12
导管  | $1

| Column 1 | Column 2      |
|:--------:| -------------:|
| centered 文本居中 | right-aligned 文本居右 |

```
项目     | Value
-------- | ------
电脑  | $1600
手机  | $12
导管  | $1

| Column 1 | Column 2      |
|:--------:| -------------:|
| centered 文本居中 | right-aligned 文本居右 |
```


## 注释
Markdown 将文本转换为 HTML。下面是不会显示在页面上的 HTML 注释：
```
<!-- 这是一条 Markdown/HTML 注释 -->
```
