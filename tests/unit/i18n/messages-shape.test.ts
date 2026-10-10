import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'

type MessageNode = string | { [k: string]: MessageNode }

function flatten(obj: MessageNode, prefix = ''): Record<string, string> {
  if (typeof obj === 'string') return { [prefix]: obj }
  const result: Record<string, string> = {}
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key
    Object.assign(result, flatten(obj[key], newPrefix))
  }
  return result
}

const CJK_RE = /[一-鿿]/

describe('messages shape parity', () => {
  it('en.json and zh-TW.json have identical key paths', () => {
    const enKeys = Object.keys(flatten(en as MessageNode)).sort()
    const zhKeys = Object.keys(flatten(zhTW as MessageNode)).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  it('en.json leaves contain no CJK characters', () => {
    const flat = flatten(en as MessageNode)
    for (const [path, value] of Object.entries(flat)) {
      expect(value, `key path: ${path}`).not.toMatch(CJK_RE)
    }
  })

  it('zh-TW.json leaves contain CJK (with carve-out for non-translatable terms equal to en)', () => {
    // Spec scenario: "keys representing identifiers, codes, or non-translatable
    // terms are exempt only if also non-translatable in en" — i.e., the zh-TW
    // value is byte-equal to the en value (a proper name like "English").
    const enFlat = flatten(en as MessageNode)
    const zhFlat = flatten(zhTW as MessageNode)
    for (const [path, zhValue] of Object.entries(zhFlat)) {
      const enValue = enFlat[path]
      if (zhValue === enValue) continue
      expect(zhValue, `key path: ${path}`).toMatch(CJK_RE)
    }
  })
})

describe('editor settings namespace', () => {
  // The three tests above are all satisfied when a namespace is missing from BOTH
  // files — parity holds trivially and there are no leaves to scan. Presence has to
  // be asserted on its own.
  const KEYS = [
    'title',
    'gear_aria',
    'autocomplete_label',
    'autocomplete_hint',
    'close_brackets_label',
    'close_brackets_hint',
    'font_size_label',
    'font_size_hint',
    'font_size_decrease_aria',
    'font_size_increase_aria',
    'reset',
  ]

  it.each(KEYS)('defines editor_settings.%s in both locales', (key) => {
    const enFlat = flatten(en as MessageNode)
    const zhFlat = flatten(zhTW as MessageNode)
    expect(enFlat[`editor_settings.${key}`]).toBeTypeOf('string')
    expect(zhFlat[`editor_settings.${key}`]).toBeTypeOf('string')
  })

  it('defines nothing else under editor_settings', () => {
    const paths = Object.keys(flatten(en as MessageNode))
      .filter(p => p.startsWith('editor_settings.'))
      .map(p => p.slice('editor_settings.'.length))
    expect(paths.sort()).toEqual([...KEYS].sort())
  })
})

describe('every message compiles', () => {
  // The shape tests above read the JSON as data and never ask vue-i18n to compile it.
  // A leaf containing a literal `{` is valid JSON, is a valid string, and renders as
  // written — vue-i18n falls back to the raw text — while logging a compilation error
  // on every single render. Nothing throws, so `t()` returning the right string proves
  // nothing. Measured in a real browser: "Message compilation error: Unterminated
  // closing brace", 37 occurrences on one page, and no test anywhere went red.
  it.each([
    ['en', en],
    ['zh-TW', zhTW],
  ])('%s: no leaf makes the message compiler complain', (locale, messages) => {
    const logged: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { logged.push(String(args[0])) }
    try {
      const i18n = createI18n({
        legacy: false,
        locale,
        fallbackLocale: 'en',
        messages: { [locale]: messages } as Record<string, unknown>,
        missingWarn: false,
        fallbackWarn: false,
      })
      for (const path of Object.keys(flatten(messages as MessageNode))) {
        ;(i18n.global.t as (k: string) => string)(path)
      }
    } finally {
      console.error = original
    }
    expect(logged.filter(m => m.includes('Message compilation error'))).toEqual([])
  })

  it.each([
    ['en', en],
    ['zh-TW', zhTW],
  ])('%s: the bracket hint still renders the three characters it names', (locale, messages) => {
    // Escaping the brace must not turn the escape syntax into the visible text — the
    // learner has to see `( [ {`, which is the whole point of that sentence.
    const i18n = createI18n({
      legacy: false,
      locale,
      fallbackLocale: 'en',
      messages: { [locale]: messages } as Record<string, unknown>,
      missingWarn: false,
      fallbackWarn: false,
    })
    const rendered = (i18n.global.t as (k: string) => string)('editor_settings.close_brackets_hint')
    expect(rendered).toContain('(')
    expect(rendered).toContain('[')
    expect(rendered).toContain('{')
    expect(rendered).not.toContain("'{'")
  })
})
