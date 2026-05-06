import { definePage } from '../definePage.js'

export default definePage('page-2', {
  groupSlug: 'group-a',
  title: 'page2',
  menuLabel: 'page2',
  routePath: '/groupA/2',
  legacyRoutePath: false,
  order: 20,
  packageName: '@monorepo/group-a',
  appDir: 'apps/GroupA',
  entryFile: 'src/page2/index.ts',
  componentFile: 'src/page2/index.vue',
})
