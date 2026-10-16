// Step 12: git steps (traceability.md "Git steps", C35-C38, C58-C59, C70). Step 13's "Next
// steps" lines are run-next-steps.test.mjs's.

import { describe, it, expect } from 'vitest'
import { rm, readdir, lstat, writeFile, chmod, mkdir, mkdtemp, copyFile } from 'node:fs/promises'
import { accessSync, constants as fsConstants } from 'node:fs'
import { join, delimiter, isAbsolute, relative } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT, PACKAGE_VERSION } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { GIT_FIXTURE, GIT_FIXTURE_WITH_LIB, PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeGitHomeWithHook, makeGitHomeWithExcludes, makeEmptyGitHome } from './helpers/git-home.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { recordGit } from './helpers/git-recorder.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { makeGitStub } from './helpers/git-stub.mjs'
import { jsonValue } from '../src/text.mjs'
import { en } from '../src/messages.mjs'

async function listFiles(dir, base = '') {
  const names = await readdir(dir, { withFileTypes: true })
  let result = []
  for (const entry of names) {
    if (base === '' && entry.name === '.git') continue
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      result = result.concat(await listFiles(join(dir, entry.name), rel))
    } else {
      result.push(rel)
    }
  }
  return result
}

// The one argv every "git steps" case in this file shares (S-23): a complete, successful
// non-interactive setup, so step 12 always runs.
const GIT_ARGV = ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--site-name', 'S8 GH', '--lang', 'en']

/** Asserts each of `items` appears in `text`, in that order, each strictly after the previous
 * (S-23 -- the repeated indexOf/searchFrom loop this file's rows otherwise copy by hand). Returns
 * the index just past the last match, for a caller that keeps checking further lines against it. */
function expectInOrder(text, from, items) {
  let searchFrom = from
  for (const item of items) {
    const idx = text.indexOf(item, searchFrom)
    expect(idx).toBeGreaterThan(searchFrom)
    searchFrom = idx + item.length
  }
  return searchFrom
}

describe('git steps — real git', () => {
  it('C35: success builds one commit on main, isolated from the global template hook and gpg signing', async () => {
    const tmpRoot = await makeTmpRoot()
    const { homeDir, hookMarkerFile } = await makeGitHomeWithHook()
    const xdgConfigHome = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = recordGit(createSpawnGitRunner())
      const env = { HOME: homeDir, PATH: process.env.PATH, XDG_CONFIG_HOME: xdgConfigHome }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toBe('')
      expect(ioHelper.stdoutText).not.toContain(en.N2({ remainingCommands: [] }).split('\n')[0])

      const target = join(tmpRoot, 'd')
      const gitDirStat = await lstat(join(target, '.git'))
      expect(gitDirStat.isDirectory()).toBe(true)

      const symbolicRef = await verifyGit(['symbolic-ref', 'HEAD'], { cwd: target, env })
      expect(symbolicRef.code).toBe(0)
      expect(symbolicRef.stdout.trim()).toBe('refs/heads/main')

      const revCount = await verifyGit(['rev-list', '--count', 'HEAD'], { cwd: target, env })
      expect(revCount.code).toBe(0)
      expect(revCount.stdout.trim()).toBe('1')

      const subject = await verifyGit(['log', '-1', '--format=%s'], { cwd: target, env })
      expect(subject.code).toBe(0)
      expect(subject.stdout.trim()).toBe(`Create range from WXL ${deps.source.version}`)

      const lsFiles = await verifyGit(['ls-files'], { cwd: target, env })
      expect(lsFiles.code).toBe(0)
      const tracked = lsFiles.stdout.split('\n').filter((l) => l !== '').sort()
      const onDisk = (await listFiles(target)).sort()
      expect(tracked).toEqual(onDisk)
      expect(tracked).toContain('range.json')
      expect(tracked).toContain('.github/workflows/deploy.yml')
      expect(tracked).toContain('keep.log')

      const status = await verifyGit(['status', '--porcelain', '--untracked-files=all'], { cwd: target, env })
      expect(status.code).toBe(0)
      expect(status.stdout).toBe('')

      await expect(lstat(hookMarkerFile)).rejects.toThrow()
      await expect(lstat(join(target, '.git', 'hooks', 'post-commit'))).rejects.toThrow()

      expect(calls.length).toBeGreaterThan(0)
      for (const call of calls) {
        expect(call.cwd).toBe(target)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(homeDir, { recursive: true, force: true })
      await rm(xdgConfigHome, { recursive: true, force: true })
    }
  })

  it('C70: every runGit call of the "Git steps" fixed list, env with no GIT_* other than the two additions', async () => {
    const tmpRoot = await makeTmpRoot()
    const { homeDir } = await makeGitHomeWithHook()
    const xdgConfigHome = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = recordGit(createSpawnGitRunner())
      const env = { HOME: homeDir, PATH: process.env.PATH, XDG_CONFIG_HOME: xdgConfigHome }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const { io } = makeIo({ interactive: false })
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)
      expect(exitCode).toBe(0)

      const target = join(tmpRoot, 'd')
      expect(calls).toHaveLength(7)
      expect(calls[0].args).toEqual(['--version'])
      expect(calls[1].args).toEqual(['init', '--template='])
      expect(calls[2].args).toEqual(['symbolic-ref', 'HEAD', 'refs/heads/main'])
      expect(calls[3].args).toEqual(['-c', 'core.excludesFile=', 'add', '-A', '--force'])
      const configCalls = calls.slice(4, 6).map((c) => c.args)
      expect(configCalls).toEqual(
        expect.arrayContaining([
          ['config', '--get', 'user.name'],
          ['config', '--get', 'user.email'],
        ]),
      )
      expect(calls[6].args).toEqual([
        '-c',
        'user.useConfigOnly=true',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=',
        'commit',
        '--no-verify',
        '-m',
        `Create range from WXL ${deps.source.version}`,
      ])

      // A literal object (P-11), not derived from `deps.env`: `makeDeps`'s default `env` also
      // carries `LANG` (merged in by `mergeOverrides`, since this test only overrides HOME/PATH/
      // XDG_CONFIG_HOME), so every call's env keeps it too.
      const expectedEnv = {
        LANG: 'en_US.UTF-8',
        HOME: homeDir,
        PATH: process.env.PATH,
        XDG_CONFIG_HOME: xdgConfigHome,
        GIT_TERMINAL_PROMPT: '0',
        GIT_CONFIG_NOSYSTEM: '1',
      }
      for (const call of calls) {
        expect(call.cwd).toBe(target)
        expect(call.env).toEqual(expectedEnv)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(homeDir, { recursive: true, force: true })
      await rm(xdgConfigHome, { recursive: true, force: true })
    }
  })

  it('C59: a global core.excludesFile ignoring lib/ does not keep lib/x.js out of the commit', async () => {
    const tmpRoot = await makeTmpRoot()
    const { homeDir } = await makeGitHomeWithExcludes()
    const xdgConfigHome = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE_WITH_LIB, { commit: FIXED_COMMIT })
      const { runGit } = recordGit(createSpawnGitRunner())
      const env = { HOME: homeDir, PATH: process.env.PATH, XDG_CONFIG_HOME: xdgConfigHome }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).not.toContain('CW-W03')
      const target = join(tmpRoot, 'd')
      const lsFiles = await verifyGit(['ls-files'], { cwd: target, env })
      expect(lsFiles.code).toBe(0)
      expect(lsFiles.stdout.split('\n')).toContain('lib/x.js')
      const status = await verifyGit(['status', '--porcelain', '--untracked-files=all'], { cwd: target, env })
      expect(status.stdout).toBe('')
      const revCount = await verifyGit(['rev-list', '--count', 'HEAD'], { cwd: target, env })
      expect(revCount.stdout.trim()).toBe('1')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(homeDir, { recursive: true, force: true })
      await rm(xdgConfigHome, { recursive: true, force: true })
    }
  })

  it('C37: no identity (empty HOME/XDG_CONFIG_HOME) -> CW-W02, no commit, not CW-W03', async () => {
    const tmpRoot = await makeTmpRoot()
    const homeDir = await makeEmptyGitHome()
    const xdgConfigHome = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = recordGit(createSpawnGitRunner())
      const env = { HOME: homeDir, PATH: process.env.PATH, XDG_CONFIG_HOME: xdgConfigHome }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W02/m)
      expect(ioHelper.stderrText).not.toContain('CW-W03')
      expect(ioHelper.stderrText).toContain('git config --global user.name "<your name>"')
      expect(ioHelper.stderrText).toContain('git config --global user.email "<you@example.com>"')
      expect(ioHelper.stderrText).toContain(`git commit -m "Create range from WXL ${deps.source.version}"`)

      expect(calls.some((c) => c.args.includes('init'))).toBe(true)
      expect(calls.some((c) => c.args.includes('symbolic-ref'))).toBe(true)
      expect(calls.some((c) => c.args.includes('add'))).toBe(true)
      expect(calls.some((c) => JSON.stringify(c.args) === JSON.stringify(['config', '--get', 'user.name']))).toBe(true)
      expect(calls.some((c) => JSON.stringify(c.args) === JSON.stringify(['config', '--get', 'user.email']))).toBe(true)
      expect(calls.some((c) => c.args.includes('commit'))).toBe(false)

      const target = join(tmpRoot, 'd')
      const gitDirStat = await lstat(join(target, '.git'))
      expect(gitDirStat.isDirectory()).toBe(true)
      const headVerify = await verifyGit(['rev-parse', '--verify', 'HEAD'], { cwd: target, env })
      expect(headVerify.code).not.toBe(0)
      const lsFiles = await verifyGit(['ls-files'], { cwd: target, env })
      expect(lsFiles.code).toBe(0)
      const trackedBeforeCommit = lsFiles.stdout.split('\n').filter((l) => l !== '')
      expect(trackedBeforeCommit.length).toBeGreaterThan(0)
      expect(trackedBeforeCommit).toContain('range.json')
      expect(trackedBeforeCommit).toContain('keep.log')

      const stdout = ioHelper.stdoutText
      const n1Idx = stdout.indexOf('cd d')
      const searchFrom = expectInOrder(stdout, n1Idx, [
        'git config --global user.name "<your name>"',
        'git config --global user.email "<you@example.com>"',
        `git commit -m "Create range from WXL ${deps.source.version}"`,
      ])
      const n3Idx = stdout.indexOf('alice/r')
      expect(n3Idx).toBeGreaterThan(searchFrom - 1)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(homeDir, { recursive: true, force: true })
      await rm(xdgConfigHome, { recursive: true, force: true })
    }
  })
})

describe('git steps — injected runGit', () => {
  it('C58: GIT_DIR never reaches runGit, GIT_TERMINAL_PROMPT is overridden to 0', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = makeGitStub()
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg', GIT_DIR: '/elsewhere', GIT_TERMINAL_PROMPT: '1' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const { io } = makeIo({ interactive: false })
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      const target = join(tmpRoot, 'd')
      expect(calls).toHaveLength(7)
      // A literal object (P-11): `deps.env` also carries the default `LANG` (merged in by
      // `makeDeps`'s `mergeOverrides`), and `GIT_DIR`/the caller's own `GIT_TERMINAL_PROMPT` are
      // both removed by the `GIT_`-prefix filter before the two fixed additions go back in.
      const expectedEnv = {
        LANG: 'en_US.UTF-8',
        HOME: '/fake-home',
        PATH: '/fake-path',
        XDG_CONFIG_HOME: '/fake-xdg',
        GIT_TERMINAL_PROMPT: '0',
        GIT_CONFIG_NOSYSTEM: '1',
      }
      for (const call of calls) {
        expect(call.cwd).toBe(target)
        expect(call.env).toEqual(expectedEnv)
        expect(call.env.GIT_DIR).toBeUndefined()
        expect(call.env.GIT_TERMINAL_PROMPT).toBe('0')
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each([
    ['ENOENT', () => Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' })],
    ['git 2.19.0', { version: { code: 0, stdout: 'git version 2.19.0\n', stderr: '' } }],
    ['git 2.9.5', { version: { code: 0, stdout: 'git version 2.9.5\n', stderr: '' } }],
    ['git --version exits 1', { version: { code: 1, stdout: '', stderr: '' } }],
    ['git --version prints unparsable output', { version: { code: 0, stdout: 'not git\n', stderr: '' } }],
  ])('C36: %s -> CW-W01, no further runGit call, exit 0, N2 lists G1/G2/G4', async (_label, versionOverride) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const overrides = typeof versionOverride === 'function' ? { version: versionOverride() } : versionOverride
      const { runGit, calls } = makeGitStub(overrides)
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W01/m)
      expect(ioHelper.stderrText).toContain('https://git-scm.com/downloads')
      expect(ioHelper.stderrText).not.toContain('--template')
      expect(ioHelper.stderrText).not.toContain('--force')
      expect(ioHelper.stderrText).not.toContain('-c ')
      expect(calls).toHaveLength(1)

      const stderr = ioHelper.stderrText
      expectInOrder(stderr, -1, ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git add -A', `git commit -m "Create range from WXL ${deps.source.version}"`])

      const stdout = ioHelper.stdoutText
      expect(stdout).not.toContain('--template')
      expect(stdout).not.toContain('--force')
      expect(stdout).not.toContain('-c ')
      const n1Idx = stdout.indexOf('cd d')
      expect(n1Idx).toBeGreaterThanOrEqual(0)
      const searchFrom = expectInOrder(stdout, n1Idx, ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git add -A', `git commit -m "Create range from WXL ${deps.source.version}"`])
      const n3Idx = stdout.indexOf('alice/r')
      expect(n3Idx).toBeGreaterThan(searchFrom - 1)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('runGit throwing synchronously (not rejecting a promise) on G0 is also CW-W01', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      // Deliberately not `async`: a throw here happens before any promise is ever created, unlike
      // every other case in this file (which goes through `makeGitStub`'s `async` wrapper).
      const runGit = (args) => {
        if (args[0] === '--version') throw new Error('synchronous boom')
        throw new Error('should not be called once G0 fails')
      }
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W01/m)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each([
    ['user.name empty', { 'config-name': { code: 0, stdout: '', stderr: '' } }],
    ['user.email empty', { 'config-email': { code: 0, stdout: '', stderr: '' } }],
    ['user.name whitespace-only output', { 'config-name': { code: 0, stdout: ' \n', stderr: '' } }],
  ])('C37 (empty output): %s -> CW-W02, not CW-W03, no commit', async (_label, overrides) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = makeGitStub(overrides)
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W02/m)
      expect(ioHelper.stderrText).not.toContain('CW-W03')
      expect(calls.some((c) => c.args.includes('commit'))).toBe(false)

      const stdout = ioHelper.stdoutText
      const n1Idx = stdout.indexOf('cd d')
      expect(n1Idx).toBeGreaterThanOrEqual(0)
      const searchFrom = expectInOrder(stdout, n1Idx, [
        'git config --global user.name "<your name>"',
        'git config --global user.email "<you@example.com>"',
        `git commit -m "Create range from WXL ${deps.source.version}"`,
      ])
      const n3Idx = stdout.indexOf('alice/r')
      expect(n3Idx).toBeGreaterThan(searchFrom - 1)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each([
    [
      '(1) G2 exits 1',
      { add: { code: 1, stdout: '', stderr: 'fatal: boom' } },
      {
        command: 'git add -A',
        detail: 'fatal: boom',
        remaining: ['git add -A', `git commit -m "Create range from WXL ${PACKAGE_VERSION}"`],
        notInStdout: ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git config --global'],
      },
    ],
    [
      '(2) G2 rejects EACCES',
      { add: () => { throw Object.assign(new Error('boom'), { code: 'EACCES' }) } },
      {
        command: 'git add -A',
        detail: 'boom',
        remaining: ['git add -A', `git commit -m "Create range from WXL ${PACKAGE_VERSION}"`],
        notInStdout: ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git config --global'],
      },
    ],
    [
      '(3) G3 user.name returns 128',
      { 'config-name': { code: 128, stdout: '', stderr: 'fatal: bad config' } },
      {
        command: 'git config --get user.name',
        detail: 'fatal: bad config',
        remaining: [`git commit -m "Create range from WXL ${PACKAGE_VERSION}"`],
        notInStdout: ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git add -A', 'git config --global'],
      },
    ],
    [
      '(4) G3 user.name missing, user.email errors',
      {
        'config-name': { code: 1, stdout: '', stderr: '' },
        'config-email': { code: 128, stdout: '', stderr: 'fatal: bad config' },
      },
      {
        command: 'git config --get user.email',
        detail: 'fatal: bad config',
        remaining: [`git commit -m "Create range from WXL ${PACKAGE_VERSION}"`],
        notInStdout: ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git add -A', 'git config --global'],
      },
    ],
  ])('C38: %s -> CW-W03, remaining steps skipped', async (_label, overrides, expected) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = makeGitStub(overrides)
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W03/m)
      expect(ioHelper.stderrText).not.toContain('CW-W02')
      expect(ioHelper.stderrText).toContain(expected.command)
      expect(ioHelper.stderrText).not.toContain('--force')
      expect(ioHelper.stderrText).not.toContain('core.excludesFile')
      expect(ioHelper.stderrText).toContain(jsonValue(expected.detail))
      expect(calls.some((c) => c.args.includes('commit'))).toBe(false)
      if (expected.command === 'git add -A') {
        expect(calls.some((c) => c.args.includes('config'))).toBe(false)
      }

      const stdout = ioHelper.stdoutText
      const n1Idx = stdout.indexOf('cd d')
      const searchFrom = expectInOrder(stdout, n1Idx, expected.remaining)
      const n3Idx = stdout.indexOf('alice/r')
      expect(n3Idx).toBeGreaterThan(searchFrom - 1)
      for (const command of expected.notInStdout) {
        expect(stdout).not.toContain(command)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('D7: git init succeeds, git symbolic-ref fails -> CW-W03 naming it, N2 from it on', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = makeGitStub({ 'symbolic-ref': { code: 128, stdout: '', stderr: 'fatal: not a valid ref' } })
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W03/m)
      expect(ioHelper.stderrText).toContain('git symbolic-ref HEAD refs/heads/main')
      expect(ioHelper.stderrText).toContain(jsonValue('fatal: not a valid ref'))
      expect(calls.some((c) => c.args.includes('add'))).toBe(false)
      expect(calls.some((c) => c.args.includes('commit'))).toBe(false)

      const stdout = ioHelper.stdoutText
      const n1Idx = stdout.indexOf('cd d')
      expectInOrder(stdout, n1Idx, ['git symbolic-ref HEAD refs/heads/main', 'git add -A', `git commit -m "Create range from WXL ${deps.source.version}"`])
      expect(stdout).not.toContain('git init')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each([
    ['2.20.0', 'git version 2.20.0\n'],
    ['Apple Git suffix', 'git version 2.39.5 (Apple Git-154)\n'],
    ['Windows suffix', 'git version 2.45.1.windows.1\n'],
  ])('C36 control: %s is accepted, no CW-W01, G1 runs', async (_label, versionStdout) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit, calls } = makeGitStub({ version: { code: 0, stdout: versionStdout, stderr: '' } })
      const env = { HOME: '/fake-home', PATH: '/fake-path', XDG_CONFIG_HOME: '/fake-xdg' }
      const deps = makeDeps({ cwd: tmpRoot, env, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const argv = GIT_ARGV

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).not.toContain('CW-W01')
      expect(calls.some((c) => c.args.includes('init'))).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

/** The real git's own absolute directory on this machine, found the same way a teacher's shell
 * would -- used only to give the runner a working fallback once the planted `git` and the
 * relative entry are both skipped. */
function findRealGitDir() {
  const gitName = process.platform === 'win32' ? 'git.exe' : 'git'
  const dirs = (process.env.PATH ?? '').split(delimiter).filter((entry) => entry !== '')
  for (const dir of dirs) {
    if (!isAbsolute(dir)) continue
    try {
      accessSync(join(dir, gitName), fsConstants.X_OK)
      return dir
    } catch {
      continue
    }
  }
  throw new Error('no git found on PATH to run this test')
}

describe('git steps — runner', () => {
  // These plant a fake `git` as a `#!/bin/sh` script, executed directly (relying on the kernel's
  // shebang handling), which does not work on win32 regardless of the runner's own behaviour
  // (S-15/P-12); they are skipped there rather than given a non-POSIX fake binary, since T-0025's
  // cross-OS job already covers Windows PATH resolution against a real `git.exe`.
  const maybeItPosix = process.platform === 'win32' ? it.skip : it

  maybeItPosix('ignores a relative PATH entry even when it resolves (from the real process cwd) to a directory holding git', async () => {
    const targetDir = await makeTmpRoot()
    const relDir = await mkdtemp(join(process.cwd(), '.tmp-relpath-'))
    try {
      const marker = join(targetDir, 'marker')
      const fakeGit = join(relDir, 'git')
      await writeFile(fakeGit, `#!/bin/sh\necho ran > ${JSON.stringify(marker)}\necho "git version 0.0.0"\n`)
      await chmod(fakeGit, 0o755)

      const realGitDir = findRealGitDir()
      const relativeEntry = relative(process.cwd(), relDir)
      const path = [relativeEntry, realGitDir].join(delimiter)
      const runGit = createSpawnGitRunner()

      const result = await runGit(['--version'], { cwd: targetDir, env: { PATH: path } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('git version')
      expect(result.stdout).not.toContain('0.0.0')
      await expect(lstat(marker)).rejects.toThrow()
    } finally {
      await rm(targetDir, { recursive: true, force: true })
      await rm(relDir, { recursive: true, force: true })
    }
  })

  maybeItPosix('D8: never executes a git planted in the target directory, and ignores relative PATH entries', async () => {
    const targetDir = await makeTmpRoot()
    try {
      const marker = join(targetDir, 'marker')
      const fakeGit = join(targetDir, 'git')
      await writeFile(fakeGit, `#!/bin/sh\necho ran > ${JSON.stringify(marker)}\necho "git version 0.0.0"\n`)
      await chmod(fakeGit, 0o755)

      const realGitDir = findRealGitDir()
      const path = ['.', targetDir, realGitDir].join(delimiter)
      const runGit = createSpawnGitRunner()

      const result = await runGit(['--version'], { cwd: targetDir, env: { PATH: path } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('git version')
      expect(result.stdout).not.toContain('0.0.0')
      await expect(lstat(marker)).rejects.toThrow()
    } finally {
      await rm(targetDir, { recursive: true, force: true })
    }
  })

  maybeItPosix('ignores a PATH entry nested under the target directory (e.g. node_modules/.bin)', async () => {
    const targetDir = await makeTmpRoot()
    try {
      const binDir = join(targetDir, 'node_modules', '.bin')
      await mkdir(binDir, { recursive: true })
      const marker = join(targetDir, 'marker')
      const fakeGit = join(binDir, 'git')
      await writeFile(fakeGit, `#!/bin/sh\necho ran > ${JSON.stringify(marker)}\necho "git version 0.0.0"\n`)
      await chmod(fakeGit, 0o755)

      const realGitDir = findRealGitDir()
      const path = [binDir, realGitDir].join(delimiter)
      const runGit = createSpawnGitRunner()

      const result = await runGit(['--version'], { cwd: targetDir, env: { PATH: path } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('git version')
      expect(result.stdout).not.toContain('0.0.0')
      await expect(lstat(marker)).rejects.toThrow()
    } finally {
      await rm(targetDir, { recursive: true, force: true })
    }
  })

  it('on win32, finds git.exe through a case-insensitive Path variable', async () => {
    // A fake `git.exe` written as a `#!/bin/sh` script relies on the kernel's shebang handling,
    // which real Windows does not have: `spawn()` there would fail with ENOENT/UNKNOWN before the
    // lookup under test is even exercised. Instead, this copies the REAL git binary this machine
    // already has (found the same way a teacher's shell would, `findRealGitDir()`) under the
    // win32 candidate name `git.exe`, so the spawn at the end is of a real, natively executable
    // binary on every OS, including real Windows; only the case-insensitive `Path` key and the
    // injected `platform: 'win32'` lookup are what this test is about.
    const binDir = await makeTmpRoot()
    const cwd = await makeTmpRoot()
    try {
      const realGitDir = findRealGitDir()
      const realGitName = process.platform === 'win32' ? 'git.exe' : 'git'
      const fakeGit = join(binDir, 'git.exe')
      await copyFile(join(realGitDir, realGitName), fakeGit)
      await chmod(fakeGit, 0o755)

      const runGit = createSpawnGitRunner({ platform: 'win32' })
      const result = await runGit(['--version'], { cwd, env: { Path: binDir } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('git version')
    } finally {
      await rm(binDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })

  maybeItPosix('skips a PATH entry whose "git" is a directory, not a regular file', async () => {
    const earlierDir = await makeTmpRoot()
    const cwd = await makeTmpRoot()
    try {
      await mkdir(join(earlierDir, 'git'), { recursive: true })

      const realGitDir = findRealGitDir()
      const path = [earlierDir, realGitDir].join(delimiter)
      const runGit = createSpawnGitRunner()

      const result = await runGit(['--version'], { cwd, env: { PATH: path } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('git version')
    } finally {
      await rm(earlierDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('rejects with code ENOENT when no PATH directory holds git', async () => {
    const emptyDir = await makeTmpRoot()
    const cwd = await makeTmpRoot()
    try {
      const runGit = createSpawnGitRunner()
      await expect(runGit(['--version'], { cwd, env: { PATH: emptyDir } })).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await rm(emptyDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })

  maybeItPosix('decodes a multibyte UTF-8 character split across two stdout writes', async () => {
    const binDir = await makeTmpRoot()
    const cwd = await makeTmpRoot()
    try {
      const fakeGit = join(binDir, 'git')
      // 中 is UTF-8 bytes E4 B8 AD; written as two separate writes (with a pause between them)
      // so the two bytes and the final byte land in separate `data` events.
      await writeFile(
        fakeGit,
        '#!/bin/sh\n' +
          "printf 'git version 2.54.0 '\n" +
          "printf '\\344\\270'\n" +
          'sleep 0.05\n' +
          "printf '\\255\\n'\n",
      )
      await chmod(fakeGit, 0o755)

      const runGit = createSpawnGitRunner()
      const result = await runGit(['--version'], { cwd, env: { PATH: binDir } })

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('中')
    } finally {
      await rm(binDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })
})

describe('git steps — --no-setup', () => {
  it('a --no-setup run never reaches the step-12 checkpoint', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const { io } = makeIo({ interactive: false })

      const exitCode = await run(['d', '--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.checkpoint.mock.calls.map((c) => c[0])).not.toContain('step-12')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
