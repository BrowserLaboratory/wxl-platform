import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import EditorSettingsPopover from '../../../.vitepress/theme/components/EditorSettingsPopover.vue'
import {
  EDITOR_SETTINGS_KEY,
  DEFAULT_EDITOR_SETTINGS,
  useEditorSettings,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'
import {
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_STEP,
  FONT_SIZE_DEFAULT,
} from '../../../.vitepress/theme/composables/editorConfig'

let wrapper: VueWrapper | null = null

function gear() {
  return wrapper!.get('[data-editor-settings-gear]')
}

/** The panel is teleported, so it is not inside the wrapper's own tree. */
function panel(): HTMLElement | null {
  return document.querySelector('[data-editor-settings-panel]')
}

async function open() {
  await gear().trigger('click')
}

function mountPopover() {
  wrapper = mount(EditorSettingsPopover, { attachTo: document.body })
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
  _resetEditorSettingsForTests()
  document.body.innerHTML = ''
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('EditorSettingsPopover — opening and closing', () => {
  it('renders the gear and no panel until it is used', () => {
    mountPopover()
    expect(gear().exists()).toBe(true)
    expect(panel()).toBeNull()
  })

  it('opens on the first activation and closes on the second', async () => {
    mountPopover()
    await open()
    expect(panel()).not.toBeNull()
    await open()
    expect(panel()).toBeNull()
  })

  it('teleports the panel to the document body', async () => {
    mountPopover()
    await open()
    // The Code panel's root and its ancestors carry `overflow: hidden`, which clips an
    // in-flow panel no matter what z-index it carries. Only `parentElement === body`
    // shows the panel escaped: asserting it is merely not inside the gear BUTTON is
    // satisfied by an in-flow panel too, because that renders as the button's sibling.
    // Measured — with `<Teleport :disabled="true">` the weaker assertion stayed green.
    expect(panel()!.parentElement).toBe(document.body)
    expect(wrapper!.element.contains(panel())).toBe(false)
  })

  it('positions the panel with fixed coordinates rather than in flow', async () => {
    mountPopover()
    await open()
    expect(panel()!.style.position).toBe('fixed')
  })

  it('removes the panel when the component unmounts', async () => {
    mountPopover()
    await open()
    wrapper!.unmount()
    wrapper = null
    expect(panel()).toBeNull()
  })
})

describe('EditorSettingsPopover — dismissal', () => {
  it('closes on a mousedown outside the gear and the panel', async () => {
    mountPopover()
    await open()
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(panel()).toBeNull()
  })

  it('stays open on a mousedown inside the panel', async () => {
    mountPopover()
    await open()
    panel()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(panel()).not.toBeNull()
  })

  it('closes on Escape', async () => {
    mountPopover()
    await open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(panel()).toBeNull()
  })

  it('returns focus to the gear when the panel closes with focus inside it', async () => {
    mountPopover()
    await open()
    expect(document.activeElement).toBe(panel())
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper!.vm.$nextTick()
    // Measured in a real browser before this was handled: focus landed on
    // `document.body`, dumping a keyboard user back at the top of the tab order after
    // every Escape.
    expect(document.activeElement).toBe(gear().element)
  })

  it('does not steal focus when the panel closes with focus elsewhere', async () => {
    mountPopover()
    await open()
    const elsewhere = document.createElement('input')
    document.body.appendChild(elsewhere)
    elsewhere.focus()
    elsewhere.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(panel()).toBeNull()
    // The learner moved focus deliberately; pulling it back to the gear would undo that.
    expect(document.activeElement).toBe(elsewhere)
  })
})

describe('EditorSettingsPopover — writing through to the shared settings', () => {
  it('toggling autocomplete flips the shared value and persists it', async () => {
    mountPopover()
    const settings = useEditorSettings()
    await open()
    const box = document.querySelector('[data-toggle-autocomplete]') as HTMLInputElement
    box.checked = false
    box.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(settings.value.autocomplete).toBe(false)
    await wrapper!.vm.$nextTick()
    expect(JSON.parse(localStorage.getItem(EDITOR_SETTINGS_KEY)!).autocomplete).toBe(false)
  })

  it('toggling bracket auto-close flips the shared value', async () => {
    mountPopover()
    const settings = useEditorSettings()
    await open()
    const box = document.querySelector('[data-toggle-close-brackets]') as HTMLInputElement
    box.checked = false
    box.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper!.vm.$nextTick()
    expect(settings.value.closeBrackets).toBe(false)
  })

  it('reset restores every field at once', async () => {
    mountPopover()
    const settings = useEditorSettings()
    settings.value = { ...settings.value, autocomplete: false, closeBrackets: false, fontSize: 20 }
    await open()
    ;(document.querySelector('[data-editor-settings-reset]') as HTMLElement).click()
    await wrapper!.vm.$nextTick()
    expect(settings.value).toEqual(DEFAULT_EDITOR_SETTINGS)
  })
})

describe('EditorSettingsPopover — the font size stepper', () => {
  function step(which: 'decrease' | 'increase'): HTMLElement {
    return document.querySelector(`[data-font-size-${which}]`) as HTMLElement
  }

  it('shows the current size', async () => {
    mountPopover()
    await open()
    expect(document.querySelector('[data-font-size-value]')!.textContent)
      .toContain(String(FONT_SIZE_DEFAULT))
  })

  it('moves by one step per activation', async () => {
    mountPopover()
    const settings = useEditorSettings()
    await open()
    step('increase').click()
    await wrapper!.vm.$nextTick()
    expect(settings.value.fontSize).toBe(FONT_SIZE_DEFAULT + FONT_SIZE_STEP)
    step('decrease').click()
    await wrapper!.vm.$nextTick()
    expect(settings.value.fontSize).toBe(FONT_SIZE_DEFAULT)
  })

  it('is a true no-op at the lower bound', async () => {
    mountPopover()
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: FONT_SIZE_MIN }
    await open()
    const before = settings.value
    step('decrease').click()
    await wrapper!.vm.$nextTick()
    expect(settings.value.fontSize).toBe(FONT_SIZE_MIN)
    // Object identity, not just the value: without the guard the handler still assigns
    // a fresh object that clamps to the same number, so a value-only assertion cannot
    // tell "did nothing" from "wrote the same thing again". Measured — with the guard
    // removed, the value assertion alone stayed green.
    expect(settings.value).toBe(before)
  })

  it('is a true no-op at the upper bound', async () => {
    mountPopover()
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: FONT_SIZE_MAX }
    await open()
    const before = settings.value
    step('increase').click()
    await wrapper!.vm.$nextTick()
    expect(settings.value.fontSize).toBe(FONT_SIZE_MAX)
    expect(settings.value).toBe(before)
  })

  it('marks a reached bound with aria-disabled and never the native attribute', async () => {
    mountPopover()
    const settings = useEditorSettings()
    settings.value = { ...settings.value, fontSize: FONT_SIZE_MIN }
    await open()
    expect(step('decrease').getAttribute('aria-disabled')).toBe('true')
    // A native `disabled` on the focused button drops focus to <body> and ejects a
    // keyboard user from the open panel, so it must stay focusable.
    expect(step('decrease').hasAttribute('disabled')).toBe(false)
    expect(step('increase').getAttribute('aria-disabled')).toBe('false')
  })
})

describe('EditorSettingsPopover — localisation', () => {
  it('carries no CJK in its own template', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(
      resolve(__dirname, '../../../.vitepress/theme/components/EditorSettingsPopover.vue'),
      'utf-8',
    )
    const template = source.slice(source.indexOf('<template>'))
    expect(template).not.toMatch(/[一-鿿]/)
  })
})
