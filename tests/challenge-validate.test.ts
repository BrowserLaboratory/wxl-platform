import {
  mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync, realpathSync, symlinkSync, chmodSync, readdirSync, readFileSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { validateChallenge, discoverChallenges } from '../scripts/challenge-validate'
import {
  upstreamOnlySkipReason,
  readManifest,
  isGitWorkTree,
  hasRootRangeJson,
} from './__helpers__/upstreamDecision'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Fixture tree (revision 2.3: every fixture lives in a temporary directory) ─────────────────
// `<root>/platform/challenge/<slug>/{challenge.yaml,src/}` and one brief per locale named in `briefs`,
// at `<root>/platform/<locale>/challenge/<slug>/index.md`. `range.json` only when `rangeJson` is given
// (no file: the primary locale is zh-TW).

interface Tree {
  rangeJson?: string
  slug?: string
  /** challenge.yaml text; `null` writes no file. */
  declaration?: string | null
  /** files under src/; `null` writes no src/ directory. */
  src?: Record<string, string> | null
  /** locale -> brief text. Defaults to a valid zh-TW brief. */
  briefs?: Record<string, string>
}

const VALID_DECLARATION = ['number: 1', 'backend: fastapi', 'app: app.py'].join('\n')

function brief(title = 'T'): string {
  return ['---', `title: ${title}`, 'layout: challenge', '---', '', `# ${title}`, ''].join('\n')
}

function writeTree(root: string, tree: Tree = {}): string {
  const slug = tree.slug ?? 'x'
  const dir = join(root, 'platform', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  if (tree.rangeJson !== undefined) writeFileSync(join(root, 'range.json'), tree.rangeJson)
  const declaration = tree.declaration === undefined ? VALID_DECLARATION : tree.declaration
  if (declaration !== null) writeFileSync(join(dir, 'challenge.yaml'), declaration)
  const src = tree.src === undefined ? { 'app.py': 'from fastapi import FastAPI', 'flag.txt': 'flag{test_case}' } : tree.src
  if (src !== null) {
    mkdirSync(join(dir, 'src'), { recursive: true })
    for (const [name, content] of Object.entries(src)) {
      mkdirSync(dirname(join(dir, 'src', name)), { recursive: true })
      writeFileSync(join(dir, 'src', name), content)
    }
  }
  const briefs = tree.briefs ?? { 'zh-TW': brief() }
  for (const [locale, content] of Object.entries(briefs)) {
    const briefDir = join(root, 'platform', locale, 'challenge', slug)
    mkdirSync(briefDir, { recursive: true })
    writeFileSync(join(briefDir, 'index.md'), content)
  }
  return dir
}

describe('validateChallenge', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'challenge-validate-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── Per-folder tests (re-homed on the locale-folder layout, D149) ───────────────────────────

  describe('per-folder structure', () => {
    it('passes all checks for valid challenge', () => {
      writeTree(tmpDir, {
        slug: 'test-challenge',
        declaration: ['number: 1', 'backend: fastapi', 'app: app.py', 'source_visible: false'].join('\n'),
      })

      const result = validateChallenge(tmpDir, 'test-challenge')
      expect(result.slug).toBe('test-challenge')
      expect(result.allPassed).toBe(true)
      expect(result.checks.every(c => c.passed)).toBe(true)
    })

    it('fails when backend does not match app file extension', () => {
      writeTree(tmpDir, {
        slug: 'bad-ext',
        declaration: ['backend: flask', 'app: app.php', 'source_visible: false'].join('\n'),
        src: { 'app.php': '<?php echo "hello"; ?>', 'flag.txt': 'flag{test_case}' },
      })

      const result = validateChallenge(tmpDir, 'bad-ext')
      const backendCheck = result.checks.find(c => c.label === 'backend')
      expect(backendCheck?.passed).toBe(false)
      expect(backendCheck?.message).toContain('.py')
    })

    it('fails when app file does not exist', () => {
      writeTree(tmpDir, {
        slug: 'no-app',
        declaration: ['backend: fastapi', 'app: app.py', 'source_visible: false'].join('\n'),
        src: { 'flag.txt': 'flag{test_case}' },
      })

      const result = validateChallenge(tmpDir, 'no-app')
      const appCheck = result.checks.find(c => c.label === 'app')
      expect(appCheck?.passed).toBe(false)
      expect(appCheck?.message).toContain('not found')
    })

    it('fails when flag file does not exist', () => {
      writeTree(tmpDir, {
        slug: 'no-flag',
        declaration: ['backend: fastapi', 'app: app.py', 'source_visible: false'].join('\n'),
        src: { 'app.py': 'print("hello")' },
      })

      const result = validateChallenge(tmpDir, 'no-flag')
      const flagCheck = result.checks.find(c => c.label === 'flag')
      expect(flagCheck?.passed).toBe(false)
      expect(flagCheck?.message).toContain('not found')
    })

    // The white-box build redacts the displayed source by replacing the flag's content
    // wherever it occurs. A short flag makes that replace hit ordinary identifiers, and
    // the build refuses it; validation is where an author first hears about it.
    it('fails when the flag is shorter than the redaction minimum', () => {
      writeTree(tmpDir, {
        slug: 'short-flag',
        declaration: ['backend: fastapi', 'app: app.py'].join('\n'),
        src: { 'app.py': 'print("hello")', 'flag.txt': 'admin\n' },
      })

      const result = validateChallenge(tmpDir, 'short-flag')
      const lengthCheck = result.checks.find(c => c.label === 'flag-length')
      expect(lengthCheck?.passed).toBe(false)
      expect(lengthCheck?.message).toMatch(/5 characters/)
      expect(lengthCheck?.message).toMatch(/at least 12/)
      expect(result.allPassed).toBe(false)
    })

    it('measures the flag after trimming, so a trailing newline does not count', () => {
      writeTree(tmpDir, {
        slug: 'trimmed-flag',
        declaration: ['backend: fastapi', 'app: app.py'].join('\n'),
        // Eleven visible characters plus a newline: twelve bytes, eleven after trim.
        src: { 'app.py': 'print("hello")', 'flag.txt': 'flag{abcde}\n' },
      })

      const result = validateChallenge(tmpDir, 'trimmed-flag')
      const lengthCheck = result.checks.find(c => c.label === 'flag-length')
      expect(lengthCheck?.passed).toBe(false)
      expect(lengthCheck?.message).toMatch(/11 characters/)
    })

    it('fails when the flag is long enough but not FLAG{...}/CTF{...} shaped', () => {
      writeTree(tmpDir, {
        slug: 'unshaped-flag',
        declaration: ['backend: fastapi', 'app: app.py'].join('\n'),
        src: { 'app.py': 'print("hello")', 'flag.txt': 'return request\n' },
      })

      const result = validateChallenge(tmpDir, 'unshaped-flag')
      expect(result.checks.find(c => c.label === 'flag-length')?.passed).toBe(true)
      const shapeCheck = result.checks.find(c => c.label === 'flag-shape')
      expect(shapeCheck?.passed).toBe(false)
      expect(shapeCheck?.message).toMatch(/not FLAG/)
      expect(result.allPassed).toBe(false)
    })

    it('supports custom flag path', () => {
      writeTree(tmpDir, {
        slug: 'custom-flag',
        declaration: ['number: 1', 'backend: flask', 'app: app.py', 'flag: secrets/flag.txt', 'source_visible: false'].join('\n'),
        src: { 'app.py': 'from flask import Flask', 'secrets/flag.txt': 'flag{custom}' },
      })

      const result = validateChallenge(tmpDir, 'custom-flag')
      expect(result.allPassed).toBe(true)
      const flagCheck = result.checks.find(c => c.label === 'flag')
      expect(flagCheck?.passed).toBe(true)
      expect(flagCheck?.message).toContain('secrets/flag.txt')
    })

    it('detects invalid tools', () => {
      writeTree(tmpDir, {
        slug: 'bad-tools',
        declaration: ['backend: fastapi', 'app: app.py', 'source_visible: false', 'tools:', '  - browser', '  - hacker-tool'].join('\n'),
        src: { 'app.py': 'print("hello")', 'flag.txt': 'flag{test_case}' },
      })

      // validateChallengeDeclaration catches the invalid tool before any other check
      const result = validateChallenge(tmpDir, 'bad-tools')
      expect(result.allPassed).toBe(false)
    })

    it('lists tabs in canonical order, not the order the author wrote', () => {
      writeTree(tmpDir, {
        slug: 'author-order',
        declaration: ['backend: fastapi', 'app: app.py', 'tools: [code, network]'].join('\n'),
      })

      const toolsCheck = validateChallenge(tmpDir, 'author-order').checks.find(c => c.label === 'tools')
      expect(toolsCheck?.message).toBe('[browser, network, code]')
    })

    it('names the tabs the default yields when tools is absent', () => {
      writeTree(tmpDir, {
        slug: 'no-tools',
        declaration: ['backend: fastapi', 'app: app.py'].join('\n'),
      })

      const toolsCheck = validateChallenge(tmpDir, 'no-tools').checks.find(c => c.label === 'tools')
      expect(toolsCheck?.message).toBe(
        'not specified (default: browser, network, repeater, code)',
      )
    })

    // Regression for the branch VALID_TOOLS shrinking flipped: with `terminal` gone,
    // an explicit list of every remaining tool now satisfies `rendered.length ===
    // VALID_TOOLS.length`, so the reported message switches from the explicit tab list
    // to 'all enabled'. Before the shrink this input reported '[browser, network,
    // repeater, code]'. Pin the new branch so the flip cannot happen again unnoticed.
    it('reports an explicit full tool list as all enabled', () => {
      writeTree(tmpDir, {
        slug: 'all-tools',
        declaration: ['backend: fastapi', 'app: app.py', 'tools:', '  - browser', '  - network', '  - repeater', '  - code'].join('\n'),
      })

      const toolsCheck = validateChallenge(tmpDir, 'all-tools').checks.find(c => c.label === 'tools')
      expect(toolsCheck?.passed).toBe(true)
      expect(toolsCheck?.message).toBe('all enabled')
    })

    it('validates .fsignore when present', () => {
      writeTree(tmpDir, {
        slug: 'with-fsignore',
        declaration: ['number: 1', 'backend: flask', 'app: app.py', 'source_visible: false'].join('\n'),
        src: { 'app.py': 'from flask import Flask', 'flag.txt': 'flag{test_case}', '.fsignore': '*.log\n__pycache__/\n' },
      })

      const result = validateChallenge(tmpDir, 'with-fsignore')
      expect(result.allPassed).toBe(true)
      const fsCheck = result.checks.find(c => c.label === '.fsignore')
      expect(fsCheck?.passed).toBe(true)
      expect(fsCheck?.message).toContain('parseable')
    })

    it('reports .fsignore not present when absent', () => {
      writeTree(tmpDir, {
        slug: 'no-fsignore',
        declaration: ['backend: flask', 'app: app.py', 'source_visible: false'].join('\n'),
        src: { 'app.py': 'from flask import Flask', 'flag.txt': 'flag{test_case}' },
      })

      const result = validateChallenge(tmpDir, 'no-fsignore')
      const fsCheck = result.checks.find(c => c.label === '.fsignore')
      expect(fsCheck?.passed).toBe(true)
      expect(fsCheck?.message).toContain('not present')
    })

    it('handles PHP backend correctly', () => {
      writeTree(tmpDir, {
        slug: 'php-test',
        declaration: ['number: 1', 'backend: php', 'app: index.php', 'source_visible: false'].join('\n'),
        src: { 'index.php': '<?php echo "hello"; ?>', 'flag.txt': 'flag{php_test_1}' },
      })

      const result = validateChallenge(tmpDir, 'php-test')
      expect(result.allPassed).toBe(true)
      const backendCheck = result.checks.find(c => c.label === 'backend')
      expect(backendCheck?.message).toContain('PHP')
    })
  })

  // ── Y30: a challenge with its declaration and the primary brief passes ─────────────────────

  describe('Y30', () => {
    it.each([
      ['P=zh-TW (no range.json), D+Pb', undefined, ['zh-TW']],
      ['P=zh-TW (no range.json), D+Pb+Tb', undefined, ['zh-TW', 'en']],
      ['P=en, D+Pb', '{"primaryLocale":"en"}', ['en']],
      ['P=en, D+Pb+Tb', '{"primaryLocale":"en"}', ['en', 'zh-TW']],
    ])('%s -> allPassed', (_name, rangeJson, locales) => {
      writeTree(tmpDir, { rangeJson, briefs: Object.fromEntries(locales.map((l) => [l, brief()])) })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.filter((c) => !c.passed)).toEqual([])
      expect(result.allPassed).toBe(true)
    })
  })

  // ── Y1 (validate half): the four upstream challenges, as committed ─────────────────────────

  const upstreamSkip = upstreamOnlySkipReason(
    process.env.GITHUB_REPOSITORY,
    readManifest(REPO_ROOT),
    isGitWorkTree(REPO_ROOT),
    hasRootRangeJson(REPO_ROOT),
  )
  describe.skipIf(upstreamSkip !== undefined)(
    `Y1 (validate half)${upstreamSkip ? ` [skipped: ${upstreamSkip}]` : ''}`,
    () => {
      it.each(['door-is-open', 'just-a-preview', 'selected-excerpts', 'staff-only'])(
        '%s passes every check on the real tree (read only)',
        (slug) => {
          const result = validateChallenge(REPO_ROOT, slug)
          expect(result.checks.filter((c) => !c.passed)).toEqual([])
          expect(result.allPassed).toBe(true)
        },
      )

      // Y22: each upstream brief, both locales
      it.each(['door-is-open', 'just-a-preview', 'selected-excerpts', 'staff-only'])(
        '%s: both briefs pass (read only)',
        (slug) => {
          const checks = validateChallenge(REPO_ROOT, slug).checks
          expect(checks.find((c) => c.label === 'brief (zh-TW)')?.passed).toBe(true)
          expect(checks.find((c) => c.label === 'brief (en)')?.passed).toBe(true)
        },
      )
    },
  )
})

describe('validateChallenge: declaration, brief and structure checks', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'challenge-validate-d-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  const declarationCheck = (slug = 'x') => validateChallenge(tmpDir, slug).checks.find((c) => c.label === 'declaration')

  // ── Y12 (validate half): a non-string app ───────────────────────────────────────────────────
  describe('Y12 (validate half)', () => {
    it.each([
      ['app: 3', 'app must be a string, got number'],
      ['app: true', 'app must be a string, got boolean'],
      ['app: []', 'app must be a string, got object'],
    ])('%s -> declaration fails with %s', (appLine, message) => {
      writeTree(tmpDir, { declaration: ['number: 1', 'backend: fastapi', appLine].join('\n') })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.find((c) => c.label === 'declaration')).toEqual({ label: 'declaration', passed: false, message })
      expect(result.checks.find((c) => c.label === 'backend')).toBeUndefined()
      expect(result.allPassed).toBe(false)
    })
  })

  // ── Y9 (validate half): backend absent / null ───────────────────────────────────────────────
  describe('Y9 (validate half)', () => {
    it.each([
      ['backend absent', ['app: app.py']],
      ['backend null', ['backend:', 'app: app.py']],
    ])('%s -> declaration fails', (_name, lines) => {
      writeTree(tmpDir, { declaration: lines.join('\n') })
      expect(declarationCheck()).toEqual({ label: 'declaration', passed: false, message: 'missing required field: backend' })
    })
  })

  // ── Y14 (validate half): brief keys in challenge.yaml (VM5) ─────────────────────────────────
  describe('Y14 (validate half)', () => {
    const base = ['backend: fastapi', 'app: app.py']
    it.each([
      ['title alone', ['title: T'], 'title'],
      ['description alone', ['description: D'], 'description'],
      ['layout alone', ['layout: challenge'], 'layout'],
      ['all three, in file order', ['layout: challenge', 'title: T', 'description: D'], 'layout, title, description'],
    ])('%s -> VM5', (_name, extra, keys) => {
      writeTree(tmpDir, { declaration: [...base, ...extra].join('\n') })
      expect(declarationCheck()).toEqual({
        label: 'declaration',
        passed: false,
        message: `challenge.yaml carries brief key(s) ${keys}; title, description and layout belong in each brief's frontmatter`,
      })
    })
  })

  // ── Y2 (validate half): no challenge.yaml (VM1), under both P ───────────────────────────────
  describe('Y2 (validate half)', () => {
    it.each([
      ['P=zh-TW (no range.json)', undefined, 'zh-TW'],
      ['P=en', '{"primaryLocale":"en"}', 'en'],
    ])('%s: src/ and no challenge.yaml -> one failed declaration check', (_name, rangeJson, locale) => {
      writeTree(tmpDir, { rangeJson, declaration: null, briefs: { [locale]: brief() } })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks).toEqual([
        { label: 'declaration', passed: false, message: 'platform/challenge/x/challenge.yaml not found' },
      ])
      expect(result.allPassed).toBe(false)
    })
  })

  // ── Y3 / Y6 (validate half): not a YAML mapping (VM2) ───────────────────────────────────────
  describe('Y3 (validate half)', () => {
    it.each([
      ['a 0 byte file', ''],
      ['a comments-only file', '# nothing here\n# still nothing\n'],
    ])('%s -> VM2', (_name, text) => {
      writeTree(tmpDir, { declaration: text })
      expect(declarationCheck()).toEqual({ label: 'declaration', passed: false, message: 'challenge.yaml is not a YAML mapping' })
    })
  })

  describe('Y6 (validate half)', () => {
    it.each([
      ['a sequence', '- a\n- b\n'],
      ['a string', 'hello\n'],
      ['a number', '7\n'],
      ['null', 'null\n'],
    ])('root is %s -> VM2', (_name, text) => {
      writeTree(tmpDir, { declaration: text })
      expect(declarationCheck()).toEqual({ label: 'declaration', passed: false, message: 'challenge.yaml is not a YAML mapping' })
    })
  })

  // ── Y5 (validate half): two documents (VM4) ─────────────────────────────────────────────────
  describe('Y5 (validate half)', () => {
    it('two mappings separated by --- -> VM4', () => {
      writeTree(tmpDir, { declaration: 'backend: fastapi\napp: app.py\n---\nbackend: flask\napp: app.py\n' })
      expect(declarationCheck()).toEqual({ label: 'declaration', passed: false, message: 'challenge.yaml holds more than one YAML document' })
    })

    it('contrast: a single document that opens with --- still passes the declaration check', () => {
      writeTree(tmpDir, { declaration: '---\nnumber: 1\nbackend: fastapi\napp: app.py\n' })
      expect(declarationCheck()?.passed).toBe(true)
    })
  })

  // ── Y4 (validate half): unparseable YAML (VM3) ──────────────────────────────────────────────
  describe('Y4 (validate half)', () => {
    it('backend: [flask -> VM3 with a non-empty parser message', () => {
      writeTree(tmpDir, { declaration: 'backend: [flask\napp: app.py\n' })
      const check = declarationCheck()
      expect(check?.passed).toBe(false)
      expect(check?.message).toMatch(/^invalid YAML in challenge\.yaml: ./)
    })
  })

  // ── Y13: the number check, now reading challenge.yaml ──────────────────────────────────────
  describe('Y13', () => {
    it('number absent -> the number check names challenge.yaml', () => {
      writeTree(tmpDir, { declaration: ['backend: fastapi', 'app: app.py'].join('\n') })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.find((c) => c.label === 'number')).toEqual({
        label: 'number',
        passed: false,
        message: 'no `number` in challenge.yaml; assign one greater than every number ever assigned',
      })
      expect(result.allPassed).toBe(false)
    })

    it.each([
      ['0', 'number 0'],
      ['-1', 'number -1'],
      ['1.5', 'number 1.5'],
      ['"7"', 'number "7"'],
      ['"007"', 'number "007"'],
    ])('number: %s -> %s is not an integer greater than zero', (value, text) => {
      writeTree(tmpDir, { declaration: [`number: ${value}`, 'backend: fastapi', 'app: app.py'].join('\n') })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.find((c) => c.label === 'number')).toEqual({
        label: 'number',
        passed: false,
        message: `${text} is not an integer greater than zero`,
      })
      expect(result.allPassed).toBe(false)
    })
  })

  // ── Y104: the number's upper bound ──────────────────────────────────────────────────────────
  describe('Y104', () => {
    it('Number.MAX_SAFE_INTEGER passes the number check', () => {
      writeTree(tmpDir, { declaration: ['number: 9007199254740991', 'backend: fastapi', 'app: app.py'].join('\n') })
      expect(validateChallenge(tmpDir, 'x').checks.find((c) => c.label === 'number')?.passed).toBe(true)
    })

    it.each(['1e21', '9007199254740992'])('number: %s fails with the existing message', (value) => {
      writeTree(tmpDir, { declaration: [`number: ${value}`, 'backend: fastapi', 'app: app.py'].join('\n') })
      const check = validateChallenge(tmpDir, 'x').checks.find((c) => c.label === 'number')
      expect(check?.passed).toBe(false)
      expect(check?.message).toContain('is not an integer greater than zero')
    })
  })

  // ── Y20 (validate half): the retired fields are passed through silently ────────────────────
  describe('Y20 (validate half)', () => {
    const LEGACY: Record<string, string> = {
      fs: 'fs:\n  /flag.txt: flag.txt',
      fs_key: 'fs_key: abc',
      fsKeyParts: 'fsKeyParts: [a, b]',
      encryptedFs: 'encryptedFs: x',
      flag_verifier: 'flag_verifier: h',
    }
    const base = ['number: 1', 'backend: fastapi', 'app: app.py']
    const mentions = (message: string) => /\bfs\b|fs_key|fsKeyParts|encryptedFs|flag_verifier/.test(message)

    it.each([...Object.keys(LEGACY).map((k) => [k, [LEGACY[k]]] as const), ['all five', Object.values(LEGACY)] as const])(
      '%s -> allPassed, no warning, no message names it',
      (_name, lines) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          writeTree(tmpDir, { declaration: [...base, ...lines].join('\n') })
          const result = validateChallenge(tmpDir, 'x')
          expect(result.allPassed).toBe(true)
          expect(warn.mock.calls.filter((args) => args.some((a) => /fs/.test(String(a))))).toEqual([])
          expect(result.checks.filter((c) => mentions(c.message))).toEqual([])
        } finally {
          warn.mockRestore()
        }
      },
    )
  })

  // ── Y103: the structure check (VM13, D117) ──────────────────────────────────────────────────
  describe('Y103', () => {
    it('stray entries are listed, sorted, without a trailing slash, dot-names left out', () => {
      const dir = writeTree(tmpDir)
      writeFileSync(join(dir, 'diagram.png'), 'x')
      writeFileSync(join(dir, 'index.md'), 'x')
      mkdirSync(join(dir, 'notes'))
      writeFileSync(join(dir, '.DS_Store'), 'x')
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.find((c) => c.label === 'structure')).toEqual({
        label: 'structure',
        passed: false,
        message: 'platform/challenge/x/ holds diagram.png, index.md, notes; a challenge directory holds only src/ and challenge.yaml',
      })
      expect(result.allPassed).toBe(false)
    })

    it('only .DS_Store, src/ and challenge.yaml -> the check passes', () => {
      const dir = writeTree(tmpDir)
      writeFileSync(join(dir, '.DS_Store'), 'x')
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.find((c) => c.label === 'structure')?.passed).toBe(true)
      expect(result.allPassed).toBe(true)
    })
  })

  // ── Briefs (Y24-Y29, Y31): the `brief (<L>)` checks ─────────────────────────────────────────
  const OTHER: Record<string, string> = { 'zh-TW': 'en', en: 'zh-TW' }
  const P_CASES: [string, string | undefined, string][] = [
    ['P=zh-TW', undefined, 'zh-TW'],
    ['P=en', '{"primaryLocale":"en"}', 'en'],
  ]
  const briefWith = (lines: string[]) => ['---', 'title: T', 'layout: challenge', ...lines, '---', '', '# T', ''].join('\n')
  const vm6 = (locale: string, keys: string) =>
    `platform/${locale}/challenge/x/index.md carries key(s) ${keys} that a brief may not carry; a brief holds only title, description and layout, and the challenge declaration belongs in platform/challenge/x/challenge.yaml`
  const briefCheck = (locale: string) => validateChallenge(tmpDir, 'x').checks.find((c) => c.label === `brief (${locale})`)

  /** Both locales carry a brief; `faulty` replaces the text of the one in `faultyLocale`. */
  function writeBothBriefs(rangeJson: string | undefined, faultyLocale: string, faulty: string): void {
    const other = OTHER[faultyLocale]
    writeTree(tmpDir, { rangeJson, briefs: { [faultyLocale]: faulty, [other]: brief() } })
  }

  // Y24: a declaration key in a brief
  describe('Y24', () => {
    const KEYS: [string, string][] = [
      ['backend', 'backend: flask'],
      ['number', 'number: 3'],
      ['tools', 'tools: [code]'],
      ['wasmModule', 'wasmModule: /x.wasm'],
    ]
    for (const [pName, rangeJson, primary] of P_CASES) {
      for (const [where, locale] of [['primary brief', primary], ['translation brief', OTHER[primary]]] as const) {
        it.each(KEYS)(`${pName}, ${where}, key %s -> VM6, other checks unaffected`, (key, line) => {
          writeBothBriefs(rangeJson, locale, briefWith([line]))
          const result = validateChallenge(tmpDir, 'x')
          expect(result.checks.find((c) => c.label === `brief (${locale})`)).toEqual({
            label: `brief (${locale})`,
            passed: false,
            message: vm6(locale, key),
          })
          expect(result.checks.find((c) => c.label === 'declaration')?.passed).toBe(true)
          expect(result.checks.find((c) => c.label === `brief (${OTHER[locale]})`)?.passed).toBe(true)
        })
      }
    }

    it.each(P_CASES)('%s: number and backend together are listed in file order', (_n, rangeJson, primary) => {
      writeBothBriefs(rangeJson, primary, briefWith(['number: 3', 'backend: flask']))
      expect(briefCheck(primary)?.message).toBe(vm6(primary, 'number, backend'))
    })
  })

  // Y25: the set is closed
  describe('Y25', () => {
    it.each([['outline', 'outline: x'], ['id', 'id: 7'], ['fs', 'fs: {a: b}'], ['head', 'head: [a]']])(
      'key %s -> VM6, declaration still passes',
      (key, line) => {
        writeBothBriefs(undefined, 'zh-TW', briefWith([line]))
        const result = validateChallenge(tmpDir, 'x')
        expect(result.checks.find((c) => c.label === 'brief (zh-TW)')).toEqual({
          label: 'brief (zh-TW)',
          passed: false,
          message: vm6('zh-TW', key),
        })
        expect(result.checks.find((c) => c.label === 'declaration')?.passed).toBe(true)
      },
    )
  })

  // Y26: title is a non-empty string (VM7), through validateChallengeBrief
  describe('Y26', () => {
    const rawBrief = (lines: string[]) => ['---', ...lines, '---', '', '# T', ''].join('\n')
    it.each([
      ['absent', ['layout: challenge']],
      ['null', ['title:', 'layout: challenge']],
      ['empty string', ["title: ''", 'layout: challenge']],
      ['a number', ['title: 2048', 'layout: challenge']],
    ])('title %s -> VM7', (_name, lines) => {
      writeBothBriefs(undefined, 'zh-TW', rawBrief(lines))
      expect(briefCheck('zh-TW')).toEqual({
        label: 'brief (zh-TW)',
        passed: false,
        message: 'platform/zh-TW/challenge/x/index.md: title must be a non-empty string',
      })
    })
  })

  // Y27: layout must be `challenge` (VM8)
  describe('Y27', () => {
    it.each([
      ['absent', ['title: T']],
      ['doc', ['title: T', 'layout: doc']],
      ['Challenge', ['title: T', 'layout: Challenge']],
    ])('layout %s -> VM8', (_name, lines) => {
      writeBothBriefs(undefined, 'zh-TW', ['---', ...lines, '---', '', '# T', ''].join('\n'))
      expect(briefCheck('zh-TW')).toEqual({
        label: 'brief (zh-TW)',
        passed: false,
        message: 'platform/zh-TW/challenge/x/index.md: layout must be challenge',
      })
    })
  })

  // Y28: description, when present, is a string (VM9)
  describe('Y28', () => {
    it.each([['42', 'description: 42'], ['[a]', 'description: [a]']])('description: %s -> VM9', (_name, line) => {
      writeBothBriefs(undefined, 'zh-TW', briefWith([line]))
      expect(briefCheck('zh-TW')).toEqual({
        label: 'brief (zh-TW)',
        passed: false,
        message: 'platform/zh-TW/challenge/x/index.md: description must be a string',
      })
    })
  })

  // Y29: a brief with no frontmatter block, or with frontmatter that does not parse (VM14, VM15)
  describe('Y29', () => {
    it('no frontmatter block -> VM14', () => {
      writeBothBriefs(undefined, 'zh-TW', '# Title\n')
      expect(briefCheck('zh-TW')).toEqual({
        label: 'brief (zh-TW)',
        passed: false,
        message: 'platform/zh-TW/challenge/x/index.md: no YAML frontmatter found',
      })
    })

    it('unparseable frontmatter -> VM15 with a non-empty parser message', () => {
      writeBothBriefs(undefined, 'zh-TW', ['---', 'title: [x', 'layout: challenge', '---', '', '# T', ''].join('\n'))
      const check = briefCheck('zh-TW')
      expect(check?.passed).toBe(false)
      expect(check?.message).toMatch(/^platform\/zh-TW\/challenge\/x\/index\.md: invalid YAML: ./)
    })
  })

  // Y31: the primary brief is missing (VM10), under both P and with / without a translation
  describe('Y31', () => {
    for (const [pName, rangeJson, primary] of P_CASES) {
      it.each([['no translation brief', false], ['a translation brief present', true]])(
        `${pName}, %s -> brief (${primary}) fails with VM10`,
        (_name, withTranslation) => {
          writeTree(tmpDir, { rangeJson, briefs: withTranslation ? { [OTHER[primary]]: brief() } : {} })
          const result = validateChallenge(tmpDir, 'x')
          expect(result.checks.find((c) => c.label === `brief (${primary})`)).toEqual({
            label: `brief (${primary})`,
            passed: false,
            message: `platform/${primary}/challenge/x/index.md not found; every challenge has a brief in the primary locale (${primary})`,
          })
          if (withTranslation) {
            expect(result.checks.find((c) => c.label === `brief (${OTHER[primary]})`)?.passed).toBe(true)
          } else {
            expect(result.checks.find((c) => c.label === `brief (${OTHER[primary]})`)).toBeUndefined()
          }
          expect(result.allPassed).toBe(false)
        },
      )
    }
  })

  // Y37: the primary locale is read from range.json in each of its four states
  describe('Y37', () => {
    it.each([
      ['range.json absent', undefined, 'zh-TW'],
      ['range.json {} (no primaryLocale)', '{}', 'zh-TW'],
      ['primaryLocale en', '{"primaryLocale":"en"}', 'en'],
      ['primaryLocale zh-TW', '{"primaryLocale":"zh-TW"}', 'zh-TW'],
    ])('%s -> VM10 names the %s brief', (_name, rangeJson, primary) => {
      writeTree(tmpDir, { rangeJson, briefs: {} })
      const check = validateChallenge(tmpDir, 'x').checks.find((c) => c.label.startsWith('brief ('))
      expect(check).toEqual({
        label: `brief (${primary})`,
        passed: false,
        message: `platform/${primary}/challenge/x/index.md not found; every challenge has a brief in the primary locale (${primary})`,
      })
    })
  })

  // Y23: a brief with title and layout only passes
  describe('Y23 (validate half)', () => {
    it.each(P_CASES)('%s: title and layout only -> both briefs pass, allPassed', (_n, rangeJson, primary) => {
      writeTree(tmpDir, { rangeJson, briefs: { [primary]: briefWith([]), [OTHER[primary]]: briefWith([]) } })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.checks.filter((c) => c.label.startsWith('brief (')).map((c) => c.passed)).toEqual([true, true])
      expect(result.allPassed).toBe(true)
    })
  })

  // Y19 (validate clause): unknown declaration keys pass through unmentioned
  describe('Y19 (validate clause)', () => {
    it('id, commands and author in challenge.yaml -> allPassed, no message names them', () => {
      writeTree(tmpDir, { declaration: [VALID_DECLARATION, 'id: 7', 'commands: []', 'author: x'].join('\n') })
      const result = validateChallenge(tmpDir, 'x')
      expect(result.allPassed).toBe(true)
      expect(result.checks.filter((c) => /\bid\b|commands|author/.test(c.message))).toEqual([])
    })
  })

  // Y112 (brief half): the brief is parsed with the declaration's options (D129)
  describe('Y112 (brief half)', () => {
    it('a brief key `<<` is an ordinary key, refused with VM6 naming it, with no warning written', () => {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
      const emit = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
      try {
        writeBothBriefs(undefined, 'zh-TW', briefWith(['<<: {x: 1}']))
        expect(briefCheck('zh-TW')).toEqual({ label: 'brief (zh-TW)', passed: false, message: vm6('zh-TW', '<<') })
        expect(stderr).not.toHaveBeenCalled()
        expect(emit).not.toHaveBeenCalled()
      } finally {
        stderr.mockRestore()
        emit.mockRestore()
      }
    })

    it('title twice -> VM15, with no warning written', () => {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
      const emit = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
      try {
        writeBothBriefs(undefined, 'zh-TW', ['---', 'title: A', 'title: B', 'layout: challenge', '---', '', '# T', ''].join('\n'))
        const check = briefCheck('zh-TW')
        expect(check?.passed).toBe(false)
        expect(check?.message).toMatch(/^platform\/zh-TW\/challenge\/x\/index\.md: invalid YAML: ./)
        expect(stderr).not.toHaveBeenCalled()
        expect(emit).not.toHaveBeenCalled()
      } finally {
        stderr.mockRestore()
        emit.mockRestore()
      }
    })
  })

})

describe('discoverChallenges', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'discover-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  const writeDeclaration = (slug: string) => {
    mkdirSync(join(tmpDir, 'platform', 'challenge', slug), { recursive: true })
    writeFileSync(join(tmpDir, 'platform', 'challenge', slug, 'challenge.yaml'), 'backend: fastapi\napp: app.py\n')
  }
  const writeBriefFile = (locale: string, slug: string, file = 'index.md') => {
    mkdirSync(join(tmpDir, 'platform', locale, 'challenge', slug), { recursive: true })
    writeFileSync(join(tmpDir, 'platform', locale, 'challenge', slug, file), file.endsWith('.md') ? brief() : 'x')
  }

  it('discovers per-folder challenges', () => {
    writeDeclaration('challenge-b')
    writeDeclaration('challenge-a')

    expect(discoverChallenges(tmpDir)).toEqual(['challenge-a', 'challenge-b'])
  })

  it('filters by target slug (per-folder)', () => {
    writeDeclaration('alpha')
    writeDeclaration('beta')

    expect(discoverChallenges(tmpDir, 'alpha')).toEqual(['alpha'])
  })

  it('returns empty for non-existent directory', () => {
    expect(discoverChallenges(join(tmpDir, 'nonexistent'))).toEqual([])
  })

  // Y32: a challenge with no challenge directory is still found, through its brief(s), and reported
  describe('Y32', () => {
    it.each([
      ['only the primary brief', ['zh-TW']],
      ['only a translation brief', ['en']],
      ['both briefs', ['zh-TW', 'en']],
    ])('%s, no challenge directory -> discovered, declaration check fails with VM1', (_name, locales) => {
      for (const locale of locales) writeBriefFile(locale, 'x')
      expect(discoverChallenges(tmpDir)).toContain('x')
      expect(validateChallenge(tmpDir, 'x').checks).toEqual([
        { label: 'declaration', passed: false, message: 'platform/challenge/x/challenge.yaml not found' },
      ])
    })
  })

  // Y111 (validate clause): only a brief folder's index.md makes a slug (D127)
  describe('Y111 (validate clause)', () => {
    it('hints.md beside index.md, a folder with no index.md and a folder with only notes.md', () => {
      writeDeclaration('s')
      writeBriefFile('zh-TW', 's')
      writeBriefFile('zh-TW', 's', 'hints.md')
      writeBriefFile('zh-TW', 't', 'diagram.png')
      writeBriefFile('zh-TW', 'u', 'notes.md')

      expect(discoverChallenges(tmpDir)).toEqual(['s'])
      expect(discoverChallenges(tmpDir, 't')).toEqual([])
      expect(discoverChallenges(tmpDir, 'u')).toEqual([])
    })
  })

  // Y33: only listed locales count
  describe('Y33', () => {
    it('a brief under platform/ja/ is not a challenge', () => {
      writeBriefFile('ja', 'x')
      expect(discoverChallenges(tmpDir)).toEqual([])
    })
  })
})

// ─── The command, run on a temporary copy of the repository (revision 2.3) ──────────────────────
// The copy holds package.json, scripts/ and .vitepress/ (not dist/ or cache/), with node_modules
// linked to the live one. platform/ and range.json are never copied from the live tree: each case
// writes its own fixture, so no expectation depends on upstream content (D54).

describe('challenge:validate CLI (temp copy)', () => {
  let copy: string

  beforeAll(() => {
    copy = mkdtempSync(join(realpathSync(tmpdir()), 'challenge-validate-cli-'))
    cpSync(join(REPO_ROOT, 'package.json'), join(copy, 'package.json'))
    cpSync(join(REPO_ROOT, 'scripts'), join(copy, 'scripts'), { recursive: true })
    cpSync(join(REPO_ROOT, '.vitepress'), join(copy, '.vitepress'), {
      recursive: true,
      filter: (src) => {
        const rel = relative(join(REPO_ROOT, '.vitepress'), src).split(sep)[0]
        return rel !== 'dist' && rel !== 'cache'
      },
    })
    symlinkSync(join(REPO_ROOT, 'node_modules'), join(copy, 'node_modules'))
  })

  afterAll(() => {
    rmSync(copy, { recursive: true, force: true })
  })

  afterEach(() => {
    rmSync(join(copy, 'platform'), { recursive: true, force: true })
    rmSync(join(copy, 'range.json'), { recursive: true, force: true })
  })

  const run = (...args: string[]) => {
    const res = spawnSync(process.execPath, ['--experimental-strip-types', join(copy, 'scripts', 'challenge-validate.ts'), ...args], {
      cwd: copy,
      encoding: 'utf8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    })
    return { status: res.status, stdout: res.stdout, stderr: res.stderr, firstErrLine: res.stderr.split('\n')[0] }
  }

  /** A valid challenge `door-is-open` with its primary brief, and the primary home page. */
  const validFixture = (rangeJson?: string, primary = 'zh-TW') => {
    writeTree(copy, { rangeJson, slug: 'door-is-open', briefs: { [primary]: brief() } })
    writeFileSync(join(copy, 'platform', primary, 'index.md'), '# Home\n')
  }

  const PL_E08_FIRST_LINE =
    'PL-E08: these pages are outside the locale folders. Every page lives in platform/<locale>/ for a locale on the locale list (en, zh-TW); a range on the old layout moves its pages as README.en.md describes in "Moving to the locale folders" (README.md: 「搬到語系資料夾」):'

  const snapshot = (dir: string): Record<string, string> => {
    const out: Record<string, string> = {}
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, e.name)
        if (e.isDirectory()) walk(full)
        else out[relative(dir, full)] = readFileSync(full, 'utf8')
      }
    }
    walk(dir)
    return out
  }

  // Y35
  describe('Y35', () => {
    it('(a) a slug found by its challenge directory -> exit 0, reported', () => {
      validFixture()
      const res = run('door-is-open')
      expect(res.stdout).toContain('Validating: door-is-open')
      expect(res.stdout).toContain('All checks passed.')
      expect(res.status).toBe(0)
    })

    it('(b) a slug found only by its brief -> VM1, exit 1, not "Challenge not found"', () => {
      mkdirSync(join(copy, 'platform', 'zh-TW', 'challenge', 'only-brief'), { recursive: true })
      writeFileSync(join(copy, 'platform', 'zh-TW', 'challenge', 'only-brief', 'index.md'), brief())
      writeFileSync(join(copy, 'platform', 'zh-TW', 'index.md'), '# Home\n')
      const res = run('only-brief')
      expect(res.stdout).toContain('Validating: only-brief')
      expect(res.stdout).toContain('platform/challenge/only-brief/challenge.yaml not found')
      expect(res.status).toBe(1)
      expect(res.stderr).not.toContain('Challenge not found')
    })

    it('(c) an unknown slug -> "Challenge not found", exit 1', () => {
      validFixture()
      const res = run('nope')
      expect(res.stderr).toContain('Challenge not found: nope')
      expect(res.status).toBe(1)
    })

    it('(d) the copy is isolated from the live tree', () => {
      const realCopy = realpathSync(copy)
      expect(realCopy.startsWith(realpathSync(tmpdir()))).toBe(true)
      expect(relative(realpathSync(REPO_ROOT), realCopy).startsWith('..')).toBe(true)
    })
  })

  // Y36: R19, the six range.json faults stop the command before anything is validated
  describe('Y36', () => {
    const CASES: [string, (dir: string) => void, string][] = [
      [
        'PL-E01 (range.json is a directory)',
        (dir) => mkdirSync(join(dir, 'range.json')),
        'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.',
      ],
      ['PL-E03 (not JSON)', (dir) => writeFileSync(join(dir, 'range.json'), '{'), 'PL-E03: range.json is not valid JSON.'],
      ['PL-E04 (not an object)', (dir) => writeFileSync(join(dir, 'range.json'), '[]'), 'PL-E04: range.json does not hold a JSON object.'],
      [
        'PL-E05 (primaryLocale not a string)',
        (dir) => writeFileSync(join(dir, 'range.json'), '{"primaryLocale":7}'),
        'PL-E05: "primaryLocale" in range.json is not a string: 7.',
      ],
      [
        'PL-E06 (primaryLocale not on the list)',
        (dir) => writeFileSync(join(dir, 'range.json'), '{"primaryLocale":"ja"}'),
        'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.',
      ],
    ]

    it.each(CASES)('%s -> first stderr line is the PL line, nothing validated', (_name, breakRange, firstLine) => {
      validFixture()
      rmSync(join(copy, 'range.json'), { force: true })
      breakRange(copy)
      const res = run()
      expect(res.status).toBe(1)
      expect(res.firstErrLine).toBe(firstLine)
      expect(res.stdout).not.toContain('Validating:')
      expect(res.stdout).not.toContain('\u2713')
      expect(res.stdout).not.toContain('\u2717')
    })

    it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('PL-E02 (mode 000) -> first stderr line is the PL line, nothing validated', () => {
      validFixture()
      writeFileSync(join(copy, 'range.json'), '{}')
      chmodSync(join(copy, 'range.json'), 0o000)
      try {
        const res = run()
        expect(res.status).toBe(1)
        expect(res.firstErrLine).toBe('PL-E02: range.json could not be read (EACCES).')
        expect(res.stdout).not.toContain('Validating:')
        expect(res.stdout).not.toContain('\u2713')
        expect(res.stdout).not.toContain('\u2717')
      } finally {
        chmodSync(join(copy, 'range.json'), 0o644)
      }
    })
  })

  // B38 (validate half): the layout check runs first, after range.json is read
  describe('B38 (validate half)', () => {
    const legacyFixture = (rangeJson?: string) => {
      validFixture(rangeJson)
      writeFileSync(join(copy, 'platform', 'index.md'), '# Old home\n')
      mkdirSync(join(copy, 'platform', 'guide'), { recursive: true })
      writeFileSync(join(copy, 'platform', 'guide', 'x.md'), '# Old guide\n')
    }

    it('old layout -> PL-E08 with the pages, nothing validated, nothing written', () => {
      legacyFixture()
      const before = snapshot(join(copy, 'platform'))
      const res = run()
      expect(res.status).not.toBe(0)
      expect(res.stderr.split('\n').slice(0, 3)).toEqual([PL_E08_FIRST_LINE, '  "platform/guide/x.md"', '  "platform/index.md"'])
      expect(res.stdout).not.toContain('\u2713')
      expect(res.stdout).not.toContain('\u2717')
      expect(res.stdout).not.toContain('Validating:')
      expect(snapshot(join(copy, 'platform'))).toEqual(before)
    })

    it('old layout and a broken range.json -> PL-E03 first, not PL-E08', () => {
      legacyFixture('{')
      const res = run()
      expect(res.status).not.toBe(0)
      expect(res.firstErrLine).toBe('PL-E03: range.json is not valid JSON.')
    })
  })

  // Y34: the three legacy shapes, with and without a slug
  describe('Y34', () => {
    const SHAPES: [string, string, string][] = [
      ['platform/challenge/<slug>/index.md', 'door-is-open/index.md', 'platform/challenge/door-is-open/index.md'],
      ['platform/challenge/<slug>/notes.md', 'door-is-open/notes.md', 'platform/challenge/door-is-open/notes.md'],
      ['a flat platform/challenge/old.md', 'old.md', 'platform/challenge/old.md'],
    ]
    for (const [name, file, listed] of SHAPES) {
      it.each([['no slug', []], ['slug door-is-open', ['door-is-open']]])(`${name}, %s -> PL-E08 naming the file`, (_n, args) => {
        validFixture()
        writeFileSync(join(copy, 'platform', 'challenge', file), '# legacy\n')
        const res = run(...args)
        expect(res.status).toBe(1)
        expect(res.stderr.split('\n').slice(0, 2)).toEqual([PL_E08_FIRST_LINE, `  "${listed}"`])
        expect(res.stdout).not.toContain('\u2713')
        expect(res.stdout).not.toContain('\u2717')
      })
    }

    it('only platform/challenge/<slug>/src/README.md -> not a legacy page, exit 0', () => {
      validFixture()
      writeFileSync(join(copy, 'platform', 'challenge', 'door-is-open', 'src', 'README.md'), '# src readme\n')
      expect(run('door-is-open').status).toBe(0)
    })
  })
})
