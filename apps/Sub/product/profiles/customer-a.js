import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-a', {
  extends: 'default',
  displayName: 'A 客户交付版',
  pages: ['page-a', 'page-b', 'page-c'],
  runtimeConfig: {
    brandName: 'A 客户交付版',
  },
})
