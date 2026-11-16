import { describe, it, expect } from 'vitest'
import { classifyArrival, notFoundRedirect, lineLocale, createCarry, isArrival, switcherDecision } from '../../../.vitepress/theme/i18n/arrival'
import { localizePath } from '../../../.vitepress/theme/i18n'
import { DT_NOT_FOUND, SW, X_INSTANCES, BASES } from '../../__helpers__/localeTables'

// Spec 0008, seam S1: an arrival is classified before anything else decides, from what the
// router rendered (D11). The page list here is a fixture; expectations are written out.
const PAGES = [
  '/',
  '/challenge/v05-php-check/',
  '/guide/python',
  '/reference/attack-log-export-format',
  '/zh-TW/',
  '/zh-TW/guide/python',
  '/zh-TW/notice',
]

describe('classifyArrival', () => {
  it('a rendered page is a page arrival, identified by its source file', () => {
    expect(classifyArrival({ isNotFound: false, relativePath: 'zh-TW/guide/python.md', pathname: '/zh-TW/Guide/python', base: '/' }, PAGES))
      .toEqual({ kind: 'page', entry: '/zh-TW/guide/python' })
  })

  // B45: `relativePath` is already rewritten by `rewrittenPath` (the primary locale's prefix
  // stripped) before it reaches here, so `entryForRelativePath` stays locale-agnostic — a
  // fixture list for `P = en` (unprefixed source) and one for `P = zh-TW` (T-prefixed source).
  it('maps relativePath to its entry under P = en (B45)', () => {
    expect(classifyArrival({ isNotFound: false, relativePath: 'guide/python.md', pathname: '/guide/python', base: '/' }, ['/guide/python']))
      .toEqual({ kind: 'page', entry: '/guide/python' })
  })

  it('maps relativePath to its entry under P = zh-TW (B45)', () => {
    expect(classifyArrival({ isNotFound: false, relativePath: 'en/guide/python.md', pathname: '/en/guide/python', base: '/' }, ['/en/guide/python']))
      .toEqual({ kind: 'page', entry: '/en/guide/python' })
  })

  it('the not-found page for a path not in the list is a not-found arrival', () => {
    expect(classifyArrival({ isNotFound: true, relativePath: '404.md', pathname: '/zh-TW/challenge/v05-php-check/', base: '/' }, PAGES))
      .toEqual({ kind: 'not-found' })
  })

  it('the not-found page for a path in the list is a failed load', () => {
    expect(classifyArrival({ isNotFound: true, relativePath: '404.md', pathname: '/repo/guide/python', base: '/repo/' }, PAGES))
      .toEqual({ kind: 'failed-load' })
  })
})

describe('notFoundRedirect', () => {
  const loc = (pathname: string, search = '', hash = '') => ({ pathname, search, hash })

  it('sends a missing Traditional Chinese page to the English page, asking for zh-TW', () => {
    expect(notFoundRedirect(loc('/zh-TW/reference/attack-log-export-format'), '/', PAGES, 'en'))
      .toEqual({ target: '/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', requested: 'zh-TW' })
  })

  it('sends a missing English page to the Traditional Chinese page, asking for en', () => {
    expect(notFoundRedirect(loc('/notice'), '/', PAGES, 'en')).toEqual({ target: '/zh-TW/notice', entry: '/zh-TW/notice', requested: 'en' })
  })

  it('keeps the base, the query and the hash, and spells the target as the list does', () => {
    expect(notFoundRedirect(loc('/repo/zh-TW/challenge/v05-php-check', '?q=1', '#h'), '/repo/', PAGES, 'en'))
      .toEqual({ target: '/repo/challenge/v05-php-check/?q=1#h', entry: '/challenge/v05-php-check/', requested: 'zh-TW' })
  })

  it.each(['/zh-TW/no-such-page', '//evil.example/challenges', '/zh-TW/%2F%2Fevil.example', '/zh-TW/%E0%A4%A'])(
    'gives nothing for %s',
    (path) => {
      expect(notFoundRedirect(loc(path), '/', PAGES, 'en')).toBeNull()
    },
  )

  // D28: a not-found path whose first segment is P's own code (R22's old `/<P>/…` URLs, never a
  // real prefix) is looked up with that segment stripped, and the result counts only when the
  // remainder is itself a primary-locale entry — not a second P-code segment, and not T's.
  it('strips a leading primary-code segment and finds the primary entry (DT25, D28)', () => {
    expect(notFoundRedirect(loc('/en/guide/python'), '/', PAGES, 'en'))
      .toEqual({ target: '/guide/python', entry: '/guide/python', requested: 'en' })
  })

  it('gives nothing when the primary-code strip leaves a doubled or translation-coded segment (D28)', () => {
    expect(notFoundRedirect(loc('/zh-TW/en/x'), '/', [...PAGES, '/en/x'], 'zh-TW')).toBeNull()
    expect(notFoundRedirect(loc('/zh-TW/zh-TW/x'), '/', [...PAGES, '/zh-TW/x'], 'zh-TW')).toBeNull()
  })

  // D28's fall-through to D27/A39: after the strip, /X is unlisted but /<T>/X is — one
  // not-found redirect still, landing on the translation entry.
  it('falls through to the translation entry when the stripped primary path is unlisted but its translation is listed (A39, D28)', () => {
    expect(notFoundRedirect(loc('/en/en-only-article'), '/', [...PAGES, '/zh-TW/en-only-article'], 'en'))
      .toEqual({ target: '/zh-TW/en-only-article', entry: '/zh-TW/en-only-article', requested: 'en' })
  })

  // A17: not-found with no counterpart, and double/malformed prefixes, under both P — none of
  // these ever finds a counterpart or throws.
  for (const P of ['en', 'zh-TW'] as const) {
    const T = P === 'en' ? 'zh-TW' : 'en'
    it.each([
      `/${P}/${P}/x`,
      `/${P}/${T}/x`,
      `/${T}/${T}/x`,
      `/${T}/${P}/x`,
      `/${P}foo`,
    ])(`P=${P}: gives nothing for %s (A17)`, (path) => {
      expect(() => notFoundRedirect(loc(path), '/', PAGES, P)).not.toThrow()
      expect(notFoundRedirect(loc(path), '/', PAGES, P)).toBeNull()
    })
  }
})

describe('lineLocale', () => {
  it('names the requested locale when the page has no version in it', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/reference/attack-log-export-format', pages: PAGES, released: true, P: 'en' })).toBe('zh-TW')
    expect(lineLocale({ requested: 'en', entry: '/zh-TW/notice', pages: PAGES, released: true, P: 'en' })).toBe('en')
  })

  it('names nothing when the page has a version in the requested locale', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/guide/python', pages: PAGES, released: true, P: 'en' })).toBeNull()
    expect(lineLocale({ requested: 'en', entry: '/zh-TW/guide/python', pages: PAGES, released: true, P: 'en' })).toBeNull()
  })

  it('names nothing when the page is already in the requested locale', () => {
    expect(lineLocale({ requested: 'en', entry: '/reference/attack-log-export-format', pages: PAGES, released: true, P: 'en' })).toBeNull()
  })

  it('names nothing before the arrival is released, and nothing without a page', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/reference/attack-log-export-format', pages: PAGES, released: false, P: 'en' })).toBeNull()
    expect(lineLocale({ requested: 'zh-TW', entry: null, pages: PAGES, released: true, P: 'en' })).toBeNull()
  })
})

describe('the carried requested locale', () => {
  it('applies to its redirect target only, once', () => {
    const carry = createCarry()
    carry.set('/reference/attack-log-export-format', 'zh-TW')
    expect(carry.take('/reference/attack-log-export-format')).toBe('zh-TW')
    expect(carry.take('/reference/attack-log-export-format')).toBeNull()
  })

  it('is discarded by an arrival elsewhere, used or not', () => {
    const carry = createCarry()
    carry.set('/reference/attack-log-export-format', 'zh-TW')
    expect(carry.take('/guide/python')).toBeNull()
    expect(carry.take('/reference/attack-log-export-format')).toBeNull()
  })

  it('is discarded when the redirect lands on a not-found page', () => {
    const carry = createCarry()
    carry.set('/reference/attack-log-export-format', 'zh-TW')
    carry.discard()
    expect(carry.take('/reference/attack-log-export-format')).toBeNull()
  })
})

describe('isArrival', () => {
  it('a change of path is an arrival; a change of hash or query alone is not', () => {
    expect(isArrival('/guide/python', '/guide/notes')).toBe(true)
    expect(isArrival('/guide/python', '/guide/python#step-2')).toBe(false)
    expect(isArrival('/guide/python#a', '/guide/python?x=1')).toBe(false)
  })
})

describe('notFoundRedirect: one redirect per arrival', () => {
  it('gives nothing when its own landing would be a not-found path too (C9)', () => {
    // The landing of a not-found redirect is always a list entry, so classifying it again
    // gives a page or, if its chunk fails to load, a failed load — never a second not-found.
    const landing = notFoundRedirect({ pathname: '/zh-TW/reference/attack-log-export-format' }, '/', PAGES, 'en')!
    expect(classifyArrival({ isNotFound: true, relativePath: '404.md', pathname: landing.target, base: '/' }, PAGES))
      .toEqual({ kind: 'failed-load' })
  })
})

/**
 * The cold-load decision table (A-§4.1, DT17–40, DT57–80), both primaries: the NT, NP and NU
 * rows of `tests/__helpers__/localeTables.ts`, run under both bases and both `X` instances
 * (challenge and article). `notFoundRedirect`'s target, entry and requested locale, per row
 * (wave 2's "DT17-40/57-80 pure" row).
 */
describe('the cold-load decision table (DT17–40, DT57–80): not-found arrivals', () => {
  for (const row of DT_NOT_FOUND) {
    for (const x of X_INSTANCES) {
      for (const b of BASES) {
        it(`${row.id} (${x.label}, base ${b.label}): ${row.arrival}, counterpart ${row.counterpart}`, () => {
          const T = row.T
          let local: string
          let counterpartEntry: string
          if (row.arrival === 'NT') {
            local = localizePath(x.entry, T, row.P)
            counterpartEntry = x.entry
          } else if (row.arrival === 'NP') {
            // R22's old `/<P>/…` URL: P's own code, spelled explicitly, which is never a real
            // routing prefix (D28).
            local = `/${row.P}${x.entry}`
            counterpartEntry = x.entry
          } else {
            local = x.entry
            counterpartEntry = localizePath(x.entry, T, row.P)
          }
          const pages = row.counterpart === 'exists' ? [counterpartEntry] : []
          const result = notFoundRedirect({ pathname: b.prefix + local, search: '?q=1', hash: '#h' }, b.base, pages, row.P)
          if (row.redirect === 'none') {
            expect(result).toBeNull()
          } else {
            const wantEntry = row.redirect === 'to-T' ? localizePath(x.entry, T, row.P) : x.entry
            expect(result).toEqual({
              target: b.prefix + wantEntry + '?q=1#h',
              entry: wantEntry,
              requested: row.requested,
            })
          }
        })
      }
    }
  }
})

// Spec 0008, B1–B3, B5, B7, D16: where a switcher choice goes. A counterpart in the list is
// navigated to by its entry, with the query and hash kept; anything else stays on the page.
describe('switcherDecision', () => {
  const PAGES_WITH_LISTS = [...PAGES, '/challenges', '/zh-TW/challenges', '/zh-TW/zh-only']
  const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash })
  const page = (entry: string) => ({ kind: 'page' as const, entry })

  it('navigates to the chosen locale\'s counterpart, query and hash kept (B1)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/guide/python'), location: at('/guide/python', '?q=1', '#h'), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'navigate', target: '/zh-TW/guide/python?q=1#h' })
    expect(switcherDecision({ chosen: 'en', arrival: page('/zh-TW/guide/python'), location: at('/zh-TW/guide/python'), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'navigate', target: '/guide/python' })
  })

  it.each(['/challenges/', '/challenges.html'])('names the target by its list entry, not the URL text %s (D16)', (pathname) => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/challenges'), location: at(pathname), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'navigate', target: '/zh-TW/challenges' })
  })

  it('stays when the counterpart is not in the list, either direction (B2)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/reference/attack-log-export-format'), location: at('/reference/attack-log-export-format'), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'stay' })
    expect(switcherDecision({ chosen: 'en', arrival: page('/zh-TW/zh-only'), location: at('/zh-TW/zh-only'), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'stay' })
  })

  it.each([['/guide/python', 'en'], ['/zh-TW/guide/python', 'zh-TW']] as const)('stays when %s is chosen in its own locale %s (B5)', (entry, chosen) => {
    expect(switcherDecision({ chosen, arrival: page(entry), location: at(entry), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'stay' })
  })

  it('keeps a site base on the target and stays where there is nothing to go to (B3)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/guide/python'), location: at('/repo/guide/python'), base: '/repo/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'navigate', target: '/repo/zh-TW/guide/python' })
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/reference/attack-log-export-format'), location: at('/repo/reference/attack-log-export-format'), base: '/repo/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'stay' })
  })

  it('stays on the not-found page when the path has no counterpart (B7)', () => {
    expect(switcherDecision({ chosen: 'en', arrival: { kind: 'not-found' }, location: at('/zh-TW/no-such-page'), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'stay' })
  })

  it.each([
    ['/challenges', 'zh-TW', '/zh-TW/challenges'],
    ['/zh-TW/challenges', 'en', '/challenges'],
  ] as const)('from a failed load of %s, choosing %s goes to the lookup\'s counterpart %s (B7)', (pathname, chosen, target) => {
    expect(switcherDecision({ chosen, arrival: { kind: 'failed-load' }, location: at(pathname), base: '/', pages: PAGES_WITH_LISTS, P: 'en' }))
      .toEqual({ kind: 'navigate', target })
  })

  /**
   * The switcher table (A-§4.3, SW01–SW16), both primaries, both `X` instances and both bases.
   * `switcherDecision`'s decision and target, per row (wave 2's "SW01-16 pure" row). The line
   * (shown at once, 0008 D17) is not this function's output — it belongs to the "SW01-16 real
   * Layout" row (`not-found-wiring.test.ts`), which drives it through `useArrivals`.
   */
  for (const row of SW) {
    for (const x of X_INSTANCES) {
      for (const b of BASES) {
        it(`${row.id} (${x.label}, base ${b.label}): ${row.page} page, chosen ${row.chosen}`, () => {
          const T = row.T
          if (row.page === 'not-found') {
            // SW13–16: the not-found page or a failed load; the lookup drives the decision, not
            // the arrival's own entry (there is none). Reuses an NT-shaped not-found path so the
            // lookup's counterpart is simply `x.entry` (chosen does not matter here, 'either').
            const pathname = localizePath(x.entry, T, row.P)
            const pages = row.counterpart === 'listed' ? [x.entry] : []
            const decision = switcherDecision({
              chosen: row.P, arrival: { kind: 'not-found' }, location: at(b.prefix + pathname), base: b.base, pages, P: row.P,
            })
            expect(decision).toEqual(row.decision === 'stay' ? { kind: 'stay' } : { kind: 'navigate', target: b.prefix + x.entry })
            return
          }
          const own = row.page === 'primary' ? row.P : T
          const other = row.page === 'primary' ? T : row.P
          const entry = row.page === 'primary' ? x.entry : localizePath(x.entry, T, row.P)
          const chosen = row.chosen === 'own' ? own : other
          const counterpart = localizePath(entry, chosen, row.P)
          const pages = row.counterpart === 'listed' ? [counterpart] : []
          const decision = switcherDecision({
            chosen, arrival: { kind: 'page', entry }, location: at(b.prefix + entry), base: b.base, pages, P: row.P,
          })
          expect(decision).toEqual(row.decision === 'stay' ? { kind: 'stay' } : { kind: 'navigate', target: b.prefix + counterpart })
        })
      }
    }
  }
})
