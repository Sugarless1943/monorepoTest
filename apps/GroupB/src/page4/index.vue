<template>
  <div>page4</div>
  <p>
    当前用户: {{ globalParams?.userInfo?.name }} ({{
      globalParams?.userInfo?.role
    }})
  </p>
</template>

<script setup>
import { ref, inject } from 'vue'

const globalParams = inject('globalParams', ref({}))
</script>
