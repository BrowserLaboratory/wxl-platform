import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { UPSTREAM_SLUG } from '../../../scripts/fork-init'
import { classifySourcePath } from '../../../.vitepress/source-layout'
import { readPrimaryLocale } from '../../../.vitepress/primary-locale'
import {
  upstreamOnlySkipReason,
  readManifest,
  isGitWorkTree,
  hasRootRangeJson,
} from '../../__helpers__/upstreamDecision'

// 0010-S49 (D108, AC-53): upstream's one-time move is the transform (`planLayoutMove`, the module
// create-wxl publishes) of the base tag's `platform/`; the compared tree must equal it byte for byte
// except the exception table (U-§5). This file never spells the upstream slug: it uses UPSTREAM_SLUG.

const ROOT = join(__dirname, '../../..')

// ─── git, through an isolated environment (as create-wxl/test/upstream-config.test.mjs does) ────

const cleanups: string[] = []
afterEach(() => {
  for (const dir of cleanups.splice(0)) rmSync(dir, { recursive: true, force: true })
})

let isolatedHome: string | undefined
afterAll(() => {
  if (isolatedHome !== undefined) rmSync(isolatedHome, { recursive: true, force: true })
})

/** `git` with a throwaway HOME and GIT_CONFIG_NOSYSTEM=1, so no global config and no GIT_DIR or
 *  GIT_INDEX_FILE from an outer git hook changes what it reads. */
function gitIsolated(cwd: string, args: string[], options: { binary?: boolean; input?: string } = {}) {
  isolatedHome ??= mkdtempSync(join(tmpdir(), 'upstream-equality-home-'))
  return spawnSync('git', args, {
    cwd,
    env: { HOME: isolatedHome, XDG_CONFIG_HOME: isolatedHome, PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' },
    encoding: options.binary ? 'buffer' : 'utf8',
    input: options.input === undefined ? undefined : Buffer.from(options.input, 'utf8'),
    maxBuffer: 256 * 1024 * 1024,
  })
}

/** A throwaway repository with one empty commit and the given tags. */
function tempRepo(tags: string[]): string {
  const repo = mkdtempSync(join(tmpdir(), 'upstream-equality-repo-'))
  cleanups.push(repo)
  const run = (args: string[]) => {
    const res = gitIsolated(repo, args)
    if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`)
  }
  run(['init', '--quiet'])
  run(['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '--quiet', '-m', 'x'])
  for (const tag of tags) run(['tag', tag])
  return repo
}

/** U-q1/D108: the base tag is pinned literally. If it were computed as "the newest legacy tag", the
 *  "no newer legacy tag" assertion (U130) would be tautological. */
const BASE_TAG = 'v3.1.1'

/** U132: on upstream a missing tag is a failure that names it, never a skip. */
function resolveBaseTag(cwd: string, tag: string = BASE_TAG): string {
  const res = gitIsolated(cwd, ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`])
  if (res.status !== 0) {
    throw new Error(
      `upstream-equality: base tag ${tag} is missing from this checkout (fetch the tags; CI needs fetch-depth: 0)`,
    )
  }
  return tag
}

/** The equality test's own entry point. `skipReason` is `upstreamOnlySkipReason`'s answer: a range or
 *  a fork skips at once, before any tag query. */
function loadEquality(cwd: string, skipReason: string | undefined): { skip?: string; baseTag?: string } {
  if (skipReason !== undefined) return { skip: skipReason }
  return { baseTag: resolveBaseTag(cwd) }
}

const UPSTREAM_MANIFEST = { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }
const FORK_MANIFEST = { repository: { url: 'git+https://github.com/someone/else.git' } }

describe('U139: a range or a fork skips, whatever the tag state', () => {
  const inputs: Array<[string, string | undefined]> = [
    ['a range', upstreamOnlySkipReason(undefined, UPSTREAM_MANIFEST, true, true)],
    ['a fork', upstreamOnlySkipReason(undefined, FORK_MANIFEST, true, false)],
    ['GITHUB_REPOSITORY of another repository', upstreamOnlySkipReason('someone/else', UPSTREAM_MANIFEST, true, false)],
  ]

  it.each(inputs.flatMap(([name, reason]) => [[name, reason, 'no tag'], [name, reason, 'tag v3.1.1']]))(
    '%s, %s: { skip } without throwing',
    (_name, reason, tagState) => {
      expect(typeof reason).toBe('string')
      const repo = tempRepo(tagState === 'no tag' ? [] : ['v3.1.1'])
      expect(loadEquality(repo, reason as string)).toEqual({ skip: reason })
    },
  )

  it('does not touch git: a missing directory is fine', () => {
    const reason = upstreamOnlySkipReason(undefined, FORK_MANIFEST, true, false) as string
    expect(loadEquality(join(tmpdir(), 'upstream-equality-no-such-dir'), reason)).toEqual({ skip: reason })
  })
})

describe('U132: on upstream a missing base tag fails, naming it', () => {
  it.each([
    ['no tag at all', []],
    ['v3.0.0 and v3.1.0 but not v3.1.1', ['v3.0.0', 'v3.1.0']],
  ])('%s', (_name, tags) => {
    const repo = tempRepo(tags as string[])
    expect(() => loadEquality(repo, undefined)).toThrow(/v3\.1\.1/)
  })
})

// ─── the real tree (upstream only) ──────────────────────────────────────────────────────────────

interface TreeFile {
  bytes: Buffer
  mode: number
}
type Tree = Map<string, TreeFile>

interface Op {
  kind: 'move' | 'declare' | 'strip'
  from?: string
  to?: string
  path?: string
  content: Buffer
  mode?: number
}
interface PlanResult {
  legacy: boolean
  ops: Op[]
  failures?: unknown[]
  mismatches: Array<{ brief: string; key: string }>
}
type PlanLayoutMove = (input: { files: Array<{ path: string; bytes: Buffer; mode: number }> }) => PlanResult

function gitBuffer(args: string[], input?: string): Buffer {
  const res = gitIsolated(ROOT, args, { binary: true, input })
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(res.stderr)}`)
  return res.stdout as Buffer
}

/** The blobs for `shas`, in order, through one `git cat-file --batch`. */
function readBlobs(shas: string[]): Buffer[] {
  if (shas.length === 0) return []
  const out = gitBuffer(['cat-file', '--batch'], shas.join('\n') + '\n')
  const blobs: Buffer[] = []
  let pos = 0
  for (const sha of shas) {
    const newline = out.indexOf(0x0a, pos)
    const [, type, size] = out.subarray(pos, newline).toString('utf8').split(' ')
    if (type !== 'blob') throw new Error(`upstream-equality: ${sha} is not a blob`)
    const start = newline + 1
    blobs.push(out.subarray(start, start + Number(size)))
    pos = start + Number(size) + 1
  }
  return blobs
}

/** `git ls-tree -r -z <tag> -- platform/` with every blob's bytes and mode. */
function readTagTree(tag: string): Tree {
  const entries = gitBuffer(['ls-tree', '-r', '-z', tag, '--', 'platform/'])
    .toString('utf8')
    .split('\0')
    .filter((entry) => entry !== '')
    .map((entry) => {
      const tab = entry.indexOf('\t')
      const [mode, , sha] = entry.slice(0, tab).split(' ')
      return { mode: parseInt(mode, 8), sha, path: entry.slice(tab + 1) }
    })
  const blobs = readBlobs(entries.map((e) => e.sha))
  return new Map(entries.map((e, i) => [e.path, { bytes: blobs[i], mode: e.mode }]))
}

/** The working tree's `platform/`: the paths and modes `git ls-files -s` lists, the bytes of the
 *  files on disk (a listed path missing on disk is absent from the tree). */
function readWorkingTree(): Tree {
  const tree: Tree = new Map()
  const listing = gitBuffer(['ls-files', '-s', '-z', '--', 'platform/']).toString('utf8').split('\0')
  for (const entry of listing) {
    if (entry === '') continue
    const tab = entry.indexOf('\t')
    const [mode] = entry.slice(0, tab).split(' ')
    const path = entry.slice(tab + 1)
    try {
      if (!lstatSync(join(ROOT, path)).isFile()) continue
    } catch {
      continue
    }
    tree.set(path, { bytes: readFileSync(join(ROOT, path)), mode: parseInt(mode, 8) })
  }
  return tree
}

type SemVer = [number, number, number]
function parseVTag(tag: string): SemVer | undefined {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined
}
function compareSemVer(a: SemVer, b: SemVer): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}
/** Every `v*` tag of the form vX.Y.Z, oldest first. */
function listVTags(): string[] {
  const out = gitBuffer(['tag', '-l', 'v*']).toString('utf8').split('\n')
  return out
    .filter((tag) => parseVTag(tag) !== undefined)
    .sort((a, b) => compareSemVer(parseVTag(a)!, parseVTag(b)!))
}
function tagHolds(tag: string, path: string): boolean {
  return gitBuffer(['ls-tree', tag, '--', path]).toString('utf8').trim() !== ''
}

/** D108: the compared tree is the oldest `v*` tag whose tree holds `platform/en/index.md`, the
 *  working tree until one exists. Chosen here, so no later ticket switches it. */
function readComparedTree(): { tree: Tree; source: string } {
  const tag = listVTags().find((t) => tagHolds(t, 'platform/en/index.md'))
  return tag === undefined ? { tree: readWorkingTree(), source: 'the working tree' } : { tree: readTagTree(tag), source: tag }
}

function filesOf(tree: Tree) {
  return [...tree].map(([path, file]) => ({ path, bytes: file.bytes, mode: file.mode }))
}

/** U-§5, as the test's own exception table: path -> the rows that edit it (traceability.md). A path is
 *  added only with the user's approval, recorded in the ticket's stage 6 disposition (D130). */
const EXCEPTIONS: Record<string, string> = {
  'platform/en/index.md': 'D14, D40',
  'platform/zh-TW/index.md': 'D13, D14, D40',
  'platform/en/challenges.md': 'D14, D40, D44',
  'platform/zh-TW/challenges.md': 'D14, D40, D44',
  'platform/zh-TW/guide/notes.md': 'D16',
  'platform/en/guide/index.md': 'LH2, Y100',
  'platform/zh-TW/guide/index.md': 'LH2, Y100',
  'platform/en/guide/troubleshooting.md': 'LH1, LH2, A34, Y100',
  'platform/zh-TW/guide/troubleshooting.md': 'LH1, LH2, A34, Y100',
  'platform/en/guide/python.md': 'Y100',
  'platform/zh-TW/guide/python.md': 'Y100',
  'platform/zh-TW/reference/attack-log-export-format.md': 'D51',
  'platform/en/smoke-fixtures/english-only.md': 'D49',
  'platform/zh-TW/smoke-fixtures/traditional-chinese-only.md': 'D49',
}

const REAL_SKIP = upstreamOnlySkipReason(
  process.env.GITHUB_REPOSITORY,
  readManifest(ROOT),
  isGitWorkTree(ROOT),
  hasRootRangeJson(ROOT),
)

// U134: the transform is create-wxl's own published module, imported only once the decision is
// "upstream" (a range has no `create-wxl/`, so a static import would fail the whole file there).
// The specifier is not a string literal either: vite:import-analysis resolves a literal one at
// transform time, which fails the whole file in a range before any skip applies.
const LAYOUT_MOVE_MODULE = pathToFileURL(join(ROOT, 'create-wxl/src/layout-move.mjs')).href
let planLayoutMove: PlanLayoutMove | undefined
let baseTagError: Error | undefined
let baseTree: Tree = new Map()
let compared: { tree: Tree; source: string } = { tree: new Map(), source: '' }
let ops: Op[] = []
if (REAL_SKIP === undefined) {
  planLayoutMove = (await import(/* @vite-ignore */ LAYOUT_MOVE_MODULE)).planLayoutMove as PlanLayoutMove
  try {
    const loaded = loadEquality(ROOT, REAL_SKIP)
    baseTree = readTagTree(loaded.baseTag as string)
    compared = readComparedTree()
    ops = planLayoutMove({ files: filesOf(baseTree) }).ops
  } catch (err) {
    baseTagError = err as Error
  }
}

const PRIMARY = readPrimaryLocale(join(ROOT, 'range.json'))

describe.skipIf(REAL_SKIP !== undefined)('0010-S49: the compared tree equals the transform of the base tag', () => {
  it(`the base tag ${BASE_TAG} is in the checkout`, () => {
    if (baseTagError) throw baseTagError
  })

  const outputs = new Map<string, Op>()
  for (const op of ops) outputs.set((op.kind === 'strip' ? op.path : op.to) as string, op)

  // U130 (1)
  it.each([...outputs.keys()])('%s equals the transform output', (path) => {
    if (path in EXCEPTIONS) return
    const op = outputs.get(path)!
    const actual = compared.tree.get(path)
    expect(actual, `${path} is missing from ${compared.source}`).toBeDefined()
    expect(actual!.bytes.equals(op.content), `${path} bytes differ from the transform of ${BASE_TAG}`).toBe(true)
    if (op.kind === 'move') expect(actual!.mode).toBe(op.mode)
  })

  // U130 (2)
  it('the exception table equals U-§5', () => {
    const text = readFileSync(
      join(ROOT, '.proj.specs/0010-primary-locale-layout/traceability.md'),
      'utf8',
    )
    const start = text.indexOf('### U-§5')
    expect(start).toBeGreaterThanOrEqual(0)
    const end = text.indexOf('\n###', start + 1)
    const section = text.slice(start, end === -1 ? undefined : end)
    const paths = new Set<string>()
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue
      const firstCell = line.split('|')[1] ?? ''
      for (const m of firstCell.matchAll(/`(platform\/[^`]+)`/g)) paths.add(m[1])
    }
    expect(paths.size).toBeGreaterThan(0)
    expect(new Set(Object.keys(EXCEPTIONS))).toEqual(paths)
  })

  // U130 (3)
  it(`no v* tag newer than ${BASE_TAG} holds platform/index.md`, () => {
    const base = parseVTag(BASE_TAG)!
    const newer = listVTags().filter((tag) => compareSemVer(parseVTag(tag)!, base) > 0)
    expect(newer.filter((tag) => tagHolds(tag, 'platform/index.md'))).toEqual([])
  })

  // U131
  const touched = new Set<string>()
  for (const op of ops) for (const p of [op.from, op.to, op.path]) if (p !== undefined) touched.add(p)
  const checked = [...compared.tree.keys()].filter(
    (path) =>
      classifySourcePath(path.slice('platform/'.length), PRIMARY) !== 'excluded' ||
      /^platform\/challenge\/[^/]+\/challenge\.yaml$/.test(path),
  )

  it.each(checked)('%s is a transform output, an untouched base page, or excepted', (path) => {
    if (path in EXCEPTIONS) return
    if (outputs.has(path)) return
    const base = baseTree.get(path)
    expect(base !== undefined && !touched.has(path), `${path} is not a transform output, an untouched ${BASE_TAG} page, or in U-§5`).toBe(true)
    expect(compared.tree.get(path)!.bytes.equals(base!.bytes), `${path} differs from ${BASE_TAG}`).toBe(true)
  })

  // U147
  it.each(['v3.0.0', 'v3.1.0', 'v3.1.1'])('%s: the transform has no failure and only the known mismatch', (tag) => {
    const tree = readTagTree(resolveBaseTag(ROOT, tag))
    const result = planLayoutMove!({ files: filesOf(tree) })
    expect(result.failures).toBeUndefined()
    expect(result.mismatches.map((m) => [m.brief, m.key])).toEqual([
      ['platform/zh-TW/challenge/selected-excerpts/index.md', 'source_files'],
    ])
  })
})
