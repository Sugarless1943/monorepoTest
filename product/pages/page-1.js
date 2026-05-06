import { definePage } from '../definePage.js'

export default definePage('page-1', {
  groupSlug: 'group-a',
  title: 'page1',
  menuLabel: 'page1',
  routePath: '/groupA/1',
  legacyRoutePath: false,
  order: 10,
  packageName: '@monorepo/group-a',
  appDir: 'apps/GroupA',
  entryFile: 'src/page1/index.ts',
  componentFile: 'src/page1/index.vue',
})
