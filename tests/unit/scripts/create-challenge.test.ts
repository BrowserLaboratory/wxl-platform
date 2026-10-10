import { describe, it, expect } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { validateChallengeConfig } from '../../../.vitepress/challenge/config'
import {
  validateArgs,
  generateFlag,
  checkCollision,
  flaskSkeleton,
  fastApiSkeleton,
  phpSkeleton,
  generateMarkdown,
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

describe('checkCollision', () => {
  it('throws when <slug>.md already exists', () => {
    const existsFn = (p: string) => p.endsWith('my-challenge.md')
    expect(() => checkCollision('my-challenge', '/platform/challenge', existsFn)).toThrow()
  })

  it('throws when <slug>/index.md already exists', () => {
    const existsFn = (p: string) => p.endsWith('my-challenge/index.md')
    expect(() => checkCollision('my-challenge', '/platform/challenge', existsFn)).toThrow()
  })

  it('does not throw when neither md nor directory exists', () => {
    expect(() => checkCollision('new-challenge', '/platform/challenge', () => false)).not.toThrow()
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

// ─── Task 7.4: Frontmatter PLACEHOLDER fields ────────────────────────────────

describe('generateMarkdown', () => {
  const opts: ScaffoldOptions = {
    slug: 'test-challenge',
    title: 'Test Challenge',
    backend: 'flask',
    difficulty: 'easy',
    flag: 'FLAG{test_abc12345}',
    number: 8,
  }

  function extractFrontmatter(content: string) {
    const m = content.match(/^---\n([\s\S]*?)\n---/)
    if (!m) throw new Error('no frontmatter found')
    return parseYaml(m[1]) as Record<string, unknown>
  }

  it('generates valid YAML frontmatter parseable by validateChallengeConfig', () => {
    const content = generateMarkdown(opts)
    const fm = extractFrontmatter(content)
    expect(() => validateChallengeConfig(fm)).not.toThrow()
  })

  // The number is what a printed handout names. A scaffold that omits it produces
  // a challenge that fails validation the moment it is created, so the number is
  // written at creation rather than left for the author to remember.
  it('writes the assigned number into the frontmatter', () => {
    const fm = extractFrontmatter(generateMarkdown({ ...opts, number: 12 }))
    expect(fm.number).toBe(12)
  })

  it('emits a number the numbering validation accepts', () => {
    const fm = extractFrontmatter(generateMarkdown(opts))
    expect(isChallengeNumber(fm.number)).toBe(true)
  })

  it('does not include legacy fields (flag_verifier, fs_key)', () => {
    const content = generateMarkdown(opts)
    const fm = extractFrontmatter(content)
    expect(fm).not.toHaveProperty('flag_verifier')
    expect(fm).not.toHaveProperty('fs_key')
  })

  it('includes all required frontmatter fields', () => {
    const content = generateMarkdown(opts)
    const fm = extractFrontmatter(content)
    expect(fm.layout).toBe('challenge')
    expect(fm.backend).toBe('flask')
    expect(fm.title).toBe('Test Challenge')
    expect(fm.difficulty).toBe('easy')
    expect(fm.category).toBe('web')
    expect(fm.packages).toEqual([])
    expect(typeof fm.app).toBe('string')
    expect(fm.app).toBe('app.py')
    expect(fm.fs).toBeUndefined()
  })

  it('uses index.php for PHP backend', () => {
    const content = generateMarkdown({ ...opts, backend: 'php' })
    const fm = extractFrontmatter(content)
    expect(String(fm.app)).toContain('index.php')
  })

  it('uses app.py for flask and fastapi backends', () => {
    for (const backend of ['flask', 'fastapi'] as const) {
      const content = generateMarkdown({ ...opts, backend })
      const fm = extractFrontmatter(content)
      expect(String(fm.app)).toContain('app.py')
    }
  })

  it('includes a date field in ISO 8601 format', () => {
    const before = Date.now()
    const content = generateMarkdown(opts)
    const after = Date.now()
    const fm = extractFrontmatter(content)
    expect(typeof fm.date).toBe('string')
    const ts = new Date(fm.date as string).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('includes a tags field as an empty array', () => {
    const content = generateMarkdown(opts)
    const fm = extractFrontmatter(content)
    expect(Array.isArray(fm.tags)).toBe(true)
    expect(fm.tags).toEqual([])
  })
})
