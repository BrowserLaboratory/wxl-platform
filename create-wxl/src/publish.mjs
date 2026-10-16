// "Package and publishing" (traceability.md 0005-S2): `prepareDist` carries the type-stripped
// engine, the package source record and `LICENSE` into `dist/`; `checkPublish` (X1-X9) refuses a
// release that does not match upstream's pushed tag.

import { rm, mkdir, readFile, writeFile, cp, mkdtemp } from 'node:fs/promises'
import * as fsp from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { parse as parseYaml } from 'yaml'
import { parseArchive, ArchiveParseError } from './archive.mjs'
import { checkEntryRules, ArchiveRuleError } from './archive-rules.mjs'
import { extractEntries } from './fsops.mjs'
import { applyChangelog, applyOpenQuestions, applyPackageJson, writeRangeJson, PristineError } from './pristine.mjs'
import { gitRevParseHead } from './publish-io.mjs'

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

function looksGzip(buf) {
  return buf.length >= 2 && buf[0] === GZIP_MAGIC_0 && buf[1] === GZIP_MAGIC_1
}

/** A cache-busting dynamic import: the same `path` can be (re)written with different content
 * across a test file's several scenarios (`buildRelease`-style fixtures), and Node's ESM import
 * cache is keyed on the specifier string, not the file's mtime -- without a unique query string
 * each re-import after a rewrite would silently return the stale module. */
function importFresh(path) {
  const href = pathToFileURL(path).href
  const specifier = `${href}?t=${Date.now()}-${Math.random().toString(36).slice(2)}`
  return import(/* @vite-ignore */ specifier)
}

/** One short, human-readable line per check id (traceability.md "Package and publishing"'s own
 * table), so a maintainer reading `prepare-dist.mjs`'s or `check-publish.mjs`'s failure output
 * does not have to go look the id up before knowing what failed. */
export const CHECK_EXPLANATIONS = {
  D1: 'module.stripTypeScriptTypes is missing',
  X1: 'module.stripTypeScriptTypes is missing',
  X2: "create-wxl's version does not equal the root manifest's version, or is not exact",
  X3: 'no local tag v<version> exists at HEAD',
  X4: 'the working tree is not clean',
  X5: "create-wxl's yaml dependency is not an exact version equal to the lockfile's",
  X6: "the pushed tag on GitHub does not resolve to HEAD",
  X7: "the release's git archive fails an entry rule or a pristine (P1-P4) rule",
  X8: 'dist/ or LICENSE does not match HEAD',
  X9: 'the npm name is already maintained by someone else',
}

/** `checks` is always an array (even with one element, D1): every caller asserts
 * `expect(err.checks).toEqual([...])`. */
export class PublishError extends Error {
  constructor(checks, message) {
    super(message ?? checks.map((id) => `${id} (${CHECK_EXPLANATIONS[id] ?? 'see traceability.md'})`).join(', '))
    this.name = 'PublishError'
    this.checks = checks
  }
}

/** `root` is the create-wxl package directory; the repository root is always its parent (the
 * seam's own contract, traceability.md 0005-S2). */
function repoRootOf(root) {
  return resolve(root, '..')
}

/**
 * "Package and publishing" steps 1-5: remove `dist/` and the package's own `LICENSE` copy first
 * (so a later step never leaves a stale one behind on failure); fail (D1) unless
 * `module.stripTypeScriptTypes` exists; write the type-stripped engine, the package source
 * record (`dist/source.json`) and the `LICENSE` copy.
 */
export async function prepareDist({ root, module }) {
  await rm(join(root, 'dist'), { recursive: true, force: true })
  await rm(join(root, 'LICENSE'), { force: true })

  if (typeof module?.stripTypeScriptTypes !== 'function') {
    throw new PublishError(['D1'])
  }

  const repoRoot = repoRootOf(root)
  const enginePath = join(repoRoot, 'scripts', 'fork-init.ts')
  const engineSource = await readFile(enginePath, 'utf8')
  const strippedText = module.stripTypeScriptTypes(engineSource, { mode: 'strip' })
  const engineBytes = Buffer.from(strippedText.toString(), 'utf8')

  await mkdir(join(root, 'dist'), { recursive: true })
  await writeFile(join(root, 'dist', 'fork-init.mjs'), engineBytes)

  const engineSha256 = createHash('sha256').update(engineBytes).digest('hex')
  const rootPkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))
  const commit = await gitRevParseHead(root)

  const engineModule = await importFresh(join(root, 'dist', 'fork-init.mjs'))

  const source = {
    repository: engineModule.UPSTREAM_SLUG,
    version: rootPkg.version,
    commit,
    engineSha256,
  }
  await writeFile(join(root, 'dist', 'source.json'), JSON.stringify(source, null, 2) + '\n')

  await cp(join(repoRoot, 'LICENSE'), join(root, 'LICENSE'))

  // S-23: callers can read this off the return value instead of importing the engine a second
  // time themselves (`buildRelease`'s own test helper does; `prepare-dist.mjs`/`check-publish.mjs`
  // run as separate processes and still need their own import).
  return { upstreamSlug: engineModule.UPSTREAM_SLUG }
}

const VERSION_RE = /^\d+\.\d+\.\d+$/

/** The root importer's (`.`) resolved version for `depName`, across all three dependency
 * sections (traceability.md X5: "the version the root importer resolves for `yaml`"), with
 * pnpm's own trailing `(peer@version...)` suffix stripped. */
function resolvedLockfileVersion(lockfileDoc, depName) {
  const importer = lockfileDoc?.importers?.['.']
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const entry = importer?.[section]?.[depName]
    if (entry?.version) return entry.version.replace(/\(.*\)$/, '')
  }
  return undefined
}

/**
 * `checkPublish` (run by `prepublishOnly`, right after its own `prepareDist`): X1-X9 in order
 * (traceability.md "Package and publishing"), each check throwing `PublishError` naming only its
 * own id on failure.
 */
export async function checkPublish({ root, module, runGit, archive, npmView, npmWhoami }) {
  if (typeof module?.stripTypeScriptTypes !== 'function') {
    throw new PublishError(['X1'])
  }

  const repoRoot = repoRootOf(root)
  const v = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8')).version
  const createWxlPkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

  if (!VERSION_RE.test(createWxlPkg.version) || createWxlPkg.version !== v) {
    throw new PublishError(['X2'])
  }

  // The engine import (needed below for `UPSTREAM_SLUG`, X6's URL and X7's archive prefix) is
  // itself an X8-shaped problem when it fails: a `dist/` that cannot even be imported does not
  // match `HEAD` (T-0025 stage 6/7 fix assignment section A, S-06/P-06).
  let engineModule
  try {
    engineModule = await importFresh(join(root, 'dist', 'fork-init.mjs'))
  } catch {
    throw new PublishError(['X8'])
  }
  const name = engineModule.UPSTREAM_SLUG.split('/')[1]

  // X3: a local tag `v<V>` exists and resolves (through `^{commit}`, so an annotated tag's own
  // object sha is dereferenced) to `HEAD`. `--verify --quiet`: without it, a missing ref makes
  // `git rev-parse` print the argument back on stdout with exit 0 instead of failing, and a
  // same-named branch could be matched instead of the tag. A `runGit` rejection, or `HEAD` itself
  // not resolving, is also X3: there is no commit to compare the tag against.
  let head
  try {
    const headResult = await runGit(['rev-parse', 'HEAD'], { cwd: root, env: process.env })
    if (headResult.code !== 0) throw new Error('git rev-parse HEAD failed')
    head = headResult.stdout.trim()

    const tagRevParse = await runGit(['rev-parse', '--verify', '--quiet', `refs/tags/v${v}^{commit}`], {
      cwd: root,
      env: process.env,
    })
    if (tagRevParse.code !== 0 || tagRevParse.stdout.trim() !== head) {
      throw new PublishError(['X3'])
    }
  } catch (err) {
    if (err instanceof PublishError) throw err
    throw new PublishError(['X3'])
  }

  // X4: the working tree is clean. `--untracked-files=all`: without it,
  // `status.showUntrackedFiles=no` would hide an untracked file from this check. `dist/` and
  // `LICENSE` are already excluded by `create-wxl/.gitignore`, so `prepareDist`'s own output
  // never shows up here. A rejection or a non-zero exit (e.g. a corrupt index) is itself X4: an
  // unreadable working tree is not a clean one.
  let status
  try {
    status = await runGit(['status', '--porcelain', '--untracked-files=all'], { cwd: root, env: process.env })
  } catch {
    throw new PublishError(['X4'])
  }
  if (status.code !== 0 || status.stdout !== '') {
    throw new PublishError(['X4'])
  }

  // X5: create-wxl's own `yaml` dependency is an exact version (no range operator), equal to the
  // version the root importer resolves for `yaml` in the root `pnpm-lock.yaml`.
  let yamlVersion, resolvedYamlVersion
  try {
    yamlVersion = createWxlPkg.dependencies?.yaml
    const lockfileDoc = parseYaml(await readFile(join(repoRoot, 'pnpm-lock.yaml'), 'utf8'))
    resolvedYamlVersion = resolvedLockfileVersion(lockfileDoc, 'yaml')
  } catch {
    throw new PublishError(['X5'])
  }
  if (typeof yamlVersion !== 'string' || !VERSION_RE.test(yamlVersion) || yamlVersion !== resolvedYamlVersion) {
    throw new PublishError(['X5'])
  }

  // X6: the pushed tag `v<V>` (lightweight or annotated) resolves, on GitHub itself, to `HEAD`.
  // `ls-remote` prints one line per matched ref; an annotated tag's own `^{}` (dereferenced) line
  // is authoritative when present: the plain line can equal `HEAD` by coincidence and must not be
  // trusted on its own. A rejection or non-zero exit is also X6: the upstream state is unknown.
  let reportedSha
  try {
    const lsRemote = await runGit(
      ['ls-remote', `https://github.com/${engineModule.UPSTREAM_SLUG}.git`, `refs/tags/v${v}`, `refs/tags/v${v}^{}`],
      { cwd: root, env: process.env },
    )
    if (lsRemote.code !== 0) throw new Error('ls-remote failed')
    const lines = lsRemote.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
    const dereferenced = lines.find((line) => line.endsWith('^{}'))
    const plain = lines.find((line) => !line.endsWith('^{}'))
    reportedSha = (dereferenced ?? plain)?.split('\t')[0]
  } catch {
    throw new PublishError(['X6'])
  }
  if (reportedSha !== head) {
    throw new PublishError(['X6'])
  }

  // X7: the release's own `git archive` passes entry rules 1-5 (rule 2's comment equal to
  // `HEAD`) and the pristine rules P1-P4. `archive({ commit, name })` takes the commit and name
  // `checkPublish` already resolved, rather than re-deriving them itself. It returns the same
  // (uncompressed) bytes a real `git archive` without `--format=tar.gz` does; `parseArchive`
  // requires gzip, so this gzips first when the bytes are not already gzip-compressed. Any
  // failure in this block -- a parse error, a rule violation, a pristine-rule failure, or a git
  // failure inside `archive()` itself -- is X7: it is all part of validating the same archive.
  let archiveTmpDir
  try {
    const rawOrGzipped = await archive({ commit: head, name })
    const archiveBytes = Buffer.isBuffer(rawOrGzipped) ? rawOrGzipped : Buffer.from(rawOrGzipped)
    const gzipped = looksGzip(archiveBytes) ? archiveBytes : gzipSync(archiveBytes)
    const parsed = await parseArchive(gzipped)
    const validatedEntries = checkEntryRules(parsed, { commit: head })

    archiveTmpDir = await mkdtemp(join(tmpdir(), 'create-wxl-check-publish-'))
    await extractEntries({ fs: fsp }, validatedEntries, archiveTmpDir)
    await applyChangelog(fsp, archiveTmpDir)
    await applyOpenQuestions(fsp, archiveTmpDir)
    await applyPackageJson(fsp, archiveTmpDir)
    await writeRangeJson(fsp, archiveTmpDir, { repository: engineModule.UPSTREAM_SLUG, version: v, commit: head })
  } catch {
    throw new PublishError(['X7'])
  } finally {
    if (archiveTmpDir) await rm(archiveTmpDir, { recursive: true, force: true })
  }

  // X8: `dist/` and `LICENSE` are the ones matching `HEAD` -- `checkPublish` never rebuilds them
  // itself (that is `prepublishOnly`'s own `prepare-dist.mjs` step, run right before this). Any
  // failure reading or parsing these files, or `source.json` not being a plain object, is X8.
  try {
    const source = JSON.parse(await readFile(join(root, 'dist', 'source.json'), 'utf8'))
    if (source === null || typeof source !== 'object' || Array.isArray(source)) {
      throw new Error('source.json is not an object')
    }
    if (source.commit !== head) {
      throw new Error('commit mismatch')
    }
    const engineBytes = await readFile(join(root, 'dist', 'fork-init.mjs'))
    const actualEngineSha256 = createHash('sha256').update(engineBytes).digest('hex')
    if (actualEngineSha256 !== source.engineSha256) {
      throw new Error('engine hash mismatch')
    }
    const packageLicense = await readFile(join(root, 'LICENSE'))
    const rootLicense = await readFile(join(repoRoot, 'LICENSE'))
    if (!packageLicense.equals(rootLicense)) {
      throw new Error('LICENSE mismatch')
    }
  } catch {
    throw new PublishError(['X8'])
  }

  // X9: the npm name is either unpublished (empty maintainer list) or already maintained by the
  // user about to publish (D12: compared by the part before ` <`, trimmed). `npmView`/`npmWhoami`
  // failing, or a maintainer entry that is not a string, is also X9.
  try {
    const maintainers = await npmView()
    if (maintainers.length > 0) {
      const who = (await npmWhoami()).trim()
      const names = maintainers.map((entry) => {
        if (typeof entry !== 'string') throw new Error('maintainer entry is not a string')
        return entry.split('<')[0].trim()
      })
      if (!names.includes(who)) {
        throw new PublishError(['X9'])
      }
    }
  } catch (err) {
    if (err instanceof PublishError) throw err
    throw new PublishError(['X9'])
  }
}
