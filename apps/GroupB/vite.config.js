import { getAllPages } from '#product'
import { createSubGroupViteConfig } from '#tooling/createSubPageViteConfig.js'

const pages = getAllPages().filter((page) => page.groupSlug === 'group-b')

export default createSubGroupViteConfig({
  appDir: __dirname,
  pages,
})
