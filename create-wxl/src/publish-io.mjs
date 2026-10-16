// Real IO `scripts/check-publish.mjs` and `scripts/prepare-dist.mjs` wire in (0005-S2's `npmView`,
// `npmWhoami` and `archive`, plus `prepareDist`'s own `git rev-parse HEAD`): kept here, in `src/`,
// so this logic is testable like the rest of the seam -- the `scripts/*.mjs` files stay thin
// wiring layers with no logic of their own (stage 6/7 fix assignment section A, S-05/P-08/C-02,
// P-23, S-08/S-09).

import { spawn } from 'node:child_process'
import { buildGitEnv } from './git-env.mjs'

/** Captures stdout/stderr as UTF-8 text. Each stream gets its own `setEncoding('utf8')`
 * (`git-runner.mjs`'s own convention): decoding a chunk on its own as it arrives would mangle a
 * multibyte character split across two `data` events (an `npm whoami`/`npm view` maintainer name
 * with non-ASCII characters, for instance). */
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

/** npm's binary name per platform (P-23): on win32, npm installs as `npm.cmd` (a shim); spawning
 * the bare name `npm` without a shell fails there (`ENOENT`, or `EINVAL` since Node's
 * CVE-2024-27980 fix). Elsewhere the bare name resolves through `PATH` normally. */
export function npmCommand(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm'
}

/**
 * Parses `npm view <name> maintainers --json`'s result into a maintainer list (S-05/P-08/C-02):
 * an E404 (the name is unpublished) becomes `[]`; a single maintainer is npm's own output quirk
 * (a bare string, not a one-item array) and is normalised to one; any OTHER non-zero exit --
 * a network error, a registry 5xx, an auth failure -- throws instead of silently becoming `[]`.
 * The previous version mapped every non-zero exit to "unpublished", which let a real failure make
 * X9 fail open (reported by stage 6/7 review as S-05/P-08/C-02).
 */
export function parseNpmViewMaintainers(result) {
  if (result.code !== 0) {
    const text = `${result.stdout}\n${result.stderr}`
    if (/\bE404\b/.test(text)) return []
    throw new Error(`npm view failed (not E404): ${result.stderr || result.stdout}`)
  }
  const trimmed = result.stdout.trim()
  if (trimmed === '') return []
  const parsed = JSON.parse(trimmed)
  return Array.isArray(parsed) ? parsed : [parsed]
}

export function createNpmView({ root, platform = process.platform } = {}) {
  return async function npmView() {
    const result = await spawnCapture(npmCommand(platform), ['view', 'create-wxl', 'maintainers', '--json'], {
      cwd: root,
      env: process.env,
    })
    return parseNpmViewMaintainers(result)
  }
}

export function createNpmWhoami({ root, platform = process.platform } = {}) {
  return async function npmWhoami() {
    const result = await spawnCapture(npmCommand(platform), ['whoami'], { cwd: root, env: process.env })
    if (result.code !== 0) throw new Error(`npm whoami failed: ${result.stderr || result.stdout}`)
    return result.stdout.trim()
  }
}

/** S-24: `archive({ commit, name })` takes the values `checkPublish` already resolved, instead of
 * re-deriving them with a second `git rev-parse HEAD` and a second engine import. */
export function createArchive({ root } = {}) {
  return async function archive({ commit, name }) {
    return spawnCaptureBytes('git', ['archive', `--prefix=${name}-${commit}/`, commit], { cwd: root, env: process.env })
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
