// Real IO `scripts/check-publish.mjs` and `scripts/prepare-dist.mjs` wire in (0005-S2's `archive`,
// plus `prepareDist`'s own `git rev-parse HEAD`; spec 0009 D2 removed the npm helpers): kept here,
// in `src/`, so this logic is testable like the rest of the seam -- the `scripts/*.mjs` files stay
// thin wiring layers with no logic of their own (stage 6/7 fix assignment section A, S-08/S-09).

import { spawn } from 'node:child_process'
import { buildGitEnv } from './git-env.mjs'

/** Captures stdout/stderr as UTF-8 text. Each stream gets its own `setEncoding('utf8')`
 * (`git-runner.mjs`'s own convention): decoding a chunk on its own as it arrives would mangle a
 * multibyte character split across two `data` events (a path with non-ASCII characters in git's
 * error output, for instance). */
export function spawnCapture(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, shell: false })
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
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
  })
}

/** Captures stdout as bytes (`git archive`'s binary tar output); stderr is still decoded as text
 * for the rejection message. Rejects on a non-zero exit (the one call site, `createArchive`,
 * never needs to inspect a failed archive's own exit code separately). */
export function spawnCaptureBytes(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, shell: false })
    const chunks = []
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`${command} ${args.join(' ')} failed: ${stderr}`))
      else resolvePromise(Buffer.concat(chunks))
    })
  })
}

/** S-24: `archive({ commit, name })` takes the values `checkPublish` already resolved, instead of
 * re-deriving them with a second `git rev-parse HEAD` and a second engine import.
 *
 * `git archive` run with `cwd: root` set to the package subdirectory archives only that
 * subdirectory's own subtree (git's documented behaviour) -- the X7 defect this fixes: when the
 * package folder is itself `export-ignore`d, the archive comes back empty. `git archive` always
 * archives relative to the repository's top level regardless of `cwd`, so resolving it first
 * (through `buildGitEnv`, the same isolation `gitRevParseHead` already requires) and running the
 * archive there gets the whole tree every time, independent of which subdirectory `root` names. */
export function createArchive({ root } = {}) {
  return async function archive({ commit, name }) {
    const topLevel = await spawnCapture('git', ['rev-parse', '--show-toplevel'], { cwd: root, env: buildGitEnv(process.env) })
    if (topLevel.code !== 0) throw new Error(`git rev-parse --show-toplevel failed: ${topLevel.stderr}`)
    const cwd = topLevel.stdout.trim()
    return spawnCaptureBytes('git', ['archive', `--prefix=${name}-${commit}/`, commit], { cwd, env: process.env })
  }
}

/** `prepareDist`'s own `git rev-parse HEAD` (S-10/P-24): through `buildGitEnv` so an outer
 * `GIT_DIR`/`GIT_INDEX_FILE` (a git hook running this process, `git rebase --exec`, ...) cannot
 * leak into it, the same isolation "Git steps" already requires for the range's own git calls. */
export async function gitRevParseHead(cwd, env = process.env) {
  const result = await spawnCapture('git', ['rev-parse', 'HEAD'], { cwd, env: buildGitEnv(env) })
  if (result.code !== 0) throw new Error(`git rev-parse HEAD failed: ${result.stderr}`)
  return result.stdout.trim()
}
