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

function stripFirstComponent(path) {
  const idx = path.indexOf('/')
  return idx === -1 ? '' : path.slice(idx + 1)
}

/** Step 8: writes the parsed entries (without the archive's first path component) into `tmpDir`.
 * Entry-rule validation (rules 1-5: path traversal, `.git`, link/device types, collisions) is not
 * done here — it is T-0021's (S-20); this only trusts a well-formed, already-downloaded archive.
 * Files use flag `wx` (fails on collision); directories without `recursive`. Mode is 0755 when the
 * entry has any execute bit, else 0644, each masked by the process umask through the normal
 * `open`/`mkdir` syscalls (no manual umask arithmetic needed). */
export async function extractEntries(deps, entries, tmpDir) {
  for (const entry of entries) {
    const rel = stripFirstComponent(entry.path)
    if (rel === '') continue // the prefix directory entry itself
    const full = join(tmpDir, rel)
    if (entry.type === 'Directory') {
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
