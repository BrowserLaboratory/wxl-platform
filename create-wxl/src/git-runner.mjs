// The real `runGit` implementation ("Git steps", traceability.md): spawns `git` without a shell,
// using only the env the caller gives (never merged with `process.env` -- running under a git hook
// during this repository's own tests would otherwise leak `GIT_DIR`/`GIT_INDEX_FILE` into the
// isolated run). `git` is resolved from the absolute directories of `PATH` only: a relative entry
// is ignored, and so is an entry whose realpath equals the current call's own `cwd` (the target)
// or lies under it (decision 2, "never from the target directory"); a `PATH` entry that does not
// exist is simply skipped. `bin`'s own wiring is T-0025's.

import { spawn } from 'node:child_process'
import { accessSync, constants as fsConstants, realpathSync, statSync } from 'node:fs'
import { delimiter, isAbsolute, join, relative, resolve as resolvePath, sep } from 'node:path'

function candidateNames(platform) {
  return platform === 'win32' ? ['git.exe'] : ['git']
}

/** Windows' environment variable names are case-insensitive (`Path`, not just `PATH`); find the
 * first key that matches `PATH` case-insensitively on win32, and only `PATH` exactly elsewhere. */
function findPathValue(env, platform) {
  if (platform !== 'win32') return env.PATH ?? ''
  for (const [key, value] of Object.entries(env)) {
    if (key.toUpperCase() === 'PATH') return value ?? ''
  }
  return ''
}

/** True when `dir` (already realpath'd) is `base` itself or lies under it -- a plain prefix check
 * on the two realpaths, which also makes this case-insensitive-filesystem-safe (macOS APFS,
 * Windows): `realpathSync.native` returns the on-disk casing regardless of the casing given. */
function isSameOrUnder(dir, base) {
  if (dir === base) return true
  const rel = relative(base, dir)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

function resolveGitPath(env, cwd, platform) {
  const pathValue = findPathValue(env, platform)
  const dirs = pathValue.split(delimiter).filter((entry) => entry !== '')
  let excludedDir
  try {
    excludedDir = realpathSync.native(cwd)
  } catch {
    excludedDir = resolvePath(cwd)
  }
  for (const dir of dirs) {
    if (!isAbsolute(dir)) continue
    let resolvedDir
    try {
      resolvedDir = realpathSync.native(dir)
    } catch {
      continue
    }
    if (isSameOrUnder(resolvedDir, excludedDir)) continue
    for (const name of candidateNames(platform)) {
      const candidate = join(resolvedDir, name)
      try {
        if (!statSync(candidate).isFile()) continue
        accessSync(candidate, fsConstants.X_OK)
        return candidate
      } catch {
        continue
      }
    }
  }
  return null
}

/** Returns a `runGit(args, { cwd, env })` function matching `deps.runGit`'s contract: resolves to
 * `{ code, stdout, stderr }`, or rejects (ENOENT when `git` cannot be resolved from `PATH`, or
 * whatever `child_process.spawn`'s own `error` event reports). `platform` (default
 * `process.platform`) is injectable so tests can exercise the win32 lookup on any host. */
export function createSpawnGitRunner({ platform = process.platform } = {}) {
  return function runGit(args, { cwd, env }) {
    return new Promise((resolvePromise, reject) => {
      const gitPath = resolveGitPath(env, cwd, platform)
      if (!gitPath) {
        const err = new Error('spawn git ENOENT')
        err.code = 'ENOENT'
        reject(err)
        return
      }
      let child
      try {
        child = spawn(gitPath, args, { cwd, env, shell: false })
      } catch (err) {
        reject(err)
        return
      }
      // A multibyte UTF-8 character can land split across two `data` events; decoding each
      // chunk on its own (`stdout += chunk`) would mangle it, so each stream gets its own
      // stateful decoder instead (`setEncoding` buffers an incomplete trailing sequence until
      // the rest arrives).
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      child.on('error', (err) => reject(err))
      child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
    })
  }
}
