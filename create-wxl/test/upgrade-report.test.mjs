// 0006-S1 step 10 (traceability.md "Report"): a completed run exits 0 whether or not it has
// attention items (U25); this file also covers U59, U26, U62, U72 and U76.

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
import { makeRangeRepo } from './helpers/range-repo.mjs'
import { PRISTINE_FIXTURE, README_CONTENT } from './helpers/fixtures.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { en, zhTW } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'
import { buildReport } from '../src/upgrade-report.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '6'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

// U17's own 13 branches (upgrade-merge.test.mjs's `ALL_BRANCHES`), plus `P2-both-equal` and
// `teacher-owned` (U21) -- 15 entries in all -- reused here so R2's counts and R3's attention
// items are exactly U17's.
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

// U17's own attention items (upgrade-merge.test.mjs's `describe('merge table (U17)')` `it`), in
// R3's sorted-by-path order, with UP-A12 last (M5-updated's README.md is an anchor file that
// diverges between base and target).
const U17_ATTENTION = [
  { code: 'UP-A2', path: 'm11-binary.bin' },
  { code: 'UP-A1', path: 'm12-conflict.txt' },
  { code: 'UP-A5', path: 'm7-teacher-deleted.txt' },
  { code: 'UP-A3', path: 'm8-teacher-edited.txt' },
  { code: 'UP-A4', path: 'm9-new-both-sides.txt' },
  { code: 'UP-A6', path: 'pnpm-lock.yaml' },
  { code: 'UP-A12' },
]

/** Each R3 line, in `table`'s (en or zh-TW) own words: the attention code's own message text
 * (which begins with its code), followed by the path for every code but UP-A12 (traceability.md
 * "Fork:init-derived content": UP-A12 is not tied to one path). */
function expectedR3Lines(table) {
  return U17_ATTENTION.map((item) =>
    item.path === undefined ? `R3: ${table[item.code]()}` : `R3: ${table[item.code]()} ${jsonValue(item.path)}`,
  )
}

/** The index of the first line beginning with `id` (e.g. `'R1:'`), or the index of the last one
 * when `last` is true -- used to assert R1..R5 appear in that order (item 1). */
function idIndex(lines, id, { last = false } = {}) {
  const indices = lines.reduce((acc, line, i) => (line.startsWith(id) ? [...acc, i] : acc), [])
  return last ? indices[indices.length - 1] : indices[0]
}

// D16 (traceability.md "Report" R4; T-0063): printed only when R3 holds UP-A1.
const R4_BASE_SECTION_EN =
  'R4: in a conflict block, the section after ||||||| is the text of the base version in R1; ' +
  'if that base is not the version the range came from, run the R5 commands first'
const R4_BASE_SECTION_ZH = 'R4: 衝突區塊裡 ||||||| 之後的段落是 R1 所列 base 版本的內容；如果這個 base 不是靶場原本所依據的版本，請先執行 R5 的指令'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

async function runUpgradeAgainst(fixture, argv = ['upgrade']) {
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
  const exitCode = await run(argv, ioHelper.io, deps)
  return { exitCode, ioHelper, tmpRoot }
}

/** The file's bytes, or `null` when it does not exist. */
async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
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
      // Item 2 (T-0027 verification follow-up): the rendered UP-A12 line is the en message
      // itself, not a bare code -- production renders it through t2 (traceability.md:159-161).
      expect(r3Lines).toEqual([`R3: ${en['UP-A12']()}`])
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
      expect(r3Lines).toEqual([`R3: ${en['UP-A12']()}`])
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  // T-0027 verification follow-up (item 4, approved sub-case, 2026-11-09): B has `README.md`; T
  // has only `readme.md`, with the SAME bytes (a case-only rename upstream). Anchor files are
  // read by their exact listed name (traceability.md:159-161): `README.md` is present in B,
  // absent in T (T's own entry is a different, exact path), so b != t for the anchor path --
  // exactly one UP-A12 line, regardless of what the filesystem's own case folding would resolve.
  it("adds exactly one UP-A12 line when an anchor file is only a case-only rename upstream (README.md -> readme.md, same bytes)", async () => {
    const rangeRepo = await makeRangeRepo({ tree: { 'teacher-owned.txt': "the teacher's own file\n" }, rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const baseEntries = [...PRISTINE_FIXTURE]
      const targetEntries = [
        ...PRISTINE_FIXTURE.filter((entry) => entry.path !== 'README.md'),
        { path: 'readme.md', type: 'file', mode: 0o644, content: README_CONTENT },
      ]
      tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
      }, { releases: { [BASE_VERSION]: BASE_COMMIT } })
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
      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      const upA12Lines = r3Lines.filter((line) => line === `R3: ${en['UP-A12']()}`)
      expect(upA12Lines).toEqual([`R3: ${en['UP-A12']()}`])
    } finally {
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// T-0027 increment 21 (U26): the full R1-R5 report, in both languages, plus
// the `--from`/base-version-display case and R4's two conditional bullets.
describe('report text (U26)', () => {
  it('renders R1-R5 in full, in en, R1..R5 in order, each R3 line its own code\'s message text', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ALL_BRANCHES, rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      const lines = result.ioHelper.stdoutText.split('\n')

      const r1 = idIndex(lines, 'R1:')
      const r2 = idIndex(lines, 'R2:')
      const r3First = idIndex(lines, 'R3:')
      const r3Last = idIndex(lines, 'R3:', { last: true })
      const r4First = idIndex(lines, 'R4:')
      const r5 = idIndex(lines, 'R5:')
      expect(r1).toBeGreaterThanOrEqual(0)
      expect(r2).toBeGreaterThan(r1)
      expect(r3First).toBeGreaterThan(r2)
      expect(r4First).toBeGreaterThan(r3Last)
      expect(r5).toBeGreaterThan(r4First)

      // R1 (m16, "Needs a user decision" §10, approved option (a)): the running tool's own
      // version and the target's own version are both "3.1.0" by the approved table's blanket
      // setting -- told apart only by their position in this exact, literal line, never by a
      // distinguishing value.
      expect(lines[r1]).toBe(
        `R1: create-wxl "3.1.0"; base "3.0.0" (commit "${BASE_COMMIT}"); target "3.1.0" (commit "${FIXED_COMMIT}")`,
      )
      expect(lines[r2]).toBe('R2: updated 2 added 1 deleted 1') // same counts as U17.
      // D16 (T-0063): then one line per path M6 deleted, without a code.
      expect(lines.filter((line) => line.startsWith('R2:'))).toEqual([lines[r2], `R2: ${jsonValue('m6-upstream-removed.txt')}`])

      const r3Lines = lines.filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual(expectedR3Lines(en))

      const r4Lines = lines.filter((line) => line.startsWith('R4:'))
      expect(r4Lines).toEqual([
        'R4: run git status and git diff',
        'R4: resolve the conflict markers above (search for <<<<<<<) and the other attention items',
        R4_BASE_SECTION_EN, // R3 holds UP-A1 (M12-conflict).
        'R4: run pnpm install', // ALL_BRANCHES' M10 writes pnpm-lock.yaml.
        'R4: build and test',
        'R4: commit',
      ])
      // R5 also warns to use the restore commands only BEFORE making other changes
      // (traceability.md "Report" R5; spec.en.md B4) -- not the bare commands alone.
      expect(lines[r5]).toBe('R5: to undo the whole upgrade before making other changes, run git checkout -- . && git clean -fd')
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  })

  it('renders R1-R5 in full, in zh-TW, R1..R5 in order, each R3 line its own code\'s zh-TW message text', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ALL_BRANCHES, rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, ['--lang', 'zh-TW', 'upgrade'])
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      const lines = result.ioHelper.stdoutText.split('\n')

      const r1 = idIndex(lines, 'R1:')
      const r2 = idIndex(lines, 'R2:')
      const r3First = idIndex(lines, 'R3:')
      const r3Last = idIndex(lines, 'R3:', { last: true })
      const r4First = idIndex(lines, 'R4:')
      const r5 = idIndex(lines, 'R5:')
      expect(r1).toBeGreaterThanOrEqual(0)
      expect(r2).toBeGreaterThan(r1)
      expect(r3First).toBeGreaterThan(r2)
      expect(r4First).toBeGreaterThan(r3Last)
      expect(r5).toBeGreaterThan(r4First)

      // R1/R2/R5, in the run's language too (traceability.md:206): the zh-TW wording differs
      // from en's in its words (0005's "Language" rule), while the commit hashes, versions and
      // the two R5 commands stay the same literal text in both languages.
      expect(lines[r1]).toBe(
        `R1: create-wxl "3.1.0"；base 版本 "3.0.0"（commit "${BASE_COMMIT}"）；target 版本 "3.1.0"（commit "${FIXED_COMMIT}"）`,
      )
      expect(lines[r2]).toBe('R2: 更新 2 新增 1 刪除 1')
      expect(lines.filter((line) => line.startsWith('R2:'))).toEqual([lines[r2], `R2: ${jsonValue('m6-upstream-removed.txt')}`])
      expect(lines[r1]).not.toBe(
        `R1: create-wxl "3.1.0"; base "3.0.0" (commit "${BASE_COMMIT}"); target "3.1.0" (commit "${FIXED_COMMIT}")`,
      )
      expect(lines[r2]).not.toBe('R2: updated 2 added 1 deleted 1')

      const r3Lines = lines.filter((line) => line.startsWith('R3:'))
      expect(r3Lines).toEqual(expectedR3Lines(zhTW))
      expect(r3Lines).not.toEqual(expectedR3Lines(en))

      const r4Lines = lines.filter((line) => line.startsWith('R4:'))
      expect(r4Lines).toEqual([
        'R4: 執行 git status 與 git diff',
        'R4: 處理上面的衝突標記（搜尋 <<<<<<<）與其他注意項目',
        R4_BASE_SECTION_ZH, // R3 有 UP-A1（M12-conflict）。
        'R4: 執行 pnpm install', // ALL_BRANCHES' M10 寫入 pnpm-lock.yaml。
        'R4: build 並測試',
        'R4: commit',
      ])
      // R5 also warns to use the restore commands only BEFORE making other changes
      // (traceability.md "Report" R5; spec.en.md B4).
      expect(lines[r5]).toBe('R5: 如果要撤銷整個升級，請在做其他變更之前執行 git checkout -- . && git clean -fd')
      expect(lines[r5]).not.toBe('R5: to undo the whole upgrade before making other changes, run git checkout -- . && git clean -fd')
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

// U72 (traceability.md revision 3.1, D16; T-0063): R2 lists every M6 path after the counts, sorted
// by UTF-16 code units, without a code; R4's D16 line follows whether R3 holds UP-A1.
describe('R2 lists M6 paths and R4 explains the ||||||| section (U72, D16)', () => {
  for (const [lang, argv, d16] of [
    ['en', ['upgrade'], R4_BASE_SECTION_EN],
    ['zh-TW', ['--lang', 'zh-TW', 'upgrade'], R4_BASE_SECTION_ZH],
  ]) {
    it(`${lang}: three M6 paths and an UP-A1 item -> R2 path lines B.md, a/b.md, z.md; the D16 line present`, async () => {
      const fixture = await buildUpgradeFixtures({ branches: ['U72-m6-three', 'M12-conflict'], rangeJson: rangeJsonFor(BASE_COMMIT) })
      let tmpRoot
      try {
        const result = await runUpgradeAgainst(fixture, argv)
        tmpRoot = result.tmpRoot
        expect(result.exitCode).toBe(0)
        const lines = result.ioHelper.stdoutText.split('\n')
        const r2Lines = lines.filter((line) => line.startsWith('R2:'))
        // The deleted count equals the number of path lines (traceability.md "Report" R2).
        expect(r2Lines[0]).toMatch(lang === 'en' ? / deleted 3$/ : / 刪除 3$/)
        expect(r2Lines.slice(1)).toEqual(['B.md', 'a/b.md', 'z.md'].map((path) => `R2: ${jsonValue(path)}`))
        expect(lines.filter((line) => line.startsWith('R4:'))).toContain(d16)
      } finally {
        await cleanupFixture(fixture, tmpRoot)
      }
    })

    it(`${lang}: the same M6 paths and no UP-A1 item -> the same R2 path lines; no D16 line`, async () => {
      const fixture = await buildUpgradeFixtures({ branches: ['U72-m6-three'], rangeJson: rangeJsonFor(BASE_COMMIT) })
      let tmpRoot
      try {
        const result = await runUpgradeAgainst(fixture, argv)
        tmpRoot = result.tmpRoot
        expect(result.exitCode).toBe(0)
        const lines = result.ioHelper.stdoutText.split('\n')
        expect(lines.filter((line) => line.startsWith('R2:')).slice(1)).toEqual(
          ['B.md', 'a/b.md', 'z.md'].map((path) => `R2: ${jsonValue(path)}`),
        )
        expect(lines.some((line) => line.includes('|||||||'))).toBe(false)
      } finally {
        await cleanupFixture(fixture, tmpRoot)
      }
    })
  }
})

// U76 (traceability.md revision 3.1, R4; T-0063): R4's `pnpm install` and `v*` tag lines follow
// their conditions. Confirmation: the code predates the row; each case also checks what the run wrote.
describe("R4's conditional lines (U76)", () => {
  const PNPM = 'R4: run pnpm install'
  const TAG = 'R4: push a new v* tag to deploy'
  for (const { name, branches, written, pnpm, tag } of [
    { name: 'writes package.json (M5), no deploy workflow', branches: ['U76-package-json'], written: 'package.json', pnpm: true, tag: false },
    { name: 'writes pnpm-lock.yaml (M5) but not package.json, with a deploy workflow', branches: ['U76-lock-m5', 'U26-deploy-workflow'], written: 'pnpm-lock.yaml', pnpm: true, tag: true },
    { name: 'writes neither, no deploy workflow', branches: ['M6'], written: undefined, pnpm: false, tag: false },
  ]) {
    it(`${name} -> pnpm install ${pnpm ? 'present' : 'absent'}; v* tag ${tag ? 'present' : 'absent'}`, async () => {
      const fixture = await buildUpgradeFixtures({ branches, rangeJson: rangeJsonFor(BASE_COMMIT) })
      let tmpRoot
      try {
        const before = {
          'package.json': await readOptional(join(fixture.root, 'package.json')),
          'pnpm-lock.yaml': await readOptional(join(fixture.root, 'pnpm-lock.yaml')),
        }
        const result = await runUpgradeAgainst(fixture)
        tmpRoot = result.tmpRoot
        expect(result.exitCode).toBe(0)
        // The run did write the file (the pristine target rewrites package.json's version, so the
        // check is on the content upstream changed, not on the archive's bytes).
        if (written === 'package.json') expect(await readFile(join(fixture.root, written), 'utf8')).toContain('sim:noop')
        if (written === 'pnpm-lock.yaml') expect(await readFile(join(fixture.root, written), 'utf8')).toBe('lockfile v1 target\n')
        // Neither dependency file the case does not name was written (stage 6, B3).
        for (const other of ['package.json', 'pnpm-lock.yaml'].filter((path) => path !== written)) {
          expect(await readOptional(join(fixture.root, other))).toEqual(before[other])
        }
        const r4Lines = result.ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R4:'))
        expect(r4Lines.includes(PNPM)).toBe(pnpm)
        expect(r4Lines.includes(TAG)).toBe(tag)
      } finally {
        await cleanupFixture(fixture, tmpRoot)
      }
    })
  }

  // `planMerge` already sorts its ops, so the runs above cannot tell whether `buildReport` sorts R2's
  // path lines itself; this calls it with the deletes out of order (stage 6, B2).
  it('buildReport sorts R2 path lines itself, by UTF-16 code units, whatever order the ops come in', () => {
    const report = buildReport({
      lang2: 'en',
      toolVersion: TARGET_VERSION,
      baseVersion: BASE_VERSION,
      baseCommit: BASE_COMMIT,
      targetVersion: TARGET_VERSION,
      targetCommit: FIXED_COMMIT,
      ops: ['z.md', 'a/b.md', 'B.md'].map((path) => ({ path, action: 'delete' })),
      attention: [],
      hasDeployWorkflow: false,
      t2: en,
    })
    expect(report.split('\n').filter((line) => line.startsWith('R2:'))).toEqual([
      'R2: updated 0 added 0 deleted 3',
      ...['B.md', 'a/b.md', 'z.md'].map((path) => `R2: ${jsonValue(path)}`),
    ])
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
      // Item 5 (verification follow-up, tightened to the approved boundary condition): nothing
      // is written in the range -- a whole-tree snapshot (including `.git`), taken before any of
      // this check's own git/fs calls that could otherwise add their own incidental noise.
      const snapshotBefore = await snapshotTree(fixture.root)

      const result = await runUpgradeAgainst(fixture)
      tmpRoot = result.tmpRoot

      const snapshotAfter = await snapshotTree(fixture.root)
      expect(snapshotAfter).toEqual(snapshotBefore)

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

// U71 (traceability.md revision 3.1, D17; T-0061): R1 says when a `--from <commit>` base was not
// checked against an upstream tag; a `--from <version>` base (its tag's commit) and a base read
// from range.json (J6) are checked, so R1 says nothing there. Both languages.
describe('R1 marks a --from <commit> base as not checked against an upstream tag (U71)', () => {
  const NOT_CHECKED = { en: 'not checked against an upstream tag', 'zh-TW': '沒有比對上游的 tag' }

  async function r1For(argv) {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: rangeJsonFor(BASE_COMMIT) })
    let tmpRoot
    try {
      const result = await runUpgradeAgainst(fixture, argv)
      tmpRoot = result.tmpRoot
      expect(result.exitCode).toBe(0)
      return result.ioHelper.stdoutText.split('\n').find((line) => line.startsWith('R1:'))
    } finally {
      await cleanupFixture(fixture, tmpRoot)
    }
  }

  it.each([
    ['--from <commit>, en -> present', ['upgrade', '--from', BASE_COMMIT], 'en', true],
    ['--from <commit>, zh-TW -> present', ['--lang', 'zh-TW', 'upgrade', '--from', BASE_COMMIT], 'zh-TW', true],
    ['--from <version>, en -> absent', ['upgrade', '--from', BASE_VERSION], 'en', false],
    ['--from <version>, zh-TW -> absent', ['--lang', 'zh-TW', 'upgrade', '--from', BASE_VERSION], 'zh-TW', false],
    ['range.json, en -> absent', ['upgrade'], 'en', false],
    ['range.json, zh-TW -> absent', ['--lang', 'zh-TW', 'upgrade'], 'zh-TW', false],
  ])('%s', async (_label, argv, lang, present) => {
    const r1 = await r1For(argv)
    expect(r1).toBeDefined()
    if (present) expect(r1).toContain(NOT_CHECKED[lang])
    else {
      expect(r1).not.toContain(NOT_CHECKED.en)
      expect(r1).not.toContain(NOT_CHECKED['zh-TW'])
    }
  })
})
