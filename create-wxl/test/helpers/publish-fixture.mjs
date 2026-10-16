// Fixture builder for 0005-S2 (`publish.test.mjs`): a temporary git repository holding real-file
// copies of the files `prepareDist`/`checkPublish` read (T-0025 ticket Notes, "S2 fixture"):
// both manifests, both `.gitignore` files, `LICENSE`, the engine, the root `pnpm-lock.yaml`,
// `CHANGELOG.md` and `.proj.specs/OPEN-QUESTIONS.md`. `create-wxl/node_modules` is linked to the
// real one (so the generated engine resolves `yaml`), excluded through `.git/info/exclude` rather
// than a tracked `.gitignore` entry (the Notes' trap: `node_modules/` only matches a directory,
// not a symlink, and the link would otherwise make X4 ("working tree clean") fail on the "all
// checks hold" fixture). Git runs with an isolated `HOME`/`XDG_CONFIG_HOME`/`PATH` and
// `GIT_CONFIG_NOSYSTEM=1`, never inheriting the real environment's git configuration.

import { mkdir, writeFile, readFile, cp, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as realModule from 'node:module'
import { prepareDist } from '../../src/publish.mjs'
import { makeTmpRoot } from './tmp.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const REAL_CREATE_WXL_NODE_MODULES = fileURLToPath(new URL('../../node_modules', import.meta.url))

const IDENTITY = ['-c', 'user.name=WXL Fixture', '-c', 'user.email=fixture@example.invalid']

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
  if (result.code !== 0) {
    throw new Error(`git ${args.join(' ')} (in ${dir}) failed: ${result.stderr || result.stdout}`)
  }
  return result.stdout
}

/** Captures stdout as a `Buffer` (not decoded text): needed for `git archive`'s binary tar
 * output, which `spawnGit`'s string concatenation would otherwise corrupt. */
function spawnGitBuffer(args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, env, shell: false })
    const chunks = []
    let stderr = ''
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`git ${args.join(' ')} failed: ${stderr}`))
      else resolvePromise(Buffer.concat(chunks))
    })
  })
}

/** The real `git archive --prefix=<name>-<ref>/ <ref>` bytes (uncompressed tar, X7's own input
 * shape): `name` is the UPSTREAM_SLUG's second half, matching what `checkPublish` itself derives. */
export async function gitArchiveOf(fixture, { name, ref = 'HEAD' }) {
  const resolvedRef = await headOf(fixture, ref)
  return spawnGitBuffer(['archive', `--prefix=${name}-${resolvedRef}/`, resolvedRef], {
    cwd: fixture.dir,
    env: fixture.env,
  })
}

/** Builds one fresh fixture repository, with one initial commit on `main`. */
export async function makePublishFixture() {
  const dir = await makeTmpRoot('create-wxl-publish-')
  const home = await makeTmpRoot('create-wxl-publish-home-')
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: home,
    PATH: process.env.PATH,
    GIT_CONFIG_NOSYSTEM: '1',
    // P-24: Git for Windows needs SystemRoot (crypto/network DLL lookups); without it some git
    // operations can fail there. No-op on other platforms (process.env.SystemRoot is undefined).
    ...(process.platform === 'win32' && process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  }

  await mkdir(join(dir, 'create-wxl'), { recursive: true })
  await mkdir(join(dir, 'scripts'), { recursive: true })
  await mkdir(join(dir, '.proj.specs'), { recursive: true })

  await cp(join(REPO_ROOT, 'package.json'), join(dir, 'package.json'))
  await cp(join(REPO_ROOT, 'pnpm-lock.yaml'), join(dir, 'pnpm-lock.yaml'))
  await cp(join(REPO_ROOT, '.gitignore'), join(dir, '.gitignore'))
  await cp(join(REPO_ROOT, 'LICENSE'), join(dir, 'LICENSE'))
  await cp(join(REPO_ROOT, 'CHANGELOG.md'), join(dir, 'CHANGELOG.md'))
  await cp(join(REPO_ROOT, '.proj.specs/OPEN-QUESTIONS.md'), join(dir, '.proj.specs/OPEN-QUESTIONS.md'))
  await cp(join(REPO_ROOT, 'scripts/fork-init.ts'), join(dir, 'scripts/fork-init.ts'))
  await cp(join(REPO_ROOT, 'create-wxl/package.json'), join(dir, 'create-wxl/package.json'))
  await cp(join(REPO_ROOT, 'create-wxl/.gitignore'), join(dir, 'create-wxl/.gitignore'))

  try {
    await symlink(REAL_CREATE_WXL_NODE_MODULES, join(dir, 'create-wxl/node_modules'), 'junction')
  } catch {
    await symlink(REAL_CREATE_WXL_NODE_MODULES, join(dir, 'create-wxl/node_modules'))
  }

  await git(dir, env, ['init', '-q', '-b', 'main'])
  await writeFile(join(dir, '.git/info/exclude'), 'node_modules\n')
  await git(dir, env, ['add', '-A'])
  await git(dir, env, [...IDENTITY, 'commit', '-q', '--no-verify', '-m', 'initial'])

  return { dir, env, home, createWxlDir: join(dir, 'create-wxl') }
}

/** Stages and commits everything currently on disk; returns the new HEAD. */
export async function commitAll(fixture, message = 'update') {
  await git(fixture.dir, fixture.env, ['add', '-A'])
  await git(fixture.dir, fixture.env, [...IDENTITY, 'commit', '-q', '--no-verify', '-m', message])
  return headOf(fixture)
}

export async function headOf(fixture, ref = 'HEAD') {
  const out = await git(fixture.dir, fixture.env, ['rev-parse', ref])
  return out.trim()
}

export async function tagLightweight(fixture, name, ref = 'HEAD') {
  await git(fixture.dir, fixture.env, ['tag', name, ref])
}

/** Returns the annotated tag's OWN object sha (not the commit it points at). */
export async function tagAnnotated(fixture, name, ref = 'HEAD') {
  await git(fixture.dir, fixture.env, [...IDENTITY, 'tag', '-a', name, '-m', name, ref])
  return headOf(fixture, name)
}

export async function runFixtureGit(fixture, args) {
  return spawnGit(args, { cwd: fixture.dir, env: fixture.env })
}

export async function cleanupFixture(fixture) {
  await rm(fixture.dir, { recursive: true, force: true })
  if (fixture.home) await rm(fixture.home, { recursive: true, force: true })
}

async function isWorkingTreeDirty(fixture) {
  const result = await spawnGit(['status', '--porcelain', '--untracked-files=all'], { cwd: fixture.dir, env: fixture.env })
  return result.stdout !== ''
}

/**
 * The `checkPublish` fixture builder every `it.each` row of `publish.test.mjs`'s `checkPublish`
 * describe is built on (T-0025 ticket Notes): optionally mutates the fixture tree, commits
 * anything that changed, tags `HEAD` (`v<rootVersion>`, lightweight or annotated), and runs
 * `prepareDist` so `dist/` matches the tagged commit. Returns the resulting `HEAD`, the root
 * manifest's `version`, and (for an annotated tag) the tag object's own sha.
 */
export async function buildRelease(fixture, { mutate, tag = 'lightweight', at = 'HEAD', extraCommit = false } = {}) {
  if (mutate) await mutate(fixture)
  if (extraCommit) await writeFile(join(fixture.dir, '.release-marker'), String(Math.random()))
  if (await isWorkingTreeDirty(fixture)) await commitAll(fixture, 'release')

  const head = await headOf(fixture, at)
  const rootPkg = JSON.parse(await readFile(join(fixture.dir, 'package.json'), 'utf8'))
  const version = rootPkg.version
  const tagName = `v${version}`

  let tagObjectSha
  if (tag === 'lightweight') {
    await tagLightweight(fixture, tagName, at)
  } else if (tag === 'annotated') {
    tagObjectSha = await tagAnnotated(fixture, tagName, at)
  }

  const { upstreamSlug } = await prepareDist({ root: fixture.createWxlDir, module: realModule })

  return { head: await headOf(fixture, 'HEAD'), taggedCommit: head, version, tagName, tagObjectSha, upstreamSlug }
}
