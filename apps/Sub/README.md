# Sub Host

`Sub` 是当前工程的基座 host，负责：

- 路由入口
- 布局容器
- 运行时公共依赖
- 动态加载各个 page 产物
- 交付工程脚本

根目录 `product`、`scripts` 和 `apps/Sub/tooling` 的仓库级说明见根目录 [README.md](../../README.md)。

在 `apps/Sub` 目录里可以直接执行：

```bash
pnpm verify
```

这个命令会验证当前工程的 `build + check-dist + preview smoke`，但不会执行 `export`。

如果要在当前 Sub 体系里新增一个 page，也可以直接执行：

```bash
pnpm create:page -- page-7 --group group-c
```

这个命令只会生成 page 骨架和 `product/pages/page-7.js`，不会自动改 `product/pages/index.js`、group 定义或任何 profile。

未确定最终归属的页面可以先创建到 `temp` group：

```bash
pnpm create:page -- draft-page --group temp
```

这个命令会生成 page 骨架、注册 `product/pages/index.js`、加入 `product/groups/temp.js`，并更新 `apps/Temp/src/index.ts`。`temp` group 只服务 dev 环境：`pnpm dev` 默认可见，正式 `build`、`export` 和 `build:groupX` 都不会包含它。

页面确定归属后，可以在 `apps/Sub` 中迁移：

```bash
pnpm move:page -- draft-page --from temp --to group-a
pnpm move:page -- draft-page --to group-a
```

`move:page` 一次只迁移一个页面；`--from` 是可选安全校验，传入时必须和页面当前 group 一致。迁移脚本会移动源码目录，更新 `product/pages/<page>.js`，更新两个 group 的 `pageSlugs`，并重写来源和目标 app 的 `src/index.ts`。

这些和交付工程直接相关的能力现在都在 `apps/Sub/scripts` 下，例如：

- `apps/Sub/scripts/build.js`
- `apps/Sub/scripts/check-dist.js`
- `apps/Sub/scripts/createPage.js`
- `apps/Sub/scripts/movePage.js`
- `apps/Sub/scripts/verify.js`

如果当前是在主仓里，确实想验证某个特定 profile，也可以额外传 `--profile customer-a` 这类参数；但导出工程一般只需要直接执行 `pnpm verify`，因为它默认只保留当前交付工程自己的 `default` profile。

更完整的主仓级验证说明见根目录 [README.md](../../README.md)。
