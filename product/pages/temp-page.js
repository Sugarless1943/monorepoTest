import { definePage } from '../definePage.js'

export default definePage('temp-page', {
  groupSlug: 'temp',
  title: 'Temp Page',
  menuLabel: 'Temp Page',
  routePath: '/temp/page',
  legacyRoutePath: false,
  order: 9990,
  packageName: '@monorepo/temp',
  appDir: 'apps/Temp',
  entryFile: 'src/temppage/index.ts',
  componentFile: 'src/temppage/index.vue',
})
