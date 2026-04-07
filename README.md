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
├── apps
│   ├── Sub         # 基座 host，负责路由、布局、运行时容器
│   ├── PageA       # 业务页面 A
│   ├── PageB       # 业务页面 B
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
- 当前构建产物仍然输出到 `apps/Sub/dist`，后续如果进入正式交付链路，再独立到 `outputs/build/*`。

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

- `apps/Sub/src/router/index.js`
- `apps/Sub/src/components/Layout.vue`
- `apps/Sub/scripts/build.js`
- `apps/Sub/scripts/check-dist.js`
- `apps/Page*/vite.config.js`

### 4. Build 和 Export 的边界

后续会把“面向部署”和“面向交付”的动作彻底拆开：

- `build`：面向部署，产出可运行的构建结果，例如 `dist`、制品目录或镜像上下文。
- `export`：面向源码交付，产出一个裁剪后的独立项目，供客户私有云部署、审计或二次开发。

两者的边界建议固定如下：

- `build` 不复制源码，不改工程名，重点是生成可部署产物。
- `export` 复制并裁剪源码，重点是生成一个可以独立安装、独立构建、独立交付的新项目。
- `build` 依赖 profile 决定“打哪些页面”。
- `export` 依赖 profile 决定“带哪些源码”。
- 同一个 `profile` 可以同时支持 `build` 和 `export`，但两个动作的输出目录和产物语义必须分开。

建议后续命令语义保持类似下面这样：

```bash
# 生成客户部署产物
build customer-a

# 导出客户源码项目
export customer-a
```

## 后续 Build 方式

后续 `build` 会按客户 profile 生成一份干净的部署产物，而不是继续复用一个长期累积的 `dist` 目录。

目标流程如下：

1. 读取客户 profile。
2. resolver 解析出本次需要启用的页面和运行配置。
3. 清理本次 build 的输出目录。
4. 构建 host。
5. 只构建 profile 选中的页面。
6. 校验本次 build 的页面 chunk、host 文件和运行时桥接文件。

建议后续 build 输出逐步调整到类似下面这种独立目录：

```txt
outputs/
  build/
    customer-a/
    customer-b/
```

这样可以避免不同客户 build 结果互相污染，也比当前复用 `apps/Sub/dist` 更适合交付链路。

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

- `apps/Sub`
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

## 备注

- 当前仓库仍然是 demo，重点在验证架构方向。
- `registry / profile / resolver` 已经有了第一版代码骨架，并开始驱动路由、菜单和构建流程。
- `export` 已经有第一版可执行脚本，后续重点会放在裁剪策略继续收细，而不是再从零设计命令形态。
- 等这套配置驱动机制落地后，再补 CLI 会更顺，也更不容易返工。
