import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LOCALES } from '../../../.vitepress/locales'
import {
  generateRedirects,
  writeRedirects,
  indexSlugs,
  redirectsHeader,
} from '../../../scripts/generate-redirects'

// `platform/public/_redirects` is a public commitment: the paths in it are printed on
// handouts. It used to be hand-edited, and nothing kept it in step with the
// challenge tree. It is now generated, and the last test in this file is what
// makes that mean something — it fails when the committed file and the tree
// disagree, whichever of the two moved.
//
// Every tree here is built under os.tmpdir() in the split layout (0010): a declaration
// `platform/challenge/<slug>/challenge.yaml` carries the number, a brief
// `platform/<locale>/challenge/<slug>/index.md` is a page. `P` is the primary locale.

type Primary = 'en' | 'zh-TW'
const BOTH: Primary[] = ['en', 'zh-TW']

/** Write a challenge declaration. `numberYaml` is the YAML text after `number: `; none writes no `number` key. */
function writeDeclaration(root: string, slug: string, numberYaml?: string): void {
  const dir = join(root, 'platform', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = [`title: x`]
  if (numberYaml !== undefined) lines.push(`number: ${numberYaml}`)
  writeFileSync(join(dir, 'challenge.yaml'), lines.join('\n') + '\n', 'utf-8')
}

/** Write a brief (a page); `extraFrontmatter` lines go into its frontmatter. */
function writeBrief(root: string, locale: 'en' | 'zh-TW', slug: string, extraFrontmatter: string[] = []): void {
  const dir = join(root, 'platform', locale, 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = ['---', `title: ${slug}`, 'layout: challenge', ...extraFrontmatter, '---', '', `# ${slug}`]
  writeFileSync(join(dir, 'index.md'), lines.join('\n'), 'utf-8')
}

function writeRange(root: string, text: string): void {
  writeFileSync(join(root, 'range.json'), text, 'utf-8')
}

function writeHome(root: string, primary: Primary): void {
  mkdirSync(join(root, 'platform', primary), { recursive: true })
  writeFileSync(join(root, 'platform', primary, 'index.md'), '# home\n', 'utf-8')
}

/** A challenge with its declaration and the briefs named. */
function challenge(root: string, slug: string, number: number | string, briefs: Array<'en' | 'zh-TW'>): void {
  writeDeclaration(root, slug, String(number))
  for (const locale of briefs) writeBrief(root, locale, slug)
}

function setPrimary(root: string, primary: Primary): void {
  writeRange(root, JSON.stringify({ primaryLocale: primary }))
}

interface Rule { from: string; to: string; status: number }

/** The four numbered source forms, in the order the generator writes them (D57). */
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

/** PAT5 (S30): the numbered-rule source. */
const PAT5 = /^\/(?:en\/|zh\/|zh-TW\/)?c\/[0-9]{3,}$/

/** The numbered rules of a generated file, in file order. */
function numbered(content: string): Rule[] {
  return rules(content).filter((r) => PAT5.test(r.from))
}

/** One challenge's four numbered rules, `targets` in form order. */
function four(padded: string, targets: [string, string, string, string]): Rule[] {
  return FORMS.map((form, i) => ({ from: `${form}${padded}`, to: targets[i], status: 302 }))
}

/** Comment lines with their `# ` removed, blank ones dropped, joined by one space. */
function commentText(lines: string[]): string {
  return lines
    .filter((l) => l.startsWith('#'))
    .map((l) => l.replace(/^#\s?/, '').trim())
    .filter((l) => l !== '')
    .join(' ')
}

describe('generateRedirects', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'generate-redirects-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const DOOR = '/challenge/door-is-open/'
  const DOOR_ZH = '/zh-TW/challenge/door-is-open/'
  const DOOR_EN = '/en/challenge/door-is-open/'

  interface TargetCase {
    row: string
    primary: Primary
    setup: (root: string) => void
    include?: (slug: string, tree: string) => boolean
    expected: Rule[]
  }

  const targetCases: TargetCase[] = [
    {
      row: 'S1 en, primary and zh-TW briefs',
      primary: 'en',
      setup: (r) => challenge(r, 'door-is-open', 1, ['en', 'zh-TW']),
      expected: four('001', [DOOR, DOOR, DOOR_ZH, DOOR_ZH]),
    },
    {
      row: 'S2 en, zh-TW brief missing',
      primary: 'en',
      setup: (r) => challenge(r, 'v05-php-check', 5, ['en']),
      expected: four('005', Array(4).fill('/challenge/v05-php-check/') as [string, string, string, string]),
    },
    {
      row: 'S3 en, zh-TW brief on disk but not included',
      primary: 'en',
      setup: (r) => challenge(r, 'door-is-open', 1, ['en', 'zh-TW']),
      include: (_slug, tree) => tree !== 'zh-TW',
      expected: four('001', [DOOR, DOOR, DOOR, DOOR]),
    },
    {
      row: 'S4 zh-TW, primary and en briefs',
      primary: 'zh-TW',
      setup: (r) => challenge(r, 'door-is-open', 1, ['en', 'zh-TW']),
      expected: four('001', [DOOR, DOOR_EN, DOOR, DOOR]),
    },
    {
      row: 'S5 zh-TW, en brief missing',
      primary: 'zh-TW',
      setup: (r) => challenge(r, 'v05-php-check', 5, ['zh-TW']),
      expected: four('005', Array(4).fill('/challenge/v05-php-check/') as [string, string, string, string]),
    },
    {
      row: 'S6 zh-TW, en brief on disk but not included',
      primary: 'zh-TW',
      setup: (r) => challenge(r, 'door-is-open', 1, ['en', 'zh-TW']),
      include: (_slug, tree) => tree !== 'en',
      expected: four('001', [DOOR, DOOR, DOOR, DOOR]),
    },
    {
      row: 'S7 en, orphan: only a zh-TW brief (D58 third fallback)',
      primary: 'en',
      setup: (r) => {
        challenge(r, 'door-is-open', 1, ['en', 'zh-TW'])
        challenge(r, 'chinese-only', 7, ['zh-TW'])
      },
      expected: [
        ...four('001', [DOOR, DOOR, DOOR_ZH, DOOR_ZH]),
        ...four('007', Array(4).fill('/zh-TW/challenge/chinese-only/') as [string, string, string, string]),
      ],
    },
    {
      row: 'S8 zh-TW, orphan: only an en brief',
      primary: 'zh-TW',
      setup: (r) => challenge(r, 'english-only', 7, ['en']),
      expected: four('007', Array(4).fill('/en/challenge/english-only/') as [string, string, string, string]),
    },
  ]

  it.each(targetCases)('numbered rules, $row (S1–S8, D58)', ({ primary, setup, include, expected }) => {
    setPrimary(root, primary)
    setup(root)
    expect(numbered(generateRedirects(root, include ? { includeSlug: include } : {}))).toEqual(expected)
  })

  it('S3 and S6 keep the rule count of S1 and S4: re-pointed, not removed', () => {
    for (const primary of BOTH) {
      setPrimary(root, primary)
      challenge(root, 'door-is-open', 1, ['en', 'zh-TW'])
      const all = numbered(generateRedirects(root))
      const excluded = numbered(generateRedirects(root, { includeSlug: (_s, tree) => tree === 'declaration' || tree === primary }))
      expect(excluded).toHaveLength(all.length)
      expect(excluded).toHaveLength(4)
    }
  })

  describe.each(BOTH)('S9 a challenge with no included brief, P = %s', (primary) => {
    it('gets no numbered rule when no brief is on disk, and generation succeeds', () => {
      setPrimary(root, primary)
      writeDeclaration(root, 'door-is-open', '1')
      expect(numbered(generateRedirects(root))).toEqual([])
    })

    it('gets none when its briefs are on disk but excluded; with one included it gets four', () => {
      setPrimary(root, primary)
      challenge(root, 'door-is-open', 1, ['en', 'zh-TW'])
      expect(numbered(generateRedirects(root, { includeSlug: (_s, tree) => tree === 'declaration' }))).toEqual([])
      expect(numbered(generateRedirects(root, { includeSlug: (_s, tree) => tree !== 'zh-TW' && tree !== 'en' }))).toEqual([])
      expect(numbered(generateRedirects(root, { includeSlug: (_s, tree) => tree === 'declaration' || tree === primary }))).toHaveLength(4)
    })
  })

  describe('S10 no primaryLocale in range.json: zh-TW', () => {
    it.each([
      ['no range.json', undefined],
      ['range.json without the key', '{"upstream":{"repo":"x"}}'],
    ])('%s gives the output of {"primaryLocale":"zh-TW"}, not the output of "en"', (_name, text) => {
      challenge(root, 'door-is-open', 1, ['en', 'zh-TW'])
      if (text !== undefined) writeRange(root, text)
      const got = generateRedirects(root)

      writeRange(root, '{"primaryLocale":"zh-TW"}')
      const zh = generateRedirects(root)
      writeRange(root, '{"primaryLocale":"en"}')
      const en = generateRedirects(root)

      expect(got).toBe(zh)
      expect(got).not.toBe(en)
    })
  })

  describe('S11 an unusable range.json: refused before any challenge is read (D123)', () => {
    const cases: Array<[string, string, (root: string) => void]> = [
      ['PL-E01 a directory', 'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.',
        (r) => mkdirSync(join(r, 'range.json'))],
      ['PL-E01 a symlink', 'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.',
        (r) => {
          writeFileSync(join(r, 'real.json'), '{"primaryLocale":"en"}')
          symlinkSync(join(r, 'real.json'), join(r, 'range.json'))
        }],
      ['PL-E03 `{`', 'PL-E03: range.json is not valid JSON.', (r) => writeRange(r, '{')],
      ['PL-E04 `[]`', 'PL-E04: range.json does not hold a JSON object.', (r) => writeRange(r, '[]')],
      ['PL-E05 a number', 'PL-E05: "primaryLocale" in range.json is not a string: 1.', (r) => writeRange(r, '{"primaryLocale":1}')],
      ['PL-E06 fr', 'PL-E06: "primaryLocale" in range.json is "fr", which is not on the locale list: en, zh-TW.', (r) => writeRange(r, '{"primaryLocale":"fr"}')],
    ]

    it.each(cases)('%s', (_name, firstLine, setup) => {
      // A declaration without a number: were the challenges read first, this would be the fault.
      writeDeclaration(root, 'unnumbered')
      setup(root)

      let message = ''
      try {
        generateRedirects(root)
      } catch (err) {
        message = (err as Error).message
      }
      expect(message.split('\n')[0]).toBe(firstLine)
    })

    it.each(cases)('%s: writeRedirects writes no file and leaves an existing one alone', (_name, firstLine, setup) => {
      writeDeclaration(root, 'unnumbered')
      setup(root)
      mkdirSync(join(root, 'platform', 'public'), { recursive: true })
      const target = join(root, 'platform', 'public', '_redirects')

      expect(() => writeRedirects(root)).toThrow(firstLine.split('\n')[0])
      expect(existsSync(target)).toBe(false)

      writeFileSync(target, 'kept\n')
      expect(() => writeRedirects(root)).toThrow(firstLine)
      expect(readFileSync(target, 'utf8')).toBe('kept\n')
    })
  })

  it.each(BOTH)('S12 orders by number, not by slug, all four forms of each, P = %s', (primary) => {
    // `aaa` sorts first by name and last by number.
    setPrimary(root, primary)
    challenge(root, 'aaa', 10, ['en', 'zh-TW'])
    challenge(root, 'zzz', 2, [primary])

    const zzz = '/challenge/zzz/'
    const aaa = primary === 'en'
      ? four('010', ['/challenge/aaa/', '/challenge/aaa/', '/zh-TW/challenge/aaa/', '/zh-TW/challenge/aaa/'])
      : four('010', ['/challenge/aaa/', '/en/challenge/aaa/', '/challenge/aaa/', '/challenge/aaa/'])
    expect(numbered(generateRedirects(root))).toEqual([
      ...four('002', [zzz, zzz, zzz, zzz]),
      ...aaa,
    ])
  })

  it.each(BOTH)('S13 gives the same bytes for the same tree, whatever order its directories were made in, P = %s', (primary) => {
    // A regression guard, green before this change too: nothing in the output may follow
    // creation order, a Map's insertion order or the clock.
    setPrimary(root, primary)
    challenge(root, 'door-is-open', 1, ['en', 'zh-TW'])
    challenge(root, 'v05-php-check', 5, [primary])
    const other = mkdtempSync(join(tmpdir(), 'generate-redirects-'))
    try {
      setPrimary(other, primary)
      challenge(other, 'v05-php-check', 5, [primary])
      challenge(other, 'door-is-open', 1, ['zh-TW', 'en'])

      expect(generateRedirects(other)).toBe(generateRedirects(root))
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  it.each(BOTH)('S14 pads to three digits in all four forms, keeps a wider number at its own width, and never emits the unpadded spelling, P = %s', (primary) => {
    setPrimary(root, primary)
    challenge(root, 'small', 7, [primary])
    challenge(root, 'large', 1234, [primary])
    challenge(root, 'first', 1, [primary])

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    for (const form of FORMS) {
      expect(froms).toContain(`${form}007`)
      expect(froms).toContain(`${form}1234`)
      expect(froms).toContain(`${form}001`)
      expect(froms).not.toContain(`${form}7`)
      expect(froms).not.toContain(`${form}1`)
    }
  })

  describe.each(BOTH)('S15 a declaration whose number is unusable, P = %s', (primary) => {
    const bad: Array<[string, string | undefined]> = [
      ['no number', undefined],
      ['malformed YAML', 'number: [unclosed'],
      ['a string "007"', '"007"'],
      ['zero', '0'],
      ['1.5', '1.5'],
    ]

    it.each(bad)('%s: refused, naming the slug and the declaration; writeRedirects writes no file', (_name, numberYaml) => {
      setPrimary(root, primary)
      writeHome(root, primary)
      mkdirSync(join(root, 'platform', 'public'), { recursive: true })
      writeDeclaration(root, 'unnumbered', numberYaml)
      writeBrief(root, primary, 'unnumbered')

      let message = ''
      try {
        generateRedirects(root)
      } catch (err) {
        message = (err as Error).message
      }
      expect(message).toContain('unnumbered (platform/challenge/unnumbered/challenge.yaml)')

      expect(() => writeRedirects(root)).toThrow(message)
      expect(existsSync(join(root, 'platform', 'public', '_redirects'))).toBe(false)
    })

    it('writes no file at all when the tree is inconsistent', () => {
      // A partial file is worse than no file: it would 302 some numbers and 404
      // others, and the deploy would look like it worked.
      setPrimary(root, primary)
      writeHome(root, primary)
      mkdirSync(join(root, 'platform', 'public'), { recursive: true })
      writeDeclaration(root, 'unnumbered')
      const target = join(root, 'platform', 'public', '_redirects')

      expect(() => writeRedirects(root)).toThrow()
      expect(existsSync(target)).toBe(false)
    })
  })

  it.each(BOTH)('S75 the largest safe integer is a rule; 1e21 is a number fault, P = %s', (primary) => {
    setPrimary(root, primary)
    challenge(root, 'big', 9007199254740991, [primary])
    const got = numbered(generateRedirects(root))
    expect(got.map((r) => r.from)).toContain('/c/9007199254740991')
    for (const r of got) expect(r.from).toMatch(PAT5)

    writeDeclaration(root, 'big', '1e21')
    expect(() => generateRedirects(root)).toThrow('platform/challenge/big/challenge.yaml')
  })

  it.each(BOTH)('S16 refuses two challenges sharing a number and names both, P = %s', (primary) => {
    setPrimary(root, primary)
    challenge(root, 'earlier', 3, [primary])
    challenge(root, 'later', 3, [primary])

    expect(() => generateRedirects(root)).toThrow(/earlier[\s\S]*later|later[\s\S]*earlier/)
  })

  it.each(BOTH)('S17 a brief that carries its own number does not change the rules, P = %s', (primary) => {
    setPrimary(root, primary)
    writeDeclaration(root, 'door-is-open', '4')
    writeBrief(root, primary, 'door-is-open', ['number: 9'])

    const froms = rules(generateRedirects(root)).map((r) => r.from)
    expect(froms).toContain('/c/004')
    expect(froms.filter((f) => f.endsWith('009'))).toEqual([])
  })

  describe.each(BOTH)('S18 a brief with no declaration, P = %s (D64 b)', (primary) => {
    const kinds: Array<[string, undefined | ((slug: string, tree: string) => boolean)]> = [
      ['declaration absent from disk', undefined],
      ['declaration on disk but not included', (_slug, tree) => tree !== 'declaration'],
    ]
    for (const locale of BOTH) {
      for (const [kind, include] of kinds) {
        it(`${locale} brief, ${kind}`, () => {
          setPrimary(root, primary)
          writeBrief(root, locale, 'x')
          if (include !== undefined) writeDeclaration(root, 'x', '1')

          const call = () => generateRedirects(root, include ? { includeSlug: include } : {})
          expect(call).toThrow()
          expect(call).toThrow(`platform/${locale}/challenge/x/index.md`)
          expect(call).toThrow('platform/challenge/x/challenge.yaml')
        })
      }
    }
  })

  it.each(BOTH)('S21 a folder that is not on the locale list is ignored, P = %s', (primary) => {
    setPrimary(root, primary)
    challenge(root, 'door-is-open', 1, ['en', 'zh-TW'])
    const before = generateRedirects(root)

    mkdirSync(join(root, 'platform', 'fr', 'challenge', 'x'), { recursive: true })
    writeFileSync(join(root, 'platform', 'fr', 'challenge', 'x', 'index.md'), '# x\n')

    expect(generateRedirects(root)).toBe(before)
  })

  it('S22 ends with the four parameterised rules, P = en (G4)', () => {
    setPrimary(root, 'en')
    challenge(root, 'first', 1, ['en'])

    expect(rules(generateRedirects(root)).slice(-4)).toEqual([
      { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/en/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
      { from: '/zh-TW/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
    ])
  })

  it('S23 the slug rules of P = zh-TW point at the primary page and /en/ (D59)', () => {
    challenge(root, 'first', 1, ['zh-TW'])

    const all = rules(generateRedirects(root))
    expect(all.slice(-5, -1)).toEqual([
      { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/en/c/:slug', to: '/en/challenge/:slug/', status: 302 },
      { from: '/zh/c/:slug', to: '/challenge/:slug/', status: 302 },
      { from: '/zh-TW/c/:slug', to: '/challenge/:slug/', status: 302 },
    ])
  })

  it('S24 the old-address rule is last, once, and only when P = zh-TW (D60)', () => {
    challenge(root, 'first', 1, ['zh-TW'])
    const zh = rules(generateRedirects(root))
    expect(zh[zh.length - 1]).toEqual({ from: '/zh-TW/*', to: '/:splat', status: 302 })
    expect(zh.filter((r) => r.from === '/zh-TW/*')).toHaveLength(1)

    setPrimary(root, 'en')
    writeBrief(root, 'en', 'first')
    expect(rules(generateRedirects(root)).filter((r) => r.from.includes('*') || r.to.includes('*'))).toEqual([])
  })

  it.each(BOTH)('S25 places every numeric rule before every slug and old-address rule, P = %s', (primary) => {
    setPrimary(root, primary)
    challenge(root, 'first', 1, ['en', 'zh-TW'])
    challenge(root, 'second', 2, ['en', 'zh-TW'])

    const all = rules(generateRedirects(root))
    const lastNumeric = all.map((r) => r.from).reduce((acc, f, i) => (PAT5.test(f) ? i : acc), -1)
    const firstOther = all.findIndex((r) => r.from.includes(':') || r.from.includes('*'))

    expect(lastNumeric).toBeGreaterThan(-1)
    expect(firstOther).toBeGreaterThan(lastNumeric)
  })

  describe('the header (S26)', () => {
    const K1 = 'Cloudflare Pages allows 2,000 static and 100 dynamic rules. Every numbered challenge takes one static rule per short-link form, 4 in all, so a range holds at most 500 numbered challenges.'
    const K2 = 'The slug links take 4 dynamic rules.'
    const K3 = 'The slug links take 4 dynamic rules, and the rule for old /zh-TW/ addresses takes 1 more.'

    it.each([['en', K2], ['zh-TW', K3]] as Array<[Primary, string]>)('P = %s states K1 and its own sentence, and the 500-challenge limit (G8)', (primary, specific) => {
      setPrimary(root, primary)
      challenge(root, 'first', 1, [primary])

      const header = commentText(generateRedirects(root).split('\n\n')[0].split('\n'))
      expect(header).toContain(K1)
      expect(header).toContain(specific)
      expect(header).toMatch(/500 numbered challenges/)
      expect(header).toMatch(/2,000 static/)
      expect(header).not.toMatch(/2100/)
      if (primary === 'en') expect(header).not.toContain('old /zh-TW/ addresses')
    })

    it('S26b a form list of length 5 (injected) states 5, 400 and 5 dynamic rules', () => {
      const five = ['/c/', '/en/c/', '/zh/c/', '/zh-TW/c/', '/x/c/'].map((prefix) => ({ prefix, locale: null }))
      const header = commentText(redirectsHeader('en', five).split('\n'))
      expect(header).toContain('5 in all')
      expect(header).toContain('at most 400 numbered challenges')
      expect(header).toContain('take 5 dynamic rules')
    })
  })

  describe('the section comments (S27)', () => {
    const THESE = 'These come first on purpose: Cloudflare takes the first match and `/c/:slug` matches any single segment, a number included. A numeric rule placed after it would never run, and nothing about that would be visible at deploy time.'
    const k4 = (name: string) => `Numbered short links, 4 per challenge. A number is assigned once and never reused, so a link printed on a handout keeps pointing at the same challenge even after the challenge is renamed. The copy control gives each locale's own form, /en/c/NNN and /zh-TW/c/NNN; /c/NNN, which opens the primary locale's page, and /zh/c/NNN are kept so links already handed out keep opening. A locale's rules open the ${name} page, the primary locale's, while the challenge has no page in that locale, or, for a challenge without a primary-locale page, the first locale's page that exists.`

    it.each([['en', 'English'], ['zh-TW', 'Traditional Chinese']] as Array<[Primary, string]>)('K4 with the primary locale named, P = %s', (primary, name) => {
      setPrimary(root, primary)
      challenge(root, 'first', 1, [primary])

      const block = generateRedirects(root).split('\n\n')[1]
      expect(commentText(block.split('\n'))).toBe(`${k4(name)} ${THESE}`)
    })

    const K5 = 'Addresses under /zh-TW/ from when Traditional Chinese was a translation. This range\'s primary locale is Traditional Chinese, so its pages are at the root: /zh-TW/<path> goes to /<path>. Last on purpose: every /zh-TW/c/ rule above must match first.'

    it('K5 sits directly above the old-address rule when P = zh-TW, and is absent when P = en', () => {
      challenge(root, 'first', 1, ['zh-TW'])
      const lines = generateRedirects(root).split('\n')
      const at = lines.findIndex((l) => l.startsWith('/zh-TW/*'))
      expect(at).toBeGreaterThan(0)
      const above: string[] = []
      for (let i = at - 1; i >= 0 && lines[i].startsWith('#'); i--) above.unshift(lines[i])
      expect(commentText(above)).toBe(K5)

      setPrimary(root, 'en')
      writeBrief(root, 'en', 'first')
      expect(generateRedirects(root)).not.toContain('Addresses under /zh-TW/ from when Traditional Chinese was a translation.')
    })
  })

  describe.each(BOTH)('S51 the slug grammar and number shadowing in full mode (D150), P = %s', (primary) => {
    const GRAMMAR = '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    const names: Array<[string, string]> = [
      ['A B', '"A B"'],
      ['a_b', '"a_b"'],
      ['-a', '"-a"'],
      ['a-', '"a-"'],
      ['a\nb', '"a\\nb"'],
    ]
    const places: Array<[string, (root: string, name: string) => void]> = [
      ['the declaration tree only', (r, name) => challenge(r, name, 1, [])],
      ['the en brief tree only', (r, name) => writeBrief(r, 'en', name)],
      ['the zh-TW brief tree only', (r, name) => writeBrief(r, 'zh-TW', name)],
    ]

    for (const [place, put] of places) {
      it.each(names)(`a name ${place}: %j is refused with one line, nothing written`, (name, json) => {
        setPrimary(root, primary)
        writeHome(root, primary)
        mkdirSync(join(root, 'platform', 'public'), { recursive: true })
        put(root, name)
        const line = `redirects: challenge slug ${json} is outside ${GRAMMAR}`

        let message = ''
        try {
          generateRedirects(root)
        } catch (err) {
          message = (err as Error).message
        }
        expect(message.split('\n')).toEqual([line])

        expect(() => writeRedirects(root)).toThrow(line)
        expect(existsSync(join(root, 'platform', 'public', '_redirects'))).toBe(false)
      })
    }

    it('an all-digit slug equal to another challenge’s padded number is refused', () => {
      setPrimary(root, primary)
      challenge(root, '005', 9, [primary])
      challenge(root, 'other', 5, [primary])
      expect(() => generateRedirects(root)).toThrow(
        new Error("redirects: challenge slug \"005\" equals challenge 005's padded number"),
      )
    })

    it('a four-digit slug equal to another challenge’s number is refused', () => {
      setPrimary(root, primary)
      challenge(root, '1234', 9, [primary])
      challenge(root, 'other', 1234, [primary])
      expect(() => generateRedirects(root)).toThrow(
        new Error("redirects: challenge slug \"1234\" equals challenge 1234's padded number"),
      )
    })

    it('a slug equal to its own padded number is accepted', () => {
      setPrimary(root, primary)
      challenge(root, '005', 5, [primary])
      expect(numbered(generateRedirects(root)).map((r) => r.from)).toEqual(['/c/005', '/en/c/005', '/zh/c/005', '/zh-TW/c/005'])
    })
  })
})

describe('the committed _redirects', () => {
  const REPO_ROOT = resolve(__dirname, '../../..')
  const materialised: string[] = []

  afterEach(() => {
    for (const dir of materialised.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  /**
   * The challenge slugs git knows about, per tree (`declaration` and each locale): a file counts
   * only where git's index lists it, as in the pre-commit hook (`indexSlugs`), so an untracked
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

  /**
   * The index's `range.json`, declarations and briefs, written to a temporary directory: the
   * generator reads files, and the working tree can differ from the index (the hook's oracle does
   * the same). Only the index is read and only the temporary directory is written; a `range.json`
   * that is a link in the index is written as one, so the generator refuses it (PL-E01).
   */
  function materialiseIndex(): string {
    const listed = execFileSync('git', ['ls-files', '-z', '--', 'range.json', 'platform/'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    const briefs = LOCALES.map((l) => new RegExp(`^platform/${l}/challenge/[^/]+/index\\.md$`))
    const keep = listed
      .split('\0')
      .filter(
        (path) =>
          path === 'range.json' ||
          /^platform\/challenge\/[^/]+\/challenge\.yaml$/.test(path) ||
          briefs.some((re) => re.test(path)),
      )
    const tmp = mkdtempSync(join(tmpdir(), 'redirects-index-'))
    materialised.push(tmp)
    if (keep.length > 0) {
      execFileSync('git', ['checkout-index', '-z', '--stdin', `--prefix=${tmp}/`], {
        cwd: REPO_ROOT,
        input: keep.join('\0') + '\0',
      })
    }
    return tmp
  }

  it('is byte-identical to what the challenge tree generates', () => {
    // The one assertion that ties the file to the tree. It fails on a rule
    // hand-edited into the file, on a rule silently dropped from it, and on a
    // rule left behind by a challenge that no longer exists. redirects.test.ts
    // checks the rules' shape and each challenge's four rules; this one checks
    // every byte, the header and the order included.
    const tracked = trackedSlugs()
    expect(tracked.get('declaration')?.size ?? 0, 'no challenges are tracked; the slug filter is wrong').toBeGreaterThan(0)

    const tmp = materialiseIndex()
    const committed = readFileSync(resolve(REPO_ROOT, 'platform/public/_redirects'), 'utf8')
    expect(committed).toBe(generateRedirects(tmp, {
      includeSlug: (slug, tree) => tracked.get(tree)?.has(slug) ?? false,
    }))
  })
})
