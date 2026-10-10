import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { EditorState, Prec, Compartment, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { python, pythonLanguage } from '@codemirror/lang-python'
import { autocompletion, closeBrackets, insertBracket } from '@codemirror/autocomplete'
import {
  buildAutocomplete,
  buildCloseBrackets,
  buildFontSize,
} from '../../../.vitepress/theme/composables/editorExtensions'
import { AUTO_CLOSE_BRACKETS, fontSizeThemeSpec } from '../../../.vitepress/theme/composables/editorConfig'

const SOURCE_PATH = resolve(
  __dirname,
  '../../../.vitepress/theme/composables/editorExtensions.ts',
)

const modules = {
  EditorView,
  Prec,
  pythonLanguage,
  autocompletion,
  closeBrackets,
}

/** Build a state the way the panel does, then ask what a keystroke would produce. */
function docAfterTyping(char: string, opts: { closeBrackets: boolean }): string {
  const state = EditorState.create({
    doc: '',
    extensions: [python(), buildCloseBrackets(opts.closeBrackets, modules)],
  })
  const transaction = insertBracket(state, char)
  if (!transaction) {
    // No bracket handling applies: the character is inserted verbatim.
    return char
  }
  return transaction.state.doc.toString()
}

describe('editorExtensions — module hygiene', () => {
  it('has no runtime CodeMirror import', () => {
    // A runtime import here would load CodeMirror as soon as anything imports this
    // module, defeating the panel's deferred load. Type imports are erased at build.
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    const runtimeImports = [...source.matchAll(/^\s*import\s+(?!type\b)[^\n]*from\s+['"]([^'"]+)['"]/gm)]
      .map(m => m[1])
    expect(runtimeImports.filter(s => s.startsWith('@codemirror/'))).toEqual([])
  })
})

describe('editorExtensions — disabled toggles', () => {
  it('yields an empty extension when autocomplete is off', () => {
    expect(buildAutocomplete(false, modules)).toEqual([])
  })

  it('drops the bracket handler but keeps the override when auto-close is off', () => {
    // Structural, because the difference is not observable through `insertBracket`:
    // that function answers "which characters pair" from the language data and never
    // asks whether the handler is installed.
    const handler = Symbol('closeBrackets handler')
    const override = Symbol('prec.highest override')
    const stub = {
      ...modules,
      closeBrackets: () => handler as unknown as Extension,
      Prec: { highest: () => override as unknown as Extension },
    } as unknown as typeof modules
    expect(buildCloseBrackets(false, stub)).toEqual([override])
    expect(buildCloseBrackets(true, stub)).toEqual([handler, override])
  })

  it('yields a non-empty extension when each is on', () => {
    expect(buildAutocomplete(true, modules)).not.toEqual([])
    expect(buildCloseBrackets(true, modules)).not.toEqual([])
  })
})

describe('editorExtensions — the font size builder', () => {
  it('passes the theme spec for the requested size', () => {
    const theme = vi.spyOn(EditorView, 'theme')
    try {
      buildFontSize(17, { ...modules, EditorView })
      expect(theme).toHaveBeenCalledWith(fontSizeThemeSpec(17))
    } finally {
      theme.mockRestore()
    }
  })
})

describe('editorExtensions — quotes are never auto-closed', () => {
  // The rows are the delta spec's "what the bracket rule resolves to for each character".
  it.each([
    [true, '"', '"'],
    [true, "'", "'"],
    [false, '"', '"'],
    [false, "'", "'"],
    [true, '(', '()'],
    [true, '[', '[]'],
    [true, '{', '{}'],
  ])('with closeBrackets=%s, the bracket rule resolves %s to %s', (enabled, typed, expected) => {
    expect(docAfterTyping(typed, { closeBrackets: enabled })).toBe(expected)
  })

  it('overrides the language default rather than relying on load order', () => {
    // Without the override, lang-python's own closeBrackets data lists the quote
    // characters, and a quote would come back as a pair.
    const withoutOverride = EditorState.create({
      doc: '',
      extensions: [python(), closeBrackets()],
    })
    const baseline = insertBracket(withoutOverride, '"')
    expect(
      baseline?.state.doc.toString(),
      'lang-python no longer auto-closes quotes; this override may be redundant now',
    ).toBe('""')
  })

  it('names exactly the brackets from the shared constant', () => {
    for (const bracket of AUTO_CLOSE_BRACKETS) {
      expect(docAfterTyping(bracket, { closeBrackets: true }).length).toBe(2)
    }
  })
})

describe('editorExtensions — compartment independence', () => {
  it('places each extension in its own compartment without interfering', () => {
    const ac = new Compartment()
    const cb = new Compartment()
    const fs = new Compartment()
    const state = EditorState.create({
      doc: '',
      extensions: [
        python(),
        ac.of(buildAutocomplete(true, modules)),
        cb.of(buildCloseBrackets(true, modules)),
        fs.of(buildFontSize(13, modules)),
      ],
    })
    expect(insertBracket(state, '"')?.state.doc.toString() ?? '"').toBe('"')
    expect(insertBracket(state, '(')?.state.doc.toString()).toBe('()')
  })
})
