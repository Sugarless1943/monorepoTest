import { defineProfile } from '../defineProfile.js'

export default defineProfile('default', {
  displayName: 'Monorepo Test',
  groups: ['GroupA', 'GroupB', 'GroupC'],
  runtimeConfig: {
    brandName: 'Monorepo Test',
  },
})
