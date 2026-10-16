// T-0024/C69: a full interactive run touches nothing outside the target or the run's own
// temporary directory (traceability.md "Writes and cleanup").

import { describe, it, expect } from 'vitest'
import { rm, lstat, mkdtemp as realMkdtemp } from 'node:fs/promises'
import { resolve as resolvePath, join, sep } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { GIT_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makePromptDriver } from './helpers/prompts.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { makeGitStub } from './helpers/git-stub.mjs'
import { placeSentinel, expectOnlySentinel } from './helpers/sentinel.mjs'

describe('C69: write scope', () => {
  it('a full interactive run writes, renames and removes only under the target or the temporary directory', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await placeSentinel(tmpRoot)
      const target = join(tmpRoot, 'range')

      const fetchArchive = makeFetchArchive(GIT_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['range', 'Ada', 'alice/r', '', '', 'S8', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const { runGit } = makeGitStub()
      // (S-09/P-10) `recordingFs` only logs a call's own arguments, not `mkdtemp`'s return value;
      // wrapping it here is the only way to learn the temporary directory's own generated name,
      // needed below to tell it apart from a sibling path that merely starts with the same prefix
      // (the sentinel directory, or a `range-other` next to the target).
      let tmpDir = null
      const mkdtempOverride = async (...args) => {
        tmpDir = await realMkdtemp(...args)
        return tmpDir
      }
      const { fs, calls } = recordingFs({ mkdtemp: mkdtempOverride })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint, fs, runGit })

      const exitCode = await run([], io, deps)

      expect(exitCode).toBe(0)

      const mkdtempCalls = calls.filter((c) => c.method === 'mkdtemp')
      expect(mkdtempCalls.length).toBe(1)
      expect(mkdtempCalls[0].args[0]).toBe(join(tmpRoot, '.create-wxl-'))
      expect(tmpDir).not.toBeNull()

      // Allowed: exactly `target`/`tmpDir`, or a path properly UNDER one of them (the directory
      // separator is required, so `<target>-other` or the sentinel directory are never mistaken
      // for being "under" `target` just because the string happens to start with it).
      const isUnderOrEqual = (p, dir) => p === dir || p.startsWith(dir + sep)
      // `rename` takes two path arguments; every other recorded write-type method takes exactly
      // one (its first argument) -- never its content/options arguments, which happen to be
      // strings too for `writeFile`.
      const pathArgCount = (method) => (method === 'rename' ? 2 : 1)
      for (const call of calls) {
        // `mkdtemp`'s own argument is the PREFIX passed to it (`<parent>/.create-wxl-`), a path
        // that does not exist yet and is never "under" the directory it is about to create;
        // already checked above against the exact expected prefix.
        if (call.method === 'mkdtemp') continue
        const paths = call.args.slice(0, pathArgCount(call.method)).map((a) => resolvePath(a))
        for (const p of paths) {
          const ok = isUnderOrEqual(p, target) || isUnderOrEqual(p, tmpDir)
          expect(ok, `${call.method} touched ${p}, outside target/tmp`).toBe(true)
        }
      }

      // The sentinel's own listing (including inside its directory) is unchanged by any of this.
      await expectOnlySentinel(tmpRoot, { extraNames: ['range'] })
      await lstat(join(target, 'range.json'))
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
