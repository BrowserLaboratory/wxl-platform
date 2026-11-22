// D54: the site-smoke suite derives every expected URL from `P`, the primary locale, read with
// `readPrimaryLocale` from the repository's `range.json` exactly as the build reads it, through
// this one helper, never from a literal `/zh-TW` prefix. The same suite then passes in a range
// whose `P = en`. Playwright runs from the repository root, so `range.json` is `./range.json`.
import { resolve } from 'node:path'
import { readPrimaryLocale } from '../../.vitepress/primary-locale.ts'
import { LOCALES, type Locale } from '../../.vitepress/locales.ts'

/** The build's primary locale: `range.json`'s `primaryLocale`, else the upstream default. */
export const PRIMARY: Locale = readPrimaryLocale(resolve(process.cwd(), 'range.json'))

/** The translation locales: every listed locale but the primary one, in list order. */
export const TRANSLATIONS: readonly Locale[] = LOCALES.filter((code) => code !== PRIMARY)

/**
 * The base-less URL path of `rest` (a path relative to the locale's folder, `''` for its home) in
 * `locale`: the primary locale's pages sit at the output root, every other locale's under `/<code>/`.
 */
export function localePath(locale: Locale, rest = ''): string {
  const tail = rest.replace(/^\/+/, '')
  return locale === PRIMARY ? `/${tail}` : `/${locale}/${tail}`
}
