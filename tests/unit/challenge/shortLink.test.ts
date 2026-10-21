import { describe, it, expect } from 'vitest'
import { challengeLink } from '../../../.vitepress/challenge/shortLink'

// Seam 0007-S8: the link helper, with the origin as an argument. Every expected value is a
// literal from traceability.md's link forms (X1–X6), never recomputed the way the helper does.

const WXL = 'https://wxl.browserlab.online'

describe('challengeLink in short mode', () => {
  it('gives X1: the English short link and its displayed text (L01)', () => {
    expect(challengeLink('short', 1, 'door-is-open', 'en', WXL)).toEqual({
      url: 'https://wxl.browserlab.online/c/001',
      display: 'wxl.browserlab.online/c/001',
    })
  })

  it('gives X2: the Traditional Chinese short link, 42 padded to 042 (L02, L03)', () => {
    expect(challengeLink('short', 42, 'door-is-open', 'zh-TW', WXL)).toEqual({
      url: 'https://wxl.browserlab.online/zh/c/042',
      display: 'wxl.browserlab.online/zh/c/042',
    })
  })

  it('leaves a number wider than three digits unchanged (L03)', () => {
    expect(challengeLink('short', 1234, 'door-is-open', 'en', WXL)).toEqual({
      url: 'https://wxl.browserlab.online/c/1234',
      display: 'wxl.browserlab.online/c/1234',
    })
  })

  it.each([undefined, '', 'My Chall'])('needs no slug and ignores it: slug %j (L11)', (slug) => {
    expect(challengeLink('short', 1, slug, 'en', WXL)).toEqual({
      url: 'https://wxl.browserlab.online/c/001',
      display: 'wxl.browserlab.online/c/001',
    })
  })
})

describe('challengeLink in page mode', () => {
  it('gives X3: the English page URL and its displayed text (L04)', () => {
    expect(challengeLink('page', 1, 'door-is-open', 'en', WXL)).toEqual({
      url: 'https://wxl.browserlab.online/challenge/door-is-open/',
      display: 'wxl.browserlab.online/challenge/door-is-open/',
    })
  })

  it("gives X4: the Traditional Chinese page URL after a project site's origin, path kept (L05, L06)", () => {
    expect(challengeLink('page', 3, 'selected-excerpts', 'zh-TW', 'https://teacher.github.io/my-range')).toEqual({
      url: 'https://teacher.github.io/my-range/zh-TW/challenge/selected-excerpts/',
      display: 'teacher.github.io/my-range/zh-TW/challenge/selected-excerpts/',
    })
  })

  it('gives X5: the page path right after an origin with no path; the number appears nowhere (L07)', () => {
    const link = challengeLink('page', 1234, 'staff-only', 'en', 'https://teacher.github.io')
    expect(link).toEqual({
      url: 'https://teacher.github.io/challenge/staff-only/',
      display: 'teacher.github.io/challenge/staff-only/',
    })
    expect(link!.url).not.toContain('1234')
  })

  it('appends to the origin as given, without normalising it', () => {
    // A hand-edited origin with a trailing slash breaks links (spec B4); the helper does not
    // repair it, so the defect stays visible rather than half-fixed in one place.
    expect(challengeLink('page', 1, 'door-is-open', 'en', 'https://teacher.github.io/my-range/')?.url).toBe(
      'https://teacher.github.io/my-range//challenge/door-is-open/',
    )
  })
})

describe('challengeLink returns none', () => {
  // The slug grammar is create:challenge's: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
  it.each([
    ['missing (L10)', undefined],
    ['empty (L10)', ''],
    ['My Chall: X6 (L16)', 'My Chall'],
    ['a_b (L16)', 'a_b'],
    ['-a (L16)', '-a'],
    ['a- (the grammar ends on a letter or digit)', 'a-'],
  ])('in page mode for a slug that is %s', (_label, slug) => {
    expect(challengeLink('page', 1, slug, 'en', 'https://teacher.github.io')).toBeNull()
  })

  it('in page mode accepts the one-character slug a, the grammar\'s shortest', () => {
    expect(challengeLink('page', 1, 'a', 'en', 'https://teacher.github.io')?.url).toBe(
      'https://teacher.github.io/challenge/a/',
    )
  })

  it.each([undefined, 0, -1, 1.5])('in both modes for the number %j (L20)', (n) => {
    expect(challengeLink('short', n, 'door-is-open', 'en', WXL)).toBeNull()
    expect(challengeLink('page', n, 'door-is-open', 'en', WXL)).toBeNull()
  })
})
