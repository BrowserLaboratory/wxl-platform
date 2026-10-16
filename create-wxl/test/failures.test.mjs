// T-0024: step 10's rollback, the step-10 recheck against another process, steps 8-9's
// file-system errors, and unexpected ("bug") errors (traceability.md "Writes and cleanup",
// "Error and warning codes" CW-E09/CW-E11/CW-E14).

import { describe, it, expect, vi } from 'vitest'
import { rm, mkdir, readdir, writeFile, readFile } from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { failAt, fsError } from './helpers/fail-at.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { placeSentinel, expectOnlySentinel } from './helpers/sentinel.mjs'
import { expectCwLinesStartWithCode } from './helpers/expect-cw-lines.mjs'

function fetchFixture() {
  return makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
}

describe('step 10 rollback', () => {
  it('C30: fs.rename fails on the 3rd entry -> CW-E11, entries 1-2 moved back, target empty, temporary directory removed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await mkdir(target)

      const renameSources = []
      const rename = failAt('rename', (count, args) => {
        if (!args[0].startsWith(join(tmpRoot, '.create-wxl-'))) return null
        renameSources.push(args)
        if (renameSources.length === 3) return fsError('EPERM', 'EPERM: operation not permitted')
        return null
      })
      const { fs, calls } = recordingFs({ rename })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain(JSON.stringify(target))
      expect(ioHelper.stderrText).toContain('EPERM')

      expect(await readdir(target)).toEqual([])
      await expectOnlySentinel(tmpRoot, { extraNames: ['range'] })

      // The first two forward renames (entries 1-2) were moved back: a rename whose destination is
      // under the temporary directory, named after each of the first two forward renames' sources.
      const movedBack = calls.filter((c) => c.method === 'rename' && c.args[1].startsWith(join(tmpRoot, '.create-wxl-')))
      const movedBackNames = movedBack.map((c) => basename(c.args[1])).sort()
      const firstTwoNames = renameSources.slice(0, 2).map((args) => basename(args[1])).sort()
      expect(movedBackNames).toEqual(firstTwoNames)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C65: rename fails on the 3rd entry and again moving back the 2nd -> CW-E11 names the 2nd entry and the kept temporary directory, exit 1', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await mkdir(target)

      const forwardSources = []
      const rename = failAt('rename', (count, args) => {
        const isForward = args[0].startsWith(join(tmpRoot, '.create-wxl-'))
        if (isForward) {
          forwardSources.push(args)
          if (forwardSources.length === 3) return fsError('EPERM', 'EPERM: operation not permitted')
          return null
        }
        // a reverse rename (moving an entry back into the temporary directory): fail when it is
        // the 2nd entry's (forwardSources[1]'s) name being moved back.
        const secondEntryName = forwardSources[1]?.[1] && basename(forwardSources[1][1])
        if (secondEntryName && basename(args[1]) === secondEntryName) {
          return fsError('EPERM', 'EPERM: operation not permitted (rollback)')
        }
        return null
      })
      const { fs, calls } = recordingFs({ rename })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      const secondEntryName = basename(forwardSources[1][1])
      const firstEntryName = basename(forwardSources[0][1])
      expect(ioHelper.stderrText).toContain(JSON.stringify(secondEntryName))

      // (S-07/P-07) The temporary directory is still present and named: it holds the 1st entry
      // (rollback moved it back successfully) and every entry from the 3rd on (never moved out
      // of it in the first place) -- NOT the 2nd entry, which is the one left stranded in the
      // target. The recorder has no rm/rmdir call naming it: `moveIntoPlace` never tried to
      // remove a temporary directory it was required to keep.
      const tmpDirMatch = ioHelper.stderrText.match(/\.create-wxl-[^"\\]*/)
      expect(tmpDirMatch).not.toBeNull()
      const tmpDirPath = join(tmpRoot, tmpDirMatch[0])
      const tmpDirEntries = await readdir(tmpDirPath)
      expect(tmpDirEntries).toContain(firstEntryName)
      expect(tmpDirEntries).not.toContain(secondEntryName)
      const removalCalls = calls.filter(
        (c) => (c.method === 'rm' || c.method === 'rmdir') && c.args[0] === tmpDirPath,
      )
      expect(removalCalls).toEqual([])

      // The target holds exactly the 2nd entry (the one rollback could not move back).
      expect(await readdir(target)).toEqual([secondEntryName])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 10 recheck', () => {
  it.each([
    [
      'a file',
      (target) => {
        writeFileSync(target, 'x')
      },
      'file',
    ],
    [
      'a non-empty directory',
      (target) => {
        mkdirSync(target)
        writeFileSync(join(target, 'child'), 'child')
      },
      'non-empty',
    ],
  ])('C53(%s): another process creates %s at the target before step 10 -> CW-E04 naming the condition, temporary directory removed, their target untouched', async (_label, setup, conditionId) => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')

      const checkpoint = vi.fn((name) => {
        if (name === 'step-10') setup(target)
      })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive: fetchFixture(), checkpoint })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E04/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain(JSON.stringify(target))
      // (P-15) the condition text itself, not just the code and path.
      const expectedConditionText = { file: 'it is not a directory', 'non-empty': 'it is not an empty directory' }[conditionId]
      expect(ioHelper.stderrText).toContain(expectedConditionText)

      if (conditionId === 'file') {
        expect(await readFile(target, 'utf8')).toBe('x')
      } else {
        expect(await readdir(target)).toEqual(['child'])
      }
      await expectOnlySentinel(tmpRoot, { extraNames: ['range'] })
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C53(empty directory): accepted, entries moved in one at a time (every top-level entry, by name), not the whole temporary directory, full expected range', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const target = join(tmpRoot, 'range')
      const checkpoint = vi.fn((name) => {
        if (name === 'step-10') mkdirSync(target)
      })
      const { fs, calls } = recordingFs()
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture(), checkpoint })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      const wholeDirRenames = calls.filter((c) => c.method === 'rename' && c.args[1] === target)
      expect(wholeDirRenames).toEqual([])
      // (P-15) a positive per-entry rename for every top-level name that ends up in the target,
      // and the target's full expected listing (not just "contains range.json").
      const perEntryRenames = calls.filter((c) => c.method === 'rename' && dirname(c.args[1]) === target)
      const renamedNames = perEntryRenames.map((c) => basename(c.args[1])).sort()
      const expectedTopLevel = ['.proj.specs', 'CHANGELOG.md', 'README.md', 'package.json', 'range.json', 'src'].sort()
      expect(renamedNames).toEqual(expectedTopLevel)
      expect((await readdir(target)).sort()).toEqual(expectedTopLevel)
      // the temporary directory is gone
      const parentNames = await readdir(tmpRoot)
      expect(parentNames.filter((n) => n.startsWith('.create-wxl-'))).toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('steps 8-9 file-system errors', () => {
  it.each([
    [
      'mkdtemp EACCES',
      () => ({ mkdtemp: failAt('mkdtemp', (count) => (count === 1 ? fsError('EACCES', 'EACCES: permission denied') : null)) }),
      'EACCES',
      // mkdtemp's path is the parent directory (tmpRoot itself).
      (tmpRoot) => tmpRoot,
    ],
    [
      'entry write EIO (2nd file entry)',
      () => ({
        writeFile: failAt('writeFile', (count, args) =>
          args[0].endsWith('OPEN-QUESTIONS.md') ? fsError('EIO', 'EIO: i/o error') : null,
        ),
      }),
      'EIO',
      () => join('.proj.specs', 'OPEN-QUESTIONS.md'),
    ],
    [
      'range.json write EIO',
      () => ({
        writeFile: failAt('writeFile', (count, args) => (args[0].endsWith('range.json') ? fsError('EIO', 'EIO: i/o error') : null)),
      }),
      'EIO',
      () => 'range.json',
    ],
    [
      'package.json read EACCES',
      () => ({
        readFile: failAt('readFile', (count, args) =>
          args[0].endsWith('package.json') ? fsError('EACCES', 'EACCES: permission denied') : null,
        ),
      }),
      'EACCES',
      () => 'package.json',
    ],
  ])('C54(%s) -> CW-E09 names the error code and the path, target unchanged, temporary directory removed', async (_label, makeOverrides, expectedCode, expectedPathSuffix) => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')

      const { fs } = recordingFs(makeOverrides())
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E09/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E10/m)
      expect(ioHelper.stderrText).toContain(expectedCode)

      const pathMatch = ioHelper.stderrText.match(/CW-E09: a file-system error at ("(?:[^"\\]|\\.)*")/)
      expect(pathMatch).not.toBeNull()
      const reportedPath = JSON.parse(pathMatch[1])
      expect(reportedPath.endsWith(expectedPathSuffix(tmpRoot))).toBe(true)

      await expect(readdir(target)).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('unexpected errors', () => {
  it('a bug in steps 1-2 (argv parsing) -> CW-E14 in the environment language, exit 1 (not a rejection)', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const deps = makeDeps({ cwd: tmpRoot })
      const ioHelper = makeIo()
      const originalArgv = [Symbol('not coercible')]
      const exitCode = await run(originalArgv, ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 10 move failures classified as CW-E11, not CW-E14', () => {
  it('(a) a failing whole-directory rename(tmpDir, target) -> CW-E11, target unchanged, temporary directory removed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      const rename = failAt('rename', (count, args) =>
        args[1] === target ? fsError('EPERM', 'EPERM: operation not permitted') : null,
      )
      const { fs } = recordingFs({ rename })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E14/m)
      await expect(readdir(target)).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) chmod fails after a successful whole-directory rename -> CW-E11, the range is moved back, target unchanged', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      const chmod = failAt('chmod', (count, args) =>
        args[0] === target ? fsError('EPERM', 'EPERM: operation not permitted') : null,
      )
      const { fs } = recordingFs({ chmod })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E14/m)
      await expect(readdir(target)).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(c) rmdir fails after every entry was individually moved into an existing empty target -> CW-E11, entries moved back, target empty again', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await mkdir(target)
      const rmdir = failAt('rmdir', (count, args) =>
        args[0].startsWith(join(tmpRoot, '.create-wxl-')) ? fsError('EACCES', 'EACCES: permission denied') : null,
      )
      const { fs } = recordingFs({ rmdir })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E14/m)
      expect(await readdir(target)).toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('CW-E09 vs CW-E14 classification', () => {
  it("a Node ERR_* validation error (string code) during extraction -> CW-E14, not CW-E09", async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const target = join(tmpRoot, 'range')
      const writeFile = failAt('writeFile', (count, args) => {
        if (!args[0].endsWith('OPEN-QUESTIONS.md')) return null
        const err = new TypeError('The "data" argument must be of type string or an instance of Buffer')
        err.code = 'ERR_INVALID_ARG_TYPE'
        return err
      })
      const { fs } = recordingFs({ writeFile })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E09/m)
      await expect(readdir(target)).rejects.toThrow()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('unexpected errors (original)', () => {
  it('C57(a): parseForkInitArgs throws a plain Error -> CW-E14 with the message, not CW-E06, exit 1, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { fs, calls } = recordingFs()
      const deps = makeDeps({
        cwd: tmpRoot,
        fs,
        fetchArchive: fetchFixture(),
        // (P-19) only `parseForkInitArgs` is overridden; `ForkInitArgError` stays the real
        // engine class, so the `err instanceof deps.engine.ForkInitArgError` check in run.mjs is
        // exercised for real (a fake stand-in class would always fail that check vacuously).
        engine: { parseForkInitArgs: () => { throw new Error('kaboom') } },
      })
      const ioHelper = makeIo()

      const exitCode = await run(
        ['range', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages'],
        ioHelper.io,
        deps,
      )

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain('kaboom')
      expect(ioHelper.stderrText).not.toMatch(/^CW-E06/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C57(b): fs.readdir throws an unexpected error at step 4 -> CW-E14 with the message, not CW-E04, exit 1, target unchanged', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const target = join(tmpRoot, 'range')
      await mkdir(target)
      const { fs, calls } = recordingFs({
        readdir: async (path, ...rest) => {
          if (path === target) throw new Error('boom')
          return readdir(path, ...rest)
        },
      })
      const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: fetchFixture() })
      const ioHelper = makeIo()

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain('boom')
      expect(ioHelper.stderrText).not.toMatch(/^CW-E04/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      // (P-19) no mkdtemp or write-type call at all: the bug happens before step 8.
      expect(calls).toEqual([])
      expect(await readdir(target)).toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
