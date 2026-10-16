// 0005-S2 ("Package and publishing", traceability.md): `prepareDist` builds the type-stripped
// engine, the package source record and the `LICENSE` copy; `checkPublish` (X1-X9) refuses a
// release that does not match upstream's pushed tag. Deviation from the approved test plan table
// (recorded in the ticket's "increment plan confirmed" comment): this file is `.mjs`, not `.ts` --
// vitest's `include` (`vitest.config.mjs:6`) only collects `test/**/*.test.mjs`.

import { describe, it, expect } from 'vitest'
import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import * as realModule from 'node:module'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { prepareDist, checkPublish } from '../src/publish.mjs'
import {
  makePublishFixture,
  cleanupFixture,
  headOf,
  buildRelease,
  gitArchiveOf,
  runFixtureGit,
} from './helpers/publish-fixture.mjs'
import { makePublishGitStub } from './helpers/publish-git-stub.mjs'
import { buildArchiveRaw } from './helpers/archive.mjs'

function runNode(args, { cwd } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
  })
}

// Real git on Windows CI runners can take several seconds; every test below builds its fixture
// with several real git spawns (makePublishFixture/buildRelease), so the default 5000ms test
// timeout is too tight there.
describe('prepareDist', () => {
  it('throws D1 having removed dist/ and LICENSE first', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      await mkdir(join(fixture.createWxlDir, 'dist'), { recursive: true })
      await writeFile(join(fixture.createWxlDir, 'dist', 'stale.txt'), 'stale')
      // create-wxl/.gitignore excludes both dist/ and LICENSE, so the real fixture copy never
      // carries either -- write stand-ins so "removed first" has something to remove.
      await writeFile(join(fixture.createWxlDir, 'LICENSE'), 'stale license')

      let thrown
      try {
        await prepareDist({ root: fixture.createWxlDir, module: {} })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['D1'])
      // P-04: dist/ ITSELF is gone (not merely emptied), and so is LICENSE.
      await expect(stat(join(fixture.createWxlDir, 'dist'))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(stat(join(fixture.createWxlDir, 'LICENSE'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('writes source.json, an importable fork-init.mjs and LICENSE, clearing stale dist first', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      await mkdir(join(fixture.createWxlDir, 'dist'), { recursive: true })
      await writeFile(join(fixture.createWxlDir, 'dist', 'stale.txt'), 'stale')
      const head = await headOf(fixture)

      await prepareDist({ root: fixture.createWxlDir, module: realModule })

      await expect(readFile(join(fixture.createWxlDir, 'dist', 'stale.txt'))).rejects.toThrow()

      const engineSource = await readFile(join(fixture.dir, 'scripts/fork-init.ts'), 'utf8')
      const expectedEngineBytes = realModule.stripTypeScriptTypes(engineSource, { mode: 'strip' })
      const actualEngineBytes = await readFile(join(fixture.createWxlDir, 'dist', 'fork-init.mjs'))
      expect(actualEngineBytes.toString('utf8')).toBe(expectedEngineBytes.toString())

      const rootPkg = JSON.parse(await readFile(join(fixture.dir, 'package.json'), 'utf8'))
      const source = JSON.parse(await readFile(join(fixture.createWxlDir, 'dist/source.json'), 'utf8'))
      const expectedSha256 = createHash('sha256').update(actualEngineBytes).digest('hex')
      // Never spell the upstream slug ourselves (hard rule): import it from the engine instead of
      // a literal.
      const engineUrl = new URL('../../scripts/fork-init.ts', import.meta.url)
      const engineModule = await import(engineUrl.href)
      expect(source).toStrictEqual({
        repository: engineModule.UPSTREAM_SLUG,
        version: rootPkg.version,
        commit: head,
        engineSha256: expectedSha256,
      })

      const licenseExpected = await readFile(join(fixture.dir, 'LICENSE'))
      const licenseActual = await readFile(join(fixture.createWxlDir, 'LICENSE'))
      expect(licenseActual.equals(licenseExpected)).toBe(true)

      // P-01: the probe's own import specifier must be a `file:` URL, not a bare absolute path --
      // Windows rejects a bare path as an ESM specifier (ERR_UNSUPPORTED_ESM_URL_SCHEME), which
      // the `fork-init-cross-os` CI job runs this same probe under (windows-latest). The failure
      // itself is Windows-only; the shape is checkable on any platform (a bare path never starts
      // with `file://`).
      const engineDistPath = join(fixture.createWxlDir, 'dist/fork-init.mjs')
      const specifier = pathToFileURL(engineDistPath).href
      expect(specifier.startsWith('file://')).toBe(true)

      const probe = `
        import { parseForkInitArgs } from ${JSON.stringify(specifier)}
        const result = parseForkInitArgs(['--author=Ada', '--repo=alice/r', '--host=github-pages'])
        process.stdout.write(JSON.stringify(result))
      `
      const child = await runNode(['--input-type=module', '-e', probe])
      expect(child.code).toBe(0)
      const parsed = JSON.parse(child.stdout)
      expect(parsed.author).toBe('Ada')
      expect(parsed.repo).toBe('alice/r')
      expect(parsed.host).toBe('github-pages')
    } finally {
      await cleanupFixture(fixture)
    }
  })

  // S-10/P-24: an outer GIT_DIR must not leak into prepareDist's own `git rev-parse HEAD`.
  it('resolves the fixture\'s own HEAD even when the outer process has a stray GIT_DIR set', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    const previousGitDir = process.env.GIT_DIR
    try {
      const expectedHead = await headOf(fixture)
      process.env.GIT_DIR = '/nonexistent-gitdir-for-s10-test'

      await prepareDist({ root: fixture.createWxlDir, module: realModule })

      const source = JSON.parse(await readFile(join(fixture.createWxlDir, 'dist/source.json'), 'utf8'))
      expect(source.commit).toBe(expectedHead)
    } finally {
      if (previousGitDir === undefined) delete process.env.GIT_DIR
      else process.env.GIT_DIR = previousGitDir
      await cleanupFixture(fixture)
    }
  })

  // S-23: callers (buildRelease, check-publish.mjs) can read UPSTREAM_SLUG off prepareDist's own
  // return value instead of importing the freshly-written engine a second time themselves.
  it('resolves with the engine\'s own UPSTREAM_SLUG', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const result = await prepareDist({ root: fixture.createWxlDir, module: realModule })
      const source = JSON.parse(await readFile(join(fixture.createWxlDir, 'dist/source.json'), 'utf8'))
      expect(result.upstreamSlug).toBe(source.repository)
    } finally {
      await cleanupFixture(fixture)
    }
  })
})

describe('checkPublish', () => {
  it.each(['lightweight', 'annotated'])('passes when X1-X9 all hold (%s tag)', { timeout: 30000 }, async (tagKind) => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: tagKind })
      const stub = makePublishGitStub(fixture.env)

      const lsRemoteLines =
        tagKind === 'lightweight'
          ? [`${release.head}\trefs/tags/${release.tagName}`]
          : [`${release.tagObjectSha}\trefs/tags/${release.tagName}`, `${release.head}\trefs/tags/${release.tagName}^{}`]
      stub.setLsRemote(lsRemoteLines.join('\n') + '\n')
      const name = release.upstreamSlug.split('/')[1]

      for (const npmView of [async () => [], async () => ['Someone Else <someone@example.com>', 'Ada <ada@example.com>']]) {
        await expect(
          checkPublish({
            root: fixture.createWxlDir,
            module: realModule,
            runGit: stub.runGit,
            archive: () => gitArchiveOf(fixture, { name }),
            npmView,
            npmWhoami: async () => 'Ada',
          }),
          // S-29: `.resolves.toBeUndefined()` says directly what a successful `checkPublish`
          // call does (resolves with nothing); `.resolves.not.toThrow()` reads as if it were
          // asserting against a thrown value, not a resolved one.
        ).resolves.toBeUndefined()
      }

      const lsRemoteCall = stub.calls.find((call) => call.args[0] === 'ls-remote')
      expect(lsRemoteCall).toBeDefined()
      expect(lsRemoteCall.args).toEqual([
        'ls-remote',
        `https://github.com/${release.upstreamSlug}.git`,
        `refs/tags/${release.tagName}`,
        `refs/tags/${release.tagName}^{}`,
      ])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X1 when stripTypeScriptTypes is missing', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: {},
          runGit: stub.runGit,
          archive: async () => {
            throw new Error('X1 fails before archive is ever read')
          },
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X1'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    ['create-wxl ahead of root', { createWxl: '3.0.1', root: '3.0.0' }],
    ['both a pre-release', { createWxl: '3.0.0-rc.1', root: '3.0.0-rc.1' }],
  ])('fails naming X2 (%s)', { timeout: 30000 }, async (_label, versions) => {
    const fixture = await makePublishFixture()
    try {
      const mutate = async (f) => {
        const rootPkgPath = join(f.dir, 'package.json')
        const rootPkg = JSON.parse(await readFile(rootPkgPath, 'utf8'))
        rootPkg.version = versions.root
        await writeFile(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')

        const createWxlPkgPath = join(f.createWxlDir, 'package.json')
        const createWxlPkg = JSON.parse(await readFile(createWxlPkgPath, 'utf8'))
        createWxlPkg.version = versions.createWxl
        await writeFile(createWxlPkgPath, JSON.stringify(createWxlPkg, null, 2) + '\n')
      }
      const release = await buildRelease(fixture, { mutate, tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X2'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    ['no tag', undefined],
    ['lightweight tag on HEAD~1', 'lightweight'],
    ['annotated tag on HEAD~1', 'annotated'],
  ])('fails naming X3 (%s)', { timeout: 30000 }, async (_label, tagKind) => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: tagKind ?? 'none', at: tagKind ? 'HEAD~1' : 'HEAD', extraCommit: true })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      // X6 holds regardless (ls-remote reports the true HEAD), isolating X3 as the only failure.
      stub.setLsRemote(
        tagKind === 'annotated'
          ? `deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\trefs/tags/${release.tagName}\n${release.head}\trefs/tags/${release.tagName}^{}\n`
          : `${release.head}\trefs/tags/${release.tagName}\n`,
      )

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X3'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    ['untracked file under a new subdirectory', async (f) => mkdir(join(f.dir, 'newdir')).then(() => writeFile(join(f.dir, 'newdir/a.txt'), 'x'))],
    [
      'untracked file with status.showUntrackedFiles=no',
      async (f) => {
        await runFixtureGit(f, ['config', 'status.showUntrackedFiles', 'no'])
        await writeFile(join(f.dir, 'b.txt'), 'x')
      },
    ],
    ['a modified tracked file', async (f) => writeFile(join(f.dir, 'CHANGELOG.md'), 'modified\n')],
    [
      'a staged change',
      async (f) => {
        await writeFile(join(f.dir, 'CHANGELOG.md'), 'staged\n')
        await runFixtureGit(f, ['add', 'CHANGELOG.md'])
      },
    ],
  ])('fails naming X4 (%s)', { timeout: 30000 }, async (_label, dirty) => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      await dirty(fixture)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X4'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    ['a range operator', (patch) => `^${patch}`],
    ['exact but not equal to the lockfile', (patch) => patch.replace(/\d+$/, (n) => String(Number(n) + 1))],
  ])('fails naming X5 (%s)', { timeout: 30000 }, async (_label, deriveBadVersion) => {
    const fixture = await makePublishFixture()
    try {
      const mutate = async (f) => {
        // P-26/S-29: parsed with `yaml`, reading `importers['.']` across all three dependency
        // sections -- the same way production (`resolvedLockfileVersion`, src/publish.mjs)
        // resolves it -- instead of a regex that happens to match today's single-importer
        // lockfile but would not generalise the way production does.
        const lockfileDoc = parseYaml(await readFile(join(f.dir, 'pnpm-lock.yaml'), 'utf8'))
        const importer = lockfileDoc.importers['.']
        let resolvedYamlVersion
        for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
          const entry = importer?.[section]?.yaml
          if (entry?.version) {
            resolvedYamlVersion = entry.version.replace(/\(.*\)$/, '')
            break
          }
        }
        if (!resolvedYamlVersion) throw new Error('could not find the root importer\'s yaml entry')
        const createWxlPkgPath = join(f.createWxlDir, 'package.json')
        const createWxlPkg = JSON.parse(await readFile(createWxlPkgPath, 'utf8'))
        createWxlPkg.dependencies.yaml = deriveBadVersion(resolvedYamlVersion)
        await writeFile(createWxlPkgPath, JSON.stringify(createWxlPkg, null, 2) + '\n')
      }
      const release = await buildRelease(fixture, { mutate, tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X5'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    ['empty (not pushed upstream)', 'lightweight', () => ''],
    ['lightweight pointing elsewhere', 'lightweight', (tagName) => `deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\trefs/tags/${tagName}\n`],
    [
      'annotated: plain line happens to equal HEAD, ^{} line elsewhere',
      'annotated',
      (tagName, head) => `${head}\trefs/tags/${tagName}\ndeadbeefdeadbeefdeadbeefdeadbeefdeadbeef\trefs/tags/${tagName}^{}\n`,
    ],
    [
      'annotated: ^{} line elsewhere, plain line the tag object sha',
      'annotated',
      (tagName, _head, tagObjectSha) =>
        `${tagObjectSha}\trefs/tags/${tagName}\ndeadbeefdeadbeefdeadbeefdeadbeefdeadbeef\trefs/tags/${tagName}^{}\n`,
    ],
  ])('fails naming X6 (%s)', { timeout: 30000 }, async (_label, tagKind, lsRemoteFor) => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: tagKind })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(lsRemoteFor(release.tagName, release.head, release.tagObjectSha))

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X6'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X7 (a symbolic link entry, with the P1-P4 files otherwise present)', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      const prefix = `${name}-${release.head}/`
      // P-02: the hostile archive must carry everything P1-P4 need (otherwise the test would pass
      // for the wrong reason -- rule 5's "no file" or a pristine-rule failure -- without ever
      // reaching rule 1's symlink check).
      const pristineEntries = [
        { path: prefix, type: 'dir', mode: 0o755 },
        { path: `${prefix}CHANGELOG.md`, type: 'file', mode: 0o644, content: '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n' },
        { path: `${prefix}.proj.specs/`, type: 'dir', mode: 0o755 },
        {
          path: `${prefix}.proj.specs/OPEN-QUESTIONS.md`,
          type: 'file',
          mode: 0o644,
          content: '# Open Questions\n\nTrack here.\n\n---\n\n## OQ-001 — Example?\n',
        },
        { path: `${prefix}package.json`, type: 'file', mode: 0o644, content: JSON.stringify({ name: 'x', version: '1.0.0' }) + '\n' },
      ]
      const hostileRawArchive = buildArchiveRaw(
        [...pristineEntries, { path: `${prefix}evil-link`, type: 'symlink', mode: 0o777, linkpath: 'elsewhere' }],
        { comment: release.head },
      )

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: async () => hostileRawArchive,
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X7'])

      // Control: the SAME archive, minus the symlink, passes entirely (proving the failure above
      // really is the symlink, not something else about this hand-built archive).
      const cleanRawArchive = buildArchiveRaw(pristineEntries, { comment: release.head })
      await expect(
        checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: async () => cleanRawArchive,
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        }),
      ).resolves.toBeUndefined()
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X7 (the real archive is missing the P1 marker)', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const mutate = async (f) => {
        const changelogPath = join(f.dir, 'CHANGELOG.md')
        const content = await readFile(changelogPath, 'utf8')
        await writeFile(changelogPath, content.replace('## [Unreleased]\n', ''))
      }
      const release = await buildRelease(fixture, { mutate, tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X7'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it.each([
    [
      'dist/source.json commit changed',
      async (f) => {
        const sourcePath = join(f.createWxlDir, 'dist/source.json')
        const source = JSON.parse(await readFile(sourcePath, 'utf8'))
        source.commit = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
        await writeFile(sourcePath, JSON.stringify(source, null, 2) + '\n')
      },
    ],
    [
      'dist/fork-init.mjs altered after the fact',
      async (f) => {
        const enginePath = join(f.createWxlDir, 'dist/fork-init.mjs')
        await writeFile(enginePath, (await readFile(enginePath, 'utf8')) + '\n// altered\n')
      },
    ],
    [
      'LICENSE gains a character',
      async (f) => {
        const licensePath = join(f.createWxlDir, 'LICENSE')
        await writeFile(licensePath, (await readFile(licensePath, 'utf8')) + 'x')
      },
    ],
  ])('fails naming X8 (%s)', { timeout: 30000 }, async (_label, tamper) => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      await tamper(fixture)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X8'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X9 when the npm name is already maintained by someone else', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => ['someone-else <someone@example.com>'],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X9'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  // Stage 6/7 fix assignment section A (S-06/P-06/P-07/P-09/P-25/S-07/C-10): every X maps its own
  // failures to its id and never crashes.
  it('fails naming X8 when dist/ is missing entirely (the engine cannot be imported)', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      await rm(join(fixture.createWxlDir, 'dist'), { recursive: true, force: true })

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X8'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X8 when the package LICENSE is missing', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      await rm(join(fixture.createWxlDir, 'LICENSE'), { force: true })

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X8'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X8 when dist/source.json parses to null', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      await writeFile(join(fixture.createWxlDir, 'dist/source.json'), 'null')

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X8'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X4 when git status itself exits non-zero', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      const realRunGit = stub.runGit
      const runGit = async (args, opts) => {
        if (args[0] === 'status') return { code: 128, stdout: '', stderr: 'fatal: index file corrupt' }
        return realRunGit(args, opts)
      }

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => [],
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X4'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('fails naming X9 when npmWhoami itself fails', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => ['someone-else <someone@example.com>'],
          npmWhoami: async () => {
            throw new Error('not logged in')
          },
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X9'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  // S-05/P-08/C-02: npmView failing for a reason OTHER than "unpublished" (a network error, a
  // registry 5xx) must fail X9, not be silently treated as an empty maintainer list.
  it('fails naming X9 when npmView itself fails (not E404)', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      let thrown
      try {
        await checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          npmView: async () => {
            throw new Error('npm view failed (not E404): network timeout')
          },
          npmWhoami: async () => 'Ada',
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeDefined()
      expect(thrown.checks).toEqual(['X9'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  // S-24: `archive` takes the commit and name `checkPublish` already resolved, instead of
  // re-deriving them with its own `git rev-parse HEAD` and engine import.
  it('calls archive() with the already-resolved commit and name, not a second derivation', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      const archiveCalls = []
      const archive = async (args) => {
        archiveCalls.push(args)
        return gitArchiveOf(fixture, { name: args.name, ref: args.commit })
      }

      await checkPublish({
        root: fixture.createWxlDir,
        module: realModule,
        runGit: stub.runGit,
        archive,
        npmView: async () => [],
        npmWhoami: async () => 'Ada',
      })

      expect(archiveCalls).toEqual([{ commit: release.head, name }])
    } finally {
      await cleanupFixture(fixture)
    }
  })
})
