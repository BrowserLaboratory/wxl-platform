// 0006-S1 step 5's base resolution (traceability.md "Step order" row 5): a valid `range.json`
// names the base (U06), its absence without `--from` is UP-E04 (U07), `--from <version>`/
// `--from <commit>` resolve the base directly whether or not `range.json` exists and `--from`
// wins when both are present (U08, U09), every J1/J3/J4 shape failure of `range.json` without
// `--from` is UP-E06 with its token (U10), and J5's repository comparison (U11).

import { describe, it, expect, vi } from 'vitest'
import { rm, writeFile, symlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeFixtureRange } from './helpers/fixture-range.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '1111111111111111111111111111111111111111'

describe('U06: valid range.json -> base is its own commit and version', () => {
  it("fetchArchive is called once for the base's commit and once for the target's", async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } },
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      }, { releases: { ['3.0.0']: BASE_COMMIT } })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.1.0',
        source: { version: '3.1.0' },
        fetchArchive,
      })
      const ioHelper = makeIo()
      await run(['upgrade'], ioHelper.io, deps)

      const refs = fetchArchive.mock.calls.map((call) => call[1])
      expect(refs).toContain(BASE_COMMIT)
      expect(refs).toContain(FIXED_COMMIT)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('U08: no range.json, --from <version> / --from <commit>', () => {
  it('(a) --from 3.1.0 -> ref refs/tags/v3.1.0', async () => {
    const fixture = await makeFixtureRange()
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        'refs/tags/v3.1.0': { body: pristineArchive(FIXED_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.2.0',
        source: { version: '3.2.0' },
        fetchArchive,
      })
      const ioHelper = makeIo()
      await run(['upgrade', '--from', '3.1.0'], ioHelper.io, deps)

      const refs = fetchArchive.mock.calls.map((call) => call[1])
      expect(refs).toContain('refs/tags/v3.1.0')
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('(b) --from <40 hex commit> -> ref is that commit (confirmation)', async () => {
    const fixture = await makeFixtureRange()
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      }, { releases: { ['3.0.0']: BASE_COMMIT } })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.2.0',
        source: { version: '3.2.0' },
        fetchArchive,
      })
      const ioHelper = makeIo()
      await run(['upgrade', '--from', BASE_COMMIT], ioHelper.io, deps)

      const refs = fetchArchive.mock.calls.map((call) => call[1])
      expect(refs).toContain(BASE_COMMIT)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

const OTHER_COMMIT = '2222222222222222222222222222222222222222'

describe('--from overrides range.json', () => {
  async function runWithRangeJson({ rangeJson, rangeJsonRaw, beforeCommit }) {
    const fixture = await makeFixtureRange({ rangeJson, rangeJsonRaw, beforeCommit })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const fetchArchive = makeRefFetchArchive({
        'refs/tags/v3.1.0': { body: pristineArchive(FIXED_COMMIT) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: '3.2.0',
        source: { version: '3.2.0' },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade', '--from', '3.1.0'], ioHelper.io, deps)
      return { exitCode, ioHelper, fetchArchive }
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }

  it('(a) valid range.json with another commit -> --from wins, repository argument is deps.source.repository', async () => {
    const { fetchArchive } = await runWithRangeJson({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: OTHER_COMMIT } },
    })
    const refs = fetchArchive.mock.calls.map((call) => call[1])
    expect(refs).toContain('refs/tags/v3.1.0')
    expect(refs).not.toContain(OTHER_COMMIT)
    expect(fetchArchive.mock.calls[0][0]).toBe(engineModule.UPSTREAM_SLUG)
  })

  it('(b) upstream.repository is another string -> --from wins (J5 skipped)', async () => {
    const { fetchArchive } = await runWithRangeJson({
      rangeJson: { upstream: { repository: 'other-owner/other-repo', version: '3.0.0', commit: OTHER_COMMIT } },
    })
    const refs = fetchArchive.mock.calls.map((call) => call[1])
    expect(refs).toContain('refs/tags/v3.1.0')
    expect(refs).not.toContain(OTHER_COMMIT) // F12 (stage 6 disposition)
  })

  it('(c) range.json is broken JSON -> UP-E06 not-json, fetchArchive not called', async () => {
    const { exitCode, ioHelper, fetchArchive } = await runWithRangeJson({ rangeJsonRaw: '{not json' })
    expect(exitCode).toBe(1)
    expect(ioHelper.stderrText).toMatch(/^UP-E06/m)
    expect(ioHelper.stderrText).toContain('not-json')
    expect(fetchArchive).not.toHaveBeenCalled()
  })

  it('(d) upstream.version is broken (J4 skipped) -> --from wins', async () => {
    const { fetchArchive } = await runWithRangeJson({
      rangeJson: { upstream: { repository: engineModule.UPSTREAM_SLUG, version: 'v3.0.0', commit: OTHER_COMMIT } },
    })
    const refs = fetchArchive.mock.calls.map((call) => call[1])
    expect(refs).toContain('refs/tags/v3.1.0')
    expect(refs).not.toContain(OTHER_COMMIT) // F12 (stage 6 disposition)
  })

  it.skipIf(process.platform === 'win32')(
    '(e) range.json is a symbolic link to another committed JSON file -> UP-E06 not-a-file',
    async () => {
      const { exitCode, ioHelper, fetchArchive } = await runWithRangeJson({
        beforeCommit: async (root) => {
          await writeFile(join(root, 'other.json'), JSON.stringify({ a: 1 }) + '\n')
          await symlink('other.json', join(root, 'range.json'))
        },
      })
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E06/m)
      expect(ioHelper.stderrText).toContain('not-a-file')
      expect(fetchArchive).not.toHaveBeenCalled()
    },
  )
})

describe('U10: J1/J3/J4 failures, without --from', () => {
  const VALID_COMMIT = '3333333333333333333333333333333333333333'
  const VALID_REPO = engineModule.UPSTREAM_SLUG

  async function runCase({ rangeJson, rangeJsonRaw, beforeCommit }) {
    const fixture = await makeFixtureRange({ rangeJson, rangeJsonRaw, beforeCommit })
    try {
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)
      return { exitCode, ioHelper, fetchArchive: deps.fetchArchive, before, after }
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  }

  const CASES = [
    [
      'J1: directory at range.json',
      'not-a-file',
      {
        beforeCommit: async (root) => {
          await mkdir(join(root, 'range.json'))
          await writeFile(join(root, 'range.json', 'inner.txt'), 'x\n')
        },
      },
    ],
    ['J3: BOM', 'not-json', { rangeJsonRaw: '\uFEFF{"a":1}\n' }], // F21 (stage 6 disposition): the escape, not a literal invisible character
    ['J3: not valid JSON', 'not-json', { rangeJsonRaw: '{not json' }],
    ['J3: a JSON array', 'not-object', { rangeJsonRaw: '[]\n' }],
    ['J3: literal null', 'not-object', { rangeJsonRaw: 'null\n' }],
    ['J4: missing upstream', 'upstream', { rangeJson: {} }],
    ['J4: upstream not an object', 'upstream', { rangeJson: { upstream: 'nope' } }],
    [
      'J4: upstream.repository not a string',
      'upstream.repository',
      { rangeJson: { upstream: { repository: 123, version: '3.0.0', commit: VALID_COMMIT } } },
    ],
    [
      'J4: repository, version and commit all broken (repository reported first)',
      'upstream.repository',
      { rangeJson: { upstream: { repository: 123, version: 'bad', commit: 'bad' } } },
    ],
    [
      'J4: version and commit broken, repository valid',
      'upstream.version',
      { rangeJson: { upstream: { repository: VALID_REPO, version: 'bad', commit: 'bad' } } },
    ],
    [
      'J4: only commit broken',
      'upstream.commit',
      { rangeJson: { upstream: { repository: VALID_REPO, version: '3.0.0', commit: 'bad' } } },
    ],
    [
      'J4: version boundary v3.0.0 (leading v)',
      'upstream.version',
      { rangeJson: { upstream: { repository: VALID_REPO, version: 'v3.0.0', commit: VALID_COMMIT } } },
    ],
    [
      'J4: version boundary 3.0 (missing patch)',
      'upstream.version',
      { rangeJson: { upstream: { repository: VALID_REPO, version: '3.0', commit: VALID_COMMIT } } },
    ],
    [
      'J4: commit boundary 39 hex characters',
      'upstream.commit',
      { rangeJson: { upstream: { repository: VALID_REPO, version: '3.0.0', commit: '1'.repeat(39) } } },
    ],
    [
      'J4: commit boundary 40 characters, one uppercase',
      'upstream.commit',
      { rangeJson: { upstream: { repository: VALID_REPO, version: '3.0.0', commit: `${'1'.repeat(39)}A` } } },
    ],
    [
      'J4 (F03/A3): version is an array ["3.0.0"], not a string',
      'upstream.version',
      { rangeJson: { upstream: { repository: VALID_REPO, version: ['3.0.0'], commit: VALID_COMMIT } } },
    ],
    [
      'J4 (F03/A3): commit is an array [<40 hex>], not a string',
      'upstream.commit',
      { rangeJson: { upstream: { repository: VALID_REPO, version: '3.0.0', commit: [VALID_COMMIT] } } },
    ],
  ]

  it.each(CASES)('%s -> UP-E06 %s', async (_label, token, fixtureArgs) => {
    const { exitCode, ioHelper, fetchArchive, before, after } = await runCase(fixtureArgs)
    expect(exitCode).toBe(1)
    expect(ioHelper.stderrText).toMatch(/^UP-E06/m)
    // F05 (stage 6 disposition): the full token, through `jsonValue` (the message's own
    // rendering) -- `toContain(token)` alone would also pass for e.g. 'upstream' when the actual
    // token printed is 'upstream.repository'.
    expect(ioHelper.stderrText).toContain(jsonValue(token))
    expect(fetchArchive).not.toHaveBeenCalled()
    expect(after).toEqual(before)
  })

  it.skipIf(process.platform === 'win32')('J1: a symbolic link to a valid JSON file -> UP-E06 not-a-file', async () => {
    const { exitCode, ioHelper, fetchArchive, before, after } = await runCase({
      beforeCommit: async (root) => {
        await writeFile(join(root, 'other.json'), JSON.stringify({ a: 1 }) + '\n')
        await symlink('other.json', join(root, 'range.json'))
      },
    })
    expect(exitCode).toBe(1)
    expect(ioHelper.stderrText).toMatch(/^UP-E06/m)
    expect(ioHelper.stderrText).toContain('not-a-file')
    expect(fetchArchive).not.toHaveBeenCalled()
    expect(after).toEqual(before)
  })
})

function swapCase(str) {
  return str.replace(/[A-Za-z]/g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
}

describe('U11: repository comparison (J5)', () => {
  it('(a) a different repository -> UP-E05 with both repositories, fetchArchive not called', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: 'other-owner/other-repo', version: '3.0.0', commit: BASE_COMMIT } },
    })
    try {
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E05/m)
      expect(ioHelper.stderrText).toContain(jsonValue('other-owner/other-repo'))
      expect(ioHelper.stderrText).toContain(jsonValue(engineModule.UPSTREAM_SLUG))
      expect(deps.fetchArchive).not.toHaveBeenCalled()
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })

  it('(b) repository differs only in ASCII letter case -> accepted (UP-I01)', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { repository: swapCase(engineModule.UPSTREAM_SLUG), version: '3.0.0', commit: FIXED_COMMIT } },
    })
    try {
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

describe('U07: no range.json, no --from -> UP-E04', () => {
  it('exit 1, UP-E04, fetchArchive not called, nothing written', async () => {
    const fixture = await makeFixtureRange()
    try {
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E04/m)
      // F23 (stage 6 disposition): the message names both --from forms (traceability.md Codes).
      expect(ioHelper.stderrText).toContain('--from <version>')
      expect(ioHelper.stderrText).toContain('--from <commit>')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})
