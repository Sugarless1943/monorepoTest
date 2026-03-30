import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Home from '../views/Home.vue'

function loadProdPage(jsPath) {
  return import(/* @vite-ignore */ jsPath).then((mod) => mod.default)
}

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
          component: import.meta.env.DEV
            ? () =>
                import(
                  /* webpackChunkName: "page-a" */ '../../../PageA/src/index.vue'
                )
            : () => loadProdPage('/assets/page-a.js'),
        },
        {
          path: 'pageB',
          name: 'PageB',
          component: import.meta.env.DEV
            ? () =>
                import(
                  /* webpackChunkName: "page-b" */ '../../../PageB/src/index.vue'
                )
            : () => loadProdPage('/assets/page-b.js'),
        },
        {
          path: 'pageC',
          name: 'PageC',
          component: import.meta.env.DEV
            ? () =>
                import(
                  /* webpackChunkName: "page-c" */ '../../../PageC/src/index.vue'
                )
            : () => loadProdPage('/assets/page-c.js'),
        },
        {
          path: 'pageD',
          name: 'PageD',
          component: import.meta.env.DEV
            ? () =>
                import(
                  /* webpackChunkName: "page-d" */ '../../../PageD/src/index.vue'
                )
            : () => loadProdPage('/assets/page-d.js'),
        },
        {
          path: 'pageE',
          name: 'PageE',
          component: import.meta.env.DEV
            ? () =>
                import(
                  /* webpackChunkName: "page-e" */ '../../../PageE/src/index.vue'
                )
            : () => loadProdPage('/assets/page-e.js'),
        },
      ],
    },
  ],
})

export default router
