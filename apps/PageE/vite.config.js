import { getPage } from '../Sub/product/index.js'
import { createSubPageViteConfig } from '../Sub/scripts/createSubPageViteConfig.js'

const page = getPage('page-e')

export default createSubPageViteConfig({
  appDir: __dirname,
  chunkFileName: page.chunkFileName,
  libName: page.libName,
})
