import { describe, it, expect } from 'vitest'
import { localizePath } from '../../../.vitepress/theme/i18n'

/**
 * Every row below whose input appears in the Example table of the spec
 * requirement "Locale path prefixing is single-sourced in localizePath" takes
 * its expected value verbatim from that table. Those are the agreed
 * specification — do not change them here.
 *
 * Rows absent from the table carry a `// not in the spec table` marker on their
 * own line — do not add an unmarked row. Round 1 caught this docstring claiming
 * all its values came from the table when five did not; round 2 caught the
 * replacement claiming three when four did. The count is deliberately no longer
 * stated here: a number in prose goes stale the moment a row is added, while
 * the per-row markers cannot.
 */
describe('localizePath', () => {
  // The idempotence guarantee is scoped to site-absolute paths. These two rows
  // pin the boundary: the function is NOT idempotent outside that scope, and
  // round 2 caught the spec asserting it unconditionally.
  it.each([
    ['', 'zh-TW', '/zh-TW', '/zh-TW/'],
    ['noleadingslash', 'zh-TW', '/zh-TWnoleadingslash', '/zh-TW/zh-TWnoleadingslash'],
  ] as const)('is NOT idempotent for the non-absolute input %p', (input, locale, once, twice) => {
    expect(localizePath(input, locale)).toBe(once)
    expect(localizePath(once, locale)).toBe(twice)
    expect(twice).not.toBe(once)
  })

  it.each([
    ['/challenges/', 'zh-TW', '/zh-TW/challenges/'],
    ['/', 'zh-TW', '/zh-TW/'],
    ['/guide/', 'zh-TW', '/zh-TW/guide/'], // not in the spec table
  ] as const)('adds the zh-TW prefix: %s -> %s', (input, locale, expected) => {
    expect(localizePath(input, locale)).toBe(expected)
  })

  it.each([
    ['/zh-TW/guide/', 'en', '/guide/'],
    ['/zh-TW/', 'en', '/'],
    ['/zh-TW', 'en', '/'], // not in the spec table: bare locale segment
  ] as const)('strips the zh-TW prefix: %s -> %s', (input, locale, expected) => {
    expect(localizePath(input, locale)).toBe(expected)
  })

  // Idempotence is what makes the function safe to apply to already-localized
  // input. Without it a caller that localizes twice emits /zh-TW/zh-TW/...
  it.each([
    ['/zh-TW', 'zh-TW', '/zh-TW/'],
    ['/zh-TW/guide/', 'zh-TW', '/zh-TW/guide/'],
    ['/zh-TW/', 'zh-TW', '/zh-TW/'], // not in the spec table: root normal form
    ['/guide/', 'en', '/guide/'], // not in the spec table: identity for the default locale
  ] as const)('is idempotent for the same locale: %s -> %s', (input, locale, expected) => {
    expect(localizePath(input, locale)).toBe(expected)
  })

  // The locale segment must be terminated by a separator or end-of-string,
  // matching detectLocaleFromPath. /zh-TWfoo is not a zh-TW path.
  it.each([
    ['/zh-TWfoo', 'en', '/zh-TWfoo'],
    ['/zh-TWfoo', 'zh-TW', '/zh-TW/zh-TWfoo'],
  ] as const)('does not treat an unterminated prefix as a locale prefix: %s -> %s', (input, locale, expected) => {
    expect(localizePath(input, locale)).toBe(expected)
  })
})
