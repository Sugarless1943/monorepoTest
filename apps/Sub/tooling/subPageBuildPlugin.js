import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function subPageBuildPlugin({ chunkFileName, outDir, cssFileName }) {
  return {
    name: `sub-page-build-${chunkFileName}`,
    async writeBundle() {
      const jsPath = path.resolve(outDir, chunkFileName)
      const resolvedCssFileName =
        cssFileName ?? chunkFileName.replace(/\.js$/, '.css')
      const cssPath = path.resolve(outDir, resolvedCssFileName)
      let jsSource = await readFile(jsPath, 'utf8')

      try {
        const cssSource = await readFile(cssPath, 'utf8')
        const cssText = JSON.stringify(cssSource)
        const injectCode =
          `const __groupStyle=${cssText};` +
          `if(typeof document<"u"&&!document.querySelector('style[data-group-style="${resolvedCssFileName}"]')){` +
          `const s=document.createElement("style");` +
          `s.dataset.groupStyle="${resolvedCssFileName}";` +
          `s.textContent=__groupStyle;document.head.appendChild(s);}`

        jsSource = `${injectCode}\n${jsSource}`
        await rm(cssPath, { force: true })
      } catch {}

      await writeFile(jsPath, jsSource)
    },
  }
}
