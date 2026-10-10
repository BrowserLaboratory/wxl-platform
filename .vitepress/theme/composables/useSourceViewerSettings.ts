/**
 * Persistent preferences for the white-box source viewer.
 *
 * Deliberately NOT `useEditorSettings`. The two are separate contracts with separate
 * storage keys, so a font size chosen in the Code panel and one chosen in the Source
 * panel never move together. Sharing the editor's composable would have been fewer
 * lines and the wrong behaviour: the viewer is a reading surface and the editor is a
 * writing surface, and a learner sizing one for reading has not asked for the other to
 * change.
 *
 * The initial value is `FONT_SIZE_DEFAULT`, not whatever the editor currently holds.
 * Seeding from the editor would make the viewer's first appearance depend on whether the
 * learner had ever opened the Code panel — history that is invisible from the viewer.
 *
 * SSR-safe by construction, the same way `useEditorSettings` is: when `window` is absent
 * an ephemeral defaults ref is returned and never cached, so a ref created during server
 * rendering can never become the tab's shared instance.
 */
import { ref, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from './editorConfig'

/** Where the viewer's settings live. Distinct from the editor's key by design. */
export const SOURCE_VIEWER_SETTINGS_KEY = 'wxl:source-viewer-settings'

/** v1: fontSize only. The field exists so a future schema change has somewhere to branch. */
export const SOURCE_VIEWER_SETTINGS_SCHEMA_VERSION = 1

export interface SourceViewerSettings {
  /** Schema version, for forward-compatible migration of future fields. */
  version: number
  /** Viewer font size in px, clamped to [FONT_SIZE_MIN, FONT_SIZE_MAX]. */
  fontSize: number
}

export const DEFAULT_SOURCE_VIEWER_SETTINGS: SourceViewerSettings = {
  version: SOURCE_VIEWER_SETTINGS_SCHEMA_VERSION,
  fontSize: FONT_SIZE_DEFAULT,
}

/**
 * Coerce an arbitrary stored value into a valid font size.
 *
 * Bounds and default are imported rather than restated: the viewer and the editor share
 * one range, and two copies of it would drift.
 */
function normalizeFontSize(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return FONT_SIZE_DEFAULT
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(raw)))
}

/**
 * Merge a stored (possibly partial, corrupt, or wrong-typed) value over the defaults.
 *
 * Never throws. The returned object holds exactly `version` and `fontSize` — extra fields
 * in storage are dropped rather than carried, so a blob written by some other version of
 * this file cannot smuggle a field the viewer does not have.
 */
export function normalizeSourceViewerSettings(raw: unknown): SourceViewerSettings {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
  return {
    version: SOURCE_VIEWER_SETTINGS_SCHEMA_VERSION,
    fontSize: normalizeFontSize(obj.fontSize),
  }
}

let singleton: Ref<SourceViewerSettings> | null = null

/**
 * Reactive, localStorage-persisted source viewer settings shared across the site.
 *
 * Returns the same ref on every client-side call within a tab.
 */
export function useSourceViewerSettings(): Ref<SourceViewerSettings> {
  // SSR / no browser: ephemeral defaults, never cached, never touches storage.
  if (typeof window === 'undefined') {
    return ref<SourceViewerSettings>({ ...DEFAULT_SOURCE_VIEWER_SETTINGS })
  }

  if (!singleton) {
    singleton = useLocalStorage<SourceViewerSettings>(
      SOURCE_VIEWER_SETTINGS_KEY,
      { ...DEFAULT_SOURCE_VIEWER_SETTINGS },
      {
        serializer: {
          read: (raw: string): SourceViewerSettings => {
            try {
              return normalizeSourceViewerSettings(JSON.parse(raw))
            } catch {
              return { ...DEFAULT_SOURCE_VIEWER_SETTINGS }
            }
          },
          write: (value: SourceViewerSettings): string => JSON.stringify(value),
        },
      },
    )
  }
  return singleton
}

/** Test-only: drop the cached singleton so a fresh localStorage state can be used. */
export function _resetSourceViewerSettingsForTests(): void {
  singleton = null
}
