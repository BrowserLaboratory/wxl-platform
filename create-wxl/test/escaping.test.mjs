// T-0024: outside values printed as JSON string literals, with every C0 other than the printed
// LF, DEL and C1 escaped to `\uXXXX` (traceability.md "Error and warning codes", D10), and
// copyable commands withheld when a value to place in one holds a control character.

import { describe, it, expect } from 'vitest'
import { rm } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { jsonValue } from '../src/text.mjs'
import { makeFetchArchive, buildArchiveRaw } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE, CHANGELOG_CONTENT, OPEN_QUESTIONS_CONTENT, PACKAGE_JSON_CONTENT } from './helpers/fixtures.mjs'
import * as engineModule from '../../scripts/fork-init.ts'
import { expectCwLinesStartWithCode } from './helpers/expect-cw-lines.mjs'
import { makeSignalingCheckpoint } from './helpers/checkpoint-signal.mjs'

function hasRawControlExceptLF(text) {
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code === 0x0a) continue
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) return true
  }
  return false
}

describe('JSON string literals', () => {
  it('(a) an archive entry path containing ESC -> CW-E08 contains the literal \\u001b, not the raw ESC, and no raw C0/DEL/C1 (except LF) anywhere in stdout+stderr', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const repoName = engineModule.UPSTREAM_SLUG.split('/')[1]
      const prefix = `${repoName}-${FIXED_COMMIT}`
      const entries = [
        { path: `${prefix}/`, type: 'dir', mode: 0o755 },
        { path: `${prefix}/CHANGELOG.md`, type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
        { path: `${prefix}/.proj.specs/`, type: 'dir', mode: 0o755 },
        { path: `${prefix}/.proj.specs/OPEN-QUESTIONS.md`, type: 'file', mode: 0o644, content: OPEN_QUESTIONS_CONTENT },
        { path: `${prefix}/package.json`, type: 'file', mode: 0o644, content: PACKAGE_JSON_CONTENT },
        { path: `${prefix}/a\u001bb`, type: 'file', mode: 0o644, content: 'x' },
      ]
      const body = gzipSync(buildArchiveRaw(entries, { comment: FIXED_COMMIT }))
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive: async () => ({ status: 200, body }) })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E08/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain('\\u001b')
      expect(ioHelper.stderrText).not.toContain('\u001b')
      expect(hasRawControlExceptLF(ioHelper.stdoutText + ioHelper.stderrText)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) an unknown argument holding a newline -> CW-E02 contains "--a\\nb" (D10: a value\'s own newline is the JSON short escape), not a raw newline', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const deps = makeDeps({ cwd: tmpRoot })
      const ioHelper = makeIo()
      const exitCode = await run(['--a\nb', 'dir'], ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain('"--a\\nb"')
      expect(hasRawControlExceptLF(ioHelper.stdoutText + ioHelper.stderrText.replace('"--a\\nb"', ''))).toBe(false)
      expect(ioHelper.stderrText + ioHelper.stdoutText).not.toContain('--a\nb')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) an unknown argument holding a C1 character -> CW-E02 contains \\u009b, not the raw character, and no raw C0/DEL/C1 (except LF) anywhere', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const deps = makeDeps({ cwd: tmpRoot })
      const ioHelper = makeIo()
      const exitCode = await run(['--a\u009bb', 'dir'], ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain('\\u009b')
      expect(ioHelper.stderrText).not.toContain('\u009b')
      expect(hasRawControlExceptLF(ioHelper.stdoutText + ioHelper.stderrText)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(c) CREATE_WXL_COMMIT holding DEL -> CW-E02 names the variable and contains \\u007f, not the raw DEL, and no raw C0/DEL/C1 (except LF) anywhere', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const deps = makeDeps({ cwd: tmpRoot, env: { CREATE_WXL_COMMIT: 'abc\u007f' } })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expectCwLinesStartWithCode(ioHelper.stderrText)
      expect(ioHelper.stderrText).toContain(JSON.stringify('CREATE_WXL_COMMIT'))
      expect(ioHelper.stderrText).toContain('\\u007f')
      expect(ioHelper.stderrText).not.toContain('\u007f')
      expect(hasRawControlExceptLF(ioHelper.stdoutText + ioHelper.stderrText)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('jsonValue (D10)', () => {
  it('escapes tab, CR, backspace and form feed as \\uXXXX, not the JSON short escape', () => {
    expect(jsonValue('a\tb')).toBe('"a\\u0009b"')
    expect(jsonValue('a\rb')).toBe('"a\\u000db"')
    expect(jsonValue('a\bb')).toBe('"a\\u0008b"')
    expect(jsonValue('a\fb')).toBe('"a\\u000cb"')
  })

  it('keeps a newline as the JSON short escape \\n, per D10 (the matrix value; everything else C0/DEL/C1 is \\uXXXX)', () => {
    expect(jsonValue('a\nb')).toBe('"a\\nb"')
  })

  it('still escapes DEL and C1 as \\uXXXX', () => {
    expect(jsonValue('a\u007fb')).toBe('"a\\u007fb"')
    expect(jsonValue('a\u009bb')).toBe('"a\\u009bb"')
  })

  it('escapes a lone surrogate (U+D800-U+DFFF) as \\uXXXX, as JSON.stringify does', () => {
    expect(jsonValue('a\ud800b')).toBe('"a\\ud800b"')
    expect(jsonValue('a\udfffb')).toBe('"a\\udfffb"')
  })

  it('a non-string value with embedded control characters is escaped the same way (converted with String() first)', () => {
    expect(jsonValue(['a\tb'])).toBe('"a\\u0009b"')
  })
})

describe('copyable commands', () => {
  const ESC_CASE_ARGV = process.platform === 'win32' ? null : ['--no-setup', 'r\u001bx']

  it.each([
    ['-x', ['--no-setup', '--', '-x'], 'Next: cd ./-x'],
    ['my range', ['--no-setup', 'my range'], "Next: cd 'my range'"],
    ["a'b", ['--no-setup', "a'b"], `Next: cd 'a'\\''b'`],
  ])('N1 for directory %s -> the whole N1 line is %s', async (_label, argv, expectedLine) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(argv, ioHelper.io, deps)
      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText.split('\n')).toContain(expectedLine)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.skipIf(ESC_CASE_ARGV === null)(
    'a directory containing ESC -> N1 withheld, control-character notice with the full escaped value, N8 still printed',
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
        const ioHelper = makeIo()
        const exitCode = await run(ESC_CASE_ARGV, ioHelper.io, deps)
        expect(exitCode).toBe(0)
        // No line is a `cd` command, whether bare or after the "Next: " label (the previous,
        // always-true version of this check only tried `startsWith('cd ')`, which N1's own
        // "Next: " prefix would never match either way).
        expect(ioHelper.stdoutText).not.toMatch(/(^|: )cd /m)
        expect(ioHelper.stdoutText).toContain('\\u001b')
        expect(ioHelper.stdoutText).not.toContain('\u001b')
        expect(ioHelper.stdoutText).toContain(jsonValue('r\u001bx'))
        expect(ioHelper.stdoutText).toContain('pnpm fork:init')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  const ESC_SITE_NAME_ARGV =
    process.platform === 'win32'
      ? null
      : ['d', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages', '--site-name', 'r\u001bx']

  // The REAL engine's `parseForkInitArgs` already rejects a control character in any flag value
  // (CW-E06, step 5), before setupArgv ever reaches step 11 or 12 -- so decision 1(b)'s scenario
  // cannot happen through the normal flow with today's engine. These two cases use a stub
  // `parseForkInitArgs` that skips that validation (bypassing it on purpose), to exercise CW-E12's
  // and CW-W05's own printed-command safety net in isolation, as a defence in depth against an
  // engine that is ever less strict than today's. Recorded as such, not as a reachable real case.
  function bypassingEngine(deps) {
    return {
      ...deps.engine,
      parseForkInitArgs: () => ({ author: 'Ada', repo: 'alice/r', host: 'github-pages' }),
    }
  }

  it.skipIf(ESC_SITE_NAME_ARGV === null)(
    'CW-E12 (decision 1, engine validation bypassed): an answer (--site-name) containing ESC withholds the pnpm fork:init line, shows it escaped',
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
        deps.engine = {
          ...bypassingEngine(deps),
          runForkInit: () => {
            throw new Error('boom')
          },
        }
        const ioHelper = makeIo()
        const exitCode = await run(ESC_SITE_NAME_ARGV, ioHelper.io, deps)

        expect(exitCode).toBe(1)
        expect(ioHelper.stderrText).toMatch(/^CW-E12/m)
        expectCwLinesStartWithCode(ioHelper.stderrText)
        const lines = ioHelper.stderrText.split('\n')
        expect(lines.some((line) => line.startsWith('pnpm fork:init'))).toBe(false)
        expect(ioHelper.stderrText).toContain('\\u001b')
        expect(ioHelper.stderrText).not.toContain('\u001b')
        // the directory itself has no control character, so its own cd line still prints.
        expect(lines.some((line) => line.startsWith('cd '))).toBe(true)
        expect(ioHelper.stderrText).toContain('pnpm install')
        expect(ioHelper.stderrText).toContain('git init')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  it.skipIf(ESC_SITE_NAME_ARGV === null)(
    'CW-W05 (decision 1, engine validation bypassed): an answer (--site-name) containing ESC withholds the pnpm fork:init line, shows it escaped',
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
        deps.engine = bypassingEngine(deps)
        deps.checkpoint = makeSignalingCheckpoint(deps.signals, 'step-11')
        const ioHelper = makeIo()
        const exitCode = await run(ESC_SITE_NAME_ARGV, ioHelper.io, deps)

        expect(exitCode).toBe(130)
        expect(ioHelper.stderrText).toMatch(/^CW-W05/m)
        expectCwLinesStartWithCode(ioHelper.stderrText)
        const lines = ioHelper.stderrText.split('\n')
        expect(lines.some((line) => line.startsWith('pnpm fork:init'))).toBe(false)
        expect(ioHelper.stderrText).toContain('\\u001b')
        expect(ioHelper.stderrText).not.toContain('\u001b')
        expect(lines.some((line) => line.startsWith('cd '))).toBe(true)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  it.skipIf(ESC_CASE_ARGV === null)(
    'CW-E12 (decision 1): a directory containing ESC withholds its cd line too, pnpm/git lines still printed',
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
        deps.engine = {
          ...deps.engine,
          runForkInit: () => {
            throw new Error('boom')
          },
        }
        const ioHelper = makeIo()
        const exitCode = await run(
          ['r\u001bx', '--author', 'Ada', '--repo', 'alice/r', '--host', 'github-pages'],
          ioHelper.io,
          deps,
        )
        expect(exitCode).toBe(1)
        expect(ioHelper.stderrText).toMatch(/^CW-E12/m)
        expectCwLinesStartWithCode(ioHelper.stderrText)
        const lines = ioHelper.stderrText.split('\n')
        expect(lines.some((line) => line.startsWith('cd '))).toBe(false)
        expect(ioHelper.stderrText).toContain('\\u001b')
        expect(ioHelper.stderrText).not.toContain('\u001b')
        expect(ioHelper.stderrText).toContain('pnpm install')
        expect(ioHelper.stderrText).toContain('git init')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )
})
