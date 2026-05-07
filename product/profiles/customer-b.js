import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-b', {
  extends: 'default',
  displayName: 'B 客户交付版',
  groups: ['GroupA', 'GroupB'],
  runtimeConfig: {
    brandName: 'B 客户交付版',
  },
})
