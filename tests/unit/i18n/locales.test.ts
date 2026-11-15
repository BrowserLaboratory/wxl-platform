import { describe, it, expect } from 'vitest'
import { LOCALES, DEFAULT_PRIMARY_LOCALE, isKnownLocale, LOCALE_ENGLISH_NAMES } from '../../../.vitepress/locales'

describe('locale list module (B17)', () => {
  it('exports LOCALES in order', () => {
    expect(LOCALES).toEqual(['en', 'zh-TW'])
  })

  it('exports DEFAULT_PRIMARY_LOCALE as zh-TW and a member of LOCALES', () => {
    expect(DEFAULT_PRIMARY_LOCALE).toBe('zh-TW')
    expect(LOCALES).toContain(DEFAULT_PRIMARY_LOCALE)
  })

  it('isKnownLocale is true for en and zh-TW', () => {
    expect(isKnownLocale('en')).toBe(true)
    expect(isKnownLocale('zh-TW')).toBe(true)
  })

  it('isKnownLocale is false for EN, zh-tw, empty string, null and 1', () => {
    expect(isKnownLocale('EN')).toBe(false)
    expect(isKnownLocale('zh-tw')).toBe(false)
    expect(isKnownLocale('')).toBe(false)
    expect(isKnownLocale(null)).toBe(false)
    expect(isKnownLocale(1)).toBe(false)
  })

  it('exports LOCALE_ENGLISH_NAMES keyed exactly by LOCALES', () => {
    expect(LOCALE_ENGLISH_NAMES).toEqual({ en: 'English', 'zh-TW': 'Traditional Chinese' })
    expect(Object.keys(LOCALE_ENGLISH_NAMES).sort()).toEqual([...LOCALES].sort())
  })
})
