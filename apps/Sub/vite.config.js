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
        // 代码分割生成的 chunk 命名格式
        chunkFileNames: 'assets/[name]-[hash].js',
        // 静态资源命名格式
        assetFileNames: 'assets/sub-[name]-[hash].[ext]',
        // 手动代码分割配置
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
