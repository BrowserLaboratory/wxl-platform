import { describe, it, expect } from 'vitest'
import { rm } from 'node:fs/promises'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT, ENGINE_SHA256, PACKAGE_VERSION } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { en, zhTW } from '../src/messages.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

// Every call in this file drives a rejection path: stdout must stay empty throughout (D3/P-28).
async function runPreflightCase(tmpRoot, overrides, argv = ['range', '--no-setup']) {
  const { fs, calls } = recordingFs()
  const deps = makeDeps({ cwd: tmpRoot, fs, ...overrides })
  const before = await snapshotTree(tmpRoot)
  const ioHelper = makeIo()
  const exitCode = await run(argv, ioHelper.io, deps)
  const after = await snapshotTree(tmpRoot)
  expect(ioHelper.stdoutText).toBe('')
  return { exitCode, ioHelper, deps, calls, before, after }
}

describe('package source record', () => {
  const otherRepository = 'other/' + engineModule.UPSTREAM_SLUG.split('/')[1]

  it.each([
    ['source undefined', { source: undefined }],
    ['repository mismatch', { source: { repository: otherRepository, version: PACKAGE_VERSION, commit: FIXED_COMMIT, engineSha256: ENGINE_SHA256 } }],
    [
      'version does not match packageVersion',
      {
        source: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.1', commit: FIXED_COMMIT, engineSha256: ENGINE_SHA256 },
      },
    ],
    [
      'version/packageVersion not three numeric segments',
      {
        packageVersion: '3.0.0-rc.1',
        source: {
          repository: engineModule.UPSTREAM_SLUG,
          version: '3.0.0-rc.1',
          commit: FIXED_COMMIT,
          engineSha256: ENGINE_SHA256,
        },
      },
    ],
    [
      'commit 39 hex',
      {
        source: {
          repository: engineModule.UPSTREAM_SLUG,
          version: PACKAGE_VERSION,
          commit: FIXED_COMMIT.slice(1),
          engineSha256: ENGINE_SHA256,
        },
      },
    ],
    [
      'commit 41 hex',
      {
        source: {
          repository: engineModule.UPSTREAM_SLUG,
          version: PACKAGE_VERSION,
          commit: FIXED_COMMIT + '0',
          engineSha256: ENGINE_SHA256,
        },
      },
    ],
    [
      'commit 40 uppercase hex',
      {
        source: {
          repository: engineModule.UPSTREAM_SLUG,
          version: PACKAGE_VERSION,
          commit: FIXED_COMMIT.toUpperCase(),
          engineSha256: ENGINE_SHA256,
        },
      },
    ],
    [
      'engineSha256 mismatched',
      {
        source: {
          repository: engineModule.UPSTREAM_SLUG,
          version: PACKAGE_VERSION,
          commit: FIXED_COMMIT,
          engineSha256: ENGINE_SHA256.replace(/^./, ENGINE_SHA256[0] === 'a' ? 'b' : 'a'),
        },
      },
    ],
  ])('%s -> CW-E13, exit 1, nothing written', async (_label, overrides) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, overrides)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E13/m)
      expect(ioHelper.stderrText).toContain('npm create wxl@latest')
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('override grammar', () => {
  const BROKEN_SOURCE = { source: undefined }

  it.each([
    ['too short', '0123456'],
    ['uppercase', FIXED_COMMIT.toUpperCase()],
    ['other text', 'main'],
  ])('%s override, normal source record -> CW-E02 naming CREATE_WXL_COMMIT', async (_label, overrideValue) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, {
        env: { CREATE_WXL_COMMIT: overrideValue },
      })

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify('CREATE_WXL_COMMIT'))
      expect(ioHelper.stderrText).not.toMatch(/CW-E13/)
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each([
    ['too short', '0123456'],
    ['uppercase', FIXED_COMMIT.toUpperCase()],
    ['other text', 'main'],
  ])('%s override, broken source record -> still CW-E02, not CW-E13', async (_label, overrideValue) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, {
        env: { CREATE_WXL_COMMIT: overrideValue },
        ...BROKEN_SOURCE,
      })

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify('CREATE_WXL_COMMIT'))
      expect(ioHelper.stderrText).not.toMatch(/CW-E13/)
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('step 1 Node version', () => {
  it.each([
    ['22.5.0', '22.5.0', {}],
    ['21.99.0', '21.99.0', {}],
    ['22.5.0 with a broken source record', '22.5.0', { source: undefined }],
    ['a non-numeric version string', 'v22.5.0', {}],
  ])('%s -> CW-E01, nothing written, no download, no checkpoint', async (_label, nodeVersion, extraOverrides) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, {
        nodeVersion,
        ...extraOverrides,
      })

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E01/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify(nodeVersion))
      expect(ioHelper.stderrText).toContain('22.6.0')
      expect(ioHelper.stderrText).toContain('https://nodejs.org/')
      expect(ioHelper.stderrText).not.toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E13/m)
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('22.5.0 with --bogus is still CW-E01 (the Node check precedes grammar)', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const { fs, calls } = recordingFs()
      const deps = makeDeps({ cwd: tmpRoot, fs, nodeVersion: '22.5.0' })
      const before = await snapshotTree(tmpRoot)
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--bogus', '--no-setup'], ioHelper.io, deps)
      const after = await snapshotTree(tmpRoot)
      expect(exitCode).toBe(1)
      expect(ioHelper.stdoutText).toBe('')
      expect(ioHelper.stderrText).toMatch(/^CW-E01/m)
      expect(deps.checkpoint).not.toHaveBeenCalled()
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(after).toEqual(before)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it.each(['22.6.0', '22.10.0', '23.0.0'])('%s is accepted (full run succeeds)', async (nodeVersion) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd: tmpRoot, nodeVersion, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(0)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('command grammar', () => {
  const GRAMMAR_CASES = [
    { name: 'unknown flag', argv: ['range', '--no-setup', '--bogus'], token: '--bogus' },
    { name: '--help', argv: ['range', '--help'], token: '--help', usage: true },
    { name: '--version', argv: ['range', '--version'], token: '--version', usage: true },
    { name: '-h', argv: ['range', '-h'], token: '-h', usage: true },
    { name: 'lone -', argv: ['range', '-'], token: '-' },
    { name: 'repeated --no-setup', argv: ['range', '--no-setup', '--no-setup'], token: '--no-setup' },
    { name: 'repeated --lang', argv: ['range', '--no-setup', '--lang', 'en', '--lang', 'en'], token: '--lang' },
    { name: '--lang missing value', argv: ['range', '--no-setup', '--lang'], token: '--lang' },
    { name: '--author missing value (next is a flag)', argv: ['range', '--author', '--repo', 'x'], token: '--author' },
    { name: '--author= empty value', argv: ['range', '--author='], token: '--author' },
    { name: '--author - (a lone dash is a missing value, not a value)', argv: ['range', '--author', '-'], token: '--author' },
    { name: 'single-dash flag', argv: ['range', '--no-setup', '-x'], token: '-x' },
    { name: '--no-setup=x', argv: ['range', '--no-setup=x'], token: '--no-setup=x' },
    { name: 'empty positional', argv: ['', '--no-setup'], token: '' },
    { name: 'two positionals', argv: ['a', 'b', '--no-setup'], token: 'b' },
    { name: 'upgrade as positional', argv: ['upgrade', '--no-setup'], token: 'upgrade' },
    { name: '--no-setup upgrade', argv: ['--no-setup', 'upgrade'], token: 'upgrade' },
    { name: '--no-setup -- upgrade', argv: ['--no-setup', '--', 'upgrade'], token: 'upgrade' },
    { name: 'invalid --lang', argv: ['range', '--no-setup', '--lang', 'fr'], token: 'fr' },
  ]

  for (const grammarCase of GRAMMAR_CASES) {
    for (const [sourceLabel, sourceOverrides] of [
      ['normal source record', {}],
      ['broken source record', { source: undefined }],
    ]) {
      it(`${grammarCase.name}, ${sourceLabel} -> CW-E02 naming ${JSON.stringify(grammarCase.token)}`, async () => {
        const tmpRoot = await makeTmpRoot()
        try {
          const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, sourceOverrides, grammarCase.argv)

          expect(exitCode).toBe(1)
          expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
          expect(ioHelper.stderrText).toContain(JSON.stringify(grammarCase.token))
          expect(ioHelper.stderrText).not.toMatch(/CW-E13/)
          if (grammarCase.usage) {
            expect(ioHelper.stderrText).toContain('create-wxl <directory>')
          }
          expect(deps.checkpoint).not.toHaveBeenCalled()
          expect(deps.fetchArchive).not.toHaveBeenCalled()
          expect(calls).toEqual([])
          expect(after).toEqual(before)
        } finally {
          await rm(tmpRoot, { recursive: true, force: true })
        }
      })
    }
  }

  it('Upgrade (different case) is accepted', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(['Upgrade', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(0)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('--lang=zh-TW is accepted and selects the zh-TW table for N1/N8', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup', '--lang=zh-TW'], ioHelper.io, deps)
      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toBe(zhTW.N1({ directory: 'range' }) + '\n' + zhTW.N8() + '\n')
      expect(ioHelper.stdoutText).not.toBe(en.N1({ directory: 'range' }) + '\n' + en.N8() + '\n')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('missing positional with a bad override still reports step 2, not a crash', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const deps = makeDeps({ cwd: tmpRoot, env: { CREATE_WXL_COMMIT: 'not-hex' } })
      const ioHelper = makeIo()
      const exitCode = await run(['--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
      expect(ioHelper.stderrText).toContain(JSON.stringify('CREATE_WXL_COMMIT'))
      expect(deps.checkpoint).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('--no-setup with a setup flag', () => {
  const SETUP_FLAG_CASES = [
    ['author', 'Ada'],
    ['repo', 'a/b'],
    ['host', 'github-pages'],
    ['origin', 'https://x.example'],
    ['site-name', 'S'],
  ]

  for (const [flag, value] of SETUP_FLAG_CASES) {
    for (const form of ['space', 'equals']) {
      const flagTokens = form === 'space' ? [`--${flag}`, value] : [`--${flag}=${value}`]
      for (const position of ['before', 'after']) {
        const argv =
          position === 'before'
            ? ['range', ...flagTokens, '--no-setup']
            : ['range', '--no-setup', ...flagTokens]

        it(`--${flag} (${form} form, ${position} --no-setup) -> CW-E02 naming --${flag}`, async () => {
          const tmpRoot = await makeTmpRoot()
          try {
            const { exitCode, ioHelper, deps, calls, before, after } = await runPreflightCase(tmpRoot, {}, argv)

            expect(exitCode).toBe(1)
            expect(ioHelper.stderrText).toMatch(/^CW-E02/m)
            expect(ioHelper.stderrText).toContain(JSON.stringify(`--${flag}`))
            expect(deps.engine.parseForkInitArgs).not.toHaveBeenCalled()
            expect(deps.checkpoint).not.toHaveBeenCalled()
            expect(deps.fetchArchive).not.toHaveBeenCalled()
            expect(calls).toEqual([])
            expect(after).toEqual(before)
          } finally {
            await rm(tmpRoot, { recursive: true, force: true })
          }
        })
      }
    }
  }
})
