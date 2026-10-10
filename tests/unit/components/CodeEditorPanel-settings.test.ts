import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

// ─── Mock CodeMirror ──────────────────────────────────────────────────────────
//
// Same shape as CodeEditorPanel.test.ts, plus the pieces the settings wiring needs:
// Compartment, Prec, pythonLanguage and closeBracketsKeymap. Kept in its own file so
// the existing panel tests are not disturbed by the extra surface.

const mockEditorState = {
  doc: { toString: vi.fn(() => 'print("hello")'), length: 16 },
}

let mockEditorViewInstance: { state: unknown; dispatch: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } | null = null
let editorViewConstructed = false
let capturedExtensions: unknown[] = []
let capturedKeymap: unknown[] = []
const themeCalls: unknown[] = []

/** Every Compartment the panel creates, in construction order, with what it held. */
interface FakeCompartment { seeded: unknown; reconfigured: unknown[] }
let compartments: FakeCompartment[] = []

vi.mock('@codemirror/view', () => {
  class MockEditorView {
    state = mockEditorState
    dispatch = vi.fn()
    destroy = vi.fn()
    static theme = vi.fn((spec: unknown) => { themeCalls.push(spec); return { __theme: spec } })
    static updateListener = { of: vi.fn(() => ({})) }
    constructor(opts: { doc?: string; extensions?: unknown[] }) {
      capturedExtensions = opts.extensions ?? []
      editorViewConstructed = true
      mockEditorViewInstance = this as unknown as typeof mockEditorViewInstance
    }
  }
  return {
    EditorView: MockEditorView,
    keymap: { of: vi.fn((bindings: unknown[]) => { capturedKeymap = bindings; return {} }) },
    lineNumbers: vi.fn(() => ({})),
    highlightActiveLine: vi.fn(() => ({})),
  }
})

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [{ key: 'default' }],
  historyKeymap: [{ key: 'history' }],
  history: vi.fn(() => ({})),
}))

vi.mock('@codemirror/lang-python', () => ({
  python: vi.fn(() => ({})),
  pythonLanguage: { data: { of: vi.fn((v: unknown) => ({ __data: v })) } },
}))

vi.mock('@codemirror/autocomplete', () => ({
  autocompletion: vi.fn(() => ({ __autocompletion: true })),
  closeBrackets: vi.fn(() => ({ __closeBrackets: true })),
  closeBracketsKeymap: [{ key: 'Backspace-pair' }],
}))

vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: vi.fn(() => ({})),
  defaultHighlightStyle: {},
  indentOnInput: vi.fn(() => ({})),
}))

vi.mock('@codemirror/state', () => {
  class MockCompartment {
    private readonly record: FakeCompartment = { seeded: undefined, reconfigured: [] }
    constructor() { compartments.push(this.record) }
    of(ext: unknown) { this.record.seeded = ext; return { __compartment: this.record, ext } }
    reconfigure(ext: unknown) { this.record.reconfigured.push(ext); return { __reconfigure: this.record, ext } }
  }
  return {
    EditorSelection: { cursor: vi.fn((n: number) => n) },
    Compartment: MockCompartment,
    Prec: { highest: vi.fn((ext: unknown) => ({ __highest: ext })) },
  }
})

// ─── Mock persistence (IndexedDB is not the subject here) ─────────────────────

/** Resolve to release `initEditor` from its draft read; null means "resolve at once". */
let releaseDraftRead: (() => void) | null = null

vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  useChallengePersistence: vi.fn(() => ({
    saveCodeDraft: vi.fn(async () => undefined),
    loadCodeDraft: vi.fn(async () => {
      if (!releaseDraftRead) return null
      await new Promise<void>((resolve) => { releaseDraftRead = resolve })
      return null
    }),
  })),
}))

// ─── Real settings, real config ───────────────────────────────────────────────

import {
  EDITOR_SETTINGS_KEY,
  useEditorSettings,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'
import { fontSizeThemeSpec, FONT_SIZE_DEFAULT } from '../../../.vitepress/theme/composables/editorConfig'

const PANEL_SOURCE = readFileSync(
  resolve(__dirname, '../../../.vitepress/theme/components/CodeEditorPanel.vue'),
  'utf-8',
)

let wrapper: VueWrapper | null = null

async function mountPanel(props: Record<string, unknown> = {}) {
  wrapper = mount(
    (await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')).default,
    {
      props: { slug: 'test', dispatch: vi.fn(async () => new Response('ok')), ...props },
      attachTo: document.body,
    },
  )
  await vi.waitFor(() => { expect(editorViewConstructed).toBe(true) }, { timeout: 5000, interval: 5 })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  _resetEditorSettingsForTests()
  editorViewConstructed = false
  releaseDraftRead = null
  mockEditorViewInstance = null
  capturedExtensions = []
  capturedKeymap = []
  themeCalls.length = 0
  compartments = []
  // jsdom has no layout engine; initEditor bails out on a zero-sized container.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('CodeEditorPanel — compartments seeded from the stored settings', () => {
  it('creates one compartment per setting', async () => {
    await mountPanel()
    expect(compartments.length).toBe(3)
  })

  it('seeds the font size from storage rather than a constant', async () => {
    localStorage.setItem(
      EDITOR_SETTINGS_KEY,
      JSON.stringify({ version: 1, autocomplete: true, closeBrackets: true, fontSize: 21 }),
    )
    _resetEditorSettingsForTests()
    await mountPanel()
    expect(themeCalls).toContainEqual(fontSizeThemeSpec(21))
    expect(themeCalls).not.toContainEqual(fontSizeThemeSpec(FONT_SIZE_DEFAULT))
  })

  it('seeds an empty autocomplete compartment when the setting is off', async () => {
    localStorage.setItem(
      EDITOR_SETTINGS_KEY,
      JSON.stringify({ version: 1, autocomplete: false, closeBrackets: true, fontSize: 13 }),
    )
    _resetEditorSettingsForTests()
    await mountPanel()
    expect(compartments.map(c => c.seeded)).toContainEqual([])
  })

  it('does not seed an empty autocomplete compartment when the setting is on', async () => {
    await mountPanel()
    expect(compartments.map(c => c.seeded)).not.toContainEqual([])
  })
})

describe('CodeEditorPanel — reconfiguring in place', () => {
  it('keeps the same EditorView when a setting changes', async () => {
    await mountPanel()
    const before = mockEditorViewInstance
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: 18 }
    await flushPromises()
    // A rebuild would discard the cursor and the undo history, and the undo history is
    // what makes restoring a history entry reversible without a confirm dialog.
    expect(mockEditorViewInstance).toBe(before)
    expect(before!.destroy).not.toHaveBeenCalled()
  })

  it('applies the change through a dispatched effect on all three compartments', async () => {
    await mountPanel()
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: 18 }
    await flushPromises()
    expect(mockEditorViewInstance!.dispatch).toHaveBeenCalled()
    const effects = (mockEditorViewInstance!.dispatch.mock.calls[0][0] as { effects: unknown[] }).effects
    expect(effects).toHaveLength(3)
    expect(compartments.every(c => c.reconfigured.length === 1)).toBe(true)
  })

  it('reconfigures the font size compartment with the new pixel value', async () => {
    await mountPanel()
    themeCalls.length = 0
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: 22 }
    await flushPromises()
    expect(themeCalls).toContainEqual(fontSizeThemeSpec(22))
  })

  it('is inert when a setting changes before the editor exists', async () => {
    // The panel is never mounted here, so no EditorView was ever built.
    const settings = useEditorSettings()
    expect(() => { settings.value = { ...settings.value, fontSize: 16 } }).not.toThrow()
    await flushPromises()
  })

  it('is inert in the window after the compartments exist but before the view does', async () => {
    // `initEditor` assigns `editorModules` and the three compartments, then AWAITS the
    // draft read before constructing the view. A setting changed inside that await hits
    // a state where every module-level guard except the view check is already satisfied.
    // Without the view check the watcher dereferences null and the panel never opens.
    releaseDraftRead = () => {}
    wrapper = mount(
      (await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')).default,
      { props: { slug: 'test', dispatch: vi.fn(async () => new Response('ok')) }, attachTo: document.body },
    )
    await vi.waitFor(() => { expect(compartments.length).toBe(3) }, { timeout: 5000, interval: 5 })
    expect(editorViewConstructed).toBe(false)

    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: 17 }
    // `nextTick`, not `flushPromises`: the watcher runs on Vue's own job queue, and
    // `flushPromises` returns before that queue is drained. Measured — with the view
    // check removed, the assertion below ran first and stayed green while the watcher
    // went on to dereference null a moment later.
    await nextTick()
    await flushPromises()
    expect(compartments.every(c => c.reconfigured.length === 0)).toBe(true)

    const release = releaseDraftRead as unknown as () => void
    release()
    await vi.waitFor(() => { expect(editorViewConstructed).toBe(true) }, { timeout: 5000, interval: 5 })
    await flushPromises()
  })
})

describe('CodeEditorPanel — the toolbar entry point', () => {
  it('renders the settings gear', async () => {
    await mountPanel()
    expect(wrapper!.find('[data-editor-settings-gear]').exists()).toBe(true)
  })

  it('leaves the gear enabled while the runtime prop says disabled', async () => {
    await mountPanel({ disabled: true })
    // Editor settings do not depend on the Python runtime, so the runtime's readiness
    // is not a reason to take them away.
    expect(wrapper!.get('[data-editor-settings-gear]').attributes('disabled')).toBeUndefined()
  })

  it('no longer hardcodes a font size in the panel theme', () => {
    expect(PANEL_SOURCE).not.toMatch(/fontSize:\s*'1\d+px'/)
  })
})

describe('CodeEditorPanel — bracket pair deletion', () => {
  it('installs closeBracketsKeymap so one Backspace removes an auto-inserted pair', async () => {
    await mountPanel()
    // Without it, an auto-closed pair takes two presses to undo — worse than never
    // auto-closing at all, which is the setting this feature added.
    expect(capturedKeymap).toContainEqual({ key: 'Backspace-pair' })
  })
})
