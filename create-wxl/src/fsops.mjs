import { dirname, join } from 'node:path'
import { constants as fsConstants } from 'node:fs'

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
export async function extractEntries(deps, entries, tmpDir) {
  for (const entry of entries) {
    if (entry.rest === '') continue // the prefix directory entry itself
    const rel = entry.rest.endsWith('/') ? entry.rest.slice(0, -1) : entry.rest
    const full = join(tmpDir, rel)
    if (entry.kind === 'dir') {
      await deps.fs.mkdir(full, { mode: 0o755 })
    } else {
      const executable = (entry.mode & 0o111) !== 0
      await deps.fs.writeFile(full, entry.content, { flag: 'wx', mode: executable ? 0o755 : 0o644 })
    }
  }
}

/** Step 10: move the temporary directory into place. */
export async function moveIntoPlace(deps, tmpDir, target) {
  let exists = true
  try {
    await deps.fs.lstat(target)
  } catch {
    exists = false
  }

  if (!exists) {
    await deps.fs.rename(tmpDir, target)
    // `chmod` does not apply the umask (unlike `open`/`mkdir`), so it is masked by hand here.
    await deps.fs.chmod(target, 0o755 & ~process.umask())
    return
  }

  const names = (await deps.fs.readdir(tmpDir)).slice().sort()
  for (const name of names) {
    await deps.fs.rename(join(tmpDir, name), join(target, name))
  }
  await deps.fs.rmdir(tmpDir)
}
