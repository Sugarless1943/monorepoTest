import { defineProfile } from '../defineProfile.js'

export default defineProfile('customer-a', {
  extends: 'default',
  displayName: 'A 客户交付版',
  groups: ['GroupA', 'GroupB', 'GroupC'],
  runtimeConfig: {
    brandName: 'A 客户交付版',
  },
})
