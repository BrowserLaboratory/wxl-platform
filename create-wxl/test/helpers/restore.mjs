// D14 (T-0063): the restore commands as the tests run and check them. `RESTORE_COMMANDS` is the one
// list R5 and UP-E09 print; these helpers run it as printed and check the printed order.

import { expect } from 'vitest'
import { RESTORE_COMMANDS } from '../../src/upgrade-report.mjs'
import { verifyGit } from './real-git.mjs'

/** Runs every restore command in order in `cwd`, each required to exit 0: a command that fails
 * while a later one repairs the tree would still leave the teacher looking at an error. */
export async function runRestoreCommands({ cwd, env }) {
  for (const [program, ...args] of RESTORE_COMMANDS) {
    expect(program).toBe('git')
    const result = await verifyGit(args, { cwd, env })
    expect(result.code, `${program} ${args.join(' ')} exited ${result.code}: ${result.stderr}`).toBe(0)
  }
}

/** `text` names both restore commands, `git checkout -- .` before `git clean -fd`. */
export function expectRestoreOrder(text) {
  const checkout = text.indexOf('git checkout -- .')
  const clean = text.indexOf('git clean -fd')
  expect(checkout, 'git checkout -- . is printed').toBeGreaterThanOrEqual(0)
  expect(clean, 'git clean -fd is printed after git checkout -- .').toBeGreaterThan(checkout)
}
