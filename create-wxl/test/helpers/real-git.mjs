// The test's own git calls, used to verify what a run produced (T-0023 ticket Notes, fixture ⑧):
// isolated to `{ HOME, PATH, XDG_CONFIG_HOME, GIT_CONFIG_NOSYSTEM: '1' }`, never inheriting
// `process.env` (so the real `$HOME`/system config can never leak into a verification call either).

import { spawn } from 'node:child_process'

/** Runs `git <args>` in `cwd` with an isolated env derived from `env` (HOME/PATH/XDG_CONFIG_HOME),
 * plus `GIT_CONFIG_NOSYSTEM=1`. Resolves to `{ code, stdout, stderr }`; never rejects on a non-zero
 * exit (callers assert on `code` themselves). */
export function verifyGit(args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const isolatedEnv = {
      HOME: env.HOME,
      PATH: env.PATH,
      XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
      GIT_CONFIG_NOSYSTEM: '1',
      // PR #76's macos-latest run: a fixture's `git commit` started git's detached auto-maintenance,
      // whose `.git/objects/maintenance.lock` appeared and vanished while a test snapshotted the tree
      // (ENOENT on lstat). No fixture commit may start background work (git 2.31+ reads these).
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'maintenance.auto',
      GIT_CONFIG_VALUE_0: 'false',
      GIT_CONFIG_KEY_1: 'gc.auto',
      GIT_CONFIG_VALUE_1: '0',
    }
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
