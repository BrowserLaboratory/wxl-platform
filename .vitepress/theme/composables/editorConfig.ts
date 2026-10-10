/**
 * Editor configuration shared between the live editor, its settings UI, and their tests.
 *
 * Everything here is a plain value or a pure function with no CodeMirror import, so a
 * test can compare it directly instead of standing up an editor to observe it.
 */

/**
 * The exact set of openers the editor auto-closes.
 *
 * `@codemirror/lang-python`'s own `closeBrackets` language data also lists the quote
 * characters (`'`, `"`, `'''`, `"""`). Quotes are never auto-closed here: the Code panel's
 * own site-smoke helper had to stop typing and switch to `document.execCommand('insertText')`
 * precisely because auto-closed quotes rewrite what arrives, and a learner hand-typing a
 * payload has no such escape hatch. `CodeEditorPanel.vue` applies this list at
 * `Prec.highest` so it wins over the language default.
 */
export const AUTO_CLOSE_BRACKETS = ['(', '[', '{'] as const

/**
 * Bounds, default, and step (all px) for the editor `fontSize` setting.
 *
 * One source for three consumers that would otherwise drift: `normalizeEditorSettings`
 * clamps to [MIN, MAX], the settings popover steps by STEP and marks the bounds, and
 * `CodeEditorPanel.vue` seeds the initial size.
 *
 * DEFAULT is 13 because that is the size the panel's theme hard-coded before this setting
 * existed — a learner who never opens the settings sees no change at all.
 */
export const FONT_SIZE_MIN = 10
export const FONT_SIZE_MAX = 24
export const FONT_SIZE_DEFAULT = 13
export const FONT_SIZE_STEP = 1

/**
 * The CodeMirror theme spec that applies a given editor font size.
 *
 * Returned as a plain object rather than an `EditorView.theme(...)` extension so this
 * module needs no CodeMirror import; the panel wraps it inside the font-size compartment.
 */
export function fontSizeThemeSpec(px: number): { '&': { fontSize: string } } {
  return { '&': { fontSize: `${px}px` } }
}
