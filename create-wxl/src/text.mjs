// Shared text helpers: JSON string literals for named values, and POSIX quoting for commands
// printed for copying (N1, N8, CW-E12, CW-W05 per traceability.md "Error and warning codes"). The
// full escaping of control characters is pinned by a later ticket (T-0024); this covers the plain
// values this ticket's rows exercise.

const DEL_AND_C1_RE = /[\u007f-\u009f]/g

/** `JSON.stringify` only escapes C0 (U+0000-U+001F), `"` and `\`; DEL and the C1 range
 * (U+007F-U+009F) pass through unescaped (review finding C-05), which an archive entry path or
 * other outside value can contain and have printed verbatim to a terminal (a control-sequence
 * injection). Full escaping of every control character is pinned by T-0024's C60; this closes
 * the gap for the two ranges this ticket's own new output (CW-E08's named entry path) can
 * reach. */
export function jsonValue(value) {
  return JSON.stringify(value).replace(
    DEL_AND_C1_RE,
    (c) => `\\u${c.codePointAt(0).toString(16).padStart(4, '0')}`,
  )
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
