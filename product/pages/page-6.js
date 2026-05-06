import { definePage } from '../definePage.js'

export default definePage('page-6', {
  groupSlug: 'group-c',
  title: 'page6',
  menuLabel: 'page6',
  routePath: '/groupC/6',
  legacyRoutePath: false,
  order: 60,
  packageName: '@monorepo/group-c',
  appDir: 'apps/GroupC',
  entryFile: 'src/page6/index.ts',
  componentFile: 'src/page6/index.vue',
})
