/**
 * Tests for scripts/pre-commit.sh (seam 0007-S5).
 *
 * Every case runs this checkout's real hook, by its absolute path, with `bash`
 * at the top level of a temporary repository whose path holds a space and
 * non-ASCII characters: directly, or through a real `git commit` whose
 * installed `.git/hooks/pre-commit` runs that file. The fixture is described in
 * `tests/__helpers__/preCommitRepo.ts`.
 *
 * The oracle for "the expected `_redirects`" is `generateRedirects` over
 * `git checkout-index --all` of the staged snapshot, taken before the hook
 * runs. The commit-form cases (H32, H34–H38) take it over the index git
 * handed the hook, which the recording shim copied before the hook ran: for
 * `-p` and `-i` that `index.lock` is the only index holding the staged
 * snapshot. A case that ends in O2 also pins its rule lines with literals: the
 * whole of FIXTURE_RULES where the staged challenges are the fixture's, or
 * else the lines its change adds or removes. H05, H24 and H43 pin HEAD's
 * committed bytes instead, which do not come from the oracle.
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { generateRedirects } from '../scripts/generate-redirects'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  HOOK,
  REDIRECTS,
  addWorktree,
  blockingGenerator,
  buildFirstCommitFixture,
  buildFixture,
  challengeIndex,
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

/** The rule lines of the fixture's committed `_redirects`, as a literal: the retired #3 has none. */
const FIXTURE_RULES = [
  '/c/001 /challenge/test-chall/',
  '/c/002 /challenge/door/',
  '/zh/c/002 /zh-TW/challenge/door/',
  '/c/:slug /challenge/:slug/',
  '/zh/c/:slug /zh-TW/challenge/:slug/',
]

/** W3: the hook replaced a version of `_redirects` the teacher made. */
const W3 = /platform\/public\/_redirects[^\n]*replaced|replaced[^\n]*platform\/public\/_redirects/

let fixture: Fixture
let repo: Fixture
let real: RealState

beforeAll(() => {
  fixture = buildFixture()
}, TIMEOUT)

afterAll(() => {
  if (fixture) removeRepo(fixture)
})

beforeEach(() => {
  real = realRepoState()
  repo = cloneFixture(fixture)
})

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
    write(repo, 'platform/challenge/test-chall/index.md', [
      '---', 'title: "Test Challenge Updated"', 'number: 1', 'backend: flask', 'app: app.py', '---', '', 'Updated content', '',
    ].join('\n'))
    git(repo, ['add', 'platform/challenge/test-chall/index.md'])
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
    git(repo, ['add', 'platform/challenge/new-chall/index.md', 'platform/challenge/new-chall/src/app.py'])
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/new-chall/src/flag.txt')

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('exits 0 when entire challenge directory is removed', () => {
    git(repo, ['rm', '-rq', 'platform/challenge/test-chall'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    const rules = rulesOf(expected)
    expect(rules.some((r) => r.startsWith('/c/001 '))).toBe(false)
    // door and the retired challenge remain, so the numbered section stays.
    expect(rules).toContain('/c/002 /challenge/door/')
    expect(rules).toContain('/zh/c/002 /zh-TW/challenge/door/')
  }, TIMEOUT)

  it('exits 1 when only index.md is deleted (incomplete challenge)', () => {
    git(repo, ['rm', '-q', 'platform/challenge/test-chall/index.md'])
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
  write(repo, 'platform/challenge/draft/index.md', '---\ntitle: draft\n---\n')
}

function validatorLog(): string {
  const log = join(repo.base, 'validator.log')
  recordScript(repo, 'challenge-lint-staged.ts', log)
  return log
}

describe('pre-commit.sh: trigger (H06)', () => {
  it('ends in O1 when only README.md is staged', () => {
    addUnrelatedWork()
    write(repo, 'README.md', '# Changed\n')
    git(repo, ['add', 'README.md'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('ends in O1 when only another file under platform/public/ is staged', () => {
    addUnrelatedWork()
    write(repo, 'platform/public/other.txt', 'other, changed\n')
    git(repo, ['add', 'platform/public/other.txt'])
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status, run.stderr).toBe(0)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)
})

/** H02, H14: the outcome, with the hook run directly by the given bash (H45 runs it with `/bin/bash`). */
function expectH02H14(bash: string): void {
  const log = validatorLog()
  writeBrief(repo, 'test-chall', 1)
  git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
  const expected = expectedRedirects(repo)
  const before = snapshot(repo)

  const run = runHook(repo, {}, bash)

  expectO2(run, before, snapshot(repo), expected)
  expect(rulesOf(expected)).toContain('/zh/c/001 /zh-TW/challenge/test-chall/')
  expect(readRecord(log)).toEqual([])
}

describe('pre-commit.sh: the expected _redirects (AC-12)', () => {
  it('H01: a new challenge gains its /c/NNN rule, with no W3', () => {
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    git(repo, ['add', 'platform/challenge/new-chall'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H01: a new challenge, with the working tree’s _redirects already the expected one (after pnpm dev), prints no W3', () => {
    writeChallenge(repo, 'platform/challenge', 'new-chall', 4)
    git(repo, ['add', 'platform/challenge/new-chall'])
    const expected = expectedRedirects(repo)
    write(repo, REDIRECTS, expected)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/004 /challenge/new-chall/')
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H02, H14: only a Traditional Chinese brief gains its /zh/c/NNN rule, and the validator never runs', () => {
    expectH02H14('bash')
  }, TIMEOUT)

  it('H03: deleting a challenge in both trees loses both its rules', () => {
    git(repo, ['rm', '-rq', 'platform/challenge/door', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected).filter((r) => r.includes('door'))).toEqual([])
    expect(rulesOf(expected)).toContain('/c/001 /challenge/test-chall/')
  }, TIMEOUT)

  it('H04: renaming a challenge in both trees points both rules at the new slug', () => {
    const log = validatorLog()
    git(repo, ['mv', 'platform/challenge/door', 'platform/challenge/gate'])
    git(repo, ['mv', 'platform/zh-TW/challenge/door', 'platform/zh-TW/challenge/gate'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    const rules = rulesOf(expected)
    expect(rules).toContain('/c/002 /challenge/gate/')
    expect(rules).toContain('/zh/c/002 /zh-TW/challenge/gate/')
    expect(rules.filter((r) => r.includes('door'))).toEqual([])
    expect(readRecord(log).flatMap((r) => r.argv)).toContain('platform/challenge/gate/index.md')
  }, TIMEOUT)

  it('H40: deleting only the Traditional Chinese brief loses /zh/c/NNN and keeps /c/NNN', () => {
    git(repo, ['rm', '-rq', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    const rules = rulesOf(expected)
    expect(rules.some((r) => r.startsWith('/zh/c/002 '))).toBe(false)
    expect(rules).toContain('/c/002 /challenge/door/')
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
    write(repo, 'platform/challenge/test-chall/index.md', read(repo, 'platform/challenge/test-chall/index.md').replace('number: 1', 'number: 7'))
    write(repo, 'platform/challenge/door/src/app.py', 'from flask import Flask\napp = Flask("door")\n')
    git(repo, ['add', 'platform/challenge/door/src/app.py'])
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), head)
    expect(read(repo, 'platform/challenge/test-chall/index.md')).toContain('number: 7')
  }, TIMEOUT)

  it('H24: a type change of index.md to a link keeps HEAD’s bytes, and is not validated', () => {
    const log = validatorLog()
    const index = 'platform/challenge/test-chall/index.md'
    write(repo, 'platform/challenge/test-chall/brief.md', read(repo, index))
    unlinkSync(join(repo.dir, index))
    symlinkSync('brief.md', join(repo.dir, index))
    git(repo, ['add', 'platform/challenge/test-chall'])
    expect(git(repo, ['diff', '--cached', '--name-status'])).toContain(`T\t${index}`)
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), head)
    const argv = readRecord(log).flatMap((r) => r.argv)
    expect(argv).toContain('platform/challenge/test-chall/brief.md')
    expect(argv).not.toContain(index)
  }, TIMEOUT)

  it('H23: un-retiring a challenge brings its rule back', () => {
    const log = validatorLog()
    git(repo, ['mv', '.archive/challenge/old-chall', 'platform/challenge/old-chall'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/c/003 /challenge/old-chall/')
    expect(readRecord(log).flatMap((r) => r.argv)).toContain('platform/challenge/old-chall/index.md')
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

  it('H20: an ignored directory gets no rule, and a page counts only where its own tree lists its slug', () => {
    // logs/ is ignored and carries door's number: counting it would make generation refuse.
    write(repo, 'platform/challenge/logs/index.md', challengeIndex('logs', 2))
    // tmp/ is ignored too; the English page is force-added, the brief stays ignored.
    writeChallenge(repo, 'platform/challenge', 'tmp', 6)
    writeBrief(repo, 'tmp', 6)
    git(repo, ['add', '-f', 'platform/challenge/tmp'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    const rules = rulesOf(expected)
    expect(rules).toContain('/c/006 /challenge/tmp/')
    expect(rules.some((r) => r.startsWith('/zh/c/006 '))).toBe(false)
    expect(rules.filter((r) => r.includes('logs'))).toEqual([])
  }, TIMEOUT)
})

// ─── W3, W4 and the teacher's other work (AC-12, AC-14) ─────────────────────

/** W4 for one untracked directory. */
function w4(dir: string): RegExp {
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}[^\\n]*git add|git add[^\\n]*${escaped}`)
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
    expect(before.untracked).toContain('?? platform/challenge/draft/index.md')

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

  it('H10: an unstaged _redirects holding an untracked challenge’s rule is replaced (D3), with W3 and W4', () => {
    writeChallenge(repo, 'platform/challenge', 'draft', 5)
    writeBrief(repo, 'draft', 5)
    // An ignored directory, which W4 does not name.
    write(repo, 'platform/challenge/logs/run.log', 'ignored\n')
    stageDoorChange()
    // As after pnpm dev: generated over the whole working tree, draft included.
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    expect(rulesOf(read(repo, REDIRECTS))).toContain('/c/005 /challenge/draft/')
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(run.stderr).toMatch(W3)
    expect(run.stderr).toMatch(w4('platform/challenge/draft/'))
    expect(run.stderr).toMatch(w4('platform/zh-TW/challenge/draft/'))
    expect(run.stderr).not.toContain('logs')
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

  it('H13: a Traditional Chinese number that differs from the English one ends in O4 with W5', () => {
    const log = validatorLog()
    writeBrief(repo, 'test-chall', 9)
    git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
    write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
    write(repo, 'platform/public/other.txt', 'other, unstaged\n')
    const before = snapshot(repo)

    const run = runHook(repo)

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('carries different numbers across locale trees')
    expectNothingChanged(before, snapshot(repo))
    expect(readRecord(log)).toEqual([])
  }, TIMEOUT)
})

// ─── Orphan briefs (D12, AC-15) ─────────────────────────────────────────────

function generatorLog(): string {
  const log = join(repo.base, 'generator.log')
  recordScript(repo, 'generate-redirects.ts', log)
  return log
}

/** The teacher's other work a refusal must leave alone: two unstaged edits, `_redirects` among them, and an untracked file. */
function addTeacherWork(): void {
  write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# a hand edit\n`)
  write(repo, 'platform/public/other.txt', 'other, unstaged\n')
  write(repo, 'platform/notes/untracked.txt', 'untracked notes\n')
}

/**
 * O4 with W6 for each orphan slug, refused before generating: exit 1, both
 * paths of each slug and D12's three ways out on stderr, no `--staged` call
 * and no W5 text.
 */
function expectW6(run: Run, slugs: string[], generator: string): void {
  expect(run.status, run.stderr).toBe(1)
  for (const slug of slugs) {
    expect(run.stderr).toContain(`platform/zh-TW/challenge/${slug}/`)
    expect(run.stderr).toContain(`platform/challenge/${slug}/`)
  }
  expect(run.stderr).toMatch(/delete/i)
  expect(run.stderr).toMatch(/rename/i)
  expect(run.stderr).toMatch(/retire/i)
  expect(readRecord(generator).filter((r) => r.argv.includes('--staged'))).toEqual([])
  expect(run.stderr).not.toContain('held by more than one challenge')
  expect(run.stderr).not.toContain('carries different numbers')
}

describe('pre-commit.sh: orphan briefs (D12)', () => {
  it('H17: retiring door while its brief stays ends in O4 with W6 naming door, and nothing changes', () => {
    const generator = generatorLog()
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['door'], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H21: deleting only door’s English directory ends in O4 with W6 naming door, and nothing changes', () => {
    const generator = generatorLog()
    git(repo, ['rm', '-rq', 'platform/challenge/door'])
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['door'], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H22: renaming only door’s English directory to gate ends in O4 with W6 naming door, and nothing changes', () => {
    const generator = generatorLog()
    git(repo, ['mv', 'platform/challenge/door', 'platform/challenge/gate'])
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['door'], generator)
    expect(run.stderr).not.toContain('platform/zh-TW/challenge/gate/')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H41: renaming only door’s Traditional Chinese directory to gate ends in O4 with W6 naming gate, and the validator never runs', () => {
    const generator = generatorLog()
    const validator = validatorLog()
    git(repo, ['mv', 'platform/zh-TW/challenge/door', 'platform/zh-TW/challenge/gate'])
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['gate'], generator)
    expect(readRecord(validator)).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H17 through git commit -m: refused with W6, no commit is made, and nothing changes', () => {
    const generator = generatorLog()
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    addTeacherWork()
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)

    const run = commit(repo, ['-m', 'retire door'])

    expectW6(run, ['door'], generator)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('H21 through git commit -a -m: the orphan exists only in the index.lock git hands the hook; refused with W6, no commit is made, and nothing changes', () => {
    const generator = generatorLog()
    rmSync(join(repo.dir, 'platform/challenge/door'), { recursive: true })
    addTeacherWork()
    const head = git(repo, ['rev-parse', 'HEAD'])
    const before = snapshot(repo)
    // The deletion is in the working tree only: .git/index still holds door's English page.
    expect(before.index.some((l) => l.endsWith('\tplatform/challenge/door/index.md'))).toBe(true)

    const run = commit(repo, ['-a', '-m', 'delete door'])

    expectW6(run, ['door'], generator)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(head)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('K-17: an English page on disk but not in the index backs no brief, and two orphans are each named', () => {
    const generator = generatorLog()
    const validator = validatorLog()
    writeChallenge(repo, 'platform/challenge', 'fresh', 4)
    writeBrief(repo, 'fresh', 4)
    writeBrief(repo, 'ghost', 5)
    git(repo, ['add', 'platform/zh-TW/challenge/fresh/index.md', 'platform/zh-TW/challenge/ghost/index.md'])
    addTeacherWork()
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/challenge/fresh/index.md')

    const run = runHook(repo)

    expectW6(run, ['fresh', 'ghost'], generator)
    expect(readRecord(validator)).toEqual([])
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('K-17 boundary: ignored directories, which stay on disk through the hook’s stash, neither back a brief nor make one', () => {
    const generator = generatorLog()
    // logs/ and tmp/ are ignored. The English logs page stays on disk; its brief is force-added.
    writeChallenge(repo, 'platform/challenge', 'logs', 4)
    writeBrief(repo, 'logs', 4)
    git(repo, ['add', '-f', 'platform/zh-TW/challenge/logs/index.md'])
    // An ignored brief with no English page at all is not in the index slugs.
    writeBrief(repo, 'tmp', 5)
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['logs'], generator)
    expect(run.stderr).not.toContain('platform/zh-TW/challenge/tmp/')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('D12: an orphan HEAD already holds refuses a commit whose own change creates none', () => {
    git(repo, ['rm', '-rq', 'platform/challenge/door'])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'an orphan, bypassing the hook'])
    const generator = generatorLog()
    write(repo, 'platform/challenge/test-chall/src/app.py', 'from flask import Flask\napp = Flask("test-chall")\n')
    git(repo, ['add', 'platform/challenge/test-chall/src/app.py'])
    addTeacherWork()
    const before = snapshot(repo)

    const run = runHook(repo)

    expectW6(run, ['door'], generator)
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  it('no English index slug at all: with every English challenge deleted, door’s brief still ends in O4 with W6 (an empty English list is not expanded under bash 3.2 set -u)', () => {
    const generator = generatorLog()
    git(repo, ['rm', '-rq', 'platform/challenge/test-chall', 'platform/challenge/door'])
    addTeacherWork()
    const before = snapshot(repo)
    expect(before.index.some((l) => l.includes('\tplatform/challenge/'))).toBe(false)

    const run = runHook(repo)

    expectW6(run, ['door'], generator)
    expect(run.stderr).not.toContain('unbound variable')
    expectNothingChanged(before, snapshot(repo))
  }, TIMEOUT)

  /** The rule lines once door is retired with its brief: both of door's rules are gone. */
  const RETIRED_DOOR_RULES = ['/c/001 /challenge/test-chall/', '/c/:slug /challenge/:slug/', '/zh/c/:slug /zh-TW/challenge/:slug/']

  it('H39: retiring door together with its brief ends in O2, and both its rules go', () => {
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    git(repo, ['rm', '-rq', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(RETIRED_DOOR_RULES)
    expectNoW3W4(run)
    expect(run.stderr).not.toContain('platform/zh-TW/challenge/door/')
  }, TIMEOUT)

  it('H39 boundary: a brief removed only from the index stays on disk untracked, is no orphan, and both rules go', () => {
    git(repo, ['mv', 'platform/challenge/door', '.archive/challenge/door'])
    git(repo, ['rm', '-rq', '--cached', 'platform/zh-TW/challenge/door'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)
    expect(before.untracked).toContain('?? platform/zh-TW/challenge/door/index.md')

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(RETIRED_DOOR_RULES)
    expectNoW3W4(run)
    expect(run.stderr).not.toContain('platform/zh-TW/challenge/door/')
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
    git(repo, ['add', 'platform/challenge/new-chall'])
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
    git(repo, ['add', 'platform/challenge/new-chall'])
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

/** Commit a stale `_redirects` (door's two rules removed) with `--no-verify`. */
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
    git(repo, ['add', 'platform/challenge/new-chall'])
    addUnstagedWork(repo)
    const stashLog = stashLogOf(repo)
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '--amend', '--no-edit'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index')
    expect(git(repo, ['rev-parse', 'HEAD~1'])).toBe(parent)
    expect(git(repo, ['show', `HEAD:${DOOR_APP}`])).toBe(amended)
    expect(git(repo, ['show', 'HEAD:platform/challenge/new-chall/index.md'])).toBe(challengeIndex('new-chall', 4))
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
    expect(before.untracked).toContain('?? platform/challenge/draft/index.md')

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
    git(repo, ['add', 'platform/challenge/alpha', REDIRECTS])
    git(repo, ['commit', '-q', '--no-verify', '-m', 'alpha'])
    git(repo, ['switch', '-q', 'main'])
    writeChallenge(repo, 'platform/challenge', 'beta', 5)
    write(repo, REDIRECTS, generateRedirects(repo.dir))
    git(repo, ['add', 'platform/challenge/beta', REDIRECTS])
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
    write(repo, 'platform/challenge/test-chall/index.md', challengeIndex('Test Challenge', 6))
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not selected")\n')
    const firstOnly = ['line 1, selected\n', ...long.slice(1)]
    write(repo, LONG, [...firstOnly.slice(0, 19), 'line 20, not selected\n'].join(''))
    write(repo, 'platform/notes/untracked.txt', 'untracked\n')
    const stashLog = stashLogOf(repo)
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    // Hunk order: door/src/app.py, test-chall/index.md, then long.txt's two hunks.
    const run = gitRun(repo, ['commit', '-q', '-p', '-m', 'commit -p'], {}, 'n\ny\ny\nn\n')

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['show', 'HEAD:platform/challenge/test-chall/index.md'])).toBe(challengeIndex('Test Challenge', 6))
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
    git(repo, ['add', 'platform/challenge/new-chall'])
    write(repo, 'platform/challenge/test-chall/index.md', challengeIndex('Test Challenge', 7))
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not named")\n')
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-i', 'platform/challenge/test-chall/index.md', '-m', 'commit -i'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['show', 'HEAD:platform/challenge/new-chall/index.md'])).toBe(challengeIndex('new-chall', 4))
    expect(git(repo, ['show', 'HEAD:platform/challenge/test-chall/index.md'])).toBe(challengeIndex('Test Challenge', 7))
    expect(git(repo, ['show', `HEAD:${DOOR_APP}`])).toBe(door)
    expect(git(repo, ['diff', '--name-only'])).toBe(`${DOOR_APP}\n`)
    expect(rulesOf(expected)).toEqual(expect.arrayContaining(['/c/004 /challenge/new-chall/', '/c/007 /challenge/test-chall/']))
    expect(rulesOf(expected).some((r) => r.startsWith('/c/001 '))).toBe(false)
    expectNoW3W4(run)
  }, TIMEOUT)

  it('H37 boundary: git commit -i of a challenge directory removed from the working tree commits its deletion, and its rule goes', () => {
    rmSync(join(repo.dir, 'platform/challenge/test-chall'), { recursive: true })
    write(repo, DOOR_APP, 'from flask import Flask\napp = Flask("door, not named")\n')
    const shim = recordingShim(repo)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-i', 'platform/challenge/test-chall', '-m', 'commit -i'])

    const expected = expectCommitO2(run, shim, repo, before, '.git/index.lock')
    expect(git(repo, ['ls-tree', '-r', '--name-only', 'HEAD', 'platform/challenge/test-chall'])).toBe('')
    expect(git(repo, ['diff', '--name-only'])).toBe(`${DOOR_APP}\n`)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES.filter((r) => !r.startsWith('/c/001 ')))
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
    git(wt, ['add', 'platform/challenge/new-chall'])
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
    write(repo, 'platform/challenge/draft/index.md', '---\ntitle: draft\n---\n')
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
      .toEqual(['platform/challenge/draft/index.md'])
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
      write(repo, 'platform/challenge/draft/index.md', '---\ntitle: draft\n---\n')
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
    git(repo, ['add', 'platform/challenge/linked'])
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
      '/c/001 /challenge/test-chall/',
      '/c/002 /challenge/door/',
      '/zh/c/002 /zh-TW/challenge/door/',
      '/c/004 /challenge/linked/',
      '/c/:slug /challenge/:slug/',
      '/zh/c/:slug /zh-TW/challenge/:slug/',
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
/** The hook's stash push, as the git wrapper matches it. */
const PUSH = `-c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m pre-commit: stash unstaged changes -- ${REST}`

describe('pre-commit.sh: a git command that fails where set -e cannot see it (O5)', () => {
  it.each([
    ['the stash push, which saved its entry and then exits 1', PUSH, 'run-then-fail'],
    ['the stash push, which fails before saving anything (the teacher’s entry stays on top of refs/stash)', PUSH, 'fail'],
    ['the untracked-directory listing (W4)', 'ls-files -z --others --exclude-standard --directory --no-empty-directory -- platform/challenge/ platform/zh-TW/challenge/', 'fail'],
    ['the deleted-paths listing', `diff -z --name-only --diff-filter=D -- ${REST}`, 'fail'],
    ['the raw-copy listing of modified files', `diff -z --name-only --diff-filter=MT -- ${REST}`, 'fail'],
    ['the raw-copy listing of untracked files', `ls-files -z --others --exclude-standard -- ${REST}`, 'fail'],
    ['the check for unstaged files under platform/', `diff --quiet -- ${REST}`, 'fail'],
    ['refs/stash read before the push', 'rev-parse -q --verify refs/stash', 'fail'],
    ['the validator’s ACMRD list', 'diff --cached --name-only -z --diff-filter=ACMRD -- platform/challenge/', 'fail'],
    ['the English index slugs’ git ls-files', 'ls-files -z -- platform/challenge/', 'fail'],
    ['the Traditional Chinese index slugs’ git ls-files', 'ls-files -z -- platform/zh-TW/challenge/', 'fail'],
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
    expect(rulesOf(expected)).toEqual(['/c/001 /challenge/test-chall/', '/c/:slug /challenge/:slug/', '/zh/c/:slug /zh-TW/challenge/:slug/'])
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

  it('H45: H07 through git commit with /bin first on PATH gives its outcome', () => {
    expectBinBash()
    expectH07(env())
  }, TIMEOUT)

  it('H45: H34 through git commit with /bin first on PATH gives its outcome', () => {
    expectBinBash()
    expectH34(env())
  }, TIMEOUT)
})
