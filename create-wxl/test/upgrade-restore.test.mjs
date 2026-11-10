// 0006-S1 step 10's own restore path (traceability.md "Codes" R5, "Pre-checks" P-5).
// U29 (T-0027 increment 12): after a completed run, `git checkout -- .` then `git clean -fd`
// (D14, T-0063) gives back exactly `HEAD`'s own tree, including an untracked, ignored file never
// touched by the plan; it reuses U17's own fixture and run. U61: a rerun after a commit.
// U70 (T-0063): the same commands on trees built from a commit by hand, without an upgrade.

import { describe, it, expect, vi } from 'vitest'
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { makeRangeRepo } from './helpers/range-repo.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import * as engineModule from '../../scripts/fork-init.ts'
import { runRestoreCommands } from './helpers/restore.mjs'

const BASE_COMMIT = '9'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

const ALL_BRANCHES = [
  'P2-both-absent',
  'P2-both-equal',
  'M4-both-absent',
  'M4-both-equal',
  'M5-updated',
  'M5-added',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
  'M11',
  'M12-clean',
  'M12-conflict',
  'teacher-owned',
]

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture) {
  const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
  const fetchArchive = makeRefFetchArchive({
    [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: fixture.baseEntries }) },
    [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
  }, { releases: { [BASE_VERSION]: BASE_COMMIT } })
  const deps = makeDeps({
    cwd: fixture.root,
    tmpRoot,
    env: fixture.env,
    runGit: vi.fn(createSpawnGitRunner()),
    packageVersion: TARGET_VERSION,
    source: { version: TARGET_VERSION },
    fetchArchive,
  })
  const ioHelper = makeIo()
  const exitCode = await run(['upgrade'], ioHelper.io, deps)
  return { exitCode, ioHelper, tmpRoot }
}

async function cleanupFixture(fixture, tmpRoot) {
  await rm(fixture.root, { recursive: true, force: true })
  await rm(fixture.env.HOME, { recursive: true, force: true })
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
}

describe('restore after U17\'s run (U29)', () => {
  it('git checkout -- . then git clean -fd gives an empty status and HEAD\'s own files, including the untracked ignored one', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ALL_BRANCHES, rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const headBefore = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
      const scratchPath = join(fixture.root, 'scratch.local')
      const scratchBefore = await readFile(scratchPath)
      const headFiles = (await verifyGit(['ls-files'], { cwd: fixture.root, env: fixture.env })).stdout
        .split('\n')
        .filter((line) => line !== '')
      const headFileContents = {}
      for (const path of headFiles) headFileContents[path] = await readFile(join(fixture.root, path))

      const { exitCode, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot
      expect(exitCode).toBe(0)

      // D14 (T-0063): the restore commands exactly as R5 and UP-E09 print them, each exiting 0.
      await runRestoreCommands({ cwd: fixture.root, env: fixture.env })

      const status = await verifyGit(['status', '--porcelain=v1', '--untracked-files=all'], { cwd: fixture.root, env: fixture.env })
      expect(status.stdout).toBe('')

      const headAfter = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
      expect(headAfter.stdout).toBe(headBefore.stdout)

      for (const path of headFiles) {
        expect(await readFile(join(fixture.root, path))).toEqual(headFileContents[path])
      }

      // `scratch.local` is untracked and `.gitignore`-matched; `git clean -fd` without `-x` never
      // removes an ignored path, so it must still be exactly as it was.
      expect(await readFile(scratchPath)).toEqual(scratchBefore)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

// T-0027 increment 23 (U61): a second `upgrade` run, after the first run's own result was
// committed, finds `range.json`'s own `upstream.commit` already equal to the target's -- the
// same no-op `checkBaseAgainstTarget` branch U12 (T-0026) already covers, fired here by a real
// completed upgrade rather than a hand-written `range.json`.
describe('re-run after a completed upgrade and commit (U61)', () => {
  it('prints UP-I01, exits 0, and never calls the second run\'s own fetchArchive', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const firstResult = await runUpgradeAgainst(fixture)
      tmpRoot = firstResult.tmpRoot
      expect(firstResult.exitCode).toBe(0)

      await verifyGit(['add', '-A'], { cwd: fixture.root, env: fixture.env })
      await verifyGit(['commit', '-m', 'after upgrade'], { cwd: fixture.root, env: fixture.env })

      const treeBefore = {
        readme: await readFile(join(fixture.root, 'README.md')),
        rangeJson: await readFile(join(fixture.root, 'range.json')),
      }
      // Item 5 (verification follow-up, tightened to the approved boundary condition): nothing is
      // written in the range by the no-op second run -- a whole-tree snapshot (including `.git`),
      // `HEAD` and `git status` all unchanged, not merely two hand-picked files.
      const headBefore = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
      const snapshotBefore = await snapshotTree(fixture.root)

      // m6 (increment plan, "Needs a user decision" item 23's own note): a FRESH `deps` object,
      // never the first run's own -- its `fetchArchive` call counter starts at zero for this run.
      const secondTmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
      const secondFetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: fixture.baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
      }, { releases: { [BASE_VERSION]: BASE_COMMIT } })
      const secondDeps = makeDeps({
        cwd: fixture.root,
        tmpRoot: secondTmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive: secondFetchArchive,
      })
      const secondIo = makeIo()
      try {
        const secondExitCode = await run(['upgrade'], secondIo.io, secondDeps)

        expect(secondExitCode).toBe(0)
        expect(secondIo.stdoutText).toMatch(/^UP-I01/m)
        expect(secondIo.stdoutText).toContain(TARGET_VERSION)
        expect(secondIo.stdoutText).toContain(FIXED_COMMIT)
        expect(secondFetchArchive).not.toHaveBeenCalled()
        expect(await readFile(join(fixture.root, 'README.md'))).toEqual(treeBefore.readme)
        expect(await readFile(join(fixture.root, 'range.json'))).toEqual(treeBefore.rangeJson)

        // Snapshotted before this verification's OWN `git status`/`rev-parse` calls, either of
        // which can refresh `.git/index`'s stat cache (mtime/ino, same bytes) on its own --
        // noise from the check itself, not from the run under test.
        const snapshotAfter = await snapshotTree(fixture.root)
        expect(snapshotAfter).toEqual(snapshotBefore)
        const headAfter = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
        expect(headAfter.stdout).toBe(headBefore.stdout)
        const statusAfter = await verifyGit(['status', '--porcelain=v1', '--untracked-files=all'], { cwd: fixture.root, env: fixture.env })
        expect(statusAfter.stdout).toBe('')
      } finally {
        await rm(secondTmpRoot, { recursive: true, force: true })
      }
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

// U70 (traceability.md revision 3.1, D14; T-0063): the restore commands, exactly as R5 and UP-E09
// print them, on trees built from a commit -- the upgrade itself can no longer leave a missing or
// changed ignore file (P-7), so these trees are made by hand. Cleaning first would delete the
// ignored file in (a) and (b); `checkout` first brings the ignore file back before `clean` runs.
describe('the restore commands keep every file HEAD ignores (U70, D14)', () => {
  const IGNORED = 'teacher notes, ignored\n'
  const cases = [
    {
      name: '(a) the tracked .gitignore deleted, an ignored file present',
      tree: { 'keep.txt': 'tracked\n' },
      gitignore: '*.local\n',
      ignored: ['notes.local'],
      change: async (root) => unlink(join(root, '.gitignore')),
    },
    {
      name: '(b) a tracked sub/.gitignore changed so it no longer ignores a file',
      tree: { 'sub/.gitignore': '*.old\n', 'sub/keep.txt': 'tracked\n' },
      gitignore: '',
      ignored: ['sub/data.old'],
      change: async (root) => writeFile(join(root, 'sub', '.gitignore'), '# no rules\n'),
    },
    {
      name: '(c) a tracked file a replaced by an untracked a/x',
      tree: { a: 'tracked file a\n', 'keep.txt': 'tracked\n' },
      gitignore: '*.local\n',
      ignored: ['notes.local'],
      change: async (root) => {
        await unlink(join(root, 'a'))
        await mkdir(join(root, 'a'))
        await writeFile(join(root, 'a', 'x'), 'untracked\n')
      },
    },
  ]

  for (const { name, tree, gitignore, ignored, change } of cases) {
    it(`${name} -> empty status, HEAD's files, the ignored file byte-identical`, async () => {
      const repo = await makeRangeRepo({ tree, gitignore })
      try {
        // Ignored files are written after the commit, so they are never tracked.
        for (const path of ignored) await writeFile(join(repo.root, ...path.split('/')), IGNORED)
        const ignoredBefore = (await verifyGit(['ls-files', '--others', '--ignored', '--exclude-standard'], { cwd: repo.root, env: repo.env })).stdout
        expect(ignoredBefore.split('\n').filter(Boolean)).toEqual(ignored)
        const headTree = withoutIgnored(await snapshotTree(repo.root), ignored)

        await change(repo.root)
        // D14 (T-0063): the restore commands exactly as R5 and UP-E09 print them, each exiting 0.
        await runRestoreCommands({ cwd: repo.root, env: repo.env })

        const status = await verifyGit(['status', '--porcelain=v1', '--untracked-files=all'], { cwd: repo.root, env: repo.env })
        expect(status.stdout).toBe('')
        expect(withoutIgnored(await snapshotTree(repo.root), ignored)).toEqual(headTree)
        // Byte-identical, and still listed as ignored by `HEAD`'s rules (stage 6, F8).
        for (const path of ignored) expect(await readFile(join(repo.root, ...path.split('/')))).toEqual(Buffer.from(IGNORED))
        const ignoredAfter = (await verifyGit(['ls-files', '--others', '--ignored', '--exclude-standard'], { cwd: repo.root, env: repo.env })).stdout
        expect(ignoredAfter).toBe(ignoredBefore)
      } finally {
        await rm(repo.root, { recursive: true, force: true })
        await rm(repo.env.HOME, { recursive: true, force: true })
      }
    })
  }
})

/** Each entry's type and content only (a restored file is a new inode with a new mtime), without
 * `.git` and the ignored files, so it compares what `HEAD` holds. */
function withoutIgnored(snapshot, ignored) {
  const result = {}
  for (const [path, value] of Object.entries(snapshot)) {
    if (ignored.includes(path) || path === '.git' || path.startsWith('.git/')) continue
    result[path] = { type: value.type, contentHash: value.contentHash }
  }
  return result
}
