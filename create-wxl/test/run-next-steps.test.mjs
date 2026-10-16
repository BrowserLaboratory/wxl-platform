// Step 13: the "Next steps" lines for a successful setup run (traceability.md "Next steps", C40).

import { describe, it, expect } from 'vitest'
import { rm } from 'node:fs/promises'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { ENGINE_READY_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeGitStub } from './helpers/git-stub.mjs'
import { en } from '../src/messages.mjs'

describe('step 13: next steps, success', () => {
  it.each([
    [
      'github-pages',
      ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--lang', 'en'],
      () => [en.N1({ directory: 'd' }), en.N3({ owner: 'alice', name: 'r' }), en.N4({ owner: 'alice', name: 'r' }), en.N5(), en.N7()],
      () => [en.N2({ remainingCommands: [] }).split('\n')[0], en.N6(), en.N8()],
    ],
    [
      'cloudflare-pages',
      ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'cloudflare-pages', '--origin', 'https://r.pages.dev', '--lang', 'en'],
      () => [en.N1({ directory: 'd' }), en.N3({ owner: 'alice', name: 'r' }), en.N4({ owner: 'alice', name: 'r' }), en.N6(), en.N7()],
      () => [en.N2({ remainingCommands: [] }).split('\n')[0], en.N5(), en.N8()],
    ],
  ])('%s: prints the "Next steps" lines for that host, each the full rendered line, in order', async (_label, argv, buildPresentLines, buildAbsentLines) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const { runGit } = makeGitStub()
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, runGit })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toBe('')
      const text = ioHelper.stdoutText
      let searchFrom = 0
      for (const line of buildPresentLines()) {
        const idx = text.indexOf(line, searchFrom)
        expect(idx).toBeGreaterThanOrEqual(searchFrom)
        searchFrom = idx + line.length
      }
      for (const line of buildAbsentLines()) {
        expect(text).not.toContain(line)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
