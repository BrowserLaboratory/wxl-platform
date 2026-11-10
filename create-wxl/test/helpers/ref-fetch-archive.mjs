// A `fetchArchive` stub keyed by `ref` (a commit string or `refs/tags/v<version>`), for tests that
// need base and target downloads to answer independently (ticket Notes "要建的 fixture/helper").

import { vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import { buildArchive, buildArchiveRaw } from './archive.mjs'
import { PRISTINE_FIXTURE } from './fixtures.mjs'
import * as engineModule from '../../../scripts/fork-init.ts'

const DEFAULT_REPO_NAME = engineModule.UPSTREAM_SLUG.split('/')[1]

/** A fresh, valid pristine archive for `commit` (the shared default fixture, S-30/S-33 style).
 * `entries` (D3, inc 19) lets a caller swap in its own entry list -- e.g. a file placed first so
 * its write is the first one a fault-injection test can target -- while keeping the same
 * `comment`/`repoName`/`commit` plumbing every other caller already relies on. */
export function pristineArchive(commit, { repoName = DEFAULT_REPO_NAME, entries = PRISTINE_FIXTURE } = {}) {
  return buildArchive(entries, { comment: commit, repoName, commit })
}

/** U16 (inc 20): the shape a tag download (`--from <version>`) actually has -- a prefix directory
 * `<repoName>-<version>/` (`archive.mjs`'s own `buildArchive` always writes `<repoName>-<commit>/`,
 * which is wrong for a tag), wrapping `entries`, with an optional pax global header `comment`.
 * Amendment 5 (2026-11-07): the prefix directory entry's own mode is `0o755`, like
 * `buildArchive`'s (`archive.mjs:133`). Built with `buildArchiveRaw` directly, never touching
 * `archive.mjs` itself (ticket Notes: a known simplification this helper works around on its
 * own). */
export function tagArchive(version, { comment, repoName = DEFAULT_REPO_NAME, entries = PRISTINE_FIXTURE } = {}) {
  const prefix = `${repoName}-${version}/`
  const prefixed = [{ path: prefix, type: 'dir', mode: 0o755 }, ...entries.map((e) => ({ ...e, path: prefix + e.path }))]
  return gzipSync(buildArchiveRaw(prefixed, { comment }))
}

/** `byRef[ref]` is `{ status?, body }` for a resolved call, or an `Error` to reject with; a `ref`
 * not in `byRef` rejects (never silently falls back to a happy-path default -- a caller that
 * forgot to key a ref should see its own test fail loudly, not download the wrong archive).
 * `releases` (T-0061 prefactor; traceability.md J6, D11) maps a version to the commit its tag
 * names: a request for `refs/tags/v<version>` then answers with `byRef[commit]`, whose pax
 * `comment` is that commit -- how a base read from `range.json` is downloaded (J6). The archive
 * keeps `byRef[commit]`'s `<repo>-<commit>/` prefix rather than a real tag's `<repo>-<version>/`;
 * rule 2 compares only that every entry shares one first component, so the behaviour is the same
 * (the real tag's shape is checked at stage 8). An explicit `byRef['refs/tags/v<version>']` still
 * wins. */
export function makeRefFetchArchive(byRef, { releases = {} } = {}) {
  return vi.fn(async (_repository, ref) => {
    const tagVersion = /^refs\/tags\/v(.+)$/.exec(ref)?.[1]
    const entry = byRef[ref] ?? (tagVersion !== undefined && releases[tagVersion] !== undefined ? byRef[releases[tagVersion]] : undefined)
    if (entry === undefined) throw new Error(`makeRefFetchArchive: no fixture for ref ${ref}`)
    if (entry instanceof Error) throw entry
    return { status: entry.status ?? 200, body: entry.body }
  })
}
