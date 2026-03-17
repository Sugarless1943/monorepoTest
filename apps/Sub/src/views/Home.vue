<script setup>
import { MyInput, MySelect } from '@monorepo/components'
import { add, toUpperCase } from '@monorepo/utils'

const sum = add(5, 3)
const upperCaseText = toUpperCase('hello world')
</script>

<template>
  <div>
    <h1>Testing Components</h1>
    <MyInput />
    <MySelect />
    <div>
      <p>5 + 3 = {{ sum }}</p>
      <p>Uppercase: {{ upperCaseText }}</p>
    </div>
  </div>
</template>

<style scoped></style>
