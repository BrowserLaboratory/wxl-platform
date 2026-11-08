// 0006-S1's Command grammar and dispatch (traceability.md "Command grammar", "Step order" row 3).
// Every real-git row isolates HOME/XDG_CONFIG_HOME/PATH/LANG explicitly (ticket Notes) rather than
// falling back to `makeDeps`'s default all-success git stub, whose `rev-parse` always answers
// `{ code: 0, stdout: '' }` -- that default would make "reached step 3" itself undefined.

import { describe, it, expect, vi } from 'vitest'
import { rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'

async function makeIsolatedEnv() {
  const home = await makeTmpRoot('create-wxl-upgrade-home-')
  return { HOME: home, PATH: process.env.PATH, XDG_CONFIG_HOME: join(home, '.config'), LANG: 'en_US.UTF-8' }
}

describe('accepted', () => {
  it.each([
    ['upgrade --from 3.0.0', ['upgrade', '--from', '3.0.0']],
    ['upgrade --from <40 hex>', ['upgrade', '--from', FIXED_COMMIT]],
    ['--lang en upgrade', ['--lang', 'en', 'upgrade']],
    ['upgrade --lang en', ['upgrade', '--lang', 'en']],
    ['upgrade --from=3.0.0 (inline =, Q3)', ['upgrade', '--from=3.0.0']],
  ])('%s is accepted: takes the upgrade path (UP-E01, not CW-E02)', async (_label, argv) => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    const env = await makeIsolatedEnv()
    try {
      const deps = makeDeps({ cwd, tmpRoot, env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(argv, ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E01/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })
})

describe('rejected', () => {
  const UPPERCASE_40 = 'A' + FIXED_COMMIT.slice(1)
  const HEX_39 = FIXED_COMMIT.slice(0, 39)
  const HEX_41 = FIXED_COMMIT + '0'

  it.each([
    ['upgrade --from (missing value)', ['upgrade', '--from'], '--from'],
    ['upgrade --from v3.0.0 (leading v)', ['upgrade', '--from', 'v3.0.0'], 'v3.0.0'],
    ['upgrade --from <39 hex>', ['upgrade', '--from', HEX_39], HEX_39],
    ['upgrade --from <41 hex>', ['upgrade', '--from', HEX_41], HEX_41],
    ['upgrade --from <40 hex, one uppercase>', ['upgrade', '--from', UPPERCASE_40], UPPERCASE_40],
    ['upgrade extra (second positional)', ['upgrade', 'extra'], 'extra'],
    ['upgrade --bogus', ['upgrade', '--bogus'], '--bogus'],
    ['upgrade --from repeated', ['upgrade', '--from', '3.0.0', '--from', '3.0.0'], '--from'],
    ['upgrade --lang repeated', ['upgrade', '--lang', 'en', '--lang', 'en'], '--lang'],
    ['upgrade --author x', ['upgrade', '--author', 'x'], '--author'],
    ['upgrade --repo x', ['upgrade', '--repo', 'x'], '--repo'],
    ['upgrade --host x', ['upgrade', '--host', 'x'], '--host'],
    ['upgrade --origin x', ['upgrade', '--origin', 'x'], '--origin'],
    ['upgrade --site-name x', ['upgrade', '--site-name', 'x'], '--site-name'],
    ['upgrade --no-setup', ['upgrade', '--no-setup'], '--no-setup'],
    ['--from 3.0.0 upgrade (before upgrade)', ['--from', '3.0.0', 'upgrade'], '--from'],
    ['--author x upgrade (create-only flag before upgrade, 2026-11-07)', ['--author', 'x', 'upgrade'], '--author'],
  ])('%s -> CW-E02 naming %s', async (_label, argv, token) => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const env = await makeIsolatedEnv()
    try {
      const deps = makeDeps({ cwd, env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(cwd)
      const ioHelper = makeIo()
      const exitCode = await run(argv, ioHelper.io, deps)
      const after = await snapshotTree(cwd)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify(token))
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.runGit).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })
})

describe('dispatch', () => {
  it('(a) create-wxl upgrade in a non-git directory takes the upgrade path: UP-E01, not CW-E02, fetchArchive not called', async () => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    const env = await makeIsolatedEnv()
    try {
      const deps = makeDeps({ cwd, tmpRoot, env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E01/m)
      expect(ioHelper.stderrText).not.toMatch(/CW-E02/)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })

  it('(b) create-wxl <dir> --no-setup is unchanged: the 0005 create path still creates the directory (guard)', async () => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const env = await makeIsolatedEnv()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd, env, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(['somedir', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      await expect(mkdir(join(cwd, 'somedir'))).rejects.toMatchObject({ code: 'EEXIST' })
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })

  it('(c) create-wxl range --from 3.0.0 --no-setup stays on the create path: CW-E02 naming "--from" (guard, AC-12)', async () => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const env = await makeIsolatedEnv()
    try {
      const deps = makeDeps({ cwd, env })
      const before = await snapshotTree(cwd)
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--from', '3.0.0', '--no-setup'], ioHelper.io, deps)
      const after = await snapshotTree(cwd)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify('--from'))
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })
})
