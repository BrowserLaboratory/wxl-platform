import { dirname, join } from 'node:path'
import { constants as fsConstants } from 'node:fs'
import { tagReportPath } from './text.mjs'

/** Step 4's rule, returning `null` when the target is acceptable, or `{ id, detail? }` naming the
 * CW-E04 condition. The parent is checked with `stat` (a symlink parent, e.g. macOS's `/tmp`, is
 * followed); the target itself is always checked with `lstat` (any symlink is rejected without
 * being followed). Only `ENOENT` from the target's `lstat` means "does not exist": any other
 * error is reported with its own message instead of silently treated as absent. */
export async function checkTarget(deps, target) {
  const parent = dirname(target)
  let parentStat
  try {
    parentStat = await deps.fs.stat(parent)
  } catch {
    return { id: 'parent-missing' }
  }
  if (!parentStat.isDirectory()) return { id: 'parent-not-directory' }

  try {
    await deps.fs.access(parent, fsConstants.W_OK)
  } catch {
    return { id: 'parent-not-writable' }
  }

  let targetStat
  try {
    targetStat = await deps.fs.lstat(target)
  } catch (err) {
    if (err && err.code === 'ENOENT') return null // does not exist: ok
    return { id: 'lstat-error', detail: err?.message ?? String(err) }
  }

  if (targetStat.isSymbolicLink()) return { id: 'symlink' }
  if (!targetStat.isDirectory()) return { id: 'file' }

  const names = await deps.fs.readdir(target)
  if (names.length > 0) return { id: 'non-empty' }

  const targetDeviceStat = await deps.fs.stat(target)
  if (targetDeviceStat.dev !== parentStat.dev) return { id: 'cross-device' }

  return null
}

/** Step 8: writes the entries `archive-rules.mjs`'s `checkEntryRules` already validated into
 * `tmpDir`. Writes from the SAME validated data it checked rules 1-5 against -- `entry.rest`
 * (the header path with the first component already stripped off) and `entry.kind`
 * (`'file'`/`'dir'`, from the raw typeflag) -- rather than re-deriving a path or type from `tar`'s
 * own `entry.path`/`entry.type` (review finding C-01: the two used to disagree about which
 * component to drop, and about how a `tar`-reclassified type maps to file-system writes). Files
 * use flag `wx` (fails on collision); directories without `recursive`. Mode is 0755 when the
 * entry has any execute bit, else 0644, each masked by the process umask through the normal
 * `open`/`mkdir` syscalls (no manual umask arithmetic needed). */
/** Returns `{ stopped: true }` when `shouldStop` ended the loop early (S-19: a typed result the
 * caller cannot accidentally ignore, rather than a silent early `return` it would have to
 * remember to notice through a separate check right after the call), `{ stopped: false }` once
 * every entry is written. */
export async function extractEntries(deps, entries, tmpDir, { shouldStop } = {}) {
  for (const entry of entries) {
    // traceability.md "Signals": "after a signal no new file-system operation starts" -- checked
    // BEFORE each entry's write (unlike `moveIntoPlace`'s per-rename check, there is no rollback
    // to do mid-step-8, so stopping here just means not starting the next one).
    if (shouldStop && shouldStop()) return { stopped: true }
    if (entry.rest === '') continue // the prefix directory entry itself
    const rel = entry.rest.endsWith('/') ? entry.rest.slice(0, -1) : entry.rest
    const full = join(tmpDir, rel)
    try {
      if (entry.kind === 'dir') {
        await deps.fs.mkdir(full, { mode: 0o755 })
      } else {
        const executable = (entry.mode & 0o111) !== 0
        await deps.fs.writeFile(full, entry.content, { flag: 'wx', mode: executable ? 0o755 : 0o644 })
      }
    } catch (err) {
      // CW-E09 (run.mjs) names the path; a real `fs` error already carries its own `.path`, but
      // tagging it here (rather than relying on that) also covers an injected test error.
      throw tagReportPath(err, full)
    }
  }
  return { stopped: false }
}

/** Step 10's own failure (traceability.md "Writes and cleanup"): a rename failed, or a `shouldStop`
 * callback (checked after each successful rename, shared by a real failure and a signal) asked to
 * stop. `stranded`: entries rollback itself could not move back (CW-E11 names them and keeps the
 * temporary directory); `signaled: true` means nothing actually failed -- the caller asked to stop. */
export class MoveIntoPlaceError extends Error {
  constructor(message, { failedEntry, stranded, tmpDir, signaled = false, cause } = {}) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = 'MoveIntoPlaceError'
    this.failedEntry = failedEntry
    this.stranded = stranded ?? []
    this.tmpDir = tmpDir
    this.signaled = signaled
  }
}

/** Step 10: move the temporary directory into place. `shouldStop`, when given, is checked after
 * each successful rename (not before): a signal arriving mid-rename still lets that one rename
 * finish before anything stops (traceability.md "Signals": "the cleanup waits for the operation in
 * flight"). On any failure or stop, every entry already moved into the target is renamed back,
 * trying every one even when an earlier one could not be moved back (Notes: "rollback tries every
 * entry"); only once every entry is back is the temporary directory removed. */
export async function moveIntoPlace(deps, tmpDir, target, { shouldStop } = {}) {
  let exists = true
  try {
    await deps.fs.lstat(target)
  } catch {
    exists = false
  }

  if (!exists) {
    // C-04/P-14: a failing whole-directory rename is CW-E11 (nothing moved, nothing to roll
    // back), not an uncaught "bug" (CW-E14).
    try {
      await deps.fs.rename(tmpDir, target)
    } catch (err) {
      // Nothing moved: the temporary directory is exactly as it was, so it is removed the same
      // way a successful rollback's empty `stranded` always is.
      await deps.fs.rm(tmpDir, { recursive: true, force: true })
      throw new MoveIntoPlaceError(err.message, { stranded: [], tmpDir, cause: err })
    }
    // P-02/C-01: checked after the rename, the same "wait for the operation in flight" rule the
    // per-entry branch below follows. A signal here still gets a clean "target as it was": rename
    // the whole range straight back, matching MoveIntoPlaceError's `signaled` path the per-entry
    // branch already uses (the caller's outer cleanup then removes the temporary directory).
    if (shouldStop && shouldStop()) {
      await deps.fs.rename(target, tmpDir)
      throw new MoveIntoPlaceError('aborted by signal', { stranded: [], tmpDir, signaled: true })
    }
    try {
      // `chmod` does not apply the umask (unlike `open`/`mkdir`), so it is masked by hand here.
      await deps.fs.chmod(target, 0o755 & ~process.umask())
    } catch (err) {
      // C-04/P-14: the range is already physically at `target`; move it back into the temporary
      // directory where possible, so "target as it was" still holds, and report CW-E11.
      let movedBack = true
      try {
        await deps.fs.rename(target, tmpDir)
      } catch {
        movedBack = false
      }
      if (movedBack) await deps.fs.rm(tmpDir, { recursive: true, force: true })
      throw new MoveIntoPlaceError(err.message, { stranded: movedBack ? [] : ['the range'], tmpDir, cause: err })
    }
    return
  }

  const names = (await deps.fs.readdir(tmpDir)).slice().sort()
  const moved = []
  let failedEntry
  let failedError
  let signaled = false
  for (const name of names) {
    try {
      await deps.fs.rename(join(tmpDir, name), join(target, name))
    } catch (err) {
      failedEntry = name
      failedError = err
      break
    }
    moved.push(name)
    if (shouldStop && shouldStop()) {
      signaled = true
      break
    }
  }

  if (failedError === undefined && !signaled) {
    try {
      await deps.fs.rmdir(tmpDir)
    } catch (err) {
      // C-04/P-14: every entry already succeeded into `target`; move them all back where
      // possible, so "target as it was" still holds, and report CW-E11 instead of an uncaught bug.
      const strandedByRmdir = []
      for (const name of names) {
        try {
          await deps.fs.rename(join(target, name), join(tmpDir, name))
        } catch {
          strandedByRmdir.push(name)
        }
      }
      throw new MoveIntoPlaceError(err.message, { stranded: strandedByRmdir, tmpDir, cause: err })
    }
    return
  }

  const stranded = []
  for (const name of moved) {
    try {
      await deps.fs.rename(join(target, name), join(tmpDir, name))
    } catch {
      stranded.push(name)
    }
  }
  if (stranded.length === 0) {
    await deps.fs.rm(tmpDir, { recursive: true, force: true })
  }

  if (signaled) {
    throw new MoveIntoPlaceError('aborted by signal', { stranded, tmpDir, signaled: true })
  }
  throw new MoveIntoPlaceError(failedError.message, { failedEntry, stranded, tmpDir, cause: failedError })
}
