# monorepoTest

`monorepoTest` 是一个基于 pnpm workspace 的 Vue 子应用交付工程样例。根目录维护产品配置、构建导出脚本和仓库级验证；`apps/Sub` 是基座 host；`apps/GroupA`、`apps/GroupB`、`apps/GroupC` 按 group 输出可动态加载的页面 chunk。

## 常用命令

```bash
pnpm install
pnpm start
pnpm run verify:fast
pnpm run verify:sub -- --profile customer-a
pnpm run export customer-b -- --force
```

- `pnpm start`：启动 `apps/Sub` 的 Vite dev server。
- `pnpm run build`：按 profile 构建 host 和 group chunk，默认输出到 `dists/<profile>`。
- `pnpm run verify:fast`：验证默认 profile，并验证导出工程可以独立运行。
- `pnpm run verify`：验证所有 profile 的主仓构建、导出和导出后验证。
- `pnpm run export <profile>`：按 profile 生成独立交付工程。

## 临时页面

未确定归属的页面可以先放在开发专用的 `temp` group 中。`temp` 页面在 `pnpm start` 的 dev 环境默认可见，但不会进入正式 `build`、`export` 或 `build:groupA/B/C`。

在 `apps/Sub` 中创建临时页面时，会自动完成 dev 注册：

```bash
pnpm create:page -- draft-page --group temp
```

临时页面确定归属后，在 `apps/Sub` 中执行单页迁移命令：

```bash
pnpm move:page -- draft-page --from temp --to group-a
```

迁移脚本会同步移动源码目录、更新 page 定义、更新来源/目标 group 的 `pageSlugs`，并重写两个 group app 的 `src/index.ts`。

## 配置入口

- `product/pages`：页面定义，包括 route、group、入口文件和菜单信息。
- `product/groups`：页面 group 定义，决定 group chunk 和子应用目录。
- `product/profiles`：交付 profile 定义，决定客户版本包含哪些 group 或 page。
- `apps/Sub/tooling`：group 子应用复用的 Vite 构建封装。

## 生成目录

以下目录是构建、导出或验证产生的临时结果，不应提交：

- `apps/**/dist`
- `dists/`
- `exports/`
- `.tmp/`
- `node_modules/`
