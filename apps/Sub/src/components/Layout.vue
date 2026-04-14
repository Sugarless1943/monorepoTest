<script setup>
import { computed, ref, provide, readonly } from 'vue'
import { useRoute } from 'vue-router'
import {
  productMenus,
  productPages,
  productProfile,
} from '../runtime/productProfile.js'

const route = useRoute()
const menuTitle = productProfile.runtimeConfig.brandName ?? '菜单'
const menus = [{ path: '/', routeName: 'Home', label: '首页' }, ...productMenus]
const pageTitlesByRouteName = Object.fromEntries(
  productPages.map((page) => [page.routeName, page.pascalName])
)
const pageTitlesByPath = Object.fromEntries(
  productPages.map((page) => [page.routePath, page.pascalName])
)
const currentPageTitle = computed(() => {
  if (route.name === 'Home') {
    return 'Home'
  }

  const routeName = route.name ? String(route.name) : ''

  return (
    pageTitlesByRouteName[routeName] ||
    pageTitlesByPath[route.path] ||
    routeName ||
    'Content'
  )
})

// 基座全局参数
const globalParams = ref({
  userInfo: { name: 'Admin', role: 'admin' },
  theme: 'light',
  apiBaseUrl: 'https://api.example.com',
  version: '1.0.0',
  profileId: productProfile.id,
  brandName: productProfile.runtimeConfig.brandName,
})

// 提供只读的全局参数
provide('globalParams', readonly(globalParams))

// 提供更新参数的方法
const updateGlobalParams = (newParams) => {
  globalParams.value = { ...globalParams.value, ...newParams }
}
provide('updateGlobalParams', updateGlobalParams)

// 提供设置单个属性的方法
const setGlobalParam = (key, value) => {
  globalParams.value[key] = value
}
provide('setGlobalParam', setGlobalParam)
</script>

<template>
  <div class="layout">
    <!-- 左侧菜单 -->
    <aside class="menu">
      <h2>{{ menuTitle }}</h2>
      <ul>
        <li v-for="menu in menus" :key="menu.path">
          <router-link
            :to="menu.path"
            :class="{ active: route.path === menu.path }"
          >
            {{ menu.label }}
          </router-link>
        </li>
      </ul>
    </aside>

    <!-- 右侧内容区 -->
    <section class="main-panel">
      <header class="page-header">
        <h1>{{ currentPageTitle }}</h1>
      </header>

      <main class="content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.menu {
  width: 200px;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  box-sizing: border-box;
}

.menu h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
}

.menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu li {
  margin-bottom: 10px;
}

.menu a {
  display: block;
  padding: 8px 12px;
  text-decoration: none;
  color: #333;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.menu a:hover {
  background-color: #e0e0e0;
}

.menu a.active {
  background-color: #42b983;
  color: white;
}

.main-panel {
  flex: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  background-color: #fff;
}

.page-header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fff;
  box-sizing: border-box;
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 22px;
  line-height: 1.2;
}

.content {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  box-sizing: border-box;
  background-color: #fafafa;
}
</style>
