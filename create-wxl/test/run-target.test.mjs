import { describe, it, expect, vi } from 'vitest'
import * as fsp from 'node:fs/promises'
import { rm, mkdir, readdir, readFile, lstat, writeFile, symlink, chmod } from 'node:fs/promises'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive as makeFixtureFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { snapshotTree, skipModes } from './helpers/snapshot.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'

const SYMLINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir'

function makeFetchArchive() {
  return makeFixtureFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
}

async function listFiles(dir, base = '') {
  const names = await readdir(dir, { withFileTypes: true })
  let result = []
  for (const entry of names) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      result = result.concat(await listFiles(join(dir, entry.name), rel))
    } else {
      result.push(rel)
    }
  }
  return result
}

const EXPECTED_FILES = ['CHANGELOG.md', '.proj.specs/OPEN-QUESTIONS.md', 'package.json', 'README.md', 'src/index.js', 'range.json'].sort()

describe('accepted targets', () => {
  it.each([
    ['missing target', async (tmpRoot) => ({ argPath: 'range', cwd: tmpRoot })],
    [
      'pre-existing empty directory',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        await mkdir(target, { mode: 0o750 })
        return { argPath: 'range', cwd: tmpRoot }
      },
    ],
    [
      'cwd is an empty directory, target is "."',
      async (tmpRoot) => {
        const cwd = join(tmpRoot, 'cwd')
        await mkdir(cwd, { mode: 0o750 })
        return { argPath: '.', cwd }
      },
    ],
    [
      'parent is a symlink to a directory',
      async (tmpRoot) => {
        const realParent = join(tmpRoot, 'real-parent')
        await mkdir(realParent)
        const linkParent = join(tmpRoot, 'link-parent')
        await symlink(realParent, linkParent, SYMLINK_TYPE)
        return { argPath: 'range', cwd: linkParent }
      },
    ],
  ])('%s', async (_label, setup) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { argPath, cwd } = await setup(tmpRoot)
      const target = join(cwd, argPath)

      let preExisting = null
      if (!skipModes) {
        try {
          const st = await lstat(target)
          preExisting = { ino: st.ino, mode: st.mode & 0o7777 }
        } catch {
          preExisting = null
        }
      }

      const mkdtempSpy = vi.fn(fsp.mkdtemp)
      const deps = makeDeps({ env: {}, cwd, fetchArchive: makeFetchArchive(), fs: { ...fsp, mkdtemp: mkdtempSpy } })
      const { io } = makeIo()

      const exitCode = await run([argPath, '--no-setup'], io, deps)

      expect(exitCode).toBe(0)

      // The range at the target holds the full fixture file set (P-10), not just `range.json`.
      const files = (await listFiles(target)).sort()
      expect(files).toEqual(EXPECTED_FILES)
      const rangeJsonText = await readFile(join(target, 'range.json'), 'utf8')
      expect(JSON.parse(rangeJsonText).upstream.commit).toBe(FIXED_COMMIT)

      expect(mkdtempSpy).toHaveBeenCalledTimes(1)
      expect(mkdtempSpy.mock.calls[0][0]).toBe(join(dirname(target), '.create-wxl-'))

      const parentNames = await readdir(dirname(target))
      expect(parentNames.some((name) => name.startsWith('.create-wxl-'))).toBe(false)

      if (preExisting) {
        const st = await lstat(target)
        expect(st.ino).toBe(preExisting.ino)
        expect(st.mode & 0o7777).toBe(preExisting.mode)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('rejected targets', () => {
  async function runRejectedCase(tmpRoot, setup) {
    const { argPath, cwd, conditionId, fsOverrides } = await setup(tmpRoot)
    const target = resolvePath(cwd, argPath)
    const before = await snapshotTree(tmpRoot)

    const { fs: baseFs, calls } = recordingFs(fsOverrides)
    const deps = makeDeps({ cwd, fetchArchive: makeFetchArchive(), fs: baseFs })
    const ioHelper = makeIo()

    const exitCode = await run([argPath, '--no-setup'], ioHelper.io, deps)
    const after = await snapshotTree(tmpRoot)

    return { exitCode, ioHelper, deps, calls, before, after, target, conditionId }
  }

  const CASES = [
    [
      'a file',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        await writeFile(target, 'not a directory')
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'file' }
      },
    ],
    [
      'a symlink to an empty directory',
      async (tmpRoot) => {
        const real = join(tmpRoot, 'real-empty')
        await mkdir(real)
        const target = join(tmpRoot, 'range')
        await symlink(real, target, SYMLINK_TYPE)
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'symlink' }
      },
    ],
    [
      'a dangling symlink',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        await symlink(join(tmpRoot, 'does-not-exist'), target, SYMLINK_TYPE)
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'symlink' }
      },
    ],
    [
      'a directory holding only .DS_Store',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        await mkdir(target)
        await writeFile(join(target, '.DS_Store'), '')
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'non-empty' }
      },
    ],
    [
      'parent missing',
      async (tmpRoot) => ({ argPath: join('missing', 'range'), cwd: tmpRoot, conditionId: 'parent-missing' }),
    ],
    [
      'parent exists but is a file',
      async (tmpRoot) => {
        const parentFile = join(tmpRoot, 'not-a-dir')
        await writeFile(parentFile, 'x')
        return { argPath: join('not-a-dir', 'range'), cwd: tmpRoot, conditionId: 'parent-not-directory' }
      },
    ],
    [
      'target lstat fails with an unexpected error',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        const realLstat = fsp.lstat
        const fsOverrides = {
          lstat: async (path, ...rest) => {
            if (resolvePath(path) === resolvePath(target)) {
              const err = new Error('i/o error')
              err.code = 'EIO'
              throw err
            }
            return realLstat(path, ...rest)
          },
        }
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'lstat-error', fsOverrides }
      },
    ],
    ...(skipModes
      ? []
      : [
          [
            'parent not writable',
            async (tmpRoot) => {
              const parent = join(tmpRoot, 'readonly-parent')
              await mkdir(parent)
              await chmod(parent, 0o555)
              return { argPath: join('readonly-parent', 'range'), cwd: tmpRoot, conditionId: 'parent-not-writable' }
            },
          ],
        ]),
    [
      'an empty directory on another device than its parent',
      async (tmpRoot) => {
        const target = join(tmpRoot, 'range')
        await mkdir(target)
        const realStat = fsp.stat
        const fsOverrides = {
          stat: async (path, ...rest) => {
            const st = await realStat(path, ...rest)
            if (resolvePath(path) === resolvePath(target)) {
              return Object.create(st, { dev: { value: st.dev + 1, enumerable: true } })
            }
            return st
          },
        }
        return { argPath: 'range', cwd: tmpRoot, conditionId: 'cross-device', fsOverrides }
      },
    ],
  ]

  for (const [label, setup] of CASES) {
    it(`${label} -> CW-E04, exit 1, nothing written, no download`, async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const { exitCode, ioHelper, deps, calls, before, after, target } = await runRejectedCase(tmpRoot, setup)

        expect(exitCode).toBe(1)
        expect(ioHelper.stdoutText).toBe('')
        expect(ioHelper.stderrText).toMatch(/^CW-E04/m)
        expect(ioHelper.stderrText).toContain(JSON.stringify(target))
        expect(deps.fetchArchive).not.toHaveBeenCalled()
        const step6OrLater = deps.checkpoint.mock.calls.filter((c) => Number(c[0].split('-')[1]) >= 6)
        expect(step6OrLater).toEqual([])
        expect(calls).toEqual([])
        expect(after).toEqual(before)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })
  }

  it('six conditions, six distinct messages (the two symlink cases share one)', async () => {
    const seen = new Map()
    for (const [, setup] of CASES) {
      const tmpRoot = await makeTmpRoot()
      try {
        const { ioHelper, conditionId } = await runRejectedCase(tmpRoot, setup)
        const line = ioHelper.stderrText.split('\n')[0]
        const withoutPath = line.replace(/"(?:[^"\\]|\\.)*"/, '<path>')
        if (seen.has(conditionId)) {
          expect(withoutPath).toBe(seen.get(conditionId))
        } else {
          seen.set(conditionId, withoutPath)
        }
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    }
    expect(new Set(seen.values()).size).toBe(seen.size)
  })
})

describe('newly created target mode', () => {
  const maybeIt = skipModes ? it.skip : it

  maybeIt('is 0755 masked by a strict umask (077)', async () => {
    const originalUmask = process.umask(0o077)
    try {
      const tmpRoot = await makeTmpRoot()
      try {
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive: makeFetchArchive() })
        const { io } = makeIo()
        const exitCode = await run(['range', '--no-setup'], io, deps)
        expect(exitCode).toBe(0)
        const target = join(tmpRoot, 'range')
        const st = await lstat(target)
        expect(st.mode & 0o7777).toBe(0o755 & ~0o077)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    } finally {
      process.umask(originalUmask)
    }
  })
})
