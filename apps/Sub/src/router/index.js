import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          name: 'Home',
          component: Home,
        },
        {
          path: 'pageA',
          name: 'PageA',
          component: () => import('../../../PageA/src/index.vue'),
        },
        {
          path: 'pageB',
          name: 'PageB',
          component: () => import('../../../PageB/src/index.vue'),
        },
      ],
    },
  ],
})

export default router
