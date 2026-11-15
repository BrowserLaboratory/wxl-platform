// The locale list module (D4, D115): the one, import-free enumeration of locales. Loadable by
// Node's `--experimental-strip-types` and by the VitePress configuration alike, so it imports
// nothing.

export const LOCALES = ['en', 'zh-TW'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_PRIMARY_LOCALE: Locale = 'zh-TW'

export function isKnownLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-TW': 'Traditional Chinese',
}
