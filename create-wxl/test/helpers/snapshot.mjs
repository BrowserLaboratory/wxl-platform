import { lstat, readdir, readFile, readlink } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

async function contentHash(full, st) {
  if (!st.isFile()) return undefined
  try {
    const bytes = await readFile(full)
    return createHash('sha256').update(bytes).digest('hex')
  } catch {
    return undefined
  }
}

/** Records path, type, mode, size, mtime/ino and (for a regular file) a content hash for every
 * entry under `root`, by `lstat` (never follows a symbolic link). Used to assert "nothing was
 * written" and to check that a pre-existing empty directory or `.` keeps its own identity across
 * a run. A content hash (P-11/S-31) catches a write that changes bytes without changing size. */
export async function snapshotTree(root) {
  const result = {}
  async function walk(dir, relBase) {
    let names
    try {
      names = await readdir(dir)
    } catch {
      return
    }
    for (const name of [...names].sort()) {
      const full = join(dir, name)
      const rel = relBase ? `${relBase}/${name}` : name
      const st = await lstat(full)
      result[rel] = {
        type: st.isDirectory() ? 'dir' : st.isSymbolicLink() ? 'symlink' : st.isFile() ? 'file' : 'other',
        mode: st.mode & 0o7777,
        size: st.size,
        mtimeMs: st.mtimeMs,
        ino: st.ino,
        contentHash: await contentHash(full, st),
        linkTarget: st.isSymbolicLink() ? await readlink(full).catch(() => undefined) : undefined,
      }
      if (st.isDirectory() && !st.isSymbolicLink()) await walk(full, rel)
    }
  }
  try {
    const st = await lstat(root)
    result['.'] = { type: st.isDirectory() ? 'dir' : 'other', mode: st.mode & 0o7777, ino: st.ino, mtimeMs: st.mtimeMs }
  } catch {
    result['.'] = null
  }
  await walk(root, '')
  return result
}

export const skipModes = process.platform === 'win32' || (typeof process.getuid === 'function' && process.getuid() === 0)
