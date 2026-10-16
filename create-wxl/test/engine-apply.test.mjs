// Step 11: applying the parsed setup answers with the real fork-init engine (T-0022).

import { describe, it, expect, vi } from 'vitest'
import { readFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import {
  ENGINE_READY_FIXTURE,
  ENGINE_READY_FIXTURE_NO_A9,
  ENGINE_READY_FIXTURE_NO_README,
  ENGINE_READY_DEPLOY_TEMPLATE_CONTENT,
} from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makePromptDriver } from './helpers/prompts.mjs'
import { attachEventLog } from './helpers/events.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

// T-0022 ticket Notes (7): short per-test timeouts, so a stalled question listener fails fast
// instead of waiting out a long default.
vi.setConfig({ testTimeout: 3000 })

// C32: A6/A7/A8 checked with the engine's own helpers, not a `JSON.stringify`-shaped substring
// match that would miss a value the engine wrote in some other valid JS string literal form, and
// that does not confirm there is exactly one candidate line.
function extractA6Value(configContent) {
  const lines = configContent.split('\n')
  const candidates = lines.map((line) => engineModule.A6_VALUE_RE.exec(line)).filter(Boolean)
  expect(candidates).toHaveLength(1)
  return engineModule.evalJsStringLiteral(candidates[0][1])
}

function extractA7Value(pageContent) {
  const lines = pageContent.split('\n')
  const candidateIdx = engineModule.findA7Candidates(lines)
  expect(candidateIdx).toHaveLength(1)
  const value = engineModule.parseA7ScalarValue(lines[candidateIdx[0]])
  expect(value).not.toBeNull()
  return value
}

function extractA8Value(shortLinkContent) {
  const lines = shortLinkContent.split('\n')
  const candidates = lines.map((line) => engineModule.A8_VALUE_RE.exec(line)).filter(Boolean)
  expect(candidates).toHaveLength(1)
  return engineModule.evalJsStringLiteral(candidates[0][1])
}

describe('step 11: apply', () => {
  it.each([
    [
      'github-pages',
      ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--site-name', 'S8 GH'],
      'https://alice.github.io/r',
    ],
    [
      'cloudflare-pages',
      [
        'd',
        '--author',
        'Ada',
        '--repo',
        'alice/r',
        '--host',
        'cloudflare-pages',
        '--origin',
        'https://r.pages.dev',
        '--site-name',
        'S8 CF',
      ],
      'https://r.pages.dev',
    ],
  ])('%s: runForkInit once with the parsed args and { projectRoot }; A1, A6-A8, workflow', async (_label, argv, siteOrigin) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const { io } = makeIo({ interactive: false })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      let rangeJsonExistedAtCall = false
      const target = resolve(tmpRoot, 'd')
      deps.engine.runForkInit.mockImplementation((args, opts) => {
        rangeJsonExistedAtCall = existsSync(join(target, 'range.json'))
        return engineModule.runForkInit(args, opts)
      })

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.runForkInit).toHaveBeenCalledTimes(1)
      const [args, opts] = deps.engine.runForkInit.mock.calls[0]
      expect(args).toBe(deps.engine.parseForkInitArgs.mock.results[0].value)
      expect(opts).toEqual({ projectRoot: target })
      expect(rangeJsonExistedAtCall).toBe(true)

      const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
      expect(pkg.author).toBe('Ada')
      expect(pkg.repository).toEqual({ type: 'git', url: 'git+https://github.com/alice/r.git' })
      expect(pkg.bugs.url).toBe('https://github.com/alice/r/issues')
      expect(pkg.homepage).toBe('https://github.com/alice/r#readme')
      expect(pkg.version).toBe('0.1.0')
      expect(pkg.license).toBe('ECL-2.0')

      const config = await readFile(join(target, '.vitepress/config.mts'), 'utf8')
      const siteName = argv[argv.indexOf('--site-name') + 1]
      expect(extractA6Value(config)).toBe(siteName)

      const home = await readFile(join(target, 'platform/index.md'), 'utf8')
      const homeZh = await readFile(join(target, 'platform/zh-TW/index.md'), 'utf8')
      expect(extractA7Value(home)).toBe(siteName)
      expect(extractA7Value(homeZh)).toBe(siteName)

      const shortLink = await readFile(join(target, '.vitepress/challenge/shortLink.ts'), 'utf8')
      expect(extractA8Value(shortLink)).toBe(siteOrigin)

      if (argv.includes('github-pages')) {
        expect(await readFile(join(target, '.github/workflows/deploy.yml'), 'utf8')).toBe(ENGINE_READY_DEPLOY_TEMPLATE_CONTENT)
      } else {
        await expect(readFile(join(target, '.github/workflows/deploy.yml'), 'utf8')).rejects.toThrow()
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 11: apply the last parse', () => {
  it('runForkInit receives exactly the last successful parseForkInitArgs object', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const { io } = makeIo({ interactive: true })
      // 1st pass: S1-S5, S6 n. 2nd pass: Enter x4, S5 'a<b' (engine rejects). 3rd pass (still
      // "second pass" semantics): Enter x4, S5 'S8', S6 y.
      const answers = ['Ada', 'alice/r', '1', '', 'First', 'n', '', '', '', '', 'a<b', '', '', '', '', 'S8', 'y']
      const checkpoint = makePromptDriver(io.stdin, answers)
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive, checkpoint })

      const exitCode = await run(['d'], io, deps)

      expect(exitCode).toBe(0)
      expect(deps.engine.parseForkInitArgs).toHaveBeenCalledTimes(3)
      // C68: the 2nd call is the one `a<b` actually gets rejected by, not just a count that
      // would also pass if, say, the 2nd call quietly succeeded and the 3rd call's answers were
      // the ones rejected instead.
      expect(deps.engine.parseForkInitArgs.mock.results[1].type).toBe('throw')
      expect(deps.engine.parseForkInitArgs.mock.results[1].value).toBeInstanceOf(deps.engine.ForkInitArgError)
      expect(deps.engine.runForkInit).toHaveBeenCalledTimes(1)
      const lastResult = deps.engine.parseForkInitArgs.mock.results[2].value
      const firstResult = deps.engine.parseForkInitArgs.mock.results[0].value
      const [args] = deps.engine.runForkInit.mock.calls[0]
      expect(args).toBe(lastResult)
      expect(args).not.toBe(firstResult)
      expect(args.siteName).toBe('S8')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 11: CW-E12', () => {
  it('(a) runForkInit returns exitCode 1 (fixture missing A9) -> CW-E12, range stays, no git step', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE_NO_A9, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const argv = ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--site-name', 'S8 GH']

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E12/m)
      expect(deps.engine.runForkInit).toHaveBeenCalledTimes(1)
      // C33(a): this is the `exitCode` 1 path, not `runForkInit` throwing (that is test (b)); pin
      // which one actually happened instead of only asserting on the message CW-E12 carries,
      // which the two paths could otherwise both satisfy identically.
      expect(deps.engine.runForkInit.mock.results[0].type).toBe('return')
      const result = deps.engine.runForkInit.mock.results[0].value
      expect(result.exitCode).toBe(1)
      const engineMessage = result.message
      expect(ioHelper.stderrText).toContain(jsonValue(engineMessage))
      // The finishing commands in order (traceability.md CW-E12 row).
      const finishingCommands = [
        'cd d',
        'pnpm install',
        "pnpm fork:init --author=Ada --repo=alice/r --host=github-pages '--site-name=S8 GH'",
        'git init',
        'git symbolic-ref HEAD refs/heads/main',
        'git add -A',
        `git commit -m "Create range from WXL ${deps.source.version}"`,
      ]
      let searchFrom = 0
      for (const command of finishingCommands) {
        const idx = ioHelper.stderrText.indexOf(command, searchFrom)
        expect(idx).toBeGreaterThanOrEqual(0)
        searchFrom = idx + command.length
      }

      const target = join(tmpRoot, 'd')
      const rangeJsonBytes = await readFile(join(target, 'range.json'))
      const expectedRangeJson =
        JSON.stringify(
          { upstream: { repository: deps.source.repository, version: deps.source.version, commit: FIXED_COMMIT } },
          null,
          2,
        ) + '\n'
      // C33(a): byte-equal to the schema (traceability.md "Pristine processing" P4), not just the
      // one field a `JSON.parse` comparison would check.
      expect(rangeJsonBytes.equals(Buffer.from(expectedRangeJson))).toBe(true)
      const names = await readdir(tmpRoot)
      expect(names.filter((n) => n.startsWith('.create-wxl-'))).toEqual([])
      expect(deps.runGit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) runForkInit throws -> CW-E12 with the thrown message', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      deps.engine.runForkInit.mockImplementation(() => {
        throw new Error('boom')
      })
      const argv = ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--site-name', 'S8 GH']

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E12/m)
      // C33(b): this is the throwing path, distinct from test (a)'s `exitCode` 1 path.
      expect(deps.engine.runForkInit.mock.results[0].type).toBe('throw')
      expect(ioHelper.stderrText).toContain(jsonValue('boom'))
      const finishingCommands = [
        'cd d',
        'pnpm install',
        "pnpm fork:init --author=Ada --repo=alice/r --host=github-pages '--site-name=S8 GH'",
        'git init',
        'git symbolic-ref HEAD refs/heads/main',
        'git add -A',
        `git commit -m "Create range from WXL ${deps.source.version}"`,
      ]
      let searchFrom = 0
      for (const command of finishingCommands) {
        const idx = ioHelper.stderrText.indexOf(command, searchFrom)
        expect(idx).toBeGreaterThanOrEqual(0)
        searchFrom = idx + command.length
      }
      expect(deps.runGit).not.toHaveBeenCalled()

      const target = join(tmpRoot, 'd')
      const rangeJson = JSON.parse(await readFile(join(target, 'range.json'), 'utf8'))
      expect(rangeJson.upstream.repository).toBe(engineModule.UPSTREAM_SLUG)
      const names = await readdir(tmpRoot)
      expect(names.filter((n) => n.startsWith('.create-wxl-'))).toEqual([])
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 11: warnings', () => {
  it('engine warnings are printed as JSON string literals, after runForkInit returns', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(ENGINE_READY_FIXTURE_NO_README, { commit: FIXED_COMMIT })
      const ioHelper = makeIo({ interactive: false })
      const { io } = ioHelper
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const argv = ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages']
      const events = attachEventLog(io, deps)

      const exitCode = await run(argv, io, deps)

      expect(exitCode).toBe(0)
      const result = deps.engine.runForkInit.mock.results[0].value
      expect(result.warnings.length).toBeGreaterThan(0)
      const runForkInitEndIdx = events.indexOfNth('runForkInit-end', 1)
      expect(runForkInitEndIdx).toBeGreaterThanOrEqual(0)
      for (const warning of result.warnings) {
        const literal = jsonValue(warning)
        const lineIdx = events.log.findIndex((e) => e.type === 'stdout' && e.text.includes(literal))
        expect(lineIdx).toBeGreaterThan(runForkInitEndIdx)
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
