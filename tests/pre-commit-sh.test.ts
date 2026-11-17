/**
 * Tests for scripts/pre-commit.sh (seam 0007-S5).
 *
 * Every case runs this checkout's real hook, by its absolute path, with `bash`
 * at the top level of a temporary repository whose path holds a space and
 * non-ASCII characters: directly, or through a real `git commit` whose
 * installed `.git/hooks/pre-commit` runs that file. The fixtures are described in
 * `tests/__helpers__/preCommitRepo.ts`: the default is the `en` one (`range.json` names `en`);
 * a case that also runs under `P = zh-TW` swaps in the `zh-TW` one (no `range.json`) with
 * `useFixture`, and the cases of spec 0010 that say "both P" run under both.
 *
 * The oracle for "the expected `_redirects`" is `generateRedirects` over
 * `git checkout-index --all` of the staged snapshot, taken before the hook
 * runs. The commit-form cases (H32, H34–H38) take it over the index git
 * handed the hook, which the recording shim copied before the hook ran: for
 * `-p` and `-i` that `index.lock` is the only index holding the staged
 * snapshot. A case that ends in O2 also pins its rule lines with literals: the
 * whole of FIXTURE_RULES where the staged challenges are the fixture's, the
 * whole list built from the literal parts below where its change moves a
 * challenge's four rules (spec 0008), or else the lines its change adds or
 * removes. H05, H24 and H43 pin HEAD's
 * committed bytes instead, which do not come from the oracle.
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { generateRedirects } from '../scripts/generate-redirects'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { LOCALES, LOCALE_ENGLISH_NAMES, type Locale } from '../.vitepress/locales'
import { nextChallengeNumber } from '../scripts/challenge-numbers'
import { jsonStringifyEscaped } from '../.vitepress/layout-error'
import {
  HOOK,
  REDIRECTS,
  addWorktree,
  blockingGenerator,
  buildFirstCommitFixture,
  buildFixture,
  declarationText,
  commit,
  cloneFixture,
  expectedRedirects,
  git,
  gitChildBlocker,
  gitRun,
  gitWrapper,
  killStrayGroups,
  lines,
  lockingGenerator,
  markerDir,
  physicalPath,
  read,
  readBlockingRecord,
  readRecord,
  realRepoState,
  recordScript,
  recordingShim,
  removeRepo,
  rulesOf,
  runHook,
  snapshot,
  stagedRedirects,
  startGroup,
  stashList,
  waitForFile,
  withoutPaths,
  write,
  writeBrief,
  writeChallenge,
  type Fixture,
  type GroupRun,
  type RealState,
  type Repo,
  type Run,
  type Shim,
  type Snapshot,
} from './__helpers__/preCommitRepo'

const TIMEOUT = 60_000

/** The parameterised rule lines, always last (spec 0008, G4). */
const PARAMETERISED_RULES = [
  '/c/:slug /challenge/:slug/',
  '/en/c/:slug /challenge/:slug/',
  '/zh/c/:slug /zh-TW/challenge/:slug/',
  '/zh-TW/c/:slug /zh-TW/challenge/:slug/',
]

/** test-chall's four rule lines: English-only, so its Traditional Chinese rules open the English page (G3). */
const TEST_CHALL_RULES = [
  '/c/001 /challenge/test-chall/',
  '/en/c/001 /challenge/test-chall/',
  '/zh/c/001 /challenge/test-chall/',
  '/zh-TW/c/001 /challenge/test-chall/',
]

/** door's four rule lines once its brief is gone or not counted: all at its English page (G3). */
const DOOR_RULES_AT_ENGLISH = [
  '/c/002 /challenge/door/',
  '/en/c/002 /challenge/door/',
  '/zh/c/002 /challenge/door/',
  '/zh-TW/c/002 /challenge/door/',
]

/** door's four rule lines, translated (G2). */
const DOOR_RULES = [
  '/c/002 /challenge/door/',
  '/en/c/002 /challenge/door/',
  '/zh/c/002 /zh-TW/challenge/door/',
  '/zh-TW/c/002 /zh-TW/challenge/door/',
]

/** The rule lines of the fixture's committed `_redirects`, from the literal parts above: the retired #3 has none. */
const FIXTURE_RULES = [...TEST_CHALL_RULES, ...DOOR_RULES, ...PARAMETERISED_RULES]

/** W3: the hook replaced a version of `_redirects` the teacher made. */
const W3 = /platform\/public\/_redirects[^\n]*replaced|replaced[^\n]*platform\/public\/_redirects/

/** The two fixtures: `en` (the default: a `range.json` naming `en`) and `zh-TW` (no `range.json`). */
let fixture: Fixture
let fixtureZh: Fixture
let repo: Fixture
let real: RealState

beforeAll(() => {
  fixture = buildFixture('en')
  fixtureZh = buildFixture('zh-TW')
}, TIMEOUT)

afterAll(() => {
  if (fixture) removeRepo(fixture)
  if (fixtureZh) removeRepo(fixtureZh)
})

beforeEach(() => {
  real = realRepoState()
  repo = cloneFixture(fixture)
})

/** Swap this case's repository for a copy of the fixture whose primary locale is `P`. */
function useFixture(P: Locale): void {
  if (repo.primary === P) return
  removeRepo(repo)
  repo = cloneFixture(P === 'en' ? fixture : fixtureZh)
}

/** `git add` challenge `slug`: its declaration folder and every brief folder that exists, in repository `r`. */
function stageChallenge(slug: string, r: Repo = repo): void {
  const dirs = ['platform/challenge', ...LOCALES.map((l) => `platform/${l}/challenge`)]
    .map((tree) => `${tree}/${slug}`)
    .filter((dir) => existsSync(join(r.dir, dir)))
  git(r, ['add', '--', ...dirs])
}

/** The brief locale that is not `P`. */
const OTHER: Record<Locale, Locale> = { en: 'zh-TW', 'zh-TW': 'en' }

/** The numbered and slug rules of the fixture with primary locale `zh-TW` (test-chall: a `zh-TW` brief only). */
const ZH_TEST_CHALL_RULES = [
  '/c/001 /challenge/test-chall/',
  '/en/c/001 /challenge/test-chall/',
  '/zh/c/001 /challenge/test-chall/',
  '/zh-TW/c/001 /challenge/test-chall/',
]
const ZH_DOOR_RULES = [
  '/c/002 /challenge/door/',
  '/en/c/002 /en/challenge/door/',
  '/zh/c/002 /challenge/door/',
  '/zh-TW/c/002 /challenge/door/',
]
const ZH_DOOR_RULES_AT_PRIMARY = [
  '/c/002 /challenge/door/',
  '/en/c/002 /challenge/door/',
  '/zh/c/002 /challenge/door/',
  '/zh-TW/c/002 /challenge/door/',
]
const ZH_PARAMETERISED_RULES = [
  '/c/:slug /challenge/:slug/',
  '/en/c/:slug /en/challenge/:slug/',
  '/zh/c/:slug /challenge/:slug/',
  '/zh-TW/c/:slug /challenge/:slug/',
  '/zh-TW/* /:splat',
]
const ZH_FIXTURE_RULES = [...ZH_TEST_CHALL_RULES, ...ZH_DOOR_RULES, ...ZH_PARAMETERISED_RULES]

/** A challenge's four rules: `/c/<NNN>` at `/challenge/<slug>/`, `/en/c/<NNN>` at `at.en`, and `/zh/c/<NNN>` and `/zh-TW/c/<NNN>` at `at.zh`; the same four forms for each primary locale. */
function fourRules(number: string, slug: string, at: { en: string; zh: string }): string[] {
  return [
    `/c/${number} /challenge/${slug}/`,
    `/en/c/${number} ${at.en}`,
    `/zh/c/${number} ${at.zh}`,
    `/zh-TW/c/${number} ${at.zh}`,
  ]
}

afterEach(() => {
  // A case that failed before its group's done() leaves no blocked process behind.
  killStrayGroups()
  // H29: the pre-existing entry is still listed with its commit id. The
  // first-commit fixture (H27, H28) has none.
  if (repo.preexisting !== null) {
    expect(stashList(repo).some((l) => l.startsWith(`${repo.preexisting} `))).toBe(true)
  }
  // H30: the real repository's _redirects, index and stash list are unchanged.
  expect(realRepoState()).toEqual(real)
  removeRepo(repo)
})

// ─── Outcome checks ─────────────────────────────────────────────────────────

/** O1, and O3/O4 apart from the status: nothing changed, `_redirects` included. */
function expectNothingChanged(before: Snapshot, after: Snapshot): void {
  expect(after.index).toEqual(before.index)
  expect(after.files).toEqual(before.files)
  expect(after.untracked).toEqual(before.untracked)
  expect(after.stash).toEqual(before.stash)
}

function withoutRedirects(index: string[]): string[] {
  return index.filter((l) => !l.endsWith(`\t${REDIRECTS}`))
}

/** O2: only `_redirects` changed, to the expected one, in the index and the working tree (D3). */
function expectO2(run: Run, before: Snapshot, after: Snapshot, expected: string): void {
  expect(run.status, run.stderr).toBe(0)
  expect(withoutRedirects(after.index)).toEqual(withoutRedirects(before.index))
  expect(stagedRedirects(repo)).toBe(expected)
  expect(withoutPaths(after.files, [REDIRECTS])).toEqual(withoutPaths(before.files, [REDIRECTS]))
  expect(after.files.get(REDIRECTS)).toBe(`-:${Buffer.from(expected).toString('base64')}`)
  expect(after.untracked).toEqual(before.untracked)
  expect(after.stash).toEqual(before.stash)
}

function expectNoW3W4(run: Run): void {
  expect(run.stderr).not.toMatch(W3)
  expect(run.stderr).not.toMatch(/git add/)
}

// ─── H15, H12: today's cases against the real hook ──────────────────────────

describe('pre-commit.sh: today’s cases (H15)', () => {
  it('exits 0 when no challenge files are staged', () => {
    write(repo, 'README.md', '# Hello\n')
    git(repo, ['add', 'README.md'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('exits 0 when valid challenge files are staged', () => {
    write(repo, 'platform/challenge/test-chall/challenge.yaml', `${declarationText(1)}# updated\n`)
    git(repo, ['add', 'platform/challenge/test-chall/challenge.yaml'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('exits 1 when staged deletion removes required flag file', () => {
    git(repo, ['rm', '-q', 'platform/challenge/test-chall/src/flag.txt'])
    // An unstaged hand edit of _redirects: its bytes are kept on failure.
    write(repo, REDIRECTS, `${git(repo, ['show', `:${REDIRECTS}`])}# a hand edit\n`)
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('exits 1 when staged deletion removes required app file', () => {
    git(repo, ['rm', '-q', 'platform/challenge/test-chall/src/app.py'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('validates staged snapshot, not working tree (stash test)', () => {
    // flag.txt exists on disk but is not staged: the staged snapshot lacks it.
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    git(repo, ['add', 'platform/challenge/new-chall/challenge.yaml', 'platform/challenge/new-chall/src/app.py', 'platform/en/challenge/new-chall/index.md'])
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/new-chall/src/flag.txt')

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('exits 0 when entire challenge directory is removed', () => {
    git(repo, ['rm', '-rq', 'platform/challenge/test-chall', 'platform/en/challenge/test-chall'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    // None of test-chall's four rules stays; door and the retired challenge remain, so the
    // numbered section stays.
    expect(rulesOf(expected)).toEqual([...DOOR_RULES, ...PARAMETERISED_RULES])
  }, TIMEOUT)

  it('exits 1 when only challenge.yaml is deleted (incomplete challenge, LS1)', () => {
    git(repo, ['rm', '-q', 'platform/challenge/test-chall/challenge.yaml'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

// ─── Trigger and generation (direct runs) ───────────────────────────────────

/** Unstaged and untracked challenge files, which a run that does not trigger leaves alone. */
function addUnrelatedWork(): void {
  write(repo, 'platform/challenge/door/src/app.py', 'from flask import Flask\napp = Flask("unstaged")\n')
  write(repo, 'platform/en/challenge/draft/index.md', '---\ntitle: draft\n---\n')
}

function validatorLog(): string {
  const log = join(repo.base, 'validator.log')
  recordScript(repo, 'challenge-lint-staged.ts', log)
  return log
}

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: trigger (H06; P = %s)', (P) => {
  it('ends in O1 when only README.md is staged', () => {
    useFixture(P)
    addUnrelatedWork()
    write(repo, 'README.md', '# Changed\n')
    git(repo, ['add', 'README.md'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('ends in O1 when only another file under platform/public/ is staged', () => {
    useFixture(P)
    addUnrelatedWork()
    write(repo, 'platform/public/other.txt', 'other, changed\n')
    git(repo, ['add', 'platform/public/other.txt'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

describe('pre-commit.sh: the validator’s list (S37)', () => {
  it('a staged brief goes to the validator: its argv holds the brief’s path', () => {
    const log = validatorLog()
    write(repo, 'platform/en/challenge/door/index.md', `${read(repo, 'platform/en/challenge/door/index.md')}\nmore\n`)
    git(repo, ['add', 'platform/en/challenge/door/index.md'])

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expect(readRecord(log).flatMap((r) => r.argv)).toEqual(['platform/en/challenge/door/index.md'])
  }, TIMEOUT)

  it('a staged declaration-folder file goes to the validator: its argv is exactly that path', () => {
    const log = validatorLog()
    stageDoorChange()

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expect(readRecord(log).flatMap((r) => r.argv)).toEqual([DOOR_APP])
  }, TIMEOUT)
})

describe('pre-commit.sh: only the locale list’s folders trigger the hook (S80)', () => {
  it.each([
    'platform/public/challenge/x/notes.txt',
    'platform/shared/challenge/x.ts',
    'platform/ja/challenge/s/index.md',
    'platform/constructor/challenge/s/index.md',
    'platform/__proto__/challenge/s/index.md',
  ])('%s staged alone: O1, and neither the validator nor the generator runs', (path) => {
    const validator = validatorLog()
    const generator = join(repo.base, 'generator.log')
    recordScript(repo, 'generate-redirects.ts', generator)
    write(repo, path, 'a path outside the challenge trees\n')
    git(repo, ['add', '--', path])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
    expect(readRecord(validator)).toEqual([])
    expect(readRecord(generator)).toEqual([])
  }, TIMEOUT)

  it('an untracked folder under a folder that is not on the list gets no W4 line, and no W4b line holds `undefined` or a function’s text', () => {
    write(repo, 'platform/ja/challenge/s/index.md', '---\ntitle: s\n---\n')
    write(repo, 'platform/constructor/challenge/s/index.md', '---\ntitle: s\n---\n')
    stageDoorChange()
    // A version of the teacher's own, so that W3, and with it W4, is printed.
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}/c/999  /challenge/hand-edit/  302\n`)
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).not.toContain('platform/ja/challenge/s/')
    expect(run.stderr).not.toContain('platform/constructor/challenge/s/')
    expect(run.stderr).not.toMatch(/undefined|function|=>/)
  }, TIMEOUT)
})

describe('pre-commit.sh: an untracked folder without index.md is no brief (Y111, D127)', () => {
  it('a zh-TW fixture’s untracked platform/zh-TW/challenge/t/ holding only diagram.png is not named by W4, while an untracked brief folder is', () => {
    useFixture('zh-TW')
    write(repo, 'platform/zh-TW/challenge/t/diagram.png', Buffer.from([137, 80, 78, 71]))
    write(repo, 'platform/zh-TW/challenge/t2/index.md', '---\ntitle: t2\n---\n')
    stageDoorChange()
    // A version of the teacher's own, forced by another path, so that W3, and with it W4, is printed.
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}/c/999  /challenge/hand-edit/  302\n`)
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).not.toMatch(/platform\/zh-TW\/challenge\/t\//)
    expect(run.stderr).toMatch(w4('platform/zh-TW/challenge/t2/'))
  }, TIMEOUT)
})

/** What S36 stages for each watched path: a change that must trigger the hook (D65, D66). */
const TRIGGERS: Array<[string, (P: Locale) => void]> = [
  ['a zh-TW brief', () => write(repo, 'platform/zh-TW/challenge/door/index.md', `${read(repo, 'platform/zh-TW/challenge/door/index.md')}\nmore\n`)],
  ['an en brief', () => write(repo, 'platform/en/challenge/door/index.md', `${read(repo, 'platform/en/challenge/door/index.md')}\nmore\n`)],
  ['range.json, its upstream key only', (P) => write(repo, 'range.json', P === 'en' ? '{"primaryLocale":"en","upstream":"example/range"}\n' : '{"upstream":"example/range"}\n')],
  ['a file of a declaration folder', () => write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, staged")\n')],
]

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: trigger on every watched path (S36; P = %s)', (P) => {
  it.each(TRIGGERS)('%s staged: the hook runs, and the run does not end in O1', (_name, change) => {
    useFixture(P)
    const generator = join(repo.base, 'generator.log')
    recordScript(repo, 'generate-redirects.ts', generator)
    change(P)
    git(repo, ['add', '-A', '--', 'platform/'])
    if (existsSync(join(repo.dir, 'range.json'))) git(repo, ['add', '--', 'range.json'])

    const run = runHook(repo)

    // O2 (status 0) or O4 (status 1), never O1: the generator's --staged ran once.
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged')), run.stderr).toHaveLength(1)
  }, TIMEOUT)
})

/** H02, H14: the outcome, with the hook run directly by the given bash (H45 runs it with `/bin/bash`). */
function expectH02H14(bash: string): void {
  writeBrief(repo, 'zh-TW', 'test-chall')
  git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
  const head = rulesOf(git(repo, ['show', `HEAD:${REDIRECTS}`]))
  const expected = expectedRedirects(repo)
  const before = snapshot(repo)

  const run = runHook(repo, {}, bash)

  expectO2(run, before, snapshot(repo), expected)
  // Re-pointed from the primary page, not added (G2, G3, S39).
  expect(rulesOf(expected)).toEqual([
    '/c/001 /challenge/test-chall/',
    '/en/c/001 /challenge/test-chall/',
    '/zh/c/001 /zh-TW/challenge/test-chall/',
    '/zh-TW/c/001 /zh-TW/challenge/test-chall/',
    ...DOOR_RULES,
    ...PARAMETERISED_RULES,
  ])
  expect(rulesOf(expected)).toHaveLength(head.length)
}

describe('pre-commit.sh: the expected _redirects (AC-12)', () => {
  it('H01: a new challenge gains its four rules, the Traditional Chinese ones at its English page, with no W3', () => {
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([
      ...TEST_CHALL_RULES,
      ...DOOR_RULES,
      '/c/004 /challenge/new-chall/',
      '/en/c/004 /challenge/new-chall/',
      '/zh/c/004 /challenge/new-chall/',
      '/zh-TW/c/004 /challenge/new-chall/',
      ...PARAMETERISED_RULES,
    ])
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H01: a new challenge, with the working tree’s _redirects already the expected one (after pnpm dev), prints no W3', () => {
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    write(repo, REDIRECTS, expected)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
    expectNoW3W4(run)
  }, TIMEOUT)

  it('S38 (zh-TW twin): a new challenge with a zh-TW brief gains its four rules, all at /challenge/new-chall/, with no W3', () => {
    useFixture('zh-TW')
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([
      ...ZH_TEST_CHALL_RULES,
      ...ZH_DOOR_RULES,
      ...fourRules('004', 'new-chall', { en: '/challenge/new-chall/', zh: '/challenge/new-chall/' }),
      ...ZH_PARAMETERISED_RULES,
    ])
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H02, H14: only a Traditional Chinese brief re-points its two Traditional Chinese rules at it', () => {
    expectH02H14('bash')
  }, TIMEOUT)

  it('S39 (zh-TW twin): only an en brief re-points /en/c/001 at it and changes no other rule', () => {
    useFixture('zh-TW')
    writeBrief(repo, 'en', 'test-chall')
    git(repo, ['add', 'platform/en/challenge/test-chall/index.md'])
    const head = rulesOf(git(repo, ['show', `HEAD:${REDIRECTS}`]))
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([
      '/c/001 /challenge/test-chall/',
      '/en/c/001 /en/challenge/test-chall/',
      '/zh/c/001 /challenge/test-chall/',
      '/zh-TW/c/001 /challenge/test-chall/',
      ...ZH_DOOR_RULES,
      ...ZH_PARAMETERISED_RULES,
    ])
    expect(rulesOf(expected)).toHaveLength(head.length)
  }, TIMEOUT)

  it('H03: deleting a challenge in both trees loses all four of its rules', () => {
    git(repo, ['rm', '-rq', 'platform/challenge/door', 'platform/en/challenge/door', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([...TEST_CHALL_RULES, ...PARAMETERISED_RULES])
  }, TIMEOUT)

  it('H04: renaming a challenge in both trees points all four of its rules at the new slug', () => {
    const log = validatorLog()
    git(repo, ['mv', 'platform/challenge/door', 'platform/challenge/gate'])
    git(repo, ['mv', 'platform/en/challenge/door', 'platform/en/challenge/gate'])
    git(repo, ['mv', 'platform/zh-TW/challenge/door', 'platform/zh-TW/challenge/gate'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([
      ...TEST_CHALL_RULES,
      ...DOOR_RULES.map((r) => r.replace('/door/', '/gate/')),
      ...PARAMETERISED_RULES,
    ])
    expect(readRecord(log).flatMap((r) => r.argv)).toContain('platform/challenge/gate/challenge.yaml')
  }, TIMEOUT)

  it('H40: deleting only the Traditional Chinese brief keeps all four rules and re-points the Traditional Chinese ones at the English page', () => {
    const head = rulesOf(git(repo, ['show', `HEAD:${REDIRECTS}`]))
    git(repo, ['rm', '-rq', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([...TEST_CHALL_RULES, ...DOOR_RULES_AT_ENGLISH, ...PARAMETERISED_RULES])
    expect(rulesOf(expected)).toHaveLength(head.length)
  }, TIMEOUT)

  it('S39 (zh-TW twin of H40): deleting only door’s en brief keeps all four rules and re-points /en/c/002 at the zh-TW page', () => {
    useFixture('zh-TW')
    const head = rulesOf(git(repo, ['show', `HEAD:${REDIRECTS}`]))
    git(repo, ['rm', '-rq', 'platform/en/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([...ZH_TEST_CHALL_RULES, ...ZH_DOOR_RULES_AT_PRIMARY, ...ZH_PARAMETERISED_RULES])
    expect(rulesOf(expected)).toHaveLength(head.length)
  }, TIMEOUT)

  it.each(['en', 'zh-TW'] as const)('0008 G3, S40 (P = %s): a translation brief left untracked keeps its challenge’s four rules, the translation’s two at the primary page', (P) => {
    useFixture(P)
    const T = OTHER[P]
    git(repo, ['rm', '-rq', '--cached', `platform/${T}/challenge/door`])
    // With the removal from the index as the only staged change, the hook's stash push stops
    // partway and the run ends in O5, before generation (a hook defect predating spec 0008,
    // recorded in T-0056). A change staged beside it reaches generation.
    stageDoorChange()
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toContain(`?? platform/${T}/challenge/door/index.md`)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(
      P === 'en'
        ? [...TEST_CHALL_RULES, ...DOOR_RULES_AT_ENGLISH, ...PARAMETERISED_RULES]
        : [...ZH_TEST_CHALL_RULES, ...ZH_DOOR_RULES_AT_PRIMARY, ...ZH_PARAMETERISED_RULES],
    )
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H05: an application-only change keeps HEAD’s bytes', () => {
    write(repo, 'platform/challenge/door/src/app.py', 'from flask import Flask\napp = Flask("door")\n')
    git(repo, ['add', 'platform/challenge/door/src/app.py'])
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), head)
    expect(expectedRedirects(repo)).toBe(head)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H43: an unstaged number edit keeps HEAD’s bytes, and the unstaged number is back afterwards', () => {
    write(repo, 'platform/challenge/test-chall/challenge.yaml', read(repo, 'platform/challenge/test-chall/challenge.yaml').replace('number: 1', 'number: 7'))
    write(repo, 'platform/challenge/door/src/app.py', 'from flask import Flask\napp = Flask("door")\n')
    git(repo, ['add', 'platform/challenge/door/src/app.py'])
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), head)
    expect(read(repo, 'platform/challenge/test-chall/challenge.yaml')).toContain('number: 7')
  }, TIMEOUT)

  it('H24: a type change of a brief’s index.md to a link keeps HEAD’s bytes, and is not validated', () => {
    const log = validatorLog()
    const index = 'platform/en/challenge/test-chall/index.md'
    write(repo, 'platform/en/challenge/test-chall/brief.md', read(repo, index))
    unlinkSync(join(repo.dir, index))
    symlinkSync('brief.md', join(repo.dir, index))
    git(repo, ['add', 'platform/en/challenge/test-chall'])
    expect(git(repo, ['diff', '--cached', '--name-status'])).toContain(`T\t${index}`)
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), head)
    const argv = readRecord(log).flatMap((r) => r.argv)
    expect(argv).toContain('platform/en/challenge/test-chall/brief.md')
    expect(argv).not.toContain(index)
  }, TIMEOUT)

  it('H18: with no _redirects in HEAD, the expected one is staged as added, with no W3', () => {
    git(repo, ['rm', '-q', REDIRECTS])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'remove _redirects'])
    write(repo, 'platform/challenge/door/src/app.py', 'from flask import Flask\napp = Flask("door")\n')
    git(repo, ['add', 'platform/challenge/door/src/app.py'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.files.has('platform/public/other.txt')).toBe(true)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(git(repo, ['diff', '--cached', '--name-status', '--', REDIRECTS])).toBe(`A\t${REDIRECTS}\n`)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expectNoW3W4(run)
  }, TIMEOUT)

  it.each(['en', 'zh-TW'] as const)('H20, S40 (P = %s): an ignored directory gets no rule, and a page counts only where its own tree lists its slug', (P) => {
    useFixture(P)
    const T = OTHER[P]
    // logs/ is ignored and carries door's number: counting it would make generation refuse.
    write(repo, 'platform/challenge/logs/challenge.yaml', declarationText(2))
    // tmp/ is ignored too; the declaration and the primary brief are force-added, the other brief stays ignored.
    writeChallenge(repo, 'platform/challenge', 'tmp', 6, { briefs: [] })
    writeBrief(repo, P, 'tmp')
    writeBrief(repo, T, 'tmp')
    git(repo, ['add', '-f', 'platform/challenge/tmp', `platform/${P}/challenge/tmp`])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    const rules = rulesOf(expected)
    // tmp's ignored brief does not count: the other locale's rules open the primary page.
    expect(rules.filter((r) => r.includes('/006 '))).toEqual([
      '/c/006 /challenge/tmp/',
      '/en/c/006 /challenge/tmp/',
      '/zh/c/006 /challenge/tmp/',
      '/zh-TW/c/006 /challenge/tmp/',
    ])
    expect(rules.filter((r) => r.includes('logs'))).toEqual([])
    expect(run.stderr).not.toContain('logs')
    expectNoW3W4(run)
  }, TIMEOUT)

  it.each(['en', 'zh-TW'] as const)('S40 (P = %s), with W3 forced: W4 names neither the ignored logs/ nor the ignored translation brief folder', (P) => {
    useFixture(P)
    const T = OTHER[P]
    write(repo, 'platform/challenge/logs/challenge.yaml', declarationText(2))
    writeChallenge(repo, 'platform/challenge', 'tmp', 6, { briefs: [] })
    writeBrief(repo, P, 'tmp')
    writeBrief(repo, T, 'tmp')
    git(repo, ['add', '-f', 'platform/challenge/tmp', `platform/${P}/challenge/tmp`])
    // An unstaged hand edit of _redirects makes the hook say W3, so W4 is asked to name untracked folders.
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).not.toContain('logs')
    expect(run.stderr).not.toContain(`platform/${T}/challenge/tmp/`)
  }, TIMEOUT)
})

// ─── W3, W4 and the teacher's other work (AC-12, AC-14) ─────────────────────

/** A string matched literally inside a RegExp. */
function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** W4 for one untracked directory. */
function w4(dir: string): RegExp {
  const escaped = escapeRe(dir)
  return new RegExp(`${escaped}[^\\n]*git add|git add[^\\n]*${escaped}`)
}

/** W4's wording for an untracked English directory: left out of the file. */
function w4LeftOut(dir: string): RegExp {
  return new RegExp(`${escapeRe(dir)} is untracked, so _redirects leaves it out\\. To include it, git add it and commit again\\.$`, 'm')
}

/**
 * W4b's wording (S-§4.5) for an untracked brief directory of locale `L` when the primary locale is `P`:
 * the challenge's `L` short links open the `P` page.
 */
function w4Opens(dir: string, L: Locale, P: Locale): RegExp {
  return new RegExp(`${escapeRe(dir)} is untracked, so _redirects does not use it: its challenge's ${LOCALE_ENGLISH_NAMES[L]} short links open the ${LOCALE_ENGLISH_NAMES[P]} page, if there is one\\. To include it, git add it and commit again\\.$`, 'm')
}

/** W4b's wording for an untracked Traditional Chinese directory on `P = en` (spec 0008, H1a; today's sentence). */
function w4EnglishPage(dir: string): RegExp {
  return w4Opens(dir, 'zh-TW', 'en')
}

const DOOR_APP = 'platform/challenge/door/src/app.py'

function stageDoorChange(): void {
  write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, staged")\n')
  git(repo, ['add', DOOR_APP])
}

/** H07: the outcome, through `git commit` with the given environment (H45 puts `/bin` first on `PATH`). */
function expectH07(env: NodeJS.ProcessEnv): void {
  const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
  write(repo, REDIRECTS, `${head}/c/999  /challenge/hand-made/  302\n`)
  git(repo, ['add', REDIRECTS])
  const expected = expectedRedirects(repo)
  expect(expected).toBe(head)
  const before = snapshot(repo)

  const run = commit(repo, ['-q', '-m', 'hand edit'], env)

  expectO2(run, before, snapshot(repo), expected)
  expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
  expect(rulesOf(expected).some((r) => r.startsWith('/c/999 '))).toBe(false)
  expect(run.stderr).toMatch(W3)
  expect(git(repo, ['rev-parse', 'HEAD^{tree}'])).toBe(git(repo, ['rev-parse', 'HEAD~1^{tree}']))
}

describe('pre-commit.sh: W3, W4 and unstaged work', () => {
  it('H07: only a hand-edited _redirects, through git commit: replaced, W3, and a commit that changes nothing', () => {
    expectH07({})
  }, TIMEOUT)

  it('H11: a hand-edited staged _redirects with a challenge change is replaced, with W3, and unstaged files are kept', () => {
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    write(repo, REDIRECTS, `${head}# a hand edit\n`)
    git(repo, ['add', REDIRECTS])
    stageDoorChange()
    write(repo, 'platform/challenge/test-chall/src/app.py', 'from flask import Flask\napp = Flask("unstaged")\n')
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(expected).not.toContain('# a hand edit')
    expect(run.stderr).toMatch(W3)
  }, TIMEOUT)

  it('H11 boundary: a staged deletion of the _redirects HEAD holds is replaced too, with W3', () => {
    // Open point: an absent version counts as HEAD's only when HEAD has no _redirects.
    git(repo, ['rm', '-q', REDIRECTS])
    stageDoorChange()
    const expected = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
  }, TIMEOUT)

  it('H08, H09: an untracked challenge is left out, and every unstaged and untracked file is byte-identical', () => {
    // Tracked files of every awkward kind, committed first so that they can carry unstaged changes.
    write(repo, 'platform/notes/crlf.txt', 'a\nb\n')
    write(repo, 'platform/notes/data.bin', Buffer.from([0, 1, 2, 3]))
    write(repo, 'platform/notes/a name.txt', 'spaced\n')
    write(repo, 'platform/notes/名稱.txt', '名稱\n')
    write(repo, 'platform/notes/abc.txt', 'left as committed\n')
    git(repo, ['add', 'platform/notes'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'notes'])

    writeChallenge(repo, 'platform/challenge', 'draft', 5)
    stageDoorChange()
    // A file staged as new, then deleted from the working tree.
    write(repo, 'platform/notes/staged-then-deleted.txt', 'staged\n')
    git(repo, ['add', 'platform/notes/staged-then-deleted.txt'])
    unlinkSync(join(repo.dir, 'platform/notes/staged-then-deleted.txt'))
    // Another, whose name read as a glob also matches the tracked `abc.txt`, which has no
    // unstaged change, so nothing but a literal pathspec keeps it in the working tree.
    write(repo, 'platform/notes/a*.txt', 'a glob name\n')
    git(repo, ['add', '--', ':(literal)platform/notes/a*.txt'])
    unlinkSync(join(repo.dir, 'platform/notes/a*.txt'))
    write(repo, 'platform/challenge/test-chall/src/app.py', 'from flask import Flask\napp = Flask("unstaged")\n')
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    write(repo, 'platform/notes/crlf.txt', 'a\r\nb\r\nno final newline')
    write(repo, 'platform/notes/data.bin', Buffer.from([0, 255, 0, 254, 10, 13]))
    write(repo, 'platform/notes/a name.txt', 'spaced, unstaged\n')
    write(repo, 'platform/notes/名稱.txt', '名稱，未暫存\n')
    unlinkSync(join(repo.dir, 'platform/challenge/test-chall/src/flag.txt'))
    write(repo, 'platform/notes/untracked 檔.txt', 'untracked under platform/\n')
    // Under the fixture's `* text=auto eol=lf`, git stores both CRLF files with LF.
    write(repo, 'platform/notes/untracked crlf.txt', 'u\r\nv\r\n')
    write(repo, 'untracked-at-root.txt', 'untracked outside platform/\n')
    write(repo, 'README.md', '# Unstaged outside platform/\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/draft/challenge.yaml')

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H09: a file the index adds where HEAD has a directory, then deleted from the working tree, stays deleted', () => {
    write(repo, 'platform/notes/x/inner.txt', 'inner\n')
    git(repo, ['add', 'platform/notes'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'a directory'])
    git(repo, ['rm', '-rq', 'platform/notes/x'])
    write(repo, 'platform/notes/x', 'a file where HEAD has a directory\n')
    git(repo, ['add', 'platform/notes/x'])
    unlinkSync(join(repo.dir, 'platform/notes/x'))
    stageDoorChange()
    expect(git(repo, ['cat-file', '-t', 'HEAD:platform/notes/x'])).toBe('tree\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.files.has('platform/notes/x')).toBe(false)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H09 under core.safecrlf true: an unstaged tracked and an untracked CRLF file come back byte-identical', () => {
    // With the setting true, git refuses to store a CRLF file under `eol=lf` unless told otherwise.
    write(repo, 'platform/notes/crlf.txt', 'a\nb\n')
    git(repo, ['add', 'platform/notes'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'notes'])
    git(repo, ['config', 'core.safecrlf', 'true'])
    write(repo, 'platform/notes/crlf.txt', 'a\r\nb, unstaged\r\n')
    write(repo, 'platform/notes/untracked crlf.txt', 'u\r\nv\r\n')
    stageDoorChange()
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(read(repo, 'platform/notes/crlf.txt')).toBe('a\r\nb, unstaged\r\n')
    expect(read(repo, 'platform/notes/untracked crlf.txt')).toBe('u\r\nv\r\n')
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expectNoW3W4(run)
  }, TIMEOUT)

  it.each(['en', 'zh-TW'] as const)('H10, S47 (P = %s): an unstaged _redirects holding an untracked challenge’s rule is replaced (D3), with W3 and W4a for the declaration and primary brief folders and W4b for the translation', (P) => {
    useFixture(P)
    const T = OTHER[P]
    writeChallenge(repo, 'platform/challenge', 'draft', 5, { briefs: [P, T] })
    // An ignored directory, which W4 does not name.
    write(repo, 'platform/challenge/logs/run.log', 'ignored\n')
    // An untracked file directly under the tree is no folder, so W4 does not name it.
    write(repo, 'platform/challenge/stray.md', 'x\n')
    stageDoorChange()
    // As after pnpm dev: generated over the whole working tree, draft included.
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    expect(rulesOf(read(repo, REDIRECTS))).toContain('/c/005 /challenge/draft/')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(P === 'en' ? FIXTURE_RULES : ZH_FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    for (const dir of ['platform/challenge/draft/', `platform/${P}/challenge/draft/`]) {
      expect(run.stderr).toMatch(w4(dir))
      expect(run.stderr).toMatch(w4LeftOut(dir))
    }
    expect(run.stderr).toMatch(w4(`platform/${T}/challenge/draft/`))
    expect(run.stderr).toMatch(w4Opens(`platform/${T}/challenge/draft/`, T, P))
    expect(run.stderr).not.toMatch(w4LeftOut(`platform/${T}/challenge/draft/`))
    expect(run.stderr).not.toContain('logs')
    expect(run.stderr).not.toContain('stray.md')
  }, TIMEOUT)

  it.each(['en', 'zh-TW'] as const)('H10, translation tree (P = %s): an untracked translation brief beside a tracked page is named as re-pointing to the primary page, with W3', (P) => {
    useFixture(P)
    const T = OTHER[P]
    // test-chall's translation brief, never added; door's stays tracked, so git names the directory
    // rather than the whole translation tree.
    writeBrief(repo, T, 'test-chall')
    stageDoorChange()
    // A version of the teacher's own, so that W3, and with it W4, is printed.
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}/c/999  /challenge/hand-edit/  302\n`)
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(P === 'en' ? FIXTURE_RULES : ZH_FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).toMatch(w4(`platform/${T}/challenge/test-chall/`))
    expect(run.stderr).toMatch(w4Opens(`platform/${T}/challenge/test-chall/`, T, P))
    expect(run.stderr).not.toMatch(w4LeftOut(`platform/${T}/challenge/test-chall/`))
  }, TIMEOUT)

  it('H19: a staged hunk with an overlapping unstaged change comes back with its unstaged bytes', () => {
    write(repo, DOOR_APP, 'line 1\nline 2\nline 3\n')
    git(repo, ['add', DOOR_APP])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'lines'])
    write(repo, DOOR_APP, 'line 1\nline 2, staged\nline 3\n')
    git(repo, ['add', DOOR_APP])
    write(repo, DOOR_APP, 'line 1\nline 2, unstaged\nline 3\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(read(repo, DOOR_APP)).toBe('line 1\nline 2, unstaged\nline 3\n')
    expect(git(repo, ['show', `:${DOOR_APP}`])).toBe('line 1\nline 2, staged\nline 3\n')
  }, TIMEOUT)

  it('H13, S48: a brief whose frontmatter carries `number` ends in O3 with the validator’s message, no number-locales text, and no --staged call', () => {
    const generator = generatorLog()
    write(repo, 'platform/zh-TW/challenge/test-chall/index.md', ['---', 'title: "test-chall"', 'layout: challenge', 'number: 9', '---', '', 'content', ''].join('\n'))
    git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain('platform/zh-TW/challenge/test-chall/index.md carries key(s) number that a brief may not carry')
    expect(run.stderr).not.toContain('carries different numbers across locale trees')
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged'))).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

// ─── Brief faults (D12 moved to Node, D64, D121; AC-15) ─────────────────────

function generatorLog(): string {
  const log = join(repo.base, 'generator.log')
  recordScript(repo, 'generate-redirects.ts', log, false, true)
  return log
}

/** The teacher's other work a refusal must leave alone: two unstaged edits, `_redirects` among them, and an untracked file. */
function addTeacherWork(): void {
  write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
  write(repo, 'platform/public/other.txt', 'other, unstaged\n')
  write(repo, 'platform/notes/untracked.txt', 'untracked notes\n')
}

/** The article before a locale's English name: `an` before a vowel letter, `a` otherwise (D151). */
const article = (L: Locale): string => (/^[AEIOU]/.test(LOCALE_ENGLISH_NAMES[L]) ? 'an' : 'a')

/** The W6 lines of S-§4.5, each as the hook prints it (without the newline). */
const W6 = {
  a: (L: Locale, slug: string, P: Locale) =>
    `[pre-commit] ✗ platform/${L}/challenge/${slug}/ is ${article(L)} ${LOCALE_ENGLISH_NAMES[L]} brief, but the index holds no ${LOCALE_ENGLISH_NAMES[P]} brief platform/${P}/challenge/${slug}/index.md, the primary locale's, so CI would fail this commit.`,
  b: (slug: string, P: Locale) =>
    `[pre-commit] ✗ platform/challenge/${slug}/challenge.yaml declares a challenge, but the index holds no ${LOCALE_ENGLISH_NAMES[P]} brief platform/${P}/challenge/${slug}/index.md, the primary locale's, so CI would fail this commit.`,
  c: (L: Locale, slug: string) =>
    `[pre-commit] ✗ platform/${L}/challenge/${slug}/ is ${article(L)} ${LOCALE_ENGLISH_NAMES[L]} brief, but the index holds no challenge declaration platform/challenge/${slug}/challenge.yaml, so CI would fail this commit.`,
  d: (path: string) =>
    `[pre-commit] ✗ ${path} is outside the locale folders (PL-E08), so CI would fail this commit; move it as README.en.md describes in "Moving to the locale folders".`,
}

/** W6r's five fragments, in the order S-§4.5 gives them. */
const W6R = [
  'A challenge is platform/challenge/<slug>/ and its briefs under platform/<locale>/challenge/<slug>/',
  'delete, rename or retire them together',
  'move platform/challenge/<slug>/ to .archive/challenge/<slug>/ and delete its briefs in the same commit (git rm -r platform/<locale>/challenge/<slug>/)',
  'If a part exists but is not staged yet, git add it.',
  'Nothing was changed.',
]

/**
 * O4 with W6 for each brief fault the index holds (S44): exit 1; the W6 lines are exactly `lines`
 * (verbatim, in order); W6r's fragments each once, in order; one `--staged` call of the generator,
 * which wrote nothing to stdout; no W5 and no number text.
 */
function expectW6(run: Run, lines: string[], generator: string): void {
  expect(run.status, run.stderr).toBe(1)
  expect(run.stderr.split('\n').filter((l) => l.startsWith('[pre-commit] ✗'))).toEqual(lines)
  let at = -1
  for (const fragment of W6R) {
    const first = run.stderr.indexOf(fragment)
    expect(first, `${fragment}\n${run.stderr}`).toBeGreaterThan(at)
    expect(run.stderr.indexOf(fragment, first + 1), `${fragment} twice`).toBe(-1)
    at = first
  }
  const calls = readRecord(generator).filter((r) => r.argv.includes('--staged'))
  expect(calls).toHaveLength(1)
  expect(calls[0].stdoutBytes).toBe(0)
  expect(run.stderr).not.toContain('held by more than one challenge')
  expect(run.stderr).not.toContain('so no number')
  expect(run.stderr).not.toContain('carries different numbers')
}

/** Commit what is staged with `--no-verify`: a fault that HEAD then holds, as a commit made before the hook existed would. */
function commitFault(): void {
  git(repo, ['commit', '-q', '--no-verify', '-m', 'a fault, bypassing the hook'])
}

/** Stage a change to `slug`'s `src/app.py`, unrelated to the fault: the commit then reaches the brief check. */
function stageSrcChange(slug: string, r: Repo = repo): void {
  const path = `platform/challenge/${slug}/src/app.py`
  write(r, path, `from flask import Flask\napp = Flask("${slug}, unrelated")\n`)
  git(r, ['add', path])
}

interface BriefFault {
  name: string
  /** Stage the fault's change (the caller commits it with `--no-verify`). */
  stage(P: Locale, T: Locale): void
  /** The challenge whose `src/` the unrelated change touches. */
  other: string
  /** The W6 lines, in the order S-§4.5 sorts them. */
  lines(P: Locale, T: Locale): string[]
}

const BRIEF_FAULTS: BriefFault[] = [
  {
    name: 'W6c: door’s declaration moved to .archive/ while both briefs stay (H17)',
    stage: () => git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door']),
    other: 'test-chall',
    lines: () => [W6.c('en', 'door'), W6.c('zh-TW', 'door')],
  },
  {
    name: 'W6a: door’s primary brief deleted (H21)',
    stage: (P) => git(repo, ['rm', '-rq', `platform/${P}/challenge/door`]),
    other: 'test-chall',
    lines: (P, T) => [W6.a(T, 'door', P)],
  },
  {
    name: 'W6b: untranslated test-chall’s primary brief deleted',
    stage: (P) => git(repo, ['rm', '-rq', `platform/${P}/challenge/test-chall`]),
    other: 'door',
    lines: (P) => [W6.b('test-chall', P)],
  },
  {
    name: 'W6a and W6c: door’s primary brief folder renamed to gate (H22)',
    stage: (P) => git(repo, ['mv', `platform/${P}/challenge/door`, `platform/${P}/challenge/gate`]),
    other: 'test-chall',
    lines: (P, T) => [W6.a(T, 'door', P), W6.c(P, 'gate')],
  },
  {
    name: 'W6a and W6c: door’s translation folder renamed to gate (H41)',
    stage: (P, T) => git(repo, ['mv', `platform/${T}/challenge/door`, `platform/${T}/challenge/gate`]),
    other: 'test-chall',
    lines: (P, T) => [W6.a(T, 'gate', P), W6.c(T, 'gate')],
  },
  {
    name: 'W6d: an old-layout platform/challenge/x/index.md',
    stage: () => {
      write(repo, 'platform/challenge/x/index.md', '---\ntitle: x\n---\n')
      git(repo, ['add', 'platform/challenge/x/index.md'])
    },
    other: 'test-chall',
    lines: () => [W6.d('platform/challenge/x/index.md')],
  },
]

/** S44's first case (W6c), as a function so that H45 runs it under /bin/bash 3.2 too. */
function expectS44First(bash: string): void {
  const generator = generatorLog()
  BRIEF_FAULTS[0].stage('en', 'zh-TW')
  commitFault()
  stageSrcChange('test-chall')
  addTeacherWork()
  const before = snapshot(repo)

  const run = runHook(repo, {}, bash)

  expectW6(run, BRIEF_FAULTS[0].lines('en', 'zh-TW'), generator)
  expectNothingChanged(before, snapshot(repo))
}

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: brief faults the index holds (S44, D121; P = %s)', (P) => {
  const T = OTHER[P]

  it.each(BRIEF_FAULTS)('$name: exit 1, W6 line(s) verbatim, W6r once, nothing changed', (fault) => {
    useFixture(P)
    const generator = generatorLog()
    fault.stage(P, T)
    commitFault()
    stageSrcChange(fault.other)
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, fault.lines(P, T), generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H17 through git commit -m: refused with W6, no commit is made, and nothing changes', () => {
    useFixture(P)
    const generator = generatorLog()
    BRIEF_FAULTS[0].stage(P, T)
    commitFault()
    stageSrcChange('test-chall')
    addTeacherWork()
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)

    const run = commit(repo, ['-m', 'a change beside the fault'])

    expectW6(run, BRIEF_FAULTS[0].lines(P, T), generator)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H21 through git commit -a -m: the unrelated change exists only in the index.lock git hands the hook, which the hook reads; refused with W6, no commit, and nothing changes', () => {
    useFixture(P)
    const generator = generatorLog()
    const validator = validatorLog()
    BRIEF_FAULTS[1].stage(P, T)
    commitFault()
    const path = 'platform/challenge/test-chall/src/app.py'
    write(repo, path, 'from flask import Flask\napp = Flask("lock only")\n')
    addTeacherWork()
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)
    // The change is in the working tree only: .git/index does not hold it.
    expect(git(repo, ['diff', '--cached', '--name-only'])).toBe('')

    const run = commit(repo, ['-a', '-m', 'commit -a beside the fault'])

    expectW6(run, BRIEF_FAULTS[1].lines(P, T), generator)
    // The validator saw the change, so the hook read the lock git handed it.
    expect(readRecord(validator).flatMap((r) => r.argv)).toContain(path)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: the brief check reads the index only (S45; P = %s)', (P) => {
  const T = OTHER[P]

  it('K-17: a declaration and a primary brief on disk but not in the index back no translation, and two such challenges are each named', () => {
    useFixture(P)
    const generator = generatorLog()
    writeChallenge(repo, 'platform/challenge', 'fresh', 4, { briefs: [P] })
    writeBrief(repo, T, 'fresh')
    writeBrief(repo, T, 'ghost')
    git(repo, ['add', `platform/${T}/challenge/fresh/index.md`, `platform/${T}/challenge/ghost/index.md`])
    commitFault()
    stageSrcChange('test-chall')
    addTeacherWork()
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/fresh/challenge.yaml')
    expect(before.untracked).toContain(`?? platform/${P}/challenge/fresh/index.md`)

    const run = runHook(repo)

    expectW6(run, [W6.a(T, 'fresh', P), W6.c(T, 'fresh'), W6.a(T, 'ghost', P), W6.c(T, 'ghost')], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('K-17 boundary: ignored directories, which stay on disk through the hook’s stash, neither back a brief nor make a fault', () => {
    useFixture(P)
    const generator = generatorLog()
    // logs/ and tmp/ are ignored. logs' declaration and primary brief stay on disk; its translation is force-added.
    writeChallenge(repo, 'platform/challenge', 'logs', 4, { briefs: [P] })
    writeBrief(repo, T, 'logs')
    git(repo, ['add', '-f', `platform/${T}/challenge/logs/index.md`])
    // An ignored translation with no declaration and no primary brief is not in the index.
    writeBrief(repo, T, 'tmp')
    commitFault()
    stageSrcChange('test-chall')
    addTeacherWork()
    const before = snapshot(repo)
    expect(before.files.has('platform/challenge/logs/challenge.yaml')).toBe(true)

    const run = runHook(repo)

    expectW6(run, [W6.a(T, 'logs', P), W6.c(T, 'logs')], generator)
    expect(run.stderr).not.toContain(`platform/${T}/challenge/tmp/`)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('D12-HEAD: a fault HEAD already holds refuses a commit whose own change creates none', () => {
    useFixture(P)
    git(repo, ['rm', '-rq', 'platform/challenge/door', `platform/${P}/challenge/door`])
    commitFault()
    const generator = generatorLog()
    stageSrcChange('test-chall')
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, [W6.a(T, 'door', P), W6.c(T, 'door')], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('no primary-locale index slug at all: with every primary brief deleted, the faults are still named (an empty list is not expanded under bash 3.2 set -u)', () => {
    useFixture(P)
    const generator = generatorLog()
    git(repo, ['rm', '-rq', `platform/${P}/challenge`])
    commitFault()
    // No challenge has a primary brief left, so a staged src change would be refused by the validator
    // first: the change that triggers the hook is a hand edit of _redirects, which is not validated.
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a staged edit\n`)
    git(repo, ['add', REDIRECTS])
    addTeacherWork()
    const before = snapshot(repo)
    expect(before.index.some((l) => l.includes(`\tplatform/${P}/challenge/`))).toBe(false)

    const run = runHook(repo)

    expectW6(run, [W6.a(T, 'door', P), W6.b('test-chall', P)], generator)
    expect(run.stderr).not.toContain('unbound variable')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: retiring and un-retiring (S46; P = %s)', (P) => {
  /** The rule lines once door is retired with its briefs: all four of door's rules are gone. */
  const retired = () => (P === 'en' ? [...TEST_CHALL_RULES, ...PARAMETERISED_RULES] : [...ZH_TEST_CHALL_RULES, ...ZH_PARAMETERISED_RULES])

  it('H39: retiring door together with its briefs ends in O2, all four of its rules go, and its number is never given again', () => {
    useFixture(P)
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    git(repo, ['rm', '-rq', 'platform/en/challenge/door', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(retired())
    expectNoW3W4(run)
    expect(run.stderr).not.toContain('challenge/door/')
    // Numbers 1 and 3 are in use and 2 is retired: the next one is 4, never door's 2.
    expect(nextChallengeNumber(repo.dir)).toBe(4)
  }, TIMEOUT)

  it('H39 boundary: briefs removed only from the index stay on disk untracked, are no fault, and all four of door’s rules go', () => {
    useFixture(P)
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    git(repo, ['rm', '-rq', '--cached', 'platform/en/challenge/door', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/en/challenge/door/index.md')
    expect(before.untracked).toContain('?? platform/zh-TW/challenge/door/index.md')

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(retired())
    expectNoW3W4(run)
    expect(run.stderr).not.toContain('challenge/door/')
    expect(nextChallengeNumber(repo.dir)).toBe(4)
  }, TIMEOUT)

  it('H23: un-retiring old-chall (its declaration folder back, with a primary brief) brings its four rules back', () => {
    useFixture(P)
    const log = validatorLog()
    git(repo, ['mv', '.archive/challenge/old-chall', 'platform/challenge/old-chall'])
    writeBrief(repo, P, 'old-chall')
    git(repo, ['add', `platform/${P}/challenge/old-chall/index.md`])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected).filter((r) => r.includes('/003 '))).toEqual([
      '/c/003 /challenge/old-chall/',
      '/en/c/003 /challenge/old-chall/',
      '/zh/c/003 /challenge/old-chall/',
      '/zh-TW/c/003 /challenge/old-chall/',
    ])
    expect(readRecord(log).flatMap((r) => r.argv)).toContain(`platform/${P}/challenge/old-chall/index.md`)
    expect(readRecord(log).flatMap((r) => r.argv)).toContain('platform/challenge/old-chall/challenge.yaml')
  }, TIMEOUT)
})

// ─── The real validator through the hook (Y90, S48, S73) ─────────────────────

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: briefs reach the real validator (Y90, S73; P = %s)', (P) => {
  const T = OTHER[P]

  it.each([P, T])('Y90: a brief in %s that carries a banned key (difficulty) is refused through git commit with VM6, and nothing changes', (L) => {
    useFixture(P)
    write(repo, `platform/${L}/challenge/door/index.md`, ['---', 'title: "door"', 'layout: challenge', 'difficulty: easy', '---', '', 'content', ''].join('\n'))
    git(repo, ['add', `platform/${L}/challenge/door/index.md`])
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)

    const run = commit(repo, ['-m', 'a brief with a banned key'])

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(`platform/${L}/challenge/door/index.md carries key(s) difficulty that a brief may not carry`)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('S48 (H13): a brief whose frontmatter carries `number` is refused by the validator (R26), with nothing changed and no --staged call', () => {
    useFixture(P)
    const generator = generatorLog()
    write(repo, `platform/${T}/challenge/door/index.md`, ['---', 'title: "door"', 'layout: challenge', 'number: 9', '---', '', 'content', ''].join('\n'))
    git(repo, ['add', `platform/${T}/challenge/door/index.md`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(`platform/${T}/challenge/door/index.md carries key(s) number that a brief may not carry`)
    expect(run.stderr).not.toContain('carries different numbers across locale trees')
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged'))).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  /** The refusal is the validator's: no W6 line, and the generator is never called. */
  function expectValidatorRefusal(run: Run, generator: string, line: string, before: Snapshot): void {
    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(line)
    expect(run.stderr).not.toMatch(/\[pre-commit\] ✗ platform\/[^\n]*brief, but the index holds/)
    expect(readRecord(generator)).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }

  it('S73 (1): deleting door’s primary brief alone is refused with VM10 naming the primary brief', () => {
    useFixture(P)
    const generator = generatorLog()
    git(repo, ['rm', '-q', `platform/${P}/challenge/door/index.md`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectValidatorRefusal(run, generator, `platform/${P}/challenge/door/index.md not found; every challenge has a brief in the primary locale (${P})`, before)
  }, TIMEOUT)

  it('S73 (2): a translation brief of a slug with no challenge.yaml is refused with VM1', () => {
    useFixture(P)
    const generator = generatorLog()
    writeBrief(repo, T, 'ghost')
    git(repo, ['add', `platform/${T}/challenge/ghost/index.md`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectValidatorRefusal(run, generator, 'platform/challenge/ghost/challenge.yaml not found', before)
  }, TIMEOUT)

  it('S73 (3): a brief at platform/challenge/door/index.md is refused with VM13', () => {
    useFixture(P)
    const generator = generatorLog()
    write(repo, 'platform/challenge/door/index.md', '---\ntitle: door\n---\n')
    git(repo, ['add', 'platform/challenge/door/index.md'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectValidatorRefusal(run, generator, 'platform/challenge/door/ holds index.md; a challenge directory holds only src/ and challenge.yaml', before)
  }, TIMEOUT)
})

// ─── range.json: the primary locale is the index's (S41–S43, S74–S79; D67, D114, D122) ──

/** `range.json`'s staged content, as git adds it. */
function stageRange(content: string): void {
  write(repo, 'range.json', content)
  git(repo, ['add', '--', 'range.json'])
}

/** The range.json faults S43 and S76 (c) stage: a content or a staged mode, and the PL line each ends with. */
const RANGE_FAULTS: Array<[string, () => void, string]> = [
  ['PL-E03: not JSON', () => stageRange('{'), 'PL-E03: range.json is not valid JSON.'],
  ['PL-E04: not an object', () => stageRange('[]'), 'PL-E04: range.json does not hold a JSON object.'],
  ['PL-E05: primaryLocale is not a string', () => stageRange('{"primaryLocale":1}'), 'PL-E05: "primaryLocale" in range.json is not a string: 1.'],
  ['PL-E06: primaryLocale is not on the list', () => stageRange('{"primaryLocale":"fr"}'), 'PL-E06: "primaryLocale" in range.json is "fr", which is not on the locale list: en, zh-TW.'],
  [
    'PL-E01: a staged symbolic link (120000)',
    () => {
      rmSync(join(repo.dir, 'range.json'), { force: true })
      symlinkSync('elsewhere.json', join(repo.dir, 'range.json'))
      git(repo, ['add', '--', 'range.json'])
    },
    'PL-E01: range.json is not a regular file',
  ],
  [
    'PL-E01: a staged gitlink (160000)',
    () => git(repo, ['update-index', '--add', '--cacheinfo', `160000,${git(repo, ['rev-parse', 'HEAD']).trim()},range.json`]),
    'PL-E01: range.json is not a regular file',
  ],
]

describe('pre-commit.sh: the primary locale is the index’s (S42, S43, S76)', () => {
  it('S42: an unstaged range.json naming zh-TW does not change the file: it is generated for the index’s P = en', () => {
    write(repo, 'range.json', '{"primaryLocale":"zh-TW"}\n')
    stageDoorChange()
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    const rangeBytes = readFileSync(join(repo.dir, 'range.json'))

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(rulesOf(expected)).not.toContain('/zh-TW/* /:splat')
    expect(readFileSync(join(repo.dir, 'range.json'))).toEqual(rangeBytes)
  }, TIMEOUT)

  it.each([
    ...RANGE_FAULTS,
    [
      'PL-E02: the index’s range.json cannot be read',
      () => stageRange('{"primaryLocale":"en","upstream":"example/range"}\n'),
      'PL-E02: range.json could not be read (unknown).',
    ],
  ] as Array<[string, () => void, string]>)('S43, %s: exit 1 with that line, and nothing changes (the generator is the one that refuses)', (name, stage, line) => {
    const generator = generatorLog()
    const validator = validatorLog()
    stage()
    const wrapper = name.startsWith('PL-E02') ? gitWrapper(repo, 'show :range.json', 'fail') : null
    const before = snapshot(repo)

    const run = runHook(repo, wrapper?.env ?? {})

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(line)
    if (wrapper) expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged')), run.stderr).toHaveLength(1)
    expect(readRecord(validator)).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('S76 (a): the en fixture with an unstaged range.json naming zh-TW: a new challenge is validated and generated for P = en', () => {
    write(repo, 'range.json', '{"primaryLocale":"zh-TW"}\n')
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    const rangeBytes = readFileSync(join(repo.dir, 'range.json'))

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(run.stderr).not.toContain('not found; every challenge has a brief in the primary locale')
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
    expect(rulesOf(expected)).not.toContain('/zh-TW/* /:splat')
    expect(readFileSync(join(repo.dir, 'range.json'))).toEqual(rangeBytes)
  }, TIMEOUT)

  it.each([
    ['an untracked range.json naming en', () => write(repo, 'range.json', '{"primaryLocale":"en"}\n')],
    [
      'a range.json naming en that the index holds without a primaryLocale',
      () => {
        write(repo, 'range.json', '{"upstream":"example/range"}\n')
        git(repo, ['add', '--', 'range.json'])
        git(repo, ['commit', '-q', '--no-verify', '-m', 'range.json without primaryLocale'])
        write(repo, 'range.json', '{"primaryLocale":"en","upstream":"example/range"}\n')
      },
    ],
  ])('S76 (b): the zh-TW fixture with %s in the working tree: an en-only new challenge is refused with VM10 for the zh-TW brief, nothing changes', (_name, prepare) => {
    useFixture('zh-TW')
    prepare()
    const generator = generatorLog()
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4, { briefs: ['en'] })
    stageChallenge('new-chall')
    const before = snapshot(repo)
    const rangeBytes = readFileSync(join(repo.dir, 'range.json'))

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain('platform/zh-TW/challenge/new-chall/index.md not found; every challenge has a brief in the primary locale (zh-TW)')
    expect(run.stderr).not.toMatch(/\[pre-commit\] ✗ platform\/[^\n]*brief, but the index holds/)
    expect(readRecord(generator)).toEqual([])
    expectNothingChanged(before, snapshot(repo))
    expect(readFileSync(join(repo.dir, 'range.json'))).toEqual(rangeBytes)
  }, TIMEOUT)

  it.each([
    ...RANGE_FAULTS,
    [
      'PL-E02: the index’s range.json cannot be read',
      () => stageRange('{"primaryLocale":"en","upstream":"example/range"}\n'),
      'PL-E02: range.json could not be read (unknown).',
    ],
  ] as Array<[string, () => void, string]>)('S76 (c), %s, with a staged challenge path: exit 1 with that line, no --staged call (no W5), nothing changes', (name, stage, line) => {
    const generator = generatorLog()
    stage()
    stageDoorChange()
    const wrapper = name.startsWith('PL-E02') ? gitWrapper(repo, 'show :range.json', 'fail') : null
    const before = snapshot(repo)

    const run = runHook(repo, wrapper?.env ?? {})

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(line)
    if (wrapper) expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged'))).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

describe('pre-commit.sh: changing the primary locale (S41, S74, S77, S78, S79)', () => {
  it('S41: range.json en → zh-TW, once every challenge has a zh-TW brief, regenerates the file for P = zh-TW and ends it with the old-address rule', () => {
    writeBrief(repo, 'zh-TW', 'test-chall')
    git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'test-chall’s zh-TW brief'])
    stageRange('{"primaryLocale":"zh-TW"}\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected).at(-1)).toBe('/zh-TW/* /:splat')
    expect(rulesOf(expected)).not.toEqual(FIXTURE_RULES)
  }, TIMEOUT)

  it('S74: range.json en → zh-TW while test-chall has no zh-TW brief is refused with W6a, once W6r, and nothing changes', () => {
    const generator = generatorLog()
    stageRange('{"primaryLocale":"zh-TW"}\n')
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, [W6.a('en', 'test-chall', 'zh-TW')], generator)
    expect(run.stderr).toContain('platform/zh-TW/challenge/test-chall/index.md')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('S77: range.json {"primaryLocale":"en"} added on the zh-TW fixture while test-chall has only its zh-TW brief is refused with W6a, once W6r, and nothing changes', () => {
    useFixture('zh-TW')
    const generator = generatorLog()
    stageRange('{"primaryLocale":"en"}\n')
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, [W6.a('zh-TW', 'test-chall', 'en')], generator)
    expect(run.stderr).toContain('platform/en/challenge/test-chall/index.md')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('S78 (a): git rm range.json (en → absent → zh-TW) once every challenge has a zh-TW brief regenerates the file for P = zh-TW', () => {
    writeBrief(repo, 'zh-TW', 'test-chall')
    git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'test-chall’s zh-TW brief'])
    git(repo, ['rm', '-q', 'range.json'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected).at(-1)).toBe('/zh-TW/* /:splat')
  }, TIMEOUT)

  it('S78 (b): git rm range.json while test-chall has no zh-TW brief is refused with W6a, once W6r, and nothing changes', () => {
    const generator = generatorLog()
    git(repo, ['rm', '-q', 'range.json'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, [W6.a('en', 'test-chall', 'zh-TW')], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it.each([
    ['en', '{"primaryLocale":"en","upstream":"example/range"}\n'],
    ['zh-TW', '{"upstream":"example/range"}\n'],
  ] as const)('S79 (P = %s): a range.json change to its upstream key alone commits, regenerating the file to HEAD’s bytes', (P, content) => {
    useFixture(P)
    const generator = generatorLog()
    write(repo, 'range.json', content)
    git(repo, ['add', '--', 'range.json'])
    const head = git(repo, ['rev-parse', 'HEAD']).trim()

    const run = commit(repo, ['-q', '-m', 'upstream only'])

    expect(run.status, run.stderr).toBe(0)
    expect(readRecord(generator).filter((r) => r.argv.includes('--staged'))).toHaveLength(1)
    expect(git(repo, ['diff', '--name-only', head, 'HEAD'])).toBe('range.json\n')
    expect(git(repo, ['diff', head, 'HEAD', '--', REDIRECTS])).toBe('')
    expect(git(repo, ['diff', '--cached', '--', REDIRECTS])).toBe('')
  }, TIMEOUT)
})

// ─── Slug names (S51 hook half; D150) ───────────────────────────────────────

const SLUG_RULE = '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'

describe.each(['en', 'zh-TW'] as const)('pre-commit.sh: slug names the generator refuses (S51, D150; P = %s)', (P) => {
  /** Commit a complete challenge `slug` (number `number`) with `--no-verify`: a name HEAD already holds. */
  function commitChallenge(slug: string, number: number): void {
    writeChallenge(repo, 'platform/challenge', slug, number)
    git(repo, ['add', '-A', '--', 'platform/'])
    commitFault()
  }

  it.each(['A B', 'a_b', '-a', 'a-', 'a\nb'])('the name %j is refused with the D150 line, and nothing changes', (name) => {
    useFixture(P)
    commitChallenge(name, 4)
    stageSrcChange('door')
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(`redirects: challenge slug ${jsonStringifyEscaped(name)} is outside ${SLUG_RULE}`)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it.each([
    ['005', 5],
    ['1234', 1234],
  ] as const)('the name %s, while that number belongs to another challenge, is refused, and nothing changes', (name, held) => {
    useFixture(P)
    commitChallenge(name, 4)
    commitChallenge('holder', held)
    stageSrcChange('door')
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(1)
    expect(run.stderr).toContain(`redirects: challenge slug ${jsonStringifyEscaped(name)} equals challenge ${name}'s padded number`)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('the name 005 holding number 5 itself is accepted: O2', () => {
    useFixture(P)
    commitChallenge('005', 5)
    stageSrcChange('door')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/005 /challenge/005/')
  }, TIMEOUT)

  it('a bad name that only a brief folder holds (no declaration) is named by W6c first, and the D150 line does not appear (D64)', () => {
    useFixture(P)
    const generator = generatorLog()
    writeBrief(repo, P, 'Bad Name')
    git(repo, ['add', '-A', '--', 'platform/'])
    commitFault()
    stageSrcChange('door')
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, [W6.c(P, 'Bad Name')], generator)
    expect(run.stderr).not.toContain(`is outside ${SLUG_RULE}`)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

// ─── Commit forms (AC-22) ───────────────────────────────────────────────────

/** W8: the commit-forms refusal. */
function expectW8(run: Run): void {
  expect(run.status).toBe(1)
  expect(run.stderr).toContain('git add')
  expect(run.stderr).toContain('git commit')
  expect(run.stderr).toContain('staging')
}

/**
 * The generator header of a54e917, before this epic, as a literal: a range
 * upgrading into this epic has it in its committed _redirects.
 */
const A54E917_HEADER = `# Cloudflare Pages redirect rules. This file is copied verbatim to the site root
# by VitePress (everything under platform/public/ lands in .vitepress/dist/).
#
# It has no effect under \`pnpm dev\` — the VitePress dev server does not read it.
# Test it with \`pnpm pages:dev\`, which serves the built output through the same
# Pages runtime that production uses.
#
# Syntax: <from> <to> <status>. \`:name\` captures one path segment and is
# substituted on the right. First matching rule wins, so put specific rules
# above general ones. Cloudflare caps this file at 2100 rules.
#
# GENERATED FILE — DO NOT EDIT BY HAND.
# Produced by \`pnpm redirects:generate\` from the challenge tree, and rewritten
# as part of \`pnpm build\`. A hand edit is reverted by the next build and fails
# tests/unit/site/redirects-generated.test.ts in the meantime.`

describe('pre-commit.sh: commit forms', () => {
  it('H31: git commit -a after a create:challenge-like change commits the expected file without the untracked rule, with W3 and W4', () => {
    writeChallenge(repo, 'platform/challenge', 'draft', 4)
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    expect(rulesOf(read(repo, REDIRECTS))).toContain('/c/004 /challenge/draft/')
    const expected = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-a', '-m', 'commit -a'])

    expectO2(run, before, snapshot(repo), expected)
    expect(git(repo, ['show', `HEAD:${REDIRECTS}`])).toBe(expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).toMatch(w4('platform/challenge/draft/'))
  }, TIMEOUT)

  it('H31 with CDPATH exported: git commit -a is still on the hook’s own index', () => {
    // A CDPATH that names `.` makes bash's `cd` print the directory, and one that
    // names a directory holding `.git` sends a relative `cd .git` there.
    mkdirSync(join(repo.base, 'elsewhere/.git'), { recursive: true })
    writeChallenge(repo, 'platform/challenge', 'draft', 4)
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    const expected = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = gitRun(repo, ['commit', '-q', '-a', '-m', 'commit -a'], { CDPATH: `.:${join(repo.base, 'elsewhere')}` })

    expectO2(run, before, snapshot(repo), expected)
    expect(git(repo, ['show', `HEAD:${REDIRECTS}`])).toBe(expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
  }, TIMEOUT)

  for (const form of [['--'], ['--only']]) {
    it(`H33: git commit ${form[0]} <path> that triggers is refused with W8, and nothing changes`, () => {
      write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, path commit")\n')
      const head = git(repo, ['rev-parse', 'HEAD'])
      const before = snapshot(repo)

      const run = commit(repo, ['-m', 'path commit', ...form, DOOR_APP])

      expectW8(run)
      expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
      expectNothingChanged(before, snapshot(repo))
    }, TIMEOUT)
  }

  it('H33: git commit -- README.md, which does not trigger, still commits', () => {
    write(repo, 'README.md', '# Path commit\n')
    const head = git(repo, ['rev-parse', 'HEAD'])
    const stash = stashList(repo)

    const run = commit(repo, ['-q', '-m', 'readme', '--', 'README.md'])

    expect(run.status, run.stderr).toBe(0)
    expect(git(repo, ['rev-parse', 'HEAD~1'])).toBe(head)
    expect(git(repo, ['diff', '--name-only', 'HEAD~1', 'HEAD'])).toBe('README.md\n')
    expect(stashList(repo)).toEqual(stash)
  }, TIMEOUT)

  it('H33: a direct run on a copy of the index outside .git refuses when it triggers', () => {
    stageDoorChange()
    const copy = join(repo.base, 'index copy')
    copyFileSync(join(repo.dir, '.git/index'), copy)
    const copyBytes = readFileSync(copy)
    const before = snapshot(repo)

    const run = runHook(repo, { GIT_INDEX_FILE: copy })

    expectW8(run)
    expectNothingChanged(before, snapshot(repo))
    expect(readFileSync(copy)).toEqual(copyBytes)
  }, TIMEOUT)

  it('H33: a direct run with GIT_INDEX_FILE=.git/index (relative) is on the hook’s own index', () => {
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo, { GIT_INDEX_FILE: '.git/index' })

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
  }, TIMEOUT)

  it('H44: a range whose committed _redirects has a54e917’s header commits the current generator’s file', () => {
    const current = read(repo, REDIRECTS)
    write(repo, REDIRECTS, A54E917_HEADER + current.slice(current.indexOf('\n\n')))
    git(repo, ['add', REDIRECTS])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'a range from before 0007'])
    expect(git(repo, ['show', `HEAD:${REDIRECTS}`]).startsWith(A54E917_HEADER)).toBe(true)
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-m', 'new challenge'])

    expectO2(run, before, snapshot(repo), expected)
    expect(git(repo, ['show', `HEAD:${REDIRECTS}`])).toBe(expected)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
  }, TIMEOUT)
})

// ─── Commit forms through the recording shim (H32, H34–H38) ─────────────────

/**
 * O2 through a commit form, read after the commit in the worktree `r`: status
 * 0; git handed the hook `indexFile` (compared as physical absolute paths),
 * once; `HEAD`'s, the staged and the working tree's `_redirects` are the
 * oracle over the index the shim copied; the index equals that copy apart
 * from `_redirects`; every other working-tree byte, the untracked lines and
 * `git stash list` with ids are as before. Returns the oracle.
 */
function expectCommitO2(run: Run, shim: Shim, r: Repo, before: Snapshot, indexFile: string): string {
  expect(run.status, run.stderr).toBe(0)
  expect(shim.recorded().map((p) => physicalPath(r.dir, p))).toEqual([physicalPath(r.dir, indexFile)])
  const expected = expectedRedirects(r, { GIT_INDEX_FILE: shim.index })
  const handed = lines(git(r, ['ls-files', '--stage'], { GIT_INDEX_FILE: shim.index }))
  const after = snapshot(r)
  expect(git(r, ['show', `HEAD:${REDIRECTS}`])).toBe(expected)
  expect(stagedRedirects(r)).toBe(expected)
  expect(after.files.get(REDIRECTS)).toBe(`-:${Buffer.from(expected).toString('base64')}`)
  expect(withoutRedirects(after.index)).toEqual(withoutRedirects(handed))
  expect(withoutPaths(after.files, [REDIRECTS])).toEqual(withoutPaths(before.files, [REDIRECTS]))
  expect(after.untracked).toEqual(before.untracked)
  expect(after.stash).toEqual(before.stash)
  return expected
}

/** Unstaged edits to `platform/public/other.txt` and `door/src/app.py`, and an untracked `platform/notes/untracked.txt`, in `r`. */
function addUnstagedWork(r: Repo): void {
  write(r, 'platform/public/other.txt', 'other, unstaged\n')
  write(r, DOOR_APP, 'from flask import Flask\napp = Flask("door, unstaged")\n')
  write(r, 'platform/notes/untracked.txt', 'untracked\n')
}

/** A stub at the validator that records the `git stash list` ids while it runs; `expectHookEntryOnTop` reads them. */
function stashLogOf(r: Repo): string {
  const log = join(r.base, 'validator stash.log')
  recordScript(r, 'challenge-lint-staged.ts', log, true)
  return log
}

/** The validator ran once and saw one new entry (the hook's) on top of the stash, with the ids from `before` behind it in order. */
function expectHookEntryOnTop(stashLog: string, before: Snapshot): void {
  const ids = before.stash.map((l) => l.split(' ')[0])
  const during = readRecord(stashLog)
  expect(during).toHaveLength(1)
  const [top, ...rest] = during[0].stash ?? []
  expect(top).toMatch(/^[0-9a-f]{40}$/)
  expect(ids).not.toContain(top)
  expect(rest).toEqual(ids)
}

/** Commit a stale `_redirects` (door's four rules removed) with `--no-verify`. */
function commitStaleRedirects(): void {
  const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
  const stale = head.split('\n').filter((l) => !l.includes('/challenge/door/') && !l.includes('/zh-TW/challenge/door/')).join('\n')
  expect(rulesOf(stale)).toEqual(FIXTURE_RULES.filter((r) => !r.includes('door')))
  write(repo, REDIRECTS, stale)
  git(repo, ['add', REDIRECTS])
  git(repo, ['commit', '-q', '--no-verify', '-m', 'a stale _redirects'])
}

/**
 * E1's repair step: the generator's own command over the whole working tree
 * (the fixture has no package.json, so `pnpm redirects:generate` runs as
 * `node --experimental-strip-types scripts/generate-redirects.ts`), then
 * `git add` of the file.
 */
function repairRedirects(): void {
  const gen = spawnSync('node', ['--experimental-strip-types', 'scripts/generate-redirects.ts'], { cwd: repo.dir, env: repo.env, encoding: 'utf8' })
  expect(gen.status, gen.stderr).toBe(0)
  git(repo, ['add', REDIRECTS])
}

/**
 * H34: a stale `_redirects` committed with `--no-verify`, repaired as E1
 * says, then `git commit` with the given environment, through the recording
 * shim: O2 on `.git/index`, and no W3, since the staged version already was
 * the expected one (H45 runs it with `/bin` first on `PATH`).
 */
function expectH34(env: NodeJS.ProcessEnv): void {
  commitStaleRedirects()
  repairRedirects()
  const shim = recordingShim(repo)
  const before = snapshot(repo)

  const run = commit(repo, ['-q', '-m', 'repair _redirects'], env)

  const expected = expectCommitO2(run, shim, repo, before, '.git/index')
  expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
  expectNoW3W4(run)
}

describe('pre-commit.sh: commit forms through git commit (AC-22)', () => {
  it('H32: git commit --amend that adds a challenge commits the expected file, with the amended change and unstaged files kept', () => {
    const amended = 'from flask import Flask\napp = Flask("door, amended")\n'
    write(repo, DOOR_APP, amended)
    git(repo, ['add', DOOR_APP])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'door change'])
    const parent = git(repo, ['rev-parse', 'HEAD~1'])
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    addUnstagedWork(repo)
    const stashLog = stashLogOf(repo)
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '--amend', '--no-edit'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index')
    expect(git(repo, ['rev-parse', 'HEAD~1'])).toBe(parent)
    expect(git(repo, ['show', `HEAD:${DOOR_APP}`])).toBe(amended)
    expect(git(repo, ['show', 'HEAD:platform/challenge/new-chall/challenge.yaml'])).toBe(declarationText(4))
    expect(rulesOf(expected)).toEqual(expect.arrayContaining([...FIXTURE_RULES, '/c/004 /challenge/new-chall/']))
    expectHookEntryOnTop(stashLog, before)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H34: a stale committed _redirects, repaired with the generator, git add and git commit, commits the expected file', () => {
    expectH34({})
  }, TIMEOUT)

  it('H34 boundary: an untracked numbered challenge during the repair is left out of the commit’s file, with W3 and W4, and stays untracked', () => {
    commitStaleRedirects()
    writeChallenge(repo, 'platform/challenge', 'draft', 4)
    repairRedirects()
    expect(rulesOf(read(repo, REDIRECTS))).toContain('/c/004 /challenge/draft/')
    const shim = recordingShim(repo)
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/draft/challenge.yaml')

    const run = commit(repo, ['-q', '-m', 'repair _redirects'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index')
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).toMatch(w4('platform/challenge/draft/'))
  }, TIMEOUT)

  /**
   * H35's fixture: branch `side` adds `alpha` (#4) and `main` adds `beta` (#5),
   * each with its regenerated `_redirects`, committed with `--no-verify`. Then
   * `git merge side` stops with `_redirects` the only unmerged path. Returns
   * the two tips.
   */
  function mergeStoppedOnRedirects(): { main: string; side: string } {
    git(repo, ['switch', '-q', '-c', 'side'])
    writeChallenge(repo, 'platform/challenge', 'alpha', 4)
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    stageChallenge('alpha')
    git(repo, ['add', REDIRECTS])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'alpha'])
    git(repo, ['switch', '-q', 'main'])
    writeChallenge(repo, 'platform/challenge', 'beta', 5)
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    stageChallenge('beta')
    git(repo, ['add', REDIRECTS])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'beta'])
    const tips = { main: git(repo, ['rev-parse', 'main']).trim(), side: git(repo, ['rev-parse', 'side']).trim() }

    const merge = gitRun(repo, ['merge', '-q', 'side'])

    expect(merge.status, merge.stderr).toBe(1)
    expect(git(repo, ['diff', '--name-only', '--diff-filter=U'])).toBe(`${REDIRECTS}\n`)
    return tips
  }

  function expectMergeCommit(tips: { main: string; side: string }): void {
    const [, ...parents] = git(repo, ['rev-list', '--parents', '-n1', 'HEAD']).trim().split(' ')
    expect(parents).toEqual([tips.main, tips.side])
    expect(existsSync(join(repo.dir, '.git/MERGE_HEAD'))).toBe(false)
  }

  it('H35: a merge whose _redirects conflict is resolved with the generator and git add, concluded with git commit, commits the expected file', () => {
    const tips = mergeStoppedOnRedirects()
    repairRedirects()
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '--no-edit'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index')
    expectMergeCommit(tips)
    expect(rulesOf(expected)).toEqual(expect.arrayContaining([...FIXTURE_RULES, '/c/004 /challenge/alpha/', '/c/005 /challenge/beta/']))
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H35 boundary: an untracked challenge and an unstaged edit during the resolution; the hook stashes mid-merge, and the merge commit’s file leaves the draft out, with W3 and W4', () => {
    const tips = mergeStoppedOnRedirects()
    writeChallenge(repo, 'platform/challenge', 'draft', 6)
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    repairRedirects()
    expect(rulesOf(read(repo, REDIRECTS))).toContain('/c/006 /challenge/draft/')
    const stashLog = stashLogOf(repo)
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '--no-edit'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index')
    expectMergeCommit(tips)
    expect(rulesOf(expected)).toEqual(expect.arrayContaining([...FIXTURE_RULES, '/c/004 /challenge/alpha/', '/c/005 /challenge/beta/']))
    expect(rulesOf(expected).some((r) => r.startsWith('/c/006 '))).toBe(false)
    expectHookEntryOnTop(stashLog, before)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).toMatch(w4('platform/challenge/draft/'))
  }, TIMEOUT)

  it('H36: git commit -p with its answers piped on stdin commits the expected file, and the unanswered hunks stay unstaged', () => {
    const LONG = 'platform/notes/long.txt'
    const long = Array.from({ length: 20 }, (_, i) => `line ${i + 1}\n`)
    write(repo, LONG, long.join(''))
    git(repo, ['add', LONG])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'long notes'])
    const door = git(repo, ['show', `HEAD:${DOOR_APP}`])
    write(repo, 'platform/challenge/test-chall/challenge.yaml', declarationText(6))
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not selected")\n')
    const firstOnly = ['line 1, selected\n', ...long.slice(1)]
    write(repo, LONG, [...firstOnly.slice(0, 19), 'line 20, not selected\n'].join(''))
    write(repo, 'platform/notes/untracked.txt', 'untracked\n')
    const stashLog = stashLogOf(repo)
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    // Hunk order: door/src/app.py, test-chall/challenge.yaml, then long.txt's two hunks.
    const run = gitRun(repo, ['commit', '-q', '-p', '-m', 'commit -p'], {}, 'n\ny\ny\nn\n')

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['show', 'HEAD:platform/challenge/test-chall/challenge.yaml'])).toBe(declarationText(6))
    expect(git(repo, ['show', `HEAD:${DOOR_APP}`])).toBe(door)
    expect(git(repo, ['show', `HEAD:${LONG}`])).toBe(firstOnly.join(''))
    expect(git(repo, ['diff', '--name-only', '--', 'platform/'])).toBe(`${DOOR_APP}\n${LONG}\n`)
    expect(rulesOf(expected)).toContain('/c/006 /challenge/test-chall/')
    expect(rulesOf(expected).some((r) => r.startsWith('/c/001 '))).toBe(false)
    expectHookEntryOnTop(stashLog, before)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H37: git commit -i <path> commits the staged challenge and the named file, with the expected file, and the other edit stays unstaged', () => {
    const door = git(repo, ['show', `HEAD:${DOOR_APP}`])
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall')
    write(repo, 'platform/challenge/test-chall/challenge.yaml', declarationText(7))
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not named")\n')
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-i', 'platform/challenge/test-chall/challenge.yaml', '-m', 'commit -i'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['show', 'HEAD:platform/challenge/new-chall/challenge.yaml'])).toBe(declarationText(4))
    expect(git(repo, ['show', 'HEAD:platform/challenge/test-chall/challenge.yaml'])).toBe(declarationText(7))
    expect(git(repo, ['show', `HEAD:${DOOR_APP}`])).toBe(door)
    expect(git(repo, ['diff', '--name-only'])).toBe(`${DOOR_APP}\n`)
    expect(rulesOf(expected)).toEqual(expect.arrayContaining(['/c/004 /challenge/new-chall/', '/c/007 /challenge/test-chall/']))
    expect(rulesOf(expected).some((r) => r.startsWith('/c/001 '))).toBe(false)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H37 boundary: git commit -i of a challenge directory removed from the working tree commits its deletion, and its rules go', () => {
    rmSync(join(repo.dir, 'platform/challenge/test-chall'), { recursive: true })
    rmSync(join(repo.dir, 'platform/en/challenge/test-chall'), { recursive: true })
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not named")\n')
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-i', 'platform/challenge/test-chall', 'platform/en/challenge/test-chall', '-m', 'commit -i'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['ls-tree', '-r', '--name-only', 'HEAD', 'platform/challenge/test-chall', 'platform/en/challenge/test-chall'])).toBe('')
    expect(git(repo, ['diff', '--name-only'])).toBe(`${DOOR_APP}\n`)
    expect(rulesOf(expected)).toEqual([...DOOR_RULES, ...PARAMETERISED_RULES])
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H38: git commit in a linked worktree commits the expected file there, its unstaged files are byte-identical, and the shared stash list keeps the teacher’s entry', () => {
    // The main worktree's own work, which the worktree's commit must not touch.
    write(repo, 'platform/public/other.txt', 'other, unstaged in the main worktree\n')
    write(repo, 'platform/notes/main.txt', 'untracked in the main worktree\n')
    const wt = addWorktree(repo)
    const mainTip = git(repo, ['rev-parse', 'main']).trim()
    const mainBefore = snapshot(repo)
    writeChallenge(wt, 'platform/challenge', 'new-chall', 4)
    stageChallenge('new-chall', wt)
    addUnstagedWork(wt)
    const stashLog = stashLogOf(wt)
    const shim = recordingShim(repo)
    const indexFile = git(wt, ['rev-parse', '--git-path', 'index']).trim()
    expect(physicalPath(wt.dir, indexFile)).toBe(join(realpathSync(join(repo.dir, '.git')), 'worktrees/連結-worktree/index'))
    const before = snapshot(wt)
    expect(before.stash).toEqual(mainBefore.stash)
    expect(before.stash.some((l) => l.startsWith(`${repo.preexisting} `))).toBe(true)

    const run = commit(wt, ['-q', '-m', 'in the linked worktree'])

    const expected = expectCommitO2(run, shim, wt, before, indexFile)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
    expectHookEntryOnTop(stashLog, before)
    expect(git(wt, ['rev-parse', 'wt~1']).trim()).toBe(mainTip)
    expect(git(wt, ['rev-parse', 'wt']).trim()).toBe(git(wt, ['rev-parse', 'HEAD']).trim())
    expect(git(repo, ['rev-parse', 'main']).trim()).toBe(mainTip)
    expectNothingChanged(mainBefore, snapshot(repo))
    expectNoW3W4(run)
  }, TIMEOUT)
})

// ─── The hook's stash (AC-23 constraint, B2) ────────────────────────────────

describe('pre-commit.sh: the hook’s stash entry', () => {
  it('holds the other unstaged files and never _redirects, and is gone after O2 while the teacher’s entry stays', () => {
    const log = join(repo.base, 'generator.log')
    recordScript(repo, 'generate-redirects.ts', log, true)
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    write(repo, REDIRECTS, `${head}# staged edit\n`)
    git(repo, ['add', REDIRECTS])
    write(repo, REDIRECTS, `${head}# unstaged edit\n`)
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("unstaged")\n')
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    write(repo, 'platform/en/challenge/draft/index.md', '---\ntitle: draft\n---\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    const ids = before.stash.map((l) => l.split(' ')[0])

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(expected).not.toContain('# staged edit')
    const during = readRecord(log)
    expect(during).toHaveLength(1)
    const added = (during[0].stash ?? []).filter((id) => !ids.includes(id))
    expect(added).toHaveLength(1)
    const [entry] = added
    // The teacher's entry was still there, behind the hook's own.
    expect(during[0].stash).toEqual([entry, ...ids])
    expect(git(repo, ['diff', '--name-only', `${entry}^2`, entry]).split('\n').filter(Boolean).sort())
      .toEqual([DOOR_APP, 'platform/public/other.txt'])
    expect(git(repo, ['ls-tree', '-r', '--name-only', `${entry}^3`]).split('\n').filter(Boolean))
      .toEqual(['platform/en/challenge/draft/index.md'])
    // The entry's index commit holds the staged _redirects, and its working-tree
    // commit the same: the unstaged edit never entered the entry.
    expect(git(repo, ['show', `${entry}:${REDIRECTS}`])).toBe(`${head}# staged edit\n`)
    expect(stashList(repo)).toEqual(before.stash)
    expect(run.stderr).toMatch(W3)
  }, TIMEOUT)
})

describe('pre-commit.sh: pathspec variables in the environment', () => {
  // GIT_LITERAL_PATHSPECS=1 would make ':(exclude)' a literal name, so _redirects
  // would enter the hook's stash and come back over the staged one.
  // GIT_GLOB_PATHSPECS and GIT_ICASE_PATHSPECS conflict with the
  // GIT_LITERAL_PATHSPECS=1 of the hook's removal step, which git then refuses:
  // the file staged as new and deleted from the working tree makes the hook take
  // that step. GIT_NOGLOB_PATHSPECS does not conflict with it, and the hook's
  // pathspecs hold no wildcard, so its case only checks that the outcome is
  // unchanged; the hook unsets it defensively.
  for (const name of ['GIT_LITERAL_PATHSPECS', 'GIT_GLOB_PATHSPECS', 'GIT_NOGLOB_PATHSPECS', 'GIT_ICASE_PATHSPECS']) {
    it(`${name}=1 leaves the outcome unchanged: _redirects stays out of the hook's stash (D3), and a staged-then-deleted file stays deleted`, () => {
      const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
      write(repo, REDIRECTS, `${head}# staged edit\n`)
      git(repo, ['add', REDIRECTS])
      write(repo, REDIRECTS, `${head}# unstaged edit\n`)
      write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("unstaged")\n')
      write(repo, 'platform/en/challenge/draft/index.md', '---\ntitle: draft\n---\n')
      write(repo, 'platform/notes/staged-then-deleted.txt', 'staged\n')
      git(repo, ['add', 'platform/notes/staged-then-deleted.txt'])
      unlinkSync(join(repo.dir, 'platform/notes/staged-then-deleted.txt'))
      const expected = expectedRedirects(repo)
      const before = snapshot(repo)

      const run = runHook(repo, { [name]: '1' })

      expectO2(run, before, snapshot(repo), expected)
      expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
      expect(run.stderr).toMatch(W3)
    }, TIMEOUT)
  }
})

// ─── The restore stays inside platform/ (B2) ────────────────────────────────

describe('pre-commit.sh: the restore writes nothing outside platform/ (B2)', () => {
  it('S2: newly staged files behind a directory replaced by a link to outside the repository are left alone, and the outside files keep their bytes', () => {
    writeChallenge(repo, 'platform/challenge', 'linked', 4)
    stageChallenge('linked')
    // The teacher moves src/ out of the repository and links it back.
    const src = 'platform/challenge/linked/src'
    const outside = join(repo.base, 'outside src')
    renameSync(join(repo.dir, src), outside)
    symlinkSync(outside, join(repo.dir, src))
    const outsideBefore = readdirSync(outside).sort().map((name) => [name, readFileSync(join(outside, name)).toString('base64')])
    expect(outsideBefore.map(([name]) => name)).toEqual(['app.py', 'flag.txt'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(readdirSync(outside).sort().map((name) => [name, readFileSync(join(outside, name)).toString('base64')])).toEqual(outsideBefore)
    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([
      ...TEST_CHALL_RULES,
      ...DOOR_RULES,
      '/c/004 /challenge/linked/',
      '/en/c/004 /challenge/linked/',
      '/zh/c/004 /challenge/linked/',
      '/zh-TW/c/004 /challenge/linked/',
      ...PARAMETERISED_RULES,
    ])
    expect(run.stderr).toContain(`${src}/app.py`)
    expect(run.stderr).toContain(`${src}/flag.txt`)
    expectNoW3W4(run)
  }, TIMEOUT)
})

// ─── Interruption, git failures and a failed restore (AC-23) ────────────────

const NOTES = 'platform/notes/名 稱.txt'
const BINARY = 'platform/notes/blob.bin'
const UNTRACKED = 'platform/notes/untracked.txt'

/**
 * The teacher's work in the failure cases: a staged challenge change, unstaged
 * edits to other.txt, to a tracked file whose name holds a space and non-ASCII
 * characters and to a tracked binary file, an untracked file, and an unstaged
 * hand edit of `_redirects`. All text is LF. With `overlap`, the staged change
 * is a hunk of door's app.py that its unstaged change overlaps (H19).
 */
function addFailureWork(overlap: boolean): void {
  write(repo, NOTES, 'notes\n')
  write(repo, BINARY, Buffer.from([0, 1, 2, 255, 0, 10, 13]))
  if (overlap) write(repo, DOOR_APP, 'line 1\nline 2\nline 3\n')
  git(repo, ['add', 'platform/notes', DOOR_APP])
  git(repo, ['commit', '-q', '--no-verify', '-m', 'notes'])
  if (overlap) {
    write(repo, DOOR_APP, 'line 1\nline 2, staged\nline 3\n')
    git(repo, ['add', DOOR_APP])
    write(repo, DOOR_APP, 'line 1\nline 2, unstaged\nline 3\n')
  } else {
    stageDoorChange()
  }
  write(repo, 'platform/public/other.txt', 'other, unstaged\n')
  write(repo, NOTES, 'notes, unstaged\n')
  write(repo, BINARY, Buffer.from([0, 1, 2, 255, 0, 10, 13, 7]))
  write(repo, UNTRACKED, 'untracked notes\n')
  write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
}

/** A failed run: a non-zero code, or termination by the signal sent (git treats both as a failed hook). */
function expectFailed(run: Run | GroupRun, signal?: NodeJS.Signals): void {
  if (run.status === null) {
    expect((run as GroupRun).signal, run.stderr).toBe(signal)
  } else {
    expect(run.status, run.stderr).not.toBe(0)
  }
}

/** O5, exact: a failed run, and index, every byte (`_redirects` included), untracked files and the stash list as before. */
function expectO5(run: Run | GroupRun, before: Snapshot, after: Snapshot, signal?: NodeJS.Signals): void {
  expectFailed(run, signal)
  expectNothingChanged(before, after)
}

function ids(s: Snapshot): string[] {
  return s.stash.map((l) => l.split(' ')[0])
}

describe('pre-commit.sh: interruption (H25)', () => {
  it.each(['SIGINT', 'SIGTERM', 'SIGHUP'] as const)('H25: %s to the hook’s process group while the generator blocks ends in O5, and the overlapping file keeps its unstaged bytes', async (signal) => {
    addFailureWork(true)
    const marks = markerDir(repo)
    const marker = join(marks, 'generator')
    const record = join(marks, 'record.json')
    blockingGenerator(repo, { marker, record })
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK])
    await waitForFile(marker)
    group.kill(signal)
    const run = await group.done()

    expect(run.leftover).toBe(false)
    // The hook ends with 128 + the signal's number, under bash 3.2 as under bash 5.
    expect(run.status, run.stderr).toBe({ SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[signal])
    // While the stub blocked, the hook had an entry of its own above the teacher's.
    expect(readBlockingRecord(record).stash.slice(1)).toEqual(ids(before))
    expect(readBlockingRecord(record).stash).toHaveLength(ids(before).length + 1)
    expectO5(run, before, snapshot(repo), signal)
    expect(read(repo, DOOR_APP)).toBe('line 1\nline 2, unstaged\nline 3\n')
  }, TIMEOUT)
})

describe('pre-commit.sh: signals while restoring (AC-23 constraint)', () => {
  it('ignores SIGINT, SIGTERM and SIGHUP while it restores, and drops its entry only after the restore completed', async () => {
    addFailureWork(true)
    const marker = join(markerDir(repo), 'generator')
    blockingGenerator(repo, { marker })
    const wrapper = gitWrapper(repo, 'restore --source=', 'block-ignoring', true)
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], wrapper.env)
    await waitForFile(marker)
    group.kill('SIGTERM')
    await waitForFile(wrapper.blocked)
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) group.kill(signal)
    wrapper.release()
    const run = await group.done()

    expect(wrapper.matched()).toBe(true)
    expect(run.leftover).toBe(false)
    expectO5(run, before, snapshot(repo), 'SIGTERM')
    expect(read(repo, DOOR_APP)).toBe('line 1\nline 2, unstaged\nline 3\n')
  }, TIMEOUT)
})

describe('pre-commit.sh: interruption before the _redirects git add (H25 boundary)', () => {
  it('SIGINT after the hook wrote _redirects and before its git add ran ends in O5, with _redirects back to its old bytes', async () => {
    addFailureWork(false)
    const wrapper = gitWrapper(repo, `add -- ${REDIRECTS}`, 'block')
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], wrapper.env)
    await waitForFile(wrapper.blocked)
    // The hook has written the expected file by now.
    expect(read(repo, REDIRECTS)).toBe(expectedRedirects(repo))
    group.kill('SIGINT')
    const run = await group.done()

    expect(wrapper.matched()).toBe(true)
    expect(run.leftover).toBe(false)
    expectO5(run, before, snapshot(repo), 'SIGINT')
  }, TIMEOUT)
})

/** The bytes of a blob, as git stores it, or null when `rev` names none. */
function blobBytes(rev: string): Buffer | null {
  const r = spawnSync('git', ['show', rev], { cwd: repo.dir, env: repo.env })
  return r.status === 0 ? r.stdout : null
}

/** The tracked files a stash entry holds (its index commit to its working-tree commit), NUL-separated so names stay unquoted. */
function entryTracked(id: string): string[] {
  return git(repo, ['diff', '-z', '--name-only', `${id}^2`, id]).split('\0').filter(Boolean)
}

/** The untracked files a stash entry holds (its third parent); none when it has no third parent. */
function entryUntracked(id: string): string[] {
  if (gitRun(repo, ['rev-parse', '-q', '--verify', `${id}^3`]).status !== 0) return []
  return git(repo, ['ls-tree', '-r', '-z', '--name-only', `${id}^3`]).split('\0').filter(Boolean)
}

/**
 * W9's first or second form (a failed or partial restore, a missing index):
 * `git stash apply <id>` and the `git restore` commands that put the files
 * back without the index. Returns the printed id.
 */
function expectW9(run: Run | GroupRun): string {
  const m = run.stderr.match(/git stash apply ([0-9a-f]{40})/)
  expect(m, run.stderr).not.toBeNull()
  const id = m![1]
  expect(run.stderr).toContain(`git restore --source=${id} --worktree`)
  return id
}

/**
 * O7: a failed run with W9; the stash list is the one from before plus exactly
 * the printed entry; index and `_redirects` as before; each tracked file the
 * entry holds has the bytes of the entry's index commit, and each untracked
 * file it holds is absent: not yet back. Returns the entry's id.
 */
function expectO7(run: Run | GroupRun, before: Snapshot, after: Snapshot, signal?: NodeJS.Signals): string {
  expectFailed(run, signal)
  const id = expectW9(run)
  expect(ids(after)).toEqual([id, ...ids(before)])
  expect(after.index).toEqual(before.index)
  expect(after.files.get(REDIRECTS)).toBe(before.files.get(REDIRECTS))
  const tracked = entryTracked(id)
  expect(tracked.length).toBeGreaterThan(0)
  for (const path of tracked) expect(readFileSync(join(repo.dir, path))).toEqual(blobBytes(`${id}^2:${path}`))
  const untracked = entryUntracked(id)
  for (const path of untracked) expect(existsSync(join(repo.dir, path))).toBe(false)
  return id
}

/**
 * Run every `git restore` command W9 prints, in the order printed, as a
 * teacher would paste them into a shell, in `cwd` (the top level unless
 * given). Each printed line ends with its command.
 */
function runPrintedRestore(run: Run | GroupRun, cwd = repo.dir): void {
  const commands = [...run.stderr.matchAll(/, run: (git restore .*)$/gm)].map((m) => m[1])
  expect(commands.length, run.stderr).toBeGreaterThan(0)
  for (const command of commands) {
    const r = spawnSync('sh', ['-c', command], { cwd, env: repo.env, encoding: 'utf8' })
    expect(r.status, `${command}\n${r.stderr}`).toBe(0)
  }
}

/** Every file, the untracked list and the index as before the run. */
function expectAllBack(before: Snapshot): void {
  const after = snapshot(repo)
  expect(after.files).toEqual(before.files)
  expect(after.untracked).toEqual(before.untracked)
  expect(after.index).toEqual(before.index)
}

/** After `git stash apply <id>`: everything as before the run. */
function expectApplied(id: string, before: Snapshot): void {
  git(repo, ['stash', 'apply', '--quiet', id])
  expectAllBack(before)
}

describe('pre-commit.sh: a failed restore (H26)', () => {
  it('H26: a generator stub that leaves .git/index.lock makes git add and the restore fail: O7 with W9, and git stash apply of the printed id brings the files back once the lock is gone', () => {
    addFailureWork(false)
    lockingGenerator(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    const lock = join(repo.dir, '.git/index.lock')
    expect(existsSync(lock)).toBe(true)
    const id = expectO7(run, before, snapshot(repo))
    expect(entryTracked(id).sort())
      .toEqual([BINARY, NOTES, 'platform/public/other.txt'].sort())
    expect(entryUntracked(id)).toEqual([UNTRACKED])
    unlinkSync(lock)
    expectApplied(id, before)
  }, TIMEOUT)
})

describe('pre-commit.sh: a git failure before the stash (H46)', () => {
  it('H46: an empty .git/index.lock before a direct run makes the stash push fail: O5 before any change, and the lock keeps its bytes', () => {
    addFailureWork(false)
    const lock = join(repo.dir, '.git/index.lock')
    write(repo, '.git/index.lock', '')
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO5(run, before, snapshot(repo))
    expect(readFileSync(lock)).toEqual(Buffer.alloc(0))
    unlinkSync(lock)
  }, TIMEOUT)
})

const REST = `platform/ :(exclude)${REDIRECTS}`
/** The hook's challenge-tree pathspecs, as the generator lists them (D126). */
const TREES = 'platform/challenge/ platform/en/challenge/ platform/zh-TW/challenge/'
/** The hook's stash push, as the git wrapper matches it. */
const PUSH = `-c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m pre-commit: stash unstaged changes -- ${REST}`

describe('pre-commit.sh: a git command that fails where set -e cannot see it (O5)', () => {
  it.each([
    ['the stash push, which saved its entry and then exits 1', PUSH, 'run-then-fail'],
    ['the stash push, which fails before saving anything (the teacher’s entry stays on top of refs/stash)', PUSH, 'fail'],
    ['the untracked-directory listing (W4)', `ls-files -z --others --exclude-standard --directory --no-empty-directory -- ${TREES}`, 'fail'],
    ['the deleted-paths listing', `diff -z --name-only --diff-filter=D -- ${REST}`, 'fail'],
    ['the raw-copy listing of modified files', `diff -z --name-only --diff-filter=MT -- ${REST}`, 'fail'],
    ['the raw-copy listing of untracked files', `ls-files -z --others --exclude-standard -- ${REST}`, 'fail'],
    ['the check for unstaged files under platform/', `diff --quiet -- ${REST}`, 'fail'],
    ['refs/stash read before the push', 'rev-parse -q --verify refs/stash', 'fail'],
    ['the validator’s ACMRD list', `diff --cached --name-only -z --diff-filter=ACMRD -- ${TREES}`, 'fail'],
    ['the index path read of --staged (the brief check and the index slugs)', 'ls-files -z -- platform/', 'fail'],
    ['the index’s range.json read (D114)', 'ls-files -s -- range.json', 'fail'],
  ] as const)('%s: O5, exact', (_name, args, mode) => {
    addFailureWork(false)
    // A challenge file in the validator's list, so the ACMRD listing has a path to give.
    const wrapper = gitWrapper(repo, args, mode)
    const before = snapshot(repo)

    const run = runHook(repo, wrapper.env)

    expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expectO5(run, before, snapshot(repo))
  }, TIMEOUT)
})

describe('pre-commit.sh: a signal while the stash push runs (O5)', () => {
  it('SIGINT to the process group once the push saved its entry, before the hook recorded it: the hook still restores and drops it, O5, exact', async () => {
    addFailureWork(false)
    const wrapper = gitWrapper(repo, PUSH, 'run-then-block')
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], wrapper.env)
    await waitForFile(wrapper.blocked)
    // The push has saved its entry and taken the untracked file out of the working tree.
    expect(stashList(repo)).toHaveLength(before.stash.length + 1)
    expect(existsSync(join(repo.dir, UNTRACKED))).toBe(false)
    group.kill('SIGINT')
    const run = await group.done()

    expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expect(run.leftover).toBe(false)
    expect(run.status, run.stderr).toBe(130)
    expectO5(run, before, snapshot(repo))
  }, TIMEOUT)

  it('SIGTERM to the hook alone just before git runs the push: git completes it, then the hook restores and drops the entry, O5, exact', async () => {
    addFailureWork(false)
    const wrapper = gitWrapper(repo, PUSH, 'block')
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], wrapper.env)
    await waitForFile(wrapper.blocked)
    group.killLeader('SIGTERM')
    wrapper.release()
    const run = await group.done()

    expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expect(run.leftover).toBe(false)
    expect(run.status, run.stderr).toBe(143)
    expectO5(run, before, snapshot(repo))
  }, TIMEOUT)
})

/** The child commands of git's own after which a stash push has changed the index (D16 (b)). */
const PARTWAY = [
  ['apply --index -R', 'its git add has staged the unstaged and untracked files'],
  ['checkout --no-overlay', 'its git apply -R has put the index back to HEAD'],
] as const

/**
 * W9's third form: the files are back, so it gives no command that writes the
 * working tree, only the `git restore --staged` command that puts the index
 * back. Returns the printed id.
 */
function expectW9ForIndex(run: Run | GroupRun): string {
  const m = run.stderr.match(/git restore --staged --source=([0-9a-f]{40})\^2 /)
  expect(m, run.stderr).not.toBeNull()
  const id = m![1]
  expect(run.stderr).toContain(`stash entry ${id}`)
  expect(run.stderr).not.toContain(`git restore --source=${id} --worktree`)
  expect(run.stderr).not.toMatch(/run: git stash apply/)
  return id
}

describe('pre-commit.sh: a stash push that stops after it stored its entry and changed the index (H48: O7, W9)', () => {
  it.each(PARTWAY)('H48: SIGINT while git’s own `git %s` blocks (%s): the hook puts the files back, keeps its entry, and W9’s printed command puts the index back', async (child) => {
    addFailureWork(false)
    const blocker = gitChildBlocker(repo, child)
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], blocker.env)
    await waitForFile(blocker.blocked)
    // git stored the entry before it changed the index.
    expect(stashList(repo)).toHaveLength(before.stash.length + 1)
    expect(snapshot(repo).index).not.toEqual(before.index)
    group.kill('SIGINT')
    const run = await group.done()

    expect(blocker.matched(), 'blocker never matched').toBe(true)
    expect(run.leftover).toBe(false)
    expect(run.status, run.stderr).toBe(130)
    const id = expectW9ForIndex(run)
    const after = snapshot(repo)
    expect(ids(after)).toEqual([id, ...ids(before)])
    expect(after.files).toEqual(before.files)
    expect(after.index).not.toEqual(before.index)
    // The command's pathspecs start at the top level, so it works in a subdirectory.
    runPrintedRestore(run, join(repo.dir, 'platform/challenge/door'))
    expectAllBack(before)
  }, TIMEOUT)

  it.each(PARTWAY)('H48: git’s own `git %s` fails (%s) in a direct run: the same end without a signal', (child) => {
    addFailureWork(false)
    const blocker = gitChildBlocker(repo, child, 'fail')
    const before = snapshot(repo)

    const run = runHook(repo, blocker.env)

    expect(blocker.matched(), 'blocker never matched').toBe(true)
    expectFailed(run)
    const id = expectW9ForIndex(run)
    const after = snapshot(repo)
    expect(ids(after)).toEqual([id, ...ids(before)])
    expect(after.files).toEqual(before.files)
    expect(after.index).not.toEqual(before.index)
    runPrintedRestore(run)
    expectAllBack(before)
  }, TIMEOUT)
})

describe('pre-commit.sh: a stash push that stops partway under git commit -a (H49)', () => {
  it.each(PARTWAY)('H49: git’s own `git %s` fails (%s) during a git commit -a: git discards the index.lock the push changed, so the hook drops its entry once the files are back and prints no W9: O5, exact, and no commit', (child) => {
    addFailureWork(false)
    const blocker = gitChildBlocker(repo, child, 'fail')
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)

    const run = commit(repo, ['-a', '-q', '-m', 'stopped partway'], blocker.env)

    expect(blocker.matched(), 'blocker never matched').toBe(true)
    expect(run.stderr).not.toContain('git restore --staged')
    expect(run.stderr).not.toContain('git stash apply')
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expect(existsSync(join(repo.dir, '.git/index.lock'))).toBe(false)
    expectO5(run, before, snapshot(repo))
  }, TIMEOUT)
})

describe('pre-commit.sh: a restore that stops partway (H50)', () => {
  const LOCKED_DIR = 'platform/notes/唯讀 dir'
  const LOCKED = `${LOCKED_DIR}/草稿.txt`

  // root may remove a file from a directory it cannot write, so the case needs another user.
  it.skipIf(process.getuid?.() === 0)('H50: an untracked file in a directory without write permission: the push cannot remove it and the restore cannot overwrite it, so the restore stops partway; O7 with W9, and once the directory is writable again W9’s printed git restore commands put every file back, where git stash apply refuses', () => {
    addFailureWork(false)
    write(repo, LOCKED, 'draft\n')
    const dir = join(repo.dir, LOCKED_DIR)
    chmodSync(dir, 0o555)
    try {
      const before = snapshot(repo)

      const run = runHook(repo)

      expectFailed(run)
      const id = expectW9(run)
      // The push completed, so W9 is its first form, with no command for the index.
      expect(run.stderr).not.toContain('git restore --staged')
      const after = snapshot(repo)
      expect(ids(after)).toEqual([id, ...ids(before)])
      // Partly back: every tracked edit came back before the untracked file failed.
      const tracked = entryTracked(id)
      expect(tracked.sort()).toEqual([BINARY, NOTES, 'platform/public/other.txt'].sort())
      for (const path of tracked) expect(after.files.get(path), path).toBe(before.files.get(path))
      // The push could not remove the untracked file, and the entry holds it too.
      expect(existsSync(join(repo.dir, LOCKED))).toBe(true)
      expect(entryUntracked(id)).toContain(LOCKED)
      // The push completed, so the index is as before, but for the _redirects the hook staged.
      expect(withoutRedirects(after.index)).toEqual(withoutRedirects(before.index))
      chmodSync(dir, 0o755)
      // Files already back make git stash apply refuse.
      expect(gitRun(repo, ['stash', 'apply', '--quiet', id]).status).not.toBe(0)
      runPrintedRestore(run)
      const back = snapshot(repo)
      // _redirects was staged before the restore failed: as O5 allows, it holds the expected content.
      expect(withoutPaths(back.files, [REDIRECTS])).toEqual(withoutPaths(before.files, [REDIRECTS]))
      expect(back.untracked).toEqual(before.untracked)
      expect(withoutRedirects(back.index)).toEqual(withoutRedirects(before.index))
      expect(read(repo, REDIRECTS)).toBe(stagedRedirects(repo))
    } finally {
      chmodSync(dir, 0o755)
    }
  }, TIMEOUT)

  it.skipIf(process.getuid?.() === 0)('H51: a tracked file with an unstaged change and an untracked file in a directory without write permission: the push’s git add stages both, its git apply -R cannot rewrite the tracked file, so it stops partway with the index changed, and the restore then fails on the untracked file; O7 with W9’s first form and the git restore --staged command, and once the directory is writable W9’s printed commands, run in order, put every file and the index back', () => {
    const LOCKED_TRACKED = `${LOCKED_DIR}/表.txt`
    // Committed with the notes by addFailureWork.
    write(repo, LOCKED_TRACKED, 'table\n')
    addFailureWork(false)
    write(repo, LOCKED_TRACKED, 'table, unstaged\n')
    write(repo, LOCKED, 'draft\n')
    const dir = join(repo.dir, LOCKED_DIR)
    chmodSync(dir, 0o555)
    try {
      const before = snapshot(repo)

      const run = runHook(repo)

      expectFailed(run)
      const id = expectW9(run)
      expect(run.stderr).toContain(`git restore --staged --source=${id}^2`)
      const after = snapshot(repo)
      expect(ids(after)).toEqual([id, ...ids(before)])
      // The push's git add staged the unstaged change and the untracked files.
      expect(after.index).not.toEqual(before.index)
      chmodSync(dir, 0o755)
      runPrintedRestore(run)
      expectAllBack(before)
    } finally {
      chmodSync(dir, 0o755)
    }
  }, TIMEOUT)
})

describe('pre-commit.sh: the index goes missing during the restore (AC-23 constraint, H52)', () => {
  it('H52: on index.lock, when the lock is gone by the time the restore runs, as after git removed it on a SIGINT to an interrupted git commit -p, the hook keeps its entry and prints W9 for a missing index instead of dropping the entry, and W9’s printed commands put every file back', () => {
    addFailureWork(false)
    const lock = join(repo.dir, '.git/index.lock')
    copyFileSync(join(repo.dir, '.git/index'), lock)
    // git removes the lock just as the hook's restore starts: after the hook checked for it.
    const wrapper = gitWrapper(repo, 'restore --source=', 'remove-index-then-run', true)
    const before = snapshot(repo)

    const run = runHook(repo, { ...wrapper.env, GIT_INDEX_FILE: lock })

    expect(wrapper.matched(), 'wrapper never matched').toBe(true)
    expect(existsSync(lock)).toBe(false)
    expectFailed(run)
    expect(run.stderr).toContain('the index this commit ran on is gone')
    const id = expectW9(run)
    const after = snapshot(repo)
    expect(ids(after)).toEqual([id, ...ids(before)])
    expect(after.index).toEqual(before.index)
    runPrintedRestore(run)
    const back = snapshot(repo)
    expect(withoutPaths(back.files, [REDIRECTS])).toEqual(withoutPaths(before.files, [REDIRECTS]))
    expect(back.untracked).toEqual(before.untracked)
    expect(back.index).toEqual(before.index)
    // The hook staged _redirects in the lock that is gone: as O5 allows on
    // index.lock, the working tree holds the expected content, .git/index the old one.
    expect(read(repo, REDIRECTS)).toBe(expectedRedirects(repo))
  }, TIMEOUT)
})

describe('pre-commit.sh: never restores into a missing index (AC-23 constraint, H47)', () => {
  it.each([
    ['git stash apply', null],
    ['the git restore commands W9 prints, run at the top level', ''],
    ['the git restore commands W9 prints, run in platform/challenge/door/', 'platform/challenge/door'],
  ] as const)('when the index GIT_INDEX_FILE names is gone at SIGINT, the hook keeps its entry (O7 with W9), writes no index there, and %s brings the files back', async (_remedy, cwd) => {
    addFailureWork(false)
    const lock = join(repo.dir, '.git/index.lock')
    copyFileSync(join(repo.dir, '.git/index'), lock)
    const marker = join(markerDir(repo), 'generator')
    blockingGenerator(repo, { marker, removeIndexFile: true })
    const before = snapshot(repo)

    const group = startGroup(repo, 'bash', [HOOK], { GIT_INDEX_FILE: lock })
    await waitForFile(marker)
    expect(existsSync(lock)).toBe(false)
    group.kill('SIGINT')
    const run = await group.done()

    expect(run.leftover).toBe(false)
    expect(existsSync(lock)).toBe(false)
    const id = expectO7(run, before, snapshot(repo), 'SIGINT')
    expect(entryUntracked(id)).toEqual([UNTRACKED])
    if (cwd === null) {
      expectApplied(id, before)
    } else {
      // The entry holds tracked changes the working tree lacks, as after an
      // interrupted `git commit -p`; the printed commands bring them back too,
      // from any directory of the repository.
      runPrintedRestore(run, join(repo.dir, cwd))
      expectAllBack(before)
    }
  }, TIMEOUT)
})

describe('pre-commit.sh: SIGINT to an interrupted git commit -a (H47)', () => {
  it('H47: ends in O5 or O7; HEAD and .git/index as before, no index.lock left, and every earlier byte in the working tree or in the entry W9 names, and W9’s printed commands put every file back', async () => {
    addFailureWork(false)
    const marks = markerDir(repo)
    const marker = join(marks, 'generator')
    const record = join(marks, 'record.json')
    blockingGenerator(repo, { marker, record })
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)

    const group = startGroup(repo, 'git', ['commit', '-a', '-q', '-m', 'interrupted'])
    await waitForFile(marker)
    expect(readBlockingRecord(record).indexFile).toBe(join(repo.dir, '.git/index.lock'))
    group.kill('SIGINT')
    const run = await group.done()

    expect(run.leftover).toBe(false)
    expectFailed(run, 'SIGINT')
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expect(existsSync(join(repo.dir, '.git/index.lock'))).toBe(false)
    const after = snapshot(repo)
    expect(after.index).toEqual(before.index)
    if (run.stderr.includes('git stash apply')) {
      console.log('H47 took O7')
      const id = expectW9(run)
      expect(ids(after)).toEqual([id, ...ids(before)])
      for (const [path, bytes] of before.files) {
        if (after.files.get(path) === bytes) continue
        const content = bytes.slice(2)
        const inEntry = [`${id}:${path}`, `${id}^3:${path}`].some((rev) => blobBytes(rev)?.toString('base64') === content)
        expect(inEntry, `${path} is neither back nor in ${id}`).toBe(true)
      }
      // W9's remedy for a missing index, run as printed, puts every file back
      // and leaves the index alone.
      runPrintedRestore(run)
      expectAllBack(before)
    } else {
      console.log('H47 took O5')
      expectNothingChanged(before, after)
    }
  }, TIMEOUT)
})

// ─── A first commit (H27, H28) ──────────────────────────────────────────────

/** W7: the hook, O6. */
function expectW7(run: Run): void {
  expect(run.stderr).toContain('first commit')
  expect(run.stderr).toContain('git add')
}

function expectNoHead(): void {
  expect(gitRun(repo, ['rev-parse', '-q', '--verify', 'HEAD']).status).not.toBe(0)
}

describe('pre-commit.sh: a first commit (H27, H28)', () => {
  let first: Fixture

  beforeAll(() => {
    first = buildFirstCommitFixture()
  }, TIMEOUT)

  afterAll(() => {
    if (first) removeRepo(first)
  })

  beforeEach(() => {
    removeRepo(repo)
    repo = cloneFixture(first)
  })

  const unstaged = {
    'an unstaged edit to a staged file under platform/': () => write(repo, 'platform/public/other.txt', 'other, unstaged\n'),
    'an untracked file under platform/': () => write(repo, UNTRACKED, 'untracked notes\n'),
  }

  for (const [name, addWork] of Object.entries(unstaged)) {
    it(`H27: with no HEAD and ${name}, a direct run ends in O6 with W7, before the validator or the generator runs`, () => {
      git(repo, ['add', '.'])
      addWork()
      const validator = validatorLog()
      const generator = generatorLog()
      const before = snapshot(repo)
      expect(before.stash).toEqual([])

      const run = runHook(repo)

      expect(run.status, run.stderr).toBe(1)
      expectW7(run)
      expectNothingChanged(before, snapshot(repo))
      expectNoHead()
      expect(readRecord(validator)).toEqual([])
      expect(readRecord(generator)).toEqual([])
    }, TIMEOUT)

    it(`H27: with no HEAD and ${name}, git commit -m is refused with W7 and makes no commit`, () => {
      git(repo, ['add', '.'])
      addWork()
      const before = snapshot(repo)

      const run = commit(repo, ['-m', 'first'])

      expect(run.status).toBe(1)
      expectW7(run)
      expectNothingChanged(before, snapshot(repo))
      expectNoHead()
    }, TIMEOUT)
  }

  it('H28: with no HEAD and everything under platform/ staged, a direct run ends in O2: the expected _redirects staged as added, with no W3', () => {
    git(repo, ['add', '.'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual([...TEST_CHALL_RULES, ...PARAMETERISED_RULES])
    expect(git(repo, ['diff', '--cached', '--name-status', '--', REDIRECTS])).toBe(`A\t${REDIRECTS}\n`)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H28: through git commit -m, the root commit’s tree holds the expected _redirects', () => {
    git(repo, ['add', '.'])
    const expected = expectedRedirects(repo)

    const run = commit(repo, ['-q', '-m', 'first'])

    expect(run.status, run.stderr).toBe(0)
    expect(gitRun(repo, ['rev-parse', '-q', '--verify', 'HEAD^']).status).not.toBe(0)
    expect(git(repo, ['show', `HEAD:${REDIRECTS}`])).toBe(expected)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H28 boundary: an untracked file outside platform/ still gives O2, and stays byte-identical and untracked', () => {
    git(repo, ['add', '.'])
    write(repo, 'notes outside.txt', 'outside platform\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toEqual(['?? "notes outside.txt"'])

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H28 boundary: when only an unstaged _redirects differs, the hook needs no stash: O2, the working tree’s file replaced (D3), with W3', () => {
    git(repo, ['add', '.'])
    write(repo, REDIRECTS, '# a hand-made file\n')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toEqual([`?? ${REDIRECTS}`])

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expect(stagedRedirects(repo)).toBe(expected)
    const after = snapshot(repo)
    expect(withoutPaths(after.files, [REDIRECTS])).toEqual(withoutPaths(before.files, [REDIRECTS]))
    expect(read(repo, REDIRECTS)).toBe(expected)
    expect(after.untracked).toEqual([])
    expect(after.stash).toEqual([])
    expect(run.stderr).toMatch(W3)
  }, TIMEOUT)
})

describe('pre-commit.sh: a run with nothing to stash (H42)', () => {
  it('H42: only _redirects staged with a hand edit and unstaged with another: O2 with W3, no entry of the hook’s own, and the teacher’s entry neither applied nor dropped', () => {
    const log = join(repo.base, 'generator.log')
    recordScript(repo, 'generate-redirects.ts', log, true)
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    write(repo, REDIRECTS, `${head}# staged edit\n`)
    git(repo, ['add', REDIRECTS])
    write(repo, REDIRECTS, `${head}# unstaged edit\n`)
    const expected = expectedRedirects(repo)
    expect(expected).toBe(head)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    const during = readRecord(log)
    expect(during).toHaveLength(1)
    expect(during[0].stash).toEqual(ids(before))
    expect(read(repo, 'platform/public/other.txt')).toBe('other\n')
    expect(read(repo, REDIRECTS)).not.toContain('# stashed by the teacher')
  }, TIMEOUT)
})

// ─── macOS's /bin/bash 3.2 (H45) ────────────────────────────────────────────

const BASH_3 = spawnSync('/bin/bash', ['-c', 'echo ${BASH_VERSINFO[0]}'], { encoding: 'utf8' }).stdout?.trim() === '3'

describe.skipIf(!BASH_3)('pre-commit.sh: under macOS’s /bin/bash 3.2 (H45)', () => {
  const env = (): NodeJS.ProcessEnv => ({ PATH: `/bin:${repo.env.PATH ?? ''}` })

  function expectBinBash(): void {
    const r = spawnSync('sh', ['-c', 'command -v bash; bash -c \'echo ${BASH_VERSINFO[0]}\''], { env: { ...repo.env, ...env() }, encoding: 'utf8' })
    expect(r.stdout).toBe('/bin/bash\n3\n')
  }

  it('H45: H02 and H14 with /bin/bash running the hook directly give their outcome', () => {
    expectH02H14('/bin/bash')
  }, TIMEOUT)

  it('H45: S44’s first case (a brief fault the index holds) with /bin/bash running the hook directly gives its outcome', () => {
    expectS44First('/bin/bash')
  }, TIMEOUT)

  it('H45: H07 through git commit with /bin first on PATH gives its outcome', () => {
    expectBinBash()
    expectH07(env())
  }, TIMEOUT)

  it('H45: H34 through git commit with /bin first on PATH gives its outcome', () => {
    expectBinBash()
    expectH34(env())
  }, TIMEOUT)
})
