import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// PageA专用打包配置
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        pageA: resolve(__dirname, 'pages/pageA.html'),
      },
      output: {
        dir: 'dist/pageA',
      },
    },
  },
})