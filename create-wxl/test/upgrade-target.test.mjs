// 0006-S1 step 6's no-op check (traceability.md "Step order" row 6): a known base commit equal to
// the target's prints UP-I01 and downloads nothing, whether the base comes from `range.json` or
// `--from <commit>`.

import { describe, it, expect, vi } from 'vitest'
import { rm } from 'node:fs/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeFixtureRange } from './helpers/fixture-range.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { jsonValue } from '../src/text.mjs'
import { makeRefFetchArchive, pristineArchive, tagArchive } from './helpers/ref-fetch-archive.mjs'
import { CHANGELOG_PRISTINE, PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { failAt, fsError } from './helpers/fail-at.mjs'
import { withoutRootMtime } from './helpers/snapshot.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '1111111111111111111111111111111111111111'

describe('U12: base commit = target commit -> UP-I01, no download', () => {
  it('(a) range.json names the target commit as upstream.commit', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: FIXED_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
      expect(ioHelper.stdoutText).toContain(FIXED_COMMIT)
      expect(ioHelper.stdoutText).toContain('3.0.0')
      expect(ioHelper.stderrText).not.toContain('UP-I01')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) no range.json, --from names the target commit directly', async () => {
    const fixture = await makeFixtureRange({})
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', FIXED_COMMIT], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
      expect(ioHelper.stdoutText).toContain(FIXED_COMMIT)
      expect(ioHelper.stdoutText).toContain('3.0.0')
      expect(ioHelper.stderrText).not.toContain('UP-I01')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U13: base version above the target -> UP-E07 before any download', () => {
  it('range.json names a higher version than the default target 3.0.0', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.1.0', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E07/m)
      expect(ioHelper.stderrText).toContain('3.1.0')
      expect(ioHelper.stderrText).toContain('3.0.0')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U50: base version below 3.0.0 -> UP-E10 before any download', () => {
  it('(a) range.json names a version below 3.0.0', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '2.9.9', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E10/m)
      expect(ioHelper.stderrText).toContain(jsonValue('2.9.9'))
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) no range.json, --from names a version below 3.0.0', async () => {
    const fixture = await makeFixtureRange({})
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', '2.9.9'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E10/m)
      expect(ioHelper.stderrText).toContain(jsonValue('2.9.9'))
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U14: equal versions, different commits', () => {
  const OVERRIDE_COMMIT = '2222222222222222222222222222222222222222'

  it('(a) with CREATE_WXL_COMMIT override: CW-W04, both pristine ranges built at checkpoint step-8, then removed', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) },
        [OVERRIDE_COMMIT]: { body: pristineArchive(OVERRIDE_COMMIT) },
      })
      let inspected = false
      const checkpoint = vi.fn((name) => {
        if (name !== 'step-8') return
        const entries = readdirSync(tmpRoot).filter((entryName) => entryName.startsWith('create-wxl-upgrade-'))
        expect(entries.length).toBe(2)
        for (const entry of entries) {
          const dir = join(tmpRoot, entry)
          expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(CHANGELOG_PRISTINE)
          const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
          expect(pkg.version).toBe('0.1.0')
        }
        inspected = true
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: { ...fixture.env, CREATE_WXL_COMMIT: OVERRIDE_COMMIT },
        runGit: vi.fn(createSpawnGitRunner()),
        fetchArchive,
        checkpoint,
      })
      const ioHelper = makeIo()
      await run(['upgrade'], ioHelper.io, deps)

      expect(inspected).toBe(true)
      expect(checkpoint).toHaveBeenCalledWith('step-8')
      expect(ioHelper.stderrText).toContain('CW-W04')
      const refs = fetchArchive.mock.calls.map((call) => call[1]).sort()
      expect(refs).toEqual([BASE_COMMIT, OVERRIDE_COMMIT].sort())
      expect(ioHelper.stdoutText).not.toContain('UP-I01')
      expect(ioHelper.stderrText).not.toContain('UP-I01')
      expect(readdirSync(tmpRoot).filter((entryName) => entryName.startsWith('create-wxl-upgrade-'))).toEqual([])
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) without override: exit 0, UP-I01, no download', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('D3: file-system errors under tmpRoot in step 7', () => {
  async function makeBaseFixture() {
    return makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } },
    })
  }

  it('(a) deps.tmpRoot points to a missing directory -> CW-E09 naming it, tmpRoot still absent', async () => {
    const fixture = await makeBaseFixture()
    const ownedTmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    const tmpRoot = join(ownedTmpRoot, 'missing')
    try {
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.1.0',
        source: { version: '3.1.0' },
        fetchArchive,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E09/m)
      expect(ioHelper.stderrText).toContain(jsonValue(tmpRoot))
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(ownedTmpRoot, { recursive: true, force: true })
    }
  })

  it("(b) the target's first extracted write fails -> CW-E09, the base's own (already built) directory is also removed", async () => {
    const fixture = await makeBaseFixture()
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const targetEntries = [
        { path: '0-target-only.txt', type: 'file', mode: 0o644, content: 'target only\n' },
        ...PRISTINE_FIXTURE,
      ]
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
      })
      const writeFile = failAt('writeFile', (count, args) => (args[0].endsWith('0-target-only.txt') ? fsError('EACCES') : null))
      const { fs } = recordingFs({ writeFile })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.1.0',
        source: { version: '3.1.0' },
        fetchArchive,
        fs,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E09/m)
      expect(ioHelper.stderrText).toContain(tmpRoot)
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it("(c) the base's own P3 write fails -> CW-E09, no target directory is ever created", async () => {
    const fixture = await makeBaseFixture()
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const basePackageJson = JSON.stringify({ name: 'wxl-base', version: '3.0.0' }, null, 2) + '\n'
      const baseEntries = PRISTINE_FIXTURE.map((entry) =>
        entry.path === 'package.json' ? { ...entry, content: basePackageJson } : entry,
      )
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const writeFile = failAt('writeFile', (count, args) =>
        args[1].includes('"version": "0.1.0"') && args[1].includes('wxl-base') ? fsError('EACCES') : null,
      )
      const { fs } = recordingFs({ writeFile })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.1.0',
        source: { version: '3.1.0' },
        fetchArchive,
        fs,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E09/m)
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U51: --from <commit> base version resolved only after download', () => {
  function baseEntriesWithVersion(version) {
    const content =
      version === undefined
        ? JSON.stringify({ name: 'wxl-base' }, null, 2) + '\n'
        : JSON.stringify({ name: 'wxl-base', version }, null, 2) + '\n'
    return PRISTINE_FIXTURE.map((entry) => (entry.path === 'package.json' ? { ...entry, content } : entry))
  }

  async function runCase(version) {
    const fixture = await makeFixtureRange({})
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntriesWithVersion(version) }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()), fetchArchive })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', BASE_COMMIT], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const refs = fetchArchive.mock.calls.map((call) => call[1]).sort()
      return { exitCode, ioHelper, refs, before, after, beforeTmp, afterTmp }
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }

  const DOWNLOAD_AFTER_CASES = [
    ['(a) version 3.1.0, above the target 3.0.0 -> UP-E07', '3.1.0', 'UP-E07'],
    ['(c) version 2.9.9, below the 3.0.0 floor -> UP-E10', '2.9.9', 'UP-E10'],
    ['(d1) package.json without a version field -> UP-E10', undefined, 'UP-E10'],
    ['(d2) version 3.0 does not match X.Y.Z -> UP-E10', '3.0', 'UP-E10'],
  ]

  it.each(DOWNLOAD_AFTER_CASES)('%s, nothing written, no residue', async (_label, version, expectedCode) => {
    const { exitCode, ioHelper, refs, before, after, beforeTmp, afterTmp } = await runCase(version)

    expect(exitCode).toBe(1)
    expect(ioHelper.stderrText).toMatch(new RegExp(`^${expectedCode}`, 'm'))
    expect(refs).toEqual([BASE_COMMIT, FIXED_COMMIT].sort())
    expect(afterTmp).toEqual(beforeTmp)
    expect(after).toEqual(before)
  })

  it('(b) version 3.0.0, no CREATE_WXL_COMMIT -> exit 0, UP-I01 on stdout only', async () => {
    const { exitCode, ioHelper, refs, before, after, beforeTmp, afterTmp } = await runCase('3.0.0')

    expect(exitCode).toBe(0)
    expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
    expect(ioHelper.stderrText).not.toContain('UP-I01')
    expect(refs).toEqual([BASE_COMMIT, FIXED_COMMIT].sort())
    expect(afterTmp).toEqual(beforeTmp)
    expect(after).toEqual(before)
  })
})

describe('U52: --from <version> resolving to the target commit -> UP-I01, nothing written', () => {
  const CASES = [
    ["(a) --from 3.1.0, target 3.2.0, tag's commit equals the target's", '3.1.0', '3.2.0'],
    ["(b) --from 3.2.0, target 3.2.0, tag's commit equals the target's", '3.2.0', '3.2.0'],
  ]

  it.each(CASES)('%s', async (_label, fromVersion, targetVersion) => {
    const fixture = await makeFixtureRange({})
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const tagRef = `refs/tags/v${fromVersion}`
      const fetchArchive = makeRefFetchArchive({
        [tagRef]: { body: tagArchive(fromVersion, { comment: FIXED_COMMIT }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: targetVersion,
        source: { version: targetVersion },
        fetchArchive,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', fromVersion], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
      const refs = fetchArchive.mock.calls.map((call) => call[1])
      expect(refs).toContain(tagRef)
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U16: --from <version> tag archive comment missing or not 40 lowercase hex -> UP-E08', () => {
  const CASES = [
    ['no pax global header', undefined],
    ['40 characters with one uppercase letter', `${'a'.repeat(39)}B`],
    ['39 characters', 'a'.repeat(39)],
    ['41 characters', 'a'.repeat(41)],
    ['40 characters with one non-hex character', `${'a'.repeat(39)}g`],
  ]

  it.each(CASES)('%s -> UP-E08 naming v3.1.0, nothing written', async (_label, comment) => {
    const fixture = await makeFixtureRange({})
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        'refs/tags/v3.1.0': { body: tagArchive('3.1.0', { comment }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.2.0',
        source: { version: '3.2.0' },
        fetchArchive,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', '3.1.0'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E08/m)
      expect(ioHelper.stderrText).toContain('v3.1.0')
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U15: either archive rejected, hostile, or lacking a P1/P2 marker -> the 0005 code, nothing written', () => {
  function brokenEntries(kind) {
    if (kind === 'rule1') {
      return [...PRISTINE_FIXTURE, { path: 'bad-link', type: 'symlink', linkpath: 'CHANGELOG.md', mode: 0o777 }]
    }
    if (kind === 'missing-p1') return PRISTINE_FIXTURE.filter((e) => e.path !== 'CHANGELOG.md')
    if (kind === 'missing-p2') return PRISTINE_FIXTURE.filter((e) => e.path !== '.proj.specs/OPEN-QUESTIONS.md')
    throw new Error(`unknown kind ${kind}`)
  }

  const CASES = [
    ['base fetch failure (status 404)', 'base', 'fetch', 'CW-E07'],
    ['target fetch failure (rejected)', 'target', 'fetch', 'CW-E07'],
    ['base rule 1 (symbolic-link entry)', 'base', 'rule1', 'CW-E08'],
    ['target rule 1 (symbolic-link entry)', 'target', 'rule1', 'CW-E08'],
    ['base missing CHANGELOG.md (P1)', 'base', 'missing-p1', 'CW-E10'],
    ['target missing CHANGELOG.md (P1)', 'target', 'missing-p1', 'CW-E10'],
    ['base missing .proj.specs/OPEN-QUESTIONS.md (P2)', 'base', 'missing-p2', 'CW-E10'],
    ['target missing .proj.specs/OPEN-QUESTIONS.md (P2)', 'target', 'missing-p2', 'CW-E10'],
  ]

  it.each(CASES)('%s -> %s, nothing written, no create-wxl-upgrade- entry left', async (_label, which, kind, expectedCode) => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      let fetchArchive
      if (kind === 'fetch') {
        fetchArchive = makeRefFetchArchive({
          [BASE_COMMIT]: which === 'base' ? { status: 404, body: Buffer.alloc(0) } : { body: pristineArchive(BASE_COMMIT) },
          [FIXED_COMMIT]: which === 'target' ? new Error('network down') : { body: pristineArchive(FIXED_COMMIT) },
        })
      } else {
        const entries = brokenEntries(kind)
        fetchArchive = makeRefFetchArchive({
          [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: which === 'base' ? entries : PRISTINE_FIXTURE }) },
          [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: which === 'target' ? entries : PRISTINE_FIXTURE }) },
        })
      }
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.1.0',
        source: { version: '3.1.0' },
        fetchArchive,
      })
      const before = await snapshotTree(fixture.root)
      const beforeTmp = withoutRootMtime(await snapshotTree(tmpRoot))
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      const afterTmp = withoutRootMtime(await snapshotTree(tmpRoot))

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(new RegExp(`^${expectedCode}`, 'm'))
      expect(afterTmp).toEqual(beforeTmp)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
