<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  initialContent: string
  isNew: boolean
}>()

const emit = defineEmits<{
  save: [content: string]
  cancel: []
}>()

type Tab = 'edit' | 'preview'
const activeTab = ref<Tab>('edit')
const content = ref(props.initialContent)
const previewHtml = ref('')
let markedLoaded = false

async function switchToPreview() {
  activeTab.value = 'preview'
  if (!markedLoaded) {
    const { marked } = await import('marked')
    markedLoaded = true
    marked.setOptions({ gfm: true, breaks: true } as any)
    ;(switchToPreview as any)._marked = marked
  }
  const markedFn = (switchToPreview as any)._marked
  previewHtml.value = markedFn ? String(markedFn(content.value)) : content.value
}

async function handleTabClick(tab: Tab) {
  if (tab === 'preview') {
    await switchToPreview()
  } else {
    activeTab.value = 'edit'
  }
}

function handleSave() {
  emit('save', content.value)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Tab bar -->
    <div class="flex gap-1 px-2 py-1.5 border-b border-[var(--ch-border)] flex-shrink-0">
      <button
        :class="['ch-tab-btn text-[0.8em]', activeTab === 'edit' && 'ch-tab-btn-active']"
        @click="handleTabClick('edit')"
      >Edit</button>
      <button
        :class="['ch-tab-btn text-[0.8em]', activeTab === 'preview' && 'ch-tab-btn-active']"
        @click="handleTabClick('preview')"
      >Preview</button>
    </div>

    <!-- Content area -->
    <div class="flex-1 overflow-hidden relative">
      <textarea
        v-show="activeTab === 'edit'"
        v-model="content"
        class="absolute inset-0 w-full h-full resize-none p-3 font-mono text-[0.875em] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] border-none outline-none leading-relaxed"
        :placeholder="$t('note_editor.textarea_placeholder')"
      />
      <div
        v-show="activeTab === 'preview'"
        class="vp-doc absolute inset-0 overflow-y-auto p-3 text-[0.875em]"
      >
        <div v-if="previewHtml" v-html="previewHtml"></div>
        <p v-else class="color-[var(--ch-text-3)]">{{ $t('note_editor.preview_placeholder') }}</p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2 justify-end px-3 py-2 border-t border-[var(--ch-border)] flex-shrink-0">
      <button
        class="px-3 py-1.5 rounded text-[0.85em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] cursor-pointer hover:border-[var(--ch-accent)] transition-colors"
        @click="$emit('cancel')"
      >{{ $t('note_editor.cancel_button') }}</button>
      <button
        class="px-3 py-1.5 rounded text-[0.85em] bg-[var(--ch-accent)] color-white cursor-pointer border-none hover:opacity-90 transition-opacity"
        @click="handleSave"
      >{{ $t('note_editor.save_button') }}</button>
    </div>
  </div>
</template>
