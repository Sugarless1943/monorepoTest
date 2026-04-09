# Monorepo Demo

这个仓库用于验证一套适合业务中后台项目的 `monorepo + host/page` 结构。

当前目标不是一次性重写现有 monolithic 项目，而是先把它作为一个演进式方案：

- 保留一个统一的源码仓库作为主干。
- 以 `Sub` 作为基座 host。
- 把业务页面按模块逐步拆成独立 page。
- 让页面可以独立构建、按需组合，最终支持按客户导出交付。

## 目录结构

```txt
.
├── scripts          # export 和根级 wrapper
├── apps
│   ├── Sub
│   │   ├── product  # 页面注册表、客户 profile、resolver 真源
│   │   ├── scripts  # 会跟着 Sub 一起交付的 build/check/createPage/verify
│   │   └── tooling  # page 构建辅助工具，例如 Vite 配置工厂和插件
│   ├── PageA        # 业务页面 A
│   ├── PageB        # 业务页面 B
│   ├── PageC
│   ├── PageD
│   └── PageE
├── packages
│   ├── components  # 可复用组件
│   └── utils       # 可复用工具
├── package.json
└── pnpm-workspace.yaml
```

约定上：

- `apps/*` 放可运行应用或可独立接入 host 的业务页面。
- `packages/*` 放可复用能力，未来可以逐步抽出来发布给别的项目使用。
- 根仓库通过 `pnpm workspace` 管理依赖和联调。

## 当前结构说明

### Host 和 Page 的职责

- `apps/Sub` 是基座 host，负责整体布局、路由入口、公共依赖和运行时容器。
- `apps/Sub/product` 是页面和客户配置的真源。
- `apps/Sub/scripts` 是会被交付工程一起带走的运行/验证脚本。
- `apps/PageA` 到 `apps/PageE` 是业务页面，后续会继续扩展。
- 开发态下，host 直接从 workspace 中按源码懒加载 page。
- 生产构建时，每个 page 会被构建成独立 chunk，再由 host 在运行时按路由动态加载。

这种结构适合把一个 monolithic 项目按页面逐步迁移进来：

- 第一阶段先把一个页面独立出来，接入 `Sub`。
- 第二阶段持续把其他页面逐步拆入 `apps/*`。
- 公共组件、工具、通用逻辑沉淀到 `packages/*`。
- 等页面拆分稳定后，再补上按客户组合和导出交付能力。

### 为什么这样设计

- 保留单一源码仓，避免客户版本分叉后难以回收变更。
- 页面拆分粒度明确，适合渐进式迁移老项目。
- host 提供稳定运行时，page 只关注自身业务。
- 未来可以根据客户需要组合页面，而不是维护多套长期分支。

## 当前构建方式

如果要在仓库根目录直接生成某个客户可部署的交付包，可以执行：

```bash
pnpm build customer-a
```

默认输出到：

```txt
dists/
  customer-a/
```

如果需要自定义输出目录，也可以追加：

```bash
pnpm build customer-a --output-dir dists/customer-a-portal
```

这个根级 `build` 会按 profile 调用 `apps/Sub` 的现有构建链路，然后把本次产物整理到独立目录，适合直接交付部署。

如果是在日常开发里直接调试 `Sub` 的构建细节，仍然可以在 `apps/Sub` 下执行这些命令：

首次构建或清空 `apps/Sub/dist` 后，先执行一次全量构建：

```bash
cd apps/Sub
pnpm build
```

如果后续只修改了某个子页面，可以执行增量构建：

```bash
cd apps/Sub
pnpm build -- page-a
```

也可以一次重打多个页面：

```bash
cd apps/Sub
pnpm build -- page-a page-c
```

如果要按客户 profile 构建：

```bash
cd apps/Sub
pnpm build -- --profile customer-a
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
4. 清理未选中的 page chunk，避免旧产物混入当前 build。

注意：

- page selector 目前兼容 `page-a`、`pageA`、`PageA` 等写法，但后续统一以 `page-a` 这类 `slug` 为准。
- `apps/Sub` 直跑构建时，产物仍然落在 `apps/Sub/dist`。
- 根目录执行 `pnpm build customer-a` 时，会额外整理一份独立交付产物到 `dists/customer-a`。

## Verify 命令

仓库里现在有两层 `verify`，分别负责不同边界的问题。

### 1. 根目录 `verify`

在仓库根目录执行：

```bash
pnpm verify
```

它验证的是“主仓整条链路是否还通”，包括：

1. 跑一次 `Sub verify`
2. 执行一次 `export`
3. 把导出工程放到 `.tmp/verify/exports/*`
4. 在导出工程里执行 `pnpm install`
5. 再跑一次导出工程自己的 `pnpm verify`

这个命令适合在改了下面这些内容之后执行：

- `apps/Sub/product/*`
- `scripts/*`
- `apps/Sub/tooling/*`
- 各个 `apps/Page*/vite.config.js`
- `package.json`
- `apps/Sub/package.json`

常用变体：

```bash
# 只验证一个 profile
pnpm verify -- --profile customer-a

# 快速模式，目前默认只跑 default
pnpm verify:fast
```

### 2. 根目录 `verify:sub`

在仓库根目录执行：

```bash
pnpm verify:sub -- --profile customer-a
```

它只验证当前主仓里的 `Sub` 交付链路，不做 `export`。覆盖内容包括：

1. build
2. check-dist
3. preview 启动
4. 首页、当前 profile 下全部 page 路由和 legacy route 的 smoke check

这个命令适合在你只想确认“当前 host + page 构建和预览是否正常”时执行。

### 3. `apps/Sub` 里的 `verify`

在 `apps/Sub` 目录执行：

```bash
pnpm verify
```

它和根目录的 `pnpm verify:sub` 是同一层语义，只是入口位置不同。适合已经进入 `apps/Sub` 目录时直接使用。

如果当前是在主仓里，确实想验证某个特定 profile，也可以显式传参：

```bash
pnpm verify -- --profile customer-a
```

### 4. 导出工程里的 `verify`

导出后的项目根目录也会带上：

```bash
pnpm verify
```

但这里的语义和主仓根目录不同。导出工程里的 `verify` 只验证当前交付工程自身是否还能：

- build
- check-dist
- preview

它不会再做二次 `export`，因为导出工程本身已经不是主仓了。通常也不需要再传 `--profile`，因为导出工程默认只保留当前交付包自己的 `default` profile。

## 页面接入约定

当前每个 page 都是一个独立 app 目录，最小结构类似下面这样：

```txt
apps/PageA
├── package.json
├── src
│   ├── index.ts
│   └── index.vue
└── vite.config.js
```

接入时遵循下面几个原则：

- 每个 page 只暴露一个 host 可加载的默认入口。
- 页面构建配置尽量通过公共工厂函数复用，避免每个 page 复制一套配置。
- 页面本身尽量少关心 host 细节，只约定必要的运行时接口。
- 页面间不直接耦合，共享能力优先沉淀到 `packages/*`。

### 新增 Page

在仓库根目录执行：

```bash
pnpm create:page -- page-f
```

如果已经进入 `apps/Sub` 目录，也可以直接执行：

```bash
pnpm create:page -- page-f
```

这个脚本会把“新增一个 page”收敛成一次命令，默认完成下面几件事：

- 生成 `apps/PageF/` 目录和基础文件
- 生成 `apps/Sub/product/pages/page-f.js`

脚本不会自动改 `apps/Sub/product/pages/index.js`，也不会自动改 `apps/Sub/product/profiles/*.js`。新增 page 之后，它只是“待接入的候选页面”；是否真正注册进系统、是否进入 `default`、`customer-a` 这类 profile，仍然由维护者手动控制。

#### 参数含义

- `slug`
  必填。页面主标识，例如 `page-f`。其他名字都会从它推导，例如 `PageF`、`pageF`、`@monorepo/page-f`、`apps/PageF`。
- `title`
  可选。页面展示名称，会影响菜单文案；如果不传，默认会退回成 `PageF` 这类 PascalCase 名字。
- `order`
  可选。页面排序权重，影响菜单和页面列表顺序；如果不传，脚本会自动使用“当前最大 order + 10”。

#### 新增后的人工步骤

即使有了 `createPage` 脚本，新增 page 后通常仍然需要人工做三件事：

1. 把新 page 注册进 `apps/Sub/product/pages/index.js`
2. 决定这个 page 要不要加入某个 profile
3. 跑一次验证，例如 `pnpm verify:sub -- --profile default`

## 下一阶段设计

当前 demo 已经落了一层配置驱动的装配基础，代码位置在 `apps/Sub/product`，核心是三部分：

```txt
apps/Sub/product
├── pages/       # 页面注册表
├── profiles/    # 客户 profile
├── resolver.js  # 解析路由、菜单、构建计划、导出计划
└── index.js
```

### 1. 页面注册表

页面注册表负责描述“系统里有哪些可装配页面”。

每个页面只维护一个统一主标识，后续计划统一成 `slug` 形式，例如：

```txt
page-a
page-b
page-c
```

当前 demo 仓库里页面目录还是 `PageA`、`PageB` 这种写法，后续会在注册表落地时逐步统一为 `page-a` 这类 `slug` 命名。

其他信息都从这个主标识推导，例如：

- 路由 path
- chunk 文件名
- package name
- app 目录名
- 展示名称

这样可以避免在代码里同时维护 `pageA`、`PageA`、`page-a` 三套命名。

### 2. 客户 Profile

客户 profile 负责描述“某个客户启用哪些页面”。

例如：

```txt
customer-a = [page-a, page-b, page-c]
customer-b = [page-a, page-b, page-d]
```

profile 后续除了页面清单外，也可以承载：

- 品牌名
- 默认主题
- 部署配置
- 运行时开关

### 3. Resolver

resolver 负责把页面注册表和客户 profile 解析成：

- host 路由
- 左侧菜单
- 需要构建的页面列表
- 需要导出的源码清单

这样后续无论是本地运行、打包，还是对客户导出，都使用同一份配置真源。

当前已经接入 resolver 的位置包括：

- `apps/Sub/src/runtime/productProfile.js`
- `apps/Sub/src/router/index.js`
- `apps/Sub/src/components/Layout.vue`
- `apps/Sub/scripts/build.js`
- `apps/Sub/scripts/check-dist.js`
- `apps/Page*/vite.config.js`

## 维护入口

如果后面有人要接手这个仓库，建议先建立一个简单心智模型：

- `apps/Sub/src` 是 host 运行时代码
- `apps/Sub/product` 是页面和客户配置的真源
- `scripts` 是围绕真源做 build、check、export 的仓库级脚本
- `apps/Sub/tooling` 是给各 page 复用的构建辅助模块

维护 build/export 相关问题时，推荐先看 `apps/Sub/product`，再看 `apps/Sub/scripts`，最后看 `apps/Sub/tooling`。因为脚本本质上是在消费 `Sub` 里的页面注册表和 profile 配置。

跨目录 import 现在优先使用仓库级别名：

- `#product`
- `#tooling/*`

根目录脚本直接通过根 `package.json#imports` 解析；`apps/Sub` 直接从自己的 `product/` 和 `tooling/` 读取；各 page 包则通过各自包内的 `.imports/*` 轻量转发，避免反复写很多层 `../../`。

### `scripts` 关键文件

- `scripts/build.js`
  根目录部署产物入口。按 profile 调用 `apps/Sub` 的 build，再把结果复制到 `dists/<profile>`，用于客户现场部署。
- `scripts/export.js`
  导出入口。按 profile 裁剪一个可独立交付的源码包，里面会做文件复制、workspace 依赖收集、`package.json` 改写、`product` 配置裁剪，以及 README 和 manifest 生成。
- `scripts/runSubPackageScript.js`
  根目录到 `apps/Sub` 的转发入口。根 `package.json` 和导出工程根目录会通过它调用 `Sub` 自己的 build、create:page、verify 等脚本。
- `scripts/syncSubDist.js`
  根目录 `dist/` 同步工具。主要给 `build:sub` 和导出工程复用，用于把 `apps/Sub/dist` 同步到仓库根目录，保证根目录也能直接预览。
- `apps/Sub/tooling/createSubPageViteConfig.js`
  page 子应用构建配置工厂。统一输出目录、chunk 文件名和 `vue` external 的构建约定。
- `apps/Sub/tooling/subPageBuildPlugin.js`
  page 构建后的补充处理插件。负责把 page CSS 内联回对应 JS，并做一次 esbuild 压缩，保证 host 侧按约定加载。

当前根目录 `scripts` 主要负责 build/export 和根级 wrapper；真正会跟着 Sub 一起交付的 build/check/createPage/verify 能力在 `apps/Sub/scripts`。

### `apps/Sub/scripts` 关键文件

- `apps/Sub/scripts/build.js`
  Sub 交付工程的构建入口。先构建 host，再按选中的 page 逐个进入子应用执行 `pnpm build`，最后跑一次产物校验。
- `apps/Sub/scripts/check-dist.js`
  Sub 交付工程的产物校验脚本。检查 `dist` 中关键文件是否存在，同时确认没有混入当前 profile 不应该出现的 page 资源。
- `apps/Sub/scripts/createPage.js`
  Sub 交付工程里的 page 脚手架入口。根据一个 page slug 自动生成 `apps/PageX` 和 `apps/Sub/product/pages/page-x.js`，但页面注册和 profile 配置仍然手动维护。
- `apps/Sub/scripts/verify.js`
  Sub 交付工程的自检入口。串起 `build + check-dist + preview smoke`，用于主仓和导出工程的统一验证。
- `apps/Sub/scripts/lib/args.js`
  Sub build/check/verify 共用的参数解析工具，主要处理 `--profile` 和页面选择器。

### `apps/Sub/product` 关键文件

- `apps/Sub/product/index.js`
  `product` 层统一出口。外部脚本和运行时代码通常从这里获取页面、profile 和 resolver 能力。
- `apps/Sub/product/case.js`
  slug 到 `camelCase`、`PascalCase` 的命名转换工具。
- `apps/Sub/product/definePage.js`
  页面定义工厂。把 page 的原始配置补齐成标准结构，比如 `routePath`、`chunkFileName`、`appDir`。
- `apps/Sub/product/defineProfile.js`
  profile 定义工厂。统一 `extends`、`pages`、`runtimeConfig` 的结构。
- `apps/Sub/product/pages/index.js`
  页面注册表。集中维护全部 page，并提供 `getPage`、`resolvePageSelectors`、`listPageAssetFileNames` 等能力。
- `apps/Sub/product/pages/page-*.js`
  单个页面配置文件。描述标题、路由、chunk 文件名、所属 app 目录等元信息。
- `apps/Sub/product/profiles/index.js`
  profile 注册表。集中维护全部客户 profile，并提供 `getProfile`、`getAllProfiles` 等能力。
- `apps/Sub/product/profiles/*.js`
  单个客户 profile 配置文件。定义某个客户启用了哪些页面、显示名称是什么、运行时配置如何覆盖。
- `apps/Sub/product/resolver.js`
  `product` 的核心编排层。负责 profile 继承合并、页面排序、唯一性校验，以及生成 build/export 所需 plan。

可以把 `product` 理解成“规则真源”，把 `scripts` 理解成“基于真源执行动作”，把 `apps/Sub/tooling` 理解成“给 page 复用的构建工具层”。

### 推荐阅读顺序

1. 先看 `apps/Sub/product/definePage.js` 和 `apps/Sub/product/defineProfile.js`，理解 page/profile 的标准结构。
2. 再看 `apps/Sub/product/pages/index.js` 和 `apps/Sub/product/profiles/index.js`，理解注册表组织方式。
3. 然后看 `apps/Sub/product/resolver.js`，理解 build/export plan 是怎么生成的。
4. 最后看 `apps/Sub/scripts/build.js`、`apps/Sub/scripts/check-dist.js` 和 `scripts/export.js`，理解这些 plan 是怎么被消费的。

### 4. Build 和 Export 的边界

现在已经把“面向部署”和“面向交付”的动作拆开：

- `build`：面向部署，产出可运行的构建结果，例如 `dist`、制品目录或镜像上下文。
- `export`：面向源码交付，产出一个裁剪后的独立项目，供客户私有云部署、审计或二次开发。

两者的边界建议固定如下：

- `build` 不复制源码，不改工程名，重点是生成可部署产物。
- `export` 复制并裁剪源码，重点是生成一个可以独立安装、独立构建、独立交付的新项目。
- `build` 依赖 profile 决定“打哪些页面”。
- `export` 依赖 profile 决定“带哪些源码”。
- 同一个 `profile` 可以同时支持 `build` 和 `export`，但两个动作的输出目录和产物语义必须分开。

当前命令语义如下：

```bash
# 生成客户部署产物
pnpm build customer-a

# 导出客户源码项目
pnpm export customer-a
```

## 当前 Build 方式

根目录 `build` 会按客户 profile 生成一份干净的部署产物，而不是把不同客户结果长期混在同一个目录里。

当前流程如下：

1. 读取客户 profile。
2. resolver 解析出本次需要启用的页面和运行配置。
3. 清理本次 build 的输出目录。
4. 构建 host。
5. 只构建 profile 选中的页面。
6. 校验本次 build 的页面 chunk、host 文件和运行时桥接文件。

默认 build 输出目录如下：

```txt
dists/
    customer-a/
    customer-b/
```

其中 `apps/Sub/dist` 仍然是构建过程中的工作目录，而根目录 `dists/<profile>` 才是面向交付的独立部署产物。

## 当前 Export 命令

源码交付现在已经有第一版可执行命令：

```bash
pnpm export customer-a
```

默认会导出到：

```txt
exports/customer-a
```

如果需要在导出时 rename 工程名，可以直接传第二个位置参数：

```bash
pnpm export customer-a customer-a-portal
```

这时默认输出目录会变成：

```txt
exports/customer-a-portal
```

如果还需要覆盖导出显示名，可以继续追加：

```bash
pnpm export customer-a customer-a-portal --display-name "A 客户私有云交付版"
```

如果目标目录已存在，可以加 `--force` 覆盖。

导出的工程会保留这些能力：

- `pnpm build:host`
- `pnpm build:pageA`
- `pnpm build -- pageA`

## Export 方式

export 不会采用“长期维护多个客户分支”的方式，而是采用“从主仓装配并导出”的方式。

目标流程如下：

1. 在主仓中维护统一源码。
2. 通过客户 profile 选择需要交付的页面集合。
3. resolver 解析出本次交付需要包含的 host、page 和 packages。
4. 生成一个干净的交付目录或新仓库。
5. 导出结果只包含当前客户需要的源码和依赖声明。

这里的 export 指的是“源码级导出”，不是单纯导出 `dist`。

export 产物预计至少包含：

- `apps/Sub`（含 `product` 和 `scripts`）
- `scripts`
- 被 profile 选中的页面目录
- 实际被引用的 `packages/*`
- 根目录 workspace 配置
- 面向交付的 README 或 manifest

页面目录在当前仓库中是 `apps/Page*`，后续命名统一后会逐步过渡到 `apps/page-*`。

export 时需要额外做的事情：

- 删除未选页面。
- 重写根目录和 host 的依赖声明。
- 生成当前客户的页面清单和交付说明。
- 确保导出结果是一个可以独立安装、独立构建的项目。
- 生成本次交付的 manifest，记录来源 profile、导出时间、包含页面和 rename 信息。

这意味着未来“客户 A 交付 page-a/page-b/page-c，客户 B 交付 page-a/page-b/page-d”时，不需要从源码层面长期维护两套项目，只需要从同一主仓导出两份交付结果。

当前 export 默认输出到类似下面这种目录：

```txt
exports/
  customer-a/
  customer-a-portal/
```

### Export Rename 设计

导出的工程需要支持 rename，但建议把 rename 分层处理，先支持“工程级 rename”，不要一开始就做“全仓内部路径 rename”。

第一阶段建议必须支持的 rename 范围：

- 导出目录名
- 导出项目根目录 `package.json.name`
- 导出项目 README 标题
- 导出 manifest 中的项目标识
- host 的默认展示名或品牌名

建议第一阶段不要默认改动的内容：

- 页面 `slug`
- 页面 chunk 名
- 页面目录内部源码结构
- `packages/*` 的目录名和包名
- workspace 内部 import 路径

这样做的好处是：

- rename 需求可以满足。
- 导出工程仍然保持稳定结构，便于后续回溯主仓来源。
- 避免因为大规模改名导致路径重写、依赖替换和构建配置同步变得脆弱。

也就是说，第一阶段的 rename 更接近“交付项目改名”，而不是“把整个仓库的内部模块全部改名”。

建议后续把 rename 输入定义为下面两层：

- `projectSlug`：机器可读名字，用于导出目录、根包名、manifest id。
- `displayName`：人可读名字，用于 README、项目标题、默认品牌展示。

例如：

```txt
profile: customer-a
projectSlug: customer-a-portal
displayName: A 客户私有云交付版
```

默认规则建议如下：

- 如果没有传 `projectSlug`，默认使用 `profile.id`
- 如果没有传 `displayName`，默认使用 `profile.id`
- `brandName` 可以从 `displayName` 继续派生，也可以由 profile 单独覆盖

如果后面客户对源码包名有强约束，再考虑第二阶段扩展：

- workspace package scope rename
- host 包名 rename
- 页面目录 rename
- 内部 import 批量重写

这部分不建议放进第一版 export。

### 推荐的 Export 参数模型

当前导出脚本内部已经按下面这个输入模型组织：

```js
{
  profileId: 'customer-a',
  projectSlug: 'customer-a-portal',
  displayName: 'A 客户私有云交付版',
  outputDir: 'exports/customer-a-portal'
}
```

resolver 基于这个输入最终产出：

- 页面清单
- 需要复制的 apps/packages
- 需要保留的 workspace 依赖
- 根目录和文档中的 rename 结果
- 一份交付 manifest

manifest 建议至少记录：

- `sourceRepo`
- `sourceRevision`
- `profileId`
- `projectSlug`
- `displayName`
- `pages`
- `generatedAt`

## 当前状态和后续重点

当前仓库已经验证了两件事：

- `Sub` 作为 host 动态加载 page 是可行的。
- page 独立构建成 chunk 并接入 host 是可行的。

下一阶段重点不是继续堆 page 数量，而是补齐下面这些基础设施：

1. 页面注册表，收口路由、菜单、构建映射等硬编码。
2. 客户 profile，支持按客户选择页面组合。
3. export 流程，产出可独立交付的客户项目。
4. 命名统一，减少 `pageA / PageA / page-a` 这类重复维护。
5. build 和 export 动作边界清晰，避免部署产物和源码交付混用。

## 开发命令

启动本地开发：

```bash
pnpm start
```

在 `apps/Sub` 中直接启动：

```bash
cd apps/Sub
pnpm dev
```

按客户 profile 启动：

```bash
cd apps/Sub
VITE_PRODUCT_PROFILE=customer-a pnpm dev
```

构建 host 和页面：

```bash
pnpm build:sub
```

按客户 profile 直接生成交付包：

```bash
pnpm build customer-a
```

## 备注

- 当前仓库仍然是 demo，重点在验证架构方向。
- `registry / profile / resolver` 已经有了第一版代码骨架，并开始驱动路由、菜单和构建流程。
- `build` 和 `export` 现在都已经有可执行的根级命令，后续重点会放在产物和裁剪策略继续收细。
- `export` 已经有第一版可执行脚本，后续重点会放在裁剪策略继续收细，而不是再从零设计命令形态。
