import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

function getNodeModulePackageName(id) {
  const normalizedId = id.split(path.sep).join('/')
  const marker = '/node_modules/'
  const markerIndex = normalizedId.lastIndexOf(marker)

  if (markerIndex === -1) {
    return ''
  }

  const packagePath = normalizedId.slice(markerIndex + marker.length)
  const [scopeOrName, name] = packagePath.split('/')

  if (!scopeOrName) {
    return ''
  }

  return scopeOrName.startsWith('@') ? `${scopeOrName}/${name}` : scopeOrName
}

function resolveVendorChunk(id) {
  const packageName = getNodeModulePackageName(id)

  if (!packageName) {
    return undefined
  }

  if (
    packageName === 'vue' ||
    packageName === 'vue-router' ||
    packageName.startsWith('@vue/')
  ) {
    return 'framework'
  }

  if (
    packageName === 'element-plus' ||
    packageName.startsWith('@element-plus/')
  ) {
    return 'element-plus'
  }

  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue()],
  build: {
    // 保留已有 group chunk，便于仅重打指定子应用组时复用其他产物
    emptyOutDir: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: {
        index: path.resolve(__dirname, 'index.html'),
        // 这里把 src/shared/vue-runtime.js 作为 Sub 的一个独立构建入口。
        // 它的源码只有 `export * from 'vue'`，但经过 Sub build 之后，
        // 会被 Rollup 编译成真正发布到 dist/shared/vue-runtime.js 的 bridge 文件。
        //
        // 这样子应用在 build 时只需要约定依赖 `/shared/vue-runtime.js`，
        // 不需要也不应该直接感知 vendor.js 里的压缩短名。
        vueRuntime: path.resolve(__dirname, 'src/shared/vue-runtime.js'),
      },
      output: {
        // 入口文件命名格式
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'vueRuntime'
            ? 'shared/vue-runtime.js'
            : 'assets/[name].js',
        // 代码分割生成的 chunk 命名格式 - 使用固定名称
        chunkFileNames: 'assets/[name].js',
        // 静态资源命名格式
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: resolveVendorChunk,
      },
    },
  },
})
