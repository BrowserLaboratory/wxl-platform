import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  DEFAULT_VISITING_LOCALE,
  detectLocaleFromPath,
  persistLocale,
  readStoredLocale,
  redirectTargetForStoredLocale,
  shouldPersistOnColdLoad,
  type Locale,
} from '../i18n'
import { publishedPages } from '../i18n/publishedPages'
import { classifyArrival, createCarry, isArrival, lineLocale, notFoundRedirect, targetPath } from '../i18n/arrival'

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
 * - **The line.** Shown on a page, once released, when the page has no version in the requested
 *   locale, and not while `holdLine` says the page's own session gate is still asking (C11).
 *
 * **The stored preference.** Written once, by the cold load of a published page under
 * `/zh-TW/` — the learner's explicit request, also through a short link's redirect or a
 * reload (W2, D13) — decided from the page the router rendered (D16), not from the URL, and
 * without waiting for the gate: the gate's clear leaves `wxl-locale` alone. Nothing else here
 * writes it: the redirects and later arrivals are the site's doing, not the learner's choices
 * (D5, W3–W5).
 *
 * Client-only: the cold load and later arrivals read `window.location`, and nothing calls them
 * during SSR, so the line is absent from the static HTML (L7).
 */
export function useArrivals(deps: {
  route: { path: string }
  router: { go: (to: string, options?: { replace?: boolean }) => unknown }
  page: Ref<{ isNotFound?: boolean; relativePath: string }>
  base: () => string
  /** True while the session gate is asking on the current page: the line waits, and so does a
   * not-found redirect from a page whose first arrival has not been released. */
  holdLine: () => boolean
}) {
  const { route, router, page, base, holdLine } = deps
  const pages = publishedPages()
  const carry = createCarry()
  const entry = ref<string | null>(null)
  const requested = ref<Locale | null>(null)
  // False until the session gate releases the first arrival.
  const released = ref(false)

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
    requested.value === null || holdLine()
      ? null
      : lineLocale({ requested: requested.value, entry: entry.value, pages, released: released.value }))

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
    lineLocale: lineLocaleNow,
    stop,
  }
}
