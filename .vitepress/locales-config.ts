// VitePress's `locales` configuration (seam 0010-S4; D8, Schema: locales config). `localesConfig`
// generates one entry per listed locale, keyed `root` for the primary and the locale's own code
// otherwise; only a non-root entry carries `link` and a path prefix, so the literal content below
// is written once per locale and prefixed generically, never duplicated per primary (BC1, BC7:
// no locale comparison lives here — only membership in `LOCALES`, iterated).

import { LOCALES, type Locale } from './locales.ts'

interface NavItem {
  text: string
  link: string
}

interface LocaleContent {
  label: string
  lang: string
  nav: NavItem[]
  sidebarKey: string
  sidebar: NavItem[]
}

const LOCALE_CONTENT: Record<Locale, LocaleContent> = {
  en: {
    label: 'English',
    lang: 'en-US',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Challenges', link: '/challenges/' },
      { text: 'Guide', link: '/guide/' },
    ],
    sidebarKey: '/guide/',
    sidebar: [
      { text: 'Getting Started', link: '/guide/' },
      { text: 'Code Panel', link: '/guide/python' },
      { text: 'Network & Repeater', link: '/guide/network' },
      { text: 'Browser Panel', link: '/guide/browser' },
      { text: 'Pentest Notes', link: '/guide/notes' },
      { text: 'Troubleshooting', link: '/guide/troubleshooting' },
    ],
  },
  'zh-TW': {
    label: '繁體中文',
    lang: 'zh-TW',
    nav: [
      { text: '首頁', link: '/' },
      { text: '挑戰', link: '/challenges/' },
      { text: '使用手冊', link: '/guide/' },
    ],
    sidebarKey: '/guide/',
    sidebar: [
      { text: '快速開始', link: '/guide/' },
      { text: 'Code 面板', link: '/guide/python' },
      { text: 'Network 與 Repeater', link: '/guide/network' },
      { text: 'Browser 面板', link: '/guide/browser' },
      { text: 'Pentest Notes', link: '/guide/notes' },
      { text: '疑難排解', link: '/guide/troubleshooting' },
    ],
  },
}

function withPrefix(path: string, code: Locale): string {
  return path === '/' ? `/${code}/` : `/${code}${path}`
}

function entryFor(code: Locale, isRoot: boolean) {
  const content = LOCALE_CONTENT[code]
  const prefix = (path: string) => (isRoot ? path : withPrefix(path, code))
  const entry: Record<string, unknown> = {
    label: content.label,
    lang: content.lang,
    themeConfig: {
      nav: content.nav.map((item) => ({ text: item.text, link: prefix(item.link) })),
      sidebar: {
        [prefix(content.sidebarKey)]: content.sidebar.map((item) => ({ text: item.text, link: prefix(item.link) })),
      },
    },
  }
  if (!isRoot) entry.link = prefix('/')
  return entry
}

/** VitePress's `locales` object for `primary`: `root` is the primary locale, unprefixed; every
 *  other listed code is its own entry, with `link` and every nav/sidebar path prefixed by it. */
export function localesConfig(primary: Locale): Record<string, unknown> {
  const result: Record<string, unknown> = { root: entryFor(primary, true) }
  for (const code of LOCALES) {
    if (code !== primary) result[code] = entryFor(code, false)
  }
  return result
}
