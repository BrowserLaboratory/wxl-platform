// Stage 6/7 fix assignment section A (S-05/P-08/C-02, P-23, S-24, S-08/S-09): the real IO
// `scripts/check-publish.mjs` wires into `checkPublish` (`npm view`'s E404-only mapping, the
// platform-correct npm binary name, and a shared, UTF-8-safe spawn capture), kept testable in
// `src/` so the script itself stays a thin wiring layer with no logic of its own.

import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import * as tar from 'tar'
import { parseNpmViewMaintainers, npmCommand, createArchive } from '../src/publish-io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'

function spawnGit(args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, env, shell: false })
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

async function git(dir, env, args) {
  const result = await spawnGit(args, { cwd: dir, env })
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} (in ${dir}) failed: ${result.stderr || result.stdout}`)
  return result.stdout
}

/** Lists a tar buffer's entry paths (`tar.list`'s `onReadEntry`, fed the buffer directly instead
 * of a file -- `git archive`'s output never touches disk here). */
function listTarPaths(buffer) {
  return new Promise((resolvePromise, reject) => {
    const paths = []
    const parser = tar.list({ onReadEntry: (entry) => paths.push(entry.path) })
    parser.on('end', () => resolvePromise(paths))
    parser.on('error', reject)
    parser.end(buffer)
  })
}

/** A temporary git repository with a top-level file and its own subfolder `pkg/` (holding a
 * second file), committed on `main` -- isolated `HOME`/`XDG_CONFIG_HOME`/`GIT_CONFIG_NOSYSTEM=1`
 * so the real `$HOME`'s own git config can never leak in, and the commit itself passes
 * `-c user.name=.../-c user.email=.../-c commit.gpgsign=false` so no real identity or signing key
 * is required. */
async function makeRepoWithPackageSubdir() {
  const repoDir = await makeTmpRoot('create-wxl-archive-root-')
  const home = await makeTmpRoot('create-wxl-archive-home-')
  const env = { HOME: home, XDG_CONFIG_HOME: home, PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' }

  const pkgDir = join(repoDir, 'pkg')
  await mkdir(pkgDir, { recursive: true })
  await writeFile(join(repoDir, 'top-level.txt'), 'top-level\n')
  await writeFile(join(pkgDir, 'sub.txt'), 'sub\n')

  await git(repoDir, env, ['init', '-q', '-b', 'main'])
  await git(repoDir, env, ['add', '-A'])
  await git(repoDir, env, [
    '-c',
    'user.name=WXL Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-q',
    '-m',
    'initial',
  ])

  return {
    repoDir,
    pkgDir,
    async commit() {
      const out = await git(repoDir, env, ['rev-parse', 'HEAD'])
      return out.trim()
    },
    async cleanup() {
      await rm(repoDir, { recursive: true, force: true })
      await rm(home, { recursive: true, force: true })
    },
  }
}

describe('parseNpmViewMaintainers', () => {
  it('returns [] on an E404 (the name is unpublished)', () => {
    const result = { code: 1, stdout: '', stderr: 'npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/create-wxl\n' }
    expect(parseNpmViewMaintainers(result)).toEqual([])
  })

  it('throws on a non-zero exit that is not E404 (a network error, a registry failure, ...)', () => {
    const result = { code: 1, stdout: '', stderr: 'npm error code ETIMEDOUT\nnpm error network request to https://registry.npmjs.org/create-wxl failed\n' }
    expect(() => parseNpmViewMaintainers(result)).toThrow()
  })

  it('returns the parsed array for multiple maintainers', () => {
    const result = { code: 0, stdout: '["Ada <ada@example.com>","Bea <bea@example.com>"]\n', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual(['Ada <ada@example.com>', 'Bea <bea@example.com>'])
  })

  it('normalises a single maintainer (npm prints a bare string, not a one-item array)', () => {
    const result = { code: 0, stdout: '"Ada <ada@example.com>"\n', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual(['Ada <ada@example.com>'])
  })

  it('returns [] for empty output', () => {
    const result = { code: 0, stdout: '', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual([])
  })
})

describe('createArchive', () => {
  // X7's real defect: `git archive` run with `cwd: root` set to the package subdirectory
  // archives only that subdirectory's own subtree (git's documented behaviour), silently
  // dropping everything else the repository tracks -- the package folder itself can be
  // `export-ignore`d, which empties the archive entirely.
  it('archives the whole repository tree, not just the package subdirectory passed as root', async () => {
    const repo = await makeRepoWithPackageSubdir()
    try {
      const commit = await repo.commit()
      const archive = createArchive({ root: repo.pkgDir })
      const buffer = await archive({ commit, name: 'pkg' })
      const paths = await listTarPaths(buffer)

      const prefix = `pkg-${commit}/`
      expect(paths).toContain(`${prefix}top-level.txt`)
      expect(paths).toContain(`${prefix}pkg/sub.txt`)
    } finally {
      await repo.cleanup()
    }
  })
})

describe('npmCommand', () => {
  it('is npm.cmd on win32 (bare `npm` is a .cmd shim there; spawning it without a shell ENOENTs)', () => {
    expect(npmCommand('win32')).toBe('npm.cmd')
  })

  it('is npm elsewhere', () => {
    expect(npmCommand('darwin')).toBe('npm')
    expect(npmCommand('linux')).toBe('npm')
  })
})
