# Sub Host

`Sub` 是当前 demo 的基座 host，负责：

- 路由入口
- 布局容器
- 运行时公共依赖
- 动态加载各个 page 产物

`product`、`scripts` 和 `tooling` 的仓库级说明见根目录 [README.md](../../README.md)。

在 `apps/Sub` 目录里可以直接执行：

```bash
pnpm verify
```

这个命令会验证当前工程的 `build + check-dist + preview smoke`，但不会执行 `export`。

如果当前是在主仓里，确实想验证某个特定 profile，也可以额外传 `--profile customer-a` 这类参数；但导出工程一般只需要直接执行 `pnpm verify`，因为它默认只保留当前交付工程自己的 `default` profile。

更完整的主仓级验证说明见根目录 [README.md](../../README.md)。
