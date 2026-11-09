// 0006-S1 step 8 pre-check P-5 (traceability.md "Pre-checks"; Vocabulary's own "ignored path"): an
// existing, untracked, ignored file (`o ≡ b`) that upstream changes, and a brand-new upstream path
// the range's own rules would ignore, are both left untouched and reported UP-A9 (U22). Two
// approved extra sub-cases (ticket's 2026-11-09 comment): `git check-ignore` exiting other than 0
// or 1, and `git ls-files -z` exiting non-zero, each fail closed as CW-E14 naming the command,
// with nothing written.

import { describe, it, expect, vi } from 'vitest'
import { readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { snapshotTree, withoutRootMtime } from './helpers/snapshot.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { makeRangeRepo } from './helpers/range-repo.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { en } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '4'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture, runGit) {
  const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
  const fetchArchive = makeRefFetchArchive({
    [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: fixture.baseEntries }) },
    [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
  })
  const deps = makeDeps({
    cwd: fixture.root,
    tmpRoot,
    env: fixture.env,
    runGit,
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

describe('ignored paths (U22)', () => {
  it('leaves an existing ignored file and a new ignored path untouched, each reported UP-A9', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['P5-existing', 'P5-new'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const existingPath = join(fixture.root, 'existing.local')
      const newPath = join(fixture.root, 'added.local')
      const before = await readFile(existingPath)

      const result = await runUpgradeAgainst(fixture, vi.fn(createSpawnGitRunner()))
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(0)
      expect(await readFile(existingPath)).toEqual(before)
      await expect(readFile(newPath)).rejects.toMatchObject({ code: 'ENOENT' })

      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      // T-0027 verification follow-up (item 1/2): R3 renders each attention item through the
      // run's message table (here, en), not a bare code (traceability.md:206).
      expect(r3Lines).toEqual([
        `R3: ${en['UP-A9']()} ${jsonValue('added.local')}`,
        `R3: ${en['UP-A9']()} ${jsonValue('existing.local')}`,
      ])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('upstream .gitignore changes (U63, D9)', () => {
  it('leaves both .gitignore files untouched, each reported UP-A13; the ignored file stays byte-identical after the run and after the restore commands', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['U63-gitignore'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const rootGitignorePath = join(fixture.root, '.gitignore')
      const nestedGitignorePath = join(fixture.root, 'sub', '.gitignore')
      const scratchPath = join(fixture.root, 'scratch.local') // the teacher's untracked, ignored file.
      const rootBefore = await readFile(rootGitignorePath)
      const nestedBefore = await readFile(nestedGitignorePath)
      const scratchBefore = await readFile(scratchPath)

      const result = await runUpgradeAgainst(fixture, vi.fn(createSpawnGitRunner()))
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(0)
      expect(await readFile(rootGitignorePath)).toEqual(rootBefore)
      expect(await readFile(nestedGitignorePath)).toEqual(nestedBefore)
      expect(await readFile(scratchPath)).toEqual(scratchBefore)

      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual([
        `R3: ${en['UP-A13']()} ${jsonValue('.gitignore')}`,
        `R3: ${en['UP-A13']()} ${jsonValue('sub/.gitignore')}`,
      ])

      await verifyGit(['clean', '-fd'], { cwd: fixture.root, env: fixture.env })
      await verifyGit(['checkout', '--', '.'], { cwd: fixture.root, env: fixture.env })
      expect(await readFile(scratchPath)).toEqual(scratchBefore)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('P-7 folding (D9)', () => {
  it('upstream adds sub/.GITIGNORE (b absent, t present): never created, UP-A13, exit 0', async () => {
    const rangeRepo = await makeRangeRepo({ rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const baseEntries = [...PRISTINE_FIXTURE]
      const targetEntries = [
        ...PRISTINE_FIXTURE,
        { path: 'sub/', type: 'dir', mode: 0o755 },
        { path: 'sub/.GITIGNORE', type: 'file', mode: 0o644, content: 'upstream pattern\n' },
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
      // Not under its exact (upstream-cased) name, and `sub` itself was never created either --
      // on a case-insensitive file system, the two names would resolve to the same entry anyway.
      await expect(readFile(join(rangeRepo.root, 'sub', '.GITIGNORE'))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(readdir(rangeRepo.root)).resolves.not.toContain('sub')
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A13']()} ${jsonValue('sub/.GITIGNORE')}`)
    } finally {
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('git check-ignore fails closed', () => {
  it('check-ignore exiting 2 -> CW-E14 naming check-ignore, exit 1, nothing written', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['P5-existing', 'P5-new'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const real = createSpawnGitRunner()
      const runGit = vi.fn(async (args, opts) => {
        if (args[0] === 'check-ignore') return { code: 2, stdout: '', stderr: 'stubbed check-ignore failure' }
        return real(args, opts)
      })
      const before = withoutRootMtime(await snapshotTree(fixture.root))

      const result = await runUpgradeAgainst(fixture, runGit)
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result
      const after = withoutRootMtime(await snapshotTree(fixture.root))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(ioHelper.stderrText).toContain('check-ignore')
      expect(after).toEqual(before)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('git ls-files -z fails closed', () => {
  it('ls-files -z exiting non-zero -> CW-E14 naming ls-files -z, exit 1, nothing written', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['P5-existing', 'P5-new'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const real = createSpawnGitRunner()
      const runGit = vi.fn(async (args, opts) => {
        if (args[0] === 'ls-files' && args[1] === '-z') return { code: 128, stdout: '', stderr: 'stubbed ls-files failure' }
        return real(args, opts)
      })
      const before = withoutRootMtime(await snapshotTree(fixture.root))

      const result = await runUpgradeAgainst(fixture, runGit)
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result
      const after = withoutRootMtime(await snapshotTree(fixture.root))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(ioHelper.stderrText).toContain('ls-files -z')
      expect(after).toEqual(before)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('P-5 reads a path literally, never as pathspec magic', () => {
  // A component starting with ':' would otherwise be read by git as pathspec magic (':/x', ':!x'),
  // so P-5 would check another path than the one step 9 writes. Windows file names cannot hold ':'.
  it.skipIf(process.platform === 'win32')(
    "upstream adds ':Zone.Identifier' under the range's rule '*:Zone.Identifier': never created, UP-A9, exit 0",
    async () => {
      const rangeRepo = await makeRangeRepo({ rangeJson: rangeJsonFor(BASE_COMMIT), gitignore: '*:Zone.Identifier\n' })
      let tmpRoot
      try {
        const targetEntries = [
          ...PRISTINE_FIXTURE,
          { path: ':Zone.Identifier', type: 'file', mode: 0o644, content: 'upstream stream copy\n' },
        ]
        tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
        const fetchArchive = makeRefFetchArchive({
          [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: [...PRISTINE_FIXTURE] }) },
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
        await expect(readdir(rangeRepo.root)).resolves.not.toContain(':Zone.Identifier')
        expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A9']()} ${jsonValue(':Zone.Identifier')}`)
      } finally {
        await rm(rangeRepo.root, { recursive: true, force: true })
        await rm(rangeRepo.env.HOME, { recursive: true, force: true })
        if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )
})

