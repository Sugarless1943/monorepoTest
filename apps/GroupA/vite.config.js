import { getAllPages } from '#product'
import { createSubGroupViteConfig } from '#tooling/createSubPageViteConfig.js'

const pages = getAllPages().filter((page) => page.appDir === 'apps/GroupA')

export default createSubGroupViteConfig({
  appDir: __dirname,
  pages,
})
