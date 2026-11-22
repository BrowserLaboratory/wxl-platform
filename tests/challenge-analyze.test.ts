import {
  mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, realpathSync, symlinkSync,
  chmodSync, readdirSync, readFileSync,
} from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { tmpdir, platform } from 'node:os'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import {
  discoverChallenges,
  validateChallenge,
  analyzeChallenge,
  formatBytes,
  formatAnalysis,
  formatSummaryTable,
  type ChallengeFile,
  type AnalysisResult,
} from '../scripts/challenge-analyze'
import type { Locale } from '../.vitepress/locales'

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_DECLARATION = [
  'backend: fastapi',
  'app: app.py',
  'source_visible: false',
  'difficulty: easy',
  'category: web',
  'tags: [test]',
  '',
].join('\n')

/**
 * A challenge in the new layout under `root`: platform/challenge/<slug>/{challenge.yaml,src/}
 * and, where `briefs` names them, platform/<locale>/challenge/<slug>/index.md. `primary`
 * (default zh-TW) fixes the briefPath of the returned ChallengeFile. Without `briefs`, both
 * locales get a brief titled "<slug> Challenge".
 */
function createChallenge(
  root: string,
  slug: string,
  opts: {
    declaration?: string
    appContent?: string
    flagContent?: string
    extraFiles?: Record<string, string>
    briefs?: Partial<Record<Locale, string>>
    primary?: Locale
  } = {},
): ChallengeFile {
  const slugDir = join(root, 'platform', 'challenge', slug)
  const srcDir = join(slugDir, 'src')
  mkdirSync(srcDir, { recursive: true })

  writeFileSync(join(slugDir, 'challenge.yaml'), opts.declaration ?? DEFAULT_DECLARATION)
  writeFileSync(join(srcDir, 'app.py'), opts.appContent ?? 'from fastapi import FastAPI\napp = FastAPI()\n')
  writeFileSync(join(srcDir, 'flag.txt'), opts.flagContent ?? 'FLAG{test_flag_123}\n')

  for (const [name, content] of Object.entries(opts.extraFiles ?? {})) {
    mkdirSync(join(srcDir, ...name.split('/').slice(0, -1)), { recursive: true })
    writeFileSync(join(srcDir, name), content)
  }

  const briefs = opts.briefs ?? {
    'zh-TW': `---\ntitle: "${slug} Challenge"\n---\n`,
    en: `---\ntitle: "${slug} Challenge"\n---\n`,
  }
  for (const [locale, text] of Object.entries(briefs)) {
    mkdirSync(join(root, 'platform', locale, 'challenge', slug), { recursive: true })
    writeFileSync(join(root, 'platform', locale, 'challenge', slug, 'index.md'), text)
  }

  const primary = opts.primary ?? 'zh-TW'
  return {
    slug,
    declarationPath: join(slugDir, 'challenge.yaml'),
    briefPath: join(root, 'platform', primary, 'challenge', slug, 'index.md'),
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('discoverChallenges', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'analyze-discover-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const declaration = (slug: string) => join(root, 'platform', 'challenge', slug, 'challenge.yaml')
  const brief = (locale: string, slug: string) => join(root, 'platform', locale, 'challenge', slug, 'index.md')

  /** Y69 (D73, D89): a challenge is a folder holding challenge.yaml; nothing else is one. */
  function makeTree(): void {
    for (const slug of ['a', 'b']) {
      mkdirSync(join(root, 'platform', 'challenge', slug), { recursive: true })
      writeFileSync(declaration(slug), 'backend: flask\napp: app.py\n')
    }
    mkdirSync(join(root, 'platform', 'challenge', 'only-src', 'src'), { recursive: true })
    writeFileSync(join(root, 'platform', 'challenge', 'flat.md'), '---\ntitle: Flat\nbackend: flask\napp: app.py\n---\n')
    mkdirSync(join(root, 'platform', 'zh-TW', 'challenge', 'brief-only'), { recursive: true })
    writeFileSync(brief('zh-TW', 'brief-only'), '---\ntitle: Brief only\n---\n')
  }

  it.each(['zh-TW', 'en'] as const)('Y69: lists the folders holding challenge.yaml, with the brief of %s', (primary) => {
    makeTree()
    const found = discoverChallenges(root, primary)
    expect([...found].sort((x, y) => x.slug.localeCompare(y.slug))).toEqual([
      { slug: 'a', declarationPath: declaration('a'), briefPath: brief(primary, 'a') },
      { slug: 'b', declarationPath: declaration('b'), briefPath: brief(primary, 'b') },
    ])
  })

  it('Y69: briefPath is returned even when the primary-locale brief does not exist', () => {
    makeTree()
    expect(existsSync(brief('en', 'a'))).toBe(false)
    expect(discoverChallenges(root, 'en', 'a')).toEqual([
      { slug: 'a', declarationPath: declaration('a'), briefPath: brief('en', 'a') },
    ])
  })

  it('Y69: a flat .md, a folder with only src/, and a brief with no folder are not challenges', () => {
    makeTree()
    const slugs = discoverChallenges(root, 'zh-TW').map((c) => c.slug)
    expect(slugs).not.toContain('flat')
    expect(slugs).not.toContain('only-src')
    expect(slugs).not.toContain('brief-only')
    expect(discoverChallenges(root, 'zh-TW', 'flat')).toEqual([])
    expect(discoverChallenges(root, 'zh-TW', 'only-src')).toEqual([])
    expect(discoverChallenges(root, 'zh-TW', 'brief-only')).toEqual([])
  })

  it('Y69: filters by target slug', () => {
    makeTree()
    expect(discoverChallenges(root, 'zh-TW', 'a')).toEqual([
      { slug: 'a', declarationPath: declaration('a'), briefPath: brief('zh-TW', 'a') },
    ])
  })

  it('Y69: returns an empty array when the root has no platform/challenge', () => {
    expect(discoverChallenges(root, 'zh-TW')).toEqual([])
    expect(discoverChallenges(join(root, 'nope'), 'zh-TW')).toEqual([])
  })

  it('Y69: returns an empty array when the target slug does not exist', () => {
    makeTree()
    expect(discoverChallenges(root, 'zh-TW', 'nonexistent')).toEqual([])
  })
})

describe('validateChallenge', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'analyze-validate-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns no errors for a valid challenge', () => {
    const ch = createChallenge(tmpDir, 'valid-chall')
    expect(validateChallenge(ch)).toEqual([])
  })

  it('Y68: reports a missing challenge.yaml as exactly that', () => {
    const slugDir = join(tmpDir, 'platform', 'challenge', 'no-decl')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    expect(validateChallenge({
      slug: 'no-decl',
      declarationPath: join(slugDir, 'challenge.yaml'),
      briefPath: join(tmpDir, 'platform', 'zh-TW', 'challenge', 'no-decl', 'index.md'),
    })).toEqual(['No challenge.yaml found'])
  })

  it('Y68: reports YAML that does not parse as one error naming challenge.yaml', () => {
    const ch = createChallenge(tmpDir, 'bad-yaml', { declaration: 'backend: [flask\n' })
    const errors = validateChallenge(ch)
    expect(errors).toHaveLength(1)
    expect(errors[0].startsWith('Invalid YAML in challenge.yaml: ')).toBe(true)
    // The parser's own wording is not pinned (as for Y4); it must say something.
    expect(errors[0].slice('Invalid YAML in challenge.yaml: '.length).length).toBeGreaterThan(0)
  })

  const alias = (name: string, n: number) => `[${Array(n).fill(`*${name}`).join(', ')}]`
  it.each([
    ['an alias with no anchor', 'x: *nowhere\n'],
    ['an alias expansion over the limit', `a: &a [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]\nb: &b ${alias('a', 10)}\nc: &c ${alias('b', 10)}\nd: ${alias('c', 10)}\n`],
    ['a !!timestamp tag', 'd: !!timestamp 2001-01-01\n'],
    ['a !!set tag', 'tags: !!set {a: null}\n'],
    ['a !!merge tag', '!!merge x: {k: v}\n'],
    ['a mapping key that is not a scalar', '? [a]\n: 1\n'],
    ['an unresolved local tag', 'x: !foo bar\n'],
  ])('Y68 (D129): %s is invalid YAML, reported without a warning or a throw', (_name, extra) => {
    const ch = createChallenge(tmpDir, 'odd-yaml', { declaration: `backend: flask\napp: app.py\n${extra}` })
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    let errors: string[] = []
    let emitted = -1
    try {
      errors = validateChallenge(ch)
    } finally {
      emitted = emitWarning.mock.calls.length + warn.mock.calls.length + stderr.mock.calls.length
      emitWarning.mockRestore()
      warn.mockRestore()
      stderr.mockRestore()
    }
    expect(errors).toHaveLength(1)
    expect(errors[0].startsWith('Invalid YAML in challenge.yaml: ')).toBe(true)
    expect(errors[0].slice('Invalid YAML in challenge.yaml: '.length).length).toBeGreaterThan(0)
    expect(emitted).toBe(0)
  })

  it('Y68: reports a file with several documents as invalid YAML, not as a half-read mapping', () => {
    const ch = createChallenge(tmpDir, 'two-docs', { declaration: 'backend: flask\napp: app.py\n---\nbackend: php\n' })
    const errors = validateChallenge(ch)
    expect(errors).toHaveLength(1)
    expect(errors[0].startsWith('Invalid YAML in challenge.yaml: ')).toBe(true)
  })

  it.each([
    ['an empty file', ''],
    ['a file holding only a comment', '# nothing here\n'],
    ['a scalar root', 'just text\n'],
  ])('Y68: %s keeps the existing "challenge config must be an object"', (_label, declaration) => {
    const ch = createChallenge(tmpDir, 'not-a-mapping', { declaration })
    expect(validateChallenge(ch)).toEqual(['challenge config must be an object'])
  })

  it('reports error when required fields are missing', () => {
    const ch = createChallenge(tmpDir, 'missing-fields', { declaration: 'difficulty: easy\n' })
    expect(validateChallenge(ch)).toEqual(['missing required field: backend'])
  })

  it('reports error when src/ directory is missing', () => {
    const slugDir = join(tmpDir, 'platform', 'challenge', 'no-src')
    mkdirSync(slugDir, { recursive: true })
    writeFileSync(join(slugDir, 'challenge.yaml'), 'backend: flask\napp: app.py\n')
    expect(validateChallenge({
      slug: 'no-src',
      declarationPath: join(slugDir, 'challenge.yaml'),
      briefPath: join(tmpDir, 'platform', 'zh-TW', 'challenge', 'no-src', 'index.md'),
    })).toEqual([`src/ directory not found: ${join(slugDir, 'src')}`])
  })

  it('reports error when app file is missing', () => {
    const ch = createChallenge(tmpDir, 'no-app', { declaration: 'backend: flask\napp: app.py\n' })
    const appPath = join(tmpDir, 'platform', 'challenge', 'no-app', 'src', 'app.py')
    rmSync(appPath)
    expect(validateChallenge(ch)).toEqual([`App file not found: ${appPath}`])
  })

  it('reports error when flag file is missing', () => {
    const ch = createChallenge(tmpDir, 'no-flag', { declaration: 'backend: flask\napp: app.py\n' })
    const flagPath = join(tmpDir, 'platform', 'challenge', 'no-flag', 'src', 'flag.txt')
    rmSync(flagPath)
    expect(validateChallenge(ch)).toEqual([`Flag file not found: ${flagPath}`])
  })
})

describe('analyzeChallenge', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'analyze-analysis-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns correct metadata for a valid challenge', () => {
    const ch = createChallenge(tmpDir, 'test-chall', {
      declaration: [
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        'difficulty: medium',
        'category: web',
        'tags: [sqli, fastapi]',
        '',
      ].join('\n'),
      briefs: { 'zh-TW': '---\ntitle: "Test Challenge"\n---\n' },
    })

    const result = analyzeChallenge(ch)

    expect(result.title).toBe('Test Challenge')
    expect(result.backend).toBe('fastapi')
    expect(result.difficulty).toBe('medium')
    expect(result.category).toBe('web')
    expect(result.tags).toEqual(['sqli', 'fastapi'])
  })

  // Y66 (D89): the title is the primary-locale brief's; everything else comes from challenge.yaml.
  it.each([
    ['zh-TW', '知的必要'],
    ['en', 'Need to Know'],
  ] as const)('Y66: with primary %s the title is %s, the rest comes from challenge.yaml', (primary, title) => {
    const root = join(tmpDir, primary)
    createChallenge(root, 'door', {
      declaration: [
        'backend: flask',
        'app: app.py',
        'difficulty: hard',
        'category: crypto',
        'tags: [a, b]',
        'tools: [code]',
        '',
      ].join('\n'),
      briefs: {
        'zh-TW': '---\ntitle: 知的必要\n---\n',
        en: '---\ntitle: Need to Know\n---\n',
      },
    })

    const result = analyzeChallenge(discoverChallenges(root, primary, 'door')[0])

    expect(result.title).toBe(title)
    expect(result.backend).toBe('flask')
    expect(result.difficulty).toBe('hard')
    expect(result.category).toBe('crypto')
    expect(result.tags).toEqual(['a', 'b'])
    expect(result.toolsSummary).toBe('browser, code')
    expect(formatAnalysis(result).split('\n')[0]).toBe(`=== ${title} ===`)
  })

  // Y67 (D89): "as today when title is absent" — the slug stands in for a title that cannot be read.
  it.each([
    ['only the other locale has a brief', { en: '---\ntitle: Need to Know\n---\n' }],
    ['the brief has no title key', { 'zh-TW': '---\ndescription: no title here\n---\n' }],
  ] as const)('Y67: the title is the slug when %s', (_label, briefs) => {
    const ch = createChallenge(tmpDir, 'door', { briefs, primary: 'zh-TW' })

    const result = analyzeChallenge(ch)

    expect(result.title).toBe('door')
    expect(formatAnalysis(result).split('\n')[0]).toBe('=== door ===')
  })

  it('counts files and sizes correctly', () => {
    const ch = createChallenge(tmpDir, 'size-test', {
      appContent: 'x'.repeat(100),
      flagContent: 'FLAG{test}\n',
    })

    const result = analyzeChallenge(ch)

    expect(result.totalFiles).toBe(2) // app.py + flag.txt
    expect(result.totalSizeBytes).toBeGreaterThan(0)
    // Estimated WASM is ~4x plaintext
    expect(result.estimatedWasmBytes).toBe(Math.ceil(result.totalSizeBytes * 4))
  })

  it('includes extra files in analysis', () => {
    const ch = createChallenge(tmpDir, 'extra-files', {
      extraFiles: {
        'templates/index.html': '<html>test</html>',
        'config.json': '{"key":"value"}',
      },
    })

    const result = analyzeChallenge(ch)

    expect(result.totalFiles).toBe(4) // app.py + flag.txt + index.html + config.json
    const names = result.files.map((f) => f.name).sort()
    expect(names).toContain('app.py')
    expect(names).toContain('flag.txt')
    expect(names).toContain('config.json')
    expect(names).toContain('templates/index.html')
  })

  it('warns when flag does not match expected pattern', () => {
    const ch = createChallenge(tmpDir, 'bad-flag', {
      flagContent: 'this-is-not-a-flag',
    })

    const result = analyzeChallenge(ch)

    expect(result.warnings.some((w) => w.includes('FLAG{') || w.includes('CTF{'))).toBe(true)
  })

  it('does not warn when flag matches FLAG{...} pattern', () => {
    const ch = createChallenge(tmpDir, 'good-flag', {
      flagContent: 'FLAG{correct_format}\n',
    })

    const result = analyzeChallenge(ch)

    expect(result.warnings.filter((w) => w.includes('Flag does not match'))).toHaveLength(0)
  })

  it('does not warn when flag matches CTF{...} pattern', () => {
    const ch = createChallenge(tmpDir, 'ctf-flag', {
      flagContent: 'CTF{also_valid}\n',
    })

    const result = analyzeChallenge(ch)

    expect(result.warnings.filter((w) => w.includes('Flag does not match'))).toHaveLength(0)
  })

  it('warns when app code contains localhost references', () => {
    const ch = createChallenge(tmpDir, 'localhost-warn', {
      appContent: 'import requests\nresponse = requests.get("http://127.0.0.1:8000/api")\n',
    })

    const result = analyzeChallenge(ch)

    expect(result.warnings.some((w) => w.includes('Hardcoded localhost'))).toBe(true)
  })

  it('reports the injected browser for a list that omits it', () => {
    const ch = createChallenge(tmpDir, 'code-only-tools', {
      declaration: ['backend: flask', 'app: app.py', 'tools: [code]', ''].join('\n'),
    })

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser, code')
  })

  it('does not call a duplicate-padded list "all enabled"', () => {
    const ch = createChallenge(tmpDir, 'dup-tools', {
      declaration: ['backend: flask', 'app: app.py', 'tools: [code, code, code, code, code]', ''].join('\n'),
    })

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser, code')
  })

  it('lists tabs in canonical order, not the order the author wrote', () => {
    const ch = createChallenge(tmpDir, 'author-order', {
      declaration: ['backend: flask', 'app: app.py', 'tools: [code, network]', ''].join('\n'),
    })

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser, network, code')
  })

  it('reports browser alone for an empty tools array', () => {
    const ch = createChallenge(tmpDir, 'empty-tools', {
      declaration: ['backend: flask', 'app: app.py', 'tools: []', ''].join('\n'),
    })

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser')
  })

  it('names the tabs the default actually yields when tools is not set', () => {
    const ch = createChallenge(tmpDir, 'default-tools')

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser, network, repeater, code (default)')
  })

  it('reports specific tools when set', () => {
    const ch = createChallenge(tmpDir, 'specific-tools', {
      declaration: ['backend: flask', 'app: app.py', 'source_visible: false', 'tools: [browser, code]', ''].join('\n'),
    })

    expect(analyzeChallenge(ch).toolsSummary).toBe('browser, code')
  })
})

describe('formatBytes', () => {
  it('formats bytes under 1KB', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes as KB', () => {
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(10240)).toBe('10.00 KB')
  })
})

describe('formatAnalysis', () => {
  it('produces expected output structure', () => {
    const result: AnalysisResult = {
      slug: 'test-chall',
      title: 'Test Challenge',
      backend: 'fastapi',
      difficulty: 'easy',
      category: 'web',
      tags: ['test', 'demo'],
      files: [
        { name: 'app.py', sizeBytes: 1200 },
        { name: 'flag.txt', sizeBytes: 30 },
      ],
      totalFiles: 2,
      totalSizeBytes: 1230,
      estimatedWasmBytes: 4920,
      toolsSummary: 'browser, network, repeater, code (default)',
      warnings: [],
    }

    const output = formatAnalysis(result)

    expect(output).toContain('=== Test Challenge ===')
    expect(output).toContain('Backend:    fastapi')
    expect(output).toContain('Difficulty: easy')
    expect(output).toContain('Category:   web')
    expect(output).toContain('Tags:       test, demo')
    expect(output).toContain('app.py')
    expect(output).toContain('flag.txt')
    expect(output).toContain('Total:  2 files')
    expect(output).toContain('Est. WASM payload:')
    expect(output).toContain('Tools:    browser, network, repeater, code (default)')
    expect(output).toContain('(none)')
  })

  it('shows warnings when present', () => {
    const result: AnalysisResult = {
      slug: 'warn-chall',
      title: 'Warn Challenge',
      backend: 'flask',
      difficulty: 'hard',
      category: 'web',
      tags: [],
      files: [],
      totalFiles: 0,
      totalSizeBytes: 0,
      estimatedWasmBytes: 0,
      toolsSummary: 'browser, network, repeater, code (default)',
      warnings: ['Flag does not match pattern', 'Hardcoded localhost in app.py'],
    }

    const output = formatAnalysis(result)

    expect(output).toContain('- Flag does not match pattern')
    expect(output).toContain('- Hardcoded localhost in app.py')
    // Warnings section should not show "(none)" — but Tags may show "(none)" separately
    const warningsSection = output.split('Warnings:')[1]
    expect(warningsSection).not.toContain('(none)')
  })
})

describe('formatSummaryTable', () => {
  it('produces a summary table', () => {
    const results: AnalysisResult[] = [
      {
        slug: 'chall-a',
        title: 'Challenge A',
        backend: 'flask',
        difficulty: 'easy',
        category: 'web',
        tags: [],
        files: [],
        totalFiles: 2,
        totalSizeBytes: 1024,
        estimatedWasmBytes: 4096,
        toolsSummary: 'browser, network, repeater, code (default)',
        warnings: [],
      },
      {
        slug: 'chall-b',
        title: 'Challenge B',
        backend: 'fastapi',
        difficulty: 'hard',
        category: 'web',
        tags: [],
        files: [],
        totalFiles: 5,
        totalSizeBytes: 5120,
        estimatedWasmBytes: 20480,
        toolsSummary: 'browser, code',
        warnings: ['some warning'],
      },
    ]

    const output = formatSummaryTable(results)

    expect(output).toContain('=== Summary ===')
    expect(output).toContain('chall-a')
    expect(output).toContain('chall-b')
    expect(output).toContain('flask')
    expect(output).toContain('fastapi')
    expect(output).toContain('ok')
    expect(output).toContain('1 warning(s)')
    expect(output).toContain('Total challenges: 2')
  })
})

// ─── The CLI on a fixture tree (Y108; Y-q2: a temp copy, never the live tree) ──────────────
//
// `main` reads range.json first (D123), then discovers the challenges with P. Each case runs the
// real script, with --experimental-strip-types, in a copy of package.json, scripts/ and .vitepress/
// under os.tmpdir() whose node_modules is a symlink to the live one.

const LIVE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function copyToolingForAnalyze(): string {
  const copy = mkdtempSync(join(realpathSync(tmpdir()), 'wxl-analyze-fixture-'))
  const skip = [resolve(LIVE_ROOT, '.vitepress', 'dist'), resolve(LIVE_ROOT, '.vitepress', 'cache')]
  for (const rel of ['package.json', 'scripts', '.vitepress']) {
    cpSync(resolve(LIVE_ROOT, rel), resolve(copy, rel), {
      recursive: true,
      filter: (src) => !skip.some((d) => src === d || src.startsWith(`${d}/`)),
    })
  }
  symlinkSync(resolve(LIVE_ROOT, 'node_modules'), resolve(copy, 'node_modules'), 'dir')
  return copy
}

describe('challenge-analyze CLI on a fixture tree (temp copy)', () => {
  let root: string
  beforeAll(() => {
    root = copyToolingForAnalyze()
  })
  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })
  afterEach(() => {
    rmSync(resolve(root, 'platform'), { recursive: true, force: true })
    rmSync(resolve(root, 'range.json'), { recursive: true, force: true })
  })

  const rangeJson = () => resolve(root, 'range.json')

  function run(args: string[]): { status: number; stdout: string; stderr: string } {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/challenge-analyze.ts', ...args], {
      cwd: root,
      encoding: 'utf-8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    })
    return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
  }

  function writeDoor(): void {
    createChallenge(root, 'door', {
      declaration: 'backend: flask\napp: app.py\ndifficulty: easy\n',
      briefs: {
        'zh-TW': '---\ntitle: 知的必要\n---\n',
        en: '---\ntitle: Need to Know\n---\n',
      },
    })
  }

  function snapshotPlatform(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const d of readdirSync(resolve(root, 'platform'), { recursive: true, withFileTypes: true })) {
      if (!d.isFile()) continue
      const path = resolve(d.parentPath, d.name)
      out[path] = readFileSync(path).toString('base64')
    }
    return out
  }

  it('Y108 (a): with no range.json the title comes from the zh-TW brief', () => {
    writeDoor()
    const r = run(['door'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('=== 知的必要 ===')
    expect(r.stdout).not.toContain('Need to Know')
  }, 60_000)

  it('Y108 (b): with {"primaryLocale":"en"} the title comes from the en brief', () => {
    writeFileSync(rangeJson(), '{"primaryLocale":"en"}')
    writeDoor()
    const r = run(['door'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('=== Need to Know ===')
    expect(r.stdout).not.toContain('知的必要')
  }, 60_000)

  // The text is `.vitepress/primary-locale.ts`'s own (5a's Y36 table, as in keygen's RANGE_FAULTS).
  const RANGE_FAULTS: Array<[string, (path: string) => void, string]> = [
    ['PL-E01 range.json is a folder', (p) => mkdirSync(p), 'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'],
    ['PL-E03 not valid JSON', (p) => writeFileSync(p, '{'), 'PL-E03: range.json is not valid JSON.'],
    ['PL-E04 not an object', (p) => writeFileSync(p, '[]'), 'PL-E04: range.json does not hold a JSON object.'],
    ['PL-E05 not a string', (p) => writeFileSync(p, '{"primaryLocale":7}'), 'PL-E05: "primaryLocale" in range.json is not a string: 7.'],
    ['PL-E06 not on the list', (p) => writeFileSync(p, '{"primaryLocale":"ja"}'), 'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.'],
  ]
  const E02: [string, (path: string) => void, string] = [
    'PL-E02 mode 000',
    (p) => { writeFileSync(p, '{}'); chmodSync(p, 0o000) },
    'PL-E02: range.json could not be read (EACCES).',
  ]

  function expectStopped(make: (path: string) => void, line: string): void {
    writeDoor()
    make(rangeJson())
    const before = snapshotPlatform()
    const r = run(['door'])
    expect(r.status).toBe(1)
    expect(r.stderr.split('\n')[0]).toBe(line)
    expect(r.stdout).not.toContain('===')
    expect(snapshotPlatform()).toEqual(before)
  }

  it.each(RANGE_FAULTS)('Y108 (c): %s stops the run before any challenge is analyzed', (_label, make, line) => {
    expectStopped(make, line)
  }, 60_000)

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('Y108 (c): PL-E02 mode 000 stops the run before any challenge is analyzed', () => {
    expectStopped(E02[1], E02[2])
  }, 60_000)
})
