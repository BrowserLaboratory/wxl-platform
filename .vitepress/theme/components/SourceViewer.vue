<script setup lang="ts">
/**
 * Read-only viewer for a white-box challenge's source.
 *
 * The text it renders is the *display* copy the build script produced, not the program
 * the challenge runtime executes: flag values are already replaced with a placeholder
 * before this component ever sees a string. Nothing here redacts anything, and nothing
 * here should start to — a component that had to redact would first have to hold the
 * real flag.
 *
 * The editor is CodeMirror, configured the way `CodeEditorPanel.vue` configures its own:
 * modules loaded through dynamic `import()` so the packages stay out of the bundle for
 * every black-box challenge, theme expressed in the `--ch-*` variables, same font stack.
 * The differences are that this one is read-only and that its font size comes from
 * `useSourceViewerSettings`, which is a separate contract from the editor's.
 *
 * Interface strings are English, matching the four tool panels — all of which have zero
 * `$t` calls. Only the settings popover in this workspace is localised.
 */
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSourceViewerSettings } from '../composables/useSourceViewerSettings'
import { FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP } from '../composables/editorConfig'

export interface SourceFile {
  path: string
  content: string
}

const props = defineProps<{ files: SourceFile[] }>()

const settings = useSourceViewerSettings()

// CodeMirror's `searchKeymap` binds `Mod-f`, and `Mod` is Cmd on Apple platforms and
// Ctrl everywhere else. The hint has to say the same thing the binding does; a fixed
// "Ctrl+F" was wrong on the machine this was built on.
const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  ? '\u2318'
  : 'Ctrl+'

const activeIndex = ref(0)
const editorHost = ref<HTMLElement | null>(null)
// shallowRef: the view owns a DOM subtree and a transaction log, neither of which wants
// to be behind Vue's reactive proxy.
const editorView = shallowRef<import('@codemirror/view').EditorView | null>(null)

defineExpose({ editorView, increaseFontSize, decreaseFontSize })

const activeFile = computed<SourceFile | undefined>(() => props.files[activeIndex.value])
const hasFileList = computed(() => props.files.length > 1)

/**
 * Language support for a path, or `null` when none is installed.
 *
 * Only Python is installed. Anything else — a template, a config file, PHP — is shown as
 * plain text, which still has line numbers, search and folding. Guessing at a language
 * would be worse than not colouring it.
 */
async function languageFor(path: string): Promise<import('@codemirror/state').Extension | null> {
  if (!path.endsWith('.py')) return null
  const { python } = await import('@codemirror/lang-python')
  return python()
}

async function buildEditor(): Promise<void> {
  if (!editorHost.value || !activeFile.value) return

  const [
    { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter },
    { defaultKeymap },
    { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, bracketMatching },
    { searchKeymap, highlightSelectionMatches, search },
    { EditorState },
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@codemirror/search'),
    import('@codemirror/state'),
  ])
  const language = await languageFor(activeFile.value.path)

  // Re-taken after the awaits: the guard at the top ran before five chunk loads, and an
  // unmount during them nulls the template ref. Measured in round 3 of review: mount,
  // unmount, wait — `Cannot set properties of null (setting 'innerHTML')` as an unhandled
  // rejection, which this repo's suite reports as an Error while every test stays green.
  if (!editorHost.value) return

  editorView.value?.destroy()
  editorHost.value.innerHTML = ''

  editorView.value = new EditorView({
    doc: activeFile.value.content,
    extensions: [
      lineNumbers(),
      foldGutter(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      search({ top: true }),
      highlightSelectionMatches(),
      ...(language ? [language] : []),
      // Both, not either. `readOnly` stops transactions that change the document;
      // `editable` stops the browser treating the content as an input at all. Setting
      // only the first leaves a caret and a contenteditable surface that looks writable;
      // setting only the second leaves the document open to programmatic edits.
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      // `editable: false` also makes the content unfocusable, and an unfocusable editor
      // never receives a key event — measured in a real browser, the search shortcut did nothing
      // because focus stayed on the tab button. `tabindex` restores focusability without
      // restoring contenteditable, so the search and fold bindings work on a surface the
      // browser still refuses to write into.
      EditorView.contentAttributes.of({ tabindex: '0' }),
      // Search and fold bindings first: the learner reads with them, and nothing in
      // `defaultKeymap` that survives read-only mode needs to win over them.
      keymap.of([...searchKeymap, ...foldKeymap, ...defaultKeymap]),
      EditorView.theme({
        '&': {
          height: '100%',
          fontFamily: '"Cascadia Code","JetBrains Mono","Fira Code","Menlo",monospace',
          backgroundColor: 'var(--ch-bg-soft)',
          color: 'var(--ch-text-1)',
        },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-activeLine': { backgroundColor: 'var(--ch-bg-alt, rgba(0,0,0,0.06))' },
        '.cm-gutters': {
          backgroundColor: 'var(--ch-bg-soft)',
          borderRight: '1px solid var(--ch-border)',
          color: 'var(--ch-text-2)',
        },
      }),
    ],
    parent: editorHost.value,
  })
}

const atMin = computed(() => settings.value.fontSize <= FONT_SIZE_MIN)
const atMax = computed(() => settings.value.fontSize >= FONT_SIZE_MAX)

/**
 * Two steppers rather than the Code panel's gear popover.
 *
 * That popover carries teleporting, viewport-edge positioning and focus return, all of
 * it earned against the Code panel's overflow stack. Copying it would fork that
 * behaviour into a second place to keep in step, and the viewer has exactly one setting.
 *
 * A fresh object is assigned so the persisted ref sees the write, and the bound guards
 * make an activation at a limit a genuine no-op rather than a clamped write.
 */
function increaseFontSize(): void {
  if (atMax.value) return
  settings.value = { ...settings.value, fontSize: settings.value.fontSize + FONT_SIZE_STEP }
}

function decreaseFontSize(): void {
  if (atMin.value) return
  settings.value = { ...settings.value, fontSize: settings.value.fontSize - FONT_SIZE_STEP }
}

function selectFile(index: number): void {
  if (index === activeIndex.value) return
  activeIndex.value = index
}

// A file switch rebuilds the view rather than dispatching a replace transaction: the
// language extension differs per file, and reconfiguring it is more machinery than
// rebuilding a document nobody can edit.
watch(activeIndex, () => { void buildEditor() })
watch(() => props.files, () => { activeIndex.value = 0; void buildEditor() })

onMounted(() => { void buildEditor() })
onUnmounted(() => {
  editorView.value?.destroy()
  editorView.value = null
})
</script>

<template>
  <div
    data-source-viewer
    class="flex flex-col h-full overflow-hidden bg-[var(--ch-bg-soft)]"
    :style="{ fontSize: `${settings.fontSize}px` }"
  >
    <div class="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--ch-border)] shrink-0">
      <span
        v-if="!hasFileList"
        data-source-file-heading
        class="font-mono text-[0.85em] color-[var(--ch-text-2)]"
      >{{ activeFile?.path }}</span>
      <span v-else class="font-mono text-[0.85em] color-[var(--ch-text-2)]">{{ activeFile?.path }}</span>
      <span class="ml-auto text-[0.75em] color-[var(--ch-text-3)]">Read-only &middot; {{ modKey }}F to search</span>
      <button
        data-source-font-decrease
        type="button"
        class="ch-view-btn text-[0.75em]"
        :disabled="atMin"
        title="Smaller text"
        aria-label="Decrease source font size"
        @click="decreaseFontSize"
      >A&minus;</button>
      <button
        data-source-font-increase
        type="button"
        class="ch-view-btn text-[0.75em]"
        :disabled="atMax"
        title="Larger text"
        aria-label="Increase source font size"
        @click="increaseFontSize"
      >A+</button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <nav
        v-if="hasFileList"
        data-source-file-list
        class="w-[180px] shrink-0 overflow-y-auto border-r border-[var(--ch-border)] py-1"
      >
        <button
          v-for="(file, index) in props.files"
          :key="file.path"
          data-source-file
          type="button"
          class="block w-full text-left px-3 py-1 font-mono text-[0.8em] bg-transparent border-none cursor-pointer color-[var(--ch-text-2)] hover:color-[var(--ch-text-1)]"
          :class="{ 'color-[var(--ch-accent)]': index === activeIndex }"
          @click="selectFile(index)"
        >{{ file.path }}</button>
      </nav>

      <div ref="editorHost" data-source-editor class="flex-1 overflow-hidden" />
    </div>
  </div>
</template>
