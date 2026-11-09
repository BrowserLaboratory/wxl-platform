// 0006-S1 step 9's own failure path (traceability.md "Step order" row 9, "Codes" UP-E09): a write
// failed partway through applying the plan. T-0027 increment 10 (U27).

import { describe, it, expect, vi } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
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

describe('write failure during step 9 (U27)', () => {
  it('fs.rename fails on the 2nd write -> UP-E09 naming the path, exit 1; the restore commands give an empty status and HEAD\'s files', async () => {
    // M6 (one deletion), M5-added and M10 (two writes): 'assets/new-file.txt' sorts before
    // 'pnpm-lock.yaml', so the 2nd sorted write is pnpm-lock.yaml's own rename.
    const fixture = await buildUpgradeFixtures({ branches: ['M6', 'M5-added', 'M10'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const secondWriteDest = join(fixture.root, 'pnpm-lock.yaml')
      const rename = failAt('rename', (count, args) => (args[1] === secondWriteDest ? fsError('EIO', 'EIO: i/o error') : null))
      const { fs } = recordingFs({ rename })

      const result = await runUpgradeAgainst(fixture, { fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('pnpm-lock.yaml')
      expect(ioHelper.stderrText).toContain('git clean -fd')
      expect(ioHelper.stderrText).toContain('git checkout -- .')
      expect(exitCode).toBe(1)

      await verifyGit(['clean', '-fd'], { cwd: fixture.root, env: fixture.env })
      await verifyGit(['checkout', '--', '.'], { cwd: fixture.root, env: fixture.env })
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
