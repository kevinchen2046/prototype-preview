# Prototype Preview

公开的 HTML 游戏原型与交互 Demo 预览中心。

- 导航页：[https://kevinchen2046.github.io/prototype-preview/](https://kevinchen2046.github.io/prototype-preview/)
- AI 文明演化第一章：[https://kevinchen2046.github.io/prototype-preview/ai-civilization/](https://kevinchen2046.github.io/prototype-preview/ai-civilization/)

> 上述地址需 **GitHub Pages 部署成功** 才能访问。配置：**Settings → Pages → Build and deployment → Source: GitHub Actions**。

## 目录约定

```text
index.html                 公共 Demo 导航页
ai-civilization/index.html AI 文明演化 HTML V0.1
[project]/index.html       后续其它游戏原型
demos/[demo]/index.html    可复用的组件或交互 Demo
.github/workflows/pages.yml  GitHub Pages 发布流程
```

只存放**允许公开**的前端交互原型和相关图片资产，**不复制私有仓库的游戏源码、机密文档、凭据或密钥**。本仓库的 HTML 是展示副本，正式业务逻辑仍由原开发仓库维护。

## 如何更新

修改原型目录文件并推送到 `main` 即触发 GitHub Pages 自动部署。新增游戏原型后，在根目录 `index.html` 添加入口卡片。

当前 AI 文明演化为独立浏览器交互线框：六个地点、二维地图、科研、工程、零和事件；经济参数是示例数据，不代表正式数值模型。
