// The test's own git calls, used to verify what a run produced (T-0023 ticket Notes, fixture ⑧):
// isolated to `{ HOME, PATH, XDG_CONFIG_HOME, GIT_CONFIG_NOSYSTEM: '1' }`, never inheriting
// `process.env` (so the real `$HOME`/system config can never leak into a verification call either).

import { spawn } from 'node:child_process'

/** Runs `git <args>` in `cwd` with an isolated env derived from `env` (HOME/PATH/XDG_CONFIG_HOME),
 * plus `GIT_CONFIG_NOSYSTEM=1`. Resolves to `{ code, stdout, stderr }`; never rejects on a non-zero
 * exit (callers assert on `code` themselves). */
export function verifyGit(args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const isolatedEnv = { HOME: env.HOME, PATH: env.PATH, XDG_CONFIG_HOME: env.XDG_CONFIG_HOME, GIT_CONFIG_NOSYSTEM: '1' }
    const child = spawn('git', args, { cwd, env: isolatedEnv, shell: false })
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
