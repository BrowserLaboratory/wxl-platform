import { entryForRelativePath, isPublishedPath, targetUrl, withoutBase } from './pages'
import { lookupNotFound } from './lookup'
import { detectLocaleFromPath, localizePath, type Locale } from './index'

/**
 * Arrivals and the decisions taken on them (spec 0008, seam S1). An arrival is one page shown
 * to the learner: by a cold load, a switcher choice, a not-found redirect, or a later
 * navigation. The decision functions are pure — they take what the router rendered, the
 * location, the base and the page list, and read no globals. `createCarry` is the one piece of
 * state, and it holds only what one redirect hands to its landing.
 */

/** What the router produced for this arrival (D11). */
export interface RouterResult {
  /** True when the router rendered the not-found page. */
  isNotFound: boolean
  /** The rendered page's source file, relative to the source directory. */
  relativePath: string
  /** `location.pathname`, base included. */
  pathname: string
  /** The site base: `/` or a path like `/repo/`. */
  base: string
}

export type Arrival =
  | { kind: 'page'; entry: string }
  | { kind: 'not-found' }
  | { kind: 'failed-load' }

/**
 * A rendered page is identified by its source file, so an alias URL the router also renders
 * (`.html`, `/index.html`, a trailing slash) is the page it rendered (D16). A letter-case variant
 * is not one on the built site: the router looks its page up in lower case but fetches the
 * chunk with the case as typed, which the static host does not serve. The not-found page for a path that
 * is itself a published page is a failed load — a chunk that did not arrive — not a missing
 * translation, and nothing is done about it.
 */
export function classifyArrival(result: RouterResult, pages: readonly string[]): Arrival {
  if (!result.isNotFound) return { kind: 'page', entry: entryForRelativePath(result.relativePath) }
  return isPublishedPath(result.pathname, result.base, pages) ? { kind: 'failed-load' } : { kind: 'not-found' }
}

/**
 * Where a not-found arrival goes (rows C1–C3): the counterpart's list entry, and the target to
 * navigate to — that entry with the base put back and the query and hash kept. Null when the
 * path has no counterpart in the list. The requested locale is the one the not-found path
 * named, which is the other locale of the target.
 */
export function notFoundRedirect(
  location: { pathname: string; search?: string; hash?: string },
  base: string,
  pages: readonly string[],
  P: Locale,
): { target: string; entry: string; requested: Locale } | null {
  const entry = lookupNotFound(location.pathname, base, pages, P)
  if (entry === null) return null
  // The requested locale is the NOT-FOUND PATH's own (D11's three kinds: a translation path's
  // own is T, a primary-code path's and a primary path's own are both P) — not the landing
  // entry's. The two coincide for NT and NU (the landing is always the path's counterpart,
  // D28's ordinary branch), but not for NP (D28): the landing there is ALSO P's own, the same
  // locale the path already named, so inferring it from the landing would wrongly say T.
  const withoutBasePath = withoutBase(location.pathname, base) ?? location.pathname
  // TA1: decoded, like the lookup itself — a percent-encoded locale prefix in the not-found
  // URL is still that locale's own code once decoded. A path that fails to decode is used as
  // written (this is only read to name `requested`, never compared against the page list).
  let local: string
  try {
    local = decodeURIComponent(withoutBasePath)
  } catch {
    local = withoutBasePath
  }
  return {
    target: targetUrl(entry, base, location),
    entry,
    requested: detectLocaleFromPath(local, P),
  }
}

/**
 * Where a locale switcher choice goes (rows B1–B3, B5, B7): `navigate` to a target built from a
 * list entry (D16), with the location's query and hash kept, or `stay`. On a page, the chosen
 * locale's counterpart of the page's entry when the list has it; the page's own locale, or a
 * counterpart the list lacks, stays. On the not-found page or a failed load, the lookup
 * algorithm's counterpart of the path, whatever was chosen: the menu there offers only the other
 * locale, since the line never shows on the not-found page.
 */
export function switcherDecision(input: {
  chosen: Locale
  arrival: Arrival
  location: { pathname: string; search?: string; hash?: string }
  base: string
  pages: readonly string[]
  P: Locale
}): { kind: 'navigate'; target: string } | { kind: 'stay' } {
  const { chosen, arrival, location, base, pages, P } = input
  let entry: string | null
  if (arrival.kind === 'page') {
    const counterpart = localizePath(arrival.entry, chosen, P)
    entry = detectLocaleFromPath(arrival.entry, P) !== chosen && pages.includes(counterpart) ? counterpart : null
  } else {
    entry = lookupNotFound(location.pathname, base, pages, P)
  }
  return entry === null ? { kind: 'stay' } : { kind: 'navigate', target: targetUrl(entry, base, location) }
}

/**
 * The locale the missing-translation line is written in, or null when it does not show (L1):
 * on a page, once the arrival is released, when the requested locale is not the page's and the
 * page has no version in it.
 */
export function lineLocale(input: {
  requested: Locale
  entry: string | null
  pages: readonly string[]
  released: boolean
  P: Locale
}): Locale | null {
  const { requested, entry, pages, released, P } = input
  if (!released || entry === null) return null
  if (detectLocaleFromPath(entry, P) === requested) return null
  return pages.includes(localizePath(entry, requested, P)) ? null : requested
}

/**
 * The requested locale a redirect S1 made carries to the page it lands on (L6). It is bound to
 * that redirect's target and taken by the next arrival, whether or not that arrival is the
 * target, so it can never reach a later page.
 */
export function createCarry() {
  let held: { target: string; requested: Locale } | null = null
  return {
    set(target: string, requested: Locale) {
      held = { target, requested }
    },
    /** The carried locale when `path` is the redirect's target; the carry is gone either way. */
    take(path: string): Locale | null {
      const found = held && held.target === path ? held.requested : null
      held = null
      return found
    },
    discard() {
      held = null
    },
  }
}

/** The path of a URL, without its query and hash. */
export function pathOnly(url: string): string {
  return url.replace(/[?#].*$/, '')
}

/** The base-less path a redirect target names, for binding a carry to it. */
export function targetPath(target: string, base: string): string {
  const path = pathOnly(target)
  return withoutBase(path, base) ?? path
}

/** Whether going from one route to the next is an arrival: a change of hash or query alone is not (L8). */
export function isArrival(previous: string, next: string): boolean {
  return pathOnly(previous) !== pathOnly(next)
}
