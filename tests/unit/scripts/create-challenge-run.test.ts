/**
 * Seam 0007-S4: create-challenge's exported entry, `run(argv, deps)`.
 *
 * Every test builds its own root under `os.tmpdir()` and hands the entry a stub
 * keygen runner. No test calls the entry with the repository root: there it
 * would rewrite the committed `_redirects` while the guard test
 * (`tests/unit/site/redirects-generated.test.ts`) runs in parallel.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  existsSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { run, type KeygenResult } from '../../../scripts/create-challenge'
import { generateRedirects } from '../../../scripts/generate-redirects'

const REPO_ROOT = resolve(__dirname, '..', '..', '..')
const REAL_REDIRECTS = join(REPO_ROOT, 'platform', 'public', '_redirects')
const REDIRECTS = ['platform', 'public', '_redirects']

// ─── Fixture ────────────────────────────────────────────────────────────────

const roots: string[] = []
/** Every root the suite made, kept after cleanup for the afterAll check. */
const madeRoots: string[] = []

function page(number: number | undefined, title = 'Fixture'): string {
  const n = number === undefined ? '' : `number: ${number}\n`
  return `---\ntitle: ${title}\n${n}layout: challenge\n---\n\n# ${title}\n`
}

function put(root: string, rel: string, content: string): void {
  const p = join(root, rel)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, content, 'utf-8')
}

/**
 * door-is-open (1) in both locales and a retired challenge holding 2, so the
 * next challenge gets 3. `_redirects` is the generated content unless `seed`
 * says otherwise; `seed: null` leaves it out.
 */
const DEFAULT_TREE: Record<string, string> = {
  'platform/challenge/door-is-open/index.md': page(1, 'Door Is Open'),
  'platform/zh-TW/challenge/door-is-open/index.md': page(1, '門是開的'),
  '.archive/challenge/old/index.md': page(2, 'Old'),
}

function makeRoot(opts: { seed?: string | null; tree?: Record<string, string> } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'wxl-create-run-'))
  roots.push(root)
  madeRoots.push(root)
  for (const [rel, content] of Object.entries(opts.tree ?? DEFAULT_TREE)) put(root, rel, content)
  mkdirSync(join(root, 'platform', 'public'), { recursive: true })
  if (opts.seed !== null) {
    writeFileSync(join(root, ...REDIRECTS), opts.seed ?? generateRedirects(root), 'utf-8')
  }
  return root
}

/** Every path under `root`, each mapped to its bytes or to a directory marker. */
function snapshot(root: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string): void => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, d.name)
      const rel = relative(root, p).split(sep).join('/')
      if (d.isDirectory()) {
        out.set(rel, '<dir>')
        walk(p)
      } else {
        out.set(rel, readFileSync(p).toString('base64'))
      }
    }
  }
  walk(root)
  return out
}

/** Paths created, changed or removed between two snapshots. */
function changedPaths(before: Map<string, string>, after: Map<string, string>): string[] {
  const keys = new Set([...before.keys(), ...after.keys()])
  return [...keys].filter((k) => before.get(k) !== after.get(k)).sort()
}

function readRedirects(root: string): string {
  return readFileSync(join(root, ...REDIRECTS), 'utf-8')
}

interface Harness {
  deps: Parameters<typeof run>[1]
  calls: Array<[string, string]>
  out: () => string
  err: () => string
}

function harness(
  root: string,
  keygen: (slug: string, root: string) => KeygenResult = () => ({ ok: true, output: 'keygen: wrote flag\n' }),
): Harness {
  const calls: Array<[string, string]> = []
  let out = ''
  let err = ''
  return {
    calls,
    out: () => out,
    err: () => err,
    deps: {
      root,
      runKeygen: (slug, r) => {
        calls.push([slug, r])
        return keygen(slug, r)
      },
      stdout: (s) => { out += s },
      stderr: (s) => { err += s },
    },
  }
}

const ARGV = ['--name', 'new-chall', '--backend', 'php']
const NEW_DIR = 'platform/challenge/new-chall'
/** The files a php scaffold writes, relative to the new challenge's directory. */
const SCAFFOLD_FILES = ['index.md', 'src/index.php', 'src/flag.txt']
/** Every path the scaffold creates under `root`, directories included. */
const SCAFFOLD = [NEW_DIR, `${NEW_DIR}/src`, ...SCAFFOLD_FILES.map((f) => `${NEW_DIR}/${f}`)]
/** Bytes that differ from any generated content, so a rewrite would show. */
const SENTINEL = '# sentinel bytes, not the generated content\n'

function expectScaffold(root: string): void {
  for (const f of SCAFFOLD_FILES) expect(existsSync(join(root, NEW_DIR, f))).toBe(true)
}

/** W1's listed substrings (traceability, messages table), besides the cause. */
function expectW1(stderr: string): void {
  expect(stderr).toContain(`${NEW_DIR}/`)
  expect(stderr).toContain('platform/public/_redirects')
  expect(stderr).toContain('git commit')
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true })
})

// ─── The real tree is never touched ──────────────────────────────────────────

let realBefore: Buffer | undefined
beforeAll(() => {
  realBefore = existsSync(REAL_REDIRECTS) ? readFileSync(REAL_REDIRECTS) : undefined
})
afterAll(() => {
  expect(madeRoots.length).toBeGreaterThan(0)
  for (const r of madeRoots) {
    expect(relative(tmpdir(), r).startsWith('..')).toBe(false)
    expect(relative(REPO_ROOT, r).startsWith('..')).toBe(true)
  }
  const realAfter = existsSync(REAL_REDIRECTS) ? readFileSync(REAL_REDIRECTS) : undefined
  expect(realAfter?.toString('base64')).toBe(realBefore?.toString('base64'))
})

// ─── C01, C02 ───────────────────────────────────────────────────────────────

describe('run: a successful run', () => {
  it('regenerates _redirects over the whole tree and names it on stdout', () => {
    const root = makeRoot()
    const before = snapshot(root)
    const h = harness(root)

    const status = run(ARGV, h.deps)

    expect(status).toBe(0)
    const content = readRedirects(root)
    expect(content).toBe(generateRedirects(root))
    expect(content).toMatch(/^\/c\/003\s+\/challenge\/new-chall\/\s+302$/m)
    expect(content).toMatch(/^\/zh\/c\/001\s+\/zh-TW\/challenge\/door-is-open\/\s+302$/m)
    expect(h.out()).toContain('platform/public/_redirects')
    expect(h.calls).toEqual([['new-chall', root]])
    expect(changedPaths(before, snapshot(root))).toEqual(
      [...SCAFFOLD, 'platform/public/_redirects'].sort(),
    )
    expect(h.err()).not.toContain('pnpm challenge:keygen')
    expect(h.err()).not.toContain('git commit')
  })
})

// ─── C08 ────────────────────────────────────────────────────────────────────

describe('run: _redirects that differ from the generated content', () => {
  // The fixture's generated content before the run, read off a throwaway root
  // so each case can seed its own variant.
  const generatedFor = (): string => generateRedirects(makeRoot())

  it.each([
    ['a stale file (the /c/001 line removed)', () =>
      generatedFor().split('\n').filter((l) => !l.startsWith('/c/001 ')).join('\n')],
    ['a hand edit (an extra line appended)', () =>
      `${generatedFor()}/c/999  /challenge/hand-edit/  302\n`],
    ['no file at all', () => null],
  ])('replaces %s with the generated content', (_label, seedOf) => {
    const seed = seedOf()
    const root = makeRoot({ seed })
    if (seed !== null) expect(readRedirects(root)).not.toBe(generateRedirects(root))
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(0)
    expect(readRedirects(root)).toBe(generateRedirects(root))
  })
})

// ─── C03 ────────────────────────────────────────────────────────────────────

describe('run: keygen fails after the scaffold was written', () => {
  const KEYGEN_OUTPUT = 'keygen: wasm runtime missing (stub output)'

  it.each([
    ['reports failure', (): KeygenResult => ({ ok: false, output: KEYGEN_OUTPUT })],
    ['throws', (): KeygenResult => { throw new Error(KEYGEN_OUTPUT) }],
  ])('ends with status 3 and W2 when the runner %s', (_label, keygen) => {
    const root = makeRoot({ seed: SENTINEL })
    const h = harness(root, keygen)

    expect(run(ARGV, h.deps)).toBe(3)
    expect(h.err()).toContain(KEYGEN_OUTPUT)
    expect(h.err()).toContain(`${NEW_DIR}/`)
    expect(h.err()).toContain('pnpm challenge:keygen new-chall')
    expect(readRedirects(root)).toBe(SENTINEL)
    expectScaffold(root)
    expect(h.calls).toHaveLength(1)
  })
})

// ─── C04, C06, C07 ──────────────────────────────────────────────────────────

describe('run: the generator refuses the tree after keygen', () => {
  it.each([
    ['C04: two challenges hold one number', {
      'platform/challenge/a/index.md': page(1, 'A'),
      'platform/challenge/b/index.md': page(1, 'B'),
    }],
    ['C06: a challenge index.md carries no number', {
      ...DEFAULT_TREE,
      'platform/challenge/draft/index.md': page(undefined, 'Draft'),
    }],
    ['C07: a Traditional Chinese brief carries another number', {
      ...DEFAULT_TREE,
      'platform/zh-TW/challenge/door-is-open/index.md': page(5, '門是開的'),
    }],
  ])('%s: status 2 with W1, nothing else touched', (_label, tree) => {
    const root = makeRoot({ seed: SENTINEL, tree })
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(2)

    let refusal = ''
    try {
      generateRedirects(root)
    } catch (e) {
      refusal = (e as Error).message
    }
    expect(refusal).not.toBe('')
    expect(h.err()).toContain(refusal)
    expectW1(h.err())
    expect(readRedirects(root)).toBe(SENTINEL)
    expectScaffold(root)
    expect(h.calls).toHaveLength(1)
  })
})

// ─── C09 ────────────────────────────────────────────────────────────────────

describe('run: _redirects cannot be written', () => {
  it('ends with status 2 and W1 carrying the write error', () => {
    const root = makeRoot({ seed: null })
    const target = join(root, ...REDIRECTS)
    mkdirSync(target)
    // Measured on this platform, not hard-coded: the error writing that path gives.
    let writeError = ''
    try {
      writeFileSync(target, 'x', 'utf-8')
    } catch (e) {
      writeError = (e as Error).message
    }
    expect(writeError).not.toBe('')
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(2)
    expect(h.err()).toContain(writeError)
    expectW1(h.err())
    expect(statSync(target).isDirectory()).toBe(true)
    expectScaffold(root)
  })
})

// ─── C05 ────────────────────────────────────────────────────────────────────

describe('run: an invalid argument or an existing slug', () => {
  it.each([
    ['no arguments', []],
    ['an upper-case name', ['--name', 'My-Chall']],
    ['a name with an underscore', ['--name', 'a_b']],
    ['an unknown backend', ['--name', 'x', '--backend', 'django']],
    ['an unknown difficulty', ['--name', 'x', '--difficulty', 'insane']],
    ['an unknown option', ['--nmae', 'x']],
    ['a positional argument', ['--name', 'x', 'extra']],
    ['an existing per-folder slug', ['--name', 'door-is-open']],
    ['an existing legacy slug', ['--name', 'legacy']],
  ])('%s ends with status 1 before any file is written', (_label, argv) => {
    const root = makeRoot({
      tree: { ...DEFAULT_TREE, 'platform/challenge/legacy.md': page(9, 'Legacy') },
    })
    const before = snapshot(root)
    const h = harness(root)

    expect(run(argv, h.deps)).toBe(1)
    expect(snapshot(root)).toEqual(before)
    expect(h.calls).toEqual([])
    expect(h.err()).toMatch(/^Error:/)
  })
})
