import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SOURCE_VIEWER_SETTINGS_KEY,
  SOURCE_VIEWER_SETTINGS_SCHEMA_VERSION,
  DEFAULT_SOURCE_VIEWER_SETTINGS,
  normalizeSourceViewerSettings,
  useSourceViewerSettings,
  _resetSourceViewerSettingsForTests,
} from '../../../.vitepress/theme/composables/useSourceViewerSettings'
import {
  EDITOR_SETTINGS_KEY,
  useEditorSettings,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'
import { FONT_SIZE_DEFAULT } from '../../../.vitepress/theme/composables/editorConfig'

describe('normalizeSourceViewerSettings', () => {
  it('names the storage key and schema version this build writes', () => {
    expect(SOURCE_VIEWER_SETTINGS_KEY).toBe('wxl:source-viewer-settings')
    expect(SOURCE_VIEWER_SETTINGS_SCHEMA_VERSION).toBe(1)
  })

  // The viewer is read-only, so `autocomplete` and `closeBrackets` are not settings it
  // has. Asserting the exact shape — rather than only the fields present — is what makes
  // an accidental copy of the editor's shape go red here.
  it('holds a schema version and a font size and nothing else', () => {
    expect(DEFAULT_SOURCE_VIEWER_SETTINGS).toEqual({
      version: 1,
      fontSize: FONT_SIZE_DEFAULT,
    })
    expect(Object.keys(normalizeSourceViewerSettings({})).sort()).toEqual(['fontSize', 'version'])
  })

  it.each([
    ['below the lower bound after rounding', 9.4, 10],
    ['rounds up, inside the range', 23.6, 24],
    ['above the upper bound after rounding', 24.9, 24],
    ['not finite, falls back to the default', Number.NaN, FONT_SIZE_DEFAULT],
    ['not a number, falls back to the default', '14', FONT_SIZE_DEFAULT],
  ])('normalises a stored fontSize that is %s', (_label, stored, expected) => {
    expect(normalizeSourceViewerSettings({ fontSize: stored }).fontSize).toBe(expected)
  })

  it.each([
    ['an unparseable shape', 'not json at all'],
    ['null', null],
    ['an array', []],
  ])('degrades %s to the full defaults without throwing', (_label, raw) => {
    expect(() => normalizeSourceViewerSettings(raw)).not.toThrow()
    expect(normalizeSourceViewerSettings(raw)).toEqual(DEFAULT_SOURCE_VIEWER_SETTINGS)
  })

  it('rewrites version to the current schema regardless of what was stored', () => {
    expect(normalizeSourceViewerSettings({ version: 99 }).version).toBe(1)
  })
})

describe('useSourceViewerSettings — one shared instance per tab', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetSourceViewerSettingsForTests()
    _resetEditorSettingsForTests()
  })

  it('returns the same object to every caller in the tab', () => {
    expect(useSourceViewerSettings()).toBe(useSourceViewerSettings())
  })

  it('drops the cached instance on the test reset', () => {
    const first = useSourceViewerSettings()
    _resetSourceViewerSettingsForTests()
    expect(useSourceViewerSettings()).not.toBe(first)
  })

  it('starts from the defaults when storage holds nothing', () => {
    expect(useSourceViewerSettings().value).toEqual(DEFAULT_SOURCE_VIEWER_SETTINGS)
  })

  it('carries a stored choice rather than the default', () => {
    localStorage.setItem(
      SOURCE_VIEWER_SETTINGS_KEY,
      JSON.stringify({ version: 1, fontSize: 18 }),
    )
    _resetSourceViewerSettingsForTests()
    expect(useSourceViewerSettings().value.fontSize).toBe(18)
  })
})

describe('useSourceViewerSettings — independent of the code editor settings', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetSourceViewerSettingsForTests()
    _resetEditorSettingsForTests()
  })

  it('writes to its own storage key', () => {
    expect(SOURCE_VIEWER_SETTINGS_KEY).not.toBe(EDITOR_SETTINGS_KEY)
  })

  it('leaves the code editor font size unchanged when the viewer font size changes', () => {
    const editor = useEditorSettings()
    const viewer = useSourceViewerSettings()
    const editorBefore = editor.value.fontSize
    viewer.value = { ...viewer.value, fontSize: 21 }
    expect(viewer.value.fontSize).toBe(21)
    expect(editor.value.fontSize).toBe(editorBefore)
  })

  it('leaves the viewer font size unchanged when the code editor font size changes', () => {
    const editor = useEditorSettings()
    const viewer = useSourceViewerSettings()
    const viewerBefore = viewer.value.fontSize
    editor.value = { ...editor.value, fontSize: 22 }
    expect(editor.value.fontSize).toBe(22)
    expect(viewer.value.fontSize).toBe(viewerBefore)
  })

  // The viewer's initial value is the shared default constant, NOT whatever the code
  // editor currently holds. Seeding from the editor would make the viewer's first
  // appearance depend on whether the learner had ever opened the Code panel — history
  // that is invisible from the viewer itself.
  it('starts at the shared default even when the code editor holds a non-default size', () => {
    localStorage.setItem(
      EDITOR_SETTINGS_KEY,
      JSON.stringify({ version: 1, autocomplete: true, closeBrackets: true, fontSize: 20 }),
    )
    _resetEditorSettingsForTests()
    _resetSourceViewerSettingsForTests()
    expect(useEditorSettings().value.fontSize).toBe(20)
    expect(useSourceViewerSettings().value.fontSize).toBe(FONT_SIZE_DEFAULT)
  })
})

describe('useSourceViewerSettings — usable without a browser', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetSourceViewerSettingsForTests()
  })

  it('returns the defaults and touches no storage when window is absent', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.stubGlobal('window', undefined)
    try {
      expect(useSourceViewerSettings().value).toEqual(DEFAULT_SOURCE_VIEWER_SETTINGS)
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
    const serverRef = useSourceViewerSettings()
    vi.unstubAllGlobals()
    expect(useSourceViewerSettings()).not.toBe(serverRef)
  })
})
