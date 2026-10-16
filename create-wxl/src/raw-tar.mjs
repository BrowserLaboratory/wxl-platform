// A minimal, read-only raw tar header walker, used by `archive.mjs` to recover the ONE byte
// `tar`'s own `Header.decode` does not expose faithfully: the typeflag at offset 156.
// `Header.decode` reclassifies a type `0` entry whose path ends in `/` as type `5` (Directory)
// (node-tar header.js, "old tar versions marked dirs as a file with a trailing /"), and forces a
// directory's decoded size to 0 regardless of what is encoded, which makes such an entry
// indistinguishable from a real directory through node-tar's own `entry.type`/`entry.header.size`
// alone. T-0021's archive entry rules 1 and 3 need the untouched byte to tell the two apart.
//
// Review finding P-01/C-02: two independent parsers walking the SAME bytes must apply the SAME
// size rules, or they desync (an attacker-chosen typeflag can be paired with the wrong entry,
// hiding e.g. a symlink from rule 1). This walker therefore replicates `tar`'s own size rules --
// a pax extended header's `size`/`path` override the next entry's, and a directory's effective
// size is forced to 0 -- so it advances through the SAME bytes `tar` does. `archive.mjs` still
// cross-checks each pairing's path and size against `tar`'s own decoded header as a second line
// of defence: any divergence this walker's replica missed is caught there, not silently accepted.
//
// This walker does not decode uid/gid/mtime or GNU long-LINKPATH bodies: only the fields the
// cross-check in archive.mjs needs (typeflag, path, size), in archive order. It supports both a
// gzip-compressed body (auto-detected by magic bytes) and a plain, already-decompressed tar
// (T-0025's X7 reuses it against `git archive`'s plain tar output, through this export only --
// the `--no-setup` run path itself requires gzip, see archive.mjs).

import { gunzipSync } from 'node:zlib'

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

// Matches node-tar's own `maxDecompressionRatio` default (parse.js): bounds the decompressed size
// so a crafted small gzip body cannot force an unbounded allocation before any rule runs (P-12/C-06).
const DECOMPRESSION_RATIO_LIMIT = 1000

// Typeflags `tar`'s `ReadEntry` treats as metadata (pax extended/global, GNU long-name/long-link,
// and GNU's older long-path code): these never reach an 'entry' or 'ignoredEntry' event.
export const META_TYPEFLAGS = new Set(['K', 'L', 'N', 'g', 'x', 'X'])

function toBuffer(bytes) {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
}

function maybeDecompress(bytes) {
  const buf = toBuffer(bytes)
  if (buf.length >= 2 && buf[0] === GZIP_MAGIC_0 && buf[1] === GZIP_MAGIC_1) {
    try {
      return gunzipSync(buf, { maxOutputLength: Math.max(buf.length * DECOMPRESSION_RATIO_LIMIT, 1 << 20) })
    } catch (err) {
      throw new Error(`gzip decompression failed or exceeded the size limit: ${err?.message ?? String(err)}`)
    }
  }
  return buf
}

function isNullBlock(buf, offset) {
  for (let i = offset; i < offset + 512; i++) {
    if (buf[i] !== 0) return false
  }
  return true
}

function decString(buf, off, len) {
  return buf.subarray(off, off + len).toString('utf8').replace(/\0.*/, '')
}

/** Decodes a tar numeric field: the common space/NUL-terminated octal text, or (for a field whose
 * first byte has the high bit set) the GNU base-256 binary extension used for values too large
 * for octal text. */
function decodeNumericField(buf, offset, length) {
  if ((buf[offset] & 0x80) !== 0) {
    let value = BigInt(buf[offset] & 0x7f)
    for (let i = 1; i < length; i++) value = (value << 8n) | BigInt(buf[offset + i])
    return Number(value)
  }
  let str = ''
  for (let i = 0; i < length; i++) {
    const c = buf[offset + i]
    if (c === 0 || c === 0x20) break
    str += String.fromCharCode(c)
  }
  str = str.trim()
  return str === '' ? 0 : parseInt(str, 8)
}

/** The ustar name, joined with its `prefix` field when the ustar magic is present (header.js's
 * own decode: a byte at offset 475 selects a 155- or 130-byte prefix field). Does not apply any
 * pax/GNU override -- callers do that with the returned name as the fallback. */
function decodeUstarPath(buf, off) {
  const name = decString(buf, off, 100)
  const isUstar = buf.subarray(off + 257, off + 265).toString('latin1') === 'ustar\u000000'
  if (!isUstar) return name
  const longPrefix = buf[off + 475] !== 0
  const prefix = decString(buf, off + 345, longPrefix ? 155 : 130)
  return prefix ? `${prefix}/${name}` : name
}

/** Parses a pax extended header's body (the length-prefixed `"%d %s=%s\n"` records), returning
 * only the two fields the cross-check needs. */
function parsePaxOverrides(bodyBuf) {
  const body = bodyBuf.toString('utf8')
  const overrides = {}
  let rest = body
  while (rest.length > 0) {
    const m = /^(\d+) /.exec(rest)
    if (!m) break
    const recLen = parseInt(m[1], 10)
    if (!(recLen > 0) || recLen > rest.length) break
    const record = rest.slice(0, recLen)
    rest = rest.slice(recLen)
    const inner = record.slice(m[1].length + 1)
    const eq = inner.indexOf('=')
    if (eq === -1) continue
    const key = inner.slice(0, eq)
    let value = inner.slice(eq + 1)
    if (value.endsWith('\n')) value = value.slice(0, -1)
    if (key === 'path') overrides.path = value
    if (key === 'size') {
      const n = Number(value)
      // node-tar's own `#slurp` drops a negative `size` override (header.js); mirrored here so a
      // negative pax size cannot make the two walkers disagree on how much to skip.
      if (Number.isFinite(n) && n >= 0) overrides.size = n
    }
  }
  return overrides
}

/**
 * Walks `bytes` (gzip or plain tar) header block by header block, returning one record per block
 * in archive order: `{ rawTypeflag, isMeta }` for a metadata header, or
 * `{ rawTypeflag, isMeta: false, path, size }` for a real one, where `path`/`size` already have a
 * preceding pax extended header's or GNU long-name's override applied (reset after each real
 * entry, exactly as `tar`'s own `EX` is), and `size` is forced to 0 when the (overridden) path
 * ends in `/` or the (NUL-normalised) typeflag is `5` -- matching `Header.decode`'s own forcing
 * rule, so a lying `size` next to a directory typeflag cannot hide another header in "its" data.
 */
export function walkRawEntries(bytes) {
  const buf = maybeDecompress(bytes)
  const result = []
  let offset = 0
  let consecutiveNulls = 0
  let pendingPath
  let pendingSize

  while (offset + 512 <= buf.length) {
    if (isNullBlock(buf, offset)) {
      consecutiveNulls += 1
      offset += 512
      if (consecutiveNulls >= 2) break
      continue
    }
    consecutiveNulls = 0
    const rawTypeflag = String.fromCharCode(buf[offset + 156])
    const ustarSize = decodeNumericField(buf, offset + 124, 12)
    const bodyStart = offset + 512

    if (META_TYPEFLAGS.has(rawTypeflag)) {
      const dataBlocks = Math.ceil(ustarSize / 512)
      if (rawTypeflag === 'L') {
        const bodyBuf = buf.subarray(bodyStart, Math.min(bodyStart + ustarSize, buf.length))
        pendingPath = bodyBuf.toString('utf8').replace(/\0.*/, '')
      } else if (rawTypeflag === 'x') {
        const bodyBuf = buf.subarray(bodyStart, Math.min(bodyStart + ustarSize, buf.length))
        const overrides = parsePaxOverrides(bodyBuf)
        if (overrides.path !== undefined) pendingPath = overrides.path
        if (overrides.size !== undefined) pendingSize = overrides.size
      }
      // 'K' (GNU long linkpath), 'N' (old GNU long path) and 'g'/'X' (pax/old-pax global) are
      // consumed for offset purposes only: linkpath and global headers are never applied to the
      // next entry's path/size by `tar` itself (header.js's `#slurp` excludes `path`/`linkpath`
      // from a global header; `K`/comment handling is unrelated to this cross-check).
      result.push({ rawTypeflag, isMeta: true })
      offset = bodyStart + dataBlocks * 512
      continue
    }

    const name = decodeUstarPath(buf, offset)
    const path = pendingPath !== undefined ? pendingPath : name
    const sizeBeforeDirRule = pendingSize !== undefined ? pendingSize : ustarSize
    const normalizedType = rawTypeflag === '\u0000' ? '0' : rawTypeflag
    const finalType = normalizedType === '0' && path.endsWith('/') ? '5' : normalizedType
    const size = finalType === '5' ? 0 : sizeBeforeDirRule

    result.push({ rawTypeflag, isMeta: false, path, size })
    pendingPath = undefined
    pendingSize = undefined

    const dataBlocks = Math.ceil(size / 512)
    offset = bodyStart + dataBlocks * 512
  }
  return result
}
