import * as fsp from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'

const WRITE_METHODS = new Set([
  'mkdtemp',
  'mkdir',
  'writeFile',
  'rename',
  'rm',
  'rmdir',
  'unlink',
  'chmod',
  'lchmod',
  'chown',
  'lchown',
  'symlink',
  'link',
  'copyFile',
  'cp',
  'utimes',
  'lutimes',
  'appendFile',
  'truncate',
])

/** `open`'s write-ness (P-12/S-32) depends on its flags, not just on being called: `'r'`
 * (the default) and `'rs'`/`'sr'` are reads; anything with `w`, `a`, `x` or `+`, or the matching
 * numeric `O_*` bits, is a write. */
function isWriteOpenFlag(flag) {
  if (flag === undefined) return false
  if (typeof flag === 'number') {
    return Boolean(
      flag & (fsConstants.O_WRONLY | fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_APPEND | fsConstants.O_TRUNC),
    )
  }
  return /[wax+]/.test(String(flag))
}

/**
 * Wraps every `node:fs/promises` function create-wxl uses: write-type calls are recorded, and any
 * function can be replaced one at a time (`overrides.writeFile = async () => { throw ... }`) to
 * inject a failure.
 */
export function recordingFs(overrides = {}) {
  const calls = []
  const fs = {}
  for (const [name, fn] of Object.entries(fsp)) {
    if (typeof fn !== 'function') continue
    fs[name] = async (...args) => {
      const isWrite = name === 'open' ? isWriteOpenFlag(args[1]) : WRITE_METHODS.has(name)
      if (isWrite) calls.push({ method: name, args })
      if (overrides[name]) return overrides[name](...args)
      return fn(...args)
    }
  }
  return { fs, calls }
}
