<script setup lang="ts">
import { watch, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ChallengeLayout from './layouts/ChallengeLayout.vue'

const { frontmatter } = useData()

const isChallenge = computed(() => frontmatter.value.layout === 'challenge')

let stopWatch: (() => void) | null = null

onMounted(() => {
  const update = () => document.body.classList.toggle('challenge-page', isChallenge.value)
  update()
  stopWatch = watch(isChallenge, update)
})

onUnmounted(() => {
  stopWatch?.()
  document.body.classList.remove('challenge-page')
})
</script>

<template>
  <ChallengeLayout v-if="isChallenge" />
  <DefaultTheme.Layout v-else />
</template>
