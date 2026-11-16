import { describe, it, expect } from 'vitest'
import { pageLocaleOf } from '../../../.vitepress/theme/i18n'

/**
 * `pageLocaleOf` (D31, seam 0010-S11): `localeIndex` (VitePress's `useData()`), translated to a
 * `Locale`. There is no prior art — `0010-S11` has no prior seam — this is the function's first
 * test file. Used by `LocaleSwitcher.vue`, `MergedNav.vue`, `ChallengeList.vue` and
 * `HomeContent.vue`, each of which read the page's locale from `localeIndex` rather than from
 * the vue-i18n runtime (SSR starts the runtime at `en`; the page is correct from the first byte).
 */
describe('pageLocaleOf', () => {
  it("is P when localeIndex is 'root'", () => {
    expect(pageLocaleOf('root', 'en')).toBe('en')
    expect(pageLocaleOf('root', 'zh-TW')).toBe('zh-TW')
  })

  it("is T when localeIndex is T's own code", () => {
    expect(pageLocaleOf('zh-TW', 'en')).toBe('zh-TW')
    expect(pageLocaleOf('en', 'zh-TW')).toBe('en')
  })

  it('is P for an unknown localeIndex value (the same silent fallback as detectLocaleFromPath)', () => {
    expect(pageLocaleOf('fr', 'en')).toBe('en')
    expect(pageLocaleOf('fr', 'zh-TW')).toBe('zh-TW')
    expect(pageLocaleOf('', 'en')).toBe('en')
  })

  // P's own code is never a `localeIndex` key on itself — VitePress keys the primary locale
  // 'root' — but a stray value equal to P still resolves to P, not T, under the fallback rule.
  it("is P when localeIndex happens to equal P's own code (not a real VitePress value)", () => {
    expect(pageLocaleOf('en', 'en')).toBe('en')
    expect(pageLocaleOf('zh-TW', 'zh-TW')).toBe('zh-TW')
  })
})
