// Step 9 (traceability.md "Step order" row 9): deletions first, then writes, in sorted path
// order; each write goes to a new file in the destination directory, then renamed over the
// destination, creating any missing parent directory first. M3 (traceability.md "Merge table"
// M5): a brand-new path takes `op.newFileExecutable`'s own bit (under the process's own umask,
// through the ordinary `writeFile` mode option); an existing path keeps ITS OWN current mode --
// write-then-rename always creates a new inode, so that mode is never carried forward for free,
// hence the explicit `lstat`-then-`chmod` here (T-0027 increment 7). T-0027 increment 10 (U27):
// a real file-system error on any delete or write is reported as `{ ok: false, path, detail }`
// instead of propagating as a bug (CW-E14); the half-written temp file, if any, is unlinked first
// (m17). T-0027 increment 11 (U28, amendment 8): `guard` is checked after every successful
// operation (delete or write); a signal already raised there stops the loop before the next
// operation starts and before `range.json` is ever rewritten, reported as `{ ok: false, signal }`.

import { dirname, join } from 'node:path'
import { isFileSystemError } from './run-shared.mjs'

/** A dotfile alongside the destination, inside the same directory (so the final `rename` is
 * same-device): `.create-wxl-upgrade-tmp-<basename>`. */
function tempPathFor(rangeRoot, path) {
  const parts = path.split('/')
  const last = parts.pop()
  const dest = join(rangeRoot, ...parts, last)
  const tmp = join(rangeRoot, ...parts, `.create-wxl-upgrade-tmp-${last}`)
  return { dest, tmp }
}

/** `range.json` after the plan (traceability.md "`range.json` after the plan", T-0027 increment
 * 8): read the current file (or start from `{}`), replace `upstream`'s value with `upstream`
 * (keeping every other top-level key and the order of keys -- `upstream` keeps its own position,
 * or is first when added), two-space indent, one trailing LF. */
function buildRangeJson(current, upstream) {
  if (Object.prototype.hasOwnProperty.call(current, 'upstream')) {
    const next = {}
    for (const key of Object.keys(current)) next[key] = key === 'upstream' ? upstream : current[key]
    return next
  }
  return { upstream, ...current }
}

async function writeRangeJson(deps, rangeRoot, upstream) {
  const path = join(rangeRoot, 'range.json')
  const tmp = join(rangeRoot, '.create-wxl-upgrade-tmp-range.json')
  let current = {}
  try {
    current = JSON.parse(await deps.fs.readFile(path, 'utf8'))
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
  }
  await deps.fs.writeFile(tmp, JSON.stringify(buildRangeJson(current, upstream), null, 2) + '\n')
  await deps.fs.rename(tmp, path)
}

/** `applyMerge({ deps, guard, rangeRoot, ops, upstream })` -> `{ ok: true }` on success, or
 * `{ ok: false, path, detail }` (a file-system error at that path) / `{ ok: false, signal }` (a
 * signal raised mid-apply, U28) otherwise -- the caller (`upgrade.mjs`) turns either into
 * `UP-E09` and exit 1 / 130. `ops` is `planMerge`'s own sorted array; this function re-sorts
 * defensively so a caller's own ordering is never relied on by accident. `upstream` (T-0027
 * increment 8) is `range.json`'s own `upstream` value after the run: `{ repository, version,
 * commit }` of the target, written last (after every deletion/write), the same write-then-rename
 * path -- never reached when a delete/write already failed or a signal already stopped the loop,
 * so an incomplete apply is never recorded as done (U24's deferred sub-case). */
export async function applyMerge({ deps, guard, rangeRoot, ops, upstream }) {
  const deletes = ops.filter((op) => op.action === 'delete').sort((a, b) => (a.path < b.path ? -1 : 1))
  const writes = ops.filter((op) => op.action === 'write').sort((a, b) => (a.path < b.path ? -1 : 1))

  for (const op of deletes) {
    const { dest } = tempPathFor(rangeRoot, op.path)
    try {
      await deps.fs.unlink(dest)
    } catch (err) {
      if (!isFileSystemError(err)) throw err
      return { ok: false, path: op.path, detail: err.message }
    }
    if (guard.isRaised()) return { ok: false, signal: guard.raised() }
  }

  for (const op of writes) {
    const { dest, tmp } = tempPathFor(rangeRoot, op.path)
    try {
      await deps.fs.mkdir(dirname(dest), { recursive: true })

      let existingMode
      if (op.existedBefore) {
        try {
          existingMode = (await deps.fs.lstat(dest)).mode & 0o777
        } catch {
          existingMode = undefined // gone by some other means; nothing to preserve
        }
      }

      const writeOptions = {}
      if (!op.existedBefore && op.newFileExecutable) writeOptions.mode = 0o755
      await deps.fs.writeFile(tmp, op.content, writeOptions)
      if (existingMode !== undefined) await deps.fs.chmod(tmp, existingMode)
      await deps.fs.rename(tmp, dest)
    } catch (err) {
      if (!isFileSystemError(err)) throw err
      // m17: the half-written temp file never survives a failed write.
      try {
        await deps.fs.unlink(tmp)
      } catch {
        // Never created, or already gone -- either way, nothing left to clean up.
      }
      return { ok: false, path: op.path, detail: err.message }
    }
    if (guard.isRaised()) return { ok: false, signal: guard.raised() }
  }

  await writeRangeJson(deps, rangeRoot, upstream)

  return { ok: true }
}
