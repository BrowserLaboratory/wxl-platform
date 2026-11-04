import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { entryForSourcePath, isPublishedPath } from '../../../.vitepress/theme/i18n/pages'
import { lookupNotFound } from '../../../.vitepress/theme/i18n/lookup'
import { pageListFromDir } from '../../../.vitepress/pageList'

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

describe('entryForSourcePath', () => {
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
    expect(entryForSourcePath(source)).toBe(entry)
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
