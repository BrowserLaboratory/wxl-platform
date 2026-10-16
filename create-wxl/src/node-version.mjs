/** The one place the minimum supported Node.js version is written down; `run.mjs`'s CW-E01
 * message and `isNodeVersionOk`'s default both derive from it (S-21: no duplicated literal). */
export const MINIMUM_NODE_VERSION = '22.6.0'

const NUMERIC_VERSION_RE = /^\d+(\.\d+)*$/

/** Numeric (not string) comparison, so `22.10.0` is not mistaken for less than `22.6.0`. A
 * version that is not purely `\d+(\.\d+)*` (e.g. a stray `v` prefix, or empty) is rejected as too
 * old rather than silently accepted (C-10 / P-17 / S-21: no fail-open on an unparsable string). */
export function isNodeVersionOk(version, minimum = MINIMUM_NODE_VERSION.split('.').map(Number)) {
  const str = String(version)
  if (!NUMERIC_VERSION_RE.test(str)) return false
  const parts = str.split('.').map(Number)
  for (let i = 0; i < minimum.length; i++) {
    const a = parts[i] ?? 0
    const b = minimum[i]
    if (a > b) return true
    if (a < b) return false
  }
  return true
}
