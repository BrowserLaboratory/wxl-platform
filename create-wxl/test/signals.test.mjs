// T-0024: SIGINT/SIGTERM/SIGHUP in every window (traceability.md "Signals").

import { describe, it, expect, vi } from 'vitest'
import { rm, readdir, mkdir, readFile, writeFile, mkdtemp, rename, lstat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { PassThrough } from 'node:stream'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT, PACKAGE_VERSION } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE, ENGINE_READY_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { placeSentinel, expectOnlySentinel } from './helpers/sentinel.mjs'
import { makeSignalingCheckpoint } from './helpers/checkpoint-signal.mjs'
import { makeGitStub } from './helpers/git-stub.mjs'
import { createSignalGuard } from '../src/signals.mjs'
import { expectCwLinesStartWithCode } from './helpers/expect-cw-lines.mjs'

const SETUP_ARGV = ['range', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages']

function fetchFixture() {
  return makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
}

/** Steps 11+ need `runForkInit` to succeed against real archive content (unless a test replaces
 * `runForkInit` with its own stub). */
function fetchEngineReadyFixture() {
  return makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
}

describe('SIGINT in steps 3-10', () => {
  it('C31(step-5, non-interactive setup): SIGINT -> exit 130, fetchArchive not called', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-5')

      const ioHelper = makeIo()
      const exitCode = await run(
        ['range', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages'],
        ioHelper.io,
        deps,
      )

      expect(exitCode).toBe(130)
      expect(fetchArchive).not.toHaveBeenCalled()
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each(['step-4', 'step-6', 'step-8', 'step-9'])(
    'C31(%s): SIGINT -> exit 130, target as before, temporary directory removed or never created',
    async (stepName) => {
      const tmpRoot = await makeTmpRoot()
      try {
        await placeSentinel(tmpRoot)
        const fetchArchive = fetchFixture()
        let createdTmpDir = null
        const mkdtempOverride = async (...args) => {
          createdTmpDir = await mkdtemp(...args)
          return createdTmpDir
        }
        const { fs, calls } = recordingFs({ mkdtemp: mkdtempOverride })
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive, fs })
        deps.checkpoint = makeSignalingCheckpoint(deps.signals, stepName)

        const ioHelper = makeIo()
        const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

        expect(exitCode).toBe(130)
        await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
        await expectOnlySentinel(tmpRoot)

        const mkdtempCalls = calls.filter((c) => c.method === 'mkdtemp')
        if (stepName === 'step-4' || stepName === 'step-6') {
          expect(fetchArchive).not.toHaveBeenCalled()
          expect(calls).toEqual([])
        } else if (stepName === 'step-8') {
          // "after a signal no new file-system operation starts": the checkpoint fires before
          // step 8's own mkdtemp, so none of step 8's work (including mkdtemp itself) ever runs.
          expect(mkdtempCalls).toEqual([])
          expect(calls).toEqual([])
        } else {
          // step-9: the temporary directory was created in step 8, then removed by this signal's
          // own cleanup -- exactly one mkdtemp, and exactly one removal of that same path.
          expect(mkdtempCalls.length).toBe(1)
          expect(createdTmpDir).not.toBeNull()
          const removalCalls = calls.filter((c) => c.method === 'rm' || c.method === 'rmdir')
          expect(removalCalls.length).toBe(1)
          expect(removalCalls[0].args[0]).toBe(createdTmpDir)
        }
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  it('(addition, decision 6): SIGINT during step 8 extraction stops before the next entry write, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      let writeCount = 0
      const writeFileOverride = async (...args) => {
        writeCount++
        if (writeCount === 1) deps.signals.emit('SIGINT') // after the 1st file entry, before the 2nd
        return writeFile(...args)
      }
      const { fs } = recordingFs({ writeFile: writeFileOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(writeCount).toBe(1) // never started the 2nd entry's write
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(addition, decision 6): SIGINT during step 9 (P1-P4) stops before the next pristine write, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      let writeCount = 0
      const writeFileOverride = async (...args) => {
        writeCount++
        // PRISTINE_FIXTURE has 5 file entries (step 8's own writes; directories use mkdir); P1's
        // write is the 6th. Signal right after it, before P2's write.
        if (writeCount === 6) deps.signals.emit('SIGINT')
        return writeFile(...args)
      }
      const { fs } = recordingFs({ writeFile: writeFileOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(writeCount).toBe(6) // step 8's 5 writes, then P1's; P2/P3/P4 never started
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(addition, decision 6): SIGINT during step 6 download aborts the fetch through its AbortController, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const deps = makeDeps({ cwd: tmpRoot })
      let signalledAbort = false
      deps.fetchArchive = async (_repo, _commit, { signal }) => {
        signal.addEventListener('abort', () => {
          signalledAbort = true
        })
        deps.signals.emit('SIGINT')
        await new Promise((resolve, reject) => {
          if (signal.aborted) {
            reject(new Error('aborted'))
            return
          }
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
        return { status: 200, body: Buffer.alloc(0) }
      }

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(signalledAbort).toBe(true)
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT during step 9\'s last write (range.json) -> stops before step 10, exit 130, temporary directory removed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const writeFileOverride = async (...args) => {
        if (args[0].endsWith('range.json')) deps.signals.emit('SIGINT')
        return writeFile(...args)
      }
      const { fs } = recordingFs({ writeFile: writeFileOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT at the step-10 checkpoint (target absent, whole-directory rename branch) -> exit 130, target as before, temporary directory removed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-10')

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT during the whole-directory rename (target absent) -> target as before, temporary directory removed, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const target = join(tmpRoot, 'range')
      const renameOverride = async (...args) => {
        const result = await rename(...args)
        if (args[1] === target) deps.signals.emit('SIGINT')
        return result
      }
      const { fs } = recordingFs({ rename: renameOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      await expect(readdir(target)).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C31(step-10, 2nd move): SIGINT during the 2nd entry move -> waits for it to finish, actually renames 1-2 back (not merely absent from target), exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await mkdir(target)

      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      let forwardCount = 0
      const renameOverride = async (...args) => {
        if (args[0].startsWith(join(tmpRoot, '.create-wxl-'))) {
          forwardCount++
          if (forwardCount === 2) deps.signals.emit('SIGINT')
        }
        return rename(...args)
      }
      const { fs, calls } = recordingFs({ rename: renameOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      const forwardRenames = calls.filter(
        (c) => c.method === 'rename' && c.args[0].startsWith(join(tmpRoot, '.create-wxl-')),
      )
      expect(forwardRenames.length).toBe(2)
      const forwardNames = forwardRenames.map((c) => basename(c.args[0])).sort()
      // (P-16) the exact SET of reverse renames (back into the temporary directory) matches the
      // two entries that were actually moved forward -- not merely "the target ended up empty"
      // (which deleting them outright would also satisfy).
      const reverseRenames = calls.filter(
        (c) => c.method === 'rename' && c.args[1].startsWith(join(tmpRoot, '.create-wxl-')),
      )
      const reverseNames = reverseRenames.map((c) => basename(c.args[1])).sort()
      expect(reverseNames).toEqual(forwardNames)
      expect(await readdir(target)).toEqual([])
      await expectOnlySentinel(tmpRoot, { extraNames: ['range'] })
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT during the 2nd entry move, and moving the 2nd entry back also fails -> CW-E11 names it, temporary directory kept, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await mkdir(target)

      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      let forwardCount = 0
      let secondEntryName
      const renameOverride = async (...args) => {
        const isForward = args[0].startsWith(join(tmpRoot, '.create-wxl-'))
        if (isForward) {
          forwardCount++
          if (forwardCount === 2) {
            secondEntryName = basename(args[0])
            const result = await rename(...args)
            deps.signals.emit('SIGINT')
            return result
          }
          return rename(...args)
        }
        // a reverse rename (moving an entry back): fail for the 2nd entry specifically.
        if (secondEntryName && basename(args[1]) === secondEntryName) {
          const err = new Error('EPERM: operation not permitted (rollback)')
          err.code = 'EPERM'
          throw err
        }
        return rename(...args)
      }
      const { fs } = recordingFs({ rename: renameOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).toMatch(/^CW-E11/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain(JSON.stringify(secondEntryName))
      // the temporary directory is still present and named (stranded entries kept it).
      const tmpDirMatch = ioHelper.stderrText.match(/\.create-wxl-[^"\\]*/)
      expect(tmpDirMatch).not.toBeNull()
      const tmpDirPath = join(tmpRoot, tmpDirMatch[0])
      // the 2nd entry is stranded IN the target (its move-back failed); the temporary directory
      // holds everything else (the 1st entry, moved back, and any entries after the 2nd, never
      // moved out in the first place), but not the 2nd entry itself.
      await expect(readdir(tmpDirPath)).resolves.not.toContain(secondEntryName)
      expect(await readdir(target)).toEqual([secondEntryName])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('a signal already received wins over a failure found afterward', () => {
  it('SIGINT during step 4\'s checkTarget, which then rejects -> exit 130, no CW-E04', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')
      await writeFile(target, 'not a directory')
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const lstatOverride = async (...args) => {
        deps.signals.emit('SIGINT')
        return lstat(...args)
      }
      const { fs } = recordingFs({ lstat: lstatOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/CW-E04/)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT during step 6\'s download, which then resolves with a non-200 status -> exit 130, no CW-E07', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const deps = makeDeps({ cwd: tmpRoot })
      deps.fetchArchive = async (_repo, _commit, { signal }) => {
        deps.signals.emit('SIGINT')
        return { status: 404, body: Buffer.alloc(0) }
      }

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/CW-E07/)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('other signals', () => {
  it('C56(a): SIGTERM at step 9 -> exit 130, temporary directory removed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-9', 'SIGTERM')

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      await expect(readdir(join(tmpRoot, 'range'))).rejects.toThrow()
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C56(b): a second SIGINT during step 9 cleanup is ignored -> resolves 130, one cleanup only, no CW-E14', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-9', 'SIGINT')

      let rmCount = 0
      const rmOverride = async (...args) => {
        rmCount++
        deps.signals.emit('SIGINT') // a second signal, during the cleanup itself
        return rm(...args)
      }
      const { fs } = recordingFs({ rm: rmOverride })
      deps.fs = fs

      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(rmCount).toBe(1)
      expect(ioHelper.stderrText).not.toMatch(/CW-E14/)
      await expectOnlySentinel(tmpRoot)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('signals after step 10', () => {
  const ESC_SETUP_ARGV =
    process.platform === 'win32' ? null : ['r\u001bx', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages']

  it.skipIf(ESC_SETUP_ARGV === null)(
    '(decision 1) C56: SIGINT at step 11 with a directory containing ESC -> CW-W05 withholds the cd line, shows the escaped value',
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = fetchFixture()
        const runForkInit = vi.fn()
        const { runGit } = makeGitStub()
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive, runGit: vi.fn(runGit) })
        deps.engine = { ...deps.engine, runForkInit }
        deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-11')

        const ioHelper = makeIo()
        const exitCode = await run(ESC_SETUP_ARGV, ioHelper.io, deps)

        expect(exitCode).toBe(130)
        expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
        expectCwLinesStartWithCode(ioHelper.stderrText)
        const lines = ioHelper.stderrText.split('\n')
        expect(lines.some((line) => line.startsWith('cd '))).toBe(false)
        expect(ioHelper.stderrText).toContain('\\u001b')
        expect(ioHelper.stderrText).not.toContain('\u001b')
        expect(ioHelper.stderrText).toContain('pnpm install')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  it('C56: SIGINT at step 11 -> no engine, no git, CW-W05 with CW-E12 finishing commands, range kept, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchFixture()
      const runForkInit = vi.fn()
      const { runGit } = makeGitStub()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, runGit: vi.fn(runGit) })
      deps.engine = { ...deps.engine, runForkInit }
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-11')

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(runForkInit).not.toHaveBeenCalled()
      expect(deps.runGit).not.toHaveBeenCalled()
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)

      const target = join(tmpRoot, 'range')
      let from = ioHelper.stderrText.indexOf('CW-W05')
      for (const item of [
        'cd range',
        'pnpm install',
        'pnpm fork:init --author=Ada --repo=alice/r --host=github-pages',
        'git init',
        'git symbolic-ref HEAD refs/heads/main',
        'git add -A',
        `git commit -m "Create range from WXL ${PACKAGE_VERSION}"`,
      ]) {
        const idx = ioHelper.stderrText.indexOf(item, from)
        expect(idx).toBeGreaterThan(from)
        from = idx + item.length
      }
      expect(await readFile(join(target, 'range.json'), 'utf8')).toContain(FIXED_COMMIT)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C56: SIGHUP at step 12 -> no git, CW-W05 lists G1/G2/G4 without --force, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-12', 'SIGHUP')

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(deps.engine.runForkInit).toHaveBeenCalledTimes(1)
      expect(deps.runGit).not.toHaveBeenCalled()
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toContain('--force')

      let from = ioHelper.stderrText.indexOf('CW-W05')
      for (const item of [
        'git init',
        'git symbolic-ref HEAD refs/heads/main',
        'git add -A',
        `git commit -m "Create range from WXL ${PACKAGE_VERSION}"`,
      ]) {
        const idx = ioHelper.stderrText.indexOf(item, from)
        expect(idx).toBeGreaterThan(from)
        from = idx + item.length
      }
      expect(await readFile(join(tmpRoot, 'range', 'range.json'), 'utf8')).toContain(FIXED_COMMIT)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C56: SIGHUP during G2, G2 exits non-zero -> counts as the signal (CW-W05, not CW-W03), no G3/G4, exit 130', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const { runGit: baseRunGit, calls } = makeGitStub({
        add: () => {
          deps.signals.emit('SIGHUP')
          return { code: 1, stdout: '', stderr: 'x' }
        },
      })
      deps.runGit = vi.fn(baseRunGit)

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/CW-W03/)
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain(`git commit -m "Create range from WXL ${PACKAGE_VERSION}"`)
      const commandsRun = calls.map((c) => c.args)
      expect(commandsRun.some((args) => args.includes('commit'))).toBe(false)
      // (P-16) G3 (`config --get`) is not run either -- only G0 (version) and G1 (init,
      // symbolic-ref) ran before G2 stopped everything.
      expect(commandsRun.some((args) => args.includes('config'))).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C56: SIGINT at step 13 -> CW-W05 "nothing is left", no command lines printed, exit 130; all git commands already ran', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-13')

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      // Step 13 is reached only after step 11's own (unrelated) warning lines; what matters here
      // is that no "Next steps" (N1-N8) line follows the signal.
      expect(ioHelper.stdoutText).not.toContain('Next:')
      const lines = ioHelper.stderrText.split('\n')
      for (const line of lines.slice(1)) {
        expect(line.startsWith('git ')).toBe(false)
        expect(line.startsWith('pnpm ')).toBe(false)
      }
      expect(deps.runGit).toHaveBeenCalledTimes(7) // version, init, symbolic-ref, add, config x2, commit
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('C56: errors writing the messages at step 13 are ignored -> resolves 130, no rejection', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-13')

      const ioHelper = makeIo()
      const writeError = (chunk, encoding, callback) => {
        const cb = typeof encoding === 'function' ? encoding : callback
        cb(new Error('write failed'))
      }
      ioHelper.io.stdout._write = writeError
      ioHelper.io.stderr._write = writeError

      await expect(run(SETUP_ARGV, ioHelper.io, deps)).resolves.toBe(130)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('CW-W05 lists only git commands not run', () => {
  it("a signal right after G1 (init) succeeds -> CW-W05 doesn't list 'git init', only symbolic-ref/add/commit", async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.runGit = vi.fn(async (args) => {
        if (args[0] === '--version') return { code: 0, stdout: 'git version 2.54.0\n', stderr: '' }
        if (args.includes('init')) {
          deps.signals.emit('SIGINT')
          return { code: 0, stdout: '', stderr: '' }
        }
        return { code: 0, stdout: '', stderr: '' }
      })

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toContain('git init')
      expect(ioHelper.stderrText).toContain('git symbolic-ref HEAD refs/heads/main')
      expect(ioHelper.stderrText).toContain('git add -A')
      expect(ioHelper.stderrText).toContain(`git commit -m "Create range from WXL ${PACKAGE_VERSION}"`)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('a signal right after G4 (commit) succeeds -> CW-W05 lists nothing (the range is already complete)', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.runGit = vi.fn(async (args) => {
        if (args[0] === '--version') return { code: 0, stdout: 'git version 2.54.0\n', stderr: '' }
        if (args.includes('config') && args.includes('user.name')) return { code: 0, stdout: 'Ada\n', stderr: '' }
        if (args.includes('config') && args.includes('user.email')) return { code: 0, stdout: 'ada@example.com\n', stderr: '' }
        if (args.includes('commit')) {
          deps.signals.emit('SIGINT')
          return { code: 0, stdout: '', stderr: '' }
        }
        return { code: 0, stdout: '', stderr: '' }
      })

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).not.toContain('git commit')
      expect(ioHelper.stderrText).not.toContain('git init')
      expect(ioHelper.stderrText).not.toContain('git add')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('CW-E14 in steps 11-13 lists remaining commands like CW-W05 (decision 3)', () => {
  it('a bug at step 11 (runForkInit returns warnings: null) -> CW-E14 lists CW-E12 finishing commands, exit 1', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.engine = { ...deps.engine, runForkInit: () => ({ exitCode: 0, warnings: null }) }

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(deps.runGit).not.toHaveBeenCalled()
      let from = ioHelper.stderrText.indexOf('CW-E14')
      for (const item of ['cd range', 'pnpm install', 'pnpm fork:init', 'git init', 'git commit']) {
        const idx = ioHelper.stderrText.indexOf(item, from)
        expect(idx).toBeGreaterThan(from)
        from = idx + item.length
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('a bug at step 12 (git --version output throws on String()) -> CW-E14 lists the printed git forms, exit 1', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchEngineReadyFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.runGit = vi.fn(async (args) => {
        if (args[0] === '--version') {
          return {
            code: 0,
            stdout: {
              toString() {
                throw new Error('boom')
              },
            },
          }
        }
        return { code: 0, stdout: '' }
      })

      const ioHelper = makeIo()
      const exitCode = await run(SETUP_ARGV, ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      let from = ioHelper.stderrText.indexOf('CW-E14')
      for (const item of ['git init', 'git symbolic-ref HEAD refs/heads/main', 'git add -A', 'git commit']) {
        const idx = ioHelper.stderrText.indexOf(item, from)
        expect(idx).toBeGreaterThan(from)
        from = idx + item.length
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('SIGINT at a question', () => {
  it('C56: SIGINT exactly at the question checkpoint -> exit 130, nothing written, no EOF needed', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchFixture()
      const stdin = new PassThrough()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'question')

      const ioHelper = makeIo({ interactive: true, stdin })
      const exitCode = await run([], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(fetchArchive).not.toHaveBeenCalled()
      await expect(readdir(tmpRoot)).resolves.toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 5000)

  it('C56 (addition, decision 4): SIGINT while the question is already pending -> exit 130, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchFixture()
      const stdin = new PassThrough()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.checkpoint = vi.fn((name) => {
        if (name === 'question') setImmediate(() => deps.signals.emit('SIGINT'))
      })

      const ioHelper = makeIo({ interactive: true, stdin })
      const exitCode = await run([], ioHelper.io, deps)

      expect(exitCode).toBe(130)
      expect(fetchArchive).not.toHaveBeenCalled()
      await expect(readdir(tmpRoot)).resolves.toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 5000)
})

describe('the guard leaves no listener behind', () => {
  it("run() removes its stdout/stderr 'error' listener in finally, success or signal", async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const stdoutBefore = ioHelper.io.stdout.listenerCount('error')
      const stderrBefore = ioHelper.io.stderr.listenerCount('error')

      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.io.stdout.listenerCount('error')).toBe(stdoutBefore)
      expect(ioHelper.io.stderr.listenerCount('error')).toBe(stderrBefore)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })


  it('createSignalGuard.off() removes every listener it added to a real process object', () => {
    const before = {
      SIGINT: process.listenerCount('SIGINT'),
      SIGTERM: process.listenerCount('SIGTERM'),
      SIGHUP: process.listenerCount('SIGHUP'),
    }
    const guard = createSignalGuard(process, ['SIGINT', 'SIGTERM', 'SIGHUP'])
    expect(process.listenerCount('SIGINT')).toBe(before.SIGINT + 1)
    expect(process.listenerCount('SIGTERM')).toBe(before.SIGTERM + 1)
    expect(process.listenerCount('SIGHUP')).toBe(before.SIGHUP + 1)
    guard.off()
    expect(process.listenerCount('SIGINT')).toBe(before.SIGINT)
    expect(process.listenerCount('SIGTERM')).toBe(before.SIGTERM)
    expect(process.listenerCount('SIGHUP')).toBe(before.SIGHUP)
  })

  it('a full run() removes its listeners from a real process object, success or signal', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const before = process.listenerCount('SIGINT')
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, signals: process })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(0)
      expect(process.listenerCount('SIGINT')).toBe(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('a full run() removes its listeners from a real process object on a SIGNAL path too (step-9)', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const before = process.listenerCount('SIGINT')
      const fetchArchive = fetchFixture()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, signals: process })
      deps.checkpoint = makeSignalingCheckpoint(process, 'step-9')
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(130)
      expect(process.listenerCount('SIGINT')).toBe(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
