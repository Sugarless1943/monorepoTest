import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Home from '../views/Home.vue'
import {
  productGroups,
  productLegacyRoutes,
  productPages,
} from '../runtime/productProfile.js'

const groupChunkLoaders = new Map(
  productGroups.map((group) => [
    group.slug,
    () => import(/* @vite-ignore */ `/assets/${group.chunkFileName}`),
  ])
)
const loadedGroupChunks = new Map()

async function loadPage(page) {
  if (import.meta.env.DEV) {
    const { loadDevPage } = await import('../runtime/loadDevPage.js')
    return loadDevPage(page)
  }

  if (!loadedGroupChunks.has(page.groupSlug)) {
    const loadGroup = groupChunkLoaders.get(page.groupSlug)

    if (!loadGroup) {
      throw new Error(`Missing group chunk loader for ${page.groupSlug}`)
    }

    loadedGroupChunks.set(page.groupSlug, loadGroup())
  }

  const groupModule = await loadedGroupChunks.get(page.groupSlug)
  const component = groupModule[page.moduleExportName]

  if (!component) {
    throw new Error(
      `Missing export ${page.moduleExportName} in group chunk ${page.groupSlug}`
    )
  }

  return component
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
