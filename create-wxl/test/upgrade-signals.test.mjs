// 0006-S1 signals during steps 7, 9 and 10 (traceability.md "Step order", D8). T-0027
// increment 11 (U28). Sub-case (a) is a confirmation of T-0026's own `checkpoint('step-7')` +
// `guard.throwIfRaised()` pairing; (b) and (c) are this ticket's own new behaviour.

import { describe, it, expect, vi } from 'vitest'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { basename, join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { makeSignalingCheckpoint } from './helpers/checkpoint-signal.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '8'.repeat(40)
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

function remainingTmpEntries(tmpRoot) {
  return readdirSync(tmpRoot).filter((name) => name.startsWith('create-wxl-upgrade-'))
}

describe('SIGINT during step 8, right after the first merge-file', () => {
  it('exit 130; the merge-inputs temporary directory is not left under tmpRoot', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M12-clean'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const signals = new EventEmitter()
      const real = createSpawnGitRunner()
      const runGit = vi.fn(async (args, opts) => {
        const result = await real(args, opts)
        if (args.includes('merge-file')) signals.emit('SIGINT')
        return result
      })

      const result = await runUpgradeAgainst(fixture, { signals, runGit })
      tmpRoot = result.tmpRoot
      const { exitCode } = result

      expect(exitCode).toBe(130)
      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('a signal received while merge-file ran wins over its own result', () => {
  it('exit 130, not UP-E11; nothing written; no temporary directory left', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M12-clean'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const before = await readFile(join(fixture.root, 'm12-clean.txt'))
      const signals = new EventEmitter()
      const real = createSpawnGitRunner()
      // A signal arrives WHILE the real merge-file is still running (simulated here as arriving
      // the moment this stub's own call for it is reached), and that same process happens to end
      // with `code: null` (killed by the signal) -- the guard must win over interpreting that
      // `null` as `MergeFileError`'s own "outside 0-127" case.
      const runGit = vi.fn(async (args, opts) => {
        if (args.includes('merge-file')) {
          signals.emit('SIGINT')
          return { code: null, stdout: Buffer.from(''), stderr: '' }
        }
        return real(args, opts)
      })

      const result = await runUpgradeAgainst(fixture, { signals, runGit })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/UP-E11/)
      expect(await readFile(join(fixture.root, 'm12-clean.txt'))).toEqual(before)
      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('a signal received while check-ignore ran wins over its own result', () => {
  it('exit 130, not CW-E14; nothing written; no temporary directory left', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['P5-existing'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const before = await readFile(join(fixture.root, 'existing.local'))
      const signals = new EventEmitter()
      const real = createSpawnGitRunner()
      const runGit = vi.fn(async (args, opts) => {
        if (args[0] === 'check-ignore') {
          signals.emit('SIGINT')
          return { code: null, stdout: '', stderr: '' }
        }
        return real(args, opts)
      })

      const result = await runUpgradeAgainst(fixture, { signals, runGit })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/CW-E14/)
      expect(await readFile(join(fixture.root, 'existing.local'))).toEqual(before)
      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('SIGINT at the step-7 checkpoint (U28(a), confirmation)', () => {
  it('stops before any download; exit 130, range unchanged, no temporary directory', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const before = await snapshotTree(fixture.root)
      const signals = new EventEmitter()
      const checkpoint = makeSignalingCheckpoint(signals, 'step-7')

      const result = await runUpgradeAgainst(fixture, { signals, checkpoint })
      tmpRoot = result.tmpRoot
      const after = await snapshotTree(fixture.root)

      expect(result.exitCode).toBe(130)
      expect(result.deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('SIGTERM right after step 9\'s first rename (U28(b))', () => {
  it('UP-E09 names the signal, exit 130; the 2nd write never happens, range.json is untouched, no temporary directory', async () => {
    // M6 (one deletion, applied before any write) plus M5-updated and M5-added (two writes).
    const fixture = await buildUpgradeFixtures({
      branches: ['M6', 'M5-updated', 'M5-added'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const rangeJsonBefore = await readFile(join(fixture.root, 'range.json'), 'utf8')
      const signals = new EventEmitter()
      let renameCount = 0
      const renameOverride = async (...args) => {
        const result = await rename(...args)
        renameCount++
        if (renameCount === 1) signals.emit('SIGTERM')
        return result
      }
      const { fs } = recordingFs({ rename: renameOverride })

      const result = await runUpgradeAgainst(fixture, { signals, fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('SIGTERM')
      expect(ioHelper.stderrText).toContain('git clean -fd')
      expect(ioHelper.stderrText).toContain('git checkout -- .')
      expect(exitCode).toBe(130)

      // The deletion (M6) and the first write already landed before the signal was noticed.
      await expect(readFile(join(fixture.root, 'm6-upstream-removed.txt'))).rejects.toThrow()
      // Exactly one of the two writes (README.md, assets/new-file.txt) happened; the other did not.
      const readmeUpdated = (await readFile(join(fixture.root, 'README.md'))).toString() ===
        '# wxl\n\nA pristine range fixture, updated by upstream.\n'
      let assetsWritten = true
      try {
        await readFile(join(fixture.root, 'assets', 'new-file.txt'))
      } catch {
        assetsWritten = false
      }
      expect(readmeUpdated).not.toBe(assetsWritten)

      const rangeJsonAfter = await readFile(join(fixture.root, 'range.json'), 'utf8')
      expect(rangeJsonAfter).toBe(rangeJsonBefore)

      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe("SIGTERM right after range.json's own temporary file is written", () => {
  it('UP-E09 names the signal, exit 130; no temporary directory left', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M7'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const signals = new EventEmitter()
      const writeFileOverride = async (path, ...rest) => {
        const result = await writeFile(path, ...rest)
        if (/^\.create-wxl-upgrade-tmp-[0-9a-f]+-range\.json$/.test(basename(String(path)))) signals.emit('SIGTERM')
        return result
      }
      const { fs } = recordingFs({ writeFile: writeFileOverride })

      const result = await runUpgradeAgainst(fixture, { signals, fs })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(ioHelper.stderrText).toMatch(/^UP-E09/m)
      expect(ioHelper.stderrText).toContain('SIGTERM')
      expect(ioHelper.stderrText).toContain('git clean -fd')
      expect(ioHelper.stderrText).toContain('git checkout -- .')
      expect(exitCode).toBe(130)

      expect(remainingTmpEntries(tmpRoot)).toEqual([])
      const rangeTmpFiles = readdirSync(fixture.root).filter((name) => name.startsWith('.create-wxl-upgrade-tmp'))
      expect(rangeTmpFiles).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('SIGINT at the step-10 checkpoint (U28, D8)', () => {
  it('lets R1-R5 print in full, then exits 130, no temporary directory left', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M7'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const signals = new EventEmitter()
      const checkpoint = makeSignalingCheckpoint(signals, 'step-10')

      const result = await runUpgradeAgainst(fixture, { signals, checkpoint })
      tmpRoot = result.tmpRoot
      const { exitCode, ioHelper } = result

      expect(exitCode).toBe(130)
      for (const id of ['R1:', 'R2:', 'R3:', 'R4:', 'R5:']) {
        expect(ioHelper.stdoutText).toContain(id)
      }
      expect(remainingTmpEntries(tmpRoot)).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})
