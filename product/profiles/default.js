import { defineProfile } from '../defineProfile.js'

export default defineProfile('default', {
  displayName: 'Monorepo Demo',
  pages: ['page-a', 'page-b', 'page-c', 'page-d', 'page-e'],
  runtimeConfig: {
    brandName: 'Monorepo Demo',
  },
})
