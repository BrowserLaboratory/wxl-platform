// A single numeric-parts comparison (S-11), shared by `node-version.mjs` and `git-version.mjs`:
// both read a dotted version string into an array of numbers and need the same "is this at least
// the minimum" rule, so there is one place to fix if it is ever wrong.

/** `parts` and `minimum`: arrays of non-negative integers (major, minor, patch, ...), most
 * significant first. A part missing past the end of either array counts as `0`. Returns `true`
 * when `parts` is `minimum` or newer. */
export function isAtLeast(parts, minimum) {
  for (let i = 0; i < minimum.length; i++) {
    const a = parts[i] ?? 0
    const b = minimum[i]
    if (a > b) return true
    if (a < b) return false
  }
  return true
}
