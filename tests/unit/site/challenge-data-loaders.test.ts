import { describe, it, expect, afterAll } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { watch, loadChallengeLists } from '../../../platform/shared/challenges.data'
import { LOCALES, type Locale } from '../../../.vitepress/locales'
import { declarationReadError } from '../../../.vitepress/challenge/declaration'
import { readPrimaryLocale } from '../../../.vitepress/primary-locale'

// T-0077 wave 3 (0010-S18; D40): there is one data loader, `platform/shared/challenges.data.ts`, a
// VitePress `{ watch, load }` loader that reads every locale folder's briefs and every challenge's
// declaration and hands them to `mergeLocaleChallenges`. Cases that run the loader build a temporary
// copy of a tree under os.tmpdir(); none writes into the repository.

describe('the challenge data loader', () => {
  it('L19: watch is built from LOCALES and covers challenge.yaml', () => {
    // Only the two-locale literal is asserted (L-q2): mocking the locale list would mock our own module.
    expect(watch).toEqual([
      '../en/challenge/*/index.md',
      '../zh-TW/challenge/*/index.md',
      '../challenge/*/challenge.yaml',
    ])
  })
})

// ─── temporary trees ────────────────────────────────────────────────────────────────────────
const roots: string[] = []
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

/** Writes `files` (paths relative to the tree root) into a new directory under os.tmpdir(). */
function makeTree(files: Record<string, string>): { root: string; srcDir: string; files: string[] } {
  const root = mkdtempSync(join(tmpdir(), 'wxl-loader-'))
  roots.push(root)
  const written: string[] = []
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, text)
    written.push(abs)
  }
  return { root, srcDir: join(root, 'platform'), files: written }
}

const brief = (title: string, extra = '') => `---\ntitle: ${title}\nlayout: challenge\ndescription: About ${title}\n${extra}---\n\nBody\n`
const PRIMARIES: readonly Locale[] = ['en', 'zh-TW']
const other = (primary: Locale): Locale => (primary === 'en' ? 'zh-TW' : 'en')

describe.each(PRIMARIES)('loadChallengeLists, P = %s', (P) => {
  const T = other(P)

  it("L20: one parser; the declaration's date stays a string", async () => {
    const tree = makeTree({
      [`platform/${P}/challenge/x/index.md`]: brief('Primary X', 'date: 2020-01-01\n'),
      [`platform/${T}/challenge/x/index.md`]: brief('Translated X', 'date: 2020-01-01\n'),
      // Not quoted: YAML 1.1 would read it as a timestamp; the core schema keeps it a string (D79).
      'platform/challenge/x/challenge.yaml': 'number: 1\ncategory: web\ndate: 2026-04-02T08:54:17.674Z\n',
    })
    const lists = await loadChallengeLists(tree.srcDir, tree.files, { locales: LOCALES, primary: P })
    for (const locale of LOCALES) {
      expect(typeof lists[locale][0].date).toBe('string')
      expect(lists[locale][0].date).toBe('2026-04-02T08:54:17.674Z')
    }
    expect(lists[P][0]).toMatchObject({ url: '/challenge/x/', title: 'Primary X', locale: P })
    expect(lists[T][0]).toMatchObject({ url: `/${T}/challenge/x/`, title: 'Translated X', locale: T })
  })

  // L6 (D56): a listed challenge whose declaration cannot be read fails the loader with the same
  // PL-E13 / PL-E14 text the page build gives, so a broken declaration stops the list and the page alike.
  const UNREADABLE: Record<string, string | undefined> = {
    absent: undefined,
    'invalid-yaml': 'number: [1\n',
    'multi-document': 'number: 1\n---\nnumber: 2\n',
    'not-a-mapping': '- one\n- two\n',
  }

  it.each(['absent', 'invalid-yaml', 'multi-document', 'not-a-mapping'] as const)(
    'L6: a listed challenge with an unreadable declaration (%s) fails the loader',
    async (reason) => {
      const yaml = UNREADABLE[reason]
      const tree = makeTree({
        [`platform/${P}/challenge/x/index.md`]: brief('X'),
        ...(yaml === undefined ? {} : { 'platform/challenge/x/challenge.yaml': yaml }),
      })
      const loaded = loadChallengeLists(tree.srcDir, tree.files, { locales: LOCALES, primary: P })
      await expect(loaded).rejects.toThrow(new RegExp(`^${reason === 'absent' ? 'PL-E13' : 'PL-E14'}: `))
      await expect(loaded).rejects.toThrow(declarationReadError(`${P}/challenge/x/index.md`, 'x', reason).message)
      // Whole-message equality against the formatter, then against the text written out by hand
      // (repository-relative paths), so a drift in the formatter itself is caught too.
      await expect(loaded).rejects.toMatchObject({ message: declarationReadError(`${P}/challenge/x/index.md`, 'x', reason).message })
      await expect(loaded).rejects.toMatchObject({
        message:
          reason === 'absent'
            ? `PL-E13: platform/${P}/challenge/x/index.md: no platform/challenge/x/challenge.yaml for this brief`
            : `PL-E14: platform/challenge/x/challenge.yaml: not one YAML mapping (${reason})`,
      })
    },
  )

  it('L6: an unlisted challenge with an unreadable declaration does not fail the loader', async () => {
    const tree = makeTree({
      [`platform/${P}/challenge/x/index.md`]: brief('X'),
      'platform/challenge/x/challenge.yaml': 'category: web\n',
      [`platform/${T}/challenge/orphan/index.md`]: brief('Orphan'),
      'platform/challenge/orphan/challenge.yaml': 'number: [1\n',
      'platform/challenge/ghost/challenge.yaml': '- not a mapping\n',
    })
    const lists = await loadChallengeLists(tree.srcDir, tree.files, { locales: LOCALES, primary: P })
    expect(lists[P].map((e) => e.url)).toEqual(['/challenge/x/'])
  })

  it.each([
    ['no platform/en folder', { 'platform/zh-TW/challenge/x/index.md': brief('X'), 'platform/challenge/x/challenge.yaml': 'category: web\n' }],
    ['a platform/en folder with no challenge folder', { 'platform/en/guide/index.md': '# Guide\n', 'platform/zh-TW/challenge/x/index.md': brief('X'), 'platform/challenge/x/challenge.yaml': 'category: web\n' }],
  ])('L8: the keys are the locales given, not the folders found (%s)', async (_name, files) => {
    const tree = makeTree(files)
    const lists = await loadChallengeLists(tree.srcDir, tree.files, { locales: LOCALES, primary: P })
    expect(Object.keys(lists)).toEqual([...LOCALES])
    if (P === 'zh-TW') {
      expect(lists.en.map((e) => [e.locale, e.url])).toEqual([['zh-TW', '/challenge/x/']])
    } else {
      // P = en with no English brief: nothing is listed, in any list.
      for (const locale of LOCALES) expect(lists[locale]).toEqual([])
    }
  })

  it('Y113: a declaration with __proto__ and constructor keys does not pollute the entry', async () => {
    const tree = makeTree({
      [`platform/${P}/challenge/x/index.md`]: brief('X'),
      [`platform/${T}/challenge/x/index.md`]: brief('X'),
      'platform/challenge/x/challenge.yaml': 'category: web\n__proto__:\n  polluted: 1\nconstructor: x\n',
    })
    const lists = await loadChallengeLists(tree.srcDir, tree.files, { locales: LOCALES, primary: P })
    for (const locale of LOCALES) {
      const entry = lists[locale][0]
      expect(Object.getPrototypeOf(entry)).toBe(Object.prototype)
      expect(Object.keys(entry)).not.toContain('__proto__')
      expect(Object.keys(entry)).not.toContain('constructor')
      expect(entry.category).toBe('web')
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

// B79 (D40), the real tree, read only: every list page and every home page, in every locale folder,
// imports the one loader through the same line, so a translation skeleton can copy a page unchanged.
describe('the list and home pages use the one loader (B79)', () => {
  const PLATFORM = resolve(__dirname, '../../../platform')
  const PRIMARY = readPrimaryLocale(resolve(PLATFORM, '..', 'range.json'))
  // A range may keep only the primary locale's pages: the locales whose pages exist are checked.
  const PAGES = LOCALES.flatMap((code) => [`${code}/index.md`, `${code}/challenges.md`]).filter((page) =>
    existsSync(join(PLATFORM, page)),
  )

  it("the primary locale's home and list pages exist", () => {
    expect(PAGES).toContain(`${PRIMARY}/index.md`)
    expect(PAGES).toContain(`${PRIMARY}/challenges.md`)
  })

  it.each(PAGES)('platform/%s imports ../shared/challenges.data.ts', (page) => {
    const text = readFileSync(join(PLATFORM, page), 'utf8')
    expect(text).toContain("from '../shared/challenges.data.ts'")
  })

  it('no file under platform/ names the deleted second loader', () => {
    const named: string[] = []
    const walk = (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, item.name)
        if (item.isDirectory()) walk(path)
        else if (/\.(md|ts|mts|js|vue|json|ya?ml|html)$/.test(item.name) && readFileSync(path, 'utf8').includes('challenges.zh-TW.data')) named.push(path)
      }
    }
    walk(PLATFORM)
    expect(named).toEqual([])
  })
})
