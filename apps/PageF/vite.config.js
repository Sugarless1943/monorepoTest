import { getPage } from '#product'
import { createSubPageViteConfig } from '#tooling/createSubPageViteConfig.js'

const page = getPage('page-f')

export default createSubPageViteConfig({
  appDir: __dirname,
  chunkFileName: page.chunkFileName,
  libName: page.libName,
})
