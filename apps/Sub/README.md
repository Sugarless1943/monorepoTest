# Sub Host

`Sub` 是当前 demo 的基座 host，负责：

- 路由入口
- 布局容器
- 运行时公共依赖
- 动态加载各个 page 产物
- `product` 真源
- 交付工程脚本

`product`、`scripts` 和 `tooling` 的仓库级说明见根目录 [README.md](../../README.md)。

在 `apps/Sub` 目录里可以直接执行：

```bash
pnpm verify
```

这个命令会验证当前工程的 `build + check-dist + preview smoke`，但不会执行 `export`。

如果要在当前 Sub 体系里新增一个 page，也可以直接执行：

```bash
pnpm create:page -- page-f
```

这个命令只会生成 page 骨架和 `apps/Sub/product/pages/page-f.js`，不会自动改 `apps/Sub/product/pages/index.js` 或任何 profile。

这些和交付工程直接相关的能力现在都在 `apps/Sub/scripts` 下，例如：

- `apps/Sub/scripts/build.js`
- `apps/Sub/scripts/check-dist.js`
- `apps/Sub/scripts/createPage.js`
- `apps/Sub/scripts/verify.js`

如果当前是在主仓里，确实想验证某个特定 profile，也可以额外传 `--profile customer-a` 这类参数；但导出工程一般只需要直接执行 `pnpm verify`，因为它默认只保留当前交付工程自己的 `default` profile。

更完整的主仓级验证说明见根目录 [README.md](../../README.md)。
