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
          component: () =>
            import(
              /* webpackChunkName: "page-a" */ '../../../PageA/src/index.vue'
            ),
        },
        {
          path: 'pageB',
          name: 'PageB',
          component: () =>
            import(
              /* webpackChunkName: "page-b" */ '../../../PageB/src/index.vue'
            ),
        },
        {
          path: 'pageC',
          name: 'PageC',
          component: () =>
            import(
              /* webpackChunkName: "page-c" */ '../../../PageC/src/index.vue'
            ),
        },
        {
          path: 'pageD',
          name: 'PageD',
          component: () =>
            import(
              /* webpackChunkName: "page-d" */ '../../../PageD/src/index.vue'
            ),
        },
        {
          path: 'pageE',
          name: 'PageE',
          component: () =>
            import(
              /* webpackChunkName: "page-e" */ '../../../PageE/src/index.vue'
            ),
        },
      ],
    },
  ],
})

export default router
