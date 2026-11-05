import { entryForSourcePath, isPublishedPath, targetUrl, withoutBase } from './pages'
import { lookupNotFound } from './lookup'
import { detectLocaleFromPath, localizePath, otherLocale, type Locale } from './index'

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
  if (!result.isNotFound) return { kind: 'page', entry: entryForSourcePath(result.relativePath) }
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
): { target: string; entry: string; requested: Locale } | null {
  const entry = lookupNotFound(location.pathname, base, pages)
  if (entry === null) return null
  return {
    target: targetUrl(entry, base, location),
    entry,
    requested: otherLocale(detectLocaleFromPath(entry)),
  }
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
}): Locale | null {
  const { requested, entry, pages, released } = input
  if (!released || entry === null) return null
  if (detectLocaleFromPath(entry) === requested) return null
  return pages.includes(localizePath(entry, requested)) ? null : requested
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
