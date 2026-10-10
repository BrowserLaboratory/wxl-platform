import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ─── Mock CodeMirror ──────────────────────────────────────────────────────────

const mockEditorState = {
  doc: { toString: vi.fn(() => 'print("hello")'), length: 16 },
}
let mockEditorViewInstance: {
  state: typeof mockEditorState
  dispatch: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

let editorViewConstructed = false
/** The callback the panel hands to EditorView.updateListener.of(), captured for the autosave tests. */
let capturedUpdateListener: ((u: { docChanged: boolean }) => void) | null = null
/** The options object the panel passes to `new EditorView(...)`, captured to read `doc`. */
let capturedEditorOpts: { doc?: string } | null = null

vi.mock('@codemirror/view', () => {
  class MockEditorView {
    state = mockEditorState
    dispatch = vi.fn()
    destroy = vi.fn()
    static theme = vi.fn(() => ({}))
    static updateListener = {
      of: vi.fn((cb: (u: { docChanged: boolean }) => void) => {
        capturedUpdateListener = cb
        return {}
      }),
    }
    constructor(opts: { doc?: string }) {
      capturedEditorOpts = opts
      editorViewConstructed = true
      mockEditorViewInstance = this as unknown as typeof mockEditorViewInstance
    }
  }
  return {
    EditorView: MockEditorView,
    keymap: { of: vi.fn(() => ({})) },
    lineNumbers: vi.fn(() => ({})),
    highlightActiveLine: vi.fn(() => ({})),
  }
})

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  historyKeymap: [],
  history: vi.fn(() => ({})),
}))

vi.mock('@codemirror/lang-python', () => ({
  python: vi.fn(() => ({})),
  pythonLanguage: { data: { of: vi.fn((v: unknown) => ({ __data: v })) } },
}))

vi.mock('@codemirror/autocomplete', () => ({
  autocompletion: vi.fn(() => ({})),
  closeBrackets: vi.fn(() => ({})),
  closeBracketsKeymap: [],
}))

vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: vi.fn(() => ({})),
  defaultHighlightStyle: {},
  indentOnInput: vi.fn(() => ({})),
}))

vi.mock('@codemirror/state', () => {
  // The panel places the three settings in compartments and reconfigures them in
  // place; these tests are not about that, but `initEditor` throws without them.
  class MockCompartment {
    of(ext: unknown) { return { __compartment: ext } }
    reconfigure(ext: unknown) { return { __reconfigure: ext } }
  }
  return {
    EditorSelection: { cursor: vi.fn((n: number) => n) },
    Compartment: MockCompartment,
    Prec: { highest: vi.fn((ext: unknown) => ({ __highest: ext })) },
  }
})

// ─── Mock useChallengePersistence ─────────────────────────────────────────────

const mockSaveCodeDraft = vi.fn(async (_slug: string, _code: string) => undefined)
let mockDraft: { challengeSlug: string; code: string; updatedAt: number } | null = null
const mockLoadCodeDraft = vi.fn(async (_slug: string) => mockDraft)

vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  useChallengePersistence: vi.fn(() => ({
    saveCodeDraft: mockSaveCodeDraft,
    loadCodeDraft: mockLoadCodeDraft,
  })),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn(async (_req: Request) => new Response('ok', { status: 200 }))

interface HistoryEntry { executionId: string; timestamp: number; code: string; error: boolean }

async function mountPanel(
  runner: ReturnType<typeof makeRunner> | null = null,
  disabled = false,
  onCodeExecuted?: (e: { code: string; output: string; error: boolean; duration: number }) => void,
  codeHistory?: HistoryEntry[],
) {
  const props: Record<string, unknown> = {
    slug: 'test',
    dispatch: mockDispatch,
    disabled,
    runner: runner ?? null,
  }
  if (onCodeExecuted) props.onCodeExecuted = onCodeExecuted
  if (codeHistory) props.codeHistory = codeHistory
  const wrapper = mount(
    (await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')).default,
    { props, attachTo: document.body },
  )
  // initEditor()'s 6 chained `await import(...)` resolve across multiple
  // microtask rounds that a single flushPromises() does not fully drain
  // under vitest 4 + happy-dom 20. Poll until the EditorView constructor
  // (mocked above) has run; that proves editorView.value is also set,
  // because the constructor and the `editorView.value = view` assignment
  // are in the same synchronous block of initEditor().
  await vi.waitFor(() => {
    expect(editorViewConstructed).toBe(true)
  }, { timeout: 5000, interval: 5 })
  await flushPromises()
  return wrapper
}

/**
 * A stand-in for the tools runtime host. It streams whatever chunks the test
 * hands it and then settles the run — the same order the real worker uses, so a
 * test cannot accidentally assert on a buffer that the real path never has.
 */
function makeRunner(chunks: string[] = [], outcome: { error: string | null; stopped: boolean } = { error: null, stopped: false }) {
  return {
    ready: true,
    warmUp: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    runCode: vi.fn(async (_code: string, onStdout?: (c: string) => void) => {
      for (const c of chunks) onStdout?.(c)
      return outcome
    }),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  editorViewConstructed = false
  capturedUpdateListener = null
  capturedEditorOpts = null
  mockDraft = null
  // jsdom has no layout engine; stub dimensions so initEditor's guard passes.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true, get: () => 800,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true, get: () => 600,
  })
})

afterEach(() => {
  // Fully delete the stub descriptors so the prototype returns to its
  // original (happy-dom-default) state. Without this, the non-zero
  // dimensions set in beforeEach could leak into the gap between this
  // file's last afterEach and a neighbor file's first beforeEach if a
  // worker were ever reused without re-isolating happy-dom.
  delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth
  delete (HTMLElement.prototype as unknown as { clientHeight?: number }).clientHeight
})

describe('CodeEditorPanel', () => {
  it('renders Run button', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-run]').exists()).toBe(true)
    wrapper.unmount()
  })

  // The named-script controls are gone. The store behind them carried no challenge
  // slug, so every challenge listed every other challenge's scripts; nothing ever
  // called the delete method; and each save minted a fresh id, so saving twice under
  // one name produced two records.
  it('renders neither a Save button nor a Load dropdown', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-save]').exists()).toBe(false)
    expect(wrapper.find('[data-load-select]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('initialises CodeMirror editor in onMounted', async () => {
    await mountPanel()
    expect(editorViewConstructed).toBe(true)
  })

  it('shows disabled overlay when disabled=true', async () => {
    const wrapper = await mountPanel(null, true)
    expect(wrapper.text()).toMatch(/loading runtime/i)
    wrapper.unmount()
  })

  it('Run button is disabled when there is no runner', async () => {
    const wrapper = await mountPanel(null, false)
    const btn = wrapper.find('[data-run]')
    expect(btn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('hands the code to the runner when Run is clicked', async () => {
    const runner = makeRunner()
    const wrapper = await mountPanel(runner)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(runner.runCode).toHaveBeenCalledWith('print("hello")', expect.any(Function))
    wrapper.unmount()
  })

  it('destroys editor on unmount', async () => {
    const wrapper = await mountPanel()
    wrapper.unmount()
    expect(mockEditorViewInstance.destroy).toHaveBeenCalled()
  })

  it('renders output area', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-output]').exists()).toBe(true)
    wrapper.unmount()
  })

  // The panel used to inject an async `_RequestsStub` under the name `requests`
  // right before user code ran. Writing `import requests` rebound the name to
  // the real library, so which of the two a student got depended on whether
  // they typed that line — and the two have incompatible APIs. Only the real
  // library is wired up now.
  it('does not inject a requests stub before running user code', async () => {
    const { buildRequestsStub } = await import('../../../.vitepress/theme/composables/requestsStub')
    const runner = makeRunner()
    const wrapper = await mountPanel(runner)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()

    // The panel sends the editor's content and nothing else. Injecting the stub
    // under the name `requests` made which implementation a learner got depend
    // on whether they typed `import requests`, and the two have incompatible
    // APIs.
    const sent = runner.runCode.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sent.some(src => src.includes('_RequestsStub'))).toBe(false)
    expect(sent).not.toContain(buildRequestsStub())
    expect(sent).toEqual(['print("hello")'])
    wrapper.unmount()
  })

  // The stub module has no caller by design, so nothing else would notice it
  // rotting. This keeps it executable: the source must still be valid Python
  // that Pyodide accepts, and must still route through the dispatch bridge
  // rather than reaching for `js` directly.
  it('keeps the retained requests stub module executable', async () => {
    const { buildRequestsStub } = await import('../../../.vitepress/theme/composables/requestsStub')
    const source = buildRequestsStub()

    expect(source).toContain('_wxlsh_dispatch_bridge')
    expect(source).not.toContain('from js import')
    // Retained, not wired. It is the only shape that could work where JSPI is
    // unavailable, so the source is worth keeping while that question is open.
    expect(source).toContain('class _RequestsStub')
  })

  it('calls onCodeExecuted callback on successful execution', async () => {
    const runner = makeRunner(['hello\n'])
    const cb = vi.fn()
    const wrapper = await mountPanel(runner, false, cb)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(cb).toHaveBeenCalledTimes(1)
    const arg = cb.mock.calls[0][0]
    expect(arg.code).toBe('print("hello")')
    expect(arg.output).toBe('hello\n')
    expect(arg.error).toBe(false)
    expect(arg.duration).toBeTypeOf('number')
    expect(arg.duration).toBeGreaterThanOrEqual(0)
    wrapper.unmount()
  })

  it('calls onCodeExecuted with error flag on exception', async () => {
    const runner = makeRunner([], { error: 'NameError: x', stopped: false })
    const cb = vi.fn()
    const wrapper = await mountPanel(runner, false, cb)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(cb).toHaveBeenCalledTimes(1)
    const arg = cb.mock.calls[0][0]
    expect(arg.error).toBe(true)
    expect(arg.output).toContain('NameError')
    wrapper.unmount()
  })

  it('does not call onCodeExecuted when there is no runner (silent exit)', async () => {
    const cb = vi.fn()
    const wrapper = await mountPanel(null, false, cb)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(cb).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  // ─── Execution-history dropdown ─────────────────────────────────────────────
  //
  // The panel does not read the attack session. It receives the list from the layout,
  // because `useAttackSession` is a factory rather than a singleton: a second instance
  // would hold its own copy of the session and each would overwrite the other's save.

  it('renders the history dropdown disabled when there is no history', async () => {
    const wrapper = await mountPanel()
    const select = wrapper.find('[data-history-select]')
    // Present-but-disabled, not absent. A control that appears after the first run
    // would shift the toolbar's width mid-session.
    expect(select.exists()).toBe(true)
    expect(select.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-history-select] option')).toHaveLength(1)
    wrapper.unmount()
  })

  it('orders history options newest first', async () => {
    const history: HistoryEntry[] = [
      { executionId: 'mid', timestamp: new Date(2026, 7, 23, 10, 0, 2).getTime(), code: 'B', error: false },
      { executionId: 'old', timestamp: new Date(2026, 7, 23, 10, 0, 1).getTime(), code: 'A', error: false },
      { executionId: 'new', timestamp: new Date(2026, 7, 23, 10, 0, 3).getTime(), code: 'C', error: false },
    ]
    // Deliberately out of order on the way in, so the assertion measures the panel's
    // sort rather than the order the caller happened to supply.
    const wrapper = await mountPanel(null, false, undefined, history)
    const options = wrapper.findAll('[data-history-select] option')
    expect(options).toHaveLength(4) // placeholder + three entries
    expect(options.slice(1).map(o => (o.element as HTMLOptionElement).value))
      .toEqual(['new', 'mid', 'old'])
    wrapper.unmount()
  })

  it('enables the history dropdown once there is an entry', async () => {
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'print(1)', error: false },
    ]
    const wrapper = await mountPanel(null, false, undefined, history)
    expect(wrapper.find('[data-history-select]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('labels a history option with the derived label', async () => {
    const at = new Date(2026, 7, 23, 14, 5, 9).getTime()
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: at, code: 'print(1)', error: true },
    ]
    const wrapper = await mountPanel(null, false, undefined, history)
    const options = wrapper.findAll('[data-history-select] option')
    expect(options[1].text()).toBe('⚠ 14:05:09 · print(1)')
    wrapper.unmount()
  })

  // ─── Restoring a history entry ──────────────────────────────────────────────

  it('restores the selected entry into the editor in one dispatch', async () => {
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'r = requests.get(URL)', error: false },
    ]
    const wrapper = await mountPanel(null, false, undefined, history)
    const select = wrapper.find('[data-history-select]')
    ;(select.element as HTMLSelectElement).value = 'e1'
    await select.trigger('change')
    await flushPromises()

    expect(mockEditorViewInstance.dispatch).toHaveBeenCalledTimes(1)
    const tx = mockEditorViewInstance.dispatch.mock.calls[0][0]
    expect(tx.changes).toEqual({ from: 0, to: mockEditorState.doc.length, insert: 'r = requests.get(URL)' })
    expect(tx.selection).toBe(0) // EditorSelection.cursor is mocked to return its argument
    wrapper.unmount()
  })

  // What this can and cannot see: it asserts the transaction is not annotated to bypass
  // the undo history, which is the one thing the panel controls. Whether CodeMirror then
  // actually undoes it is CodeMirror's own behaviour and is not exercised here — the
  // EditorView in this file is a mock.
  it('does not exclude the restore from the undo history', async () => {
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'restored', error: false },
    ]
    const wrapper = await mountPanel(null, false, undefined, history)
    const select = wrapper.find('[data-history-select]')
    ;(select.element as HTMLSelectElement).value = 'e1'
    await select.trigger('change')
    await flushPromises()

    const tx = mockEditorViewInstance.dispatch.mock.calls[0][0]
    expect(tx).not.toHaveProperty('annotations')
    wrapper.unmount()
  })

  it('resets the dropdown to the placeholder after restoring', async () => {
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'restored', error: false },
    ]
    const wrapper = await mountPanel(null, false, undefined, history)
    const select = wrapper.find('[data-history-select]')
    ;(select.element as HTMLSelectElement).value = 'e1'
    await select.trigger('change')
    await flushPromises()
    // Without the reset, picking the same entry twice in a row fires no `change` event.
    expect((wrapper.find('[data-history-select]').element as HTMLSelectElement).value).toBe('')
    wrapper.unmount()
  })

  it('does not run the restored code', async () => {
    const runner = makeRunner()
    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'restored', error: false },
    ]
    const wrapper = await mountPanel(runner, false, undefined, history)
    runner.runCode.mockClear()
    const select = wrapper.find('[data-history-select]')
    ;(select.element as HTMLSelectElement).value = 'e1'
    await select.trigger('change')
    await flushPromises()
    // Asserted on the execution path, not on the final editor content: a restore that
    // also ran would leave the same document behind.
    expect(runner.runCode).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('ignores a selection made before the editor exists', async () => {
    // The panel is mounted while its container reports no size, so initEditor bails and
    // `editorView` stays null — the state a learner hits by selecting during startup.
    delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth
    delete (HTMLElement.prototype as unknown as { clientHeight?: number }).clientHeight
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 0 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 0 })

    const history: HistoryEntry[] = [
      { executionId: 'e1', timestamp: Date.now(), code: 'restored', error: false },
    ]
    const wrapper = mount(
      (await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')).default,
      { props: { slug: 'test', dispatch: mockDispatch, disabled: false, runner: null, codeHistory: history }, attachTo: document.body },
    )
    await flushPromises()
    expect(editorViewConstructed).toBe(false)

    // `trigger('change')` cannot see this: the handler is async and Vue does not await
    // it, so a throw inside becomes an unhandled rejection rather than a thrown error.
    // The listener is what makes the guard's absence observable.
    const rejections: unknown[] = []
    const onRejection = (e: PromiseRejectionEvent | { reason?: unknown }) => {
      rejections.push((e as PromiseRejectionEvent).reason ?? e)
    }
    process.on('unhandledRejection', onRejection)
    try {
      const select = wrapper.find('[data-history-select]')
      ;(select.element as HTMLSelectElement).value = 'e1'
      await select.trigger('change')
      await flushPromises()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(rejections).toEqual([])
    } finally {
      process.off('unhandledRejection', onRejection)
    }
    wrapper.unmount()
  })


  // ─── Draft autosave ─────────────────────────────────────────────────────────

  it('checkpoints changed text and empty text synchronously before debounce', async () => {
    const wrapper = await mountPanel()
    capturedUpdateListener!({ docChanged: true })
    expect(JSON.parse(localStorage.getItem('wxl-code-draft-test')!).code).toBe('print("hello")')
    mockEditorState.doc.toString.mockReturnValueOnce('')
    capturedUpdateListener!({ docChanged: true })
    expect(JSON.parse(localStorage.getItem('wxl-code-draft-test')!).code).toBe('')
    wrapper.unmount()
  })

  it('warns on checkpoint failure and clears warning after a successful edit', async () => {
    const wrapper = await mountPanel()
    const set = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('quota') })
    capturedUpdateListener!({ docChanged: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-draft-warning]').exists()).toBe(true)
    set.mockRestore()
    capturedUpdateListener!({ docChanged: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-draft-warning]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('writes the draft 500 ms after the last change, not before', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPanel()
      expect(capturedUpdateListener).not.toBeNull()
      capturedUpdateListener!({ docChanged: true })

      vi.advanceTimersByTime(499)
      expect(mockSaveCodeDraft).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(mockSaveCodeDraft).toHaveBeenCalledTimes(1)
      expect(mockSaveCodeDraft).toHaveBeenCalledWith('test', 'print("hello")')
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('collapses rapid changes into a single write', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPanel()
      for (let i = 0; i < 3; i++) {
        capturedUpdateListener!({ docChanged: true })
        vi.advanceTimersByTime(100)
      }
      // Still inside the window opened by the third change.
      expect(mockSaveCodeDraft).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      expect(mockSaveCodeDraft).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores updates that did not change the document', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPanel()
      // Cursor moves and focus changes arrive through the same listener.
      capturedUpdateListener!({ docChanged: false })
      vi.advanceTimersByTime(1000)
      expect(mockSaveCodeDraft).not.toHaveBeenCalled()
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('flushes a pending draft write on unmount', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPanel()
      capturedUpdateListener!({ docChanged: true })
      vi.advanceTimersByTime(100) // timer still pending
      wrapper.unmount()
      // Asserted without advancing the clock: the point is that unmounting does not
      // wait for the timer it just cancelled.
      expect(mockSaveCodeDraft).toHaveBeenCalledTimes(1)
      expect(mockSaveCodeDraft).toHaveBeenCalledWith('test', 'print("hello")')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not write on unmount when nothing is pending', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPanel()
      wrapper.unmount()
      expect(mockSaveCodeDraft).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })


  // ─── Draft restore on init ──────────────────────────────────────────────────

  it('opens with the stored draft when there is one', async () => {
    mockDraft = { challengeSlug: 'test', code: 'r = requests.get(URL)', updatedAt: 1 }
    const wrapper = await mountPanel()
    expect(mockLoadCodeDraft).toHaveBeenCalledWith('test')
    expect(capturedEditorOpts?.doc).toBe('r = requests.get(URL)')
    wrapper.unmount()
  })

  it('opens empty when the stored draft is empty', async () => {
    // Not the same fact as "no draft". A learner who cleared the editor and reloaded
    // has to get the empty editor back rather than the starter document.
    mockDraft = { challengeSlug: 'test', code: '', updatedAt: 1 }
    const wrapper = await mountPanel()
    expect(capturedEditorOpts?.doc).toBe('')
    wrapper.unmount()
  })

  it('opens with the starter document when there is no draft', async () => {
    mockDraft = null
    const wrapper = await mountPanel()
    expect(capturedEditorOpts?.doc).toContain('wxlsh Code Editor')
    wrapper.unmount()
  })

  it('still creates a usable editor when the draft read fails', async () => {
    mockLoadCodeDraft.mockRejectedValueOnce(new Error('IndexedDB unavailable'))
    const wrapper = await mountPanel()
    expect(editorViewConstructed).toBe(true)
    expect(capturedEditorOpts?.doc).toContain('wxlsh Code Editor')
    expect(wrapper.text()).not.toMatch(/failed|error/i)
    wrapper.unmount()
  })

  it('does not surface an error when the draft write fails', async () => {
    vi.useFakeTimers()
    try {
      mockSaveCodeDraft.mockRejectedValueOnce(new Error('QuotaExceededError'))
      const wrapper = await mountPanel()
      capturedUpdateListener!({ docChanged: true })
      vi.advanceTimersByTime(500)
      await Promise.resolve()
      expect(mockSaveCodeDraft).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).not.toMatch(/failed|error/i)

      // The editor is still live afterwards, and the next change still gets written.
      // A failed write must cost the learner one write, not the autosave.
      capturedUpdateListener!({ docChanged: true })
      vi.advanceTimersByTime(500)
      await Promise.resolve()
      expect(mockSaveCodeDraft).toHaveBeenCalledTimes(2)
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('works without onCodeExecuted prop (optional)', async () => {
    const runner = makeRunner()
    const wrapper = await mountPanel(runner, false) // no callback
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(runner.runCode).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('CodeEditorPanel streams output and can be stopped', () => {
  /** A runner whose run stays in flight until the test releases it. */
  function pendingRunner() {
    let emit: (c: string) => void = () => {}
    let settle: (o: { error: string | null; stopped: boolean }) => void = () => {}
    const runner = {
      ready: true,
      warmUp: vi.fn(),
      destroy: vi.fn(),
      stop: vi.fn(() => settle({ error: null, stopped: true })),
      runCode: vi.fn((_code: string, onStdout?: (c: string) => void) => {
        emit = (c) => onStdout?.(c)
        return new Promise<{ error: string | null; stopped: boolean }>((r) => { settle = r })
      }),
    }
    return { runner, emit: (c: string) => emit(c) }
  }

  it('shows a printed line before the run has ended', async () => {
    const { runner, emit } = pendingRunner()
    const wrapper = await mountPanel(runner)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()

    emit('found: 41\n')
    await flushPromises()

    // Still running. Collecting and showing at the end is what leaves a learner
    // unable to tell "working" from "broken", and what makes Stop useless.
    expect(wrapper.find('[data-output]').text()).toContain('found: 41')
    wrapper.unmount()
  })

  it('offers Stop only while a run is in flight', async () => {
    const { runner } = pendingRunner()
    const wrapper = await mountPanel(runner)
    expect(wrapper.find('[data-stop]').exists()).toBe(false)

    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-stop]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps what was printed when the learner stops, and does not call it an error', async () => {
    const { runner, emit } = pendingRunner()
    const cb = vi.fn()
    const wrapper = await mountPanel(runner, false, cb)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()

    emit('found: 41\n')
    emit('found: 42\n')
    await flushPromises()

    await wrapper.find('[data-stop]').trigger('click')
    await flushPromises()

    expect(runner.stop).toHaveBeenCalledTimes(1)
    const out = wrapper.find('[data-output]').text()
    expect(out).toContain('found: 41')
    expect(out).toContain('found: 42')
    // Stopping is the learner's decision, not a failure of their code.
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0].error).toBe(false)
    expect(cb.mock.calls[0][0].output).toContain('found: 42')
    // The run has to say it ended, and say so as a stop rather than as a
    // failure. Without this, output that simply stopped arriving is
    // indistinguishable from output that finished.
    expect(out).toContain('(stopped)')
    expect(out).not.toContain('Error:')
    wrapper.unmount()
  })

  it('keeps Run unavailable until the replacement runner is ready', async () => {
    let finishRestart: () => void = () => {}
    const restarted = new Promise<void>(r => { finishRestart = r })
    const { runner } = pendingRunner()
    const endRun = runner.stop
    // The real stop does two things: it ends the run in flight, and it hands
    // back the rebuild. Overriding only the second would leave the run pending
    // and Run disabled for that reason instead of the one under test.
    runner.stop = vi.fn(() => { endRun(); return restarted })

    const wrapper = await mountPanel(runner)
    await wrapper.find('[data-run]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-stop]').trigger('click')
    await flushPromises()

    // Stopping destroys the worker, and its replacement has to load a
    // WebAssembly distribution before it can run anything. Offering Run in the
    // meantime makes the wait silent: the learner presses it and nothing
    // visible happens for the length of a cold start.
    const runBtn = wrapper.find('[data-run]')
    expect((runBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect(runBtn.text()).not.toContain('▶ Run')

    finishRestart()
    await flushPromises()

    expect((wrapper.find('[data-run]').element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('does not impose a time limit of its own on learner code', async () => {
    vi.useFakeTimers()
    try {
      const { runner } = pendingRunner()
      const wrapper = await mountPanel(runner)
      await wrapper.find('[data-run]').trigger('click')
      await flushPromises()

      // Enumeration, brute forcing and fuzzing are intended solution paths here.
      // Any automatic limit would terminate a learner who is solving correctly.
      await vi.advanceTimersByTimeAsync(120_000)

      expect(runner.stop).not.toHaveBeenCalled()
      expect(wrapper.find('[data-stop]').exists()).toBe(true)
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
