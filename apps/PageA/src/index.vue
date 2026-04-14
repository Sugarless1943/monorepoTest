<template>
  <div class="page-a">
    <h2>Page A Updated 123</h2>

    <div class="params-section">
      <h3>从基座接收的全局参数:</h3>
      <div class="param-item">
        <label>当前用户:</label>
        <span
          >{{ globalParams?.userInfo?.name }} ({{
            globalParams?.userInfo?.role
          }})</span
        >
      </div>
      <div class="param-item">
        <label>当前主题:</label>
        <span :class="['theme-badge', globalParams?.theme]">{{
          globalParams?.theme
        }}</span>
      </div>
      <div class="param-item">
        <label>API地址:</label>
        <span>{{ globalParams?.apiBaseUrl }}</span>
      </div>
      <div class="param-item">
        <label>版本号:</label>
        <span>{{ globalParams?.version }}</span>
      </div>
    </div>

    <div class="actions-section">
      <h3>操作:</h3>
      <button @click="toggleTheme">切换主题</button>
      <button @click="changeUser">切换用户</button>
      <button @click="updateVersion">更新版本号</button>
    </div>

    <p class="update-time">修改时间: {{ currentTime }}</p>
    <p class="update-flag">本次验证文案: PageA build replacement OK</p>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'

const currentTime = ref(new Date().toLocaleString())

// 注入基座提供的全局参数和方法
const globalParams = inject('globalParams', ref({}))
const updateGlobalParams = inject('updateGlobalParams', () => {})
const setGlobalParam = inject('setGlobalParam', () => {})

// 切换主题
const toggleTheme = () => {
  const newTheme = globalParams.value?.theme === 'light' ? 'dark' : 'light'
  setGlobalParam('theme', newTheme)
}

// 切换用户
const changeUser = () => {
  const currentRole = globalParams.value?.userInfo?.role
  const newUser =
    currentRole === 'admin'
      ? { name: 'Guest', role: 'guest' }
      : { name: 'Admin', role: 'admin' }
  updateGlobalParams({ userInfo: newUser })
}

// 更新版本号
const updateVersion = () => {
  const randomVersion = `1.0.${Math.floor(Math.random() * 100)}`
  setGlobalParam('version', randomVersion)
}
</script>

<style scoped>
.page-a {
  padding: 20px;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.params-section,
.actions-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.param-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.param-item label {
  width: 100px;
  font-weight: bold;
  color: #666;
}

.param-item span {
  color: #333;
}

.theme-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
}

.theme-badge.light {
  background-color: #fff;
  color: #333;
  border: 1px solid #ddd;
}

.theme-badge.dark {
  background-color: #333;
  color: #fff;
}

.actions-section button {
  margin-right: 12px;
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.actions-section button:hover {
  background-color: #369f6e;
}

.update-time {
  color: #999;
  font-size: 12px;
}

.update-flag {
  margin-top: 8px;
  color: #1f6feb;
  font-weight: 600;
}
</style>
