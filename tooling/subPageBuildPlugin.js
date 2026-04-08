import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { transformWithEsbuild } from 'vite'

export function subPageBuildPlugin({ chunkFileName, outDir }) {
  return {
    name: `sub-page-build-${chunkFileName}`,
    async writeBundle() {
      const jsPath = path.resolve(outDir, chunkFileName)
      const cssPath = path.resolve(
        outDir,
        chunkFileName.replace(/\.js$/, '.css')
      )

      let jsSource = await readFile(jsPath, 'utf8')

      try {
        const cssSource = await readFile(cssPath, 'utf8')
        const cssFileName = path.basename(cssPath)
        const cssText = JSON.stringify(cssSource)
        const injectCode =
          `const __pageStyle=${cssText};` +
          `if(typeof document<"u"&&!document.querySelector('style[data-page-style="${cssFileName}"]')){` +
          `const s=document.createElement("style");` +
          `s.dataset.pageStyle="${cssFileName}";` +
          `s.textContent=__pageStyle;document.head.appendChild(s);}`

        jsSource = `${injectCode}\n${jsSource}`
        await rm(cssPath, { force: true })
      } catch {}

      const result = await transformWithEsbuild(jsSource, jsPath, {
        format: 'esm',
        minify: true,
        legalComments: 'none',
      })

      await writeFile(jsPath, result.code)
    },
  }
}
