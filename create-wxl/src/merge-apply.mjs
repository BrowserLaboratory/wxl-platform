// Step 9 (traceability.md "Step order" row 9): deletions first, then writes, in sorted path
// order; each write goes to a new file in the destination directory, then renamed over the
// destination, creating any missing parent directory first. traceability.md "Merge table" M5: a
// brand-new path takes `op.newFileExecutable`'s own bit (under the process's own umask, through
// the ordinary `writeFile` mode option); an existing path keeps ITS OWN current mode --
// write-then-rename always creates a new inode, so that mode is never carried forward for free,
// hence the explicit `lstat`-then-`chmod` here (T-0027 increment 7). T-0027 increment 10 (U27):
// a real file-system error on any delete or write is reported as `{ ok: false, path, detail }`
// instead of propagating as a bug (CW-E14); the half-written temp file, if any, is unlinked
// first. T-0027 increment 11 (U28): `guard` is checked after every successful operation (delete
// or write) -- traceability.md "Codes" UP-E09: a signal already raised there stops the loop
// before the next operation starts and before `range.json` is ever rewritten, reported as
// `{ ok: false, signal }`.

import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'

/** A dotfile alongside the destination, inside the same directory (so the final `rename` is
 * same-device): `.create-wxl-upgrade-tmp-<16 random hex chars>-<basename>`. A FIXED name here
 * (no random part) could already exist -- an ignored file the teacher has, or
 * a symbolic link -- and the write loop's own `writeFile`, below, uses `flag: 'wx'` (never the
 * default `'w'`) so it refuses to create over whatever that existing name turns out to be,
 * instead of silently truncating it or following a symlink through it. */
function tempPathFor(rangeRoot, path) {
  const parts = path.split('/')
  const last = parts.pop()
  const dest = join(rangeRoot, ...parts, last)
  const tmp = join(rangeRoot, ...parts, `.create-wxl-upgrade-tmp-${randomBytes(8).toString('hex')}-${last}`)
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

/** `range.json`'s own write (the last of step 9) goes through the
 * same write-then-rename, file-system-error-vs-bug and signal handling as every other write in
 * the loop below -- a failure here has already deleted/written every other op, so the range may
 * be partially changed exactly the same way, and needs the same `UP-E09` + restore commands,
 * not `CW-E14`. Returns `{ ok: true }`, or `{ ok: false, path: 'range.json', detail }` / `{ ok:
 * false, signal }`, mirroring the write loop's own return shape. */
async function writeRangeJson(deps, guard, rangeRoot, upstream) {
  const { dest: path, tmp } = tempPathFor(rangeRoot, 'range.json')
  try {
    let current = {}
    try {
      current = JSON.parse(await deps.fs.readFile(path, 'utf8'))
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err
    }
    await deps.fs.writeFile(tmp, JSON.stringify(buildRangeJson(current, upstream), null, 2) + '\n', { flag: 'wx' })
    if (guard.isRaised()) {
      try {
        await deps.fs.unlink(tmp)
      } catch {
        // Never created, or already gone -- either way, nothing left to clean up.
      }
      return { ok: false, signal: guard.raised() }
    }
    await deps.fs.rename(tmp, path)
  } catch (err) {
    try {
      await deps.fs.unlink(tmp)
    } catch {
      // Never created, or already gone -- either way, nothing left to clean up.
    }
    return { ok: false, path: 'range.json', detail: err.message }
  }
  if (guard.isRaised()) return { ok: false, signal: guard.raised() }
  return { ok: true }
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
        } catch (err) {
          // Only ENOENT (gone by some other means -- nothing to preserve) is read as absent;
          // any other error (e.g. EACCES) is a planning failure, not evidence of absence --
          // fail closed, the same convention every other pre-check's own `lstat` already uses.
          // Rethrown here, this reaches the write loop's own catch, below, which reports it as
          // `UP-E09` with the restore commands, the same as any other failed write.
          if (err?.code !== 'ENOENT') throw err
          existingMode = undefined
        }
      }

      const writeOptions = { flag: 'wx' }
      if (!op.existedBefore && op.newFileExecutable) writeOptions.mode = 0o755
      await deps.fs.writeFile(tmp, op.content, writeOptions)
      if (existingMode !== undefined) await deps.fs.chmod(tmp, existingMode)
      await deps.fs.rename(tmp, dest)
    } catch (err) {
      // The half-written temp file never survives a failed write.
      try {
        await deps.fs.unlink(tmp)
      } catch {
        // Never created, or already gone -- either way, nothing left to clean up.
      }
      return { ok: false, path: op.path, detail: err.message }
    }
    if (guard.isRaised()) return { ok: false, signal: guard.raised() }
  }

  return await writeRangeJson(deps, guard, rangeRoot, upstream)
}
