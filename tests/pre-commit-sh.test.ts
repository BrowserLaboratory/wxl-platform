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
 * runs. A case that ends in O2 also pins its rule lines with literals: the
 * whole of FIXTURE_RULES where the staged challenges are the fixture's, or
 * else the lines its change adds or removes. H05, H24 and H43 pin HEAD's
 * committed bytes instead, which do not come from the oracle.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { generateRedirects } from '../scripts/generate-redirects'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  REDIRECTS,
  buildFixture,
  challengeIndex,
  commit,
  cloneFixture,
  expectedRedirects,
  git,
  gitRun,
  read,
  readRecord,
  realRepoState,
  recordScript,
  removeRepo,
  rulesOf,
  runHook,
  snapshot,
  stagedRedirects,
  stashList,
  withoutPaths,
  write,
  writeBrief,
  writeChallenge,
  type Fixture,
  type RealState,
  type Run,
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
  // H29: the pre-existing entry is still listed with its commit id.
  expect(stashList(repo).some((l) => l.startsWith(`${repo.preexisting} `))).toBe(true)
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
    const log = validatorLog()
    writeBrief(repo, 'test-chall', 1)
    git(repo, ['add', 'platform/zh-TW/challenge/test-chall/index.md'])
    const expected = expectedRedirects(repo)
    const before = snapshot(repo)

    const run = runHook(repo)

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toContain('/zh/c/001 /zh-TW/challenge/test-chall/')
    expect(readRecord(log)).toEqual([])
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

describe('pre-commit.sh: W3, W4 and unstaged work', () => {
  it('H07: only a hand-edited _redirects, through git commit: replaced, W3, and a commit that changes nothing', () => {
    const head = git(repo, ['show', `HEAD:${REDIRECTS}`])
    write(repo, REDIRECTS, `${head}/c/999  /challenge/hand-made/  302\n`)
    git(repo, ['add', REDIRECTS])
    const expected = expectedRedirects(repo)
    expect(expected).toBe(head)
    const before = snapshot(repo)

    const run = commit(repo, ['-q', '-m', 'hand edit'])

    expectO2(run, before, snapshot(repo), expected)
    expect(rulesOf(expected)).toEqual(FIXTURE_RULES)
    expect(rulesOf(expected).some((r) => r.startsWith('/c/999 '))).toBe(false)
    expect(run.stderr).toMatch(W3)
    expect(git(repo, ['rev-parse', 'HEAD^{tree}'])).toBe(git(repo, ['rev-parse', 'HEAD~1^{tree}']))
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
    // Empty until T-0039 changes the header (G02): the two headers are equal today.
    git(repo, ['commit', '-q', '--no-verify', '--allow-empty', '-m', 'a range from before 0007'])
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
