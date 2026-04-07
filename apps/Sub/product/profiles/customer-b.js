import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-b', {
  extends: 'default',
  displayName: 'B 客户交付版',
  pages: ['page-a', 'page-b', 'page-d'],
  runtimeConfig: {
    brandName: 'B 客户交付版',
  },
})
