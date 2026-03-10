<template>
  <div>
    <label>my input:</label>
    <input v-model="text" type="text" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref()
</script>
