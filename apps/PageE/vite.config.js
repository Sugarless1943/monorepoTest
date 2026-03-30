import { createSubPageViteConfig } from '../Sub/scripts/createSubPageViteConfig.js'

export default createSubPageViteConfig({
  appDir: __dirname,
  chunkFileName: 'page-e.js',
  libName: 'PageE',
})
