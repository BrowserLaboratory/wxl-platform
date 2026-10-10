import { createI18n } from 'vue-i18n'
import en from './messages/en.json'
import zhTW from './messages/zh-TW.json'

export type Locale = 'en' | 'zh-TW'

export const LOCALE_STORAGE_KEY = 'wxl-locale'

/**
 * The locale a visitor sees when they have expressed no preference.
 *
 * Deliberately NOT the locale `createI18n` is configured with. Those two answer
 * different questions: this one is what to show someone who has not chosen, and
 * that one is what the server renders and what an unresolved message falls back
 * to. Sharing one value would make a change to either silently change the other.
 *
 * The readers this site is built for read Traditional Chinese. Before this
 * default existed, every one of them had to work the locale switcher once — and
 * on a shared classroom machine, once per learner.
 *
 * It does not override anything. A locale prefix in the URL outranks it, a
 * stored preference outranks it, and operating the switcher once stores that
 * preference — so a reader who wants English has an exit and needs it only once.
 */
export const DEFAULT_VISITING_LOCALE: Locale = 'zh-TW'
export const KNOWN_LOCALES: readonly Locale[] = ['en', 'zh-TW'] as const

export function isKnownLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh-TW'
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  globalInjection: true,
  // Stage 1 ships with empty message catalogues; Stage 2 populates them.
  // Suppress the per-key "Not found" warnings so the dev console isn't flooded
  // until messages land. Re-enable if you need to debug missing keys.
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    en,
    'zh-TW': zhTW,
  },
})

export default i18n

/**
 * Pure-function locale detection from a URL pathname string. The rule:
 * a pathname equal to `/zh-TW`, equal to `/zh-TW/`, or starting with
 * `/zh-TW/` resolves to `'zh-TW'`; everything else resolves to `'en'`.
 *
 * Pathological inputs such as `/zh-TWfoo` (a hypothetical non-locale path
 * that happens to begin with the literal characters `zh-TW` but has no
 * separating slash) MUST resolve to `'en'` — the prefix rule requires the
 * locale segment to be terminated by `/` or end-of-string.
 *
 * **Silent fallback to `'en'` is intentional.** Any unrecognised pathname
 * (typo like `/zh-tw` lowercase, future-but-unconfigured locale prefix,
 * deep link to a deleted page) resolves to `'en'` without warning. This
 * matches VitePress's own `locales` routing semantics (the `root` locale
 * catches everything not in another configured prefix). If a third locale
 * is ever added, this function MUST be updated to dispatch on an explicit
 * list — the current binary fallback rule will silently misclassify the
 * new locale as `'en'` otherwise.
 *
 * SSR-safe: takes a plain string, touches no globals. Reused by both
 * `detectInitialLocale()` (for cold loads) and the Layout's route watcher
 * (for SPA navigation), keeping the rule single-sourced.
 */
export function detectLocaleFromPath(path: string): Locale {
  if (path === '/zh-TW' || path === '/zh-TW/' || path.startsWith('/zh-TW/')) {
    return 'zh-TW'
  }
  return 'en'
}

/**
 * Pure-function locale prefixing, the inverse companion to
 * `detectLocaleFromPath()`. Returns `path` rewritten so that it belongs to
 * `locale`: the `/zh-TW` segment is added for `'zh-TW'` and removed for
 * `'en'`.
 *
 * **The rule lives here and nowhere else.** `LocaleSwitcher` and `MergedNav`
 * both derive their paths from this function rather than from a local copy,
 * because `detectLocaleFromPath()` above documents that adding a third locale
 * requires editing it — a warning that must not need posting in two places.
 *
 * **Strips before it adds, so it is idempotent for site-absolute inputs** —
 * inputs beginning with `/`. Applying it twice to such an input yields the same
 * result as applying it once, which is what makes it safe to call on input that
 * may already be localized.
 *
 * It is NOT idempotent outside that scope, and the signature does not enforce
 * it: `''` maps to `/zh-TW` and then to `/zh-TW/`, and `noleadingslash` maps to
 * `/zh-TWnoleadingslash` and then to `/zh-TW/zh-TWnoleadingslash`. Callers pass
 * a path beginning with `/`; the boundary is pinned by tests.
 *
 * **The prefix must be terminated by `/` or end-of-string**, matching
 * `detectLocaleFromPath()`. `/zh-TWfoo` carries no locale prefix.
 *
 * **Takes a base-less path; callers wrap the OUTPUT with `withBase()`, never
 * the input.** Under a non-empty site base, `localizePath(withBase(p))` would
 * see `/my-base/challenges/`, fail the prefix comparison, and emit
 * `/zh-TW/my-base/challenges/` — the locale segment lands outside the base
 * instead of inside it. This ordering is asserted by a test that supplies a
 * non-identity `withBase` double; the production default is identity, so the
 * bug would otherwise be invisible.
 *
 * SSR-safe: takes plain strings, touches no globals.
 */
export function localizePath(path: string, locale: Locale): string {
  let basePath = path
  if (path === '/zh-TW' || path === '/zh-TW/') {
    basePath = '/'
  } else if (path.startsWith('/zh-TW/')) {
    basePath = path.slice('/zh-TW'.length)
  }
  if (locale === 'zh-TW') {
    return basePath === '/' ? '/zh-TW/' : `/zh-TW${basePath}`
  }
  return basePath
}

/**
 * The active locale on a cold load, decided by the URL alone — the same rule the
 * Layout's route watcher applies on every subsequent navigation.
 *
 * **`localStorage` deliberately does not participate.** It used to win over a
 * pathname carrying no locale prefix, while a prefixed pathname won over it —
 * an asymmetry under which the address bar and the rendered page could describe
 * different locales. Components reading the page locale then drifted from
 * components reading the runtime locale, and the nav bar rendered in English
 * above panels rendered in Chinese.
 *
 * The stored preference is still honoured, as a **navigation**: see the
 * cold-load redirect in the Layout. Expressing it that way keeps the URL and the
 * page in agreement instead of putting them in conflict.
 *
 * SSR-safe: returns the default locale when there is no `window`.
 */
export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  return detectLocaleFromPath(window.location.pathname)
}

/**
 * Reads the stored locale preference, or null when there is none, it is not a
 * known locale code, or `localStorage` is unreachable (private browsing raises
 * a SecurityError). Never throws.
 */
export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isKnownLocale(raw) ? raw : null
  } catch {
    return null
  }
}

/**
 * Where a cold load should be sent to honour the stored locale preference, or
 * `null` when it should stay put.
 *
 * The preference is expressed as a navigation rather than as an override of the
 * URL, so that the address bar and the rendered page always describe the same
 * locale — see `detectInitialLocale` for why the override was removed.
 *
 * **Only redirects out of the unprefixed tree.** A pathname that already carries
 * a locale prefix is an explicit request and outranks any stored preference;
 * redirecting away from it would make a shared link resolve differently for
 * every reader depending on what they happen to have stored.
 *
 * **The locale segment goes inside the site base.** `location.pathname` carries
 * the base and `localizePath` requires a base-less path, so the base is stripped
 * before and restored after — the same ordering the locale switcher uses, and
 * the same ordering whose absence was a defect there.
 *
 * Pure: takes the location parts and the base rather than reading globals, so it
 * is testable without a DOM and safe under SSR.
 */
/**
 * Whether a cold load should write its detected locale into the stored
 * preference.
 *
 * **Only an explicitly prefixed path may.** Init-time used to persist whatever
 * it detected, unconditionally. Under the URL-only rule that would write the
 * default locale on every cold load of the unprefixed tree, wiping the very
 * preference the cold-load redirect exists to honour — and wiping it *before*
 * the redirect gets to read it, so the preference would be unobservable rather
 * than merely ignored.
 *
 * A prefixed path is a request and updates the preference; the default tree is
 * the absence of a request and leaves it alone.
 */
export function shouldPersistOnColdLoad(pathname: string, base: string): boolean {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  const bare = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname
  return detectLocaleFromPath(bare) !== 'en'
}

export function redirectTargetForStoredLocale(
  location: { pathname: string; search?: string; hash?: string },
  base: string,
): string | null {
  // No preference is not "no opinion about where to send them" — it is the case the
  // default exists for. An unreadable `localStorage` and a value naming no known locale
  // both arrive here as `null` from `readStoredLocale`, and both mean the same thing:
  // this visitor has expressed no preference the system can honour.
  const target = readStoredLocale() ?? DEFAULT_VISITING_LOCALE

  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  const bare = location.pathname.startsWith(prefix)
    ? location.pathname.slice(prefix.length)
    : location.pathname

  if (detectLocaleFromPath(bare) === target) return null
  // Explicit request in the URL wins; only leave the unprefixed tree.
  if (detectLocaleFromPath(bare) !== 'en') return null

  return prefix + localizePath(bare, target) + (location.search ?? '') + (location.hash ?? '')
}

export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage unavailable; silently ignore
  }
}
