import { describe, it, expect } from 'vitest'
import { localesConfig } from '../../../.vitepress/locales-config'
import { LOCALES } from '../../../.vitepress/locales'

// B46: `localeIndex` is `root` on primary pages.
describe('localesConfig (B46): keys are root plus every other listed code', () => {
  it('primary en: root, zh-TW', () => {
    expect(Object.keys(localesConfig('en'))).toEqual(['root', 'zh-TW'])
  })

  it('primary zh-TW: root, en', () => {
    expect(Object.keys(localesConfig('zh-TW'))).toEqual(['root', 'en'])
  })
})

// B19 (second half): a locales-config entry per listed code.
describe('localesConfig (B19): one entry per listed locale, plus root', () => {
  it.each(LOCALES)('has LOCALES.length entries for primary %s', (primary) => {
    expect(Object.keys(localesConfig(primary)).length).toBe(LOCALES.length)
  })
})

// B56: localesConfig('en') equals today's literal .vitepress/config.mts `locales` object, copied
// here verbatim (traceability.md: "The literal is typed into the test, not read from git").
describe('localesConfig("en") (B56)', () => {
  it('equals the literal of .vitepress/config.mts at 65de8c0', () => {
    expect(localesConfig('en')).toEqual({
      root: {
        label: 'English',
        lang: 'en-US',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/' },
            { text: 'Challenges', link: '/challenges/' },
            { text: 'Guide', link: '/guide/' },
          ],
          sidebar: {
            '/guide/': [
              { text: 'Getting Started', link: '/guide/' },
              { text: 'Code Panel', link: '/guide/python' },
              { text: 'Network & Repeater', link: '/guide/network' },
              { text: 'Browser Panel', link: '/guide/browser' },
              { text: 'Pentest Notes', link: '/guide/notes' },
              { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            ],
          },
        },
      },
      'zh-TW': {
        label: '繁體中文',
        lang: 'zh-TW',
        link: '/zh-TW/',
        themeConfig: {
          nav: [
            { text: '首頁', link: '/zh-TW/' },
            { text: '挑戰', link: '/zh-TW/challenges/' },
            { text: '使用手冊', link: '/zh-TW/guide/' },
          ],
          sidebar: {
            '/zh-TW/guide/': [
              { text: '快速開始', link: '/zh-TW/guide/' },
              { text: 'Code 面板', link: '/zh-TW/guide/python' },
              { text: 'Network 與 Repeater', link: '/zh-TW/guide/network' },
              { text: 'Browser 面板', link: '/zh-TW/guide/browser' },
              { text: 'Pentest Notes', link: '/zh-TW/guide/notes' },
              { text: '疑難排解', link: '/zh-TW/guide/troubleshooting' },
            ],
          },
        },
      },
    })
  })
})

// B57: localesConfig('zh-TW') equals the "Schema: locales config" JSON, copied verbatim.
describe('localesConfig("zh-TW") (B57)', () => {
  it('equals the Schema: locales config JSON', () => {
    expect(localesConfig('zh-TW')).toEqual({
      root: {
        label: '繁體中文',
        lang: 'zh-TW',
        themeConfig: {
          nav: [
            { text: '首頁', link: '/' },
            { text: '挑戰', link: '/challenges/' },
            { text: '使用手冊', link: '/guide/' },
          ],
          sidebar: {
            '/guide/': [
              { text: '快速開始', link: '/guide/' },
              { text: 'Code 面板', link: '/guide/python' },
              { text: 'Network 與 Repeater', link: '/guide/network' },
              { text: 'Browser 面板', link: '/guide/browser' },
              { text: 'Pentest Notes', link: '/guide/notes' },
              { text: '疑難排解', link: '/guide/troubleshooting' },
            ],
          },
        },
      },
      en: {
        label: 'English',
        lang: 'en-US',
        link: '/en/',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/en/' },
            { text: 'Challenges', link: '/en/challenges/' },
            { text: 'Guide', link: '/en/guide/' },
          ],
          sidebar: {
            '/en/guide/': [
              { text: 'Getting Started', link: '/en/guide/' },
              { text: 'Code Panel', link: '/en/guide/python' },
              { text: 'Network & Repeater', link: '/en/guide/network' },
              { text: 'Browser Panel', link: '/en/guide/browser' },
              { text: 'Pentest Notes', link: '/en/guide/notes' },
              { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
            ],
          },
        },
      },
    })
  })
})

// B58: keys and link prefixes, walking every entry (no sampling), for both primaries.
describe('localesConfig (B58): keys and link prefixes', () => {
  it.each(LOCALES)('primary %s: root has no link; every other key has link "/k/"', (primary) => {
    const config = localesConfig(primary) as Record<
      string,
      { link?: string; themeConfig: { nav: { link: string }[]; sidebar: Record<string, { link: string }[]> } }
    >
    expect(config.root.link).toBeUndefined()
    for (const [key, entry] of Object.entries(config)) {
      if (key === 'root') continue
      expect(entry.link).toBe(`/${key}/`)
      for (const nav of entry.themeConfig.nav) {
        expect(nav.link.startsWith(`/${key}/`)).toBe(true)
      }
      for (const [sidebarKey, items] of Object.entries(entry.themeConfig.sidebar)) {
        expect(sidebarKey.startsWith(`/${key}/`)).toBe(true)
        for (const item of items) {
          expect(item.link.startsWith(`/${key}/`)).toBe(true)
        }
      }
    }
  })
})
