<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { NoteEntry } from '../composables/usePentestNotes'

const props = defineProps<{
  note: NoteEntry
  isSelected: boolean
}>()

defineEmits<{
  select: []
  edit: []
  delete: []
}>()

const { t } = useI18n()

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function previewLines(content: string): string {
  return content.split('\n').filter(l => l.trim()).slice(0, 2).join(' ') || t('note_card.empty_preview')
}
</script>

<template>
  <div
    :class="['ch-note-card group', isSelected && 'ch-note-card-selected']"
    @click="$emit('select')"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="flex-1 text-[0.875em] color-[var(--ch-text-1)] line-clamp-2 leading-snug">
        {{ previewLines(note.content) }}
      </p>
      <!-- Edit/Delete actions — show on hover -->
      <div class="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        <button
          class="p-1 rounded color-[var(--ch-text-2)] hover:color-[var(--ch-accent)] hover:bg-[var(--ch-accent-soft)] transition-colors"
          :title="$t('note_card.edit_title')"
          @click.stop="$emit('edit')"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button
          class="p-1 rounded color-[var(--ch-text-2)] hover:color-[var(--ch-hard-fg)] hover:bg-[var(--ch-hard-bg)] transition-colors"
          :title="$t('note_card.delete_title')"
          @click.stop="$emit('delete')"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="mt-1.5 text-[0.75em] color-[var(--ch-text-3)]">
      {{ formatTime(note.createdAt) }}
      <span v-if="note.updatedAt" class="ml-1">{{ $t('note_card.edited_marker') }}</span>
    </div>
  </div>
</template>
