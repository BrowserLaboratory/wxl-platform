// Pristine processing P1-P4 (traceability.md "Pristine processing"): the happy path for each rule
// and every CW-E10 failure, plus the cleanup of the run's own temporary directory a failure there
// must leave behind nothing of (C24/C27 need this: T-0020 never cleaned up on a step-9 failure).

import { describe, it, expect } from 'vitest'
import { readdir, readFile, rm, lstat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT, PACKAGE_VERSION } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { buildArchive } from './helpers/archive.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { snapshotTree, withoutRootMtime } from './helpers/snapshot.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { expectE10 } from './helpers/expect-codes.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const REPO_NAME = engineModule.UPSTREAM_SLUG.split('/')[1]

function buildFixture({ remove = [], replace = {} } = {}) {
  return PRISTINE_FIXTURE.filter((e) => !remove.includes(e.path)).map((e) =>
    e.path in replace ? { ...e, content: replace[e.path] } : e,
  )
}

async function runFixture(tmpRoot, entries) {
  const body = buildArchive(entries, { comment: FIXED_COMMIT, repoName: REPO_NAME, commit: FIXED_COMMIT })
  const target = join(tmpRoot, 'range')
  const before = await snapshotTree(tmpRoot)
  const { fs, calls } = recordingFs()
  const fetchArchive = async () => ({ status: 200, body })
  const deps = makeDeps({ env: { LANG: 'en_US' }, cwd: tmpRoot, fs, fetchArchive })
  const ioHelper = makeIo()
  const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
  const after = await snapshotTree(tmpRoot)
  const mkdtempCalls = calls.filter((c) => c.method === 'mkdtemp')
  const parentNames = await readdir(dirname(target)).catch(() => [])
  return { exitCode, ioHelper, mkdtempCalls, parentNames, target, before, after }
}

/** S-20 (camelCase, consistent with `expectE10`/`expectE08`); strengthened per S-05/P-05: the
 * target must still be absent, and the run's own temporary directory must be gone -- not merely
 * "no name starting with `.create-wxl-`", but the whole parent tree back to its `before`
 * snapshot (catches a write that leaves some OTHER, differently-named trace behind). */
async function expectE10Rejected({ exitCode, parentNames, target, before, after }) {
  expect(exitCode).toBe(1)
  expect(parentNames.some((n) => n.startsWith('.create-wxl-'))).toBe(false)
  await expect(lstat(target)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(withoutRootMtime(after)).toEqual(withoutRootMtime(before))
}

describe('P1', () => {
  it.each([
    [
      'versions after the marker are truncated away',
      '# Changelog\n\nintro\n\n## [Unreleased]\n\n## [3.0.0] - 2026-10-16\n- x\n',
      '# Changelog\n\nintro\n\n## [Unreleased]\n',
    ],
    [
      'CRLF lines, marker compared after stripping trailing CR',
      '# Changelog\r\n\r\n## [Unreleased]\r\n\r\n## [3.0.0]\r\n',
      '# Changelog\n\n## [Unreleased]\n',
    ],
    ['marker is the last line with no trailing newline', '# C\n## [Unreleased]', '# C\n## [Unreleased]\n'],
  ])('%s', async (_label, changelogContent, expected) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runFixture(tmpRoot, buildFixture({ replace: { 'CHANGELOG.md': changelogContent } }))
      expect(result.exitCode).toBe(0)
      expect(await readFile(join(result.target, 'CHANGELOG.md'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('P1/P2 failures', () => {
  it.each([
    ['CHANGELOG.md missing', { remove: ['CHANGELOG.md'] }, 'CHANGELOG.md', 'P1'],
    [
      'CHANGELOG.md without the marker',
      { replace: { 'CHANGELOG.md': '# Changelog\n\nno marker here\n' } },
      'CHANGELOG.md',
      'P1',
    ],
    ['OPEN-QUESTIONS.md missing', { remove: ['.proj.specs/OPEN-QUESTIONS.md'] }, '.proj.specs/OPEN-QUESTIONS.md', 'P2'],
    [
      'OPEN-QUESTIONS.md without an OQ- heading',
      { replace: { '.proj.specs/OPEN-QUESTIONS.md': '# Open Questions\n\nnothing here\n' } },
      '.proj.specs/OPEN-QUESTIONS.md',
      'P2',
    ],
    [
      'OPEN-QUESTIONS.md P2 result would be empty',
      { replace: { '.proj.specs/OPEN-QUESTIONS.md': '---\n\n## OQ-001 — x\n' } },
      '.proj.specs/OPEN-QUESTIONS.md',
      'P2',
    ],
  ])('%s -> CW-E10 naming the file and rule, target unchanged, temporary directory removed', async (_label, mod, file, ruleId) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runFixture(tmpRoot, buildFixture(mod))
      await expectE10Rejected(result)
      expectE10(result.ioHelper.stderrText, file, ruleId)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  // P-09/C-10: only `ENOENT` means "the file is missing" (a pristine-rule failure, CW-E10); any
  // other read error (`EACCES` here) is not this ticket's to report (CW-E09 is T-0024's), so it
  // must be rethrown rather than misreported as "missing".
  it('CHANGELOG.md unreadable with EACCES -> rethrown, not reported as CW-E10 "missing"', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const body = buildArchive(buildFixture(), { comment: FIXED_COMMIT, repoName: REPO_NAME, commit: FIXED_COMMIT })
      const { fs } = recordingFs({
        readFile: async (path, ...rest) => {
          if (String(path).endsWith('CHANGELOG.md')) {
            const err = new Error('permission denied')
            err.code = 'EACCES'
            throw err
          }
          return readFile(path, ...rest)
        },
      })
      const fetchArchive = async () => ({ status: 200, body })
      const deps = makeDeps({ env: { LANG: 'en_US' }, cwd: tmpRoot, fs, fetchArchive })
      const { io } = makeIo()
      await expect(run(['range', '--no-setup'], io, deps)).rejects.toMatchObject({ code: 'EACCES' })
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('P2', () => {
  const FORMAT_SECTION = [
    '# Open Questions',
    '',
    'Some intro with an internal separator:',
    '',
    '---',
    '',
    '## OQ-NNN — <the question>',
    '',
  ].join('\n')
  const ENTRIES = ['---', '', '## OQ-001 — q?', '', 'a1', '', '## OQ-002 — r?', '', 'a2', ''].join('\n')

  it('LF: keeps the format section only, dropping the trailing blank/--- lines', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const content = `${FORMAT_SECTION}\n${ENTRIES}`
      const result = await runFixture(
        tmpRoot,
        buildFixture({ replace: { '.proj.specs/OPEN-QUESTIONS.md': content } }),
      )
      expect(result.exitCode).toBe(0)
      expect(await readFile(join(result.target, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')).toBe(FORMAT_SECTION)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('CRLF: same bytes as the LF case, all LF', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const lfContent = `${FORMAT_SECTION}\n${ENTRIES}`
      const crlfContent = lfContent.replace(/\n/g, '\r\n')
      const result = await runFixture(
        tmpRoot,
        buildFixture({ replace: { '.proj.specs/OPEN-QUESTIONS.md': crlfContent } }),
      )
      expect(result.exitCode).toBe(0)
      expect(await readFile(join(result.target, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')).toBe(FORMAT_SECTION)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('P3', () => {
  it('four-space indent, nested object, version in the middle -> 0.1.0 in the same position', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const input = JSON.stringify({ name: 'wxl', version: '3.0.0', nested: { a: 1, b: [1, 2] }, extra: true }, null, 4) + '\n'
      const result = await runFixture(tmpRoot, buildFixture({ replace: { 'package.json': input } }))
      expect(result.exitCode).toBe(0)
      const expected =
        JSON.stringify({ name: 'wxl', version: '0.1.0', nested: { a: 1, b: [1, 2] }, extra: true }, null, 2) + '\n'
      expect(await readFile(join(result.target, 'package.json'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('single line, no version -> version added last', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const input = JSON.stringify({ name: 'wxl', description: 'x' }) + '\n'
      const result = await runFixture(tmpRoot, buildFixture({ replace: { 'package.json': input } }))
      expect(result.exitCode).toBe(0)
      const expected = JSON.stringify({ name: 'wxl', description: 'x', version: '0.1.0' }, null, 2) + '\n'
      expect(await readFile(join(result.target, 'package.json'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('first line break is CRLF -> output is CRLF throughout (0004 T4)', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const input = JSON.stringify({ name: 'wxl', version: '3.0.0' }, null, 2).replace(/\n/g, '\r\n') + '\r\n'
      const result = await runFixture(tmpRoot, buildFixture({ replace: { 'package.json': input } }))
      expect(result.exitCode).toBe(0)
      const expected = (JSON.stringify({ name: 'wxl', version: '0.1.0' }, null, 2) + '\n').replace(/\n/g, '\r\n')
      expect(await readFile(join(result.target, 'package.json'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('P3 failures', () => {
  it.each([
    ['package.json missing', { remove: ['package.json'] }],
    ['package.json with a BOM', { replace: { 'package.json': '﻿{"name":"x"}\n' } }],
    ['package.json not JSON', { replace: { 'package.json': '{not json\n' } }],
    ['package.json is an array', { replace: { 'package.json': '[]\n' } }],
    ['package.json is null', { replace: { 'package.json': 'null\n' } }],
  ])('%s -> CW-E10 naming package.json and P3, target unchanged', async (_label, mod) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runFixture(tmpRoot, buildFixture(mod))
      await expectE10Rejected(result)
      expectE10(result.ioHelper.stderrText, 'package.json', 'P3')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

/** C28/S-08/P-07: the expected `range.json`, written as a literal template (traceability.md
 * "Pristine processing"'s own schema block), not production's serialisation formula -- so a bug
 * that corrupts key order, indent or the trailing LF the same way on both sides cannot pass
 * unnoticed. `version`/`commit` come from the fixture's own `deps.source`
 * (`PACKAGE_VERSION`/`FIXED_COMMIT`), not a separately hardcoded literal. */
function expectedRangeJsonTemplate({ repository, version, commit }) {
  return (
    '{\n' +
    '  "upstream": {\n' +
    `    "repository": ${JSON.stringify(repository)},\n` +
    `    "version": ${JSON.stringify(version)},\n` +
    `    "commit": ${JSON.stringify(commit)}\n` +
    '  }\n' +
    '}\n'
  )
}

describe('P4', () => {
  it('archive without its own range.json -> range.json matches the schema', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runFixture(tmpRoot, buildFixture())
      expect(result.exitCode).toBe(0)
      const expected = expectedRangeJsonTemplate({
        repository: engineModule.UPSTREAM_SLUG,
        version: PACKAGE_VERSION,
        commit: FIXED_COMMIT,
      })
      expect(await readFile(join(result.target, 'range.json'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('archive with its own (different) range.json -> replaced with the schema', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const foreignRangeJson =
        JSON.stringify({ upstream: { repository: 'someone/else', version: '9.9.9', commit: 'f'.repeat(40) } }, null, 2).replace(
          /\n/g,
          '\r\n',
        ) + '\r\n'
      const entries = [...buildFixture(), { path: 'range.json', type: 'file', mode: 0o644, content: foreignRangeJson }]
      const result = await runFixture(tmpRoot, entries)
      expect(result.exitCode).toBe(0)
      const expected = expectedRangeJsonTemplate({
        repository: engineModule.UPSTREAM_SLUG,
        version: PACKAGE_VERSION,
        commit: FIXED_COMMIT,
      })
      expect(await readFile(join(result.target, 'range.json'), 'utf8')).toBe(expected)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
