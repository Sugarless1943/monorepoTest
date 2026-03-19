import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 输出到 Sub 的 dist/assets 目录
    outDir: path.resolve(__dirname, '../Sub/dist/assets'),
    // 配置为库模式构建
    lib: {
      entry: 'src/index.ts',
      name: 'PageA',
      fileName: () => 'page-a.js',
    },
    // 配置 rollup 选项
    rollupOptions: {
      // 排除 Vue 作为外部依赖
      external: ['vue'],
      output: {
        // 全局变量配置
        globals: {
          vue: 'Vue',
        },
        // 禁用代码分割
        manualChunks: undefined,
      },
    },
  },
})
