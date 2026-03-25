<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menus = [
  { path: '/', name: 'Home', label: '首页' },
  { path: '/pageA', name: 'PageA', label: '页面A' },
  { path: '/pageB', name: 'PageB', label: '页面B' },
  { path: '/pageC', name: 'PageC', label: '页面C' },
  { path: '/pageD', name: 'PageD', label: '页面D' },
  { path: '/pageE', name: 'PageE', label: '页面E' },
]
</script>

<template>
  <div class="layout">
    <!-- 左侧菜单 -->
    <aside class="menu">
      <h2>菜单</h2>
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
