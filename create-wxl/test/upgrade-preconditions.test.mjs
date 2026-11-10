// 0006-S1 step 3-4 preconditions (traceability.md "Step order" rows 3-4): location, git tool and
// clean-tree checks, built against a committed fixture range (test/helpers/fixture-range.mjs).

import { describe, it, expect, vi } from 'vitest'
import { rm, mkdir, symlink, writeFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { join, basename } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeFixtureRange } from './helpers/fixture-range.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeGitStub } from './helpers/git-stub.mjs'
import { verifyGit } from './helpers/real-git.mjs'
import { makeSignalingCheckpoint } from './helpers/checkpoint-signal.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { failAt, fsError } from './helpers/fail-at.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const SYMLINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir'

async function makeIsolatedEnv() {
  const home = await makeTmpRoot('create-wxl-upgrade-home-')
  return { HOME: home, PATH: process.env.PATH, XDG_CONFIG_HOME: join(home, '.config'), LANG: 'en_US.UTF-8' }
}

function noOpRangeJson() {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: '3.0.0', commit: FIXED_COMMIT } }
}

describe('location', () => {
  it('(1) not a git repository -> UP-E01, fetchArchive not called, nothing written', async () => {
    const cwd = await makeTmpRoot('create-wxl-upgrade-cwd-')
    const env = await makeIsolatedEnv()
    try {
      const deps = makeDeps({ cwd, env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(cwd)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(cwd)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E01/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(cwd, { recursive: true, force: true })
      await rm(env.HOME, { recursive: true, force: true })
    }
  })

  it('(2) a subdirectory of the range -> UP-E01, fetchArchive not called, nothing written', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const docsDir = join(fixture.root, 'docs')
      await mkdir(docsDir)
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: docsDir, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E01/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })

  it.skipIf(process.platform === 'win32')(
    '(3) the range reached through a symbolic link to its root -> accepted (UP-I01), fetchArchive not called',
    async () => {
      const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
      const outside = await makeTmpRoot('create-wxl-upgrade-link-')
      const linkPath = join(outside, 'range-link')
      try {
        await symlink(fixture.root, linkPath, SYMLINK_TYPE)
        const before = await snapshotTree(fixture.root)
        const deps = makeDeps({ cwd: linkPath, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()) })
        const ioHelper = makeIo()
        const exitCode = await run(['upgrade'], ioHelper.io, deps)
        const after = await snapshotTree(fixture.root)

        expect(exitCode).toBe(0)
        expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
        expect(deps.fetchArchive).not.toHaveBeenCalled()
        expect(after).toEqual(before)
      } finally {
        await rm(outside, { recursive: true, force: true })
        await rm(fixture.root, { recursive: true, force: true })
        await rm(fixture.env.HOME, { recursive: true, force: true })
      }
    },
  )
})

describe('git tool', () => {
  it('(1) runGit cannot be spawned (PATH empty) -> UP-E02, exit 1', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const env = { ...fixture.env, PATH: '' }
      const deps = makeDeps({ cwd: fixture.root, env, runGit: vi.fn(createSpawnGitRunner()) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E02/m)
      // F23 (stage 6 disposition): the message points at where to get a newer git.
      expect(ioHelper.stderrText).toContain('https://git-scm.com/downloads')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })

  it('(2) git --version reports 2.19.0 -> UP-E02 naming the version found, exit 1', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const { runGit } = makeGitStub({ version: { code: 0, stdout: 'git version 2.19.0\n', stderr: '' } })
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(runGit) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E02/m)
      expect(ioHelper.stderrText).toContain('2.19.0')
      // F23 (stage 6 disposition): the message points at where to get a newer git.
      expect(ioHelper.stderrText).toContain('https://git-scm.com/downloads')
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })

  it('(3) git --version reports 2.20.0 (the inclusive lower bound) -> not UP-E02, proceeds', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const real = createSpawnGitRunner()
      const { runGit } = makeGitStub({
        version: { code: 0, stdout: 'git version 2.20.0\n', stderr: '' },
        unknown: (args, opts) => real(args, opts),
      })
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(runGit) })
      const before = await snapshotTree(fixture.root)
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(ioHelper.stderrText).not.toContain('UP-E02')
      expect(exitCode).toBe(0)
      expect(ioHelper.stdoutText).toMatch(/^UP-I01/m)
      // A4/F08 (stage 6 disposition): nothing written, same as U03 and U05.
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

describe('clean check', () => {
  const UNCLEAN_CASES = [
    [
      'a modified tracked file',
      'changes',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await writeFile(join(fixture.root, 'README.md'), '# fixture (modified)\n')
      },
    ],
    [
      'an untracked file',
      'changes',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await writeFile(join(fixture.root, 'untracked.txt'), 'x\n')
      },
    ],
    [
      'a staged change',
      'changes',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await writeFile(join(fixture.root, 'README.md'), '# fixture (staged)\n')
        await verifyGit(['add', 'README.md'], { cwd: fixture.root, env: fixture.env })
      },
    ],
    ['no commit yet', 'no-head', () => makeFixtureRange({ rangeJson: noOpRangeJson(), commit: false }), async () => {}],
    [
      'assume-unchanged',
      'assume-unchanged',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await verifyGit(['update-index', '--assume-unchanged', 'README.md'], { cwd: fixture.root, env: fixture.env })
      },
    ],
    [
      'skip-worktree',
      'skip-worktree',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await verifyGit(['update-index', '--skip-worktree', 'README.md'], { cwd: fixture.root, env: fixture.env })
      },
    ],
    [
      'MERGE_HEAD present',
      'in-progress',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await writeFile(join(fixture.root, '.git', 'MERGE_HEAD'), `${FIXED_COMMIT}\n`)
      },
    ],
    [
      'global status.showUntrackedFiles=no with an untracked file',
      'changes',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await writeFile(join(fixture.env.HOME, '.gitconfig'), '[status]\n\tshowUntrackedFiles = no\n')
        await writeFile(join(fixture.root, 'untracked.txt'), 'x\n')
      },
    ],
    [
      'sequencer directory present, no CHERRY_PICK_HEAD (D7, candidate 15)',
      'in-progress',
      () => makeFixtureRange({ rangeJson: noOpRangeJson() }),
      async (fixture) => {
        await mkdir(join(fixture.root, '.git', 'sequencer'))
        await writeFile(join(fixture.root, '.git', 'sequencer', 'todo'), '')
      },
    ],
  ]

  it.each(UNCLEAN_CASES)('%s -> UP-E03 token %s', async (_label, token, makeFixture, mutate) => {
    const fixture = await makeFixture()
    try {
      const env = { ...fixture.env, GIT_CONFIG_NOSYSTEM: '1' }
      await mutate(fixture)

      if (_label.startsWith('global')) {
        // Control assertion (ticket Notes): without the production call's explicit
        // `--untracked-files=all`, the isolated HOME's global config really does suppress the
        // untracked file -- otherwise a missing `--untracked-files=all` in the implementation
        // could still pass this case by accident.
        const control = await verifyGit(['status', '--porcelain'], { cwd: fixture.root, env })
        expect(control.stdout).toBe('')
      }

      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, env, runGit: vi.fn(createSpawnGitRunner()) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E03/m)
      expect(ioHelper.stderrText).toContain(token)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

describe('in-progress marker check: an lstat error other than ENOENT fails closed (candidate 03/14)', () => {
  it("an EACCES on the MERGE_HEAD marker (matched by basename) -> CW-E14, exit 1, nothing written", async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const { fs } = recordingFs({
        lstat: failAt('lstat', (_count, args) => (basename(args[0]) === 'MERGE_HEAD' ? fsError('EACCES') : null)),
      })
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(createSpawnGitRunner()), fs })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

describe('git command failures (D6): fail closed, never treated as clean', () => {
  const realGit = createSpawnGitRunner()

  function interceptingGitStub(matchesArgs, response) {
    return async (args, opts) => {
      if (matchesArgs(args)) return response
      return realGit(args, opts)
    }
  }

  const CASES = [
    [
      'git status exits 128 with stderr',
      (args) => args.includes('status'),
      { code: 128, stdout: '', stderr: 'fatal: index file corrupt' },
      'status',
    ],
    [
      'git ls-files -v exits 128 with stderr',
      (args) => args.includes('ls-files'),
      { code: 128, stdout: '', stderr: 'fatal: index file corrupt' },
      'ls-files -v',
    ],
    [
      'git rev-parse --git-dir exits 128 with stderr',
      (args) => args.includes('--git-dir'),
      { code: 128, stdout: '', stderr: 'fatal: index file corrupt' },
      'rev-parse --git-dir',
    ],
    [
      'git status closes with code null (killed by a signal)',
      (args) => args.includes('status'),
      { code: null, stdout: '', stderr: '' },
      'status',
    ],
  ]

  it.each(CASES)('%s -> CW-E14 naming the command and stderr, exit 1, nothing written', async (_label, matchesArgs, response, command) => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const runGit = interceptingGitStub(matchesArgs, response)
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit: vi.fn(runGit) })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(ioHelper.stderrText).toContain(`git ${command} failed`)
      expect(ioHelper.stderrText).toContain(response.stderr)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

describe('signal guard (F02/A2): a signal at a step 3-7 checkpoint stops the run before any new file-system work', () => {
  /** Candidate 13 (stage 7): a `runGit` stub that forwards every other command to the real
   * runner, and for the one command `matchesArgs` picks, raises `signalName` on `signals` (the
   * same way `makeSignalingCheckpoint` does) and then resolves as if the git process itself were
   * killed by the signal (`code: null`), instead of rejecting. */
  function interceptingSignalGitStub(signals, matchesArgs, signalName = 'SIGINT') {
    const real = createSpawnGitRunner()
    let fired = false
    return async (args, opts) => {
      if (!fired && matchesArgs(args)) {
        fired = true
        signals.emit(signalName)
        return { code: null, stdout: '', stderr: '' }
      }
      return real(args, opts)
    }
  }

  it.each([
    ['rev-parse --show-toplevel (step 3)', (args) => args.includes('--show-toplevel')],
    ['status (step 4)', (args) => args.includes('status')],
  ])('git %s killed by a signal -> exit 130, not UP-E01/UP-E03/CW-E14, nothing written', async (_label, matchesArgs) => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const signals = new EventEmitter()
      const runGit = interceptingSignalGitStub(signals, matchesArgs)
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit: vi.fn(runGit), signals })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/^UP-E01/m)
      expect(ioHelper.stderrText).not.toMatch(/^UP-E03/m)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E14/m)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
      expect(readdirSync(tmpRoot).filter((name) => name.startsWith('create-wxl-upgrade-'))).toEqual([])
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('SIGINT raised at the step-4 checkpoint -> exit 130, fixture unchanged (including .git), no download, no tmp entry', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const signals = new EventEmitter()
      const checkpoint = makeSignalingCheckpoint(signals, 'step-4')
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        signals,
        checkpoint,
      })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(130)
      expect(deps.fetchArchive).not.toHaveBeenCalled()
      expect(after).toEqual(before)
      expect(readdirSync(tmpRoot).filter((name) => name.startsWith('create-wxl-upgrade-'))).toEqual([])
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// U74, step 4 (traceability.md revision 3.1, D19; T-0061): a git command of step 4 that `runGit`
// rejects (the spawn itself failed, not an exit code) is CW-E14 whose message names the command.
// The exit-code half of U74's step 4 case is the D6 block above ("git status exits 128").
describe('U74 (step 4): runGit rejects a step 4 git command -> CW-E14 naming it (D19)', () => {
  it('git status rejected with EIO -> CW-E14 naming git status, exit 1, nothing written', async () => {
    const fixture = await makeFixtureRange({ rangeJson: noOpRangeJson() })
    try {
      const realGit = createSpawnGitRunner()
      const eio = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' })
      const runGit = vi.fn(async (args, opts) => {
        if (args.includes('status')) throw eio
        return realGit(args, opts)
      })
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, env: fixture.env, runGit })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(ioHelper.stderrText).toContain('git status failed')
      expect(ioHelper.stderrText).toContain('EIO')
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
    }
  })
})

// T-0061 stage 6 (F14, B10; D19): when `runGit` rejects a step 4 or step 5 git command after a
// signal has already arrived, the run still exits 130 -- the rejection is not wrapped as CW-E14.
describe('D19: a rejection after a signal still exits 130 (T-0061 stage 6, F14)', () => {
  it.each([
    ['git status (step 4)', (args) => args.includes('status'), { upstream: undefined }],
    ['git check-ignore -- ./range.json (step 5)', (args) => args.includes('check-ignore') && args.includes('./range.json'), { ignore: true }],
  ])('%s rejected after SIGINT -> exit 130, not CW-E14, nothing written', async (_label, matchesArgs, { ignore }) => {
    const fixture = await makeFixtureRange({
      rangeJson: noOpRangeJson(),
      beforeCommit: ignore ? async (root) => writeFile(join(root, '.gitignore'), 'range.json\n') : undefined,
    })
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    try {
      const signals = new EventEmitter()
      const realGit = createSpawnGitRunner()
      let fired = false
      const runGit = vi.fn(async (args, opts) => {
        if (!fired && matchesArgs(args)) {
          fired = true
          signals.emit('SIGINT')
          throw Object.assign(new Error('EIO: i/o error'), { code: 'EIO' })
        }
        return realGit(args, opts)
      })
      const before = await snapshotTree(fixture.root)
      const deps = makeDeps({ cwd: fixture.root, tmpRoot, env: fixture.env, runGit, signals })
      const ioHelper = makeIo()
      const exitCode = await run(['upgrade'], ioHelper.io, deps)
      const after = await snapshotTree(fixture.root)

      expect(fired).toBe(true)
      expect(exitCode).toBe(130)
      expect(ioHelper.stderrText).not.toMatch(/^CW-E14/m)
      expect(after).toEqual(before)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
