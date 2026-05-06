import { defineProfile } from '../defineProfile.js'

export default defineProfile('default', {
  displayName: 'Monorepo Demo',
  pages: ['page-1', 'page-2', 'page-3', 'page-4', 'page-5', 'page-6'],
  runtimeConfig: {
    brandName: 'Monorepo Demo',
  },
})
