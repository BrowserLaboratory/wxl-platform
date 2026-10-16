// Test-only archive fixture builder. Writes raw tar headers with `tar`'s `Header` and `Pax`
// classes (not the high-level pack API, which refuses hostile entries that later tickets need to
// fixture), then gzips the result with `node:zlib`. Never spells the upstream repository slug:
// callers pass `repoName`/`commit` themselves (the production and test code import `UPSTREAM_SLUG`).

import { Header, Pax } from 'tar'
import { gzipSync } from 'node:zlib'
import { vi } from 'vitest'
import * as engineModule from '../../../scripts/fork-init.ts'

const TAR_TYPE_BY_KIND = {
  file: 'File',
  dir: 'Directory',
  symlink: 'SymbolicLink',
  link: 'Link',
  fifo: 'FIFO',
  char: 'CharacterDevice',
  block: 'BlockDevice',
  sparse: 'SparseFile',
  // 'unknown' has no `Header`-accepted type name (its setter rejects any code outside
  // `types.name`'s keys); it is built as a plain file, then `pokeTypeflag` overwrites the byte.
  unknown: 'File',
}

export function pad512(buf) {
  const rem = buf.length % 512
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(512 - rem)])
}

export function headerBlock(opts) {
  const header = new Header(opts)
  const buf = Buffer.alloc(512)
  header.encode(buf)
  return buf
}

/** Recomputes a 512-byte header block's checksum field (offset 148) from its current bytes,
 * exactly as `Header.decode` validates it (`sum of all bytes, the checksum field itself counted
 * as 8 ASCII spaces`). Needed after poking a byte `Header.encode` had already checksummed. */
export function recomputeChecksum(buf) {
  let sum = 8 * 0x20
  for (let i = 0; i < 148; i++) sum += buf[i]
  for (let i = 156; i < 512; i++) sum += buf[i]
  buf.write(`${sum.toString(8).padStart(6, '0')}\u0000 `, 148, 8, 'ascii')
  return buf
}

/** Overwrites a header block's typeflag byte (offset 156) and recomputes the checksum so the
 * strict parser still accepts the block up to that point (archive-rules.test.mjs's unknown-type
 * and NUL-typeflag cases: `Header`'s own `type` setter rejects a typeflag outside `types.name`'s
 * keys, and has no way to ask for a literal NUL byte). */
export function pokeTypeflag(buf, typeflagChar) {
  buf[156] = typeflagChar.codePointAt(0)
  return recomputeChecksum(buf)
}

/** Deliberately leaves a header's checksum wrong (C55), without touching anything else. */
export function corruptChecksum(buf) {
  buf.write('999999\u0000 ', 148, 8, 'ascii')
  return buf
}

/** A pax extended header block (not global) naming the next entry's `path` (C21's long pax
 * path). */
export function paxExtendedHeaderBlock(attrs) {
  return new Pax(attrs, false).encode()
}

/** A GNU long-name header (`././@LongLink`) followed by its NUL-terminated path body, padded to
 * 512 bytes (C21). The following header's own `path` is the truncated name GNU tar still writes
 * for backward compatibility; callers pass it as that entry's own (short) `path`. */
export function gnuLongNameBlock(longPath) {
  const body = Buffer.concat([Buffer.from(longPath, 'utf8'), Buffer.alloc(1)])
  const header = headerBlock({
    path: '././@LongLink',
    type: 'NextFileHasLongPath',
    mode: 0o644,
    size: body.length,
  })
  return Buffer.concat([header, pad512(body)])
}

/**
 * Builds raw (uncompressed) tar bytes from an entry list.
 * entries: { path, type: 'file'|'dir'|'symlink'|..., mode, content, mtime, linkpath,
 *   devmajor, devminor, rawTypeflag (poke after encoding; a typeflag `Header`'s own setter
 *   rejects, e.g. the literal NUL byte or an unrecognised code like `Z`), corruptChecksum (C55),
 *   extraBlocksBefore (raw blocks, e.g. a pax extended or GNU long-name header, spliced in right
 *   before this entry's own header block) }.
 */
export function buildArchiveRaw(entries, { comment } = {}) {
  const parts = []
  if (comment !== undefined) {
    parts.push(new Pax({ comment }, true).encode())
  }
  for (const entry of entries) {
    if (entry.extraBlocksBefore) parts.push(...entry.extraBlocksBefore)
    const isDir = entry.type === 'dir'
    const content = isDir
      ? Buffer.alloc(0)
      : Buffer.isBuffer(entry.content)
        ? entry.content
        : Buffer.from(entry.content ?? '', 'utf8')
    const block = headerBlock({
      path: entry.path,
      type: TAR_TYPE_BY_KIND[entry.type] ?? entry.type,
      mode: entry.mode,
      size: content.length,
      mtime: entry.mtime,
      linkpath: entry.linkpath,
      devmaj: entry.devmajor,
      devmin: entry.devminor,
    })
    if (entry.rawTypeflag !== undefined) pokeTypeflag(block, entry.rawTypeflag)
    if (entry.corruptChecksum) corruptChecksum(block)
    parts.push(block)
    if (!isDir) parts.push(pad512(content))
  }
  parts.push(Buffer.alloc(1024)) // two zero blocks mark the end of the archive
  return Buffer.concat(parts)
}

/**
 * Builds a gzip-compressed archive the shape GitHub's codeload serves: a single prefix directory
 * `<repoName>-<commit>/` wrapping every entry, with an optional pax global header `comment`.
 * `repoName` and `commit` are required (S-34): a missing one used to fall through to a silent
 * `"undefined-undefined/"` prefix instead of failing loudly.
 */
export function buildArchive(entries, { comment, repoName, commit } = {}) {
  if (!repoName) throw new Error('buildArchive: repoName is required')
  if (!commit) throw new Error('buildArchive: commit is required')
  const prefix = `${repoName}-${commit}/`
  const prefixed = [{ path: prefix, type: 'dir', mode: 0o755 }, ...entries.map((e) => ({ ...e, path: prefix + e.path }))]
  return gzipSync(buildArchiveRaw(prefixed, { comment }))
}

/** A `fetchArchive` spy that resolves to a fresh, valid pristine archive for `commit` every time
 * it is called (S-30/S-33): the shared default for tests that need the happy path. */
export function makeFetchArchive(entries, { commit, repoName = engineModule.UPSTREAM_SLUG.split('/')[1] } = {}) {
  if (!commit) throw new Error('makeFetchArchive: commit is required')
  return vi.fn(async () => ({
    status: 200,
    body: buildArchive(entries, { comment: commit, repoName, commit }),
  }))
}
