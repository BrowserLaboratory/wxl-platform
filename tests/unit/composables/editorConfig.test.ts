import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  AUTO_CLOSE_BRACKETS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_DEFAULT,
  FONT_SIZE_STEP,
  fontSizeThemeSpec,
} from '../../../.vitepress/theme/composables/editorConfig'

const SOURCE_PATH = resolve(
  __dirname,
  '../../../.vitepress/theme/composables/editorConfig.ts',
)

describe('editorConfig', () => {
  it('auto-closes exactly the three brackets and no quote character', () => {
    expect([...AUTO_CLOSE_BRACKETS]).toEqual(['(', '[', '{'])
    // Spelled out rather than derived: this list IS the rule "quotes are never
    // auto-closed", so it has to fail if any of them is ever added back.
    for (const quote of ["'", '"', "'''", '"""']) {
      expect(AUTO_CLOSE_BRACKETS as readonly string[]).not.toContain(quote)
    }
  })

  it('defaults the font size to the size the panel already rendered', () => {
    expect(FONT_SIZE_DEFAULT).toBe(13)
    expect(FONT_SIZE_MIN).toBe(10)
    expect(FONT_SIZE_MAX).toBe(24)
    expect(FONT_SIZE_STEP).toBe(1)
  })

  it('builds a theme spec carrying the pixel value', () => {
    expect(fontSizeThemeSpec(17)).toEqual({ '&': { fontSize: '17px' } })
    expect(fontSizeThemeSpec(FONT_SIZE_DEFAULT)).toEqual({ '&': { fontSize: '13px' } })
  })

  it('stays free of CodeMirror imports so it can be asserted directly', () => {
    // The point of keeping the spec a plain object is that a test can compare it
    // without pulling CodeMirror into the test environment. An import here would
    // silently take that away.
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    const imports = [...source.matchAll(/^\s*import[^\n]*from\s+['"]([^'"]+)['"]/gm)]
      .map(m => m[1])
    expect(imports.filter(s => s.startsWith('@codemirror/'))).toEqual([])
  })
})
