<script setup lang="ts">
/** Reports a persistence problem without claiming that in-memory export is unavailable. */
defineProps<{
  /** Why the database is unusable. Rendered for diagnosis, not as the main message. */
  reason: string
}>()
</script>

<template>
  <div
    data-persistence-warning
    role="alert"
    class="flex-shrink-0 px-4 py-2 border-b border-[var(--ch-border)] bg-[var(--ch-warning-bg,#fff4e5)] color-[var(--ch-warning-text,#7a4d00)]"
  >
    <p class="m-0 text-[0.85em] font-semibold">{{ $t('persistence_warning.title') }}</p>
    <p class="m-0 mt-0.5 text-[0.8em]">{{ $t('persistence_warning.body') }}</p>
    <p class="m-0 mt-0.5 text-[0.7em] opacity-70 font-mono" data-persistence-reason>{{ reason }}</p>
  </div>
</template>
