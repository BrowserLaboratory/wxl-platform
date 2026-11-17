import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { validateChallengeBrief, validateChallengeDeclaration } from '../../../.vitepress/challenge/config'
import { LOCALES, type Locale } from '../../../.vitepress/locales'
import {
  validateArgs,
  generateFlag,
  checkCollision,
  flaskSkeleton,
  fastApiSkeleton,
  phpSkeleton,
  generateDeclaration,
  generateBrief,
  getTitle,
  SCAFFOLD_TEXT,
  type ScaffoldOptions,
} from '../../../scripts/create-challenge'
import { isChallengeNumber } from '../../../scripts/challenge-numbers'

// ─── Task 7.1: CLI arg validation ────────────────────────────────────────────

describe('validateArgs', () => {
  it('throws when --name is missing', () => {
    expect(() =>
      validateArgs({ name: undefined, backend: 'flask', difficulty: 'easy', title: undefined, flag: undefined }),
    ).toThrow(/--name/)
  })

  it('throws when --backend is an invalid value', () => {
    expect(() =>
      validateArgs({ name: 'test-challenge', backend: 'django', difficulty: 'easy', title: undefined, flag: undefined }),
    ).toThrow(/backend/)
  })

  it('returns defaults when only --name is provided', () => {
    const opts = validateArgs({ name: 'my-chal', backend: undefined, difficulty: undefined, title: undefined, flag: undefined })
    expect(opts.backend).toBe('flask')
    expect(opts.difficulty).toBe('easy')
    expect(opts.flag).toMatch(/^FLAG\{my-chal_[0-9a-f]{8}\}$/)
  })

  it('accepts all valid backends', () => {
    for (const backend of ['flask', 'fastapi', 'php']) {
      expect(() =>
        validateArgs({ name: 'chal', backend, difficulty: 'easy', title: undefined, flag: undefined }),
      ).not.toThrow()
    }
  })

  it('throws when --difficulty is an invalid value', () => {
    expect(() =>
      validateArgs({ name: 'test-challenge', backend: 'flask', difficulty: 'insane', title: undefined, flag: undefined }),
    ).toThrow(/difficulty/)
  })

  it('accepts all valid difficulties', () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      expect(() =>
        validateArgs({ name: 'chal', backend: 'flask', difficulty, title: undefined, flag: undefined }),
      ).not.toThrow()
    }
  })
})

// ─── Task 7.1 (continued): generateFlag format ────────────────────────────────

describe('generateFlag', () => {
  it('generates flag in FLAG{<slug>_<8hex>} format', () => {
    const flag = generateFlag('my-challenge')
    expect(flag).toMatch(/^FLAG\{my-challenge_[0-9a-f]{8}\}$/)
  })

  it('generates unique flags on successive calls', () => {
    const a = generateFlag('test')
    const b = generateFlag('test')
    // With 4 bytes of randomness the probability of collision is negligible
    expect(a).not.toBe(b)
  })
})

// ─── Task 7.2: Slug collision detection ──────────────────────────────────────

/** What `checkCollision` throws for `slug` under `root`, or `undefined`. */
function collisionMessage(slug: string, root: string): string | undefined {
  try {
    checkCollision(slug, root)
  } catch (e) {
    return (e as Error).message
  }
  return undefined
}

/** A repository root under os.tmpdir() holding the given files (contents irrelevant). */
function rootWith(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'wxl-collision-'))
  tmpRoots.push(root)
  for (const f of files) {
    mkdirSync(join(root, f, '..'), { recursive: true })
    writeFileSync(join(root, f), 'x', 'utf-8')
  }
  return root
}
const tmpRoots: string[] = []
afterEach(() => {
  while (tmpRoots.length > 0) rmSync(tmpRoots.pop()!, { recursive: true, force: true })
})

describe('checkCollision', () => {
  // Y-q4: at this level a flat file is no collision. `run` never gets this far with one:
  // its layout check (Y105) refuses the tree with PL-E08 first.
  it('Y82: a flat platform/challenge/<slug>.md is not a collision', () => {
    expect(collisionMessage('s', rootWith(['platform/challenge/s.md']))).toBeUndefined()
  })

  it.each([
    ['only src/', ['platform/challenge/s/src/app.py']],
    ['only challenge.yaml', ['platform/challenge/s/challenge.yaml']],
    ['both', ['platform/challenge/s/challenge.yaml', 'platform/challenge/s/src/app.py']],
  ])('Y80: an existing challenge directory collides (%s)', (_label, files) => {
    expect(collisionMessage('s', rootWith(files))).toBe('Challenge "s" already exists: platform/challenge/s/')
  })

  it.each([...LOCALES])('Y81: platform/%s/challenge/<slug>/ collides whatever it holds', (L) => {
    expect(collisionMessage('s', rootWith([`platform/${L}/challenge/s/diagram.png`]))).toBe(
      `Challenge "s" already exists: platform/${L}/challenge/s/`,
    )
  })

  it('does not throw when neither md nor directory exists', () => {
    expect(() => checkCollision('new-challenge', rootWith([]))).not.toThrow()
  })
})

// ─── Task 7.3: App skeleton content correctness ──────────────────────────────

describe('flaskSkeleton', () => {
  it('contains Flask import', () => {
    expect(flaskSkeleton('sqli-basic')).toContain('from flask import Flask')
  })

  it('defines a GET / route', () => {
    expect(flaskSkeleton('sqli-basic')).toContain("@app.route('/')")
  })

  it('reads from /flag.txt', () => {
    expect(flaskSkeleton('sqli-basic')).toContain('/flag.txt')
  })
})

describe('fastApiSkeleton', () => {
  it('contains FastAPI import', () => {
    expect(fastApiSkeleton('idor-demo')).toContain('from fastapi import FastAPI')
  })

  it('defines a GET / route', () => {
    expect(fastApiSkeleton('idor-demo')).toContain("@app.get('/')")
  })

  it('reads from /flag.txt', () => {
    expect(fastApiSkeleton('idor-demo')).toContain('/flag.txt')
  })
})

describe('phpSkeleton', () => {
  it('starts with PHP opening tag', () => {
    expect(phpSkeleton('lfi-demo').trimStart()).toMatch(/^<\?php/)
  })

  it('references /flag.txt', () => {
    expect(phpSkeleton('lfi-demo')).toContain('/flag.txt')
  })
})

// ─── Task 7.4, Y75: the declaration (challenge.yaml) ─────────────────────────

describe('generateDeclaration', () => {
  const opts: ScaffoldOptions = {
    slug: 'test-challenge',
    title: 'Test Challenge',
    backend: 'flask',
    difficulty: 'easy',
    flag: 'FLAG{test_abc12345}',
    number: 8,
  }

  function declared(o: ScaffoldOptions): Record<string, unknown> {
    return parseYaml(generateDeclaration(o)) as Record<string, unknown>
  }

  it('Y75: keys exactly number, difficulty, category, backend, app, packages, date, tags, in order', () => {
    const fm = declared(opts)
    expect(Object.keys(fm)).toEqual(['number', 'difficulty', 'category', 'backend', 'app', 'packages', 'date', 'tags'])
    for (const k of ['title', 'layout', 'description', 'wasmModule']) expect(fm).not.toHaveProperty(k)
    expect(() => validateChallengeDeclaration(fm)).not.toThrow()
  })

  it('generates a declaration parseable by validateChallengeDeclaration', () => {
    expect(() => validateChallengeDeclaration(declared(opts))).not.toThrow()
  })

  // The number is what a printed handout names. A scaffold that omits it produces
  // a challenge that fails validation the moment it is created, so the number is
  // written at creation rather than left for the author to remember.
  it('writes the assigned number into the declaration', () => {
    expect(declared({ ...opts, number: 12 }).number).toBe(12)
  })

  it('emits a number the numbering validation accepts', () => {
    expect(isChallengeNumber(declared(opts).number)).toBe(true)
  })

  it('does not include legacy fields (flag_verifier, fs_key)', () => {
    const fm = declared(opts)
    expect(fm).not.toHaveProperty('flag_verifier')
    expect(fm).not.toHaveProperty('fs_key')
  })

  it('includes all required declaration fields', () => {
    const fm = declared(opts)
    expect(fm.backend).toBe('flask')
    expect(fm.difficulty).toBe('easy')
    expect(fm.category).toBe('web')
    expect(fm.packages).toEqual([])
    expect(typeof fm.app).toBe('string')
    expect(fm.app).toBe('app.py')
    expect(fm.fs).toBeUndefined()
  })

  it('uses index.php for PHP backend', () => {
    expect(String(declared({ ...opts, backend: 'php' }).app)).toContain('index.php')
  })

  it('uses app.py for flask and fastapi backends', () => {
    for (const backend of ['flask', 'fastapi'] as const) {
      expect(String(declared({ ...opts, backend }).app)).toContain('app.py')
    }
  })

  it('includes a date field in ISO 8601 format', () => {
    const before = Date.now()
    const content = generateDeclaration(opts)
    const after = Date.now()
    const fm = parseYaml(content) as Record<string, unknown>
    expect(typeof fm.date).toBe('string')
    const ts = new Date(fm.date as string).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('includes a tags field as an empty array', () => {
    const fm = declared(opts)
    expect(Array.isArray(fm.tags)).toBe(true)
    expect(fm.tags).toEqual([])
  })
})

// ─── Y78: the scaffold's text, per locale ────────────────────────────────────

describe('SCAFFOLD_TEXT', () => {
  it('Y78: the body placeholder per locale', () => {
    expect(SCAFFOLD_TEXT.en.body).toBe('TODO: Write challenge description here.')
    // The full-width colon is D137's.
    expect(SCAFFOLD_TEXT['zh-TW'].body).toBe('TODO：在這裡寫說明頁內文。')
  })
})

// ─── Y74: the brief ──────────────────────────────────────────────────────────

const BRIEF_OPTS: ScaffoldOptions = {
  slug: 'test-challenge',
  title: 'Test Challenge',
  backend: 'flask',
  difficulty: 'easy',
  flag: 'FLAG{test_abc12345}',
  number: 8,
}

/** The frontmatter mapping and everything after the closing `---` line (its newline included in neither). */
function splitBrief(content: string): { fm: Record<string, unknown>; after: string } {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) throw new Error('no frontmatter found')
  return { fm: parseYaml(m[1]) as Record<string, unknown>, after: m[2] }
}

describe('generateBrief', () => {
  it.each<Locale>(['en', 'zh-TW'])('Y74: brief keys and body (%s)', (P) => {
    const { fm, after } = splitBrief(generateBrief(BRIEF_OPTS, P))
    expect(Object.keys(fm)).toEqual(['title', 'layout'])
    expect(fm.layout).toBe('challenge')
    expect(after).toBe(`\n# Test Challenge\n\n${SCAFFOLD_TEXT[P].body}\n`)
    expect(() => validateChallengeBrief(fm)).not.toThrow()
  })
})

// ─── Y76, Y77: the title ─────────────────────────────────────────────────────

describe('getTitle', () => {
  it("Y76: no --title gives the locale's default title", () => {
    const expected: Record<Locale, string> = {
      en: 'Stage8 Decl',
      'zh-TW': '未命名題目（stage8-decl）',
    }
    for (const P of ['en', 'zh-TW'] as const) {
      const title = getTitle('stage8-decl', undefined, P)
      expect(title).toBe(expected[P])
      const { fm, after } = splitBrief(generateBrief({ ...BRIEF_OPTS, slug: 'stage8-decl', title }, P))
      expect(fm.title).toBe(expected[P])
      expect(after.split('\n')[1]).toBe(`# ${expected[P]}`)
    }
  })
})

describe('--title', () => {
  it.each<Locale>(['en', 'zh-TW'])('Y77: --title is used verbatim (%s)', (P) => {
    const title = getTitle('x', 'X Y', P)
    expect(title).toBe('X Y')
    const out = generateBrief({ ...BRIEF_OPTS, slug: 'x', title }, P)
    expect(out).toContain('title: X Y\n')
    expect(out).toContain('\n# X Y\n')
  })
})

describe('SCAFFOLD_TEXT totality', () => {
  it('Y79: SCAFFOLD_TEXT is total over LOCALES', () => {
    for (const L of LOCALES) {
      expect(SCAFFOLD_TEXT[L].title('a-b')).not.toBe('')
      expect(SCAFFOLD_TEXT[L].body).toContain('TODO')
    }
  })
})

