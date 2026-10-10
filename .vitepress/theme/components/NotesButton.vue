<script setup lang="ts">
defineProps<{
  noteCount: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    class="relative flex items-center gap-1.5 px-2 py-1.5 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)] transition-colors duration-150 text-[0.875em] md:px-3"
    @click="$emit('click')"
    :aria-label="$t('notes_button.label')"
  >
    <!-- Pencil icon -->
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
    <span class="hidden md:inline">{{ $t('notes_button.label') }}</span>
    <span
      v-if="noteCount > 0"
      class="inline-flex items-center justify-center min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--ch-accent)] color-white text-[10px] font-bold leading-none"
    >{{ noteCount }}</span>
  </button>
</template>
