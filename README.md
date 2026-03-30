```
    一个monorepo的例子
    apps里
    其中Sub是整个项目的基座
    pageA和pageB是两个子包
    当项目第一次上线时可以在Sub里执行全量打包，相当于全局打包
    以后如果只修改了单独页面，可以在Sub里执行增量打包，只重打对应页面
    这样可以实现页面的独立部署，也可以实现全局的资源管理

    未来如果想改造成微前端，项目也已经切分好了，调整下目录，加上单独的git

    packages中
    有一个common包
    有一个utils包，将来可以单独发布使用
```

## 构建说明

首次构建或清空 `apps/Sub/dist` 后，先执行一次全量构建：

```bash
cd apps/Sub
pnpm build
```

如果后续只修改了某个子页面，可以执行增量构建：

```bash
cd apps/Sub
pnpm build -- pageA
```

也可以一次重打多个页面：

```bash
cd apps/Sub
pnpm build -- pageA pageC
```

当前构建流程会：

1. 先构建 `Sub` 自己的 host 产物。
2. 再构建指定的子页面 chunk。
3. 自动校验关键产物是否存在。

注意：

- `pnpm build -- pageA` 会复用现有的 `dist/assets/page-b.js`、`page-c.js` 等旧产物。
- 如果是第一次构建，或者 `dist` 被清空过，请先执行一次全量 `pnpm build`。
