import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { deriveSlugs, runLintStaged } from '../scripts/challenge-lint-staged'
import { LOCALES } from '../.vitepress/locales'
import { SiteLayoutError } from '../.vitepress/layout-error'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Fixture repository (revision 2.3: every fixture lives in a temporary directory) ─────────────
// A git repository under os.tmpdir() holding `platform/challenge/<slug>/{challenge.yaml,src/}` and
// one brief per locale named in `briefs`. The child environment carries no inherited GIT_* variable.

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('GIT_')) env[k] = v
  return env
}

function git(root: string, ...args: string[]): string {
  const r = spawnSync('git', args, { cwd: root, env: gitEnv(), encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  return r.stdout
}

function brief(title = 'T'): string {
  return ['---', `title: ${title}`, 'layout: challenge', '---', '', `# ${title}`, ''].join('\n')
}

const VALID_DECLARATION = ['number: 1', 'backend: flask', 'app: app.py'].join('\n')

interface Chall {
  slug?: string
  /** challenge.yaml text; null writes no file (and no src/). */
  declaration?: string | null
  src?: Record<string, string> | null
  /** false creates no challenge directory at all. */
  directory?: boolean
  /** locale -> brief text; default one zh-TW brief. */
  briefs?: Record<string, string>
}

function writeChallenge(root: string, c: Chall = {}): void {
  const slug = c.slug ?? 's'
  const dir = join(root, 'platform', 'challenge', slug)
  if (c.directory !== false) {
    mkdirSync(dir, { recursive: true })
    const declaration = c.declaration === undefined ? VALID_DECLARATION : c.declaration
    if (declaration !== null) writeFileSync(join(dir, 'challenge.yaml'), declaration)
    const src = c.src === undefined ? { 'app.py': 'from flask import Flask', 'flag.txt': 'FLAG{test_case}' } : c.src
    if (src !== null) {
      for (const [name, content] of Object.entries(src)) {
        mkdirSync(dirname(join(dir, 'src', name)), { recursive: true })
        writeFileSync(join(dir, 'src', name), content)
      }
    }
  }
  for (const [locale, content] of Object.entries(c.briefs ?? { 'zh-TW': brief() })) {
    const briefDir = join(root, 'platform', locale, 'challenge', slug)
    mkdirSync(briefDir, { recursive: true })
    writeFileSync(join(briefDir, 'index.md'), content)
  }
}

function makeRepo(root: string, c: Chall = {}): void {
  git(root, 'init', '-q')
  writeChallenge(root, c)
}

// Y88 (D122, D127): which staged paths name a challenge. Every input is tried relative, absolute
// and backslashed.
const FORMS: Array<[string, (p: string) => string]> = [
  ['relative', (p) => p],
  ['absolute', (p) => `/Users/dev/project/${p}`],
  ['backslash', (p) => `C:\\project\\${p.replace(/\//g, '\\')}`],
]
const Y88_TABLE: Array<[string, string[]]> = [
  ['platform/challenge/s/challenge.yaml', ['s']],
  ['platform/challenge/s/src/app.py', ['s']],
  ['platform/zh-TW/challenge/s/index.md', ['s']],
  ['platform/en/challenge/s/index.md', ['s']],
  ['platform/ja/challenge/s/index.md', []],
  ['platform/challenge/s.md', []],
  ['platform/en/guide/x.md', []],
]

describe('deriveSlugs', () => {
  describe('Y88: the staged path table', () => {
    for (const [formName, form] of FORMS) {
      it.each(Y88_TABLE)(`${formName}: %s`, (path, expected) => {
        expect(deriveSlugs([form(path)], LOCALES)).toEqual(expected)
      })
    }
  })

  it('only index.md is a brief (Y111, D127)', () => {
    expect(deriveSlugs([
      'platform/zh-TW/challenge/s/index.md',
      'platform/zh-TW/challenge/s/hints.md',
      'platform/zh-TW/challenge/t/diagram.png',
      'platform/zh-TW/challenge/u/notes.md',
    ], LOCALES)).toEqual(['s'])
    for (const path of [
      'platform/zh-TW/challenge/s/hints.md',
      'platform/zh-TW/challenge/t/diagram.png',
      'platform/zh-TW/challenge/u/notes.md',
    ]) {
      expect(deriveSlugs([path], LOCALES), path).toEqual([])
    }
  })

  it('deduplicates multiple files in the same challenge', () => {
    const result = deriveSlugs([
      'platform/zh-TW/challenge/sqli-demo/index.md',
      'platform/challenge/sqli-demo/src/app.py',
    ], LOCALES)
    expect(result).toEqual(['sqli-demo'])
  })

  it('derives slugs from multiple challenges', () => {
    const result = deriveSlugs([
      'platform/challenge/sqli-demo/src/app.py',
      'platform/en/challenge/php-demo/index.md',
    ], LOCALES)
    expect(result).toEqual(expect.arrayContaining(['sqli-demo', 'php-demo']))
    expect(result).toHaveLength(2)
  })

  it('returns empty array for non-challenge files', () => {
    expect(deriveSlugs(['scripts/foo.ts', 'README.md', 'package.json'], LOCALES)).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(deriveSlugs([], LOCALES)).toEqual([])
  })

  it('ignores files directly under platform/challenge/ (.gitkeep)', () => {
    expect(deriveSlugs(['platform/challenge/.gitkeep'], LOCALES)).toEqual([])
  })
})

describe('runLintStaged', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lint-staged-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('catches backend/app extension mismatch (full validator check)', () => {
    // This check only exists in challenge-validate.ts, not in challenge-analyze.ts.
    makeRepo(tmpDir, {
      slug: 'bad-ext',
      declaration: ['number: 1', 'backend: flask', 'app: app.php'].join('\n'),
      src: { 'app.php': '<?php echo "hi"; ?>', 'flag.txt': 'FLAG{test_case}' },
    })

    const result = runLintStaged(tmpDir, ['bad-ext'])
    expect(result.hasErrors).toBe(true)
    expect(result.errors[0].messages.some((m) => m.startsWith('backend:'))).toBe(true)
  })

  it('passes when challenge is fully valid', () => {
    makeRepo(tmpDir, { slug: 'good-chall' })

    const result = runLintStaged(tmpDir, ['good-chall'])
    expect(result.hasErrors).toBe(false)
    expect(result.errors).toEqual([])
  })

  it('catches invalid tools values (full validator check)', () => {
    makeRepo(tmpDir, {
      slug: 'bad-tools',
      declaration: ['number: 1', 'backend: flask', 'app: app.py', 'tools:', '  - browser', '  - nonexistent-tool'].join('\n'),
    })

    const result = runLintStaged(tmpDir, ['bad-tools'])
    expect(result.hasErrors).toBe(true)
    expect(result.errors[0].messages.some((m) => m.startsWith('declaration:') || m.startsWith('tools:'))).toBe(true)
  })

  describe('Y89: what a slug without a complete challenge reports', () => {
    const LS1 = 'incomplete challenge (missing challenge.yaml)'

    it.each([
      ['src/ only', {}],
      ['with a zh-TW brief', { briefs: { 'zh-TW': brief() } }],
    ] as Array<[string, Chall]>)('LS1: a challenge directory without challenge.yaml (%s)', (_name, extra) => {
      makeRepo(tmpDir, { declaration: null, briefs: {}, ...extra })
      expect(runLintStaged(tmpDir, ['s'])).toEqual({
        hasErrors: true,
        errors: [{ slug: 's', messages: [LS1] }],
      })
    })

    it.each([
      ['nothing at all', {}],
      ['a ja brief, which does not count', { briefs: { ja: brief() } }],
    ] as Array<[string, Chall]>)('a removed challenge is skipped (%s)', (_name, extra) => {
      makeRepo(tmpDir, { directory: false, briefs: {}, ...extra })
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const result = runLintStaged(tmpDir, ['s'])
        expect(result.hasErrors).toBe(false)
        expect(result.errors).toEqual([])
        expect(spy.mock.calls).toEqual([['[pre-commit] ⊘ s (removed)']])
      } finally {
        spy.mockRestore()
      }
    })

    it.each([
      ['only the zh-TW brief', { zh: true }],
      ['only the en brief (a translation under P=zh-TW)', { zh: false }],
    ])('VM1: a brief whose slug has no challenge directory (%s)', (_name, { zh }) => {
      makeRepo(tmpDir, { directory: false, briefs: { [zh ? 'zh-TW' : 'en']: brief() } })
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const result = runLintStaged(tmpDir, ['s'])
        expect(result.hasErrors).toBe(true)
        expect(result.errors).toEqual([
          { slug: 's', messages: ['declaration: platform/challenge/s/challenge.yaml not found'] },
        ])
        expect(spy.mock.calls.flat().join('\n')).not.toContain('(removed)')
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe('D122: P is read from the index', () => {
    const englishOnly: Chall = { briefs: { en: brief() } }

    it('D122: P comes from the index', () => {
      makeRepo(tmpDir, englishOnly)
      const range = join(tmpDir, 'range.json')
      writeFileSync(range, '{"primaryLocale":"en"}')
      git(tmpDir, 'add', 'range.json')
      writeFileSync(range, '{"primaryLocale":"zh-TW"}')

      const result = runLintStaged(tmpDir, ['s'])
      expect(result.errors).toEqual([])
      expect(result.hasErrors).toBe(false)
      expect(readFileSync(range, 'utf8')).toBe('{"primaryLocale":"zh-TW"}')
    })

    it('D122: an untracked range.json is not read', () => {
      makeRepo(tmpDir, englishOnly)
      writeFileSync(join(tmpDir, 'range.json'), '{"primaryLocale":"en"}')

      const result = runLintStaged(tmpDir, ['s'])
      expect(result.hasErrors).toBe(true)
      expect(result.errors).toEqual([
        {
          slug: 's',
          messages: [
            'brief (zh-TW): platform/zh-TW/challenge/s/index.md not found; every challenge has a brief in the primary locale (zh-TW)',
          ],
        },
      ])
    })
  })

  describe('D122 + D114 + D123: an unusable range.json in the index', () => {
    const PL_E01 =
      'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'
    const stageText = (root: string, text: string): void => {
      writeFileSync(join(root, 'range.json'), text)
      git(root, 'add', 'range.json')
    }
    const stageEntry = (root: string, mode: string, sha: string): void => {
      git(root, 'update-index', '--add', '--cacheinfo', `${mode},${sha},range.json`)
    }
    const UNKNOWN_SHA = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

    const cells: Array<[string, string, string, (root: string) => void]> = [
      ['`{`', 'PL-E03', 'PL-E03: range.json is not valid JSON.', (r) => stageText(r, '{')],
      ['`[]`', 'PL-E04', 'PL-E04: range.json does not hold a JSON object.', (r) => stageText(r, '[]')],
      [
        'primaryLocale 1',
        'PL-E05',
        'PL-E05: "primaryLocale" in range.json is not a string: 1.',
        (r) => stageText(r, '{"primaryLocale":1}'),
      ],
      [
        'primaryLocale ja',
        'PL-E06',
        'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.',
        (r) => stageText(r, '{"primaryLocale":"ja"}'),
      ],
      [
        'a symbolic link (120000)',
        'PL-E01',
        PL_E01,
        (r) => {
          writeFileSync(join(r, 'target.json'), '{')
          symlinkSync('target.json', join(r, 'range.json'))
          git(r, 'add', 'range.json')
        },
      ],
      ['a gitlink (160000)', 'PL-E01', PL_E01, (r) => stageEntry(r, '160000', UNKNOWN_SHA)],
      [
        'a regular entry whose blob is missing',
        'PL-E02',
        'PL-E02: range.json could not be read (unknown).',
        (r) => stageEntry(r, '100644', UNKNOWN_SHA),
      ],
    ]

    it.each(cells)('D122: unusable range.json in the index: %s', (_name, code, line, stage) => {
      // The slug's declaration is deliberately invalid: had any challenge been processed it would report.
      makeRepo(tmpDir, { declaration: 'backend: nope' })
      stage(tmpDir)
      // The working tree holds a valid range.json in every cell (a symbolic link is replaced).
      rmSync(join(tmpDir, 'range.json'), { force: true })
      writeFileSync(join(tmpDir, 'range.json'), '{"primaryLocale":"zh-TW"}')
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        let thrown: unknown
        try {
          runLintStaged(tmpDir, ['s'])
        } catch (err) {
          thrown = err
        }
        expect(thrown).toBeInstanceOf(SiteLayoutError)
        expect((thrown as SiteLayoutError).code).toBe(code)
        expect((thrown as SiteLayoutError).message.split('\n')[0]).toBe(line)
        expect(spy).not.toHaveBeenCalled()
      } finally {
        spy.mockRestore()
      }
    })
  })
})

describe('challenge-lint-staged command', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lint-staged-cmd-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // The script takes its root from the working directory, so nothing of the live tree is read or written.
  function run(...paths: string[]) {
    const env = { ...gitEnv(), NODE_NO_WARNINGS: '1' }
    return spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(REPO_ROOT, 'scripts', 'challenge-lint-staged.ts'), ...paths],
      { cwd: tmpDir, env, encoding: 'utf8' },
    )
  }

  const stageRange = (text: string): void => {
    writeFileSync(join(tmpDir, 'range.json'), text)
    git(tmpDir, 'add', 'range.json')
  }

  it('passes a valid English-only challenge when the index range.json names en', () => {
    makeRepo(tmpDir, { briefs: { en: brief() } })
    stageRange('{"primaryLocale":"en"}')
    const r = run('platform/en/challenge/s/index.md')
    expect(r.stderr).toBe('[pre-commit] ✓ s\n')
    expect(r.status).toBe(0)
  })

  it('ignores a brief in a locale that is not on the list', () => {
    makeRepo(tmpDir, { directory: false, briefs: { ja: brief() } })
    const r = run('platform/ja/challenge/s/index.md')
    expect(r.status).toBe(0)
    expect(r.stderr).toBe('')
  })

  it('prints the PL line alone, with no class name or stack, and exits 1', () => {
    makeRepo(tmpDir)
    stageRange('{')
    const r = run('platform/zh-TW/challenge/s/index.md')
    expect(r.status).toBe(1)
    expect(r.stderr.split('\n')[0]).toBe('PL-E03: range.json is not valid JSON.')
    expect(r.stderr).not.toContain('[pre-commit]')
    expect(r.stderr).not.toContain('SiteLayoutError')
    expect(r.stderr).not.toContain('    at ')
  })

  it('reports a challenge directory without challenge.yaml', () => {
    makeRepo(tmpDir, { declaration: null })
    const r = run('platform/challenge/s/src/app.py')
    expect(r.status).toBe(1)
    expect(r.stderr).toBe('[pre-commit] ✗ s\n  - incomplete challenge (missing challenge.yaml)\n')
  })
})
