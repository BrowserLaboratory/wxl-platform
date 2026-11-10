// U68, U69 (traceability.md revision 3.1, P-9, D12; T-0062): a path whose name on disk differs
// from p -- in p itself or in the deepest existing ancestor when p is absent -- is untouched and
// reported UP-A15; names that agree (after NFC normalisation of both sides, with `\` turned into
// `/`, relative to the range root's own realpath) are not reported; an `lstat` or `realpath`
// error during P-9 is UP-E11 naming p. Name aliases no CI file system produces are modelled by
// wrapping `deps.fs` (0006-S1).

import { describe, it, expect, vi } from 'vitest'
import * as fsp from 'node:fs/promises'
import { rm, readFile, writeFile, mkdir, symlink, stat, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = 'b'.repeat(40)
const RANGE_JSON = { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } }
const COMMIT_ARGS = ['-c', 'user.name=WXL Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m']

/** `deps.fs` with every function's string arguments passed through `mapPath`, and `realpath` (and
 * `lstat`) optionally replaced -- the 0006-S1 wrap that models a name alias. */
function wrappedFs({ mapPath = (p) => p, realpath, lstat } = {}) {
  const out = {}
  for (const [name, fn] of Object.entries(fsp)) {
    out[name] = typeof fn === 'function' ? (...args) => fn(...args.map((a) => (typeof a === 'string' ? mapPath(a) : a))) : fn
  }
  if (realpath) out.realpath = (p, ...rest) => realpath(mapPath(p), ...rest)
  if (lstat) out.lstat = (p, ...rest) => lstat(mapPath(p), ...rest)
  return out
}

async function commitFiles(fixture, files) {
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(join(fixture.root, ...rel.split('/').slice(0, -1)), { recursive: true })
    await writeFile(join(fixture.root, ...rel.split('/')), content)
  }
  await verifyGit(['add', '-A'], { cwd: fixture.root, env: fixture.env })
  await verifyGit([...COMMIT_ARGS, 'fixture files'], { cwd: fixture.root, env: fixture.env })
}

async function ignoredList(fixture) {
  const out = await verifyGit(['ls-files', '--others', '--ignored', '--exclude-standard'], { cwd: fixture.root, env: fixture.env })
  return out.stdout ?? out
}

async function runUpgrade(fixture, { fs, cwd } = {}) {
  const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
  try {
    const fetchArchive = makeRefFetchArchive(
      {
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: fixture.baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
      },
      { releases: { ['3.0.0']: BASE_COMMIT } },
    )
    const deps = makeDeps({
      cwd: cwd ?? fixture.root,
      tmpRoot,
      env: fixture.env,
      runGit: vi.fn(createSpawnGitRunner()),
      packageVersion: '3.1.0',
      source: { version: '3.1.0' },
      fetchArchive,
      ...(fs ? { fs } : {}),
    })
    const ioHelper = makeIo()
    const exitCode = await run(['upgrade'], ioHelper.io, deps)
    const r3 = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
    return { exitCode, ioHelper, r3 }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true })
  }
}

async function cleanup(fixture, extra = []) {
  await rm(fixture.root, { recursive: true, force: true })
  await rm(fixture.env.HOME, { recursive: true, force: true })
  for (const dir of extra) await rm(dir, { recursive: true, force: true })
}

async function isCaseInsensitive(dir) {
  await writeFile(join(dir, 'CaseProbe.tmp'), 'x')
  try {
    await stat(join(dir, 'caseprobe.TMP'))
    return true
  } catch {
    return false
  } finally {
    await rm(join(dir, 'CaseProbe.tmp'), { force: true })
  }
}

const hasA15 = (r3, path) => r3.some((line) => line.includes('UP-A15') && line.includes(jsonValue(path)))

describe('U68: a name alias on disk -> untouched, UP-A15 (P-9)', () => {
  it('(a) an 8.3 model: B has GITIGN~1 ≡ the range\'s .gitignore, T lacks it, and deps.fs resolves GITIGN~1 to .gitignore -> UP-A15; .gitignore unchanged; the ignored list unchanged', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      const gitignorePath = join(fixture.root, '.gitignore')
      const before = await readFile(gitignorePath, 'utf8')
      fixture.baseEntries.push({ path: 'GITIGN~1', type: 'file', mode: 0o644, content: before })
      const ignoredBefore = await ignoredList(fixture)
      const alias = join(fixture.root, 'GITIGN~1')
      const fs = wrappedFs({ mapPath: (p) => (p === alias ? gitignorePath : p) })

      const result = await runUpgrade(fixture, { fs })

      expect(result.exitCode).toBe(0)
      expect(hasA15(result.r3, 'GITIGN~1')).toBe(true)
      expect(await readFile(gitignorePath, 'utf8')).toBe(before)
      expect(await ignoredList(fixture)).toEqual(ignoredBefore)
    } finally {
      await cleanup(fixture)
    }
  })

  it('(b) on a case-insensitive file system, T adds platform/new.txt where the range\'s tracked directory is Platform/ -> UP-A15; nothing written into Platform/', async (ctx) => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      // traceability.md Seams: real-file-system letter-case aliases run only on macOS or Windows,
      // on a case-insensitive file system (P-9 relies on a native realpath reporting the stored name).
      if (!['darwin', 'win32'].includes(process.platform) || !(await isCaseInsensitive(fixture.root))) {
        ctx.skip()
        return
      }
      await commitFiles(fixture, { 'Platform/teacher.md': 'a teacher page\n' })
      fixture.targetEntries.push({ path: 'platform/', type: 'dir', mode: 0o755 })
      fixture.targetEntries.push({ path: 'platform/new.txt', type: 'file', mode: 0o644, content: 'upstream\n' })
      const ignoredBefore = await ignoredList(fixture)

      const result = await runUpgrade(fixture)

      expect(result.exitCode).toBe(0)
      expect(hasA15(result.r3, 'platform/new.txt')).toBe(true)
      expect(await readdir(join(fixture.root, 'Platform'))).toEqual(['teacher.md'])
      expect((await readdir(fixture.root)).includes('platform')).toBe(false)
      expect(await ignoredList(fixture)).toEqual(ignoredBefore)
    } finally {
      await cleanup(fixture)
    }
  })

  it('(c, Windows only) a real 8.3 short name GITIGN~1 for .gitignore, when the runner can give one -> UP-A15; .gitignore unchanged', async (ctx) => {
    if (process.platform !== 'win32') {
      ctx.skip()
      return
    }
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      const gitignorePath = join(fixture.root, '.gitignore')
      try {
        execFileSync('fsutil', ['file', 'setshortname', gitignorePath, 'GITIGN~1'], { stdio: 'pipe' })
        await stat(join(fixture.root, 'GITIGN~1'))
      } catch {
        // Spec Testing Decisions: when the runner cannot give a file a short name, the real case
        // is recorded as not verified, and the injected model in (a) stands.
        ctx.skip()
        return
      }
      const before = await readFile(gitignorePath, 'utf8')
      fixture.baseEntries.push({ path: 'GITIGN~1', type: 'file', mode: 0o644, content: before })

      const result = await runUpgrade(fixture)

      expect(result.exitCode).toBe(0)
      expect(hasA15(result.r3, 'GITIGN~1')).toBe(true)
      expect(await readFile(gitignorePath, 'utf8')).toBe(before)
    } finally {
      await cleanup(fixture)
    }
  })
})

describe('U69: names that agree are not reported; P-9 errors fail closed', () => {
  const NFC_NAME = 'caf\u00e9.md'
  const NFD_NAME = 'cafe\u0301.md'

  it('(a) the range root reached through a symbolic link to it -> no UP-A15; README.md updated', async (ctx) => {
    if (process.platform === 'win32') {
      ctx.skip()
      return
    }
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'], rangeJson: RANGE_JSON })
    const linkDir = await makeTmpRoot('create-wxl-upgrade-link-')
    try {
      const link = join(linkDir, 'range')
      await symlink(fixture.root, link)
      const result = await runUpgrade(fixture, { cwd: link })
      expect(result.exitCode).toBe(0)
      expect(result.r3.some((line) => line.includes('UP-A15'))).toBe(false)
      expect(await readFile(join(fixture.root, 'README.md'), 'utf8')).toContain('updated by upstream')
    } finally {
      await cleanup(fixture, [linkDir])
    }
  })

  it('(b) an NFC name for which deps.fs.realpath returns its NFD form (an HFS+ model) -> no UP-A15; the file updated', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      await commitFiles(fixture, { [NFC_NAME]: 'base\n' })
      fixture.baseEntries.push({ path: NFC_NAME, type: 'file', mode: 0o644, content: 'base\n' })
      fixture.targetEntries.push({ path: NFC_NAME, type: 'file', mode: 0o644, content: 'target\n' })
      const fs = wrappedFs({ realpath: async (p, ...rest) => (await fsp.realpath(p, ...rest)).normalize('NFD') })
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(0)
      expect(result.r3.some((line) => line.includes('UP-A15'))).toBe(false)
      expect(await readFile(join(fixture.root, NFC_NAME), 'utf8')).toBe('target\n')
    } finally {
      await cleanup(fixture)
    }
  })

  it('(c) an NFD name tracked as NFD, whose realpath is NFD too (a repository made on Linux) -> no UP-A15; the file updated', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      await verifyGit(['config', 'core.precomposeunicode', 'false'], { cwd: fixture.root, env: fixture.env })
      await commitFiles(fixture, { [NFD_NAME]: 'base\n' })
      fixture.baseEntries.push({ path: NFD_NAME, type: 'file', mode: 0o644, content: 'base\n' })
      fixture.targetEntries.push({ path: NFD_NAME, type: 'file', mode: 0o644, content: 'target\n' })
      const fs = wrappedFs({ realpath: async (p, ...rest) => (await fsp.realpath(p, ...rest)).normalize('NFD') })
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(0)
      expect(result.r3.some((line) => line.includes('UP-A15'))).toBe(false)
      expect(await readFile(join(fixture.root, NFD_NAME), 'utf8')).toBe('target\n')
    } finally {
      await cleanup(fixture)
    }
  })

  it('(d) a nested path whose names agree, with deps.fs.realpath returning \\-separated paths (a Windows model) -> no UP-A15', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      await commitFiles(fixture, { 'docs/guide.md': 'base\n' })
      fixture.baseEntries.push({ path: 'docs/', type: 'dir', mode: 0o755 }, { path: 'docs/guide.md', type: 'file', mode: 0o644, content: 'base\n' })
      fixture.targetEntries.push({ path: 'docs/', type: 'dir', mode: 0o755 }, { path: 'docs/guide.md', type: 'file', mode: 0o644, content: 'target\n' })
      const fs = wrappedFs({ realpath: async (p, ...rest) => (await fsp.realpath(p, ...rest)).replace(/\//g, '\\') })
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(0)
      expect(result.r3.some((line) => line.includes('UP-A15'))).toBe(false)
      expect(await readFile(join(fixture.root, 'docs', 'guide.md'), 'utf8')).toBe('target\n')
    } finally {
      await cleanup(fixture)
    }
  })

  it('(e) a range root whose realpath is the drive root D:\\ (a drive-root model) -> no UP-A15', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      await commitFiles(fixture, { 'platform/a.md': 'base\n' })
      fixture.baseEntries.push({ path: 'platform/', type: 'dir', mode: 0o755 }, { path: 'platform/a.md', type: 'file', mode: 0o644, content: 'base\n' })
      fixture.targetEntries.push({ path: 'platform/', type: 'dir', mode: 0o755 }, { path: 'platform/a.md', type: 'file', mode: 0o644, content: 'target\n' })
      const realRoot = await fsp.realpath(fixture.root)
      const fs = wrappedFs({
        realpath: async (p, ...rest) => {
          const real = await fsp.realpath(p, ...rest)
          if (real === realRoot) return 'D:\\'
          if (real.startsWith(realRoot)) return 'D:\\' + real.slice(realRoot.length + 1).replace(/[\\/]/g, '\\')
          return real
        },
      })
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(0)
      expect(result.r3.some((line) => line.includes('UP-A15'))).toBe(false)
      expect(await readFile(join(fixture.root, 'platform', 'a.md'), 'utf8')).toBe('target\n')
    } finally {
      await cleanup(fixture)
    }
  })

  it('(f) deps.fs.realpath rejects with EACCES for a tracked file p with b ≢ t -> UP-E11 naming p, nothing written', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'], rangeJson: RANGE_JSON })
    try {
      const target = join(fixture.root, 'README.md')
      const fs = wrappedFs({
        realpath: async (p, ...rest) => {
          if (p === target) throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
          return fsp.realpath(p, ...rest)
        },
      })
      const before = await snapshotTree(fixture.root)
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(1)
      expect(result.ioHelper.stderrText).toMatch(/^UP-E11/m)
      expect(result.ioHelper.stderrText).toContain(jsonValue('README.md'))
      expect(await snapshotTree(fixture.root)).toEqual(before)
    } finally {
      await cleanup(fixture)
    }
  })

  it('(g) deps.fs.lstat rejects with EACCES for an ancestor of an absent p during P-9 -> UP-E11 naming p, nothing written', async () => {
    const fixture = await buildUpgradeFixtures({ branches: [], rangeJson: RANGE_JSON })
    try {
      fixture.targetEntries.push({ path: 'src/new-from-upstream.txt', type: 'file', mode: 0o644, content: 'new\n' })
      const ancestor = join(fixture.root, 'src')
      let calls = 0
      // P-3 lstats every prefix of p first; only a later lstat of the same ancestor (P-9's walk)
      // fails, so the error reaches P-9 rather than P-3.
      const fs = wrappedFs({
        lstat: async (p, ...rest) => {
          if (p === ancestor && ++calls > 1) throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
          return fsp.lstat(p, ...rest)
        },
      })
      const before = await snapshotTree(fixture.root)
      const result = await runUpgrade(fixture, { fs })
      expect(result.exitCode).toBe(1)
      expect(result.ioHelper.stderrText).toMatch(/^UP-E11/m)
      expect(result.ioHelper.stderrText).toContain(jsonValue('src/new-from-upstream.txt'))
      expect(await snapshotTree(fixture.root)).toEqual(before)
    } finally {
      await cleanup(fixture)
    }
  })
})
