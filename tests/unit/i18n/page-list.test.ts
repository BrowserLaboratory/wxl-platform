import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { entryForRelativePath, isPublishedPath } from '../../../.vitepress/theme/i18n/pages'
import { lookupNotFound } from '../../../.vitepress/theme/i18n/lookup'
import { pageListFromDir, rewrittenPath } from '../../../.vitepress/pageList'

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A source tree on disk holding exactly the given files. */
function fixtureTree(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'wxl-pages-'))
  tempDirs.push(root)
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), '# page\n')
  }
  return root
}

// The page list is what every locale decision of epic 0008 consults to ask "is this a
// published page". Its spelling is the one `cleanUrls` gives: a directory's `index.md`
// keeps its trailing slash, any other page file has none. The expectations below are
// written out by hand, never derived by calling the code under test.

describe('entryForRelativePath', () => {
  it.each([
    ['index.md', '/'],
    ['guide/index.md', '/guide/'],
    ['challenge/door-is-open/index.md', '/challenge/door-is-open/'],
    ['challenges.md', '/challenges'],
    ['guide/python.md', '/guide/python'],
    ['reference/attack-log-export-format.md', '/reference/attack-log-export-format'],
    ['zh-TW/index.md', '/zh-TW/'],
    ['zh-TW/challenges.md', '/zh-TW/challenges'],
    ['zh-TW/challenge/door-is-open/index.md', '/zh-TW/challenge/door-is-open/'],
  ])('maps %s to %s', (source, entry) => {
    expect(entryForRelativePath(source)).toBe(entry)
  })
})

describe('pageListFromDir', () => {
  it('lists every page file of the tree once, and nothing that is not a page', () => {
    const root = fixtureTree([
      'index.md',
      'challenges.md',
      'guide/index.md',
      'challenge/door-is-open/index.md',
      'challenge/door-is-open/src/app.py',
      'zh-TW/index.md',
      'zh-TW/challenge/door-is-open/index.md',
      'public/notes.md',
      'shared/readme.md',
      'challenge/door-is-open/src/node_modules/pkg/README.md',
      'guide/dist/old.md',
      'challenge/door-is-open/.draft.md',
      '.hidden/notes.md',
      'postcss.config.mjs',
    ])
    expect(pageListFromDir(root)).toEqual([
      '/',
      '/challenge/door-is-open/',
      '/challenges',
      '/guide/',
      '/zh-TW/',
      '/zh-TW/challenge/door-is-open/',
    ])
  })

  it('follows a page added to or removed from the tree', () => {
    const root = fixtureTree(['index.md'])
    writeFileSync(join(root, 'about.md'), '# about\n')
    expect(pageListFromDir(root)).toEqual(['/', '/about'])
    rmSync(join(root, 'about.md'))
    expect(pageListFromDir(root)).toEqual(['/'])
  })
})

describe('the page list the site configuration ships', () => {
  // The oracle is built here, by its own walk and its own rule, independent of both the
  // code under test and VitePress's page list.
  function oracle(): string[] {
    const srcDir = join(__dirname, '../../../platform')
    const found: string[] = []
    const walk = (dir: string, rel: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${item.name}` : item.name
        if (item.name.startsWith('.')) continue
        if (item.isDirectory()) {
          if (rel === '' && (item.name === 'public' || item.name === 'shared')) continue
          walk(join(dir, item.name), childRel)
        } else if (item.name.endsWith('.md')) {
          if (childRel === 'index.md') found.push('/')
          else if (childRel.endsWith('/index.md')) found.push(`/${childRel.slice(0, -'index.md'.length)}`)
          else found.push(`/${childRel.slice(0, -'.md'.length)}`)
        }
      }
    }
    walk(srcDir, '')
    return found
  }

  it('equals every page of the real source tree, each once', async () => {
    vi.resetModules()
    const config = (await import('../../../.vitepress/config.mts')).default as {
      vite?: { define?: Record<string, string> }
    }
    const shipped = JSON.parse(config.vite!.define!.__WXL_PAGES__) as string[]
    expect(new Set(shipped).size).toBe(shipped.length)
    expect(new Set(shipped)).toEqual(new Set(oracle()))
    expect(shipped).not.toContain('/404')
  })
})

describe('the not-found lookup', () => {
  // A list holding an English-only challenge and the English-only reference page, a
  // translated guide page, and one page that exists only in Traditional Chinese.
  const PAGES = [
    '/',
    '/challenge/v05-php-check/',
    '/guide/python',
    '/reference/attack-log-export-format',
    '/zh-TW/',
    '/zh-TW/guide/python',
    '/zh-TW/notice',
  ]

  it.each([
    ['/zh-TW/challenge/v05-php-check/', '/challenge/v05-php-check/'],
    ['/zh-TW/challenge/v05-php-check', '/challenge/v05-php-check/'],
    ['/zh-TW/challenge/v05-php-check/index.html', '/challenge/v05-php-check/'],
    ['/zh-TW/challenge/v05-php-check/index', '/challenge/v05-php-check/'],
    ['/zh-TW/reference/attack-log-export-format', '/reference/attack-log-export-format'],
    ['/zh-TW/reference/attack-log-export-format.html', '/reference/attack-log-export-format'],
    ['/zh-TW/reference/attack-log-export-format/', '/reference/attack-log-export-format'],
    ['/notice', '/zh-TW/notice'],
    ['/zh-TW/%E5%8F%83%E8%80%83', null],
  ])('finds the counterpart of %s: %s', (path, target) => {
    expect(lookupNotFound(path, '/', PAGES)).toBe(target)
  })

  it.each([
    '/zh-TW/%E0%A4%A',
    '/zh-TW//evil.example/x',
    '//evil.example/challenges',
    '/zh-TW/%2F%2Fevil.example',
    '/zh-TW/\\evil.example',
    '/zh-TW/challenge/../guide/python',
    '/en/challenges',
    '/zh-TW/Reference/attack-log-export-format',
    '/zh-TW/no-such-page',
  ])('finds nothing for %s, and does not throw', (path) => {
    expect(lookupNotFound(path, '/', PAGES)).toBeNull()
  })

  it('strips the site base first, and returns the entry without it', () => {
    expect(lookupNotFound('/repo/zh-TW/challenge/v05-php-check/', '/repo/', PAGES)).toBe('/challenge/v05-php-check/')
    expect(lookupNotFound('/zh-TW/challenge/v05-php-check/', '/repo/', PAGES)).toBeNull()
  })

  it('tells whether a path itself is a published page, by the same normalisation', () => {
    expect(isPublishedPath('/guide/python.html', '/', PAGES)).toBe(true)
    expect(isPublishedPath('/repo/zh-TW', '/repo/', PAGES)).toBe(true)
    expect(isPublishedPath('/zh-TW/reference/attack-log-export-format', '/', PAGES)).toBe(false)
    expect(isPublishedPath('/zh-TW/%E0%A4%A', '/', PAGES)).toBe(false)
  })
})

describe('the not-found lookup: a doubled prefix', () => {
  it('a path whose "counterpart" is still in its own locale has none', () => {
    const pages = ['/zh-TW/notice', '/notice']
    expect(lookupNotFound('/zh-TW/zh-TW/notice', '/', pages)).toBeNull()
  })
})

// B39 (traceability.md "Source path → URL", revision 2.3): every source upstream holds after the
// switch, and the file form `rewrittenPath` gives it under each primary. Typed from the table,
// not computed: the `en` column strips exactly `en/`, the `zh-TW` column strips exactly `zh-TW/`.
const SOURCE_TO_FILE_FORM: [string, string, string][] = [
  ['en/index.md', 'index.md', 'en/index.md'],
  ['en/challenges.md', 'challenges.md', 'en/challenges.md'],
  ['en/guide/index.md', 'guide/index.md', 'en/guide/index.md'],
  ['en/guide/python.md', 'guide/python.md', 'en/guide/python.md'],
  ['en/guide/network.md', 'guide/network.md', 'en/guide/network.md'],
  ['en/guide/browser.md', 'guide/browser.md', 'en/guide/browser.md'],
  ['en/guide/notes.md', 'guide/notes.md', 'en/guide/notes.md'],
  ['en/guide/troubleshooting.md', 'guide/troubleshooting.md', 'en/guide/troubleshooting.md'],
  ['en/guide/workshop.md', 'guide/workshop.md', 'en/guide/workshop.md'],
  [
    'en/reference/attack-log-export-format.md',
    'reference/attack-log-export-format.md',
    'en/reference/attack-log-export-format.md',
  ],
  ['en/challenge/door-is-open/index.md', 'challenge/door-is-open/index.md', 'en/challenge/door-is-open/index.md'],
  ['en/challenge/just-a-preview/index.md', 'challenge/just-a-preview/index.md', 'en/challenge/just-a-preview/index.md'],
  [
    'en/challenge/selected-excerpts/index.md',
    'challenge/selected-excerpts/index.md',
    'en/challenge/selected-excerpts/index.md',
  ],
  ['en/challenge/staff-only/index.md', 'challenge/staff-only/index.md', 'en/challenge/staff-only/index.md'],
  ['zh-TW/index.md', 'zh-TW/index.md', 'index.md'],
  ['zh-TW/challenges.md', 'zh-TW/challenges.md', 'challenges.md'],
  ['zh-TW/guide/index.md', 'zh-TW/guide/index.md', 'guide/index.md'],
  ['zh-TW/guide/python.md', 'zh-TW/guide/python.md', 'guide/python.md'],
  ['zh-TW/guide/network.md', 'zh-TW/guide/network.md', 'guide/network.md'],
  ['zh-TW/guide/browser.md', 'zh-TW/guide/browser.md', 'guide/browser.md'],
  ['zh-TW/guide/notes.md', 'zh-TW/guide/notes.md', 'guide/notes.md'],
  ['zh-TW/guide/troubleshooting.md', 'zh-TW/guide/troubleshooting.md', 'guide/troubleshooting.md'],
  ['zh-TW/guide/workshop.md', 'zh-TW/guide/workshop.md', 'guide/workshop.md'],
  [
    'zh-TW/reference/attack-log-export-format.md',
    'zh-TW/reference/attack-log-export-format.md',
    'reference/attack-log-export-format.md',
  ],
  ['zh-TW/challenge/door-is-open/index.md', 'zh-TW/challenge/door-is-open/index.md', 'challenge/door-is-open/index.md'],
  [
    'zh-TW/challenge/just-a-preview/index.md',
    'zh-TW/challenge/just-a-preview/index.md',
    'challenge/just-a-preview/index.md',
  ],
  [
    'zh-TW/challenge/selected-excerpts/index.md',
    'zh-TW/challenge/selected-excerpts/index.md',
    'challenge/selected-excerpts/index.md',
  ],
  ['zh-TW/challenge/staff-only/index.md', 'zh-TW/challenge/staff-only/index.md', 'challenge/staff-only/index.md'],
]

describe('rewrittenPath (B39): strips exactly the primary segment', () => {
  it.each(SOURCE_TO_FILE_FORM)('%s, primary en -> %s', (source, enForm) => {
    expect(rewrittenPath(source, 'en')).toBe(enForm)
  })

  it.each(SOURCE_TO_FILE_FORM)('%s, primary zh-TW -> %s', (source, _enForm, zhForm) => {
    expect(rewrittenPath(source, 'zh-TW')).toBe(zhForm)
  })

  it('strips a whole segment only: english/x.md is unchanged under primary en', () => {
    expect(rewrittenPath('english/x.md', 'en')).toBe('english/x.md')
  })

  it('leaves a non-primary-folder source unchanged', () => {
    expect(rewrittenPath('zh-TW/x.md', 'en')).toBe('zh-TW/x.md')
  })

  it('strips the primary folder of a primary-folder source', () => {
    expect(rewrittenPath('en/x.md', 'en')).toBe('x.md')
  })
})

// B24 (page-list half): a `.md` under `challenge/<slug>/src/**` is not a page.
describe('pageListFromDir omits challenge/<slug>/src/** (B24)', () => {
  it('omits src/README.md and src/a/b/c.md', () => {
    const root = fixtureTree([
      'index.md',
      'challenge/door-is-open/index.md',
      'challenge/door-is-open/src/README.md',
      'challenge/door-is-open/src/a/b/c.md',
    ])
    expect(pageListFromDir(root)).toEqual(['/', '/challenge/door-is-open/'])
  })
})

// B41 (proof: traceability.md revision 2.3, "only primary-folder sources are rewritten"): no
// fixture tree that passes 0010-S2 (checkSourceLayout) produces a duplicate page-list entry.
describe('pageListFromDir: no duplicate entries on a passing tree (B41)', () => {
  const VALID_FILES = ['en/index.md', 'zh-TW/index.md', 'challenge/x/challenge.yaml', 'challenge/x/src/app.py']

  it.each(['en', 'zh-TW'] as const)('the valid tree has no duplicates (primary %s)', (primary) => {
    const root = fixtureTree(VALID_FILES)
    const list = pageListFromDir(root, primary)
    expect(new Set(list).size).toBe(list.length)
  })

  it.each(['en', 'zh-TW'] as const)('a tree with deeper/unlisted-code entries has no duplicates (primary %s)', (primary) => {
    const root = fixtureTree([...VALID_FILES, 'zh-TW/ja/a.md', 'en/guide/zh-TW/a.md'])
    const list = pageListFromDir(root, primary)
    expect(new Set(list).size).toBe(list.length)
  })

  it.each(['en', 'zh-TW'] as const)('a tree with a translation-only page has no duplicates (primary %s)', (primary) => {
    const root = fixtureTree([...VALID_FILES, 'zh-TW/guide/only.md'])
    const list = pageListFromDir(root, primary)
    expect(new Set(list).size).toBe(list.length)
  })
})

// B42: the page list of a fixture tree holding every source of the "Source path → URL" table.
describe('pageListFromDir: the full-table fixture (B42)', () => {
  const ALL_SOURCES = SOURCE_TO_FILE_FORM.map(([source]) => source)

  it('pageListFromDir(root, "en") equals the en column, sorted', () => {
    const root = fixtureTree(ALL_SOURCES)
    const expected = [
      '/', '/challenges', '/guide/', '/guide/python', '/guide/network', '/guide/browser', '/guide/notes',
      '/guide/troubleshooting', '/guide/workshop', '/reference/attack-log-export-format',
      '/challenge/door-is-open/', '/challenge/just-a-preview/', '/challenge/selected-excerpts/',
      '/challenge/staff-only/',
      '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/', '/zh-TW/guide/python', '/zh-TW/guide/network',
      '/zh-TW/guide/browser', '/zh-TW/guide/notes', '/zh-TW/guide/troubleshooting', '/zh-TW/guide/workshop',
      '/zh-TW/reference/attack-log-export-format',
      '/zh-TW/challenge/door-is-open/', '/zh-TW/challenge/just-a-preview/', '/zh-TW/challenge/selected-excerpts/',
      '/zh-TW/challenge/staff-only/',
    ].sort()
    expect(pageListFromDir(root, 'en')).toEqual(expected)
  })

  it('pageListFromDir(root, "zh-TW") equals the zh-TW column, sorted', () => {
    const root = fixtureTree(ALL_SOURCES)
    const expected = [
      '/en/', '/en/challenges', '/en/guide/', '/en/guide/python', '/en/guide/network', '/en/guide/browser',
      '/en/guide/notes', '/en/guide/troubleshooting', '/en/guide/workshop', '/en/reference/attack-log-export-format',
      '/en/challenge/door-is-open/', '/en/challenge/just-a-preview/', '/en/challenge/selected-excerpts/',
      '/en/challenge/staff-only/',
      '/', '/challenges', '/guide/', '/guide/python', '/guide/network', '/guide/browser', '/guide/notes',
      '/guide/troubleshooting', '/guide/workshop', '/reference/attack-log-export-format',
      '/challenge/door-is-open/', '/challenge/just-a-preview/', '/challenge/selected-excerpts/',
      '/challenge/staff-only/',
    ].sort()
    expect(pageListFromDir(root, 'zh-TW')).toEqual(expected)
  })
})
