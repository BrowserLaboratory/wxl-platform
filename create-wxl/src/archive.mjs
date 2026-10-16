// Parses a downloaded archive body (gzip + tar) into an in-memory entry list, using the `tar`
// package's low-level `Parser` (strict mode turns every parse warning into an 'error' event,
// rows 6/C55) alongside `raw-tar.mjs`'s own walker, which recovers the raw typeflag byte `tar`'s
// `entry.type` cannot (archive-rules.mjs needs it for rules 1 and 3). T-0021's `archive-rules.mjs`
// validates the returned list against rules 1-5; this module only extracts it, in archive order.
//
// Review finding P-01/C-02 (desync): two independent parsers walking the same bytes can disagree
// about where one header ends and the next begins (a pax `size` override, or a directory's
// decoded size being forced to 0, are the two `tar` applies that `raw-tar.mjs` must mirror). A
// mirrored rule closes the KNOWN divergences, but as a second line of defence this module also
// cross-checks every pairing's path and size against `tar`'s own decoded header, and the raw
// walker's own entry count against `tar`'s: any mismatch is `ArchiveParseError` (CW-E08), not a
// silent, wrong pairing. Finding P-11/C-07: the body must be gzip (`tar`'s own zstd
// auto-detection is explicitly turned off, closing another source of divergence); a plain tar
// body is rejected here even though `raw-tar.mjs`'s own export still accepts one directly.

import { Parser } from 'tar'
import { walkRawEntries } from './raw-tar.mjs'

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/** Wraps every failure this module itself detects: a `tar`/zlib parse error, or a cross-check
 * mismatch between the raw walker and `tar`'s own decode. `run.mjs` prints CW-E08 only for this
 * class and rethrows anything else (a bug is not an archive problem, S-02/P-08/C-08). */
export class ArchiveParseError extends Error {}

export function parseArchive(bytes) {
  return new Promise((resolvePromise, reject) => {
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
    if (buf.length < 2 || buf[0] !== GZIP_MAGIC_0 || buf[1] !== GZIP_MAGIC_1) {
      reject(new ArchiveParseError('the archive is not gzip-compressed'))
      return
    }

    let rawEntries
    try {
      rawEntries = walkRawEntries(buf).filter((e) => !e.isMeta)
    } catch (err) {
      reject(new ArchiveParseError(err?.message ?? String(err)))
      return
    }
    let rawIndex = 0
    let desynced = false
    const nextRaw = () => (rawIndex < rawEntries.length ? rawEntries[rawIndex++] : undefined)

    // `zstd: false` (P-11/C-07): `tar`'s own format auto-detection would otherwise accept a zstd
    // body the raw walker cannot decode at all, letting an attacker fully control what typeflag
    // the walker sees at every offset.
    const parser = new Parser({ strict: true, zstd: false })
    const entries = []
    let comment

    function readComment(entry) {
      if (entry.globalExtended?.comment !== undefined) comment = entry.globalExtended.comment
    }

    function crossCheck(entry) {
      const raw = nextRaw()
      if (raw === undefined || raw.path !== entry.header.path || raw.size !== entry.header.size) {
        desynced = true
      }
      return raw
    }

    parser.on('entry', (entry) => {
      const raw = crossCheck(entry)
      const chunks = []
      entry.on('data', (chunk) => chunks.push(chunk))
      entry.on('end', () => {
        readComment(entry)
        entries.push({
          path: entry.path,
          headerPath: entry.header.path,
          type: entry.type,
          rawType: raw?.rawTypeflag,
          mode: entry.mode,
          content: Buffer.concat(chunks),
        })
      })
      entry.resume()
    })
    // Finding P-10/C-12: a pax global `comment` must be read whatever kind the entry turns out to
    // be, not only when it happens to be a regular 'entry' -- otherwise an archive whose only
    // entries are of an ignored type reports a missing comment instead of naming the real
    // violation (rule 1).
    parser.on('ignoredEntry', (entry) => {
      const raw = crossCheck(entry)
      readComment(entry)
      entries.push({
        path: entry.path,
        headerPath: entry.header.path,
        type: entry.type,
        rawType: raw?.rawTypeflag,
        mode: entry.mode,
        content: undefined,
      })
    })
    parser.on('error', (err) => reject(new ArchiveParseError(err?.message ?? String(err))))
    parser.on('end', () => {
      if (desynced || rawIndex !== rawEntries.length) {
        reject(new ArchiveParseError('the archive could not be parsed consistently'))
        return
      }
      resolvePromise({ entries, comment })
    })
    parser.end(buf)
  })
}
