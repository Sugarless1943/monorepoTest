import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // 入口文件命名格式
        entryFileNames: 'assets/sub-[name]-[hash].js',
        // 代码分割生成的 chunk 命名格式 - 使用固定名称
        chunkFileNames: 'assets/[name].js',
        // 静态资源命名格式
        assetFileNames: 'assets/sub-[name]-[hash].[ext]',
        // 使用 manualChunks 配置控制 chunk 名称
        manualChunks: (id) => {
          if (id.includes('PageA/src/index.vue')) {
            return 'page-a'
          }
          if (id.includes('PageB/src/index.vue')) {
            return 'page-b'
          }
        },
      },
    },
  },
})
