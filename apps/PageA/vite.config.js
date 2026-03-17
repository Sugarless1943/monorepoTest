import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 配置为库模式构建
    lib: {
      entry: 'src/index.ts',
      name: 'PageA',
      fileName: (format) => `page-a.${format}.js`
    },
    // 配置 rollup 选项
    rollupOptions: {
      // 排除 Vue 作为外部依赖
      external: ['vue'],
      output: {
        // 全局变量配置
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})