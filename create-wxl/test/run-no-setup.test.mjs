import { describe, it, expect, vi } from 'vitest'
import { rm, readdir, readFile, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { buildArchive, makeFetchArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { skipModes } from './helpers/snapshot.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { expectOrderedCheckpoints } from './helpers/checkpoints.mjs'
import { en } from '../src/messages.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

function expectedPackageJsonText() {
  return JSON.stringify({ name: 'wxl', version: '0.1.0' }, null, 2) + '\n'
}

function expectedRangeJsonText({ repository, version, commit }) {
  return JSON.stringify({ upstream: { repository, version, commit } }, null, 2) + '\n'
}

function expectedStdout(directory) {
  return en.N1({ directory }) + '\n' + en.N8() + '\n'
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

describe('--no-setup tracer', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
  ])('creates a pristine range and prints only N1 and N8 (override %s)', async (_label, overrideValue) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const env = overrideValue === undefined ? {} : { CREATE_WXL_COMMIT: overrideValue }
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT })
      const deps = makeDeps({ env, cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const { io } = ioHelper

      const exitCode = await run(['range', '--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toBe('')
      // "Only N1 and N8" (C39/AC-16) pinned against the rendered table text, in order, as the
      // whole of stdout — not a regex over literal ids, which would never appear either way.
      expect(ioHelper.stdoutText).toBe(expectedStdout('range'))

      const target = join(tmpRoot, 'range')
      const files = (await listFiles(target)).sort()
      expect(files).toEqual(
        ['CHANGELOG.md', '.proj.specs/OPEN-QUESTIONS.md', 'package.json', 'README.md', 'src/index.js', 'range.json'].sort(),
      )

      expect(await readFile(join(target, 'CHANGELOG.md'), 'utf8')).toBe('# Changelog\n\n## [Unreleased]\n')
      expect(await readFile(join(target, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')).toBe(
        '# Open Questions\n\nTrack open questions here.\n',
      )
      // byte-equal to a literal template with a fixed key order (S-05/P-06), not a round-trip of
      // the file's own parsed content.
      expect(await readFile(join(target, 'package.json'), 'utf8')).toBe(expectedPackageJsonText())
      expect(await readFile(join(target, 'range.json'), 'utf8')).toBe(
        expectedRangeJsonText({ repository: engineModule.UPSTREAM_SLUG, version: deps.source.version, commit: FIXED_COMMIT }),
      )

      expect(fetchArchive).toHaveBeenCalledTimes(1)
      const call = fetchArchive.mock.calls[0]
      expect(call[0]).toBe(engineModule.UPSTREAM_SLUG)
      expect(call[1]).toBe(FIXED_COMMIT)
      expect(call[2].signal).toBeInstanceOf(AbortSignal)

      expect(deps.engine.parseForkInitArgs).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
      expect(deps.engine.deriveGithubPagesOrigin).not.toHaveBeenCalled()
      expect(deps.runGit).not.toHaveBeenCalled()

      expectOrderedCheckpoints(deps.checkpoint)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('layout and modes', () => {
  const FIXED_MTIME = new Date('2000-01-01T00:00:00Z')
  let originalUmask

  const EXTRA_ENTRIES = [
    { path: 'scripts/', type: 'dir', mode: 0o755 },
    { path: 'scripts/run.sh', type: 'file', mode: 0o755, content: '#!/bin/sh\necho hi\n' },
    { path: 'bin/', type: 'dir', mode: 0o755 },
    { path: 'bin/only-owner-x', type: 'file', mode: 0o100, content: 'owner-exec-only\n' },
    { path: 'private.txt', type: 'file', mode: 0o600, content: 'secret\n' },
    { path: 'assets/', type: 'dir', mode: 0o755 },
    { path: 'assets/blob.bin', type: 'file', mode: 0o644, content: Buffer.from([0x00, 0xff, 0xfe, 0x41, 0x42]) },
    { path: 'deep/', type: 'dir', mode: 0o700 },
    { path: 'deep/a/', type: 'dir', mode: 0o755 },
    { path: 'deep/a/b.txt', type: 'file', mode: 0o644, content: 'deep\n' },
  ]

  function entriesWithFixedMtime() {
    return [...PRISTINE_FIXTURE, ...EXTRA_ENTRIES].map((entry) => ({ ...entry, mtime: FIXED_MTIME }))
  }

  const maybeIt = skipModes ? it.skip : it

  maybeIt('normalises modes: executable files 0755, others 0644, directories and target 0755', async () => {
    originalUmask = process.umask(0o022)
    try {
      const tmpRoot = await makeTmpRoot()
      try {
        const repoName = engineModule.UPSTREAM_SLUG.split('/')[1]
        const fetchArchive = vi.fn(async () => ({
          status: 200,
          body: buildArchive(entriesWithFixedMtime(), { comment: FIXED_COMMIT, repoName, commit: FIXED_COMMIT }),
        }))
        const deps = makeDeps({ cwd: tmpRoot, fetchArchive })
        const { io } = makeIo()

        const exitCode = await run(['range', '--no-setup'], io, deps)
        expect(exitCode).toBe(0)

        const target = join(tmpRoot, 'range')

        const targetStat = await lstat(target)
        expect(targetStat.mode & 0o7777).toBe(0o755)

        const modeOf = async (rel) => (await lstat(join(target, rel))).mode & 0o7777
        expect(await modeOf('scripts/run.sh')).toBe(0o755)
        expect(await modeOf('bin/only-owner-x')).toBe(0o755)
        expect(await modeOf('README.md')).toBe(0o644)
        expect(await modeOf('private.txt')).toBe(0o644)
        expect(await modeOf('deep')).toBe(0o755)
        expect(await modeOf('deep/a')).toBe(0o755)

        const byteIdentical = [
          ['README.md', PRISTINE_FIXTURE.find((e) => e.path === 'README.md').content],
          ['src/index.js', PRISTINE_FIXTURE.find((e) => e.path === 'src/index.js').content],
          ['scripts/run.sh', '#!/bin/sh\necho hi\n'],
          ['bin/only-owner-x', 'owner-exec-only\n'],
          ['private.txt', 'secret\n'],
          ['deep/a/b.txt', 'deep\n'],
        ]
        for (const [rel, expected] of byteIdentical) {
          expect(await readFile(join(target, rel), 'utf8')).toBe(expected)
        }
        const blob = await readFile(join(target, 'assets/blob.bin'))
        expect(blob.equals(Buffer.from([0x00, 0xff, 0xfe, 0x41, 0x42]))).toBe(true)

        const allFiles = await listFiles(target)
        for (const rel of allFiles) {
          const st = await lstat(join(target, rel))
          expect(st.mtimeMs).not.toBe(FIXED_MTIME.getTime())
        }
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    } finally {
      process.umask(originalUmask)
    }
  })
})

describe('test-download override', () => {
  const OVERRIDE_COMMIT = 'abcdef0123456789abcdef0123456789abcdef01'

  it('downloads the override commit, prints CW-W04 on stderr, and writes it to range.json', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = makeFetchArchive(PRISTINE_FIXTURE, { commit: OVERRIDE_COMMIT })
      const deps = makeDeps({ env: { CREATE_WXL_COMMIT: OVERRIDE_COMMIT }, cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const { io } = ioHelper

      const exitCode = await run(['range', '--no-setup'], io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toMatch(/^CW-W04/m)
      // CW-W04 and the commit are on the same line (C15).
      expect(ioHelper.stderrText.split('\n')[0]).toContain(JSON.stringify(OVERRIDE_COMMIT))

      expect(fetchArchive).toHaveBeenCalledTimes(1)
      const call = fetchArchive.mock.calls[0]
      expect(call[0]).toBe(engineModule.UPSTREAM_SLUG)
      expect(call[1]).toBe(OVERRIDE_COMMIT)
      expect(call[2].signal).toBeInstanceOf(AbortSignal)

      const target = join(tmpRoot, 'range')
      expect(await readFile(join(target, 'CHANGELOG.md'), 'utf8')).toBe('# Changelog\n\n## [Unreleased]\n')
      expect(await readFile(join(target, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')).toBe(
        '# Open Questions\n\nTrack open questions here.\n',
      )
      expect(await readFile(join(target, 'package.json'), 'utf8')).toBe(expectedPackageJsonText())
      expect(await readFile(join(target, 'range.json'), 'utf8')).toBe(
        expectedRangeJsonText({
          repository: engineModule.UPSTREAM_SLUG,
          version: deps.source.version,
          commit: OVERRIDE_COMMIT,
        }),
      )

      // CW-W04 does not add N2: stdout is exactly N1 then N8.
      expect(ioHelper.stdoutText).toBe(expectedStdout('range'))

      expect(deps.engine.parseForkInitArgs).not.toHaveBeenCalled()
      expect(deps.engine.runForkInit).not.toHaveBeenCalled()
      expect(deps.engine.deriveGithubPagesOrigin).not.toHaveBeenCalled()
      expect(deps.runGit).not.toHaveBeenCalled()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
