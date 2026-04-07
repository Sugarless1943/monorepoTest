import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Home from '../views/Home.vue'
import { productLegacyRoutes, productPages } from '../runtime/productProfile.js'

function loadProdPage(jsPath) {
  return import(/* @vite-ignore */ jsPath).then((mod) => mod.default)
}

async function loadPage(page) {
  if (import.meta.env.DEV) {
    const { loadDevPage } = await import('../runtime/loadDevPage.js')
    return loadDevPage(page)
  }

  return loadProdPage(`/assets/${page.chunkFileName}`)
}

function toChildPath(path) {
  return path.replace(/^\//, '')
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
        ...productPages.map((page) => ({
          path: toChildPath(page.routePath),
          name: page.routeName,
          component: () => loadPage(page),
        })),
        ...productLegacyRoutes.map((route) => ({
          path: toChildPath(route.path),
          redirect: route.redirect,
        })),
      ],
    },
  ],
})

export default router
