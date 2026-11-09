// D10 (traceability.md "Pre-checks" P-8, "Codes" UP-A14, row U64): a path that is a submodule
// (gitlink, mode `160000` in `git ls-files -s`) or lies under one is left as it is -- the restore
// commands cannot undo a change inside a submodule's own working tree, which is not part of the
// range's own index. The fixture commits a REAL nested git repository as a submodule (not a
// plain directory), so `o` for a path under it is read from the submodule's own checkout, exactly
// as it would be for a teacher's actual range.

import { describe, it, expect } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { makeRangeRepo } from './helpers/range-repo.mjs'
import { makeGitHomeIdentityOnly } from './helpers/git-home.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { en } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '5'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

/** A real, separate git repository with one commit holding `kept.txt` -- the thing `git
 * submodule add` below points the range's own gitlink at. Isolated `HOME`, no `commit.gpgsign`
 * (`makeGitHomeIdentityOnly`, matching every other real-git fixture in this ticket). */
async function makeSubmoduleSource(keptContent) {
  const root = await makeTmpRoot('create-wxl-upgrade-submodule-src-')
  const home = await makeGitHomeIdentityOnly()
  const env = { HOME: home, PATH: process.env.PATH, XDG_CONFIG_HOME: join(home, '.config'), LANG: 'en_US.UTF-8' }
  await writeFile(join(root, 'kept.txt'), keptContent)
  await verifyGit(['init', '-q'], { cwd: root, env })
  await verifyGit(['add', '-A'], { cwd: root, env })
  await verifyGit(['commit', '-q', '-m', 'submodule fixture'], { cwd: root, env })
  return { root, home }
}

describe('submodule paths (D10, U64)', () => {
  it('every path at or inside a submodule is untouched, UP-A14 each; the range stays clean after the run and after the restore commands', async () => {
    const keptContent = 'kept inside the submodule, equal to the base archive\n'
    const sub = await makeSubmoduleSource(keptContent)
    const rangeRepo = await makeRangeRepo({ rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      // A real submodule, added with the range's own isolated env -- `protocol.file.allow=always`
      // lets a local-filesystem path be used as the submodule's URL (the default since git's own
      // CVE-2022-39253 fix disallows a bare local clone otherwise).
      await verifyGit(['-c', 'protocol.file.allow=always', 'submodule', 'add', sub.root, 'sub'], {
        cwd: rangeRepo.root,
        env: rangeRepo.env,
      })
      await rangeRepo.commit('add submodule')

      // B has `sub/kept.txt` equal to the submodule's own file (o ≡ b, t absent -- would be M6,
      // deleting the submodule's own tracked file, without P-8); T lacks it but adds
      // `sub/new.txt` (o absent, b absent -- would be M5, writing INTO the submodule's own
      // working tree, without P-8).
      const baseEntries = [
        ...PRISTINE_FIXTURE,
        { path: 'sub/', type: 'dir', mode: 0o755 },
        { path: 'sub/kept.txt', type: 'file', mode: 0o644, content: keptContent },
      ]
      const targetEntries = [
        ...PRISTINE_FIXTURE,
        { path: 'sub/', type: 'dir', mode: 0o755 },
        { path: 'sub/new.txt', type: 'file', mode: 0o644, content: 'upstream added this inside sub\n' },
      ]

      tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
      })
      const deps = makeDeps({
        cwd: rangeRepo.root,
        tmpRoot,
        env: rangeRepo.env,
        runGit: createSpawnGitRunner(),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect((await readFile(join(rangeRepo.root, 'sub', 'kept.txt'))).toString()).toBe(keptContent)
      await expect(readFile(join(rangeRepo.root, 'sub', 'new.txt'))).rejects.toMatchObject({ code: 'ENOENT' })

      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual([
        `R3: ${en['UP-A14']()} ${jsonValue('sub/kept.txt')}`,
        `R3: ${en['UP-A14']()} ${jsonValue('sub/new.txt')}`,
      ])

      // `range.json` itself is legitimately rewritten by step 9 (traceability.md "range.json
      // after the plan") -- `--ignore-submodules=none` is what this assertion is actually about:
      // no line mentions `sub` at all, so the submodule's own working tree (and its gitlink
      // entry) carries no uncommitted change of any kind.
      const statusAfterRun = await verifyGit(
        ['--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'],
        { cwd: rangeRepo.root, env: rangeRepo.env },
      )
      expect(statusAfterRun.stdout.split('\n').filter((line) => line.includes('sub'))).toEqual([])

      await verifyGit(['clean', '-fd'], { cwd: rangeRepo.root, env: rangeRepo.env })
      await verifyGit(['checkout', '--', '.'], { cwd: rangeRepo.root, env: rangeRepo.env })
      const statusAfterRestore = await verifyGit(
        ['--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'],
        { cwd: rangeRepo.root, env: rangeRepo.env },
      )
      expect(statusAfterRestore.stdout).toBe('')
    } finally {
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      await rm(sub.root, { recursive: true, force: true })
      await rm(sub.home, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
