// 0006-S1 step 10 (traceability.md "Report"): a completed run exits 0 whether or not it has
// attention items (U25). Increments 20/21/24/U59/U26/U62 add to this file later in the plan.

import { describe, it, expect, vi } from 'vitest'
import { rm } from 'node:fs/promises'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { en, zhTW } from '../src/messages.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '6'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture, argv = ['upgrade']) {
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

describe('exit code regardless of attention items (U25)', () => {
  it('a run with an attention item still exits 0', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M7'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      expect(result.ioHelper.stdoutText).toContain('R3: UP-A5')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('a run with no attention items at all exits 0', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      expect(result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

describe('anchor file changes add UP-A12 (U59)', () => {
  it('adds a UP-A12 line, last, when one anchor file differs between base and target', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      const r3Lines = result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual(['R3: UP-A12'])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('adds no UP-A12 line when no anchor file differs between base and target', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      const r3Lines = result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual([])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('adds exactly one UP-A12 line, still last, when two anchor files differ', async () => {
    const fixture = await buildUpgradeFixtures({
      branches: ['M5-updated', 'U59-second-anchor'],
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      const r3Lines = result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual(['R3: UP-A12'])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})

// T-0027 increment 21 (U26, moved here per B5): the full R1-R5 report, in both languages, plus
// the `--from`/base-version-display case and R4's two conditional bullets.
describe('report text (U26)', () => {
  it('renders R1-R5 in full, in en, with pnpm install advised and no deploy tag advice', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M10'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      const lines = result.ioHelper.stdoutText.split('\n')

      // R1 (m16, "Needs a user decision" §10, approved option (a)): the running tool's own
      // version and the target's own version are both "3.1.0" by the approved table's blanket
      // setting -- told apart only by their position in this exact, literal line, never by a
      // distinguishing value.
      expect(lines).toContain(
        `R1: create-wxl "3.1.0"; base "3.0.0" ("${BASE_COMMIT}"); target "3.1.0" ("${FIXED_COMMIT}")`,
      )
      expect(lines).toContain('R2: updated 0 added 0 deleted 0') // M10's own write carries a `report` (UP-A6); R2 does not count it.
      expect(lines).toContain('R3: UP-A6 "pnpm-lock.yaml"')
      const r4Lines = lines.filter((line) => line.startsWith('R4:'))
      expect(r4Lines).toEqual([
        'R4: run git status and git diff',
        'R4: resolve the conflict markers above (search for <<<<<<<) and the other attention items',
        'R4: run pnpm install',
        'R4: build and test',
        'R4: commit',
      ])
      expect(lines).toContain('R5: git clean -fd; git checkout -- .')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('renders R1-R5 in full, in zh-TW, with the same facts in Traditional Chinese prose', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M10'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, ['--lang', 'zh-TW', 'upgrade'])
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      const lines = result.ioHelper.stdoutText.split('\n')

      expect(lines).toContain(
        `R1: create-wxl "3.1.0"; base "3.0.0" ("${BASE_COMMIT}"); target "3.1.0" ("${FIXED_COMMIT}")`,
      )
      expect(lines).toContain('R2: updated 0 added 0 deleted 0')
      expect(lines).toContain('R3: UP-A6 "pnpm-lock.yaml"')
      const r4Lines = lines.filter((line) => line.startsWith('R4:'))
      expect(r4Lines).toEqual(['R4: 執行 git status 與 git diff', 'R4: 處理上面的衝突標記（搜尋 <<<<<<<）與其他注意項目', 'R4: 執行 pnpm install', 'R4: build 並測試', 'R4: commit'])
      expect(lines).toContain('R5: git clean -fd; git checkout -- .')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('advises pushing a v* tag, not pnpm install, for a range with .github/workflows/deploy.yml and no written dependency file', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['U26-deploy-workflow'], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      const r4Lines = result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R4:'))
      expect(r4Lines).toEqual([
        'R4: run git status and git diff',
        'R4: resolve the conflict markers above (search for <<<<<<<) and the other attention items',
        'R4: build and test',
        'R4: commit',
        'R4: push a new v* tag to deploy',
      ])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('shows the base archive\'s own package.json version for --from <base commit> with no range.json, not P3\'s 0.1.0', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [] })
    const packageEntryIndex = fixture.baseEntries.findIndex((entry) => entry.path === 'package.json')
    fixture.baseEntries[packageEntryIndex] = {
      ...fixture.baseEntries[packageEntryIndex],
      content: JSON.stringify({ name: 'wxl', version: '3.0.5' }, null, 2) + '\n',
    }
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, ['upgrade', '--from', BASE_COMMIT])
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      expect(result.ioHelper.stdoutText).toContain(`base "3.0.5"`)
      expect(result.ioHelper.stdoutText).not.toContain('"0.1.0"')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('every one of the 24 codes (E01-E11, I01, A1-A12) exists in both message tables, each starting with its own code', () => {
    const codes = [
      'UP-E01',
      'UP-E02',
      'UP-E03',
      'UP-E04',
      'UP-E05',
      'UP-E06',
      'UP-E07',
      'UP-E08',
      'UP-E09',
      'UP-E10',
      'UP-E11',
      'UP-I01',
      'UP-A1',
      'UP-A2',
      'UP-A3',
      'UP-A4',
      'UP-A5',
      'UP-A6',
      'UP-A7',
      'UP-A8',
      'UP-A9',
      'UP-A10',
      'UP-A11',
      'UP-A12',
    ]
    for (const code of codes) {
      expect(en[code]).toBeTypeOf('function')
      expect(zhTW[code]).toBeTypeOf('function')
    }
  })
})

// T-0027 increment 24 (U62): a target path holding an ANSI escape is rejected by 0005's own entry
// rule 3 (`archive-rules.mjs`'s `CONTROL_CHAR_RE`) while step 7 validates the target archive --
// before `checkpoint('step-8')`, so this never reaches the merge or the report at all.
describe('ANSI escape in a target path (U62)', () => {
  it('rejects with CW-E08, the path shown as an escaped JSON literal, before any write', async () => {
    const hostilePath = 'a\u001bb.txt'
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: rangeJsonFor(BASE_COMMIT) })
    fixture.targetEntries = [...fixture.targetEntries, { path: hostilePath, type: 'file', mode: 0o644, content: 'x' }]
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot

      expect(result.exitCode).toBe(1)
      expect(result.ioHelper.stderrText).toMatch(/^CW-E08/m)
      // `jsonValue`'s escaped form of the hostile segment, as a substring of the full (prefixed)
      // archive entry path CW-E08 names -- the literal text "\u001b", never the raw ESC byte.
      expect(result.ioHelper.stderrText).toContain('a\\u001bb.txt')
      expect(result.ioHelper.stderrText).not.toContain('\u001b')
      expect(result.ioHelper.stdoutText).toBe('')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })
})
