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
}

function pad512(buf) {
  const rem = buf.length % 512
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(512 - rem)])
}

function headerBlock(opts) {
  const header = new Header(opts)
  const buf = Buffer.alloc(512)
  header.encode(buf)
  return buf
}

/**
 * Builds raw (uncompressed) tar bytes from an entry list.
 * entries: { path, type: 'file'|'dir'|'symlink'|..., mode, content, mtime, linkpath }
 */
export function buildArchiveRaw(entries, { comment } = {}) {
  const parts = []
  if (comment !== undefined) {
    parts.push(new Pax({ comment }, true).encode())
  }
  for (const entry of entries) {
    const isDir = entry.type === 'dir'
    const content = isDir
      ? Buffer.alloc(0)
      : Buffer.isBuffer(entry.content)
        ? entry.content
        : Buffer.from(entry.content ?? '', 'utf8')
    parts.push(
      headerBlock({
        path: entry.path,
        type: TAR_TYPE_BY_KIND[entry.type] ?? entry.type,
        mode: entry.mode,
        size: content.length,
        mtime: entry.mtime,
        linkpath: entry.linkpath,
      }),
    )
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
