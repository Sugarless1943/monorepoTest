import { definePage } from '../definePage.js'

export default definePage('page-5', {
  groupSlug: 'group-c',
  title: 'page5',
  menuLabel: 'page5',
  routePath: '/groupC/5',
  legacyRoutePath: false,
  order: 50,
  packageName: '@monorepo/group-c',
  appDir: 'apps/GroupC',
  entryFile: 'src/page5/index.ts',
  componentFile: 'src/page5/index.vue',
})
