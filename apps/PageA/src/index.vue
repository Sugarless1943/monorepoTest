<template>
  <div>page A - 已修改2</div>
  <p>修改时间: {{ currentTime }}</p>
</template>

<script setup>
import { ref } from 'vue'

const feature = ref()
const currentTime = ref(new Date().toLocaleString())
</script>
