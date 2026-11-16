import { detectLocaleFromPath, localizePath, otherLocale, type Locale } from './index'
import { firstListedEntry, pathCandidates, withoutBase } from './pages'

/**
 * `local` with one leading `/<P>` segment removed, or null when `local` does not start with one
 * (D28). `P`'s code is never a real routing prefix — `T`'s is — so a not-found path spelling it
 * explicitly is always an old or crafted URL, never a page the router could have rendered.
 */
function stripPrimaryCodeSegment(local: string, P: Locale): string | null {
  if (local === `/${P}` || local === `/${P}/`) return '/'
  if (local.startsWith(`/${P}/`)) return local.slice(`/${P}`.length)
  return null
}

/**
 * The list entry of a not-found path's counterpart — the same page in the other locale — or
 * null when none of the path's candidates (`pathCandidates`, the lookup algorithm) has one in
 * the list. A "counterpart" that is still in the path's own locale (`/<T>/<T>/x` →
 * `/<T>/x`) is not one.
 *
 * **D28, checked first: the primary-code strip.** A not-found path whose first segment is `P`'s
 * own code (R22's old `/<P>/…` URLs — `P` is never a real prefix, only `T` is) is looked up with
 * that one segment removed. The result counts only when the remainder is itself a
 * primary-locale path: not `T`'s (a stray `/<P>/<T>/x`) and not `P`'s own code again (a doubled
 * `/<P>/<P>/x`) — both "find nothing" here and fall through to the ordinary algorithm below,
 * which also finds nothing for them (D28). When the remainder is not itself listed, the lookup
 * falls through to D27's primary-path rule on it — `/<T>/<remainder>` when that is listed (A39)
 * — before giving up. This is still one not-found redirect (0008 C9).
 */
export function lookupNotFound(pathname: string, base: string, pages: readonly string[], P: Locale): string | null {
  const T = otherLocale(P)
  const local = withoutBase(pathname, base)
  if (local !== null) {
    const stripped = stripPrimaryCodeSegment(local, P)
    if (stripped !== null && detectLocaleFromPath(stripped, P) === P && stripPrimaryCodeSegment(stripped, P) === null) {
      const strippedCandidates = pathCandidates(stripped, '/')
      const direct = firstListedEntry(strippedCandidates, pages)
      if (direct !== null) return direct
      const viaT = strippedCandidates.map((p) => localizePath(p, T, P))
      const fallThrough = firstListedEntry(viaT, pages)
      if (fallThrough !== null) return fallThrough
      return null
    }
  }
  const found = pathCandidates(pathname, base)
  if (found.length === 0) return null
  const other = otherLocale(detectLocaleFromPath(found[0], P))
  const counterparts = found.map((p) => localizePath(p, other, P)).filter((p) => detectLocaleFromPath(p, P) === other)
  return firstListedEntry(counterparts, pages)
}
