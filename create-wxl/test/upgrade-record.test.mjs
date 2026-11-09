// 0006-S1 step 9's own last write (traceability.md "`range.json` after the plan"): after a
// completed run, `range.json`'s `upstream` names the target, every other top-level key's value
// and order is kept, and the file is created (`upstream` first) when absent (U24). Sub-case ②
// (a `UP-E09` failure leaves `range.json` untouched) needs U27's own failure path (increment 10)
// and is deferred to increment 14, per the increment plan.

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
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '5'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture, argv = ['upgrade'], depsOverrides = {}) {
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
  const exitCode = await run(argv, ioHelper.io, deps)
  return { exitCode, ioHelper, tmpRoot }
}

async function cleanupFixture(fixture, tmpRoot) {
  await rm(fixture.root, { recursive: true, force: true })
  await rm(fixture.env.HOME, { recursive: true, force: true })
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
}

const TARGET_UPSTREAM = { repository: engineModule.UPSTREAM_SLUG, version: TARGET_VERSION, commit: FIXED_COMMIT }

describe('range.json after the plan (U24)', () => {
  it('① a custom top-level key before upstream keeps its value and position; upstream becomes the target', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: [],
      rangeJson: { customKey: 'custom value', ...rangeJsonFor(BASE_COMMIT) },
    })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)

      const raw = await readFile(join(fixture.root, 'range.json'), 'utf8')
      const expected = JSON.stringify({ customKey: 'custom value', upstream: TARGET_UPSTREAM }, null, 2) + '\n'
      expect(raw).toBe(expected)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('② a UP-E09 failure (step 9 write failure) leaves range.json byte-identical to before', async () => {
    // Deferred from increment 8 (U24, sub-case ②) to increment 14, once U27's own failure path
    // (increment 10) exists.
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const rangeJsonBefore = await readFile(join(fixture.root, 'range.json'), 'utf8')
      const destPath = join(fixture.root, 'README.md')
      const rename = failAt('rename', (count, args) => (args[1] === destPath ? fsError('EIO', 'EIO: i/o error') : null))
      const { fs } = recordingFs({ rename })

      const result = await runUpgradeAgainst(fixture, ['upgrade'], { fs })
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(1)
      expect(result.ioHelper.stderrText).toMatch(/^UP-E09/m)

      const rangeJsonAfter = await readFile(join(fixture.root, 'range.json'), 'utf8')
      expect(rangeJsonAfter).toBe(rangeJsonBefore)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('③ --from <base commit>, no range.json -> created, upstream the only key', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [] })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, ['upgrade', '--from', BASE_COMMIT])
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)

      const raw = await readFile(join(fixture.root, 'range.json'), 'utf8')
      const expected = JSON.stringify({ upstream: TARGET_UPSTREAM }, null, 2) + '\n'
      expect(raw).toBe(expected)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('④ --from <base commit>, range.json = {"x":1} -> upstream added first, x stays after it', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: { x: 1 } })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, ['upgrade', '--from', BASE_COMMIT])
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)

      const raw = await readFile(join(fixture.root, 'range.json'), 'utf8')
      const expected = JSON.stringify({ upstream: TARGET_UPSTREAM, x: 1 }, null, 2) + '\n'
      expect(raw).toBe(expected)
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})
