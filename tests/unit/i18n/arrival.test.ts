import { describe, it, expect } from 'vitest'
import { classifyArrival, notFoundRedirect, lineLocale, createCarry, isArrival, switcherDecision } from '../../../.vitepress/theme/i18n/arrival'

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
    expect(notFoundRedirect(loc('/zh-TW/reference/attack-log-export-format'), '/', PAGES))
      .toEqual({ target: '/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', requested: 'zh-TW' })
  })

  it('sends a missing English page to the Traditional Chinese page, asking for en', () => {
    expect(notFoundRedirect(loc('/notice'), '/', PAGES)).toEqual({ target: '/zh-TW/notice', entry: '/zh-TW/notice', requested: 'en' })
  })

  it('keeps the base, the query and the hash, and spells the target as the list does', () => {
    expect(notFoundRedirect(loc('/repo/zh-TW/challenge/v05-php-check', '?q=1', '#h'), '/repo/', PAGES))
      .toEqual({ target: '/repo/challenge/v05-php-check/?q=1#h', entry: '/challenge/v05-php-check/', requested: 'zh-TW' })
  })

  it.each(['/zh-TW/no-such-page', '//evil.example/challenges', '/zh-TW/%2F%2Fevil.example', '/zh-TW/%E0%A4%A'])(
    'gives nothing for %s',
    (path) => {
      expect(notFoundRedirect(loc(path), '/', PAGES)).toBeNull()
    },
  )
})

describe('lineLocale', () => {
  it('names the requested locale when the page has no version in it', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/reference/attack-log-export-format', pages: PAGES, released: true })).toBe('zh-TW')
    expect(lineLocale({ requested: 'en', entry: '/zh-TW/notice', pages: PAGES, released: true })).toBe('en')
  })

  it('names nothing when the page has a version in the requested locale', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/guide/python', pages: PAGES, released: true })).toBeNull()
    expect(lineLocale({ requested: 'en', entry: '/zh-TW/guide/python', pages: PAGES, released: true })).toBeNull()
  })

  it('names nothing when the page is already in the requested locale', () => {
    expect(lineLocale({ requested: 'en', entry: '/reference/attack-log-export-format', pages: PAGES, released: true })).toBeNull()
  })

  it('names nothing before the arrival is released, and nothing without a page', () => {
    expect(lineLocale({ requested: 'zh-TW', entry: '/reference/attack-log-export-format', pages: PAGES, released: false })).toBeNull()
    expect(lineLocale({ requested: 'zh-TW', entry: null, pages: PAGES, released: true })).toBeNull()
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
    const landing = notFoundRedirect({ pathname: '/zh-TW/reference/attack-log-export-format' }, '/', PAGES)!
    expect(classifyArrival({ isNotFound: true, relativePath: '404.md', pathname: landing.target, base: '/' }, PAGES))
      .toEqual({ kind: 'failed-load' })
  })
})

// Spec 0008, B1–B3, B5, B7, D16: where a switcher choice goes. A counterpart in the list is
// navigated to by its entry, with the query and hash kept; anything else stays on the page.
describe('switcherDecision', () => {
  const PAGES_WITH_LISTS = [...PAGES, '/challenges', '/zh-TW/challenges', '/zh-TW/zh-only']
  const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash })
  const page = (entry: string) => ({ kind: 'page' as const, entry })

  it('navigates to the chosen locale\'s counterpart, query and hash kept (B1)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/guide/python'), location: at('/guide/python', '?q=1', '#h'), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'navigate', target: '/zh-TW/guide/python?q=1#h' })
    expect(switcherDecision({ chosen: 'en', arrival: page('/zh-TW/guide/python'), location: at('/zh-TW/guide/python'), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'navigate', target: '/guide/python' })
  })

  it.each(['/challenges/', '/challenges.html'])('names the target by its list entry, not the URL text %s (D16)', (pathname) => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/challenges'), location: at(pathname), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'navigate', target: '/zh-TW/challenges' })
  })

  it('stays when the counterpart is not in the list, either direction (B2)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/reference/attack-log-export-format'), location: at('/reference/attack-log-export-format'), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'stay' })
    expect(switcherDecision({ chosen: 'en', arrival: page('/zh-TW/zh-only'), location: at('/zh-TW/zh-only'), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'stay' })
  })

  it.each([['/guide/python', 'en'], ['/zh-TW/guide/python', 'zh-TW']] as const)('stays when %s is chosen in its own locale %s (B5)', (entry, chosen) => {
    expect(switcherDecision({ chosen, arrival: page(entry), location: at(entry), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'stay' })
  })

  it('keeps a site base on the target and stays where there is nothing to go to (B3)', () => {
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/guide/python'), location: at('/repo/guide/python'), base: '/repo/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'navigate', target: '/repo/zh-TW/guide/python' })
    expect(switcherDecision({ chosen: 'zh-TW', arrival: page('/reference/attack-log-export-format'), location: at('/repo/reference/attack-log-export-format'), base: '/repo/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'stay' })
  })

  it('stays on the not-found page when the path has no counterpart (B7)', () => {
    expect(switcherDecision({ chosen: 'en', arrival: { kind: 'not-found' }, location: at('/zh-TW/no-such-page'), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'stay' })
  })

  it.each([
    ['/challenges', 'zh-TW', '/zh-TW/challenges'],
    ['/zh-TW/challenges', 'en', '/challenges'],
  ] as const)('from a failed load of %s, choosing %s goes to the lookup\'s counterpart %s (B7)', (pathname, chosen, target) => {
    expect(switcherDecision({ chosen, arrival: { kind: 'failed-load' }, location: at(pathname), base: '/', pages: PAGES_WITH_LISTS }))
      .toEqual({ kind: 'navigate', target })
  })
})
