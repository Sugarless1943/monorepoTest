import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    // 输出到 Sub 的 dist/assets 目录
    outDir: path.resolve(__dirname, '../Sub/dist/assets'),
    // 配置为库模式构建
    lib: {
      entry: 'src/index.ts',
      name: 'PageC',
      fileName: () => 'page-c.js',
      formats: ['es'], // 只生成 ES 模块格式
    },
    // 配置 rollup 选项
    rollupOptions: {
      // 不将 Vue 作为外部依赖，打包到 page-c.js 中
      external: [],
      output: {
        // 禁用代码分割
        manualChunks: undefined,
      },
    },
  },
})
