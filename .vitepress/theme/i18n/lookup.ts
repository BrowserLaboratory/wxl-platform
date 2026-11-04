import { detectLocaleFromPath, localizePath, otherLocale } from './index'
import { firstListedEntry, pathCandidates } from './pages'

/**
 * The list entry of a not-found path's counterpart — the same page in the other locale — or
 * null when none of the path's candidates (`pathCandidates`, the lookup algorithm) has one in
 * the list. A "counterpart" that is still in the path's own locale (`/zh-TW/zh-TW/x` →
 * `/zh-TW/x`) is not one.
 */
export function lookupNotFound(pathname: string, base: string, pages: readonly string[]): string | null {
  const found = pathCandidates(pathname, base)
  if (found.length === 0) return null
  const other = otherLocale(detectLocaleFromPath(found[0]))
  const counterparts = found.map((p) => localizePath(p, other)).filter((p) => detectLocaleFromPath(p) === other)
  return firstListedEntry(counterparts, pages)
}
