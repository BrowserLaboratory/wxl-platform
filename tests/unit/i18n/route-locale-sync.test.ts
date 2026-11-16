import { describe, it, expect } from 'vitest'
import { detectLocaleFromPath, type Locale } from '../../../.vitepress/theme/i18n'

// ─── Pure-function detection rule ────────────────────────────────────────────
//
// These cover Requirement: Route-prefix change syncs vue-i18n locale and
// persists to localStorage — Scenario "Exact `/zh-TW` pathname is treated
// as zh-TW" and Scenario "Pathological prefix `/zh-TWfoo` is treated as en".

describe('detectLocaleFromPath', () => {
  // P = en (today's build; T = zh-TW): every case unchanged (T1), with P passed explicitly.
  const cases: [string, Locale][] = [
    ['/', 'en'],
    ['/guide/', 'en'],
    ['/zh-TW', 'zh-TW'],
    ['/zh-TW/', 'zh-TW'],
    ['/zh-TW/guide/', 'zh-TW'],
    // Pathological: `/zh-TWfoo` shares the literal prefix `zh-TW` but lacks
    // the trailing separator. The rule MUST NOT misclassify this as zh-TW.
    ['/zh-TWfoo', 'en'],
    // Defensive edges. `useRoute().path` from VitePress excludes query and
    // hash, so these should never actually reach the watcher in production,
    // but the pure function is still expected to handle them deterministically.
    // Both lack a `/` after `zh-TW`, so the prefix rule rejects them → 'en'.
    ['/zh-TW?foo=bar', 'en'],
    ['/zh-TW#section', 'en'],
    // Empty string — defensive only; never produced by VitePress.
    ['', 'en'],
    // A26: `P`'s own code is not a routing prefix at all, so it is ordinary path text — not
    // terminated by a locale boundary the rule recognises as T's.
    ['/en/x', 'en'],
    // A26: a case mismatch on T's own code is not the prefix either (case-sensitive).
    ['/zh-tw/x', 'en'],
  ]

  it.each(cases)('path %s → locale %s', (path, expected) => {
    expect(detectLocaleFromPath(path, 'en')).toBe(expected)
  })

  // A26: the same table, mirrored under P = zh-TW (T = en) — every expectation flips with the
  // two codes swapped. Mapped to the actual mirrored path/locale pair up front, so the test
  // title (and any failure) names what is really run, not the P = en row it was derived from.
  const mirroredCases = cases.map(([path, expectedUnderEn]) => {
    const mirrored = path.replaceAll('zh-TW', '\u0000').replaceAll('en', 'zh-TW').replaceAll('\u0000', 'en')
    const expected: Locale = expectedUnderEn === 'en' ? 'zh-TW' : 'en'
    return [mirrored, expected] as const
  })

  it.each(mirroredCases)('under P = zh-TW, path %s → locale %s (A26)', (mirrored, expected) => {
    expect(detectLocaleFromPath(mirrored, 'zh-TW')).toBe(expected)
  })
})

// ─── Route watcher integration ──────────────────────────────────────────────
//
// The Layout's route watcher used to be tested here through a copy declared in this
// file, which could not go red when the original changed. Its behaviour — it sets the
// interface locale on every cross-locale navigation and, since spec 0008 (D5, W5),
// writes no stored preference — is now asserted against the real Layout in
// tests/unit/i18n/theme-locale-wiring.test.ts.
