import { definePage } from '../definePage.js'

export default definePage('page-3', {
  groupSlug: 'group-b',
  title: 'page3',
  menuLabel: 'page3',
  routePath: '/groupB/3',
  legacyRoutePath: false,
  order: 30,
  packageName: '@monorepo/group-b',
  appDir: 'apps/GroupB',
  entryFile: 'src/page3/index.ts',
  componentFile: 'src/page3/index.vue',
})
