import { defineProfile } from '../defineProfile.js'

export default defineProfile('default', {
  displayName: 'Monorepo Demo',
  groups: ['GroupA', 'GroupB', 'GroupC'],
  runtimeConfig: {
    brandName: 'Monorepo Demo',
  },
})
