import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue()],
  build: {
    // 保留已有 page chunk，便于仅重打指定子应用时复用其他产物
    emptyOutDir: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: {
        index: path.resolve(__dirname, 'index.html'),
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
