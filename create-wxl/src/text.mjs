// Shared text helpers: JSON string literals for named values, and POSIX quoting for commands
// printed for copying (N1, N8, CW-E12, CW-W05 per traceability.md "Error and warning codes"). The
// full escaping of control characters is pinned by a later ticket (T-0024); this covers the plain
// values this ticket's rows exercise.

export function jsonValue(value) {
  return JSON.stringify(value)
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
