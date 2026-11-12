// 0005-S2 ("Package and publishing", traceability.md): `prepareDist` builds the type-stripped
// engine, the package source record and the `LICENSE` copy; `checkPublish` (X1-X9) refuses a
// release that does not match upstream's pushed tag; its X9 is spec 0009's (K1-K4 against the
// injected `env`). Deviation from T-0025's approved test plan table
// (recorded in T-0025's "increment plan confirmed" comment): this file is `.mjs`, not `.ts` --
// vitest's `include` (`vitest.config.mjs:6`) only collects `test/**/*.test.mjs`.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import * as realModule from 'node:module'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { prepareDist, checkPublish, CHECK_EXPLANATIONS, PublishError } from '../src/publish.mjs'
import {
  makePublishFixture,
  cleanupFixture,
  headOf,
  buildRelease,
  gitArchiveOf,
  runFixtureGit,
  cloneDetachedAtTag,
  cleanupClone,
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

/** An `env` in which 0009's K1-K4 all hold for `release` (traceability.md 0009 "The new X9"):
 * upstream's `publish-npm.yml` running for tag `v<V>`. The slug comes from the engine through
 * `buildRelease`, never spelled here (0005's Seams note). */
function upstreamEnv(release) {
  return {
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: release.upstreamSlug,
    GITHUB_WORKFLOW_REF: `${release.upstreamSlug}/.github/workflows/publish-npm.yml@refs/tags/v${release.version}`,
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.example.invalid/request',
  }
}

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

      await expect(
        checkPublish({
          root: fixture.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(fixture, { name }),
          env: upstreamEnv(release),
        }),
        // S-29: `.resolves.toBeUndefined()` says directly what a successful `checkPublish`
        // call does (resolves with nothing); `.resolves.not.toThrow()` reads as if it were
        // asserting against a thrown value, not a resolved one.
      ).resolves.toBeUndefined()

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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
          env: upstreamEnv(release),
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
        env: upstreamEnv(release),
      })

      expect(archiveCalls).toEqual([{ commit: release.head, name }])
    } finally {
      await cleanupFixture(fixture)
    }
  })
})

// 0009-S1 (spec 0009 traceability.md "The new X9"): X9 holds when K1-K4 hold, read from the
// injected `env`, and otherwise throws `['X9']` with message XM naming the first failing condition.
// One fixture serves every row (approved test plan): X1-X8 hold throughout, so only `env` varies.
// Rows therefore never mutate the fixture and never read `stub.calls`, which accumulates.
describe('checkPublish X9 (0009 K1-K4)', () => {
  let fixture
  let release
  let stub
  let name

  beforeAll(async () => {
    fixture = await makePublishFixture()
    release = await buildRelease(fixture, { tag: 'lightweight' })
    name = release.upstreamSlug.split('/')[1]
    stub = makePublishGitStub(fixture.env)
    stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)
  }, 30000)

  afterAll(async () => {
    if (fixture) await cleanupFixture(fixture)
  })

  async function thrownFor(env) {
    try {
      await checkPublish({
        root: fixture.createWxlDir,
        module: realModule,
        runGit: stub.runGit,
        archive: () => gitArchiveOf(fixture, { name }),
        env,
      })
    } catch (err) {
      return err
    }
    return undefined
  }

  /** XM, transcribed from traceability.md ("The new X9") rather than built the way the code builds it. */
  function xm(n, cause, saw) {
    return (
      `X9 (K${n}: ${cause}; saw ${saw}). create-wxl is published only by the upstream repository's ` +
      `publish-npm.yml workflow when tag v${release.version} is pushed, and is then approved on npmjs.com.`
    )
  }

  const K1_CAUSE = 'GITHUB_ACTIONS is not "true"'

  // K02
  it.each([
    ['unset', undefined, 'unset'],
    ['empty', '', '""'],
    ['false', 'false', '"false"'],
    ['upper case', 'TRUE', '"TRUE"'],
    ['trailing space', 'true ', '"true "'],
    ['the boolean true (not a string, so unset)', true, 'unset'],
  ])('K1 fails: GITHUB_ACTIONS %s', { timeout: 30000 }, async (_label, value, saw) => {
    const env = upstreamEnv(release)
    if (value === undefined) delete env.GITHUB_ACTIONS
    else env.GITHUB_ACTIONS = value

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(1, K1_CAUSE, saw))
  })

  const K2_CAUSE = 'GITHUB_REPOSITORY is not the upstream repository'

  // K03: the slug variants are derived from the engine's own slug, never spelled here.
  it.each([
    ['unset', () => undefined, () => 'unset'],
    ['empty', () => '', () => '""'],
    ['another repository', () => 'someone/fork', () => '"someone/fork"'],
    ['the slug in lower case (compared case-sensitively)', (slug) => slug.toLowerCase(), (slug) => `"${slug.toLowerCase()}"`],
    ['a number (not a string, so unset)', () => 42, () => 'unset'],
  ])('K2 fails: GITHUB_REPOSITORY %s', { timeout: 30000 }, async (_label, valueOf, sawOf) => {
    const env = upstreamEnv(release)
    const value = valueOf(release.upstreamSlug)
    if (value === undefined) delete env.GITHUB_REPOSITORY
    else env.GITHUB_REPOSITORY = value

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(2, K2_CAUSE, sawOf(release.upstreamSlug)))
  })

  const K3_CAUSE = "GITHUB_WORKFLOW_REF is not this version's publish workflow"

  // K04
  it.each([
    ['unset', () => undefined],
    ['empty', () => ''],
    ['release.yml at the tag', (slug, v) => `${slug}/.github/workflows/release.yml@refs/tags/v${v}`],
    ['publish-npm.yml on main', (slug) => `${slug}/.github/workflows/publish-npm.yml@refs/heads/main`],
    ['publish-npm.yml at another version', (slug) => `${slug}/.github/workflows/publish-npm.yml@refs/tags/v0.0.1`],
    ["another repository's publish-npm.yml", (_slug, v) => `someone/fork/.github/workflows/publish-npm.yml@refs/tags/v${v}`],
    ['a boolean (not a string, so unset)', () => true],
  ])('K3 fails: GITHUB_WORKFLOW_REF %s', { timeout: 30000 }, async (_label, valueOf) => {
    const env = upstreamEnv(release)
    const value = valueOf(release.upstreamSlug, release.version)
    if (value === undefined) delete env.GITHUB_WORKFLOW_REF
    else env.GITHUB_WORKFLOW_REF = value

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(3, K3_CAUSE, typeof value === 'string' ? `"${value}"` : 'unset'))
  })

  const K4_CAUSE = 'ACTIONS_ID_TOKEN_REQUEST_URL is not set (the job needs id-token: write)'

  // K05
  it.each([
    ['unset', undefined, 'unset'],
    ['empty', '', '""'],
    ['only spaces', '  ', '"  "'],
    ['only a newline (the message stays one line)', '\n', '"\\n"'],
    ['a number (not a string, so unset)', 7, 'unset'],
  ])('K4 fails: ACTIONS_ID_TOKEN_REQUEST_URL %s', { timeout: 30000 }, async (_label, value, saw) => {
    const env = upstreamEnv(release)
    if (value === undefined) delete env.ACTIONS_ID_TOKEN_REQUEST_URL
    else env.ACTIONS_ID_TOKEN_REQUEST_URL = value

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(4, K4_CAUSE, saw))
    expect(thrown.message).not.toContain('\n')
  })

  // K06: every unusable `env` reads as empty, so X9 names K1 with `unset`, and the message ends
  // with the closing sentence, the version substituted.
  it.each([
    ['{}', () => ({})],
    ['undefined', () => undefined],
    ['null', () => null],
    ['a string', () => 'GITHUB_ACTIONS=true'],
    ['an array, even one carrying K1-K4 as own properties', (r) => Object.assign([], upstreamEnv(r))],
    ['an object inheriting K1-K4 through its prototype', (r) => Object.create(upstreamEnv(r))],
  ])('K1 fails with unset when env is %s', { timeout: 30000 }, async (_label, envOf) => {
    const thrown = await thrownFor(envOf(release))

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(1, K1_CAUSE, 'unset'))
    expect(
      thrown.message.endsWith(
        `create-wxl is published only by the upstream repository's publish-npm.yml workflow when tag v${release.version} is pushed, and is then approved on npmjs.com.`,
      ),
    ).toBe(true)
  })

  // K06, stage 6 (T0069-SPEC-14): `env` left out of the call altogether is missing too.
  it('K1 fails with unset when the env property is omitted', { timeout: 30000 }, async () => {
    const thrown = await checkPublish({
      root: fixture.createWxlDir,
      module: realModule,
      runGit: stub.runGit,
      archive: () => gitArchiveOf(fixture, { name }),
    }).catch((err) => err)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(1, K1_CAUSE, 'unset'))
  })

  // Stage 6 (T0069-SPEC-05): a variable whose read throws has no string value, so it is unset, and
  // X9 still throws its own PublishError rather than the getter's error.
  it('K1 fails with unset when reading GITHUB_ACTIONS throws', { timeout: 30000 }, async () => {
    const env = upstreamEnv(release)
    Object.defineProperty(env, 'GITHUB_ACTIONS', {
      enumerable: true,
      get() {
        throw new Error('hostile getter')
      },
    })

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(1, K1_CAUSE, 'unset'))
  })

  // K07
  it('names only the first failing condition, in K1-K4 order', { timeout: 30000 }, async () => {
    const env = { ...upstreamEnv(release), GITHUB_ACTIONS: 'false', GITHUB_WORKFLOW_REF: 'elsewhere' }

    const thrown = await thrownFor(env)

    expect(thrown?.checks).toEqual(['X9'])
    expect(thrown.message).toBe(xm(1, K1_CAUSE, '"false"'))
    expect(thrown.message).not.toContain(K3_CAUSE)
  })

  // K09: `checkPublish` no longer takes `npmView`/`npmWhoami`; passing them changes nothing.
  it('ignores npmView and npmWhoami passed in addition', { timeout: 30000 }, async () => {
    const called = []
    await expect(
      checkPublish({
        root: fixture.createWxlDir,
        module: realModule,
        runGit: stub.runGit,
        archive: () => gitArchiveOf(fixture, { name }),
        env: upstreamEnv(release),
        npmView: async () => {
          called.push('npmView')
          throw new Error('npmView must not be called')
        },
        npmWhoami: async () => {
          called.push('npmWhoami')
          throw new Error('npmWhoami must not be called')
        },
      }),
    ).resolves.toBeUndefined()
    expect(called).toEqual([])
  })
})

// 0009-S1 K08: an X1-X8 violation is thrown before X9, even with every K1-K4 condition violated.
describe('checkPublish X1-X8 before X9 (0009 K08)', () => {
  it('throws X1, not X9, when stripTypeScriptTypes is missing and env is empty', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)

      const thrown = await checkPublish({
        root: fixture.createWxlDir,
        module: {},
        runGit: stub.runGit,
        archive: () => gitArchiveOf(fixture, { name }),
        env: {},
      }).catch((err) => err)

      expect(thrown?.checks).toEqual(['X1'])
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('throws X8, not X9, when dist/source.json is tampered with and env is empty', { timeout: 30000 }, async () => {
    const fixture = await makePublishFixture()
    try {
      const release = await buildRelease(fixture, { tag: 'lightweight' })
      const name = release.upstreamSlug.split('/')[1]
      const stub = makePublishGitStub(fixture.env)
      stub.setLsRemote(`${release.head}\trefs/tags/${release.tagName}\n`)
      const sourcePath = join(fixture.createWxlDir, 'dist/source.json')
      const source = JSON.parse(await readFile(sourcePath, 'utf8'))
      source.commit = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      await writeFile(sourcePath, JSON.stringify(source, null, 2) + '\n')

      const thrown = await checkPublish({
        root: fixture.createWxlDir,
        module: realModule,
        runGit: stub.runGit,
        archive: () => gitArchiveOf(fixture, { name }),
        env: {},
      }).catch((err) => err)

      expect(thrown?.checks).toEqual(['X8'])
    } finally {
      await cleanupFixture(fixture)
    }
  })
})

// 0009-S1 K13: the default explanation, used only when a PublishError is built without a message.
describe('X9 default explanation (0009 K13)', () => {
  it('reads as the CI-environment check and builds the default message from it', () => {
    expect(CHECK_EXPLANATIONS.X9).toBe('not running in the upstream publish workflow for this version')
    expect(new PublishError(['X9']).message).toBe('X9 (not running in the upstream publish workflow for this version)')
  })
})

// 0009-S1 K11 (static): the wiring passes `process.env`, and the npm helpers are gone with their
// tests (spec 0009 D2).
describe('publish wiring without npm (0009 K11)', () => {
  const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

  // A whole code line, not a substring, so a comment or `env: process.envX` cannot satisfy it.
  it('check-publish.mjs passes env: process.env', async () => {
    const lines = (await read('../scripts/check-publish.mjs')).split('\n').map((line) => line.trim())
    expect(lines).toContain('env: process.env,')
  })

  it('publish-io.mjs exports exactly the four remaining functions', async () => {
    const io = await import('../src/publish-io.mjs')
    expect(Object.keys(io).sort()).toEqual(['createArchive', 'gitRevParseHead', 'spawnCapture', 'spawnCaptureBytes'])
  })

  it.each(['../src/publish.mjs', '../src/publish-io.mjs', '../scripts/check-publish.mjs'])(
    '%s names no npm helper',
    async (relative) => {
      const text = await read(relative)
      for (const banned of ['npmCommand', "'npm'", 'npm.cmd', 'npmView', 'npmWhoami']) {
        expect(text, banned).not.toContain(banned)
      }
    },
  )

  it('publish-io.test.mjs names none of the removed exports', async () => {
    const text = await read('./publish-io.test.mjs')
    for (const removed of ['npmCommand', 'parseNpmViewMaintainers', 'createNpmView', 'createNpmWhoami']) {
      expect(text, removed).not.toContain(removed)
    }
  })
})

// 0009-S1 K12: the publish workflow's checkout (`fetch-depth: 0`, detached at the pushed tag, with
// `origin/main` present) keeps X3, X4, X6 and X7 holding, whether the local tag arrived annotated
// or lightweight; GitHub's `ls-remote` reports the annotated tag either way.
describe('checkPublish on the CI checkout shape (0009 K12)', () => {
  it.each([
    ['(a) the local tag annotated', 'annotated'],
    ['(b) the local tag lightweight, ls-remote reporting it annotated', 'lightweight'],
  ])('passes on a full clone detached at the tag: %s', { timeout: 60000 }, async (_label, localTag) => {
    const fixture = await makePublishFixture()
    let clone
    try {
      const release = await buildRelease(fixture, { tag: 'annotated' })
      clone = await cloneDetachedAtTag(fixture, release.tagName, { localTag })

      expect((await runFixtureGit(clone, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main'])).code).toBe(0)
      expect((await runFixtureGit(clone, ['symbolic-ref', '-q', 'HEAD'])).code).not.toBe(0)
      expect((await runFixtureGit(clone, ['cat-file', '-t', `refs/tags/${release.tagName}`])).stdout.trim()).toBe(
        localTag === 'annotated' ? 'tag' : 'commit',
      )

      await prepareDist({ root: clone.createWxlDir, module: realModule })
      const stub = makePublishGitStub(clone.env)
      stub.setLsRemote(
        `${release.tagObjectSha}\trefs/tags/${release.tagName}\n${release.head}\trefs/tags/${release.tagName}^{}\n`,
      )
      const name = release.upstreamSlug.split('/')[1]

      await expect(
        checkPublish({
          root: clone.createWxlDir,
          module: realModule,
          runGit: stub.runGit,
          archive: () => gitArchiveOf(clone, { name }),
          env: upstreamEnv(release),
        }),
      ).resolves.toBeUndefined()
    } finally {
      if (clone) await cleanupClone(clone)
      await cleanupFixture(fixture)
    }
  })
})
