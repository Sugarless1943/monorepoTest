```
    touch pnpm-workspace.yaml

    pnpm --workspace-root init

    pnpm -c // 可以指定到某一个子包内执行script命令

    pnpm -Dw add typescript @types/node // dw --save-dev --workspace-root

    prettier | .prettierignore | lint:prettier // 格式化代码
    eslint | .eslintignore | lint:eslint // 检查代码质量


    git
    commitizen
    pnpm -Dw add @commitlint/cli @commitlint/config-conventional commitizen cz-git


    // 添加全局的，给workspace内的所有子包都安装prettier 需要-w
    pnpm add --save-dev --save-exact -w prettier

```
