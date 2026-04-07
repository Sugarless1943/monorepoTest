import { getPage } from '../../product/index.js'
import { createSubPageViteConfig } from '../../tooling/vite/createSubPageViteConfig.js'

const page = getPage('page-b')

export default createSubPageViteConfig({
  appDir: __dirname,
  chunkFileName: page.chunkFileName,
  libName: page.libName,
})
