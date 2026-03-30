import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { subPageBuildPlugin } from './subPageBuildPlugin.js'

export function createSubPageViteConfig({ appDir, chunkFileName, libName }) {
  const outDir = path.resolve(appDir, '../Sub/dist/assets')

  return defineConfig({
    plugins: [vue(), subPageBuildPlugin({ chunkFileName, outDir })],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    build: {
      minify: 'esbuild',
      outDir,
      lib: {
        entry: 'src/index.ts',
        name: libName,
        fileName: () => chunkFileName,
        formats: ['es'],
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          manualChunks: undefined,
          assetFileNames: '[name].[ext]',
          paths: {
            vue: '/shared/vue-runtime.js',
          },
        },
      },
    },
  })
}
