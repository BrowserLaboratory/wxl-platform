import { createI18n } from 'vue-i18n'
import en from './messages/en.json'
import zhTW from './messages/zh-TW.json'
import type { Arrival } from './arrival'
import { targetUrl } from './pages'
import { isKnownLocale as isKnownLocaleOnList, type Locale } from '../../locales.ts'

export type { Locale }

export const LOCALE_STORAGE_KEY = 'wxl-locale'

export function isKnownLocale(value: unknown): value is Locale {
  return isKnownLocaleOnList(value)
}

/** The other of the two locales. The primary-locale epic replaces this with a locale list. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-TW' ? 'en' : 'zh-TW'
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
 * Pure-function locale detection from a URL pathname string, relative to the
 * primary locale `P` (D31). The rule: a pathname equal to `/<T>`, equal to
 * `/<T>/`, or starting with `/<T>/` — where `T` is the OTHER of the two
 * locales, `otherLocale(P)` — resolves to `T`; everything else resolves to
 * `P`.
 *
 * Pathological inputs such as `/zh-TWfoo` (a hypothetical non-locale path
 * that happens to begin with the literal characters of a locale code but has
 * no separating slash) MUST resolve to `P` — the prefix rule requires the
 * locale segment to be terminated by `/` or end-of-string.
 *
 * **Silent fallback to `P` is intentional.** Any unrecognised pathname (typo
 * like `/zh-tw` lowercase, future-but-unconfigured locale prefix, deep link
 * to a deleted page) resolves to `P` without warning. This matches
 * VitePress's own `locales` routing semantics (the `root` locale catches
 * everything not in another configured prefix). If a third locale is ever
 * added, this function MUST be updated to dispatch on an explicit list — the
 * current binary fallback rule will silently misclassify the new locale as
 * `P` otherwise.
 *
 * SSR-safe: takes plain strings, touches no globals. Reused by both
 * `detectInitialLocale()` (for cold loads) and the Layout's route watcher
 * (for SPA navigation), keeping the rule single-sourced.
 */
export function detectLocaleFromPath(path: string, P: Locale): Locale {
  const T = otherLocale(P)
  if (path === `/${T}` || path === `/${T}/` || path.startsWith(`/${T}/`)) {
    return T
  }
  return P
}

/**
 * Pure-function locale prefixing, the inverse companion to
 * `detectLocaleFromPath()`. Returns `path` rewritten so that it belongs to
 * `locale`: the `/<T>` segment is added when `locale` is the non-primary
 * locale `T` (`otherLocale(P)`) and removed when `locale` is `P`.
 *
 * **The rule lives here and nowhere else.** The switcher's decision
 * (`switcherDecision` in `arrival.ts`), the not-found lookup and `MergedNav`
 * derive their paths from this function rather than from a local copy,
 * because `detectLocaleFromPath()` above documents that adding a third locale
 * requires editing it — a warning that must not need posting in two places.
 *
 * **Strips before it adds, so it is idempotent for site-absolute inputs** —
 * inputs beginning with `/`. Applying it twice to such an input yields the same
 * result as applying it once, which is what makes it safe to call on input that
 * may already be localized.
 *
 * It is NOT idempotent outside that scope, and the signature does not enforce
 * it: `''` maps to `/<T>` and then to `/<T>/`, and `noleadingslash` maps to
 * `/<T>noleadingslash` and then to `/<T>/<T>noleadingslash`. Callers pass
 * a path beginning with `/`; the boundary is pinned by tests.
 *
 * **The prefix must be terminated by `/` or end-of-string**, matching
 * `detectLocaleFromPath()`. `/zh-TWfoo` carries no locale prefix.
 *
 * **Never strips `P`'s own code**: only `T`'s segment is ever a prefix, so a
 * path beginning `/<P>` (where `P`'s code happens to also look like a path
 * segment) is left as ordinary path text.
 *
 * **Takes a base-less path; callers wrap the OUTPUT with `withBase()`, never
 * the input.** Under a non-empty site base, `localizePath(withBase(p), …)` would
 * see `/my-base/challenges/`, fail the prefix comparison, and emit
 * `/<T>/my-base/challenges/` — the locale segment lands outside the base
 * instead of inside it. This ordering is asserted by a test that supplies a
 * non-identity `withBase` double; the production default is identity, so the
 * bug would otherwise be invisible.
 *
 * SSR-safe: takes plain strings, touches no globals.
 */
export function localizePath(path: string, locale: Locale, P: Locale): string {
  const T = otherLocale(P)
  let basePath = path
  if (path === `/${T}` || path === `/${T}/`) {
    basePath = '/'
  } else if (path.startsWith(`/${T}/`)) {
    basePath = path.slice(`/${T}`.length)
  }
  if (locale === P) {
    return basePath
  }
  return basePath === '/' ? `/${T}/` : `/${T}${basePath}`
}

/**
 * `localeIndex` (VitePress's `useData()`), translated to a `Locale` (D31, seam
 * 0010-S11). `'root'` is the key of whichever locale has no `link` in the
 * `locales` configuration — the primary locale, `P` — and `otherLocale(P)`'s
 * own code is the key of the other. Any other value (an unknown key, a typo)
 * answers `P`, the same silent-fallback rule `detectLocaleFromPath` uses.
 */
export function pageLocaleOf(localeIndex: string, P: Locale): Locale {
  const T = otherLocale(P)
  return localeIndex === T ? T : P
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
 * SSR-safe: returns `P` when there is no `window`.
 */
export function detectInitialLocale(P: Locale): Locale {
  if (typeof window === 'undefined') return P
  return detectLocaleFromPath(window.location.pathname, P)
}

/**
 * A switcher choice that storage refused, kept for the rest of this tab (spec 0008, D14). It lives
 * only as long as this module does: a reload starts without it.
 */
let rememberedChoice: Locale | null = null

/**
 * Reads the stored locale preference, or null when there is none, it is not a
 * known locale code, or `localStorage` is unreachable (private browsing raises
 * a SecurityError). Never throws.
 *
 * A switcher choice that could not be written is read first: it is "used as the
 * stored value for the rest of that tab's arrivals" (D14), even where storage still
 * holds an older value.
 */
export function readStoredLocale(): Locale | null {
  if (rememberedChoice !== null) return rememberedChoice
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isKnownLocale(raw) ? raw : null
  } catch {
    return null
  }
}

/**
 * Whether a cold load writes `T` (`otherLocale(P)`) into the stored preference
 * (spec 0008, W2–W4; generalised to `P` by D31).
 *
 * **Only an explicit request does (D5).** A cold load of a published page under
 * `/<T>/` is one — also when a short link's server redirect or a reload
 * brought the learner there (D13). The unprefixed tree is the absence of a
 * request and leaves the preference alone: writing there would store the default
 * on every cold load and wipe the very preference the cold-load redirect exists
 * to honour.
 *
 * **Decided after the router resolves, from what it rendered (D16).** The arrival
 * is classified first (`classifyArrival`): a prefixed path that is not a published
 * page (a not-found arrival, about to be sent elsewhere or shown as not found) and
 * the not-found page for a path that is one (a failed load) write nothing, and a
 * page rendered from an alias URL counts as the page it is. The URL alone cannot
 * tell these apart, which is why this is no longer decided in `enhanceApp`.
 */
export function shouldPersistOnColdLoad(arrival: Arrival, P: Locale): boolean {
  return arrival.kind === 'page' && detectLocaleFromPath(arrival.entry, P) === otherLocale(P)
}

/**
 * Where a cold load should be sent to honour the stored locale preference, or
 * `null` when it should stay put (spec 0008, decision table A1–A7).
 *
 * The preference is expressed as a navigation rather than as an override of the
 * URL, so that the address bar and the rendered page always describe the same
 * locale — see `detectInitialLocale` for why the override was removed.
 *
 * **Only a page arrival, and only out of the unprefixed tree.** A not-found arrival
 * has its own decision and a failed load is left alone (D11). A page under a
 * locale prefix is an explicit request and outranks any stored preference;
 * redirecting away from it would make a shared link resolve differently for
 * every reader depending on what they happen to have stored.
 *
 * **Only to a translation that exists (stage 1 decision G6).** The target is the rendered page's
 * counterpart, and only when that counterpart is in the page list; otherwise the
 * learner stays and the missing-translation line says why (A2, A3).
 *
 * **The target is a list entry, never the URL's text (D16).** A page the router
 * rendered from an alias — `.html`, `/index.html`, a trailing slash — is
 * identified by its source file, so the target is spelled as the list spells it
 * (`targetUrl`): the base is put back in front, the query and hash are kept, and
 * the location's path is not read at all.
 *
 * Reads the stored value (`readStoredLocale`, which answers null without a
 * `window`); everything else comes in as arguments: the location's query and
 * hash, the base, the page list and what the router rendered.
 */
export function redirectTargetForStoredLocale(
  location: { search?: string; hash?: string },
  base: string,
  pages: readonly string[],
  arrival: Arrival,
  P: Locale,
): string | null {
  if (arrival.kind !== 'page') return null
  // No preference is not "no opinion about where to send them" — it is the case the
  // default exists for. An unreadable `localStorage` and a value naming no known locale
  // both arrive here as `null` from `readStoredLocale`, and both mean the same thing:
  // this visitor has expressed no preference the system can honour.
  const wanted = readStoredLocale() ?? P
  // A learner who wants the primary locale is already in the unprefixed tree (A4); a page
  // under a locale prefix is an explicit request and stays (A5).
  if (wanted === P || detectLocaleFromPath(arrival.entry, P) !== P) return null
  const counterpart = localizePath(arrival.entry, wanted, P)
  if (!pages.includes(counterpart)) return null
  return targetUrl(counterpart, base, location)
}

export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage unavailable; silently ignore
  }
}

/**
 * Remembers a locale switcher choice (spec 0008, W1, W6, D14): writes the stored preference, and
 * when storage refuses, keeps the choice in memory for the tab instead. Never throws. A later
 * successful write drops the kept choice, since storage then holds the newer one.
 */
export function rememberChoice(locale: Locale): void {
  // A click handler's function: there is no choice to remember during SSR, and module state
  // there would be shared by every render.
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    rememberedChoice = null
  } catch {
    rememberedChoice = locale
  }
}

/** Drops the kept choice. Tests only: module state outlives a test within one file. */
export function _resetRememberedChoiceForTests(): void {
  rememberedChoice = null
}
