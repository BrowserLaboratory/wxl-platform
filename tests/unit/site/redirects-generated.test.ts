import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateRedirects, writeRedirects } from '../../../scripts/generate-redirects'

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

  it('emits both numeric rules for a translated challenge', () => {
    writeChallenge(root, 'root', 'door-is-open', 1)
    writeChallenge(root, 'zh-TW', 'door-is-open', 1)

    expect(rules(generateRedirects(root))).toEqual(
      expect.arrayContaining([
        { from: '/c/001', to: '/challenge/door-is-open/', status: 302 },
        { from: '/zh/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
      ]),
    )
  })

  it('pads to three digits and keeps a wider number at its own width', () => {
    writeChallenge(root, 'root', 'small', 7)
    writeChallenge(root, 'root', 'large', 1234)

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    expect(froms).toContain('/c/007')
    expect(froms).toContain('/c/1234')
  })

  it('does not emit the unpadded spelling', () => {
    // One canonical spelling per challenge: what is printed, what is displayed
    // and what is copied are the same string.
    writeChallenge(root, 'root', 'first', 1)

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    expect(froms).not.toContain('/c/1')
    expect(froms).toContain('/c/001')
  })

  it('places every numeric rule before both parameterised rules', () => {
    // Cloudflare takes the first match and `/c/:slug` matches any single
    // segment, a number included. A numeric rule below it never runs, and
    // nothing about that failure is visible at deploy time.
    writeChallenge(root, 'root', 'first', 1)
    writeChallenge(root, 'zh-TW', 'first', 1)
    writeChallenge(root, 'root', 'second', 2)
    writeChallenge(root, 'zh-TW', 'second', 2)

    const all = rules(generateRedirects(root))
    const lastNumeric = all.map((r) => r.from).reduce((acc, f, i) => (/^\/(zh\/)?c\/\d+$/.test(f) ? i : acc), -1)
    const firstParameterised = all.findIndex((r) => r.from.includes(':'))

    expect(lastNumeric).toBeGreaterThan(-1)
    expect(firstParameterised).toBeGreaterThan(lastNumeric)
  })

  it('keeps the two parameterised rules unchanged and last', () => {
    writeChallenge(root, 'root', 'first', 1)

    const all = rules(generateRedirects(root))
    expect(all.slice(-2)).toEqual([
      { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
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
   * The challenge slugs git knows about.
   *
   * Not the directory listing: `challenge-keygen.test.ts` scaffolds a throwaway
   * challenge into the real `platform/challenge/` to drive the keygen CLI, and
   * vitest runs test files in parallel — so a plain listing here sees a
   * directory that exists for a few hundred milliseconds and is nobody's. Git's
   * index includes staged files, so a challenge being added is covered from the
   * moment it is staged, which is before it can be committed or built.
   */
  function trackedSlugs(): Set<string> {
    const out = execFileSync('git', ['ls-files', 'platform/challenge', 'platform/zh-TW/challenge'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    const slugs = new Set<string>()
    for (const line of out.split('\n')) {
      const m = line.match(/^platform\/(?:zh-TW\/)?challenge\/([^/]+)\/index\.md$/)
      if (m) slugs.add(m[1])
    }
    return slugs
  }

  it('is byte-identical to what the challenge tree generates', () => {
    // The one assertion that ties the file to the tree. It fails on a rule
    // hand-edited into the file, on a rule silently dropped from it, and on a
    // rule left behind by a challenge that no longer exists — none of which the
    // per-rule checks in redirects.test.ts can see, because they derive their
    // expectations from the same tree the file is supposed to match.
    const tracked = trackedSlugs()
    expect(tracked.size, 'no challenges are tracked; the slug filter is wrong').toBeGreaterThan(0)

    const committed = readFileSync(resolve(REPO_ROOT, 'platform/public/_redirects'), 'utf8')
    expect(committed).toBe(generateRedirects(REPO_ROOT, { includeSlug: (s) => tracked.has(s) }))
  })
})
