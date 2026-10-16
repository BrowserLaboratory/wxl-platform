// Shared text helpers: JSON string literals for named values (every C0, DEL and C1 character
// escaped per traceability.md "Error and warning codes", D10), and POSIX quoting for commands
// printed for copying (N1, N4, N5, N7, N8, CW-E12, CW-W05).

/** S-20: the one definition of "C0, DEL or C1" (traceability.md "Error and warning codes" and
 * AC-24's `hasControlChar`), shared with `escapeChar`'s own, wider "needs `\uXXXX`" rule below
 * (which also covers lone surrogates, a separate reason to escape, review finding C-09 -- NOT a
 * reason to withhold a copyable command, so `hasControlChar` does not call this with that range
 * folded in). */
function isControlCodePoint(code) {
  return code < 0x20 || (code >= 0x7f && code <= 0x9f)
}

function isLoneSurrogate(code) {
  return code >= 0xd800 && code <= 0xdfff
}

/** D10 (the user-approved reading; stage 6/7 correction P-01/S-02/C-11): a line feed inside a
 * value is the JSON short escape `\n` (the matrix's own value, traceability.md C60); every other
 * C0, DEL, C1 character and lone surrogate (review finding C-09: `JSON.stringify` has written
 * U+D800-U+DFFF as `\uXXXX` since ES2019's well-formed `JSON.stringify`) is written `\uXXXX` --
 * `JSON.stringify`'s own short escapes for tab/CR/backspace/form-feed are NOT used for those,
 * and DEL/C1 (review finding C-05) would otherwise pass through `JSON.stringify` unescaped at
 * all. */
function escapeChar(ch) {
  if (ch === '"') return '\\"'
  if (ch === '\\') return '\\\\'
  if (ch === '\n') return '\\n'
  const code = ch.codePointAt(0)
  if (isControlCodePoint(code) || isLoneSurrogate(code)) {
    return `\\u${code.toString(16).padStart(4, '0')}`
  }
  return ch
}

/** Prints `value` as a JSON string literal, one code point at a time through `escapeChar` (full
 * control over which escapes it uses, D10). S-35: a non-string value is converted with
 * `String()` first, so one escaping rule applies to every call site -- a number, boolean, etc.
 * never carries a control character in this codebase's actual call sites, but an array or object
 * holding one (e.g. a warning list entry) now escapes the same way a plain string does. */
export function jsonValue(value) {
  const str = typeof value === 'string' ? value : String(value)
  let out = '"'
  for (const ch of str) out += escapeChar(ch)
  return out + '"'
}

const BARE_RE = /^[A-Za-z0-9._\-/@%+=:,]+$/

export function posixQuoteWord(word) {
  if (BARE_RE.test(word)) return word
  return `'${word.replace(/'/g, "'\\''")}'`
}

export function posixCommand(words) {
  return words.map(posixQuoteWord).join(' ')
}

/** A directory beginning with `-` gets the `./` prefix before it is quoted. */
export function formatDirectoryArg(directory) {
  return directory.startsWith('-') ? `./${directory}` : directory
}

/** S-22: the one place every CW-E09 call site (fsops.mjs, pristine.mjs) tags a caught file-system
 * error with the path `run.mjs` should report, without overwriting one an earlier catch already
 * set (a write's own catch, re-thrown through another wrapper). */
export function tagReportPath(err, path) {
  if (err && typeof err.reportPath !== 'string') err.reportPath = path
  return err
}

/** traceability.md "Error and warning codes": "When a value to be placed in such a command
 * contains a C0, DEL or C1 character, the command is not printed". True when any code point in
 * `str` is C0 (U+0000-U+001F), DEL (U+007F) or C1 (U+0080-U+009F). */
export function hasControlChar(str) {
  for (const ch of str) {
    if (isControlCodePoint(ch.codePointAt(0))) return true
  }
  return false
}
