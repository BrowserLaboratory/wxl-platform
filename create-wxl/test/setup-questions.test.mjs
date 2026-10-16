// Setup questions (traceability.md "Setup questions"), steps 3-5 (T-0022). Step 11 (apply) lives
// in engine-apply.test.mjs.

import { describe, it, expect, vi } from 'vitest'
import { readdir, rm, mkdir, writeFile, stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE, ENGINE_READY_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makePromptDriver } from './helpers/prompts.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { attachEventLog } from './helpers/events.mjs'
import { jsonValue } from '../src/text.mjs'
import { en } from '../src/messages.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

// T-0022 ticket Notes (7): short per-test timeouts, so a stalled question listener fails fast
// instead of waiting out a long default.
vi.setConfig({ testTimeout: 3000 })

/** The number of times `needle` (a whole prompt/reason line) occurs in `haystack`: a re-asked
 * question's own prompt line occurs once per ask, so counting it pins "asked N times" more
 * precisely than a plain `toContain`. */
function countLines(haystack, needle) {
  return needle === '' ? 0 : haystack.split(needle).length - 1
}

describe('step 3: directory question', () => {
  it.each([
    ['Enter takes the default', '', 'wxl-range'],
    ['a named answer', 'my-dir', 'my-dir'],
  ])('%s', async (_label, answer, expectedDir) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, [answer])
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(1)
      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // C04: fetchArchive starts only after the directory answer.
      expect(events.countBeforeEachQuestion('fetchArchive-start')).toEqual([0])

      const names = await readdir(tmpRoot)
      expect(names).toEqual([expectedDir])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 3: directory question, ~ rejected', () => {
  it('rejects an answer starting with ~ and asks again', async () => {
    const tmpRoot = await makeTmpRoot()
    const homeRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, ['~/x', 'd'])
      const deps = makeDeps({ cwd: tmpRoot, env: { HOME: homeRoot }, fetchArchive, checkpoint })

      const exitCode = await run(['--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(2)
      // C52: the reason is printed before the directory question is asked again.
      const tildeIdx = ioHelper.stdoutText.indexOf(en['Q-DIRECTORY-TILDE']())
      expect(tildeIdx).toBeGreaterThanOrEqual(0)
      const secondPromptIdx = ioHelper.stdoutText.indexOf(en['Q-DIRECTORY'](), tildeIdx + en['Q-DIRECTORY-TILDE']().length)
      expect(secondPromptIdx).toBeGreaterThan(tildeIdx)

      const names = await readdir(tmpRoot)
      expect(names).toEqual(['d'])
      const homeNames = await readdir(homeRoot)
      expect(homeNames).toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
      await rm(homeRoot, { recursive: true, force: true })
    }
  })
})

describe('step 4: interactive re-ask', () => {
  it('(a) re-asks the directory question on CW-E04, then proceeds', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await mkdir(join(tmpRoot, 'full'))
      await writeFile(join(tmpRoot, 'full', 'keep.txt'), 'kept')
      const before = await stat(join(tmpRoot, 'full', 'keep.txt'))
      const beforeContent = await readFile(join(tmpRoot, 'full', 'keep.txt'))

      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, ['full', 'fresh'])
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toContain('CW-E04')
      expect(ioHelper.stderrText).toContain(jsonValue(join(tmpRoot, 'full')))
      expect(ioHelper.stderrText).toContain('not an empty directory')
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(2)
      const names = await readdir(tmpRoot)
      expect(names.sort()).toEqual(['fresh', 'full'].sort())
      // C64(a): `fresh` IS the range (has its own `range.json`), not just an unrelated directory.
      await stat(join(tmpRoot, 'fresh', 'range.json'))

      const after = await stat(join(tmpRoot, 'full', 'keep.txt'))
      expect(after.size).toBe(before.size)
      expect(after.mtimeMs).toBe(before.mtimeMs)
      const afterContent = await readFile(join(tmpRoot, 'full', 'keep.txt'))
      expect(afterContent.equals(beforeContent)).toBe(true)

      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // C64(a): fetchArchive starts only after the second (accepted) answer.
      expect(events.countBeforeEachQuestion('fetchArchive-start')).toEqual([0, 0])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(c) ~ after a rejection asks again without re-printing the stale CW-E04', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await mkdir(join(tmpRoot, 'full'))
      await writeFile(join(tmpRoot, 'full', 'keep.txt'), 'kept')

      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, ['full', '~/x', 'fresh'])
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      const cwE04Count = ioHelper.stderrText.split('CW-E04').length - 1
      expect(cwE04Count).toBe(1)
      expect(ioHelper.stdoutText).toContain(en['Q-DIRECTORY-TILDE']())
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(3)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) positional + interactive is still CW-E04, exit 1, no question', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      await mkdir(join(tmpRoot, 'full'))
      await writeFile(join(tmpRoot, 'full', 'keep.txt'), 'kept')
      const before = await snapshotTree(tmpRoot)

      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, [])
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['full', '--no-setup'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E04/m)
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(0)
      expect(fetchArchive).not.toHaveBeenCalled()
      // C64(b): nothing written -- the pre-existing `full/keep.txt` is untouched, and the run
      // created no other entry.
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 3: directory question, non-interactive', () => {
  it.each([
    ['--no-setup', ['--no-setup']],
    ['every setup flag given', ['--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages']],
    ['no flags at all', []],
  ])('%s -> CW-E03, nothing written', async (_label, extraArgv) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run([...extraArgv], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E03/m)
      expect(ioHelper.stderrText).toContain('create-wxl <directory>')
      expect(ioHelper.stderrText).not.toContain('CW-E05')

      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)

      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.parseForkInitArgs).not.toHaveBeenCalled()
      expect(deps.checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(0)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('non-interactive: flags', () => {
  it.each([
    [
      'all flags, values with spaces, out of order',
      ['d', '--site-name', ' S8 ', '--host', 'cloudflare-pages', '--origin', 'https://r.pages.dev', '--repo', 'alice/r', '--author', ' Ada '],
      ['--author= Ada ', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev', '--site-name= S8 '],
    ],
    [
      'only the required flags',
      ['d', '--author=Ada', '--repo=alice/r', '--host=github-pages'],
      ['--author=Ada', '--repo=alice/r', '--host=github-pages'],
    ],
  ])('%s -> no question, parseForkInitArgs gets exactly that argv', async (_label, argv, expectedArgv) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const { io } = makeIo({ interactive: false })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(deps.checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(1)
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual(expectedArgv)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('non-interactive: CW-E06', () => {
  it.each([
    ['bad repo', ['d', '--author', 'Ada', '--repo', 'bad', '--host', 'github-pages']],
    [
      'cloudflare-pages with an http origin',
      ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'cloudflare-pages', '--origin', 'http://r.pages.dev'],
    ],
  ])('%s -> CW-E06 with the engine message, nothing written', async (_label, argv) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E06/m)
      // Pin the engine message that CW-E06 must carry, not just the code.
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(1)
      const result = deps.engine.parseForkInitArgs.mock.results[0]
      expect(result.type).toBe('throw')
      expect(result.value).toBeInstanceOf(deps.engine.ForkInitArgError)
      expect(ioHelper.stderrText).toContain(jsonValue(result.value.message))
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
      expect(deps.checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(0)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('non-interactive: CW-E05', () => {
  it.each([
    ['d', ['d'], ['author', 'repo', 'host']],
    ['d --repo alice/r --host github-pages', ['d', '--repo', 'alice/r', '--host', 'github-pages'], ['author']],
    ['d --author Ada --host github-pages', ['d', '--author', 'Ada', '--host', 'github-pages'], ['repo']],
    ['d --author Ada --repo alice/r', ['d', '--author', 'Ada', '--repo', 'alice/r'], ['host']],
    [
      'd --author Ada --repo alice/r --host cloudflare-pages',
      ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'cloudflare-pages'],
      ['origin'],
    ],
  ])('missing %s -> CW-E05 naming %s', async (_label, argv, missing) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E05/m)
      // The full message text, not just a substring per missing flag -- so a flag that was
      // actually given cannot also show up in the "missing" list (every given flag already
      // contains its own `--`, so a per-name `toContain` can't tell a false positive from a true
      // one).
      expect(ioHelper.stderrText).toContain(en['CW-E05']({ missing }))
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(deps.engine.parseForkInitArgs).not.toHaveBeenCalled()
      expect(fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('every host flag given but github-pages -> no CW-E05, no --origin, exit 0', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      const exitCode = await run(['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).not.toContain('CW-E05')
      // `.not.toContain('--origin')` on an array compares each element for equality, not
      // substring -- it would still pass even if argv held `'--origin=x'`. Assert the full argv.
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual([
        '--author=Ada',
        '--repo=alice/r',
        '--host=github-pages',
      ])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('CLOUDFLARE-PAGES (uppercase) flag -> no CW-E05, verbatim to the engine, CW-E06 on rejection', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      const exitCode = await run(['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'CLOUDFLARE-PAGES'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).not.toContain('CW-E05')
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual(['--author=Ada', '--repo=alice/r', '--host=CLOUDFLARE-PAGES'])
      expect(ioHelper.stderrText).toMatch(/^CW-E06/m)
      expect(ioHelper.stderrText).toContain(
        jsonValue('--host must be "github-pages" or "cloudflare-pages", got: "CLOUDFLARE-PAGES"'),
      )
      expect(fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: first pass', () => {
  it.each([
    [
      'cloudflare-pages',
      ['  Ada Lovelace  ', ' alice/r ', ' 2 ', ' https://r.pages.dev ', '', 'y'],
      ['--author=Ada Lovelace', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev'],
    ],
    [
      'github-pages, default host, site name',
      ['Ada', 'alice/r', '', '', ' S8 ', 'y'],
      ['--author=Ada', '--repo=alice/r', '--host=github-pages', '--site-name=S8'],
    ],
  ])('%s -> S1-S5 in order, Enter defaults, mapped host', async (_label, answers, expectedArgv) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      const order = [en.S1(), en.S2(), en.S3(), en.S4(), en.S5(), en.S6()]
      let searchFrom = 0
      for (const line of order) {
        const idx = ioHelper.stdoutText.indexOf(line, searchFrom)
        expect(idx).toBeGreaterThanOrEqual(0)
        searchFrom = idx + line.length
      }
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(6)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(1)
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual(expectedArgv)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: invalid answers', () => {
  it('reprompts on invalid S1/S3/S4/S6, accepting CLOUDFLARE-PAGES and " Y "', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['', 'Ada', 'alice/r', '3', 'CLOUDFLARE-PAGES', '', 'https://r.pages.dev', '', 'maybe', ' Y ']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      // C52: S1/S3/S4/S6 asked twice each (with their reason printed first), S2/S5 once each.
      expect(countLines(ioHelper.stdoutText, en.S1())).toBe(2)
      expect(countLines(ioHelper.stdoutText, en.S2())).toBe(1)
      expect(countLines(ioHelper.stdoutText, en.S3())).toBe(2)
      expect(countLines(ioHelper.stdoutText, en.S4())).toBe(2)
      expect(countLines(ioHelper.stdoutText, en.S5())).toBe(1)
      expect(countLines(ioHelper.stdoutText, en.S6())).toBe(2)
      expect(ioHelper.stdoutText).toContain(en['S1-EMPTY']())
      expect(ioHelper.stdoutText).toContain(en['S3-INVALID']({ value: '3' }))
      expect(ioHelper.stdoutText).toContain(en['S4-REQUIRED']())
      expect(ioHelper.stdoutText).toContain(en['S6-INVALID']())
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(1)
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual([
        '--author=Ada',
        '--repo=alice/r',
        '--host=cloudflare-pages',
        '--origin=https://r.pages.dev',
      ])
      // " Y " is only accepted on S6's second ask; fetchArchive must start after both S6 prompts.
      const fetchArchiveIdx = events.indexOfNth('fetchArchive-start', 1)
      expect(fetchArchiveIdx).toBeGreaterThanOrEqual(0)
      const s6Before = events.log
        .slice(0, fetchArchiveIdx)
        .filter((e) => e.type === 'stdout' && e.text.includes(en.S6())).length
      expect(s6Before).toBe(2)
      expect(fetchArchive).toHaveBeenCalledTimes(1)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: second pass', () => {
  it('(repo bad, typed) engine rejects, second pass re-asks all with current answers, no download before summary', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['Ada', 'bad', '1', '', 'S8', '', 'alice/r', '', '', '', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toEqual([
        '--author=Ada',
        '--repo=alice/r',
        '--host=github-pages',
        '--site-name=S8',
      ])
      expect(ioHelper.stdoutText).toContain(
        jsonValue('--repo must be in owner/repo form, got: "bad"'),
      )
      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // C11: no download before the summary is accepted -- `fetchArchive` is 0 at every
      // `question` checkpoint.
      expect(events.countBeforeEachQuestion('fetchArchive-start').every((count) => count === 0)).toBe(true)
      // The engine's rejection skips the summary entirely (S1-S5 are asked twice, in pass 1 and
      // pass 2, before the single S6 this run ever shows), and the download starts only after it.
      const firstS6Idx = events.log.findIndex((e) => e.type === 'stdout' && e.text.includes(en.S6()))
      expect(firstS6Idx).toBeGreaterThanOrEqual(0)
      const beforeFirstS6 = events.log.slice(0, firstS6Idx)
      for (const line of [en.S1(), en.S2(), en.S3(), en.S4(), en.S5()]) {
        expect(beforeFirstS6.filter((e) => e.type === 'stdout' && e.text.includes(line))).toHaveLength(2)
      }
      const fetchArchiveIdx = events.indexOfNth('fetchArchive-start', 1)
      expect(fetchArchiveIdx).toBeGreaterThan(firstS6Idx)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(--repo bad, flag) first pass asks only unflagged questions; second pass asks all', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['', '', '', 'alice/r', '', '', '', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['d', '--author', 'Ada', '--repo', 'bad', '--host', 'github-pages'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toEqual(['--author=Ada', '--repo=alice/r', '--host=github-pages'])
      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // C11: first pass asks only S4 (origin) and S5 (site name), not S1-S3 (all flagged).
      expect(countLines(ioHelper.stdoutText, en.S1())).toBe(1)
      expect(countLines(ioHelper.stdoutText, en.S2())).toBe(1)
      expect(countLines(ioHelper.stdoutText, en.S3())).toBe(1)
      const firstQuestionIdx = events.indexOfAfter(0, (e) => e.type === 'checkpoint' && e.name === 'question')
      expect(firstQuestionIdx).toBeGreaterThanOrEqual(0)
      const beforeFirstAnswer = events.log.slice(0, firstQuestionIdx + 1)
      expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(en.S1()))).toBe(false)
      expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(en.S2()))).toBe(false)
      expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(en.S3()))).toBe(false)
      // The very first question asked is S4, directly pinning "first pass asks only S4, S5".
      expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(en.S4()))).toBe(true)
      const firstS4Idx = events.log.findIndex((e) => e.type === 'stdout' && e.text.includes(en.S4()))
      const firstS5Idx = events.log.findIndex((e) => e.type === 'stdout' && e.text.includes(en.S5()))
      const firstS1Idx = events.log.findIndex((e) => e.type === 'stdout' && e.text.includes(en.S1()))
      expect(firstS4Idx).toBeGreaterThanOrEqual(0)
      expect(firstS5Idx).toBeGreaterThan(firstS4Idx)
      expect(firstS1Idx).toBeGreaterThan(firstS5Idx)
      expect(
        events.countBeforeEachQuestion('fetchArchive-start').every((count) => count === 0),
      ).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: summary n', () => {
  it('(no flags) summary n -> every question again with current answers as defaults', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['Ada', 'alice/r', '2', 'https://r.pages.dev', 'S8', 'n', '', '', '', '', '', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      const expectedArgv = ['--author=Ada', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev', '--site-name=S8']
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual(expectedArgv)
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toEqual(expectedArgv)
      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // C13: fetchArchive starts only after the 2nd summary is accepted.
      expect(events.countBeforeEachQuestion('fetchArchive-start').every((count) => count === 0)).toBe(true)
      const fetchArchiveIdx = events.indexOfNth('fetchArchive-start', 1)
      const s6Before = events.log.slice(0, fetchArchiveIdx).filter((e) => e.type === 'stdout' && e.text.includes(en.S6())).length
      expect(s6Before).toBe(2)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(every flag given) no question in the first pass; summary first, n -> ask all', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['n', '', '', '', '', '', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const events = attachEventLog(io, deps)

      const exitCode = await run(
        ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'cloudflare-pages', '--origin', 'https://r.pages.dev', '--site-name', 'S8'],
        io,
        deps,
      )

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      const expectedArgv = ['--author=Ada', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev', '--site-name=S8']
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual(expectedArgv)
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toEqual(expectedArgv)
      expect(fetchArchive).toHaveBeenCalledTimes(1)
      // Fixed list "Interactive with every flag given": the first pass asks only S6.
      const firstQuestionIdx = events.indexOfAfter(0, (e) => e.type === 'checkpoint' && e.name === 'question')
      const beforeFirstAnswer = events.log.slice(0, firstQuestionIdx + 1)
      for (const line of [en.S1(), en.S2(), en.S3(), en.S4(), en.S5()]) {
        expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(line))).toBe(false)
      }
      expect(beforeFirstAnswer.some((e) => e.type === 'stdout' && e.text.includes(en.S6()))).toBe(true)
      expect(events.countBeforeEachQuestion('fetchArchive-start').every((count) => count === 0)).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: EOF', () => {
  it('(a) EOF at the directory question -> CW-E15, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, [], { eofAt: 1 })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(['--no-setup'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E15/m)
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) EOF at S1 -> CW-E15, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const checkpoint = makePromptDriver(io.stdin, [], { eofAt: 1 })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E15/m)
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(c) EOF at the second pass S3 (after summary n) -> CW-E15, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      // S1-S5 (5), S6 n (1), second pass S1 S2 (2 Enters) then EOF at S3 (question #9).
      const answers = ['Ada', 'alice/r', '1', '', 'S8', 'n', '', '']
      const checkpoint = makePromptDriver(io.stdin, answers, { eofAt: 9 })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E15/m)
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(d) EOF at S6 -> CW-E15, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['Ada', 'alice/r', '1', '', 'S8']
      const checkpoint = makePromptDriver(io.stdin, answers, { eofAt: 6 })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })
      const before = await snapshotTree(tmpRoot)

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E15/m)
      const after = await snapshotTree(tmpRoot)
      expect(after).toEqual(before)
      expect(fetchArchive).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: summary origin', () => {
  it.each([
    ['github-pages user site', 'alice/alice.github.io', '1', '', 'https://alice.github.io', 'https://alice.github.io/alice.github.io'],
    ['github-pages project site, mixed case owner', 'Alice/r', '1', '', 'https://alice.github.io/r', undefined],
    ['github-pages with an explicit origin, hostname lowercased', 'alice/r', '1', 'https://Example.COM', 'https://example.com', undefined],
  ])('%s', async (_label, repoAnswer, hostAnswer, originAnswer, expectedOriginLine, forbidden) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['Ada', repoAnswer, hostAnswer, originAnswer, '', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toContain(en['S6-ORIGIN']({ origin: expectedOriginLine }))
      // C63: the forbidden string must not appear anywhere in the output, not only not-wrapped
      // in the S6-ORIGIN line's own formatting.
      if (forbidden !== undefined) {
        expect(ioHelper.stdoutText).not.toContain(forbidden)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('makeQuestioner: line buffering', () => {
  it('lines arriving in one chunk before the next question is asked are all used', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      // All three answers (S1, S2, S6) arrive in a single stdin chunk before S1's own question is
      // even asked: readline (non-terminal mode) emits all three complete lines synchronously
      // from that one chunk. `ask()`'s `line` listener is only alive for the question it was
      // called for, so without buffering, S2's and S6's lines are dropped and S2's `ask()`
      // never resolves.
      io.stdin.write('Ada\nalice/r\ny\n')
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })

      const exitCode = await run(
        ['d', '--host', 'cloudflare-pages', '--origin', 'https://r.pages.dev', '--site-name', 'S8'],
        io,
        deps,
      )

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(1)
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toContain('--author=Ada')
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toContain('--repo=alice/r')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 2000)
})

describe('interactive: second pass, decision D', () => {
  it('decision D: Cloudflare Pages, S4 answered - asks again (reason shown), then proceeds with the next answer', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = [
        'Ada',
        'alice/r',
        '2',
        'https://a.pages.dev',
        'S8',
        'n',
        '',
        '',
        '',
        '-',
        'https://b.pages.dev',
        '',
        'y',
      ]
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toContain(en['S4-REQUIRED']())
      expect(checkpoint.mock.calls.filter((c) => c[0] === 'question')).toHaveLength(answers.length)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toContain('--origin=https://b.pages.dev')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('interactive: second pass, clear with -', () => {
  it('S4/S5 answered - clear the current answer', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: true })
      const { io } = ioHelper
      const answers = ['Ada', 'alice/r', '2', 'https://a.pages.dev', 'S8', 'n', '', '', '1', '-', '-', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(2)
      expect(deps.engine.parseForkInitArgs.mock.calls[0][0]).toEqual([
        '--author=Ada',
        '--repo=alice/r',
        '--host=cloudflare-pages',
        '--origin=https://a.pages.dev',
        '--site-name=S8',
      ])
      expect(deps.engine.parseForkInitArgs.mock.calls[1][0]).toEqual(['--author=Ada', '--repo=alice/r', '--host=github-pages'])
      // The summaries are the two segments split on the shared `  author: "Ada"` line each one
      // starts with; the second must not carry the first summary's derived origin.
      const marker = en['S6-AUTHOR']({ value: 'Ada' })
      const segments = ioHelper.stdoutText.split(marker)
      expect(segments).toHaveLength(3) // text-before-first, first summary, second summary
      const [, firstSummary, secondSummary] = segments
      expect(firstSummary).toContain(en['S6-ORIGIN']({ origin: 'https://a.pages.dev' }))
      expect(secondSummary).toContain(en['S6-ORIGIN']({ origin: 'https://alice.github.io/r' }))
      // C66: the cleared origin must not survive anywhere in the second summary, not only not
      // wrapped in the S6-ORIGIN line's own formatting.
      expect(secondSummary).not.toContain('https://a.pages.dev')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('deps shape', () => {
  it('deps.engine.ForkInitArgError is the real class engine code throws', () => {
    const deps = makeDeps({ cwd: '/tmp' })
    expect(deps.engine.ForkInitArgError).toBe(engineModule.ForkInitArgError)
  })
})
