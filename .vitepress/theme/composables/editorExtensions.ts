/**
 * The contents of the Code panel's three reconfigurable compartments.
 *
 * Every function here takes the CodeMirror modules it needs as a parameter, so this file
 * carries no runtime `@codemirror/*` import — only type imports, which are erased at
 * build time. Two constraints make that shape necessary rather than stylistic:
 *
 * 1. `CodeEditorPanel.vue`'s component test replaces all six `@codemirror/*` packages
 *    with mocks. A rule that only exists inside the component therefore cannot be
 *    observed against real CodeMirror anywhere. Expressed here, it can.
 * 2. The panel must not load CodeMirror until the Code tab is activated. A runtime
 *    import in this module would load it as soon as the panel's script is evaluated.
 */
import type { Extension } from '@codemirror/state'
import { AUTO_CLOSE_BRACKETS, fontSizeThemeSpec } from './editorConfig'
import { pythonStdlibCompletions } from './pythonCompletions'

/**
 * The CodeMirror pieces these builders need, handed in by the caller that imported them.
 *
 * Typed structurally rather than as the packages' own module types so a test can pass the
 * real modules and the panel can pass what its dynamic imports returned.
 */
export interface EditorModules {
  EditorView: { theme: (spec: unknown) => Extension }
  Prec: { highest: (ext: Extension) => Extension }
  pythonLanguage: { data: { of: (value: unknown) => Extension } }
  autocompletion: () => Extension
  closeBrackets: () => Extension
}

/**
 * The completion dropdown, or nothing.
 *
 * Disabled means the extension is absent, not present-and-inert: `autocompletion()` has
 * no disabled mode, so leaving it installed would keep showing the dropdown.
 */
export function buildAutocomplete(enabled: boolean, m: EditorModules): Extension {
  if (!enabled) return []
  return [
    m.autocompletion(),
    m.pythonLanguage.data.of({ autocomplete: pythonStdlibCompletions() }),
  ]
}

/**
 * Bracket auto-closing restricted to `AUTO_CLOSE_BRACKETS`.
 *
 * `@codemirror/lang-python` supplies its own `closeBrackets` language data, and that list
 * includes the quote characters. The override below replaces it. `Prec.highest` is
 * required, not precautionary: without it, which of the two data entries wins depends on
 * the order in which `python()` registers its own, and this module does not control that.
 *
 * **The override is applied whether or not the setting is enabled, and only the handler
 * is toggled.** Dropping the override along with the handler restores lang-python's
 * quote-including list as the answer to "which brackets pair", which is not a question
 * only the handler asks — `insertBracket` reads the language data directly, so anything
 * that reaches it by another route would start pairing quotes again the moment a learner
 * turned the setting off. Measured: with the override omitted, `insertBracket(state, '"')`
 * returns a transaction producing `""`.
 */
export function buildCloseBrackets(enabled: boolean, m: EditorModules): Extension {
  const quotesNeverPair = m.Prec.highest(
    m.pythonLanguage.data.of({ closeBrackets: { brackets: [...AUTO_CLOSE_BRACKETS] } }),
  )
  return enabled ? [m.closeBrackets(), quotesNeverPair] : [quotesNeverPair]
}

/** The font size, as a theme of its own so it can be reconfigured without the rest. */
export function buildFontSize(px: number, m: EditorModules): Extension {
  return m.EditorView.theme(fontSizeThemeSpec(px))
}
