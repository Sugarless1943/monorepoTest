<script setup>
import { ref, provide, readonly } from 'vue'
import { useRoute } from 'vue-router'
import { productMenus, productProfile } from '../runtime/productProfile.js'

const route = useRoute()
const menuTitle = productProfile.runtimeConfig.brandName ?? '菜单'
const menus = [{ path: '/', routeName: 'Home', label: '首页' }, ...productMenus]

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
    <main class="content">
      <router-view />
    </main>
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

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}
</style>
