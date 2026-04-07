# Sub Host

`Sub` 是当前 demo 的基座 host，负责：

- 路由入口
- 布局容器
- 运行时公共依赖
- 动态加载各个 page 产物
- 承载 `product` 配置真源，统一管理页面注册表和客户 profile

仓库整体结构、页面接入方式和后续 export 设计说明见根目录 [README.md](../../README.md)。
