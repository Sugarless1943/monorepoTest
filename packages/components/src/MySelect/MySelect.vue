<template>
  <div>
    <label>my select:</label>
    <select v-model="text">
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref()
</script>
