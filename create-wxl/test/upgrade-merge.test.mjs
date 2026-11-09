// 0006-S1 step 8-10 (traceability.md "Pre-checks", "Merge table"): the three-way merge table,
// starting with one fixture covering every branch of P-2 and M4-M12 (U17), then M12's own clean
// and conflicting sub-cases (U18, U19). Tests at seam 0006-S1 (`run()` with argv starting
// `upgrade`); every git call goes through the real `createSpawnGitRunner()`, isolated by the
// fixture's own `HOME`/`XDG_CONFIG_HOME` (`test/helpers/range-repo.mjs`,
// `test/helpers/upgrade-fixtures.mjs`).

import { describe, it, expect, vi } from 'vitest'
import { chmod, readFile, rm, stat } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
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
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { en } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '2222222222222222222222222222222222222222'
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

async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}

/** Runs `upgrade` against `fixture` (a `buildUpgradeFixtures` result), with its own isolated
 * `tmpRoot`, cleaning up every temporary directory this helper itself created regardless of the
 * run's own outcome. */
async function runUpgradeAgainst(fixture, depsOverrides = {}) {
  const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
  const fetchArchive = makeRefFetchArchive({
    [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: fixture.baseEntries }) },
    [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
  })
  const deps = makeDeps({
    cwd: fixture.root,
    tmpRoot,
    env: fixture.env,
    runGit: vi.fn(createSpawnGitRunner()),
    packageVersion: TARGET_VERSION,
    source: { version: TARGET_VERSION },
    fetchArchive,
    ...depsOverrides,
  })
  const ioHelper = makeIo()
  const exitCode = await run(['upgrade'], ioHelper.io, deps)
  return { exitCode, ioHelper, tmpRoot, deps }
}

async function cleanupFixture(fixture, tmpRoot) {
  await rm(fixture.root, { recursive: true, force: true })
  await rm(fixture.env.HOME, { recursive: true, force: true })
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
}

describe('merge table (U17)', () => {
  it('plans and applies every branch of P-2 and M4-M12 exactly as its row states', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ALL_BRANCHES, rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const beforeHead = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
      const teacherOwnedPath = join(fixture.root, 'teacher-owned.txt')
      const teacherOwnedBefore = { content: await readFile(teacherOwnedPath), mtimeMs: (await stat(teacherOwnedPath)).mtimeMs }

      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(0)

      // P-2 (both equal, differing from o): untouched.
      expect((await readFile(join(fixture.root, 'p2-shared.txt'))).toString()).toBe("teacher's own edit of shared text\n")
      // M4 both-absent: stays absent.
      expect(await readOptional(join(fixture.root, 'm4-was-deleted.txt'))).toBeNull()
      // M4 both-equal: untouched.
      expect((await readFile(join(fixture.root, 'm4-equal-content.txt'))).toString()).toBe('identical content\n')
      // M5-updated: README.md overwritten with target's content.
      expect((await readFile(join(fixture.root, 'README.md'))).toString()).toBe(
        '# wxl\n\nA pristine range fixture, updated by upstream.\n',
      )
      // M5-added: written under a newly created parent directory.
      expect((await readFile(join(fixture.root, 'assets', 'new-file.txt'))).toString()).toBe('new upstream file\n')
      // M6: deleted.
      expect(await readOptional(join(fixture.root, 'm6-upstream-removed.txt'))).toBeNull()
      // M7: stays deleted.
      expect(await readOptional(join(fixture.root, 'm7-teacher-deleted.txt'))).toBeNull()
      // M8: keeps the teacher's own edit.
      expect((await readFile(join(fixture.root, 'm8-teacher-edited.txt'))).toString()).toBe("teacher's own change\n")
      // M9: keeps the teacher's own addition.
      expect((await readFile(join(fixture.root, 'm9-new-both-sides.txt'))).toString()).toBe('teacher added this\n')
      // M10: upstream's lockfile taken.
      expect((await readFile(join(fixture.root, 'pnpm-lock.yaml'))).toString()).toBe('lockfile v1 target\n')
      // M11: binary kept as the teacher's own version.
      expect(await readFile(join(fixture.root, 'm11-binary.bin'))).toEqual(Buffer.from([0, 1, 2, 3, 4, 0, 7]))
      // M12-clean: merged cleanly (U18 checks the exact merged text in full).
      expect((await readFile(join(fixture.root, 'm12-clean.txt'))).toString()).toBe('o-line1\nline2\nt-line3\nline4\nline5\n')
      // M12-conflict: written with conflict markers (U19 checks the exact markers in full).
      expect((await readFile(join(fixture.root, 'm12-conflict.txt'))).toString()).toContain('<<<<<<<')
      // teacher-owned (U21): a teacher's own file, absent from both base and target, is P-2
      // (`b ≡ t`, both absent) -- untouched, unreported.
      expect(await readFile(teacherOwnedPath)).toEqual(teacherOwnedBefore.content)
      expect((await stat(teacherOwnedPath)).mtimeMs).toBe(teacherOwnedBefore.mtimeMs)

      expect(ioHelper.stdoutText).toMatch(/^R2: updated 2 added 1 deleted 1$/m)
      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      // B6 (increment plan, "Needs a user decision" §3, approved 2026-11-09): read as "exactly 6
      // per-path, M4-M12-derived" attention lines, with any line beyond those 6 being exactly one
      // UP-A12 (Fork:init-derived content, counted separately, not one of the 6) -- vacuously true
      // before increment 20 (U59) lands, meaningfully true after it (this fixture's own M5-updated
      // branch uses README.md, an anchor file that diverges between base and target by
      // construction), with no edit needed at either point.
      // T-0027 verification follow-up (item 1/2): R3 renders each attention item through the
      // run's message table (here, en), not a bare code (traceability.md:206).
      expect(r3Lines.slice(0, 6)).toEqual([
        `R3: ${en['UP-A2']()} ${jsonValue('m11-binary.bin')}`,
        `R3: ${en['UP-A1']()} ${jsonValue('m12-conflict.txt')}`,
        `R3: ${en['UP-A5']()} ${jsonValue('m7-teacher-deleted.txt')}`,
        `R3: ${en['UP-A3']()} ${jsonValue('m8-teacher-edited.txt')}`,
        `R3: ${en['UP-A4']()} ${jsonValue('m9-new-both-sides.txt')}`,
        `R3: ${en['UP-A6']()} ${jsonValue('pnpm-lock.yaml')}`,
      ])
      const extraLines = r3Lines.slice(6)
      expect(extraLines.length).toBeLessThanOrEqual(1)
      expect(extraLines.every((line) => line === `R3: ${en['UP-A12']()}`)).toBe(true)

      const afterHead = await verifyGit(['rev-parse', 'HEAD'], { cwd: fixture.root, env: fixture.env })
      expect(afterHead.stdout).toBe(beforeHead.stdout)
      const diffCached = await verifyGit(['diff', '--cached', '--name-only'], { cwd: fixture.root, env: fixture.env })
      expect(diffCached.stdout).toBe('')

      const remainingTmp = readdirSync(tmpRoot).filter((name) => name.startsWith('create-wxl-upgrade-'))
      expect(remainingTmp).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('M12 clean merge (U18)', () => {
  it('merges non-overlapping edits, writing no conflict markers', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M12-clean'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      const content = (await readFile(join(fixture.root, 'm12-clean.txt'))).toString()
      expect(content).toBe('o-line1\nline2\nt-line3\nline4\nline5\n')
      for (const marker of ['<<<<<<<', '|||||||', '=======', '>>>>>>>']) {
        expect(content).not.toContain(marker)
      }
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 1 added 0 deleted 0$/m)
      expect(ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('M12 conflict markers (U19)', () => {
  it('writes the fixed labels (range/base version/target version) regardless of the global merge.conflictStyle', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['M12-conflict'],
      mergeConflictStyle: 'merge',
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      const lines = (await readFile(join(fixture.root, 'm12-conflict.txt'))).toString().split('\n')
      const ours = lines.indexOf('<<<<<<< range')
      const base = lines.indexOf(`||||||| ${BASE_VERSION}`)
      const sep = lines.indexOf('=======')
      const theirs = lines.indexOf(`>>>>>>> ${TARGET_VERSION}`)
      expect(ours).toBeGreaterThanOrEqual(0)
      expect(base).toBeGreaterThan(ours)
      expect(sep).toBeGreaterThan(base)
      expect(theirs).toBeGreaterThan(sep)
      for (const marker of ['<<<<<<< range', `||||||| ${BASE_VERSION}`, '=======', `>>>>>>> ${TARGET_VERSION}`]) {
        expect(lines.filter((line) => line === marker).length).toBe(1)
      }
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A1']()} ${jsonValue('m12-conflict.txt')}`)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('case collision (U53)', () => {
  it("Guide.md (B) and guide.md (T) only differ by case: both untouched, UP-A8 each", async () => {
    // B7, corrected (increment plan): the range already has Guide.md, tracked; B carries
    // Guide.md, T carries guide.md -- a rename upstream, with the SAME content on both sides (the
    // approved reading, ticket 2026-11-09 comment, decisions item 2); o starts equal to B's own
    // Guide.md. B and T are the pristine ranges P-4 reads: B lists only `Guide.md`, T lists only
    // `guide.md`; `merge-plan.mjs` must read `b`/`t` only for the exact (case-sensitive) path each
    // pristine range actually lists, not by joining the path onto the pristine directory and
    // letting the file system's own case-folding resolve it to the other side's entry.
    const rangeRepo = await makeRangeRepo({
      tree: { 'Guide.md': 'guide content\n' },
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const baseEntries = [...PRISTINE_FIXTURE, { path: 'Guide.md', type: 'file', mode: 0o644, content: 'guide content\n' }]
      const targetEntries = [...PRISTINE_FIXTURE, { path: 'guide.md', type: 'file', mode: 0o644, content: 'guide content\n' }]
      tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
      })
      const deps = makeDeps({
        cwd: rangeRepo.root,
        tmpRoot,
        env: rangeRepo.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      const names = readdirSync(rangeRepo.root)
      expect(names).toContain('Guide.md')
      expect(names).not.toContain('guide.md')
      expect((await readFile(join(rangeRepo.root, 'Guide.md'))).toString()).toBe('guide content\n')
      const r3Lines = ioHelper.stdoutText
        .split('\n')
        .filter((line) => line.startsWith('R3:') && line.includes('UP-A8'))
      expect(r3Lines).toEqual([
        `R3: ${en['UP-A8']()} ${jsonValue('Guide.md')}`,
        `R3: ${en['UP-A8']()} ${jsonValue('guide.md')}`,
      ])
    } finally {
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe.skipIf(process.platform === 'win32')('executable mode (U23)', () => {
  it('a new executable file is written 0755 (umask 022); an existing file keeps its own mode, executable or not', async () => {
    const umask = process.umask(0o022)
    const rangeRepo = await makeRangeRepo({
      tree: {
        'existing-0755.sh': '#!/bin/sh\necho hi\n',
        'mode-change.txt': 'o/b original content\n',
      },
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      // The approved extra sub-case (ticket's 2026-11-09 comment): an EXISTING 0755 file updated
      // by M5 keeps 0755 -- so `o` itself, not just the archives, must start at that mode.
      await chmod(join(rangeRepo.root, 'existing-0755.sh'), 0o755)
      await chmod(join(rangeRepo.root, 'mode-change.txt'), 0o644)
      await rangeRepo.commit('set modes')

      const baseEntries = [
        ...PRISTINE_FIXTURE,
        { path: 'existing-0755.sh', type: 'file', mode: 0o755, content: '#!/bin/sh\necho hi\n' },
        { path: 'mode-change.txt', type: 'file', mode: 0o644, content: 'o/b original content\n' },
      ]
      const targetEntries = [
        ...PRISTINE_FIXTURE,
        // Target's own mode changes on both existing paths; M5 ignores it either way (M3: "existing
        // ones keep their mode").
        { path: 'existing-0755.sh', type: 'file', mode: 0o644, content: '#!/bin/sh\necho updated\n' },
        { path: 'mode-change.txt', type: 'file', mode: 0o755, content: 'updated by upstream\n' },
        { path: 'bin/', type: 'dir', mode: 0o755 },
        { path: 'bin/new-executable.sh', type: 'file', mode: 0o755, content: '#!/bin/sh\necho new\n' },
        { path: 'bin/new-plain.txt', type: 'file', mode: 0o644, content: 'new plain file\n' },
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
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect((await stat(join(rangeRepo.root, 'bin', 'new-executable.sh'))).mode & 0o777).toBe(0o755)
      expect((await stat(join(rangeRepo.root, 'bin', 'new-plain.txt'))).mode & 0o777).toBe(0o644)
      expect((await stat(join(rangeRepo.root, 'existing-0755.sh'))).mode & 0o777).toBe(0o755)
      expect((await stat(join(rangeRepo.root, 'mode-change.txt'))).mode & 0o777).toBe(0o644)
      expect((await readFile(join(rangeRepo.root, 'existing-0755.sh'))).toString()).toBe('#!/bin/sh\necho updated\n')
      expect((await readFile(join(rangeRepo.root, 'mode-change.txt'))).toString()).toBe('updated by upstream\n')
    } finally {
      process.umask(umask)
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('file/directory swap (U54)', () => {
  it('(1) a kept file becomes a directory when T adds a nested path: the file is deleted, then the nested path is written', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U54-swap-file-to-dir'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      // The FILE `a` is gone (M6 deleted it); `a` now exists only as the new directory `a/x`'s
      // own parent, created by the write that replaced it.
      expect((await stat(join(fixture.root, 'a'))).isDirectory()).toBe(true)
      expect((await readFile(join(fixture.root, 'a', 'x'))).toString()).toBe('upstream added this nested file\n')
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 0 added 1 deleted 1$/m)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('(2) a kept directory becomes a file when T replaces it: the nested path is deleted, the directory stays, UP-A10', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U54-swap-dir-to-file'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      expect(await readOptional(join(fixture.root, 'a', 'x'))).toBeNull()
      expect((await stat(join(fixture.root, 'a'))).isDirectory()).toBe(true)
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 0 added 0 deleted 1$/m)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A10']()} ${jsonValue('a')}`)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('P-6 and the parent check (U55)', () => {
  it("(1) o is a directory where b and t are different files: untouched, UP-A10 (confirms increment 15's P-6)", async () => {
    const rangeRepo = await makeRangeRepo({
      tree: { 'p6dir/inner.txt': "the teacher's own nested file\n" },
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const baseEntries = [...PRISTINE_FIXTURE, { path: 'p6dir', type: 'file', mode: 0o644, content: 'base version of p6dir\n' }]
      const targetEntries = [...PRISTINE_FIXTURE, { path: 'p6dir', type: 'file', mode: 0o644, content: 'target version of p6dir\n' }]
      tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
      })
      const deps = makeDeps({
        cwd: rangeRepo.root,
        tmpRoot,
        env: rangeRepo.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect((await stat(join(rangeRepo.root, 'p6dir'))).isDirectory()).toBe(true)
      expect((await readFile(join(rangeRepo.root, 'p6dir', 'inner.txt'))).toString()).toBe("the teacher's own nested file\n")
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A10']()} ${jsonValue('p6dir')}`)
    } finally {
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(2) a kept file blocks a new nested write under it: the kept file stays UP-A3, the nested write is dropped and reported UP-A10', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U55-parent-check'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      expect((await stat(join(fixture.root, 'a'))).isFile()).toBe(true)
      expect((await readFile(join(fixture.root, 'a'))).toString()).toBe("the teacher's own edit of a\n")
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 0 added 0 deleted 0$/m)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A3']()} ${jsonValue('a')}`)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A10']()} ${jsonValue('a/x')}`)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  // T-0027 verification follow-up (item 3, approved sub-case, 2026-11-09): one level deeper than
  // case (2) -- `a` (not `a/b`) is the kept file; T adds `a/b/x`. The parent check must look at
  // every parent inside the range (traceability.md:153), not only the direct one.
  it('(3) a kept file blocks a nested write two levels down: a/b/x is never created, UP-A10 for a/b/x', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U55-parent-check-deep'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      expect((await stat(join(fixture.root, 'a'))).isFile()).toBe(true)
      expect((await readFile(join(fixture.root, 'a'))).toString()).toBe("the teacher's own edit of a\n")
      // `a` is still a file (never replaced by a directory), so `a/b/x` cannot exist. Reading a
      // path under a regular file fails with ENOTDIR on POSIX and ENOENT on Windows; either proves
      // it was never created.
      const nestedRead = await readFile(join(fixture.root, 'a', 'b', 'x')).then(() => null, (err) => err.code)
      expect(['ENOTDIR', 'ENOENT']).toContain(nestedRead)
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 0 added 0 deleted 0$/m)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A3']()} ${jsonValue('a')}`)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A10']()} ${jsonValue('a/b/x')}`)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('CRLF-only difference between o and b (U56)', () => {
  it('o differs from b only by CRLF, t changed: M5, t written', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U56-crlf-m5'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      expect((await readFile(join(fixture.root, 'crlf-m5.txt'))).toString()).toBe('line one\nchanged by upstream\n')
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 1 added 0 deleted 0$/m)
      expect(ioHelper.stdoutText).not.toContain('UP-A1')
      expect(ioHelper.stdoutText).not.toContain('UP-A2')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  // The approved extra sub-case (ticket's 2026-11-09 comment): an M12 clean merge whose `o` has
  // CRLF line ends merges on LF-normalised inputs.
  it("an M12 clean merge whose o has CRLF line ends merges cleanly on LF-normalised inputs", async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U56-crlf-m12'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      const content = (await readFile(join(fixture.root, 'crlf-m12.txt'))).toString()
      expect(content).toBe('alpha-edited\nbeta\ngamma-updated\n')
      for (const marker of ['<<<<<<<', '|||||||', '=======', '>>>>>>>']) {
        expect(content).not.toContain(marker)
      }
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 1 added 0 deleted 0$/m)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

/** Wraps the real `createSpawnGitRunner()`, intercepting only a `merge-file` call to return a
 * fixed `{ code, stdout: <bytes>, stderr: '' }` (amendment 4, ticket's 2026-11-09 comment); every
 * other git call goes through unchanged. */
function stubMergeFileCode(code) {
  const real = createSpawnGitRunner()
  return vi.fn((args, opts) => {
    if (args.includes('merge-file')) return Promise.resolve({ code, stdout: Buffer.from(''), stderr: '' })
    return real(args, opts)
  })
}

describe('merge-file exit outside 0-127 (U57)', () => {
  it.each([
    ['exits 255', 255],
    ['closes with code null (the approved extra sub-case)', null],
  ])('git merge-file %s: UP-E11 naming the path, nothing written', async (_label, code) => {
    const fixture = await buildUpgradeFixtures({ branches: ['M5-added', 'M6', 'M12-clean'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const m6Before = await readFile(join(fixture.root, 'm6-upstream-removed.txt'))
      const rangeJsonBefore = await readFile(join(fixture.root, 'range.json'), 'utf8')

      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture, { runGit: stubMergeFileCode(code) })
      tmpRoot = usedTmpRoot

      expect(ioHelper.stderrText).toMatch(/^UP-E11/m)
      expect(ioHelper.stderrText).toContain('m12-clean.txt')
      expect(exitCode).toBe(1)
      // Nothing written: M5-added's own path never appears, M6's own path is unchanged, and
      // range.json is untouched.
      expect(await readOptional(join(fixture.root, 'assets', 'new-file.txt'))).toBeNull()
      expect(await readFile(join(fixture.root, 'm6-upstream-removed.txt'))).toEqual(m6Before)
      expect(await readFile(join(fixture.root, 'range.json'), 'utf8')).toBe(rangeJsonBefore)
      const remainingTmp = readdirSync(tmpRoot).filter((name) => name.startsWith('create-wxl-upgrade-'))
      expect(remainingTmp).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('M12 clean merge of invalid JSON (U58)', () => {
  it('a clean merge of package.json that does not parse as JSON: o kept, UP-A11', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U58-invalid-json'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const before = await readFile(join(fixture.root, 'package.json'))
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      expect(await readFile(join(fixture.root, 'package.json'))).toEqual(before)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A11']()} ${jsonValue('package.json')}`)
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 0 added 0 deleted 0$/m)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('M12 clean merge of a non-UTF-8 file (D4)', () => {
  it('writes the merged bytes exactly, with no U+FFFD replacement character', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['D4-big5'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const { exitCode, ioHelper, tmpRoot: usedTmpRoot } = await runUpgradeAgainst(fixture)
      tmpRoot = usedTmpRoot

      expect(exitCode).toBe(0)
      const written = await readFile(join(fixture.root, 'big5.txt'))
      // o's own line 1 (0xa4 0x5d), b's own unchanged line 2 (0xb0 0xcf), t's own line 3
      // (0xa4 0x5e) -- hand-built as a literal `Buffer`, never compared against `merge-file`'s
      // own stdout re-decoded through anything that could hide the same bug it is meant to catch.
      const expected = Buffer.from([0xa4, 0x5d, 0x0a, 0xb0, 0xcf, 0x0a, 0xa4, 0x5e, 0x0a])
      expect(written).toEqual(expected)
      expect(written.includes(Buffer.from([0xef, 0xbf, 0xbd]))).toBe(false)
      expect(ioHelper.stdoutText).toMatch(/^R2: updated 1 added 0 deleted 0$/m)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})
