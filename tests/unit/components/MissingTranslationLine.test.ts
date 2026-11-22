import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import MissingTranslationLine from '../../../.vitepress/theme/components/MissingTranslationLine.vue'

// The missing-translation line (spec 0008, seam S3). Its text is pinned by literal equality,
// the way SessionGate-truth.test.ts pins the gate's copy: comparing against the message file
// would pass a wrong sentence. The base is replaced so the link's href shows it was added.
const base = vi.hoisted(() => ({ value: '/' }))
vi.mock('vitepress', () => ({
  withBase: (path: string) => base.value.replace(/\/$/, '') + path,
}))

// `P` (D31, A30): defaults to 'en', today's build, so every existing case below keeps its href
// unchanged (T1). The new P = zh-TW cases below set this explicitly.
const mockPrimaryLocale = vi.hoisted(() => ({ value: 'en' as 'en' | 'zh-TW' }))
vi.mock('../../../.vitepress/theme/i18n/primaryLocale', () => ({ primaryLocale: () => mockPrimaryLocale.value }))

function mountLine(locale: 'en' | 'zh-TW', runtime: 'en' | 'zh-TW') {
  const i18n = createI18n({ legacy: false, locale: runtime, fallbackLocale: 'en', messages: { en, 'zh-TW': zhTW } })
  return mount(MissingTranslationLine, { props: { locale }, global: { plugins: [i18n] } })
}

describe('MissingTranslationLine', () => {
  beforeEach(() => {
    mockPrimaryLocale.value = 'en'
  })

  it('says, in Traditional Chinese, that the page has no Traditional Chinese version', () => {
    base.value = '/'
    const line = mountLine('zh-TW', 'en')
    const root = line.get('[data-missing-translation]')
    expect(root.attributes('lang')).toBe('zh-TW')
    expect(root.get('[data-missing-translation-text]').text()).toBe('這一頁沒有繁體中文版本，所以顯示英文版。')
    const link = root.get('a')
    expect(link.text()).toBe('前往繁體中文題目清單')
    expect(link.attributes('href')).toBe('/zh-TW/challenges')
  })

  it('says, in English, that the page has no English version', () => {
    base.value = '/'
    const line = mountLine('en', 'zh-TW')
    const root = line.get('[data-missing-translation]')
    expect(root.attributes('lang')).toBe('en')
    expect(root.get('[data-missing-translation-text]').text()).toBe('This page has no English version, so it is shown in Traditional Chinese.')
    const link = root.get('a')
    expect(link.text()).toBe('Go to the English challenge list')
    expect(link.attributes('href')).toBe('/challenges')
  })

  it('adds the site base to the link', () => {
    base.value = '/repo/'
    expect(mountLine('zh-TW', 'zh-TW').get('a').attributes('href')).toBe('/repo/zh-TW/challenges')
    expect(mountLine('en', 'en').get('a').attributes('href')).toBe('/repo/challenges')
  })

  it('has no control to dismiss it', () => {
    base.value = '/'
    const line = mountLine('zh-TW', 'en')
    expect(line.findAll('button')).toHaveLength(0)
    expect(line.findAll('a')).toHaveLength(1)
  })

  // A30, under P = zh-TW: the href is relative to P, not hard-coded to zh-TW being the
  // translation. The text and `lang` are unaffected (requested-locale properties only) — the
  // full mirror of the two P = en text/lang/link-text cases above, not href alone.
  it('says, in Traditional Chinese, requested zh-TW, under P = zh-TW (A30)', () => {
    mockPrimaryLocale.value = 'zh-TW'
    base.value = '/'
    const line = mountLine('zh-TW', 'en')
    const root = line.get('[data-missing-translation]')
    expect(root.attributes('lang')).toBe('zh-TW')
    expect(root.get('[data-missing-translation-text]').text()).toBe('這一頁沒有繁體中文版本，所以顯示英文版。')
    const link = root.get('a')
    expect(link.text()).toBe('前往繁體中文題目清單')
    expect(link.attributes('href')).toBe('/challenges')
  })

  it('says, in English, requested en, under P = zh-TW (A30)', () => {
    mockPrimaryLocale.value = 'zh-TW'
    base.value = '/'
    const line = mountLine('en', 'zh-TW')
    const root = line.get('[data-missing-translation]')
    expect(root.attributes('lang')).toBe('en')
    expect(root.get('[data-missing-translation-text]').text()).toBe('This page has no English version, so it is shown in Traditional Chinese.')
    const link = root.get('a')
    expect(link.text()).toBe('Go to the English challenge list')
    expect(link.attributes('href')).toBe('/en/challenges')
  })

  it('adds the site base to the link, under P = zh-TW (A30)', () => {
    mockPrimaryLocale.value = 'zh-TW'
    base.value = '/repo/'
    expect(mountLine('zh-TW', 'en').get('a').attributes('href')).toBe('/repo/challenges')
    expect(mountLine('en', 'zh-TW').get('a').attributes('href')).toBe('/repo/en/challenges')
  })
})
