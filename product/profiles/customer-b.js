import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-b', {
  extends: 'default',
  displayName: 'B 客户交付版',
  pages: ['page-1', 'page-2', 'page-4'],
  runtimeConfig: {
    brandName: 'B 客户交付版',
  },
})
