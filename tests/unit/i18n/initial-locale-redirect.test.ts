import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  rememberChoice,
  _resetRememberedChoiceForTests,
  redirectTargetForStoredLocale,
  shouldPersistOnColdLoad,
  localizePath,
} from '../../../.vitepress/theme/i18n'
import { DT_PAGE, X_INSTANCES, BASES } from '../../__helpers__/localeTables'

/**
 * The stored locale preference is expressed as a NAVIGATION, not as an override
 * of the URL. `detectInitialLocale` no longer reads it; this is where it is read.
 *
 * The decisions are tested directly rather than through a mounted Layout: "given
 * what the router rendered, the page list, the base and this stored value, where
 * should we go, and is it written", and nothing about it needs a component. The
 * Layout calls the redirect once the session gate lets the cold load go and hands
 * the result to the router with `replace`, and records the write as it mounts;
 * both are asserted in tests/unit/i18n/theme-locale-wiring.test.ts and
 * tests/unit/i18n/not-found-wiring.test.ts.
 */
function loc(pathname: string, search = '', hash = '') {
  return { pathname, search, hash }
}

beforeEach(() => {
  window.localStorage.clear()
  _resetRememberedChoiceForTests()
})

// Spec 0008 (overridden contract): the redirect takes the page list and what the router
// rendered, and its target is the counterpart's list entry (D16) — `/challenges/` is rendered
// from `challenges.md`, whose entry is `/challenges`.
const LIST = ['/', '/challenges', '/guide/', '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/']
const rendered = (entry: string) => ({ kind: 'page' as const, entry })

describe('redirectTargetForStoredLocale', () => {
  it('sends an unprefixed cold load to the stored locale', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).toBe('/zh-TW/challenges')
  })

  it('sends the site root to the stored locale root', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/'), '/', LIST, rendered('/'), 'en')).toBe('/zh-TW/')
  })

  // A prefixed URL is an explicit request. Redirecting away from it would make
  // every shared link unreliable for anyone holding a different preference.
  it('never redirects away from a pathname that already carries a prefix', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(redirectTargetForStoredLocale(loc('/zh-TW/guide/'), '/', LIST, rendered('/zh-TW/guide/'), 'en')).toBeNull()
  })

  // Flipped by D31/wave 2 (ticket Comments, cross-area note 1; DT01/02/07/08): the separate
  // `DEFAULT_VISITING_LOCALE` constant this test named is gone, and "no preference" now falls
  // back to `P` itself (A1) — which a primary-locale page already is, so there is nothing left
  // to redirect to. Was: 'sends a visitor with no stored preference to the default visiting locale'.
  it('no longer redirects a visitor with no stored preference on a primary-locale page (A1, DT01)', () => {
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).toBeNull()
  })

  // The default must not reach a pathname that already states its locale. A prefixed
  // path is an explicit request, and it outranks both the preference and the default.
  it('leaves a prefixed path alone even with no stored preference', () => {
    expect(redirectTargetForStoredLocale(loc('/zh-TW/challenges/'), '/', LIST, rendered('/zh-TW/challenges'), 'en')).toBeNull()
  })

  it('does not redirect when the stored preference already matches the path', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).toBeNull()
  })

  // Not a preference the system can honour, so it is not a preference: `P` applies, and (as
  // above, A1/DT07/DT08) a primary-locale page under `P` has nothing to redirect to.
  it('treats a stored value naming no known locale as no preference (A1, DT07)', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).toBeNull()
  })

  // Same lesson as the switcher's own base bug: the locale segment belongs
  // INSIDE the base. The production base is '/', so only a non-identity base
  // can observe this.
  it.each([
    ['/wxl/', '/wxl/challenges/', '/challenges', '/wxl/zh-TW/challenges'],
    ['/wxl/', '/wxl/', '/', '/wxl/zh-TW/'],
    ['/', '/challenges/', '/challenges', '/zh-TW/challenges'],
  ] as const)('under base %s, %s (rendered as %s) -> %s', (base, path, entry, expected) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc(path), base, LIST, rendered(entry), 'en')).toBe(expected)
  })

  it('preserves the query string and the hash', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenges/', '?tab=network', '#flag'), '/', LIST, rendered('/challenges'), 'en'))
      .toBe('/zh-TW/challenges?tab=network#flag')
  })

  // A browser that refuses to answer has expressed no preference. Still must not throw. Flipped
  // (A1, DT08): no preference on a primary-locale page no longer redirects.
  it('treats an unreachable localStorage as no preference (A1, DT08)', () => {
    // Restored by its own handle. Nothing in this file or the vitest configuration restores
    // mocks, and `vi.restoreAllMocks()` in an `afterEach` did not restore a spy on happy-dom's
    // storage object when tried (T-0054's record); a leaked spy makes every later case read no
    // preference.
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    try {
      expect(() => redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).not.toThrow()
      expect(redirectTargetForStoredLocale(loc('/challenges/'), '/', LIST, rendered('/challenges'), 'en')).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })

  // 1.3: the query and hash handling is the same computation whether or not the preference is
  // explicit; exercised here with an explicit stored preference, since "no preference" no longer
  // redirects (A1) and so has nothing left to preserve a query and a hash across. Was: 'preserves
  // the query string and the hash with no stored preference'.
  it('preserves the query string and the hash with an explicit stored preference', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenges/', '?tab=network', '#flag'), '/', LIST, rendered('/challenges'), 'en'))
      .toBe('/zh-TW/challenges?tab=network#flag')
  })

  // Was: 'keeps the locale segment inside the base with no stored preference' — same reasoning
  // as the row above (A1).
  it('keeps the locale segment inside the base with an explicit stored preference', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/wxl/challenges/'), '/wxl/', LIST, rendered('/challenges'), 'en')).toBe('/wxl/zh-TW/challenges')
  })
})

/**
 * Spec 0008, decision table A1–A7: the cold-load redirect goes only to a counterpart that is a
 * published page, and names it by its page-list entry (D16), never by the URL's text. The page
 * list is a fixture: one translated challenge and article, one English-only challenge and
 * article.
 */
describe('redirectTargetForStoredLocale with the page list (spec 0008)', () => {
  const PAGES = [
    '/', '/challenges', '/guide/',
    '/challenge/door-is-open/', '/challenge/english-only/',
    '/guide/python', '/reference/attack-log-export-format',
    '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/',
    '/zh-TW/challenge/door-is-open/', '/zh-TW/guide/python', '/zh-TW/guide/zh-only',
  ]

  it('stays on an English-only challenge whose Traditional Chinese version does not exist (A2)', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenge/english-only/'), '/', PAGES, rendered('/challenge/english-only/'), 'en'))
      .toBeNull()
  })

  // S-5 (T-0053's security review): the target is spelled from the rendered page's entry and
  // the URL's path is not read, so whatever URL text rendered the page — an alias such as
  // `.html`, `/index.html` or a trailing slash, or any other — the target is the counterpart's
  // entry. Which URLs render which page is `classifyArrival`'s (tests/unit/i18n/arrival.test.ts).
  // A8/wave 2: "no preference" no longer redirects a primary-locale page (A1, DT01/02/07/08), so
  // this exercises the alias-resolution property under an explicit stored preference instead
  // (the property under test — resolve by entry, not by URL text — does not depend on which).
  it.each([
    ['/challenges.html', '/challenges', '/zh-TW/challenges'],
    ['/challenges/', '/challenges', '/zh-TW/challenges'],
    ['/guide/index.html', '/guide/', '/zh-TW/guide/'],
    ['/no/relation/to/the/page', '/challenge/door-is-open/', '/zh-TW/challenge/door-is-open/'],
  ] as const)('with the URL path %s, builds the target from the entry %s: %s (A8)', (pathname, entry, expected) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc(pathname), '/', PAGES, rendered(entry), 'en')).toBe(expected)
  })

  // The whole decision table: every stored value it names × challenge and article × base `/`
  // and `/repo/`, with a query and a hash. Unknown and unreadable values act as none.
  const STORED = {
    none: () => {},
    'zh-TW': () => window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW'),
    unknown: () => window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr'),
    unreadable: () => vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    }),
    en: () => window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en'),
  }
  // Each row's expected target under base `/` and under `/repo/`, only when `zh-TW` is stored
  // explicitly (A3): with `en` stored nothing redirects (A4, own locale), and — flipped by
  // D31/wave 2, A1/DT01/02/07/08 — with `none`/`unknown`/`unreadable` stored nothing redirects
  // either, since "no preference" now falls back to `P` ('en' in this fixture) and a
  // primary-locale page is already there.
  const ROWS = [
    ['A1 challenge', '/challenge/door-is-open/', '/zh-TW/challenge/door-is-open/?q=1#h', '/repo/zh-TW/challenge/door-is-open/?q=1#h'],
    ['A1 article', '/guide/python', '/zh-TW/guide/python?q=1#h', '/repo/zh-TW/guide/python?q=1#h'],
    ['A2 challenge', '/challenge/english-only/', null, null],
    ['A3 article', '/reference/attack-log-export-format', null, null],
    ['A5 challenge', '/zh-TW/challenge/door-is-open/', null, null],
    ['A5 article', '/zh-TW/guide/python', null, null],
    ['A5 article with no counterpart', '/zh-TW/guide/zh-only', null, null],
  ] as const
  const CASES = Object.keys(STORED).flatMap((stored) => ROWS.flatMap(([row, entry, atRoot, atRepo]) => [
    [row, stored, '/', '', entry, atRoot],
    [row, stored, '/repo/', '/repo', entry, atRepo],
  ] as const))

  it.each(CASES)('%s, stored %s, base %s', (_row, stored, base, prefix, entry, target) => {
    const spy = STORED[stored as keyof typeof STORED]()
    try {
      expect(redirectTargetForStoredLocale(loc(prefix + entry, '?q=1', '#h'), base, PAGES, rendered(entry), 'en'))
        .toBe(stored === 'zh-TW' ? target : null)
    } finally {
      spy?.mockRestore()
    }
  })

  // The cold-load redirect is for a page arrival only: a not-found arrival has its own
  // decision (C1–C3), and a failed load is left alone (C8), even where a counterpart exists.
  it.each([
    ['a failed load', '/challenges', { kind: 'failed-load' as const }],
    ['a not-found arrival, even one whose path has a prefixed twin in the list', '/guide/python/extra', { kind: 'not-found' as const }],
  ])('does not redirect %s', (_label, pathname, arrival) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc(pathname), '/', [...PAGES, '/zh-TW/guide/python/extra'], arrival, 'en'))
      .toBeNull()
  })
})

/**
 * The cold-load decision table (A-§4.1, DT01–DT16, DT41–DT56), both primaries: the PP and TP
 * rows of `tests/__helpers__/localeTables.ts`, run under both bases and both `X` instances
 * (challenge and article). `redirectTargetForStoredLocale`'s target and `shouldPersistOnColdLoad`'s
 * write, per row (wave 2's "DT01-16/41-56 pure" row).
 */
describe('the cold-load decision table (DT01–16, DT41–56): page arrivals', () => {
  for (const row of DT_PAGE) {
    for (const x of X_INSTANCES) {
      for (const b of BASES) {
        it(`${row.id} (${x.label}, base ${b.label}): ${row.arrival} stored ${row.stored}, counterpart ${row.counterpart}`, () => {
          const T = row.T
          const entry = row.arrival === 'PP' ? x.entry : localizePath(x.entry, T, row.P)
          if (row.stored === 'invalid') {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
          } else if (row.stored !== 'none') {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, row.stored)
          }
          const counterpartEntry = row.arrival === 'PP' ? localizePath(x.entry, T, row.P) : x.entry
          const pages = row.counterpart === 'exists' ? [entry, counterpartEntry] : [entry]
          const target = redirectTargetForStoredLocale(
            loc(b.prefix + entry, '?q=1', '#h'),
            b.base,
            pages,
            rendered(entry),
            row.P,
          )
          if (row.redirect === 'none') {
            expect(target).toBeNull()
          } else {
            const wantEntry = row.redirect === 'to-T' ? localizePath(entry, T, row.P) : entry
            expect(target).toBe(b.prefix + wantEntry + '?q=1#h')
          }
          expect(shouldPersistOnColdLoad(rendered(entry), row.P)).toBe(row.written !== null)
        })
      }
    }
  }
})

/**
 * The preference must survive the load that is supposed to act on it.
 *
 * Init-time used to persist whatever it detected. Under the URL-only rule that
 * would write `en` on every cold load of the unprefixed tree — wiping the very
 * preference the redirect exists to honour, before the redirect can read it.
 * So persistence on a cold load is conditional: an explicitly prefixed path is
 * a request and updates the preference; the default tree does not.
 */
describe('shouldPersistOnColdLoad', () => {
  // Spec 0008, W2–W4 (overridden contract): decided after the router resolves, from what it
  // rendered (D16) — a classified arrival, not the URL. Only a published page under `/zh-TW/`
  // is an explicit request.
  it.each([
    ['the Traditional Chinese guide', true, { kind: 'page', entry: '/zh-TW/guide/' }],
    ['the Traditional Chinese home page', true, { kind: 'page', entry: '/zh-TW/' }],
    // Whatever URL rendered `zh-TW/challenges.md` (`/zh-TW/challenges.html`, say): its entry.
    ['the page rendered from zh-TW/challenges.md', true, { kind: 'page', entry: '/zh-TW/challenges' }],
    ['an unprefixed page (W4)', false, { kind: 'page', entry: '/challenges' }],
    ['the unprefixed home page (W4)', false, { kind: 'page', entry: '/' }],
    ['a not-found arrival under /zh-TW/ (W3)', false, { kind: 'not-found' }],
    // S-2 (T-0053's security review): the not-found page for a path that IS a page — a chunk
    // that did not arrive — is not a request either, though its URL names a published page.
    ['a failed load of a Traditional Chinese page (W3)', false, { kind: 'failed-load' }],
  ] as const)('%s: written %s', (_label, expected, arrival) => {
    expect(shouldPersistOnColdLoad(arrival, 'en')).toBe(expected)
  })
})

// Spec 0008, W1, W6, B6, D14: a switcher choice is always remembered. When the stored preference
// cannot be written, the choice is kept in memory for the tab and read as the stored value for the
// rest of the tab's arrivals. Storage spies are restored by their own handles: under happy-dom
// `vi.restoreAllMocks()` does not restore a spy on `window.localStorage`.
describe('rememberChoice', () => {
  it('writes the choice, and it is read back', () => {
    rememberChoice('zh-TW')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
    expect(readStoredLocale()).toBe('zh-TW')
  })

  it('does not throw when storage refuses the write, and the choice holds for the tab', () => {
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      expect(() => rememberChoice('zh-TW')).not.toThrow()
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
      expect(readStoredLocale()).toBe('zh-TW')
    } finally {
      set.mockRestore()
    }
  })

  it('reads the kept choice before an older value storage still holds', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    try {
      rememberChoice('zh-TW')
    } finally {
      set.mockRestore()
    }
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(readStoredLocale()).toBe('zh-TW')
  })

  it('reads the kept choice when storage cannot be read either', () => {
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    const get = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    try {
      rememberChoice('en')
      expect(readStoredLocale()).toBe('en')
    } finally {
      set.mockRestore()
      get.mockRestore()
    }
  })

  it('drops the kept choice once a later write succeeds', () => {
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      rememberChoice('zh-TW')
    } finally {
      set.mockRestore()
    }
    rememberChoice('en')
    window.localStorage.clear()
    expect(readStoredLocale()).toBeNull()
  })

  it('the tests\' reset drops the kept choice, so one case cannot leak into the next', () => {
    const again = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      rememberChoice('zh-TW')
    } finally {
      again.mockRestore()
    }
    _resetRememberedChoiceForTests()
    expect(readStoredLocale()).toBeNull()
  })
})
