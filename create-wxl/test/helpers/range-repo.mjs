// A committed, clean range-repo fixture (T-0027 ticket Notes, increment plan "Helpers"): an
// arbitrary file tree, committed with the identity-only `HOME` (`makeGitHomeIdentityOnly`), not
// `makeGitHomeWithHook()` (whose `commit.gpgsign=true` would fail this builder's own commit).
// Distinct from `fixture-range.mjs` (T-0026's own, single-commit, README.md-only builder used by
// the pre-check rows): this one takes an arbitrary tree and exposes `commit()` for a second
// commit (U61).

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { makeTmpRoot } from './tmp.mjs'
import { verifyGit } from './real-git.mjs'
import { makeGitHomeIdentityOnly } from './git-home.mjs'

/** Writes `tree` (a flat map of range-relative path -> content, string or `Buffer`) under `root`,
 * creating every missing parent directory. */
async function writeTree(root, tree) {
  for (const [relPath, content] of Object.entries(tree)) {
    const full = join(root, relPath)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, content)
  }
}

/** `git init`s a tmp dir, writes `tree` plus an optional `.gitignore` and `range.json`, and
 * commits everything with the identity-only `HOME` (`deps.env = { HOME, PATH, XDG_CONFIG_HOME,
 * LANG }`, matching T-0026's own isolation convention -- `create-wxl/src/git-runner.mjs:19-20,75`
 * only reads `env.PATH`). Returns `{ root, env, commit(message) }`: `commit()` stages and commits
 * everything currently on disk under `root` again (U61's "upgrade, commit, upgrade again"). */
export async function makeRangeRepo({ tree = {}, rangeJson, gitignore, mergeConflictStyle } = {}) {
  const root = await makeTmpRoot('create-wxl-range-repo-')
  const home = await makeGitHomeIdentityOnly({ mergeConflictStyle })
  const env = { HOME: home, PATH: process.env.PATH, XDG_CONFIG_HOME: join(home, '.config'), LANG: 'en_US.UTF-8' }

  await writeTree(root, tree)
  if (gitignore !== undefined) await writeFile(join(root, '.gitignore'), gitignore)
  if (rangeJson !== undefined) await writeFile(join(root, 'range.json'), JSON.stringify(rangeJson, null, 2) + '\n')

  await verifyGit(['init', '-q'], { cwd: root, env })

  async function commit(message = 'fixture') {
    await verifyGit(['add', '-A'], { cwd: root, env })
    await verifyGit(['commit', '-q', '-m', message], { cwd: root, env })
  }
  await commit()

  return { root, env, commit }
}
