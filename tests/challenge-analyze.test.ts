import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function writeChallengeMd(dir: string, frontmatter: string, body = ''): void {
  writeFileSync(join(dir, 'index.md'), `---\n${frontmatter}\n---\n${body}`)
}

function createPerFolderChallenge(
  challengesDir: string,
  slug: string,
  opts: {
    frontmatter?: string
    appContent?: string
    flagContent?: string
    extraFiles?: Record<string, string>
  } = {},
): string {
  const slugDir = join(challengesDir, slug)
  const srcDir = join(slugDir, 'src')
  mkdirSync(srcDir, { recursive: true })

  const fm = opts.frontmatter ?? [
    `title: "${slug} Challenge"`,
    'backend: fastapi',
    'app: app.py',
    'source_visible: false',
    'difficulty: easy',
    'category: web',
    'tags: [test]',
  ].join('\n')

  writeChallengeMd(slugDir, fm)
  writeFileSync(join(srcDir, 'app.py'), opts.appContent ?? 'from fastapi import FastAPI\napp = FastAPI()\n')
  writeFileSync(join(srcDir, 'flag.txt'), opts.flagContent ?? 'FLAG{test_flag_123}\n')

  if (opts.extraFiles) {
    for (const [name, content] of Object.entries(opts.extraFiles)) {
      const filePath = join(srcDir, name)
      const fileDir = join(srcDir, ...name.split('/').slice(0, -1))
      mkdirSync(fileDir, { recursive: true })
      writeFileSync(filePath, content)
    }
  }

  return slugDir
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('discoverChallenges', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'analyze-discover-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('discovers per-folder challenges', () => {
    createPerFolderChallenge(tmpDir, 'demo-a')
    createPerFolderChallenge(tmpDir, 'demo-b')

    const results = discoverChallenges(tmpDir)
    const slugs = results.map((r) => r.slug).sort()

    expect(slugs).toEqual(['demo-a', 'demo-b'])
    expect(results.every((r) => r.isPerFolder)).toBe(true)
  })

  it('discovers legacy .md challenges', () => {
    writeFileSync(
      join(tmpDir, 'legacy-chall.md'),
      '---\ntitle: Legacy\nbackend: flask\napp: app.py\n---\n',
    )

    const results = discoverChallenges(tmpDir)
    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe('legacy-chall')
    expect(results[0].isPerFolder).toBe(false)
  })

  it('filters by target slug', () => {
    createPerFolderChallenge(tmpDir, 'demo-a')
    createPerFolderChallenge(tmpDir, 'demo-b')

    const results = discoverChallenges(tmpDir, 'demo-a')
    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe('demo-a')
  })

  it('returns empty array for non-existent directory', () => {
    const results = discoverChallenges(join(tmpDir, 'nope'))
    expect(results).toEqual([])
  })

  it('returns empty array when target slug not found', () => {
    createPerFolderChallenge(tmpDir, 'demo-a')
    const results = discoverChallenges(tmpDir, 'nonexistent')
    expect(results).toEqual([])
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

  it('returns no errors for a valid per-folder challenge', () => {
    createPerFolderChallenge(tmpDir, 'valid-chall')
    const ch: ChallengeFile = {
      slug: 'valid-chall',
      mdPath: join(tmpDir, 'valid-chall', 'index.md'),
      isPerFolder: true,
    }

    const errors = validateChallenge(ch)
    expect(errors).toEqual([])
  })

  it('reports error when frontmatter is missing', () => {
    const slugDir = join(tmpDir, 'no-fm')
    mkdirSync(slugDir, { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), '# Just markdown, no frontmatter\n')

    const errors = validateChallenge({
      slug: 'no-fm',
      mdPath: join(slugDir, 'index.md'),
      isPerFolder: true,
    })
    expect(errors).toContain('No YAML frontmatter found')
  })

  it('reports error when required fields are missing', () => {
    const slugDir = join(tmpDir, 'missing-fields')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeChallengeMd(slugDir, 'title: Test\n')

    const errors = validateChallenge({
      slug: 'missing-fields',
      mdPath: join(slugDir, 'index.md'),
      isPerFolder: true,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('backend') || e.includes('app'))).toBe(true)
  })

  it('reports error when src/ directory is missing for per-folder', () => {
    const slugDir = join(tmpDir, 'no-src')
    mkdirSync(slugDir, { recursive: true })
    writeChallengeMd(slugDir, 'title: Test\nbackend: flask\napp: app.py\n')

    const errors = validateChallenge({
      slug: 'no-src',
      mdPath: join(slugDir, 'index.md'),
      isPerFolder: true,
    })
    expect(errors.some((e) => e.includes('src/'))).toBe(true)
  })

  it('reports error when app file is missing', () => {
    const slugDir = join(tmpDir, 'no-app')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })
    writeChallengeMd(slugDir, 'title: Test\nbackend: flask\napp: app.py\n')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{x}')

    const errors = validateChallenge({
      slug: 'no-app',
      mdPath: join(slugDir, 'index.md'),
      isPerFolder: true,
    })
    expect(errors.some((e) => e.includes('App file not found'))).toBe(true)
  })

  it('reports error when flag file is missing', () => {
    const slugDir = join(tmpDir, 'no-flag')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })
    writeChallengeMd(slugDir, 'title: Test\nbackend: flask\napp: app.py\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hi")')

    const errors = validateChallenge({
      slug: 'no-flag',
      mdPath: join(slugDir, 'index.md'),
      isPerFolder: true,
    })
    expect(errors.some((e) => e.includes('Flag file not found'))).toBe(true)
  })

  it('reports error when file cannot be read', () => {
    const errors = validateChallenge({
      slug: 'ghost',
      mdPath: join(tmpDir, 'ghost', 'index.md'),
      isPerFolder: true,
    })
    expect(errors.some((e) => e.includes('Cannot read file'))).toBe(true)
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
    createPerFolderChallenge(tmpDir, 'test-chall', {
      frontmatter: [
        'title: "Test Challenge"',
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        'difficulty: medium',
        'category: web',
        'tags: [sqli, fastapi]',
      ].join('\n'),
    })

    const result = analyzeChallenge({
      slug: 'test-chall',
      mdPath: join(tmpDir, 'test-chall', 'index.md'),
      isPerFolder: true,
    })

    expect(result.title).toBe('Test Challenge')
    expect(result.backend).toBe('fastapi')
    expect(result.difficulty).toBe('medium')
    expect(result.category).toBe('web')
    expect(result.tags).toEqual(['sqli', 'fastapi'])
  })

  it('counts files and sizes correctly', () => {
    createPerFolderChallenge(tmpDir, 'size-test', {
      appContent: 'x'.repeat(100),
      flagContent: 'FLAG{test}\n',
    })

    const result = analyzeChallenge({
      slug: 'size-test',
      mdPath: join(tmpDir, 'size-test', 'index.md'),
      isPerFolder: true,
    })

    expect(result.totalFiles).toBe(2) // app.py + flag.txt
    expect(result.totalSizeBytes).toBeGreaterThan(0)
    // Estimated WASM is ~4x plaintext
    expect(result.estimatedWasmBytes).toBe(Math.ceil(result.totalSizeBytes * 4))
  })

  it('includes extra files in analysis', () => {
    createPerFolderChallenge(tmpDir, 'extra-files', {
      extraFiles: {
        'templates/index.html': '<html>test</html>',
        'config.json': '{"key":"value"}',
      },
    })

    const result = analyzeChallenge({
      slug: 'extra-files',
      mdPath: join(tmpDir, 'extra-files', 'index.md'),
      isPerFolder: true,
    })

    expect(result.totalFiles).toBe(4) // app.py + flag.txt + index.html + config.json
    const names = result.files.map((f) => f.name).sort()
    expect(names).toContain('app.py')
    expect(names).toContain('flag.txt')
    expect(names).toContain('config.json')
    expect(names).toContain('templates/index.html')
  })

  it('warns when flag does not match expected pattern', () => {
    createPerFolderChallenge(tmpDir, 'bad-flag', {
      flagContent: 'this-is-not-a-flag',
    })

    const result = analyzeChallenge({
      slug: 'bad-flag',
      mdPath: join(tmpDir, 'bad-flag', 'index.md'),
      isPerFolder: true,
    })

    expect(result.warnings.some((w) => w.includes('FLAG{') || w.includes('CTF{'))).toBe(true)
  })

  it('does not warn when flag matches FLAG{...} pattern', () => {
    createPerFolderChallenge(tmpDir, 'good-flag', {
      flagContent: 'FLAG{correct_format}\n',
    })

    const result = analyzeChallenge({
      slug: 'good-flag',
      mdPath: join(tmpDir, 'good-flag', 'index.md'),
      isPerFolder: true,
    })

    expect(result.warnings.filter((w) => w.includes('Flag does not match'))).toHaveLength(0)
  })

  it('does not warn when flag matches CTF{...} pattern', () => {
    createPerFolderChallenge(tmpDir, 'ctf-flag', {
      flagContent: 'CTF{also_valid}\n',
    })

    const result = analyzeChallenge({
      slug: 'ctf-flag',
      mdPath: join(tmpDir, 'ctf-flag', 'index.md'),
      isPerFolder: true,
    })

    expect(result.warnings.filter((w) => w.includes('Flag does not match'))).toHaveLength(0)
  })

  it('warns when app code contains localhost references', () => {
    createPerFolderChallenge(tmpDir, 'localhost-warn', {
      appContent: 'import requests\nresponse = requests.get("http://127.0.0.1:8000/api")\n',
    })

    const result = analyzeChallenge({
      slug: 'localhost-warn',
      mdPath: join(tmpDir, 'localhost-warn', 'index.md'),
      isPerFolder: true,
    })

    expect(result.warnings.some((w) => w.includes('Hardcoded localhost'))).toBe(true)
  })

  it('reports the injected browser for a list that omits it', () => {
    createPerFolderChallenge(tmpDir, 'code-only-tools', {
      frontmatter: [
        'title: "Code Only"',
        'backend: flask',
        'app: app.py',
        'tools: [code]',
      ].join('\n'),
    })

    expect(analyzeChallenge({
      slug: 'code-only-tools',
      mdPath: join(tmpDir, 'code-only-tools', 'index.md'),
      isPerFolder: true,
    }).toolsSummary).toBe('browser, code')
  })

  it('does not call a duplicate-padded list "all enabled"', () => {
    createPerFolderChallenge(tmpDir, 'dup-tools', {
      frontmatter: [
        'title: "Dup Tools"',
        'backend: flask',
        'app: app.py',
        'tools: [code, code, code, code, code]',
      ].join('\n'),
    })

    expect(analyzeChallenge({
      slug: 'dup-tools',
      mdPath: join(tmpDir, 'dup-tools', 'index.md'),
      isPerFolder: true,
    }).toolsSummary).toBe('browser, code')
  })

  it('lists tabs in canonical order, not the order the author wrote', () => {
    createPerFolderChallenge(tmpDir, 'author-order', {
      frontmatter: ['title: "Order"', 'backend: flask', 'app: app.py', 'tools: [code, network]'].join('\n'),
    })

    expect(analyzeChallenge({
      slug: 'author-order',
      mdPath: join(tmpDir, 'author-order', 'index.md'),
      isPerFolder: true,
    }).toolsSummary).toBe('browser, network, code')
  })

  it('reports browser alone for an empty tools array', () => {
    createPerFolderChallenge(tmpDir, 'empty-tools', {
      frontmatter: ['title: "Empty"', 'backend: flask', 'app: app.py', 'tools: []'].join('\n'),
    })

    expect(analyzeChallenge({
      slug: 'empty-tools',
      mdPath: join(tmpDir, 'empty-tools', 'index.md'),
      isPerFolder: true,
    }).toolsSummary).toBe('browser')
  })

  it('names the tabs the default actually yields when tools is not set', () => {
    createPerFolderChallenge(tmpDir, 'default-tools')

    const result = analyzeChallenge({
      slug: 'default-tools',
      mdPath: join(tmpDir, 'default-tools', 'index.md'),
      isPerFolder: true,
    })

    expect(result.toolsSummary).toBe('browser, network, repeater, code (default)')
  })

  it('reports specific tools when set', () => {
    createPerFolderChallenge(tmpDir, 'specific-tools', {
      frontmatter: [
        'title: "Specific Tools"',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        'tools: [browser, code]',
      ].join('\n'),
    })

    const result = analyzeChallenge({
      slug: 'specific-tools',
      mdPath: join(tmpDir, 'specific-tools', 'index.md'),
      isPerFolder: true,
    })

    expect(result.toolsSummary).toBe('browser, code')
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
