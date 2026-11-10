// U67 (traceability.md revision 3.1, D15, D19; T-0061): step 5 refuses, before any download and
// with or without `--from`, a `range.json` that is not tracked and that the range's rules ignore
// (UP-E13) -- the restore commands could not undo the upgrade's write to it (OQ-026). The check
// follows J1-J5 and precedes step 6; its own git failures are CW-E14 naming the command.

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
import { verifyGit } from './helpers/real-git.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = 'c'.repeat(40)
const RECORD = { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: BASE_COMMIT } }
const IGNORE_RECORD = async (root) => writeFile(join(root, '.gitignore'), 'range.json\n')

/** A `runGit` that runs real git except for the step 5 command on `./range.json` named by `match`,
 * which answers with `answer` (a `{ code, stdout, stderr }`, or an `Error` to reject with). */
function gitWith(match, answer) {
  const real = createSpawnGitRunner()
  return vi.fn(async (args, opts) => {
    if (args.includes(match) && args.includes('./range.json')) {
      if (answer instanceof Error) throw answer
      return answer
    }
    return real(args, opts)
  })
}

async function runCase({ fixture, argv = ['upgrade'], runGit, prepare }) {
  const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
  try {
    // A case's own fixture edits run here, inside the try, so a failing edit still cleans up.
    if (prepare) await prepare()
    const fetchArchive = makeRefFetchArchive(
      { [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT) }, [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT) } },
      { releases: { ['3.0.0']: BASE_COMMIT } },
    )
    const deps = makeDeps({
      cwd: fixture.root,
      tmpRoot,
      env: fixture.env,
      runGit: runGit ?? vi.fn(createSpawnGitRunner()),
      packageVersion: '3.1.0',
      source: { version: '3.1.0' },
      fetchArchive,
    })
    const ioHelper = makeIo()
    const before = await snapshotTree(fixture.root)
    const exitCode = await run(argv, ioHelper.io, deps)
    const after = await snapshotTree(fixture.root)
    return { exitCode, ioHelper, before, after, fetchArchive }
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
    await rm(fixture.env.HOME, { recursive: true, force: true })
    await rm(tmpRoot, { recursive: true, force: true })
  }
}

function expectRefusal(result, code) {
  expect(result.exitCode).toBe(1)
  expect(result.ioHelper.stderrText).toMatch(new RegExp(`^${code}`, 'm'))
  expect(result.fetchArchive).not.toHaveBeenCalled()
  expect(result.after).toEqual(result.before)
}

describe('U67: an untracked range.json that the range ignores (D15)', () => {
  it('(a) present and valid -> UP-E13 before any download', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD, beforeCommit: IGNORE_RECORD })
    expectRefusal(await runCase({ fixture }), 'UP-E13')
  })

  it('(b) absent, with --from 3.0.0 -> UP-E13 before any download', async () => {
    const fixture = await makeFixtureRange({ beforeCommit: IGNORE_RECORD })
    expectRefusal(await runCase({ fixture, argv: ['upgrade', '--from', '3.0.0'] }), 'UP-E13')
  })

  it("(c) present, valid, with upstream.commit equal to the target's commit -> UP-E13, not UP-I01 (step 5 precedes step 6)", async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { ...RECORD.upstream, commit: FIXED_COMMIT } },
      beforeCommit: IGNORE_RECORD,
    })
    const result = await runCase({ fixture })
    expectRefusal(result, 'UP-E13')
    expect(result.ioHelper.stdoutText).not.toContain('UP-I01')
  })

  // Spec Testing Decisions: tests needing symbolic links are skipped on Windows (T-0061 stage 6, F1).
  it.skipIf(process.platform === 'win32')('(d) a symbolic link -> UP-E06 not-a-file (J1 precedes D15)', async () => {
    const fixture = await makeFixtureRange({
      beforeCommit: async (root) => {
        await IGNORE_RECORD(root)
        await symlink('README.md', join(root, 'range.json'))
      },
    })
    const result = await runCase({ fixture })
    expectRefusal(result, 'UP-E06')
    expect(result.ioHelper.stderrText).toContain('not-a-file')
  })

  it('(e) tracked and matching an ignore rule -> proceeds to a completed run (exit 0, no UP-E13; the downloads happen)', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD })
    const result = await runCase({
      fixture,
      prepare: async () => {
        await IGNORE_RECORD(fixture.root)
        await verifyGit(['add', '.gitignore'], { cwd: fixture.root, env: fixture.env })
        await verifyGit(
          ['-c', 'user.name=WXL Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'ignore'],
          { cwd: fixture.root, env: fixture.env },
        )
      },
    })
    expect(result.exitCode).toBe(0)
    expect(result.ioHelper.stderrText).not.toContain('UP-E13')
    expect(result.fetchArchive).toHaveBeenCalled()
  })

  it('(f) git check-ignore exits 128 -> CW-E14 naming git check-ignore', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD, beforeCommit: IGNORE_RECORD })
    const result = await runCase({ fixture, runGit: gitWith('check-ignore', { code: 128, stdout: '', stderr: 'fatal: boom\n' }) })
    expectRefusal(result, 'CW-E14')
    expect(result.ioHelper.stderrText).toContain('git check-ignore -- ./range.json')
  })

  it('(g) git ls-files -z -- ./range.json exits 128 -> CW-E14 naming git ls-files', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD, beforeCommit: IGNORE_RECORD })
    const result = await runCase({ fixture, runGit: gitWith('ls-files', { code: 128, stdout: '', stderr: 'fatal: boom\n' }) })
    expectRefusal(result, 'CW-E14')
    expect(result.ioHelper.stderrText).toContain('git ls-files -z -- ./range.json')
  })

  it('(h) runGit rejects with EIO for git check-ignore -> CW-E14 naming git check-ignore (D19 wraps the rejection)', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD, beforeCommit: IGNORE_RECORD })
    const eio = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' })
    const result = await runCase({ fixture, runGit: gitWith('check-ignore', eio) })
    expectRefusal(result, 'CW-E14')
    expect(result.ioHelper.stderrText).toContain('git check-ignore -- ./range.json')
  })

  it('(i) ignored only by .git/info/exclude -> UP-E13', async () => {
    const fixture = await makeFixtureRange({})
    const result = await runCase({
      fixture,
      prepare: async () => {
        await mkdir(join(fixture.root, '.git', 'info'), { recursive: true })
        await writeFile(join(fixture.root, '.git', 'info', 'exclude'), 'range.json\n')
        await writeFile(join(fixture.root, 'range.json'), JSON.stringify(RECORD, null, 2) + '\n')
      },
    })
    expectRefusal(result, 'UP-E13')
  })

  it('(m) runGit rejects with EIO for git ls-files -z -- ./range.json -> CW-E14 naming that command (D19; T-0061 stage 6, F15)', async () => {
    const fixture = await makeFixtureRange({ rangeJson: RECORD, beforeCommit: IGNORE_RECORD })
    const eio = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' })
    const result = await runCase({ fixture, runGit: gitWith('ls-files', eio) })
    expectRefusal(result, 'CW-E14')
    expect(result.ioHelper.stderrText).toContain('git ls-files -z -- ./range.json')
  })

  it('(j) absent, ignored, no --from -> UP-E04 (J2 precedes D15)', async () => {
    const fixture = await makeFixtureRange({ beforeCommit: IGNORE_RECORD })
    expectRefusal(await runCase({ fixture }), 'UP-E04')
  })

  it('(k) not JSON and ignored -> UP-E06 not-json (J3 precedes D15)', async () => {
    const fixture = await makeFixtureRange({ rangeJsonRaw: '{\n', beforeCommit: IGNORE_RECORD })
    const result = await runCase({ fixture })
    expectRefusal(result, 'UP-E06')
    expect(result.ioHelper.stderrText).toContain('not-json')
  })

  it('(l) upstream.repository of another repository and ignored -> UP-E05 (J5 precedes D15)', async () => {
    const fixture = await makeFixtureRange({
      rangeJson: { upstream: { ...RECORD.upstream, repository: 'other-owner/other-repo' } },
      beforeCommit: IGNORE_RECORD,
    })
    expectRefusal(await runCase({ fixture }), 'UP-E05')
  })
})
