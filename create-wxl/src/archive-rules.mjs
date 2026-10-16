// The archive entry rules (traceability.md "Archive entry rules", rules 1-5), checked against the
// already-parsed entry list `archive.mjs`'s `parseArchive` returns (entries and ignored entries,
// in archive order, each carrying the raw typeflag `raw-tar.mjs` read off the decompressed
// bytes, cross-checked against `tar`'s own decode). The whole list is checked before step 8
// writes anything (step order table, step 7). Entries are walked ONCE, in archive order, checking
// every rule against each entry before moving to the next (S-03/P-03), so CW-E08 names the first
// breaking entry in archive order, not the first one a particular rule happens to reach; rule 4
// compares each entry only against the ones already seen. `checkEntryRules` returns the enriched
// list (first component stripped, classified kind) so step 8 writes from the SAME validated data,
// never re-deriving a path or kind from `tar`'s own, un-stripped fields (C-01).

export class ArchiveRuleError extends Error {
  constructor(rule, path, { isCommentMarker = false } = {}) {
    super(`archive entry rule ${rule} broken${path === undefined ? '' : ` at ${path}`}`)
    this.name = 'ArchiveRuleError'
    this.rule = rule
    this.path = path
    // S-25: rule 2's comment violation has no entry to name; `path` is the FIXED marker text
    // "pax comment", not a value read from the archive, so it must not be printed as a quoted
    // JSON literal the way a real entry path is (messages.mjs).
    this.isCommentMarker = isCommentMarker
  }
}

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f\u0080-\u009f]/
const FIRST_COMPONENT_RE = /^[^\u0000-\u001f\u007f\u0080-\u009f\\]+$/

/** Regular file (typeflag `0`, NUL or `7`) or directory (`5`); anything else (symlink, hardlink,
 * character/block device, FIFO, GNU sparse, unknown) breaks rule 1. Classified from the RAW
 * typeflag byte, not `tar`'s own reclassified `entry.type` (raw-tar.mjs's header comment). */
function classify(rawTypeflag) {
  if (rawTypeflag === '0' || rawTypeflag === '\u0000' || rawTypeflag === '7') return 'file'
  if (rawTypeflag === '5') return 'dir'
  return 'other'
}

function firstComponentAndRest(headerPath) {
  const idx = headerPath.indexOf('/')
  if (idx === -1) return { firstComponent: headerPath, rest: '' }
  return { firstComponent: headerPath.slice(0, idx), rest: headerPath.slice(idx + 1) }
}

/** The shared first component itself must be a sane, relative, single name (C-01/C-11): step 8
 * joins `rest` under it, so a `\`, a control character, an empty value or `.`/`..` here would be
 * the same path-shape problem rule 3 already rejects for everything after it. */
function checkFirstComponent(component, headerPath) {
  if (component === '' || component === '.' || component === '..' || !FIRST_COMPONENT_RE.test(component)) {
    throw new ArchiveRuleError(2, headerPath)
  }
}

function checkComponents(relPath, headerPath) {
  if (relPath.includes('\\')) throw new ArchiveRuleError(3, headerPath)
  for (const component of relPath.split('/')) {
    if (component === '') throw new ArchiveRuleError(3, headerPath)
    if (component === '.' || component === '..') throw new ArchiveRuleError(3, headerPath)
    if (component.toLowerCase() === '.git') throw new ArchiveRuleError(3, headerPath)
    if (component.endsWith('.') || component.endsWith(' ')) throw new ArchiveRuleError(3, headerPath)
    if (CONTROL_CHAR_RE.test(component)) throw new ArchiveRuleError(3, headerPath)
  }
}

/** Rule 3: after dropping the first component, a file's path is non-empty and does not end in
 * `/`; a directory's path may or may not end in a single trailing `/` (both are accepted, P-04 --
 * the spec only excepts a directory's trailing `/` from the "no empty component" rule, it does
 * not require one); the prefix directory itself has an empty `rest` here and is always accepted. */
function checkRule3(entry) {
  const { rest, kind, headerPath } = entry
  if (kind === 'dir') {
    if (rest === '') return
    const trimmed = rest.endsWith('/') ? rest.slice(0, -1) : rest
    checkComponents(trimmed, headerPath)
    return
  }
  if (rest === '' || rest.endsWith('/')) throw new ArchiveRuleError(3, headerPath)
  checkComponents(rest, headerPath)
}

function relForCompareOf(entry) {
  return entry.kind === 'dir' && entry.rest.endsWith('/') ? entry.rest.slice(0, -1) : entry.rest
}

function isProperPrefix(shortRel, longRel) {
  return longRel.length > shortRel.length && longRel.startsWith(`${shortRel}/`)
}

/** Rule 4, checked against only the entries already seen (archive order, S-03/P-03): no two
 * entries share a path, or a path equal after NFC then `toLowerCase()`; and no file's path is a
 * proper prefix of another entry's path, whatever their order. A collision names the entry being
 * checked now (always the later of the two, since `seen` holds only earlier ones); the
 * proper-prefix check compares the raw (non-folded) relative paths, by decision (no case folding
 * beyond the spec's literal text). Mutates `entry` with the comparison keys it just computed, and
 * pushes it onto `seen` for the entries after it. */
function checkCollisionAgainstSeen(entry, seen) {
  const relForCompare = relForCompareOf(entry)
  const normalized = relForCompare.normalize('NFC').toLowerCase()
  for (const prior of seen) {
    if (prior.normalized === normalized) throw new ArchiveRuleError(4, entry.headerPath)
    if (prior.kind === 'file' && isProperPrefix(prior.relForCompare, relForCompare)) {
      throw new ArchiveRuleError(4, entry.headerPath)
    }
    if (entry.kind === 'file' && isProperPrefix(relForCompare, prior.relForCompare)) {
      throw new ArchiveRuleError(4, entry.headerPath)
    }
  }
  entry.relForCompare = relForCompare
  entry.normalized = normalized
  seen.push(entry)
}

/**
 * Validates the whole entry list against rules 1-5, throwing `ArchiveRuleError` on the first
 * breaking entry in archive order (D4: the path named is the entry's header path exactly as it
 * appears in the archive, including the first component), and returning the enriched list (each
 * entry's own fields plus `firstComponent`, `rest`, `kind`) for step 8 to write from directly.
 * `commit` is the commit requested (create-wxl always downloads by commit, so rule 2's comment
 * check always applies).
 */
export function checkEntryRules({ entries, comment }, { commit }) {
  // S-04: rule 5 (no file in the list) is checked after rule 2's comment, and the comment
  // condition no longer repeats "undefined" as a special case: `commit` is always a non-empty
  // string, so `comment !== commit` already covers a missing comment.
  if (comment !== commit) throw new ArchiveRuleError(2, undefined, { isCommentMarker: true })
  if (entries.length === 0) throw new ArchiveRuleError(5)

  const firstEntryComponent = firstComponentAndRest(entries[0].headerPath).firstComponent
  checkFirstComponent(firstEntryComponent, entries[0].headerPath)

  let hasFile = false
  const seen = []
  const enriched = []
  for (const entry of entries) {
    const { firstComponent, rest } = firstComponentAndRest(entry.headerPath)
    const kind = classify(entry.rawType)
    const enrichedEntry = { ...entry, firstComponent, rest, kind }

    if (firstComponent !== firstEntryComponent) throw new ArchiveRuleError(2, entry.headerPath)
    if (kind === 'other') throw new ArchiveRuleError(1, entry.headerPath)
    checkRule3(enrichedEntry)
    checkCollisionAgainstSeen(enrichedEntry, seen)
    if (kind === 'file') hasFile = true
    enriched.push(enrichedEntry)
  }

  if (!hasFile) throw new ArchiveRuleError(5)

  return enriched
}
