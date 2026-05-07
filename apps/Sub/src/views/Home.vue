<script setup>
import { MyInput, MySelect } from '@monorepo/components'
import { add, toUpperCase } from '@monorepo/utils'

const sum = add(5, 3)
const upperCaseText = toUpperCase('hello world')
</script>

<template>
  <div class="home-page">
    <div class="source-block">
      <header>@monorepo/components</header>
      <main>
        <MyInput />
        <MySelect />
      </main>
    </div>
    <div class="source-block">
      <header>@monorepo/utils</header>
      <main>
        <p>5 + 3 = {{ sum }}</p>
        <p>Uppercase: {{ upperCaseText }}</p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  font-family: Arial, sans-serif;
}

.source-block {
  margin-top: 24px;
  width: min(400px, 100%);
}

.source-block header {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #e8f3ff;
  color: #155a9f;
  font-size: 14px;
  font-weight: 700;
}

.source-block main {
  padding: 20px;
  border: 2px dashed #1f7a8c;
  border-radius: 8px;
  background: #f8fcfd;
}
</style>
