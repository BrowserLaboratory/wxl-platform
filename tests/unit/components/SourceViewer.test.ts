import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { language } from '@codemirror/language'
import { deleteCharBackward, insertNewlineAndIndent } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import SourceViewer from '../../../.vitepress/theme/components/SourceViewer.vue'
import {
  _resetSourceViewerSettingsForTests,
  useSourceViewerSettings,
} from '../../../.vitepress/theme/composables/useSourceViewerSettings'
import {
  useEditorSettings,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'
import { FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP } from '../../../.vitepress/theme/composables/editorConfig'

/**
 * CodeMirror is NOT mocked here.
 *
 * Mocking it would leave every assertion in this file measuring the mock: "renders line
 * numbers" would become "called `lineNumbers()`", which stays green for a viewer that
 * renders nothing at all. The real editor mounts in jsdom, so the gutter, the document
 * text, and the read-only behaviour are all observable in the DOM.
 */

const PY = 'from flask import Flask\napp = Flask(__name__)\n'
const HTML = '<p>cart</p>\n'

const ONE_FILE = [{ path: 'app.py', content: PY }]
const TWO_FILES = [
  { path: 'app.py', content: PY },
  { path: '/templates/cart.html', content: HTML },
]

// The editor is built behind five dynamic imports, so it is not there when `mount`
// returns. Two earlier shapes both failed: a fixed pair of flushes was enough only once
// the module cache was warm, and an assertion on the missing element passed vacuously;
// forty microtask flushes then held in isolation but went red inside the full suite,
// where module loading takes real time rather than ticks. Polling against a wall-clock
// deadline is what actually matches the thing being waited for.
async function mountViewer(files: { path: string; content: string }[]) {
  const wrapper = mount(SourceViewer, {
    props: { files },
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  await untilEditorReady(wrapper)
  return wrapper
}

async function untilEditorReady(wrapper: { vm: unknown }): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!view(wrapper) && Date.now() < deadline) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  expect(view(wrapper)).toBeTruthy()
}

function view(wrapper: { vm: unknown }): EditorView | null {
  return (wrapper.vm as { editorView: EditorView | null }).editorView
}

const mountedWrappers: ReturnType<typeof mount>[] = []

beforeEach(() => {
  localStorage.clear()
  _resetSourceViewerSettingsForTests()
  _resetEditorSettingsForTests()
  document.body.innerHTML = ''
})

// CodeMirror's focus timer still fires after a test ends; only a destroyed view ignores
// it, so every editor is destroyed before the environment is torn down.
afterEach(() => {
  const views = mountedWrappers.map((wrapper) => view(wrapper))
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop()!.unmount()
  }
  expect(document.querySelectorAll('.cm-editor').length).toBe(0)
  // `destroyed` is not part of EditorView's public API — CodeMirror exposes no public way
  // to ask whether `destroy()` ran — but it is the internal flag `update()` checks to
  // decide whether to bail out early, which is exactly the thing this assertion needs.
  for (const v of views) {
    expect(v).toBeTruthy()
    expect((v as unknown as { destroyed: boolean }).destroyed).toBe(true)
  }
})

describe('SourceViewer — read-only editor with navigation aids', () => {
  it('marks its root so a black-box page can be checked for the absence of one', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('[data-source-viewer]').exists()).toBe(true)
  })

  it('shows the source text', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('.cm-content').text()).toContain('from flask import Flask')
  })

  it('renders a line-number gutter', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('.cm-lineNumbers').exists()).toBe(true)
  })

  // A keystroke reaches the document through an editing command, and every command in
  // `@codemirror/commands` refuses when the state is read-only. Dispatching a change
  // transaction directly is NOT the same thing — `readOnly` does not block that — so a
  // test written against `dispatch` would be asserting something CodeMirror never
  // promised, and would go red for a viewer that is perfectly locked to the learner.
  it('refuses the editing commands a keystroke would invoke', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const v = view(wrapper)!
    expect(v.state.readOnly).toBe(true)
    expect(deleteCharBackward(v)).toBe(false)
    expect(insertNewlineAndIndent(v)).toBe(false)
    expect(v.state.doc.toString()).toBe(PY)
  })

  it('exposes a content surface the browser will not treat as writable', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const content = wrapper.find('.cm-content')
    expect(content.exists()).toBe(true)
    expect(content.attributes('contenteditable')).not.toBe('true')
  })

  // `defaultHighlightStyle` emits generated class names, not `tok-` ones, so asserting on
  // markup would measure the style module rather than the language wiring. The language
  // facet is the thing that decides whether Python is parsed at all.
  it('loads the Python language for a .py file', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(view(wrapper)!.state.facet(language)?.name).toBe('python')
  })

  it('falls back to plain text for a language with no installed package', async () => {
    const wrapper = await mountViewer([{ path: '/x.php', content: '<?php echo 1; ?>\n' }])
    expect(view(wrapper)!.state.facet(language)).toBeNull()
    expect(wrapper.find('.cm-content').text()).toContain('<?php echo 1; ?>')
    expect(wrapper.find('.cm-lineNumbers').exists()).toBe(true)
  })
})

describe('SourceViewer — file list appears only for more than one file', () => {
  // The rows are the delta spec's "file list rendering by entry count" example table.
  it('shows a heading and no list for a single file', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('[data-source-file-heading]').text()).toBe('app.py')
    expect(wrapper.find('[data-source-file-list]').exists()).toBe(false)
  })

  it('shows a list in payload order for two files', async () => {
    const wrapper = await mountViewer(TWO_FILES)
    expect(wrapper.find('[data-source-file-list]').exists()).toBe(true)
    expect(wrapper.findAll('[data-source-file]').map((b) => b.text())).toEqual([
      'app.py',
      '/templates/cart.html',
    ])
  })

  it('shows a list in payload order for three files', async () => {
    const wrapper = await mountViewer([...TWO_FILES, { path: '/flag.txt', content: 'FLAG{REDACTED}\n' }])
    expect(wrapper.findAll('[data-source-file]').map((b) => b.text())).toEqual([
      'app.py',
      '/templates/cart.html',
      '/flag.txt',
    ])
  })

  it('swaps the displayed content when another file is selected', async () => {
    const wrapper = await mountViewer(TWO_FILES)
    expect(wrapper.find('.cm-content').text()).toContain('from flask')
    await wrapper.findAll('[data-source-file]')[1].trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(wrapper.find('.cm-content').text()).toContain('<p>cart</p>')
    expect(wrapper.find('.cm-content').text()).not.toContain('from flask')
  })
})

describe('SourceViewer — its own font size', () => {
  it('renders at the stored viewer font size', async () => {
    localStorage.setItem(
      'wxl:source-viewer-settings',
      JSON.stringify({ version: 1, fontSize: 19 }),
    )
    _resetSourceViewerSettingsForTests()
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('[data-source-viewer]').attributes('style')).toContain('19px')
  })

  it('follows a later change to the viewer setting', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    useSourceViewerSettings().value = { version: 1, fontSize: 21 }
    await flushPromises()
    expect(wrapper.find('[data-source-viewer]').attributes('style')).toContain('21px')
  })
})

describe('SourceViewer — font size controls', () => {
  const bigger = (w: ReturnType<typeof mount>) => w.find('[data-source-font-increase]')
  const smaller = (w: ReturnType<typeof mount>) => w.find('[data-source-font-decrease]')

  it('increases the viewer font size by one step', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const before = useSourceViewerSettings().value.fontSize
    await bigger(wrapper).trigger('click')
    expect(useSourceViewerSettings().value.fontSize).toBe(before + FONT_SIZE_STEP)
    expect(wrapper.find('[data-source-viewer]').attributes('style'))
      .toContain(`${before + FONT_SIZE_STEP}px`)
  })

  it('decreases the viewer font size by one step', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const before = useSourceViewerSettings().value.fontSize
    await smaller(wrapper).trigger('click')
    expect(useSourceViewerSettings().value.fontSize).toBe(before - FONT_SIZE_STEP)
  })

  // Two mechanisms hold the bound, and they need two assertions. The disabled attribute
  // is what a learner runs into; the guard inside the handler is what holds if the
  // attribute is ever lost. Measured: with only the click-based test, removing the guard
  // turned zero tests red — jsdom does not invoke a handler on a disabled button, so the
  // guard was never reached.
  it('disables the enlarge control at the upper bound', async () => {
    localStorage.setItem(
      'wxl:source-viewer-settings',
      JSON.stringify({ version: 1, fontSize: FONT_SIZE_MAX }),
    )
    _resetSourceViewerSettingsForTests()
    const wrapper = await mountViewer(ONE_FILE)
    expect(bigger(wrapper).attributes('disabled')).toBeDefined()
  })

  it('is a no-op at the upper bound even when the control is activated directly', async () => {
    localStorage.setItem(
      'wxl:source-viewer-settings',
      JSON.stringify({ version: 1, fontSize: FONT_SIZE_MAX }),
    )
    _resetSourceViewerSettingsForTests()
    const wrapper = await mountViewer(ONE_FILE)
    ;(wrapper.vm as unknown as { increaseFontSize: () => void }).increaseFontSize()
    expect(useSourceViewerSettings().value.fontSize).toBe(FONT_SIZE_MAX)
  })

  it('disables the shrink control at the lower bound', async () => {
    localStorage.setItem(
      'wxl:source-viewer-settings',
      JSON.stringify({ version: 1, fontSize: FONT_SIZE_MIN }),
    )
    _resetSourceViewerSettingsForTests()
    const wrapper = await mountViewer(ONE_FILE)
    expect(smaller(wrapper).attributes('disabled')).toBeDefined()
  })

  it('is a no-op at the lower bound even when the control is activated directly', async () => {
    localStorage.setItem(
      'wxl:source-viewer-settings',
      JSON.stringify({ version: 1, fontSize: FONT_SIZE_MIN }),
    )
    _resetSourceViewerSettingsForTests()
    const wrapper = await mountViewer(ONE_FILE)
    ;(wrapper.vm as unknown as { decreaseFontSize: () => void }).decreaseFontSize()
    expect(useSourceViewerSettings().value.fontSize).toBe(FONT_SIZE_MIN)
  })

  it('leaves the Code panel font size untouched', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const editorBefore = useEditorSettings().value.fontSize
    await bigger(wrapper).trigger('click')
    await bigger(wrapper).trigger('click')
    expect(useEditorSettings().value.fontSize).toBe(editorBefore)
  })
})

describe('SourceViewer — unmounting while the editor is still loading', () => {
  // The editor is built behind five dynamic imports. A learner who opens the Source tab
  // and leaves before they resolve unmounts the component mid-build; without a second
  // ref check after the awaits, the build writes into a null host. Vitest surfaces that
  // as an unhandled rejection, not as a failing assertion, so it is captured explicitly.
  it('does not reject after the host is gone', async () => {
    const seen: string[] = []
    const capture = (e: unknown) => { seen.push(e instanceof Error ? e.message : String(e)) }
    process.on('unhandledRejection', capture)
    try {
      const wrapper = mount(SourceViewer, { props: { files: ONE_FILE } })
      wrapper.unmount()
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(seen).toEqual([])
    } finally {
      process.off('unhandledRejection', capture)
    }
  })
})

describe('SourceViewer — the content surface can take focus', () => {
  // `editable: false` removes contenteditable AND focusability, and an unfocusable
  // surface receives no key events at all. Measured in a real browser before the
  // tabindex was added: the search shortcut did nothing because focus never left the tab
  // button. Neither the read-only assertions nor the rendering ones can see this.
  it('carries a tabindex so key bindings can reach it', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    expect(wrapper.find('.cm-content').attributes('tabindex')).toBe('0')
  })

  it('becomes the active element when focused', async () => {
    const wrapper = await mountViewer(ONE_FILE)
    const content = wrapper.find('.cm-content').element as HTMLElement
    content.focus()
    expect(document.activeElement).toBe(content)
  })
})
