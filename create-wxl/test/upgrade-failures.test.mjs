// 0006-S1 step 9's own failure path (traceability.md "Step order" row 9, "Codes" UP-E09): a write
// failed partway through applying the plan. T-0027 increment 10 (U27).

import { describe, it, expect, vi } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { failAt, fsError } from './helpers/fail-at.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import * as engineModule from '../../scripts/fork-init.ts'
import { expectRestoreLine, runRestoreCommands } from './helpers/restore.mjs'

const BASE_COMMIT = '7'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture, depsOverrides = {}) {
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

describe('range.json write failure', () => {
  it("fs.rename fails on range.json's own write -> UP-E09 naming range.json, restore commands, exit 1; no temporary file left in the range", async () => {
    // M6 (one deletion) and M5-added (one write): both succeed; only range.json's own rename,
    // the LAST write of step 9, is made to fail.
    const fixture = await buildUpgradeFixtures({ branches: ['M6', 'M5-added'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const rename = failAt('rename', (count, args) => (basename(args[1]) === 'range.json' ? fsError('EIO', 'EIO: i/o error') : null))
      const { fs } = recordingFs({ rename })

      const result = await runUpgradeAgainst(fixture, { fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('range.json')
      expectRestoreLine(ioHelper.stderrText) // D14 (T-0063)
      expect(exitCode).toBe(1)

      // No temporary file of step 9 is left in the range (their names are unique, so list them).
      expect(readdirSync(fixture.root).filter((name) => name.startsWith('.create-wxl-upgrade-tmp'))).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('a non-file-system error after the first operation of step 9', () => {
  it('fs.rename rejects with a plain Error (no code) on the 2nd write -> UP-E09 naming the path, restore commands, exit 1', async () => {
    // Same fixture shape as U27's own case: 'assets/new-file.txt' sorts before 'pnpm-lock.yaml',
    // so the 2nd sorted write is pnpm-lock.yaml's own rename -- after the first write has already
    // landed, matching the path by its file name only.
    const fixture = await buildUpgradeFixtures({ branches: ['M6', 'M5-added', 'M10'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const rename = failAt('rename', (count, args) => (basename(args[1]) === 'pnpm-lock.yaml' ? new Error('boom: not a file-system error') : null))
      const { fs } = recordingFs({ rename })

      const result = await runUpgradeAgainst(fixture, { fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('pnpm-lock.yaml')
      expect(ioHelper.stderrText).toContain('boom: not a file-system error')
      expectRestoreLine(ioHelper.stderrText) // D14 (T-0063)
      expect(exitCode).toBe(1)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('write failure during step 9 (U27)', () => {
  it('fs.rename fails on the 2nd write -> UP-E09 naming the path, exit 1; the restore commands give an empty status and HEAD\'s files', async () => {
    // M6 (one deletion), M5-added and M10 (two writes): 'assets/new-file.txt' sorts before
    // 'pnpm-lock.yaml', so the 2nd sorted write is pnpm-lock.yaml's own rename.
    const fixture = await buildUpgradeFixtures({ branches: ['M6', 'M5-added', 'M10'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const rename = failAt('rename', (count, args) => (basename(args[1]) === 'pnpm-lock.yaml' ? fsError('EIO', 'EIO: i/o error') : null))
      const { fs } = recordingFs({ rename })

      const result = await runUpgradeAgainst(fixture, { fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('pnpm-lock.yaml')
      expectRestoreLine(ioHelper.stderrText) // D14 (T-0063)
      expect(exitCode).toBe(1)

      // D14 (T-0063): the restore commands exactly as R5 and UP-E09 print them, each exiting 0.
      await runRestoreCommands({ cwd: fixture.root, env: fixture.env })
      const status = await verifyGit(['status', '--porcelain=v1', '--untracked-files=all'], { cwd: fixture.root, env: fixture.env })
      expect(status.stdout).toBe('')
      const headFiles = await verifyGit(['ls-files'], { cwd: fixture.root, env: fixture.env })
      // Item 5 (verification follow-up, tightened to the approved boundary condition, as U29
      // does): every tracked file, compared against HEAD's own content (`git show HEAD:<path>`),
      // not merely "readable".
      for (const path of headFiles.stdout.split('\n').filter((line) => line !== '')) {
        const headContent = await verifyGit(['show', `HEAD:${path}`], { cwd: fixture.root, env: fixture.env })
        expect(headContent.code).toBe(0)
        expect((await readFile(join(fixture.root, path))).toString()).toBe(headContent.stdout)
      }
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})
