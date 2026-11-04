import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { DEFAULT_VISITING_LOCALE, detectLocaleFromPath, readStoredLocale, redirectTargetForStoredLocale, type Locale } from '../i18n'
import { publishedPages } from '../i18n/publishedPages'
import { classifyArrival, createCarry, isArrival, lineLocale, notFoundRedirect, targetPath } from '../i18n/arrival'

/**
 * The theme Layout's arrivals (spec 0008, seam S1 wired to the router): what each page shown
 * to the learner asked for, the redirects taken on the way, and the locale of the
 * missing-translation line.
 *
 * - **Cold load.** `recordColdLoad` notes the first arrival when the Layout mounts.
 *   `release` runs once the session gate lets the page go (A6, C11): a not-found arrival is
 *   replaced by its counterpart (C1, C2); otherwise a page gets today's cold-load redirect; a
 *   failed load is left alone (C8). Either redirect carries the arrival's requested locale to
 *   its landing (L6).
 * - **Later arrivals.** A change of path — not of hash or query alone (L8) — is classified
 *   again; a not-found one is replaced the same way, once the first arrival has been released
 *   or when the not-found page itself is not held by the gate.
 * - **The line.** Shown on a page, once released, when the page has no version in the requested
 *   locale, and not while `holdLine` says the page's own session gate is still asking (C11).
 *
 * Nothing here writes the stored preference: the redirects are the site's, not the learner's
 * choices (D5).
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

  const release = () => {
    if (!replaceNotFound() && current().kind === 'page') {
      const target = redirectTargetForStoredLocale(window.location, base())
      if (target) redirect(target, requested.value)
    }
    released.value = true
  }

  const stop = watch(
    () => route.path,
    (next, previous) => {
      if (typeof window === 'undefined' || !isArrival(previous, next)) return
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

  return {
    recordColdLoad: () => record(true),
    release,
    lineLocale: lineLocaleNow,
    stop,
  }
}
