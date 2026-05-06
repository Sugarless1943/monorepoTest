import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-a', {
  extends: 'default',
  displayName: 'A 客户交付版',
  pages: ['page-1', 'page-2', 'page-3'],
  runtimeConfig: {
    brandName: 'A 客户交付版',
  },
})
