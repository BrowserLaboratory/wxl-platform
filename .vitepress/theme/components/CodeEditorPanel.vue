<script setup lang="ts">
import { checkpointCodeDraft } from '../composables/codeDraftSnapshot'
import { ref, shallowRef, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useChallengePersistence } from '../composables/useChallengePersistence'
import { formatHistoryLabel, type CodeHistoryEntry } from '../composables/codeHistoryLabel'
import { useEditorSettings } from '../composables/useEditorSettings'
import {
  buildAutocomplete,
  buildCloseBrackets,
  buildFontSize,
  type EditorModules,
} from '../composables/editorExtensions'
import EditorSettingsPopover from './EditorSettingsPopover.vue'
import type { ToolsRuntimeHost } from '../workers/runtimeHost'

const props = defineProps<{
  slug: string
  dispatch: (request: Request) => Promise<Response>
  disabled?: boolean
  /** The panel's own runner — a Pyodide living in its own Worker, handed down
   *  from ChallengeLayout. Never the challenge runtime. */
  runner?: ToolsRuntimeHost | null
  /** True while that runner is being created (first Code tab activation). */
  runnerLoading?: boolean
  /** Set when creating it failed; the panel surfaces it rather than falling back. */
  runnerError?: string | null
  /** Called after each code execution with the code, output, error flag, and duration. */
  onCodeExecuted?: (event: { code: string; output: string; error: boolean; duration: number }) => void
  /**
   * This challenge's past executions, newest-first ordering not assumed.
   *
   * Passed down rather than read here: `useAttackSession` is a factory, so a second
   * instance created inside this panel would keep its own copy of the session and the
   * two would overwrite each other's saves.
   */
  codeHistory?: ReadonlyArray<CodeHistoryEntry>
}>()

const { saveCodeDraft, loadCodeDraft } = useChallengePersistence()

// ─── Editor settings ──────────────────────────────────────────────────────────

const settings = useEditorSettings()

/**
 * The three reconfigurable slots, created with the editor and kept for its lifetime.
 *
 * `null` until `initEditor()` runs, which is also the state a setting change has to
 * survive: the panel can be mounted with the tab hidden, so a change made from another
 * page's popover arrives before there is anything to reconfigure.
 */
let acCompartment: import('@codemirror/state').Compartment | null = null
let bracketCompartment: import('@codemirror/state').Compartment | null = null
let fontSizeCompartment: import('@codemirror/state').Compartment | null = null
/** The CodeMirror pieces `initEditor()` imported, kept so reconfigure need not re-import. */
let editorModules: EditorModules | null = null

watch(
  () => [settings.value.autocomplete, settings.value.closeBrackets, settings.value.fontSize] as const,
  ([autocomplete, closeBracketsOn, fontSize]) => {
    const view = editorView.value
    if (!view || !editorModules || !acCompartment || !bracketCompartment || !fontSizeCompartment) return
    // Reconfigure rather than rebuild: a rebuilt view loses the cursor position and the
    // undo history, and the undo history is what makes a history restore reversible.
    view.dispatch({
      effects: [
        acCompartment.reconfigure(buildAutocomplete(autocomplete, editorModules)),
        bracketCompartment.reconfigure(buildCloseBrackets(closeBracketsOn, editorModules)),
        fontSizeCompartment.reconfigure(buildFontSize(fontSize, editorModules)),
      ],
    })
  },
)

// ─── Draft autosave ───────────────────────────────────────────────────────────

/** How long the editor must sit still before the draft is written. */
const DRAFT_DEBOUNCE_MS = 500

const draftCheckpointFailed = ref(false)
let draftTimer: ReturnType<typeof setTimeout> | null = null

function writeDraft(): void {
  const code = editorView.value?.state.doc.toString()
  if (code === undefined) return
  // Failures are swallowed on purpose: the draft is a convenience, and IndexedDB is
  // unavailable outright in some private-browsing modes. Blocking the editor for it
  // would trade a whole tool for a nicety.
  void saveCodeDraft(props.slug, code).catch(() => { /* draft is best-effort */ })
}

function scheduleDraftWrite(): void {
  const code = editorView.value?.state.doc.toString()
  if (code === undefined) return
  try {
    checkpointCodeDraft(props.slug, code)
    draftCheckpointFailed.value = false
  } catch {
    draftCheckpointFailed.value = true
  }
  if (draftTimer !== null) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    draftTimer = null
    writeDraft()
  }, DRAFT_DEBOUNCE_MS)
}

/** Write immediately if a debounced write is still owed, otherwise do nothing. */
function flushDraftWrite(): void {
  if (draftTimer === null) return
  clearTimeout(draftTimer)
  draftTimer = null
  writeDraft()
}

// ─── Editor state ─────────────────────────────────────────────────────────────

const editorContainerRef = ref<HTMLDivElement | null>(null)
const outputRef = ref<HTMLPreElement | null>(null)

// shallowRef to avoid deep reactivity on CM EditorView
const editorView = shallowRef<import('@codemirror/view').EditorView | null>(null)

const outputText = ref('')
const isRunning = ref(false)
const isRestarting = ref(false)

// ─── Execution history ────────────────────────────────────────────────────────

/** Bound to the dropdown; reset to '' after each restore so the same entry can be picked twice. */
const selectedExecutionId = ref('')

const historyOptions = computed(() =>
  [...(props.codeHistory ?? [])]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(e => ({ id: e.executionId, label: formatHistoryLabel(e), code: e.code })),
)

// ─── CodeMirror lazy init ─────────────────────────────────────────────────────

async function initEditor() {
  if (!editorContainerRef.value || editorView.value) return

  // CodeMirror needs a visible container. Skip if the panel is hidden (v-show).
  const { clientWidth, clientHeight } = editorContainerRef.value
  if (clientWidth === 0 && clientHeight === 0) return

  const [
    { EditorView, keymap, lineNumbers, highlightActiveLine },
    { defaultKeymap, historyKeymap, history },
    { python, pythonLanguage },
    { autocompletion, closeBrackets, closeBracketsKeymap },
    { syntaxHighlighting, defaultHighlightStyle, indentOnInput },
    { Compartment, Prec },
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@codemirror/lang-python'),
    import('@codemirror/autocomplete'),
    import('@codemirror/language'),
    import('@codemirror/state'),
  ])

  // Handed to the extension builders, which take CodeMirror as a parameter so their
  // module carries no runtime import and cannot defeat this deferred load.
  editorModules = { EditorView, Prec, pythonLanguage, autocompletion, closeBrackets } as EditorModules
  acCompartment = new Compartment()
  bracketCompartment = new Compartment()
  fontSizeCompartment = new Compartment()

  const STARTER_DOC = '# wxlsh Code Editor\n# Run Python to interact with the challenge\n\nprint("Hello, wxlsh!")\n'

  // A stored draft wins even when it is the empty string: that record exists because the
  // learner cleared the editor, and it has to come back as the empty editor. `?? ` and
  // not `|| ` for exactly that reason.
  let startDoc = STARTER_DOC
  try {
    const draft = await loadCodeDraft(props.slug)
    startDoc = draft?.code ?? STARTER_DOC
  } catch {
    // Best-effort, like the write side. An unreadable draft costs the learner their
    // unsaved text; an editor that refuses to open costs them the tool.
  }

  const view = new EditorView({
    doc: startDoc,
    extensions: [
      history(),
      python(),
      lineNumbers(),
      highlightActiveLine(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle),
      acCompartment.of(buildAutocomplete(settings.value.autocomplete, editorModules)),
      bracketCompartment.of(buildCloseBrackets(settings.value.closeBrackets, editorModules)),
      fontSizeCompartment.of(buildFontSize(settings.value.fontSize, editorModules)),
      keymap.of([
        // Ahead of defaultKeymap: its Backspace binding would otherwise win and delete
        // one character of an auto-inserted pair instead of both.
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        // Ctrl+Enter or Cmd+Enter → run
        {
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => { runCode(); return true },
        },
      ]),
      // Restoring a history entry goes through here too — it is a document change, and
      // the restored content is what the learner now has in front of them.
      EditorView.updateListener.of((update) => {
        if (update.docChanged) scheduleDraftWrite()
      }),
      // The font size is NOT here: it lives in its own compartment above so it can be
      // reconfigured on its own without rebuilding the rest of this theme.
      EditorView.theme({
        '&': {
          height: '100%',
          fontFamily: '"Cascadia Code","JetBrains Mono","Fira Code","Menlo",monospace',
          backgroundColor: 'var(--ch-bg-soft)',
          color: 'var(--ch-text-1)',
        },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content': { caretColor: 'var(--ch-accent)' },
        '.cm-cursor': { borderLeftColor: 'var(--ch-accent)' },
        '.cm-activeLine': { backgroundColor: 'var(--ch-bg-alt, rgba(0,0,0,0.06))' },
        '.cm-gutters': {
          backgroundColor: 'var(--ch-bg-soft)',
          borderRight: '1px solid var(--ch-border)',
          color: 'var(--ch-text-2)',
        },
      }),
    ],
    parent: editorContainerRef.value,
  })

  editorView.value = view
}

// ─── Resizable split ──────────────────────────────────────────────────────────

/** Height of the editor pane as a percentage (0–100). */
const editorHeightPct = ref(65)
const MIN_EDITOR_PX = 120
const MIN_OUTPUT_PX = 80
let isDragging = false
let dragStartY = 0
let dragStartPct = 0
let splitContainerEl: HTMLElement | null = null

function onDragStart(e: MouseEvent | TouchEvent) {
  isDragging = true
  dragStartY = 'touches' in e ? e.touches[0].clientY : e.clientY
  dragStartPct = editorHeightPct.value
  splitContainerEl = (e.currentTarget as HTMLElement).closest('[data-split]') as HTMLElement
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('touchmove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchend', onDragEnd)
  e.preventDefault()
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging || !splitContainerEl) return
  const y = 'touches' in e ? e.touches[0].clientY : e.clientY
  const totalH = splitContainerEl.clientHeight
  if (totalH === 0) return
  const delta = y - dragStartY
  const deltaPct = (delta / totalH) * 100
  const newPct = Math.max(
    (MIN_EDITOR_PX / totalH) * 100,
    Math.min((1 - MIN_OUTPUT_PX / totalH) * 100, dragStartPct + deltaPct),
  )
  editorHeightPct.value = newPct
}

function onDragEnd() {
  isDragging = false
  splitContainerEl = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchend', onDragEnd)
}

// ─── Code execution ───────────────────────────────────────────────────────────

/** Ends the run in flight. Destroying the worker is the only way in: learner
 *  code may be a synchronous loop holding that worker's event loop, so nothing
 *  inside it would ever observe a cancellation flag. */
function stopCode() {
  // Held until the replacement can run again. Stopping destroys the worker, and
  // the one that takes its place has a WebAssembly distribution to load before
  // it can accept anything — offering Run in between makes that wait silent:
  // the learner presses it and nothing visible happens for a cold start.
  isRestarting.value = true
  void Promise.resolve(props.runner?.stop())
    .catch(() => { /* the panel's own state is all that is being restored here */ })
    .finally(() => { isRestarting.value = false })
}

async function runCode() {
  const runner = props.runner ?? null
  if (!runner || !editorView.value) return

  const code = editorView.value.state.doc.toString()
  isRunning.value = true
  outputText.value = ''
  const startTime = Date.now()
  let isError = false

  try {
    // Streamed, not collected. The runner lives in a Worker that Stop destroys,
    // so anything buffered inside it dies with it — and on this platform the
    // lines printed before a Stop are frequently the answer being enumerated.
    //
    // The runner's entry point is asynchronous and must stay that way:
    // `run_sync`, which the shipped `requests` transport is built on, can only
    // suspend a stack an asynchronous entry point started.
    const outcome = await runner.runCode(code, (chunk) => {
      outputText.value += chunk
      if (outputRef.value) outputRef.value.scrollTop = outputRef.value.scrollHeight
    })

    if (outcome.error) {
      isError = true
      outputText.value += `${outputText.value ? '\n' : ''}Error:\n${outcome.error}`
    } else if (outcome.stopped) {
      // Not an error: the learner chose this. Saying so keeps a deliberate stop
      // out of the same bucket as a NameError in the execution history.
      outputText.value += `${outputText.value ? '\n' : ''}(stopped)`
    } else if (!outputText.value) {
      outputText.value = '(no output)'
    }
  } catch (err) {
    isError = true
    outputText.value += `${outputText.value ? '\n' : ''}Error:\n${err instanceof Error ? err.message : String(err)}`
  } finally {
    const duration = Date.now() - startTime
    props.onCodeExecuted?.({ code, output: outputText.value, error: isError, duration })
    isRunning.value = false
    if (outputRef.value) outputRef.value.scrollTop = outputRef.value.scrollHeight
  }
}

// ─── Restore from history ─────────────────────────────────────────────────────

async function handleRestore(event: Event) {
  // Read from the event target rather than the ref: v-model's own change handler and
  // this one run in an order Vue does not promise, so the ref may not be updated yet.
  const id = (event.target as HTMLSelectElement).value
  try {
    if (!id) return
    const entry = historyOptions.value.find(h => h.id === id)
    if (!entry || !editorView.value) return
    const { EditorSelection } = await import('@codemirror/state')
    // Deliberately un-annotated: the transaction enters the undo history, so Ctrl+Z is
    // the way back from an unwanted restore. That is why there is no confirm dialog.
    editorView.value.dispatch({
      changes: { from: 0, to: editorView.value.state.doc.length, insert: entry.code },
      selection: EditorSelection.cursor(0),
    })
  } finally {
    // After the current tick, so v-model's own write cannot land on top of this reset.
    // Without it, picking the same entry twice in a row fires no `change` event at all.
    await nextTick()
    selectedExecutionId.value = ''
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let _resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  // Try immediate init (if panel is already visible)
  await initEditor()
  // Watch for when v-show reveals the panel (clientWidth/Height go from 0 → non-zero)
  if (!editorView.value && editorContainerRef.value) {
    _resizeObserver = new ResizeObserver(async () => {
      if (editorView.value) {
        _resizeObserver?.disconnect()
        _resizeObserver = null
        return
      }
      await initEditor()
      if (editorView.value) {
        _resizeObserver?.disconnect()
        _resizeObserver = null
      }
    })
    _resizeObserver.observe(editorContainerRef.value)
  }
})

onUnmounted(() => {
  // Before destroy(): writeDraft reads the document off the view.
  flushDraftWrite()
  _resizeObserver?.disconnect()
  _resizeObserver = null
  editorView.value?.destroy()
  onDragEnd()
})
</script>

<template>
  <!-- `relative`: the loading overlay below is absolutely positioned. Without a
       positioned ancestor it resolves against the initial containing block, so
       its box spans the viewport. Every ancestor carries `overflow: hidden`, so
       it still *paints* only over this panel and looks correct — while remaining
       the hit-test target across the whole page, swallowing clicks on the
       description column and the flag input. -->
  <div class="relative flex flex-col h-full overflow-hidden bg-[var(--ch-bg-soft)]">

    <p v-if="draftCheckpointFailed" data-draft-warning role="status" class="px-3 py-2 text-sm color-[var(--ch-danger,#e5534b)]">
      Draft could not be saved immediately. Copy your code before reloading or leaving.
    </p>
    <!-- Toolbar -->
    <div class="flex items-center gap-2 flex-shrink-0 px-3 py-1.5 border-b border-[var(--ch-border)] bg-[var(--ch-bg)]">
      <!-- Run button -->
      <button
        data-run
        class="px-3 py-1 rounded text-[0.8em] font-medium border-none"
        :class="[
          props.disabled || isRunning || isRestarting || !props.runner
            ? 'opacity-40 cursor-not-allowed bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)]'
            : 'bg-[var(--ch-accent)] color-white cursor-pointer hover:opacity-90',
        ]"
        :disabled="props.disabled || isRunning || isRestarting || !props.runner"
        @click="runCode"
        :title="props.disabled || !props.runner ? 'Waiting for runtime to initialize…' : 'Run (Ctrl+Enter)'"
      >
        {{ isRunning ? 'Running…' : (isRestarting || props.disabled || !props.runner) ? 'Loading…' : '▶ Run' }}
      </button>

      <!-- Stop: the only way out of a runaway loop, and the reason output is
           streamed rather than collected. Shown only while a run is in flight,
           so it cannot be mistaken for a way to clear the output. -->
      <button
        v-if="isRunning"
        data-stop
        class="px-3 py-1 rounded text-[0.8em] font-medium border-none bg-[var(--ch-danger,#e5534b)] color-white cursor-pointer hover:opacity-90"
        @click="stopCode"
        title="Stop the running code"
      >
        ■ Stop
      </button>

      <span v-if="!props.disabled && props.runner && !isRunning" class="text-[0.75em] color-[var(--ch-text-2)] select-none">Ctrl+Enter</span>

      <div class="flex-1" />

      <!-- Execution history: restore the code from any past run of this challenge -->
      <select
        data-history-select
        v-model="selectedExecutionId"
        class="px-2 py-1 rounded text-[0.8em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)]"
        :disabled="props.disabled || historyOptions.length === 0"
        @change="handleRestore"
        title="Load the code from a previous run"
      >
        <option value="">History…</option>
        <option v-for="h in historyOptions" :key="h.id" :value="h.id">{{ h.label }}</option>
      </select>

      <!-- Not gated on `disabled`: editor settings do not depend on the Python runtime. -->
      <EditorSettingsPopover />
    </div>

    <!-- Disabled / loading / failure overlay -->
    <div
      v-if="props.disabled || props.runnerLoading || props.runnerError"
      data-runtime-overlay
      class="absolute inset-0 z-10 flex items-center justify-center px-6 text-center bg-[var(--ch-bg-soft)] bg-opacity-80 color-[var(--ch-text-2)] text-sm"
    >
      <span v-if="props.runnerError" data-runtime-error class="color-[var(--ch-danger,#e5534b)]">
        Python environment failed to load: {{ props.runnerError }}
      </span>
      <span v-else-if="props.runnerLoading">Loading Python environment…</span>
      <span v-else>Loading runtime…</span>
    </div>

    <!-- Resizable split: editor + output -->
    <div class="flex flex-col flex-1 overflow-hidden relative" data-split>

      <!-- Editor pane -->
      <div
        class="overflow-hidden flex-shrink-0"
        :style="{ height: editorHeightPct + '%' }"
      >
        <div ref="editorContainerRef" class="h-full w-full" data-editor />
      </div>

      <!-- Drag handle -->
      <div
        class="flex-shrink-0 h-1.5 cursor-row-resize bg-[var(--ch-border)] hover:bg-[var(--ch-accent)] transition-colors select-none"
        data-drag-handle
        @mousedown="onDragStart"
        @touchstart.passive="onDragStart"
        title="Drag to resize"
      />

      <!-- Output pane -->
      <div class="flex flex-col flex-1 overflow-hidden min-h-0">
        <div class="flex items-center px-3 py-1 text-[0.75em] color-[var(--ch-text-2)] border-b border-[var(--ch-border)] flex-shrink-0 select-none">
          Output
        </div>
        <pre
          ref="outputRef"
          data-output
          class="flex-1 m-0 p-3 overflow-auto text-[0.8em] font-mono color-[var(--ch-text-1)] bg-[var(--ch-bg)] whitespace-pre-wrap"
        >{{ outputText }}</pre>
      </div>
    </div>

  </div>
</template>
