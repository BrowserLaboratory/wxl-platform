import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  DEFAULT_VISITING_LOCALE,
  detectLocaleFromPath,
  persistLocale,
  readStoredLocale,
  redirectTargetForStoredLocale,
  rememberChoice,
  shouldPersistOnColdLoad,
  type Locale,
} from '../i18n'
import { publishedPages } from '../i18n/publishedPages'
import { classifyArrival, createCarry, isArrival, lineLocale, notFoundRedirect, switcherDecision, targetPath } from '../i18n/arrival'
import type { ChoiceOutcome } from '../i18n/missingTranslation'

/**
 * The theme Layout's arrivals (spec 0008, seam S1 wired to the router): what each page shown
 * to the learner asked for, the redirects taken on the way, and the locale of the
 * missing-translation line.
 *
 * - **Cold load.** `recordColdLoad` notes the first arrival when the Layout mounts, which is
 *   after VitePress's router has rendered it. `release` runs once the session gate lets the
 *   page go (A6, C11): a not-found arrival is replaced by its counterpart (C1, C2); a page is
 *   sent to its counterpart's list entry only when that counterpart is published, and
 *   otherwise stays with the line (A1–A4); a failed load is left alone (C8). Either redirect
 *   carries the arrival's requested locale to its landing (L6).
 * - **Later arrivals.** A change of path — not of hash or query alone (L8) — is classified
 *   again; a not-found one is replaced the same way, once the first arrival has been released
 *   or when the not-found page itself is not held by the gate.
 * - **A switcher choice.** `choose` is an arrival of its own, asking for the chosen locale: it
 *   navigates to a published counterpart, or stays, with no history entry, the URL and the
 *   interface unchanged, and the line at once (B1–B7, D17). It ends the cold load's claim to a
 *   redirect (L5).
 * - **The line.** Shown on a page when the page has no version in the requested locale: for a
 *   switcher choice that stayed, at once; otherwise once released, and not while `holdLine` says
 *   the page's own session gate is still asking (C11).
 *
 * **The stored preference.** Written by the learner's explicit acts only: a switcher choice
 * (W1; kept in memory for the tab when storage refuses, D14), and the cold load of a published
 * page under `/zh-TW/` — also through a short link's redirect or a reload (W2, D13) — decided
 * from the page the router rendered (D16), not from the URL, and without waiting for the gate:
 * the gate's clear leaves `wxl-locale` alone. Nothing else here writes it: the redirects and
 * later arrivals are the site's doing, not the learner's choices (D5, W3–W5).
 *
 * Client-only: the cold load, later arrivals and a switcher choice read `window.location`, and
 * nothing calls them during SSR, so the line is absent from the static HTML (L7).
 */
export function useArrivals(deps: {
  route: { path: string }
  router: { go: (to: string, options?: { replace?: boolean }) => unknown }
  page: Ref<{ isNotFound?: boolean; relativePath: string }>
  base: () => string
  /** True while the session gate is asking on the current page: the line of a cold load or a
   * not-found arrival waits (a switcher choice's does not, D17), and so does a not-found redirect
   * from a page whose first arrival has not been released. */
  holdLine: () => boolean
}) {
  const { route, router, page, base, holdLine } = deps
  const pages = publishedPages()
  const carry = createCarry()
  const entry = ref<string | null>(null)
  const requested = ref<Locale | null>(null)
  // False until the session gate releases the first arrival.
  const released = ref(false)
  // True while the arrival on screen is a switcher choice that stayed: its line shows at once,
  // whatever the gate and the first release (D17).
  const lineAtOnce = ref(false)

  const current = () =>
    classifyArrival({
      isNotFound: page.value.isNotFound ?? false,
      relativePath: page.value.relativePath,
      pathname: window.location.pathname,
      base: base(),
    }, pages)

  // Records an arrival: its page and the locale it asked for — the locale a redirect carried
  // to it, else, on a cold load of a prefixed page, that prefix, else the stored preference or
  // the default (the requested-locale table).
  const record = (coldLoad: boolean) => {
    lineAtOnce.value = false
    const arrival = current()
    if (arrival.kind !== 'page') {
      carry.discard()
      entry.value = null
      requested.value = null
      return arrival
    }
    entry.value = arrival.entry
    const prefixed = detectLocaleFromPath(arrival.entry) === 'zh-TW'
    requested.value = carry.take(arrival.entry)
      ?? (coldLoad && prefixed ? 'zh-TW' : readStoredLocale() ?? DEFAULT_VISITING_LOCALE)
    return arrival
  }

  // Navigates away from this arrival, carrying its requested locale. Until the landing is
  // recorded there is no page to speak about, so the line is withheld meanwhile.
  const redirect = (target: string, carried: Locale | null) => {
    if (carried) carry.set(targetPath(target, base()), carried)
    entry.value = null
    router.go(target, { replace: true })
  }

  // C1–C3: a not-found arrival is replaced by its counterpart, or left as it is.
  const replaceNotFound = (): boolean => {
    if (current().kind !== 'not-found') return false
    const decision = notFoundRedirect(window.location, base(), pages)
    if (!decision) return false
    redirect(decision.target, decision.requested)
    return true
  }

  // The cold-load redirect belongs to the cold load's arrival only (L5). It is gone once any
  // later arrival happened — a link, Back, even a return to the same path — and while a
  // navigation the learner started is still loading (the address bar has its path already,
  // the route does not yet).
  let coldLoadCurrent = false
  let coldLoadPathname: string | null = null

  const release = () => {
    if (!replaceNotFound() && coldLoadCurrent && window.location.pathname === coldLoadPathname) {
      // Recorded again, so the redirect and the line both use the stored value current now,
      // not the one read when the gate began to ask (A1–A4).
      const target = redirectTargetForStoredLocale(window.location, base(), pages, record(true))
      if (target) redirect(target, requested.value)
    }
    released.value = true
  }

  const stop = watch(
    () => route.path,
    (next, previous) => {
      if (typeof window === 'undefined' || !isArrival(previous, next)) return
      coldLoadCurrent = false
      // A not-found page asks nothing of the gate itself, so it is replaced as soon as the
      // first arrival is released — or at once, when the page the learner came from is
      // the one still asking (spec 0008, C11).
      if (record(false).kind === 'not-found' && (released.value || !holdLine())) replaceNotFound()
    },
    { flush: 'pre' },
  )

  const lineLocaleNow: ComputedRef<Locale | null> = computed(() =>
    requested.value === null || (!lineAtOnce.value && holdLine())
      ? null
      // A choice that stayed counts as released for its own line.
      : lineLocale({ requested: requested.value, entry: entry.value, pages, released: released.value || lineAtOnce.value }))

  // A locale switcher choice (B1–B7) is an arrival of its own, asking for the chosen locale. It
  // is written (W1, kept for the tab when storage refuses: D14), and it ends the cold load's claim
  // to a redirect (L5). It navigates to a published counterpart — a push, so Back returns — or
  // stays, adding no history entry and keeping the URL and the interface locale, with the line
  // at once in the chosen locale (B2, D17). On the not-found page the line never shows (B7).
  const choose = (locale: Locale): ChoiceOutcome => {
    rememberChoice(locale)
    coldLoadCurrent = false
    const arrival = current()
    const decision = switcherDecision({ chosen: locale, arrival, location: window.location, base: base(), pages })
    // Whatever it does, a choice is the newest request: a redirect's carry still waiting for its
    // landing must not outrank it (L6).
    carry.discard()
    if (decision.kind === 'navigate') {
      router.go(decision.target)
      return 'navigate'
    }
    if (arrival.kind === 'page') {
      requested.value = locale
      lineAtOnce.value = true
    }
    return 'stay'
  }

  // The cold load's arrival, once the router has rendered it: a published page under a
  // locale prefix is the learner's request, and is stored (W2); nothing else is (W3, W4).
  const recordColdLoad = () => {
    coldLoadCurrent = true
    coldLoadPathname = window.location.pathname
    const arrival = record(true)
    if (shouldPersistOnColdLoad(arrival)) persistLocale('zh-TW')
  }

  return {
    recordColdLoad,
    release,
    choose,
    lineLocale: lineLocaleNow,
    stop,
  }
}
