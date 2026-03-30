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

如果只想重打宿主壳，不构建任何子页面：

```bash
cd apps/Sub
pnpm build:host
```

如果只想重打某个子页面，不重打宿主壳：

```bash
cd apps/Sub
pnpm build:pageA
```

当前构建流程会：

1. 先构建 `Sub` 自己的 host 产物。
2. 再构建指定的子页面 chunk。
3. 自动校验关键产物是否存在。

注意：

- `pnpm build -- pageA` 会复用现有的 `dist/assets/page-b.js`、`page-c.js` 等旧产物。
- 如果是第一次构建，或者 `dist` 被清空过，请先执行一次全量 `pnpm build`。
- `pnpm build:pageA` 不会重打 host，适合只修改 `PageA` 组件内容时快速验证。
