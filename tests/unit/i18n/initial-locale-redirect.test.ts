import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DEFAULT_VISITING_LOCALE,
  LOCALE_STORAGE_KEY,
  redirectTargetForStoredLocale,
  shouldPersistOnColdLoad,
} from '../../../.vitepress/theme/i18n'

/**
 * The stored locale preference is expressed as a NAVIGATION, not as an override
 * of the URL. `detectInitialLocale` no longer reads it; this is where it is read.
 *
 * The pure function is tested directly rather than through a mounted Layout: the
 * decision is "given this location and this stored value, where should we go",
 * and nothing about it needs a component. The Layout's job is to call it once on
 * mount and hand the result to the router with `replace`, which is asserted in
 * tests/unit/i18n/theme-redirect.test.ts.
 */
function loc(pathname: string, search = '', hash = '') {
  return { pathname, search, hash }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('redirectTargetForStoredLocale', () => {
  it('sends an unprefixed cold load to the stored locale', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/')).toBe('/zh-TW/challenges/')
  })

  it('sends the site root to the stored locale root', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/'), '/')).toBe('/zh-TW/')
  })

  // A prefixed URL is an explicit request. Redirecting away from it would make
  // every shared link unreliable for anyone holding a different preference.
  it('never redirects away from a pathname that already carries a prefix', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(redirectTargetForStoredLocale(loc('/zh-TW/guide/'), '/')).toBeNull()
  })

  // A visitor who has expressed no preference is the reader this site is built for,
  // and before the default existed they had to work the switcher once per machine.
  it('sends a visitor with no stored preference to the default visiting locale', () => {
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/')).toBe('/zh-TW/challenges/')
    expect(DEFAULT_VISITING_LOCALE).toBe('zh-TW')
  })

  // The default must not reach a pathname that already states its locale. A prefixed
  // path is an explicit request, and it outranks both the preference and the default.
  it('leaves a prefixed path alone even with no stored preference', () => {
    expect(redirectTargetForStoredLocale(loc('/zh-TW/challenges/'), '/')).toBeNull()
  })

  it('does not redirect when the stored preference already matches the path', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/')).toBeNull()
  })

  // Not a preference the system can honour, so it is not a preference: the default applies.
  it('treats a stored value naming no known locale as no preference', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon')
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/')).toBe('/zh-TW/challenges/')
  })

  // Same lesson as the switcher's own base bug: the locale segment belongs
  // INSIDE the base. The production base is '/', so only a non-identity base
  // can observe this.
  it.each([
    ['/wxl/', '/wxl/challenges/', '/wxl/zh-TW/challenges/'],
    ['/wxl/', '/wxl/', '/wxl/zh-TW/'],
    ['/', '/challenges/', '/zh-TW/challenges/'],
  ] as const)('under base %s, %s -> %s', (base, path, expected) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc(path), base)).toBe(expected)
  })

  it('preserves the query string and the hash', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(redirectTargetForStoredLocale(loc('/challenges/', '?tab=network', '#flag'), '/'))
      .toBe('/zh-TW/challenges/?tab=network#flag')
  })

  // A browser that refuses to answer has expressed no preference. Still must not throw.
  it('treats an unreachable localStorage as no preference', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => redirectTargetForStoredLocale(loc('/challenges/'), '/')).not.toThrow()
    expect(redirectTargetForStoredLocale(loc('/challenges/'), '/')).toBe('/zh-TW/challenges/')
  })

  // 1.3: the default path has to carry the same query, hash and base handling as the
  // stored-preference path — it is the same computation, not a second one.
  it('preserves the query string and the hash with no stored preference', () => {
    expect(redirectTargetForStoredLocale(loc('/challenges/', '?tab=network', '#flag'), '/'))
      .toBe('/zh-TW/challenges/?tab=network#flag')
  })

  it('keeps the locale segment inside the base with no stored preference', () => {
    expect(redirectTargetForStoredLocale(loc('/wxl/challenges/'), '/wxl/')).toBe('/wxl/zh-TW/challenges/')
  })
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
  it.each([
    ['/zh-TW/guide/', true],
    ['/zh-TW/', true],
    ['/challenges/', false],
    ['/', false],
    ['/zh-TWfoo', false],
  ] as const)('%s -> %s', (path, expected) => {
    expect(shouldPersistOnColdLoad(path, '/')).toBe(expected)
  })

  it('strips the site base before deciding', () => {
    expect(shouldPersistOnColdLoad('/wxl/zh-TW/guide/', '/wxl/')).toBe(true)
    expect(shouldPersistOnColdLoad('/wxl/challenges/', '/wxl/')).toBe(false)
  })
})
