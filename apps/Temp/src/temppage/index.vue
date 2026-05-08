<script setup>
const title = 'Temp Page'
const description =
  'Temporary page for development before choosing a delivery group.'
</script>

<template>
  <section class="temp-page">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </section>
</template>

<style scoped>
.temp-page {
  padding: 24px;
}

h2 {
  margin: 0 0 12px;
}

p {
  margin: 0;
  color: #666;
}
</style>
