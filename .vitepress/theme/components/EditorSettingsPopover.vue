<script setup lang="ts">
/**
 * The gear entry point for the Code panel's editor settings.
 *
 * Self-contained: owns its open state and binds each control straight to the shared
 * `useEditorSettings` ref, so a change applies to the running editor and persists with
 * no separate confirm step.
 *
 * **The panel is teleported to `<body>` on purpose.** The Code panel's root and several
 * of its ancestors carry `overflow: hidden` — the same stack that once made an
 * `absolute inset-0` overlay paint correctly while swallowing clicks across the whole
 * page. An in-flow panel here would be clipped to the toolbar, and `z-index` does not
 * escape overflow clipping.
 *
 * Dismissal listens on `mousedown` in the capture phase rather than `click`: the panel
 * below the toolbar has a drag-resizable divider, and a press that starts a drag has to
 * close the popover before the layout moves under it. Capture phase because controls
 * that stop propagation would otherwise starve a bubble listener.
 *
 * Deliberately NOT closed on focus leaving: the teleported panel sits at the end of
 * `<body>`, so Tab from the gear lands outside it, and a focus-based close would slam it
 * shut on the first Tab a keyboard user presses.
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useEditorSettings, DEFAULT_EDITOR_SETTINGS } from '../composables/useEditorSettings'
import { FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP } from '../composables/editorConfig'

const settings = useEditorSettings()

const isOpen = ref(false)
const gearRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

/** Keep 8px clear of every viewport edge so the panel is never half off-screen. */
const VIEWPORT_MARGIN = 8
/** Matches the panel's own width class; used to clamp before the panel has been measured. */
const PANEL_WIDTH = 288

function position(): void {
  const anchor = gearRef.value
  if (!anchor) return
  const rect = anchor.getBoundingClientRect()
  const width = panelRef.value?.offsetWidth || PANEL_WIDTH
  // Right edges aligned, then pulled back inside the viewport if that would overflow.
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN),
  )
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
    maxHeight: `${Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_MARGIN * 2)}px`,
    overflowY: 'auto',
  }
}

async function openPanel(): Promise<void> {
  isOpen.value = true
  position()
  await nextTick()
  // Measured again now that the panel exists: the first pass used the nominal width.
  position()
  panelRef.value?.focus()
}

function closePanel(): void {
  // Only when focus is still inside the panel. A learner who clicked elsewhere moved
  // focus deliberately, and pulling it back to the gear would undo that. Measured in a
  // real browser before this existed: Escape left focus on `document.body`, dropping a
  // keyboard user back at the top of the tab order after every dismissal.
  const returnFocus = panelRef.value?.contains(document.activeElement) ?? false
  isOpen.value = false
  panelStyle.value = {}
  if (returnFocus) gearRef.value?.focus()
}

function toggle(): void {
  if (isOpen.value) closePanel()
  else void openPanel()
}

function onDocumentMouseDown(event: MouseEvent): void {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (gearRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  closePanel()
}

function onKeyDown(event: KeyboardEvent): void {
  if (isOpen.value && event.key === 'Escape') closePanel()
}

function onViewportChange(): void {
  if (isOpen.value) position()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown, true)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown, true)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

const atMin = computed(() => settings.value.fontSize <= FONT_SIZE_MIN)
const atMax = computed(() => settings.value.fontSize >= FONT_SIZE_MAX)

// A fresh object is assigned each time so the persisted ref sees the write. The bound
// guard makes an activation at the limit a genuine no-op rather than a clamped write.
function decreaseFontSize(): void {
  if (atMin.value) return
  settings.value = {
    ...settings.value,
    fontSize: Math.max(FONT_SIZE_MIN, settings.value.fontSize - FONT_SIZE_STEP),
  }
}

function increaseFontSize(): void {
  if (atMax.value) return
  settings.value = {
    ...settings.value,
    fontSize: Math.min(FONT_SIZE_MAX, settings.value.fontSize + FONT_SIZE_STEP),
  }
}

function reset(): void {
  settings.value = { ...DEFAULT_EDITOR_SETTINGS }
}
</script>

<template>
  <div class="inline-flex">
    <button
      ref="gearRef"
      type="button"
      data-editor-settings-gear
      class="flex items-center px-1.5 py-1 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] hover:color-[var(--ch-text-1)] cursor-pointer"
      :aria-expanded="isOpen"
      :aria-label="$t('editor_settings.gear_aria')"
      :title="$t('editor_settings.gear_aria')"
      @click="toggle"
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        :style="panelStyle"
        tabindex="-1"
        data-editor-settings-panel
        role="dialog"
        :aria-label="$t('editor_settings.title')"
        class="w-72 rounded-lg border border-[var(--ch-border)] bg-[var(--ch-bg-card,var(--ch-bg))] color-[var(--ch-text-1)] shadow-xl p-3 z-50"
      >
        <h3 class="m-0 mb-1 text-[0.85em] font-bold">{{ $t('editor_settings.title') }}</h3>

        <label class="flex items-center justify-between gap-3 py-2 cursor-pointer border-b border-[var(--ch-border)]">
          <span class="text-[0.8em]">
            {{ $t('editor_settings.autocomplete_label') }}
            <small class="block text-[0.9em] color-[var(--ch-text-2)] mt-0.5">{{ $t('editor_settings.autocomplete_hint') }}</small>
          </span>
          <input
            v-model="settings.autocomplete"
            data-toggle-autocomplete
            type="checkbox"
            class="w-4 h-4 shrink-0 cursor-pointer"
          />
        </label>

        <label class="flex items-center justify-between gap-3 py-2 cursor-pointer border-b border-[var(--ch-border)]">
          <span class="text-[0.8em]">
            {{ $t('editor_settings.close_brackets_label') }}
            <small class="block text-[0.9em] color-[var(--ch-text-2)] mt-0.5">{{ $t('editor_settings.close_brackets_hint') }}</small>
          </span>
          <input
            v-model="settings.closeBrackets"
            data-toggle-close-brackets
            type="checkbox"
            class="w-4 h-4 shrink-0 cursor-pointer"
          />
        </label>

        <!-- A pair of stepper buttons is not one labelled control, so this row is a
             role="group", not a <label>. A for-less <label> would make its first
             labelable descendant — the − button — the implicit control, and clicking
             the description text would silently shrink the font. -->
        <div
          class="flex items-center justify-between gap-3 py-2"
          role="group"
          aria-labelledby="wxl-editor-fontsize-label"
        >
          <span id="wxl-editor-fontsize-label" class="text-[0.8em]">
            {{ $t('editor_settings.font_size_label') }}
            <small class="block text-[0.9em] color-[var(--ch-text-2)] mt-0.5">{{ $t('editor_settings.font_size_hint') }}</small>
          </span>
          <span class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-font-size-decrease
              class="w-7 h-7 flex items-center justify-center rounded border border-[var(--ch-border)] color-[var(--ch-text-1)] cursor-pointer aria-disabled:opacity-40 aria-disabled:cursor-not-allowed"
              :aria-disabled="atMin"
              :aria-label="$t('editor_settings.font_size_decrease_aria')"
              @click="decreaseFontSize"
            >&#8722;</button>
            <span data-font-size-value class="text-[0.8em] w-12 text-center" aria-live="polite">{{ settings.fontSize }}px</span>
            <button
              type="button"
              data-font-size-increase
              class="w-7 h-7 flex items-center justify-center rounded border border-[var(--ch-border)] color-[var(--ch-text-1)] cursor-pointer aria-disabled:opacity-40 aria-disabled:cursor-not-allowed"
              :aria-disabled="atMax"
              :aria-label="$t('editor_settings.font_size_increase_aria')"
              @click="increaseFontSize"
            >+</button>
          </span>
        </div>

        <div class="pt-2 border-t border-[var(--ch-border)] flex justify-end">
          <button
            type="button"
            data-editor-settings-reset
            class="text-[0.75em] color-[var(--ch-accent)] hover:underline cursor-pointer bg-transparent border-none"
            @click="reset"
          >{{ $t('editor_settings.reset') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
