import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  EDITOR_SETTINGS_KEY,
  EDITOR_SETTINGS_SCHEMA_VERSION,
  DEFAULT_EDITOR_SETTINGS,
  normalizeEditorSettings,
  useEditorSettings,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'

describe('normalizeEditorSettings', () => {
  it('names the storage key and schema version this build writes', () => {
    expect(EDITOR_SETTINGS_KEY).toBe('wxl:editor-settings')
    expect(EDITOR_SETTINGS_SCHEMA_VERSION).toBe(1)
    expect(DEFAULT_EDITOR_SETTINGS).toEqual({
      version: 1,
      autocomplete: true,
      closeBrackets: true,
      fontSize: 13,
    })
  })

  // The rows are the table in the delta spec's "normalisation of each input class"
  // example, one test each. They are the agreed specification, not illustrations.
  it.each([
    ['below the lower bound after rounding', 9.4, 10],
    ['rounds up, inside the range', 23.6, 24],
    ['above the upper bound after rounding', 24.9, 24],
    ['clamped to the lower bound', 0, 10],
    ['not finite, falls back to the default', Number.NaN, 13],
    ['not a number, falls back to the default', '14', 13],
  ])('normalises a stored fontSize that is %s', (_label, stored, expected) => {
    expect(normalizeEditorSettings({ fontSize: stored }).fontSize).toBe(expected)
  })

  // The rows are the delta spec's "inputs that degrade to the full defaults" example.
  it.each([
    ['an unparseable string', 'not json at all'],
    ['null', null],
    ['an array', []],
    ['an object whose boolean field is a string', { autocomplete: 'yes' }],
  ])('degrades %s to the full defaults without throwing', (_label, raw) => {
    expect(() => normalizeEditorSettings(raw)).not.toThrow()
    expect(normalizeEditorSettings(raw)).toEqual(DEFAULT_EDITOR_SETTINGS)
  })

  it('falls back only on the invalid field and keeps the valid one', () => {
    // `0`, not `1`. Both are non-booleans that must fall back to `true`, but `Boolean(1)`
    // is also `true` — so a coercion bug is invisible with `1` and visible with `0`.
    // Measured: replacing the typeof check with `Boolean(...)` left the `1` version of
    // this test green.
    const result = normalizeEditorSettings({ autocomplete: false, closeBrackets: 0, fontSize: 20 })
    expect(result.autocomplete).toBe(false)
    expect(result.closeBrackets).toBe(DEFAULT_EDITOR_SETTINGS.closeBrackets)
    expect(result.fontSize).toBe(20)
  })

  it('treats a falsy non-boolean as no choice rather than as false', () => {
    expect(normalizeEditorSettings({ autocomplete: 0 }).autocomplete).toBe(true)
    expect(normalizeEditorSettings({ autocomplete: '' }).autocomplete).toBe(true)
    expect(normalizeEditorSettings({ closeBrackets: null }).closeBrackets).toBe(true)
  })

  it('rewrites version to the current schema regardless of what was stored', () => {
    expect(normalizeEditorSettings({ version: 99 }).version).toBe(1)
    expect(normalizeEditorSettings({ version: 'seven' }).version).toBe(1)
  })
})

describe('useEditorSettings — one shared instance per tab', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetEditorSettingsForTests()
  })

  it('returns the same object to every caller in the tab', () => {
    const a = useEditorSettings()
    const b = useEditorSettings()
    expect(a).toBe(b)
  })

  it('lets a write through one caller be seen by the other', () => {
    const editor = useEditorSettings()
    const popover = useEditorSettings()
    popover.value = { ...popover.value, fontSize: 19 }
    expect(editor.value.fontSize).toBe(19)
  })

  it('drops the cached instance on the test reset', () => {
    const first = useEditorSettings()
    _resetEditorSettingsForTests()
    const second = useEditorSettings()
    expect(second).not.toBe(first)
  })

  it('starts from the defaults when storage holds nothing', () => {
    expect(useEditorSettings().value).toEqual(DEFAULT_EDITOR_SETTINGS)
  })

  it('carries a stored choice rather than the default', () => {
    localStorage.setItem(
      EDITOR_SETTINGS_KEY,
      JSON.stringify({ version: 1, autocomplete: false, closeBrackets: false, fontSize: 18 }),
    )
    _resetEditorSettingsForTests()
    const settings = useEditorSettings()
    expect(settings.value.autocomplete).toBe(false)
    expect(settings.value.fontSize).toBe(18)
  })
})

describe('useEditorSettings — usable without a browser', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetEditorSettingsForTests()
  })

  it('returns the defaults and touches no storage when window is absent', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.stubGlobal('window', undefined)
    try {
      expect(useEditorSettings().value).toEqual(DEFAULT_EDITOR_SETTINGS)
      expect(getItem).not.toHaveBeenCalled()
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })

  it('does not cache the window-less ref as the shared instance', () => {
    vi.stubGlobal('window', undefined)
    const serverRef = useEditorSettings()
    vi.unstubAllGlobals()
    const clientRef = useEditorSettings()
    // Caching it would hand the first real client caller an object that is not
    // connected to storage, and nothing downstream would ever notice.
    expect(clientRef).not.toBe(serverRef)
  })
})

describe('useEditorSettings — self-heal on initialisation', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetEditorSettingsForTests()
  })

  it('writes the whole normalised object back over a partial one', async () => {
    localStorage.setItem(EDITOR_SETTINGS_KEY, JSON.stringify({ autocomplete: false }))
    _resetEditorSettingsForTests()
    useEditorSettings()
    // `useLocalStorage` persists through a watcher, so the write lands on the next
    // tick rather than inside the call. The requirement is that it lands, not that
    // it lands synchronously.
    await nextTick()
    const written = JSON.parse(localStorage.getItem(EDITOR_SETTINGS_KEY) as string)
    expect(Object.keys(written).sort()).toEqual(
      Object.keys(DEFAULT_EDITOR_SETTINGS).sort(),
    )
    expect(written.autocomplete).toBe(false)
    expect(written.fontSize).toBe(13)
  })

  it('survives an unparseable stored blob', () => {
    localStorage.setItem(EDITOR_SETTINGS_KEY, 'not json at all')
    _resetEditorSettingsForTests()
    expect(() => useEditorSettings()).not.toThrow()
    expect(useEditorSettings().value).toEqual(DEFAULT_EDITOR_SETTINGS)
  })
})
