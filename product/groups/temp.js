import { defineGroup } from '../defineGroup.js'

export default defineGroup('temp', {
  title: 'temp',
  order: 9990,
  pageSlugs: ['temp-page'],
  appDir: 'apps/Temp',
  packageName: '@monorepo/temp',
  temporary: true,
})
