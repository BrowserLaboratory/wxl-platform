import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { localizeHomeLinks } from '../../../.vitepress/home-links'
import { SiteLayoutError } from '../../../.vitepress/layout-error'
import { pageListFromDir } from '../../../.vitepress/pageList'
import { upstreamOnlySkipReason, readManifest, isGitWorkTree, hasRootRangeJson } from '../../__helpers__/upstreamDecision'

const PAGES = ['/', '/challenges/', '/guide/', '/en/', '/en/challenges/', '/en/guide/', '/zh-TW/', '/zh-TW/challenges/', '/zh-TW/guide/']

const REPO_ROOT = resolve(__dirname, '../../..')
const SRC_DIR = resolve(REPO_ROOT, 'platform')

/** `path`'s own YAML frontmatter, parsed. Mirrors `create-challenge.test.ts`'s own helper. */
function extractFrontmatter(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf8')
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) throw new Error(`no frontmatter found in ${path}`)
  return parseYaml(m[1]) as Record<string, unknown>
}

function errorOf(fn: () => void): SiteLayoutError {
  try {
    fn()
  } catch (err) {
    return err as SiteLayoutError
  }
  throw new Error('expected localizeHomeLinks to throw')
}

describe('localizeHomeLinks', () => {
  // B62: an unprefixed link on a primary page is unchanged.
  it('B62: keeps /challenges/ on an en page under primary en', () => {
    const fm = { layout: 'home', hero: { actions: [{ link: '/challenges/' }] } }
    expect(localizeHomeLinks(fm, 'en', 'en', PAGES).hero).toEqual({ actions: [{ link: '/challenges/' }] })
  })

  // B63: an unprefixed link on a translation page is prefixed.
  it('B63: /challenges/ becomes /en/challenges/ on an en page under primary zh-TW', () => {
    const fm = { layout: 'home', hero: { actions: [{ link: '/challenges/' }] } }
    expect(localizeHomeLinks(fm, 'en', 'zh-TW', PAGES).hero).toEqual({ actions: [{ link: '/en/challenges/' }] })
  })

  it('B63: /guide/ becomes /zh-TW/guide/ on a zh-TW page under primary en', () => {
    const fm = { layout: 'home', hero: { actions: [{ link: '/guide/' }] } }
    expect(localizeHomeLinks(fm, 'zh-TW', 'en', PAGES).hero).toEqual({ actions: [{ link: '/zh-TW/guide/' }] })
  })

  it('B63: / becomes /en/ on an en page under primary zh-TW', () => {
    const fm = { layout: 'home', hero: { actions: [{ link: '/' }] } }
    expect(localizeHomeLinks(fm, 'en', 'zh-TW', PAGES).hero).toEqual({ actions: [{ link: '/en/' }] })
  })

  // B64: external links and anchors are returned as written, unchecked.
  it.each(['https://example.com/', 'mailto:a@b', '#x'])('B64: %s is returned unchanged and unchecked', (link) => {
    const fm = { layout: 'home', hero: { actions: [{ link }] } }
    expect(localizeHomeLinks(fm, 'en', 'en', [] /* absent from pages */).hero).toEqual({ actions: [{ link }] })
  })

  // B65: a relative link is PL-E12.
  it.each(['challenges', './guide/', '../x'])('B65: %s throws PL-E12, "is a relative link…"', (link) => {
    const fm = { layout: 'home', hero: { actions: [{ link }] } }
    const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
    expect(error.code).toBe('PL-E12')
    expect(error.message).toBe(
      `PL-E12: "en/index.md" has hero.actions[0].link ${JSON.stringify(link)}, which is a relative link; write it from the locale’s home page, such as "/guide/".`,
    )
  })

  // B66: an already-prefixed link is PL-E12; a code-like segment is not.
  describe('B66: an already-prefixed link is PL-E12, a code-like segment is not', () => {
    it.each(['en', 'zh-TW'] as const)('primary %s: /zh-TW/guide/, /en/, /en throw "already carries a locale prefix…"', (primary) => {
      for (const pageLocale of ['en', 'zh-TW'] as const) {
        for (const link of ['/zh-TW/guide/', '/en/', '/en']) {
          const fm = { layout: 'home', hero: { actions: [{ link }] } }
          const error = errorOf(() => localizeHomeLinks(fm, pageLocale, primary, PAGES))
          expect(error.code).toBe('PL-E12')
          expect(error.message).toContain('already carries a locale prefix')
        }
      }
    })

    it('passes when pages holds a code-like page in the page locale', () => {
      const pages = ['/', '/english/', '/enroll/', '/zh-TWx/']
      for (const link of ['/english/', '/enroll/', '/zh-TWx/']) {
        const fm = { layout: 'home', hero: { actions: [{ link }] } }
        expect(() => localizeHomeLinks(fm, 'en', 'en', pages)).not.toThrow()
      }
    })

    it('throws "does not name a published page" when pages lacks the code-like page', () => {
      const error = errorOf(() =>
        localizeHomeLinks({ layout: 'home', hero: { actions: [{ link: '/english/' }] } }, 'en', 'en', ['/']),
      )
      expect(error.code).toBe('PL-E12')
      expect(error.message).toContain('does not name a published page')
    })
  })

  // B67: a link that names no page is PL-E12; query/hash and trailing slash are tolerated when found.
  describe('B67: a link that names no page is PL-E12', () => {
    it.each(['/nope/', '/c/001', '/challenges/x'])('%s throws "does not name a published page"', (link) => {
      const fm = { layout: 'home', hero: { actions: [{ link }] } }
      const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
      expect(error.code).toBe('PL-E12')
      expect(error.message).toContain('does not name a published page')
    })

    it('a translation home whose pages lacks /<T>/guide/ throws', () => {
      const pages = ['/', '/en/']
      const error = errorOf(() => localizeHomeLinks({ layout: 'home', hero: { actions: [{ link: '/guide/' }] } }, 'en', 'zh-TW', pages))
      expect(error.code).toBe('PL-E12')
    })

    it.each(['/challenges/', '/challenges?x#y'])('%s passes', (link) => {
      const fm = { layout: 'home', hero: { actions: [{ link }] } }
      expect(() => localizeHomeLinks(fm, 'en', 'en', PAGES)).not.toThrow()
    })
  })

  // B68: a link that is not a string is PL-E12.
  it.each([null, 1, {}])('B68: %j throws PL-E12 "is not a string"', (link) => {
    const fm = { layout: 'home', hero: { actions: [{ link }] } }
    const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
    expect(error.code).toBe('PL-E12')
    expect(error.message).toContain('is not a string')
  })

  // B69: a non-home page is ignored, including invalid links.
  it('B69: layout !== "home" returns frontmatter unchanged, with no error', () => {
    const fm = { layout: 'doc', hero: { actions: [{ link: 'not-even-a-valid-link' }] } }
    expect(localizeHomeLinks(fm, 'en', 'en', PAGES)).toEqual(fm)
  })

  it('B69: no layout key at all is returned unchanged', () => {
    const fm = { hero: { actions: [{ link: 'bad' }] } }
    expect(localizeHomeLinks(fm, 'en', 'en', PAGES)).toEqual(fm)
  })

  // B70: upstream's home pages, both primaries, against the "Home-page links" table
  // (traceability.md). Upstream-only (D124): a range or a fork may have edited these two files.
  describe.skipIf(
  upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(REPO_ROOT), isGitWorkTree(REPO_ROOT), hasRootRangeJson(REPO_ROOT)),
)('B70: upstream\'s home pages', () => {
    it.each(['en', 'zh-TW'] as const)('primary %s matches the "Home-page links" table', (primary) => {
      const pages = pageListFromDir(SRC_DIR, primary)
      const enFm = extractFrontmatter(resolve(SRC_DIR, 'en', 'index.md'))
      const zhFm = extractFrontmatter(resolve(SRC_DIR, 'zh-TW', 'index.md'))
      const enLinks = ((localizeHomeLinks(enFm, 'en', primary, pages).hero as { actions: { link: string }[] }).actions).map((a) => a.link)
      const zhLinks = ((localizeHomeLinks(zhFm, 'zh-TW', primary, pages).hero as { actions: { link: string }[] }).actions).map((a) => a.link)
      if (primary === 'en') {
        expect(enLinks).toEqual(['/challenges/', '/guide/'])
        expect(zhLinks).toEqual(['/zh-TW/challenges/', '/zh-TW/guide/'])
      } else {
        expect(enLinks).toEqual(['/en/challenges/', '/en/guide/'])
        expect(zhLinks).toEqual(['/challenges/', '/guide/'])
      }
    })
  })

  // B92: features[*].link follows the same rule as hero; an entry without link is untouched; two
  // other fields are never read.
  describe('B92: features[*].link and fields outside the two', () => {
    it('prefixes /guide/ on a translation home', () => {
      const fm = { layout: 'home', features: [{ link: '/guide/' }] }
      expect(localizeHomeLinks(fm, 'en', 'zh-TW', PAGES).features).toEqual([{ link: '/en/guide/' }])
    })

    it('throws PL-E12 relative for a relative features link, naming features[<i>].link', () => {
      const fm = { layout: 'home', features: [{ title: 'no link' }, { link: 'guide' }] }
      const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
      expect(error.code).toBe('PL-E12')
      expect(error.message).toContain('features[1].link')
      expect(error.message).toContain('is a relative link')
    })

    it('throws PL-E12 prefix for /zh-TW/x on an en page', () => {
      const fm = { layout: 'home', features: [{ link: '/zh-TW/x' }] }
      const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
      expect(error.code).toBe('PL-E12')
      expect(error.message).toContain('features[0].link')
      expect(error.message).toContain('already carries a locale prefix')
    })

    it('throws PL-E12 not a string for null, naming features[<i>].link', () => {
      const fm = { layout: 'home', features: [{ link: null }] }
      const error = errorOf(() => localizeHomeLinks(fm, 'en', 'en', PAGES))
      expect(error.code).toBe('PL-E12')
      expect(error.message).toContain('features[0].link')
      expect(error.message).toContain('is not a string')
    })

    it('an entry without link is not an error', () => {
      const fm = { layout: 'home', features: [{ title: 'no link here' }] }
      expect(() => localizeHomeLinks(fm, 'en', 'en', PAGES)).not.toThrow()
      expect(localizeHomeLinks(fm, 'en', 'en', PAGES).features).toEqual([{ title: 'no link here' }])
    })

    it('hero.image.src and features[0].icon.src are returned byte-identical, never read', () => {
      const fm = {
        layout: 'home',
        hero: { actions: [{ link: '/challenges/' }], image: { src: 'not-even-a-path' } },
        features: [{ link: '/guide/', icon: { src: 'also-not-a-path' } }],
      }
      const result = localizeHomeLinks(fm, 'en', 'en', PAGES)
      expect((result.hero as { image: { src: string } }).image.src).toBe('not-even-a-path')
      expect((result.features as { icon: { src: string } }[])[0].icon.src).toBe('also-not-a-path')
    })
  })

  // B94: a protocol-relative link is PL-E12; the check order follows D141.
  describe('B94: a protocol-relative link is PL-E12', () => {
    it.each(['//evil.example/', '//evil.example'])(
      '%s throws PL-E12 "is a protocol-relative link…" in hero.actions and features',
      (link) => {
        for (const primary of ['en', 'zh-TW'] as const) {
          for (const pageLocale of ['en', 'zh-TW'] as const) {
            const heroError = errorOf(() =>
              localizeHomeLinks({ layout: 'home', hero: { actions: [{ link }] } }, pageLocale, primary, PAGES),
            )
            expect(heroError.code).toBe('PL-E12')
            expect(heroError.message).toContain('is a protocol-relative link')

            const featuresError = errorOf(() =>
              localizeHomeLinks({ layout: 'home', features: [{ link }] }, pageLocale, primary, PAGES),
            )
            expect(featuresError.code).toBe('PL-E12')
            expect(featuresError.message).toContain('is a protocol-relative link')
          }
        }
      },
    )

    it.each(['https://example.org/', 'mailto:a@example.org', '#top'])('%s still passes unchecked', (link) => {
      const fm = { layout: 'home', hero: { actions: [{ link }] } }
      expect(() => localizeHomeLinks(fm, 'en', 'en', [])).not.toThrow()
    })
  })
})
