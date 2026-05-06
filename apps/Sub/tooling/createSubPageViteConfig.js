import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { subPageBuildPlugin } from './subPageBuildPlugin.js'

export function createSubGroupViteConfig({ appDir, pages }) {
  const outDir = path.resolve(appDir, '../Sub/dist/assets')
  const groupEntryFile = path.resolve(appDir, 'src/index.ts')
  const chunkFileName = `${pages[0]?.groupSlug ?? 'group'}.js`
  const cssFileName = `${pages[0]?.groupSlug ?? 'group'}.css`

  return defineConfig({
    plugins: [
      vue(),
      subPageBuildPlugin({
        chunkFileName,
        outDir,
        cssFileName,
      }),
    ],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    build: {
      minify: 'esbuild',
      outDir,
      emptyOutDir: false,
      lib: {
        entry: groupEntryFile,
        cssFileName: pages[0]?.groupSlug ?? 'group',
        formats: ['es'],
        fileName: () => chunkFileName,
      },
      rollupOptions: {
        // 开发态时，GroupA 这类子应用源码里的 `import { ... } from 'vue'`
        // 由 pnpm workspace 的依赖解析直接命中真实的 vue 包。
        //
        // 生产构建时，我们不希望每个 page 都各自打进一份 vue，
        // 所以这里把 `vue` 标记成 external，让它保留为外部依赖。
        external: ['vue'],
        output: {
          manualChunks: undefined,
          assetFileNames: '[name][extname]',
          paths: {
            // 这里定义了“构建态的约定”：
            // 子应用产物里所有原本指向 `vue` 的 import，
            // 最终都会被重写成 `/shared/vue-runtime.js`。
            //
            // 所以 dev 走 workspace 解析，build 走宿主提供的稳定 bridge。
            // page 不再直接依赖 vendor.js 的短名，而是统一依赖这个稳定入口。
            vue: '/shared/vue-runtime.js',
          },
        },
      },
    },
  })
}
