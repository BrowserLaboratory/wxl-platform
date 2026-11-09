// 0006-S1 step 8 pre-check P-3 (traceability.md "Pre-checks"): a path that is, or passes through,
// a symbolic link anywhere inside the range is left untouched and reported UP-A7 -- the link's
// own target, outside the range, keeps its content and modification time; a brand-new upstream
// path reached through a symlinked parent never appears there either (U20). Non-Windows only
// (symbolic links); the approved row's own "R3 各列一筆 UP-A7" plus the 2026-11-09 comment's
// reading ("U20's fourth case also reports UP-A7 (four in all; P-3 does not tell an existing path
// from a new one)") pin exactly 4 lines for this fixture's 4 named cases.

import { describe, it, expect, vi } from 'vitest'
import { link, lstat, mkdir, readdir, readFile, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { makeRangeRepo } from './helpers/range-repo.mjs'
import { buildUpgradeFixtures } from './helpers/upgrade-fixtures.mjs'
import { PRISTINE_FIXTURE } from './helpers/fixtures.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { makeRefFetchArchive, pristineArchive } from './helpers/ref-fetch-archive.mjs'
import { en } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const BASE_COMMIT = '3'.repeat(40)
const BASE_VERSION = '3.0.0'
const TARGET_VERSION = '3.1.0'

function rangeJsonFor(baseCommit) {
  return { upstream: { repository: engineModule.UPSTREAM_SLUG, version: BASE_VERSION, commit: baseCommit } }
}

describe.skipIf(process.platform === 'win32')('symlinks (U20)', () => {
  it('leaves a tracked symlink, a file under a tracked symlinked directory, an ignored symlink, and a new path under it untouched, each reported UP-A7', async () => {
    // Link targets live outside the range root (ticket's own increment plan, increment 4).
    const external = await makeTmpRoot('create-wxl-upgrade-external-')
    const dir2 = join(external, 'dir2')
    await mkdir(dir2)
    await writeFile(join(external, 'target1.txt'), 'external target 1 content\n')
    await writeFile(join(dir2, 'innerfile.txt'), 'external inner content\n')
    await writeFile(join(external, 'target3.txt'), 'external target 3 content\n')

    const rangeRepo = await makeRangeRepo({
      tree: {},
      gitignore: 'ignored-link.txt\n',
      rangeJson: rangeJsonFor(BASE_COMMIT),
    })

    // Case 1 (tracked symlink at p) and the parent of cases 2/4 (a tracked symlinked directory):
    // committed in a second commit, after the range repo's own initial commit.
    await symlink(join(external, 'target1.txt'), join(rangeRepo.root, 'link-file.txt'))
    await symlink(dir2, join(rangeRepo.root, 'linkdir'))
    await rangeRepo.commit('track symlinks')
    // Case 3 (an ignored symlink at p): created after that commit, matching .gitignore, so it
    // stays untracked without breaking step 4's clean-repository check.
    await symlink(join(external, 'target3.txt'), join(rangeRepo.root, 'ignored-link.txt'))

    // Both archives change `link-file.txt`, `linkdir/innerfile.txt` and `ignored-link.txt` (so
    // none of the three is `b ≡ t`, forcing a real classification attempt); only the target adds
    // `linkdir/newfile.txt` (case 4, a brand-new path reached through the symlinked parent).
    const baseEntries = [
      ...PRISTINE_FIXTURE,
      { path: 'link-file.txt', type: 'file', mode: 0o644, content: 'base content for link-file\n' },
      { path: 'linkdir/', type: 'dir', mode: 0o755 },
      { path: 'linkdir/innerfile.txt', type: 'file', mode: 0o644, content: 'base content inner\n' },
      { path: 'ignored-link.txt', type: 'file', mode: 0o644, content: 'base content ignored link\n' },
    ]
    const targetEntries = [
      ...PRISTINE_FIXTURE,
      { path: 'link-file.txt', type: 'file', mode: 0o644, content: 'target content for link-file\n' },
      { path: 'linkdir/', type: 'dir', mode: 0o755 },
      { path: 'linkdir/innerfile.txt', type: 'file', mode: 0o644, content: 'target content inner\n' },
      { path: 'ignored-link.txt', type: 'file', mode: 0o644, content: 'target content ignored link\n' },
      { path: 'linkdir/newfile.txt', type: 'file', mode: 0o644, content: 'brand new upstream file\n' },
    ]

    const before = {
      target1: { content: await readFile(join(external, 'target1.txt')), mtimeMs: (await stat(join(external, 'target1.txt'))).mtimeMs },
      inner: { content: await readFile(join(dir2, 'innerfile.txt')), mtimeMs: (await stat(join(dir2, 'innerfile.txt'))).mtimeMs },
      target3: { content: await readFile(join(external, 'target3.txt')), mtimeMs: (await stat(join(external, 'target3.txt'))).mtimeMs },
      dir2Listing: (await readdir(dir2)).sort(),
    }
    // Item 5 (verification follow-up, tightened to the approved boundary condition): the three
    // in-range links themselves (not just their outside targets' content/mtime) stay symbolic
    // links pointing at their own original readlink target, before AND after.
    const inRangeLinkPaths = ['link-file.txt', 'linkdir', 'ignored-link.txt']
    const beforeLinks = {}
    for (const p of inRangeLinkPaths) {
      const linkStat = await lstat(join(rangeRepo.root, p))
      beforeLinks[p] = { isSymlink: linkStat.isSymbolicLink(), target: await readlink(join(rangeRepo.root, p)), mtimeMs: linkStat.mtimeMs, ino: linkStat.ino }
    }

    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    const fetchArchive = makeRefFetchArchive({
      [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
      [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
    })
    const deps = makeDeps({
      cwd: rangeRepo.root,
      tmpRoot,
      env: rangeRepo.env,
      runGit: vi.fn(createSpawnGitRunner()),
      packageVersion: TARGET_VERSION,
      source: { version: TARGET_VERSION },
      fetchArchive,
    })
    const ioHelper = makeIo()

    try {
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)

      expect(await readFile(join(external, 'target1.txt'))).toEqual(before.target1.content)
      expect((await stat(join(external, 'target1.txt'))).mtimeMs).toBe(before.target1.mtimeMs)
      expect(await readFile(join(dir2, 'innerfile.txt'))).toEqual(before.inner.content)
      expect((await stat(join(dir2, 'innerfile.txt'))).mtimeMs).toBe(before.inner.mtimeMs)
      expect(await readFile(join(external, 'target3.txt'))).toEqual(before.target3.content)
      expect((await stat(join(external, 'target3.txt'))).mtimeMs).toBe(before.target3.mtimeMs)
      // Case 4: the external directory gains no new file.
      expect((await readdir(dir2)).sort()).toEqual(before.dir2Listing)

      for (const p of inRangeLinkPaths) {
        expect(beforeLinks[p].isSymlink).toBe(true) // sanity: each was already a symlink beforehand.
        const afterStat = await lstat(join(rangeRepo.root, p))
        expect(afterStat.isSymbolicLink()).toBe(true)
        expect(await readlink(join(rangeRepo.root, p))).toBe(beforeLinks[p].target)
        // The link itself is the same file system entry, not one removed and recreated with the
        // same target: its own lstat mtime and inode are unchanged.
        expect(afterStat.mtimeMs).toBe(beforeLinks[p].mtimeMs)
        expect(afterStat.ino).toBe(beforeLinks[p].ino)
      }

      const r3Lines = ioHelper.stdoutText.split('\n').filter((line) => line.startsWith('R3:'))
      // T-0027 verification follow-up (item 1/2): R3 renders each attention item through the
      // run's message table (here, en), not a bare code (traceability.md:206).
      expect(r3Lines).toEqual([
        `R3: ${en['UP-A7']()} ${jsonValue('ignored-link.txt')}`,
        `R3: ${en['UP-A7']()} ${jsonValue('link-file.txt')}`,
        `R3: ${en['UP-A7']()} ${jsonValue('linkdir/innerfile.txt')}`,
        `R3: ${en['UP-A7']()} ${jsonValue('linkdir/newfile.txt')}`,
      ])
    } finally {
      await rm(external, { recursive: true, force: true })
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// `o` is classified by `lstat` (P-3/P-6) before any read -- a symbolic link
// or non-file `o` is never read. A Unix domain socket makes this observable without a hang: an
// ordinary `readFile` on one fails fast (not ENOENT/EISDIR/ENOTDIR), so reading it unconditionally
// before P-3 ever runs blows up the whole run instead of leaving it untouched, UP-A7.
describe.skipIf(process.platform === 'win32')('a symbolic link to a socket is never read', () => {
  it('untouched, UP-A7, exit 0 -- the run must not read through the link', async () => {
    const external = await makeTmpRoot('create-wxl-upgrade-external-')
    const socketPath = join(external, 'secret.sock')
    const server = createServer()
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(socketPath, resolve)
    })

    const rangeRepo = await makeRangeRepo({ tree: {}, rangeJson: rangeJsonFor(BASE_COMMIT) })
    const linkPath = join(rangeRepo.root, 'link-to-socket.txt')
    await symlink(socketPath, linkPath)
    await rangeRepo.commit('track a symlink to a socket')

    const baseEntries = [...PRISTINE_FIXTURE, { path: 'link-to-socket.txt', type: 'file', mode: 0o644, content: 'base content\n' }]
    const targetEntries = [...PRISTINE_FIXTURE, { path: 'link-to-socket.txt', type: 'file', mode: 0o644, content: 'target content\n' }]
    const tmpRoot = await makeTmpRoot('create-wxl-upgrade-tmp-')
    const fetchArchive = makeRefFetchArchive({
      [BASE_COMMIT]: { body: pristineArchive(BASE_COMMIT, { entries: baseEntries }) },
      [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: targetEntries }) },
    })
    const deps = makeDeps({
      cwd: rangeRepo.root,
      tmpRoot,
      env: rangeRepo.env,
      runGit: vi.fn(createSpawnGitRunner()),
      packageVersion: TARGET_VERSION,
      source: { version: TARGET_VERSION },
      fetchArchive,
    })
    const ioHelper = makeIo()

    try {
      const exitCode = await run(['upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(0)
      expect(ioHelper.stderrText).toBe('')
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true)
      expect(await readlink(linkPath)).toBe(socketPath)
      expect(ioHelper.stdoutText).toContain(`R3: ${en['UP-A7']()} ${jsonValue('link-to-socket.txt')}`)
    } finally {
      await new Promise((resolve) => server.close(resolve))
      await rm(external, { recursive: true, force: true })
      await rm(rangeRepo.root, { recursive: true, force: true })
      await rm(rangeRepo.env.HOME, { recursive: true, force: true })
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// T-0027 increment 22 (U60): write-then-rename (increment 1, unchanged since) never mutates the
// inode a hard link outside the range still points at -- not Windows-skipped (ticket Notes: "not
// required to skip; revisit if CI shows it is not feasible").
describe('hard link (U60)', () => {
  it('writing the in-range path (M5) leaves the outside hard-linked name unchanged', async () => {
    const fixture = await buildUpgradeFixtures({ branches: ['M5-updated'] })
    const external = await makeTmpRoot('create-wxl-upgrade-external-')
    const outsideName = join(external, 'outside-name.md')
    let tmpRoot
    try {
      const readmePath = join(fixture.root, 'README.md')
      const before = await readFile(readmePath)
      await link(readmePath, outsideName)

      const tmpRootInner = await makeTmpRoot('create-wxl-upgrade-tmp-')
      tmpRoot = tmpRootInner
      const fetchArchive = makeRefFetchArchive({
        ['4'.repeat(40)]: { body: pristineArchive('4'.repeat(40), { entries: fixture.baseEntries }) },
        [FIXED_COMMIT]: { body: pristineArchive(FIXED_COMMIT, { entries: fixture.targetEntries }) },
      })
      const deps = makeDeps({
        cwd: fixture.root,
        tmpRoot: tmpRootInner,
        env: fixture.env,
        runGit: vi.fn(createSpawnGitRunner()),
        packageVersion: TARGET_VERSION,
        source: { version: TARGET_VERSION },
        fetchArchive,
      })
      const ioHelper = makeIo()
      const exitCode = await run(
        ['upgrade', '--from', '4'.repeat(40)],
        ioHelper.io,
        deps,
      )

      expect(exitCode).toBe(0)
      expect((await readFile(readmePath)).toString()).toBe('# wxl\n\nA pristine range fixture, updated by upstream.\n')
      expect(await readFile(outsideName)).toEqual(before)
    } finally {
      await rm(external, { recursive: true, force: true })
      await rm(fixture.root, { recursive: true, force: true })
      await rm(fixture.env.HOME, { recursive: true, force: true })
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
