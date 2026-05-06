import { definePage } from '../definePage.js'

export default definePage('page-4', {
  groupSlug: 'group-b',
  title: 'page4',
  menuLabel: 'page4',
  routePath: '/groupB/4',
  legacyRoutePath: false,
  order: 40,
  packageName: '@monorepo/group-b',
  appDir: 'apps/GroupB',
  entryFile: 'src/page4/index.ts',
  componentFile: 'src/page4/index.vue',
})
