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
  chmodSync,
} from 'node:fs'
import { platform, tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { run, type KeygenResult } from '../../../scripts/create-challenge'
import { generateRedirects } from '../../../scripts/generate-redirects'
import { validateChallenge } from '../../../scripts/challenge-validate'
import { nextChallengeNumber } from '../../../scripts/challenge-numbers'
import { parse as parseYaml } from 'yaml'
import { checkSourceLayout } from '../../../.vitepress/source-layout'
import { challengePagePath } from '../../../.vitepress/challenge/shortLink'
import type { Locale } from '../../../.vitepress/locales'

const REPO_ROOT = resolve(__dirname, '..', '..', '..')
const REAL_REDIRECTS = join(REPO_ROOT, 'platform', 'public', '_redirects')
const REDIRECTS = ['platform', 'public', '_redirects']

// ─── Fixture ────────────────────────────────────────────────────────────────

const roots: string[] = []
/** Every root the suite made, kept after cleanup for the afterAll check. */
const madeRoots: string[] = []

/** A challenge's declaration (`challenge.yaml`): the number lives here and nowhere else. */
function declaration(number?: number): string {
  const n = number === undefined ? '' : `number: ${number}\n`
  return `${n}difficulty: easy\ncategory: web\nbackend: flask\napp: app.py\n`
}

/** A brief: `title` and `layout` only (D74). */
function brief(title = 'Fixture'): string {
  return `---\ntitle: ${title}\nlayout: challenge\n---\n\n# ${title}\n`
}

function home(): string {
  return `---\ntitle: Home\n---\n\n# Home\n`
}

function put(root: string, rel: string, content: string): void {
  const p = join(root, rel)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, content, 'utf-8')
}

/** Both locales' home pages: the layout check wants the primary's whichever `P` is. */
const HOMES: Record<string, string> = {
  'platform/zh-TW/index.md': home(),
  'platform/en/index.md': home(),
}

/**
 * door-is-open (1) in both locales and a retired challenge holding 2, so the
 * next challenge gets 3. `_redirects` is the generated content unless `seed`
 * says otherwise; `seed: null` leaves it out.
 */
const DEFAULT_TREE: Record<string, string> = {
  ...HOMES,
  'platform/challenge/door-is-open/challenge.yaml': declaration(1),
  'platform/zh-TW/challenge/door-is-open/index.md': brief('門是開的'),
  'platform/en/challenge/door-is-open/index.md': brief('Door Is Open'),
  '.archive/challenge/old/challenge.yaml': declaration(2),
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
/** The new challenge's brief, relative to the root, for primary locale `P`. */
const briefRel = (P: Locale): string => `platform/${P}/challenge/new-chall/index.md`
/** The files a php scaffold writes, relative to the root, brief first. */
const SCAFFOLD_FILES = (P: Locale): string[] => [
  briefRel(P),
  `${NEW_DIR}/challenge.yaml`,
  `${NEW_DIR}/src/index.php`,
  `${NEW_DIR}/src/flag.txt`,
]
/** Every path the scaffold creates under `root`, directories included. */
const SCAFFOLD = (P: Locale): string[] => [
  NEW_DIR,
  `${NEW_DIR}/src`,
  `platform/${P}/challenge/new-chall`,
  ...SCAFFOLD_FILES(P),
]
/** Bytes that differ from any generated content, so a rewrite would show. */
const SENTINEL = '# sentinel bytes, not the generated content\n'

function expectScaffold(root: string, P: Locale): void {
  for (const f of SCAFFOLD_FILES(P)) expect(existsSync(join(root, f))).toBe(true)
}

/** W1's listed substrings (traceability, messages table), besides the cause. */
function expectW1(stderr: string, P: Locale = 'zh-TW'): void {
  expect(stderr).toContain(`${NEW_DIR}/`)
  expect(stderr).toContain(briefRel(P))
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

const escapeRe = (t: string): string => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

describe('run: a successful run', () => {
  it('Y70 (no range.json): writes the zh-TW brief, challenge.yaml and src/, names the four on stdout, brief first', () => {
    const root = makeRoot()
    const before = snapshot(root)
    const h = harness(root, () => {
      // What the scaffold is at the moment keygen runs: the four files and three directories.
      atKeygen = changedPaths(before, snapshot(root))
      return { ok: true, output: 'keygen: wrote flag\n' }
    })
    let atKeygen: string[] = []

    const status = run(ARGV, h.deps)

    expect(status).toBe(0)
    expect(atKeygen).toEqual([...SCAFFOLD('zh-TW')].sort())
    expect(changedPaths(before, snapshot(root))).toEqual(
      [...SCAFFOLD('zh-TW'), 'platform/public/_redirects'].sort(),
    )
    const lines = SCAFFOLD_FILES('zh-TW').map((f) => `  ${f}\n`)
    expect(SCAFFOLD_FILES('zh-TW')).toEqual([
      'platform/zh-TW/challenge/new-chall/index.md',
      'platform/challenge/new-chall/challenge.yaml',
      'platform/challenge/new-chall/src/index.php',
      'platform/challenge/new-chall/src/flag.txt',
    ])
    const positions = lines.map((l) => h.out().indexOf(l))
    for (const [i, pos] of positions.entries()) expect(pos, lines[i]).toBeGreaterThanOrEqual(0)
    expect([...positions].sort((x, y) => x - y)).toEqual(positions)
    const content = readRedirects(root)
    expect(content).toBe(generateRedirects(root))
    const page = (slug: string): string => challengePagePath(slug, 'zh-TW', 'zh-TW')
    expect(content).toMatch(new RegExp(`^/c/003\\s+${escapeRe(page('new-chall'))}\\s+302$`, 'm'))
    expect(content).toMatch(new RegExp(`^/zh/c/001\\s+${escapeRe(page('door-is-open'))}\\s+302$`, 'm'))
    expect(h.out()).toContain('platform/public/_redirects')
    expect(h.calls).toEqual([['new-chall', root]])
    expect(h.err()).not.toContain('pnpm challenge:keygen')
    expect(h.err()).not.toContain('git commit')
  })
})

describe('run: the primary locale (Y71, Y72)', () => {
  it('Y72 ({"primaryLocale":"en"}): the brief goes to platform/en/, nothing under platform/zh-TW/', () => {
    const root = makeRoot({ tree: { ...DEFAULT_TREE, 'range.json': '{"primaryLocale":"en"}' } })
    const before = snapshot(root)
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(0)

    const changed = changedPaths(before, snapshot(root))
    expect(changed).toEqual([...SCAFFOLD('en'), 'platform/public/_redirects'].sort())
    expect(changed.filter((p) => p.startsWith('platform/zh-TW/'))).toEqual([])
  })

  it('Y71 (range.json holds only "upstream"): as Y70', () => {
    const range = '{ "upstream": { "repo": "browserlab/wxl-platform", "version": "3.1.0" } }'
    const root = makeRoot({ tree: { ...DEFAULT_TREE, 'range.json': range } })
    const before = snapshot(root)
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(0)

    // range.json itself is not in the diff: nothing wrote it.
    expect(changedPaths(before, snapshot(root))).toEqual(
      [...SCAFFOLD('zh-TW'), 'platform/public/_redirects'].sort(),
    )
    const lines = SCAFFOLD_FILES('zh-TW').map((f) => `  ${f}\n`)
    for (const l of lines) expect(h.out()).toContain(l)
  })
})

// ─── Y73 ────────────────────────────────────────────────────────────────────

describe('run: an unusable range.json (Y73, R19)', () => {
  // The same six faults and first lines as challenge-validate.test.ts's Y36.
  const CASES: [string, (root: string) => void, string][] = [
    [
      'PL-E01 (range.json is a directory)',
      (root) => mkdirSync(join(root, 'range.json')),
      'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.',
    ],
    ['PL-E03 (not JSON)', (root) => writeFileSync(join(root, 'range.json'), '{'), 'PL-E03: range.json is not valid JSON.'],
    ['PL-E04 (not an object)', (root) => writeFileSync(join(root, 'range.json'), '[]'), 'PL-E04: range.json does not hold a JSON object.'],
    [
      'PL-E05 (primaryLocale not a string)',
      (root) => writeFileSync(join(root, 'range.json'), '{"primaryLocale":7}'),
      'PL-E05: "primaryLocale" in range.json is not a string: 7.',
    ],
    [
      'PL-E06 (primaryLocale not on the list)',
      (root) => writeFileSync(join(root, 'range.json'), '{"primaryLocale":"ja"}'),
      'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.',
    ],
  ]

  it.each(CASES)('%s: status 1, the PL line first, nothing written', (_name, breakRange, firstLine) => {
    const root = makeRoot({ seed: SENTINEL })
    breakRange(root)
    const before = snapshot(root)
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(1)
    expect(h.err().split('\n')[0]).toBe(firstLine)
    expect(snapshot(root)).toEqual(before)
    expect(readRedirects(root)).toBe(SENTINEL)
    expect(h.calls).toEqual([])
  })

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)(
    'PL-E02 (mode 000): status 1, the PL line first, nothing written',
    () => {
      const root = makeRoot({ seed: SENTINEL })
      writeFileSync(join(root, 'range.json'), '{}')
      chmodSync(join(root, 'range.json'), 0o000)
      const h = harness(root)
      let status: number
      try {
        status = run(ARGV, h.deps)
      } finally {
        chmodSync(join(root, 'range.json'), 0o644)
      }
      const after = snapshot(root)
      expect(status).toBe(1)
      expect(h.err().split('\n')[0]).toBe('PL-E02: range.json could not be read (EACCES).')
      expect(after.get('range.json')).toBe(Buffer.from('{}').toString('base64'))
      expect([...after.keys()].filter((k) => k.includes('new-chall'))).toEqual([])
      expect(readRedirects(root)).toBe(SENTINEL)
      expect(h.calls).toEqual([])
    },
  )
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
    expect(h.err()).toContain(briefRel('zh-TW'))
    expect(h.err()).toContain('pnpm challenge:keygen new-chall')
    expect(readRedirects(root)).toBe(SENTINEL)
    expectScaffold(root, 'zh-TW')
    expect(h.calls).toHaveLength(1)
  })

  it('Y84: with P = en, W2 names the English brief', () => {
    const root = makeRoot({ seed: SENTINEL, tree: { ...DEFAULT_TREE, 'range.json': '{"primaryLocale":"en"}' } })
    const h = harness(root, () => ({ ok: false, output: KEYGEN_OUTPUT }))

    expect(run(ARGV, h.deps)).toBe(3)
    expect(h.err()).toContain(KEYGEN_OUTPUT)
    expect(h.err()).toContain(`${NEW_DIR}/`)
    expect(h.err()).toContain(briefRel('en'))
    expect(h.err()).toContain('pnpm challenge:keygen new-chall')
    expect(h.err()).not.toContain(briefRel('zh-TW'))
    expectScaffold(root, 'en')
  })
})

// ─── C04, C06, C07 ──────────────────────────────────────────────────────────

describe('run: the generator refuses the tree after keygen', () => {
  it.each([
    ['C04: two challenges hold one number', {
      ...HOMES,
      'platform/challenge/a/challenge.yaml': declaration(1),
      'platform/zh-TW/challenge/a/index.md': brief('A'),
      'platform/challenge/b/challenge.yaml': declaration(1),
      'platform/zh-TW/challenge/b/index.md': brief('B'),
    }],
    ['C06: a challenge.yaml carries no number', {
      ...DEFAULT_TREE,
      'platform/challenge/draft/challenge.yaml': declaration(undefined),
    }],
    ['C07: a brief has no declaration, so no number', {
      ...DEFAULT_TREE,
      'platform/zh-TW/challenge/orphan/index.md': brief('Orphan'),
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
    expectScaffold(root, 'zh-TW')
    expect(h.calls).toHaveLength(1)
  })
})

describe('run: the generator refuses the tree after keygen, P = en (Y84)', () => {
  it('Y84: W1 names the English brief', () => {
    const root = makeRoot({
      seed: SENTINEL,
      tree: {
        ...DEFAULT_TREE,
        'range.json': '{"primaryLocale":"en"}',
        'platform/challenge/draft/challenge.yaml': declaration(undefined),
      },
    })
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(2)
    expectW1(h.err(), 'en')
    expect(h.err()).not.toContain(briefRel('zh-TW'))
    expect(readRedirects(root)).toBe(SENTINEL)
    expectScaffold(root, 'en')
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
    expectScaffold(root, 'zh-TW')
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
    ['an existing per-folder slug', ['--name', 'door-is-open'],
      'Error: Challenge "door-is-open" already exists: platform/challenge/door-is-open/\n'],
  ] as Array<[string, string[], string?]>)('%s ends with status 1 before any file is written', (_label, argv, exactErr) => {
    const root = makeRoot({
      seed: '# not the generated content\n',
    })
    const before = snapshot(root)
    const h = harness(root)

    expect(run(argv, h.deps)).toBe(1)
    expect(snapshot(root)).toEqual(before)
    expect(h.calls).toEqual([])
    expect(h.err()).toMatch(/^Error:/)
    if (exactErr !== undefined) expect(h.err().startsWith(exactErr)).toBe(true)
  })
})

// ─── Y83, Y75, Y85 ──────────────────────────────────────────────────────────

describe('run: what the scaffold is (Y83, Y75, Y85)', () => {
  const treeFor = (P: Locale): Record<string, string> =>
    P === 'en' ? { ...DEFAULT_TREE, 'range.json': '{"primaryLocale":"en"}' } : DEFAULT_TREE

  it.each<Locale>(['zh-TW', 'en'])('Y83: the scaffold validates (P = %s)', (P) => {
    const root = makeRoot({ tree: treeFor(P) })
    const h = harness(root)

    expect(run(ARGV, h.deps)).toBe(0)

    const result = validateChallenge(root, 'new-chall')
    const failed = result.checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.message}`)
    expect(failed).toEqual([])
    expect(result.allPassed).toBe(true)
  })

  it('Y75: wasmModule lands last after keygen', () => {
    const root = makeRoot()
    const yamlPath = join(root, NEW_DIR, 'challenge.yaml')
    let beforeKeygen: string[] = []
    const h = harness(root, () => {
      beforeKeygen = Object.keys(parseYaml(readFileSync(yamlPath, 'utf-8')) as object)
      // What the real keygen does: it appends the key after the last one.
      writeFileSync(yamlPath, `${readFileSync(yamlPath, 'utf-8')}wasmModule: /challenge/new-chall/runtime.wasm\n`)
      return { ok: true, output: 'keygen: wrote flag\n' }
    })

    const status = run(ARGV, h.deps)

    // The content assertions come first so a fault in them is not hidden behind the status.
    expect(beforeKeygen).toEqual(['number', 'difficulty', 'category', 'backend', 'app', 'packages', 'date', 'tags'])
    expect(Object.keys(parseYaml(readFileSync(yamlPath, 'utf-8')) as object)).toEqual([...beforeKeygen, 'wasmModule'])
    expect(status).toBe(0)
  })

  it('Y85: the written number is nextChallengeNumber(root), a retired declaration included', () => {
    const root = makeRoot({ tree: { ...DEFAULT_TREE, '.archive/challenge/old/challenge.yaml': declaration(7) } })
    const expected = nextChallengeNumber(root)
    expect(expected).toBe(8)
    const h = harness(root)

    const status = run(ARGV, h.deps)

    const written = parseYaml(readFileSync(join(root, NEW_DIR, 'challenge.yaml'), 'utf-8')) as { number: number }
    expect(written.number).toBe(expected)
    expect(status).toBe(0)
  })
})

// ─── Y80, Y81, Y111 ─────────────────────────────────────────────────────────

describe('run: a collision (Y80, Y81)', () => {
  /** Runs with `tree` added to the default one; checks status 1, the exact CC1 line, nothing changed. */
  function expectCollision(argv: string[], extra: Record<string, string>, collided: string, slug: string): void {
    const root = makeRoot({ seed: SENTINEL, tree: { ...DEFAULT_TREE, ...extra } })
    const before = snapshot(root)
    const h = harness(root)

    expect(run(argv, h.deps)).toBe(1)
    expect(h.err()).toBe(`Error: Challenge "${slug}" already exists: ${collided}\n`)
    expect(snapshot(root)).toEqual(before)
    expect(h.calls).toEqual([])
  }

  it.each([
    ['only src/', {
      [`${NEW_DIR}/src/index.php`]: SENTINEL,
      [`${NEW_DIR}/src/flag.txt`]: SENTINEL,
    }],
    ['only challenge.yaml', { [`${NEW_DIR}/challenge.yaml`]: declaration(9) }],
    ['both', {
      [`${NEW_DIR}/challenge.yaml`]: declaration(9),
      [`${NEW_DIR}/src/index.php`]: SENTINEL,
      [`${NEW_DIR}/src/flag.txt`]: SENTINEL,
    }],
  ])('Y80: an existing challenge directory with %s collides', (_label, extra) => {
    expectCollision(ARGV, extra, `${NEW_DIR}/`, 'new-chall')
  })

  it.each<[Locale, Locale]>([
    ['zh-TW', 'zh-TW'],
    ['zh-TW', 'en'],
    ['en', 'en'],
    ['en', 'zh-TW'],
  ])('Y81: with P = %s, platform/%s/challenge/new-chall/ collides', (P, L) => {
    const range = P === 'en' ? { 'range.json': '{"primaryLocale":"en"}' } : {}
    expectCollision(
      ARGV,
      { ...range, [`platform/${L}/challenge/new-chall/index.md`]: brief('Existing') },
      `platform/${L}/challenge/new-chall/`,
      'new-chall',
    )
  })

  it('Y111: --name t collides with a brief folder that has no index.md', () => {
    expectCollision(
      ['--name', 't'],
      { 'platform/zh-TW/challenge/t/diagram.png': 'png bytes' },
      'platform/zh-TW/challenge/t/',
      't',
    )
  })
})

// ─── Y105 ───────────────────────────────────────────────────────────────────

describe('run: a tree in the legacy layout (Y105, D82, D19)', () => {
  it.each([
    ['platform/index.md is present', ARGV, { 'platform/index.md': home() }, 'platform/index.md'],
    ['a flat platform/challenge/legacy.md stops at PL-E08', ['--name', 'legacy'],
      { 'platform/challenge/legacy.md': brief('Legacy') }, 'platform/challenge/legacy.md'],
  ])('%s: refused with PL-E08 before anything is written', (_label, argv, extra, listed) => {
    const root = makeRoot({ seed: SENTINEL, tree: { ...DEFAULT_TREE, ...extra } })
    const before = snapshot(root)
    const h = harness(root)
    let refusal = ''
    try {
      checkSourceLayout(join(root, 'platform'), 'zh-TW')
    } catch (e) {
      refusal = (e as Error).message
    }
    expect(refusal.split('\n')[0]).toMatch(/^PL-E08:/)
    expect(refusal.split('\n')[1]).toBe(`  "${listed}"`)

    expect(run(argv, h.deps)).toBe(1)
    expect(h.err().split('\n').slice(0, 2)).toEqual(refusal.split('\n').slice(0, 2))
    expect(snapshot(root)).toEqual(before)
    expect(h.calls).toEqual([])
  })
})
