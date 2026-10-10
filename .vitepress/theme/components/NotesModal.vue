<script setup lang="ts">
import { ref, computed } from 'vue'
import NoteCard from './NoteCard.vue'
import NoteEditor from './NoteEditor.vue'
import type { usePentestNotes } from '../composables/usePentestNotes'

type PentestNotesInstance = ReturnType<typeof usePentestNotes>

const props = defineProps<{
  pentestNotes: PentestNotesInstance
  challengeTitle: string
}>()

const emit = defineEmits<{
  close: []
}>()

type ModalSize = 'minimized' | 'standard' | 'maximized'
const size = ref<ModalSize>('standard')

// Note list / editor state
const selectedId = ref<string | null>(null)
const editingId = ref<string | null>(null)  // null = not editing; 'new' = creating new
const maximizedView = ref<'list' | 'editor'>('list')  // mobile maximized toggle

const selectedNote = computed(() =>
  selectedId.value ? props.pentestNotes.notes.value.find(n => n.id === selectedId.value) : null
)

function minimize() { size.value = 'minimized' }
function maximize() { size.value = 'maximized' }
function restore()  { size.value = 'standard' }

function startNewNote() {
  editingId.value = 'new'
  selectedId.value = null
  if (size.value === 'maximized') maximizedView.value = 'editor'
}

function startEditNote(id: string) {
  editingId.value = id
  if (size.value === 'maximized') maximizedView.value = 'editor'
}

async function handleSave(content: string) {
  if (editingId.value === 'new') {
    await props.pentestNotes.addNote(content)
  } else if (editingId.value) {
    await props.pentestNotes.updateNote(editingId.value, content)
  }
  editingId.value = null
  if (size.value === 'maximized') maximizedView.value = 'list'
}

function handleCancel() {
  editingId.value = null
  if (size.value === 'maximized') maximizedView.value = 'list'
}

async function handleDelete(id: string) {
  await props.pentestNotes.deleteNote(id)
  if (selectedId.value === id) selectedId.value = null
  if (editingId.value === id) editingId.value = null
}

function toggleSort() {
  props.pentestNotes.sortOrder.value =
    props.pentestNotes.sortOrder.value === 'newest' ? 'oldest' : 'newest'
}

const editorInitialContent = computed(() => {
  if (editingId.value === 'new') return ''
  if (editingId.value) {
    return props.pentestNotes.notes.value.find(n => n.id === editingId.value)?.content ?? ''
  }
  return ''
})
</script>

<template>
  <!-- ─── Minimized: floating capsule / FAB ───────────────────────────────────── -->
  <div
    v-if="size === 'minimized'"
    class="fixed bottom-4 right-4 z-30"
  >
    <button
      class="flex items-center gap-1.5 px-3 py-2 md:rounded-full rounded-[50%] md:rounded-2xl border border-[var(--ch-accent)] bg-[var(--ch-bg-card)] color-[var(--ch-accent)] shadow-lg cursor-pointer hover:opacity-90 transition-opacity md:w-auto w-12 h-12 justify-center"
      @click="restore"
      :aria-label="$t('notes_modal.open_aria')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
      <span class="hidden md:inline text-[0.875em] font-medium">{{ $t('notes_modal.header_label') }}</span>
      <span
        v-if="pentestNotes.noteCount.value > 0"
        class="hidden md:inline-flex items-center justify-center min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--ch-accent)] color-white text-[10px] font-bold"
      >{{ pentestNotes.noteCount.value }}</span>
    </button>
  </div>

  <!-- ─── Standard / Maximized modal ─────────────────────────────────────────── -->
  <template v-else>
    <!-- Backdrop (standard only) -->
    <div
      v-if="size === 'standard'"
      class="fixed inset-0 z-40 bg-black/40 md:bg-black/20"
      @click="$emit('close')"
    />

    <!-- Panel -->
    <div
      :class="[
        'fixed z-50 flex flex-col bg-[var(--ch-bg)] border-[var(--ch-border)]',
        // Desktop: standard = right side panel; maximized = full screen
        size === 'standard'
          ? 'inset-y-0 right-0 w-full md:w-1/2 border-l shadow-xl'
          : 'inset-0 border-none',
        // Mobile standard = full screen
        size === 'standard' ? 'md:translate-x-0' : '',
      ]"
      style="height: 100dvh; max-height: 100vh;"
      @keydown.stop
    >
      <!-- Header toolbar -->
      <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--ch-border)] flex-shrink-0 bg-[var(--ch-bg)]">
        <!-- Back button (mobile maximized list←editor) -->
        <button
          v-if="size === 'maximized' && maximizedView === 'editor'"
          class="md:hidden p-1 rounded color-[var(--ch-text-2)] hover:color-[var(--ch-text-1)] cursor-pointer"
          @click="maximizedView = 'list'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <span class="text-[0.875em] font-semibold color-[var(--ch-text-1)] flex-shrink-0">{{ $t('notes_modal.header_label') }}</span>

        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <svg class="absolute left-2 top-1/2 -translate-y-1/2 color-[var(--ch-text-3)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            v-model="pentestNotes.searchQuery.value"
            type="text"
            :placeholder="$t('notes_modal.search_placeholder')"
            class="w-full pl-7 pr-2 py-1 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] text-[0.8em] outline-none focus:border-[var(--ch-accent)]"
          />
        </div>

        <!-- Sort toggle -->
        <button
          class="p-1.5 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] cursor-pointer hover:border-[var(--ch-accent)] hover:color-[var(--ch-accent)] transition-colors flex-shrink-0"
          :title="$t(pentestNotes.sortOrder.value === 'newest' ? 'notes_modal.sort_title_newest_first' : 'notes_modal.sort_title_oldest_first')"
          @click="toggleSort"
        >
          <!-- Lines + arrow icon: down arrow = newest first, up arrow = oldest first -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="15" y2="12"/>
            <line x1="3" y1="18" x2="9" y2="18"/>
            <polyline v-if="pentestNotes.sortOrder.value === 'newest'" points="17,14 20,18 23,14"/>
            <polyline v-else points="17,18 20,14 23,18"/>
          </svg>
        </button>

        <!-- New note button -->
        <button
          class="p-1.5 rounded border border-[var(--ch-accent)] bg-[var(--ch-accent-soft)] color-[var(--ch-accent)] cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0 text-[0.8em] font-medium"
          :title="$t('notes_modal.action_new')"
          @click="startNewNote"
        >+</button>

        <!-- Window controls -->
        <div class="flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            v-if="size === 'standard'"
            class="p-1 rounded color-[var(--ch-text-3)] hover:color-[var(--ch-text-1)] cursor-pointer"
            :title="$t('notes_modal.action_maximize')"
            @click="maximize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button
            v-if="size === 'maximized'"
            class="p-1 rounded color-[var(--ch-text-3)] hover:color-[var(--ch-text-1)] cursor-pointer"
            :title="$t('notes_modal.action_restore')"
            @click="restore"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="3" width="13" height="13" rx="2"/><path d="M3 8v13h13"/></svg>
          </button>
          <button
            class="p-1 rounded color-[var(--ch-text-3)] hover:color-[var(--ch-text-1)] cursor-pointer"
            :title="$t('notes_modal.action_minimize')"
            @click="minimize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
          </button>
          <button
            class="p-1 rounded color-[var(--ch-text-3)] hover:color-[var(--ch-hard-fg)] cursor-pointer"
            :title="$t('notes_modal.action_close')"
            @click="$emit('close')"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Body: standard = editor above / list below; maximized desktop = two columns; maximized mobile = view switch -->
      <div class="flex-1 overflow-hidden flex">

        <!-- ─── Standard size: single column with list + inline editor ──────────── -->
        <template v-if="size === 'standard'">
          <div class="flex flex-col w-full overflow-hidden">
            <!-- Editor (shown when editing) -->
            <div v-if="editingId" class="flex-1 overflow-hidden border-b border-[var(--ch-border)]" style="min-height: 0; flex: 0 0 50%;">
              <NoteEditor
                :initialContent="editorInitialContent"
                :isNew="editingId === 'new'"
                @save="handleSave"
                @cancel="handleCancel"
              />
            </div>
            <!-- Note list -->
            <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style="min-height: 0;">
              <div v-if="pentestNotes.filteredNotes.value.length === 0" class="text-center py-8 color-[var(--ch-text-3)] text-[0.875em]">
                <span v-if="pentestNotes.noteCount.value === 0">{{ $t('notes_modal.empty_state_no_notes') }}</span>
                <span v-else>{{ $t('notes_modal.empty_state_no_search_match') }}</span>
              </div>
              <NoteCard
                v-for="note in pentestNotes.filteredNotes.value"
                :key="note.id"
                :note="note"
                :isSelected="selectedId === note.id"
                @select="selectedId = note.id"
                @edit="startEditNote(note.id)"
                @delete="handleDelete(note.id)"
              />
            </div>
          </div>
        </template>

        <!-- ─── Maximized desktop: two-column layout ─────────────────────────────── -->
        <template v-else>
          <!-- Left: note list (30%) — always visible on desktop; toggled on mobile -->
          <div
            :class="[
              'border-r border-[var(--ch-border)] overflow-y-auto flex flex-col gap-2 p-2',
              // Desktop: always show; Mobile: hide when viewing editor
              'md:flex md:w-[30%]',
              maximizedView === 'editor' ? 'hidden' : 'flex w-full',
            ]"
          >
            <div v-if="pentestNotes.filteredNotes.value.length === 0" class="text-center py-8 color-[var(--ch-text-3)] text-[0.875em]">
              <span v-if="pentestNotes.noteCount.value === 0">{{ $t('notes_modal.empty_state_no_notes') }}</span>
              <span v-else>{{ $t('notes_modal.empty_state_no_search_match') }}</span>
            </div>
            <NoteCard
              v-for="note in pentestNotes.filteredNotes.value"
              :key="note.id"
              :note="note"
              :isSelected="selectedId === note.id"
              @select="() => { selectedId = note.id; if (size === 'maximized') maximizedView = 'editor'; startEditNote(note.id) }"
              @edit="startEditNote(note.id)"
              @delete="handleDelete(note.id)"
            />
          </div>

          <!-- Right: editor (70%) — desktop always visible; mobile when in editor view -->
          <div
            :class="[
              'flex-1 overflow-hidden',
              maximizedView === 'list' ? 'hidden md:flex md:flex-col' : 'flex flex-col',
            ]"
          >
            <NoteEditor
              v-if="editingId"
              :key="editingId"
              :initialContent="editorInitialContent"
              :isNew="editingId === 'new'"
              @save="handleSave"
              @cancel="handleCancel"
            />
            <div v-else class="flex-1 flex items-center justify-center color-[var(--ch-text-3)] text-[0.875em]">
              {{ $t('notes_modal.editor_placeholder_hint') }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </template>
</template>
