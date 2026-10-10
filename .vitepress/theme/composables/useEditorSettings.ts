/**
 * Global, persistent editor preferences.
 *
 * The single owner of the editor-settings contract: defaults, schema version, type
 * normalisation, and SSR-safe access. State is a module-level singleton backed by
 * `useLocalStorage`, because `CodeEditorPanel.vue` and `EditorSettingsPopover.vue` each
 * call this and two independent `useLocalStorage` calls against the same key in the same
 * tab do NOT synchronise — without the singleton, changing a setting in the popover
 * would leave the running editor untouched.
 *
 * SSR-safe by construction: when `window` is absent an ephemeral defaults ref is returned
 * and never cached, so a ref created during server rendering can never become the tab's
 * shared instance. `localStorage` is only ever touched on the client.
 */
import { ref, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from './editorConfig'

/**
 * Where the settings live.
 *
 * WXL's own key. `localStorage` is origin-scoped, so sharing one with any other site is
 * not a choice that exists — the value here only has to be stable across this site.
 */
export const EDITOR_SETTINGS_KEY = 'wxl:editor-settings'

/**
 * v1: autocomplete + closeBrackets + fontSize.
 *
 * There is no v0 to migrate from — this key is new. The field exists so that the next
 * schema change has somewhere to branch on.
 */
export const EDITOR_SETTINGS_SCHEMA_VERSION = 1

export interface EditorSettings {
  /** Schema version, for forward-compatible migration of future fields. */
  version: number
  /** Show the completion dropdown while typing. */
  autocomplete: boolean
  /** Auto-insert the closing counterpart when typing one of `AUTO_CLOSE_BRACKETS`. */
  closeBrackets: boolean
  /** Editor font size in px, clamped to [FONT_SIZE_MIN, FONT_SIZE_MAX]. */
  fontSize: number
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  version: EDITOR_SETTINGS_SCHEMA_VERSION,
  autocomplete: true,
  closeBrackets: true,
  fontSize: FONT_SIZE_DEFAULT,
}

/**
 * Coerce an arbitrary stored value into a valid font size.
 *
 * Anything that is not a finite number is not a choice the learner made, so it falls back
 * to the default rather than being coerced — `Number('14px')` is `NaN` and `Number(null)`
 * is `0`, and neither is what the learner meant.
 */
function normalizeFontSize(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return FONT_SIZE_DEFAULT
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(raw)))
}

/**
 * Merge a stored (possibly partial, corrupt, or wrong-typed) value over the defaults.
 *
 * Never throws — unknown input degrades to defaults. `version` is always rewritten to the
 * current schema version, and any field missing or invalid is filled from its default
 * while the fields that are valid are preserved.
 *
 * The booleans are checked with `typeof === 'boolean'` rather than coerced: a stored `1`
 * is not a choice, and `Boolean(1)` would silently turn it into `true`.
 */
export function normalizeEditorSettings(raw: unknown): EditorSettings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    version: EDITOR_SETTINGS_SCHEMA_VERSION,
    autocomplete:
      typeof obj.autocomplete === 'boolean'
        ? obj.autocomplete
        : DEFAULT_EDITOR_SETTINGS.autocomplete,
    closeBrackets:
      typeof obj.closeBrackets === 'boolean'
        ? obj.closeBrackets
        : DEFAULT_EDITOR_SETTINGS.closeBrackets,
    fontSize: normalizeFontSize(obj.fontSize),
  }
}

let singleton: Ref<EditorSettings> | null = null

/**
 * Reactive, localStorage-persisted editor settings shared across the site.
 *
 * Returns the same ref on every client-side call within a tab.
 */
export function useEditorSettings(): Ref<EditorSettings> {
  // SSR / no browser: ephemeral defaults, never cached, never touches storage.
  if (typeof window === 'undefined') {
    return ref<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS })
  }

  if (!singleton) {
    const stored = useLocalStorage<EditorSettings>(
      EDITOR_SETTINGS_KEY,
      { ...DEFAULT_EDITOR_SETTINGS },
      {
        serializer: {
          read: (raw: string): EditorSettings => {
            try {
              return normalizeEditorSettings(JSON.parse(raw))
            } catch {
              return { ...DEFAULT_EDITOR_SETTINGS }
            }
          },
          write: (value: EditorSettings): string => JSON.stringify(value),
        },
      },
    )
    // No explicit write-back here. The serializer normalises on read and
    // `useLocalStorage` syncs storage to the value it ends up holding, so a partial or
    // outdated blob already converges on initialisation. An explicit
    // `stored.value = normalizeEditorSettings(stored.value)` was measured against four
    // input classes — partial, extra field, out of range, wrong type — and produced
    // byte-identical storage with and without it. The behaviour is pinned by the
    // "writes the whole normalised object back over a partial one" test, so if this
    // library behaviour ever changes the test goes red rather than the guarantee going
    // quietly missing.
    singleton = stored
  }
  return singleton
}

/** Test-only: drop the cached singleton so a fresh localStorage state can be used. */
export function _resetEditorSettingsForTests(): void {
  singleton = null
}
