import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateRedirects, writeRedirects, indexSlugs } from '../../../scripts/generate-redirects'

// `platform/public/_redirects` is a public commitment: the paths in it are printed on
// handouts. It used to be hand-edited, and nothing kept it in step with the
// challenge tree. It is now generated, and the last test in this file is what
// makes that mean something — it fails when the committed file and the tree
// disagree, whichever of the two moved.

/** Write a challenge page carrying `number`, or none when it is undefined. */
function writeChallenge(root: string, locale: 'root' | 'zh-TW', slug: string, number?: unknown): void {
  const dir = locale === 'root'
    ? join(root, 'platform', 'challenge', slug)
    : join(root, 'platform', 'zh-TW', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = ['---', `title: ${slug}`, 'layout: challenge']
  if (number !== undefined) lines.push(`number: ${number}`)
  lines.push('---', '', `# ${slug}`)
  writeFileSync(join(dir, 'index.md'), lines.join('\n'), 'utf-8')
}

interface Rule { from: string; to: string; status: number }

/** The four numbered source forms, in the order the generator writes them (G5). */
const FORMS = ['/c/', '/en/c/', '/zh/c/', '/zh-TW/c/']

/** The rules in file order — the order is the whole point, so it is preserved. */
function rules(content: string): Rule[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => {
      const f = l.split(/\s+/)
      return { from: f[0], to: f[1], status: Number(f[2]) }
    })
}

describe('generateRedirects', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'generate-redirects-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes the schema: four rules per challenge, the untranslated one’s Traditional Chinese rules at its English page, then four parameterised rules (G1–G5, G8)', () => {
    // Spec 0008 traceability, "Schema: redirect rules (S6)": #1 translated, #5 English-only.
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)
    writeChallenge(root, 'root', 'v05-php-check', 5)

    expect(rules(generateRedirects(root))).toEqual([
      { from: '/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/en/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/zh/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
      { from: '/zh-TW/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
      { from: '/c/005', to: '/challenge/v05-php-check/', status: 302 },
      { from: '/en/c/005', to: '/challenge/v05-php-check/', status: 302 },
      { from: '/zh/c/005', to: '/challenge/v05-php-check/', status: 302 },
      { from: '/zh-TW/c/005', to: '/challenge/v05-php-check/', status: 302 },
      { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/en/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
      { from: '/zh-TW/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
    ])
  })

  it('gives the same bytes for the same tree, whatever order its directories were made in (G5)', () => {
    // A regression guard, green before this change too: nothing in the output may follow
    // creation order, a Map's insertion order or the clock.
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)
    writeChallenge(root, 'root', 'v05-php-check', 5)
    const other = mkdtempSync(join(tmpdir(), 'generate-redirects-'))
    try {
      writeChallenge(other, 'root', 'v05-php-check', 5)
      writeChallenge(other, 'zh-TW', 'door-is-open', 1)
      writeChallenge(other, 'root', 'door-is-open', 1)

      expect(generateRedirects(other)).toBe(generateRedirects(root))
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  it('orders by number, not by slug, all four forms of each (G5)', () => {
    // `aaa` sorts first by name and last by number.
    writeChallenge(root, 'root', 'aaa', 10)
    writeChallenge(root, 'zh-TW', 'aaa', 10)
    writeChallenge(root, 'root', 'zzz', 2)

    expect(rules(generateRedirects(root)).filter((r) => !r.from.includes(':'))).toEqual([
      { from: '/c/002', to: '/challenge/zzz/', status: 302 },
      { from: '/en/c/002', to: '/challenge/zzz/', status: 302 },
      { from: '/zh/c/002', to: '/challenge/zzz/', status: 302 },
      { from: '/zh-TW/c/002', to: '/challenge/zzz/', status: 302 },
      { from: '/c/010', to: '/challenge/aaa/', status: 302 },
      { from: '/en/c/010', to: '/challenge/aaa/', status: 302 },
      { from: '/zh/c/010', to: '/zh-TW/challenge/aaa/', status: 302 },
      { from: '/zh-TW/c/010', to: '/zh-TW/challenge/aaa/', status: 302 },
    ])
  })

  it('pads to three digits in all four forms and keeps a wider number at its own width (G10)', () => {
    writeChallenge(root, 'root', 'small', 7)
    writeChallenge(root, 'root', 'large', 1234)

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    for (const form of FORMS) {
      expect(froms).toContain(`${form}007`)
      expect(froms).toContain(`${form}1234`)
    }
  })

  it('does not emit the unpadded spelling in any form (G10)', () => {
    // One canonical spelling per challenge: what is printed, what is displayed
    // and what is copied are the same string.
    writeChallenge(root, 'root', 'first', 1)
    writeChallenge(root, 'zh-TW', 'first', 1)

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    for (const form of FORMS) {
      expect(froms).not.toContain(`${form}1`)
      expect(froms).toContain(`${form}001`)
    }
  })

  it('re-points, not removes, the Traditional Chinese rules of a challenge whose Traditional Chinese page is left out (G3)', () => {
    // An untracked or ignored Traditional Chinese directory reaches the generator as an
    // excluded `zh-TW` entry (the hook's index slugs).
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)

    const numbered = rules(generateRedirects(root, { includeSlug: (_slug, locale) => locale !== 'zh-TW' }))
      .filter((r) => !r.from.includes(':'))
    expect(numbered).toEqual([
      { from: '/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/en/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/zh/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/zh-TW/c/001', to: '/challenge/door-is-open/', status: 302 },
    ])
  })

  it('groups whatever set of pages is included: a challenge without its English page gets its Traditional Chinese rules, one without either gets none', () => {
    // Robustness, not G9: neither the hook nor CI hands the generator such a set.
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)
    writeChallenge(root, 'root', 'staff-only', 2)
    writeChallenge(root, 'zh-TW', 'staff-only', 2)

    const numbered = rules(generateRedirects(root, {
      includeSlug: (slug, locale) => !(slug === 'door-is-open' && locale === 'root') && slug !== 'staff-only',
    })).filter((r) => !r.from.includes(':'))
    expect(numbered).toEqual([
      { from: '/zh/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
      { from: '/zh-TW/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
    ])
  })

  it('gives a challenge with only a Traditional Chinese brief its two Traditional Chinese rules, after the challenges numbered below it (G9, G5, G8)', () => {
    // Refused by the pre-commit hook and CI's tree check (G6), reachable through --no-verify.
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'chinese-only', 7)

    const all = rules(generateRedirects(root))
    expect(all).toHaveLength(4 + 2 + 4)
    expect(all.slice(4, 6)).toEqual([
      { from: '/zh/c/007', to: '/zh-TW/challenge/chinese-only/', status: 302 },
      { from: '/zh-TW/c/007', to: '/zh-TW/challenge/chinese-only/', status: 302 },
    ])
  })

  it('states the 500-challenge limit in its header (G8)', () => {
    writeChallenge(root, 'root', 'first', 1)

    const header = generateRedirects(root).split('\n').filter((l) => l.startsWith('#')).join(' ')
    expect(header).toMatch(/500 numbered challenges/)
    expect(header).toMatch(/2,000 static/)
    expect(header).not.toMatch(/2100/)
  })

  it('places every numeric rule before the parameterised rules', () => {
    // Cloudflare takes the first match and `/c/:slug` matches any single
    // segment, a number included. A numeric rule below it never runs, and
    // nothing about that failure is visible at deploy time.
    writeChallenge(root, 'root', 'first', 1)
    writeChallenge(root, 'zh-TW', 'first', 1)
    writeChallenge(root, 'root', 'second', 2)
    writeChallenge(root, 'zh-TW', 'second', 2)

    const all = rules(generateRedirects(root))
    const lastNumeric = all.map((r) => r.from).reduce((acc, f, i) => (/^\/(?:en\/|zh\/|zh-TW\/)?c\/\d+$/.test(f) ? i : acc), -1)
    const firstParameterised = all.findIndex((r) => r.from.includes(':'))

    expect(lastNumeric).toBeGreaterThan(-1)
    expect(firstParameterised).toBeGreaterThan(lastNumeric)
  })

  it('ends with the four parameterised rules (G4)', () => {
    writeChallenge(root, 'root', 'first', 1)

    const all = rules(generateRedirects(root))
    expect(all.slice(-4)).toEqual([
      { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/en/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
      { from: '/zh-TW/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
    ])
  })

  it('orders numeric rules by number', () => {
    writeChallenge(root, 'root', 'later', 10)
    writeChallenge(root, 'root', 'earlier', 2)

    const numeric = rules(generateRedirects(root))
      .map((r) => r.from)
      .filter((f) => /^\/c\/\d+$/.test(f))
    expect(numeric).toEqual(['/c/002', '/c/010'])
  })

  it('refuses a challenge with no number and names it', () => {
    writeChallenge(root, 'root', 'unnumbered')

    expect(() => generateRedirects(root)).toThrow(/unnumbered/)
  })

  it('refuses two challenges sharing a number and names both', () => {
    writeChallenge(root, 'root', 'earlier', 3)
    writeChallenge(root, 'root', 'later', 3)

    expect(() => generateRedirects(root)).toThrow(/earlier[\s\S]*later|later[\s\S]*earlier/)
  })

  it('writes no file at all when the tree is inconsistent', () => {
    // A partial file is worse than no file: it would 302 some numbers and 404
    // others, and the deploy would look like it worked.
    writeChallenge(root, 'root', 'unnumbered')
    const target = join(root, 'platform', 'public', '_redirects')

    expect(() => writeRedirects(root)).toThrow()
    expect(existsSync(target)).toBe(false)
  })
})

describe('the committed _redirects', () => {
  const REPO_ROOT = resolve(__dirname, '../../..')

  /**
   * The challenge slugs git knows about, per locale tree: a page counts only where its own tree's
   * `<slug>/index.md` is in the index, as in the pre-commit hook (`indexSlugs`), so an untracked
   * Traditional Chinese brief beside a tracked English page re-points its rules here as it does
   * there.
   *
   * Not the directory listing: `challenge-keygen.test.ts` scaffolds a throwaway
   * challenge into the real `platform/challenge/` to drive the keygen CLI, and
   * vitest runs test files in parallel — so a plain listing here sees a
   * directory that exists for a few hundred milliseconds and is nobody's. Git's
   * index includes staged files, so a challenge being added is covered from the
   * moment it is staged, which is before it can be committed or built.
   */
  function trackedSlugs(): Map<string, Set<string>> {
    return indexSlugs(REPO_ROOT)
  }

  it('is byte-identical to what the challenge tree generates', () => {
    // The one assertion that ties the file to the tree. It fails on a rule
    // hand-edited into the file, on a rule silently dropped from it, and on a
    // rule left behind by a challenge that no longer exists. redirects.test.ts
    // checks the rules' shape and each challenge's four rules; this one checks
    // every byte, the header and the order included.
    const tracked = trackedSlugs()
    expect(tracked.get('root')?.size ?? 0, 'no challenges are tracked; the slug filter is wrong').toBeGreaterThan(0)

    const committed = readFileSync(resolve(REPO_ROOT, 'platform/public/_redirects'), 'utf8')
    expect(committed).toBe(generateRedirects(REPO_ROOT, {
      includeSlug: (slug, locale) => tracked.get(locale)?.has(slug) ?? false,
    }))
  })
})
