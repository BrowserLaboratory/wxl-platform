// A committed, clean fixture range (ticket Notes "要建的 fixture/helper", inc 6): a minimal tree
// (README.md, plus range.json when given) committed with an isolated identity, through
// `verifyGit` with a fresh, empty `HOME` -- not `makeGitHomeWithHook()`, whose global
// `commit.gpgsign=true` plus a non-existent `gpg.program` (git-home.mjs:26-29) would make this
// builder's own commit fail.

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { makeTmpRoot } from './tmp.mjs'
import { verifyGit } from './real-git.mjs'

/** `rangeJsonRaw` (a string, inc 13) writes `range.json` byte-for-byte -- for U09/U10's broken
 * shapes (invalid JSON, a BOM, ...) that `JSON.stringify` could never produce. `beforeCommit(root)`
 * (inc 13) runs after the tree is written and before `git add`, for a fixture that needs to
 * replace `range.json` with something `writeFile` cannot express on its own (a symbolic link to
 * another committed file, U09(e)/U10's J1 symlink case). */
export async function makeFixtureRange({ rangeJson, rangeJsonRaw, commit = true, beforeCommit } = {}) {
  const root = await makeTmpRoot('create-wxl-upgrade-fixture-')
  const home = await makeTmpRoot('create-wxl-upgrade-fixture-home-')
  const env = { HOME: home, PATH: process.env.PATH, XDG_CONFIG_HOME: join(home, '.config'), LANG: 'en_US.UTF-8' }

  await writeFile(join(root, 'README.md'), '# fixture\n')
  if (rangeJsonRaw !== undefined) {
    await writeFile(join(root, 'range.json'), rangeJsonRaw)
  } else if (rangeJson !== undefined) {
    await writeFile(join(root, 'range.json'), JSON.stringify(rangeJson, null, 2) + '\n')
  }
  if (beforeCommit) await beforeCommit(root)

  await verifyGit(['init', '-q'], { cwd: root, env })
  await verifyGit(['add', '-A'], { cwd: root, env })
  // U05's "no commit yet" case (inc 9): only `git init` (and staging, which does not create a
  // HEAD on its own) -- `commit: false` stops here so `git rev-parse --verify HEAD` fails.
  if (commit) {
    await verifyGit(
      [
        '-c',
        'user.name=WXL Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        '-c',
        'commit.gpgsign=false',
        'commit',
        '-q',
        '-m',
        'fixture',
      ],
      { cwd: root, env },
    )
  }

  return { root, env }
}
