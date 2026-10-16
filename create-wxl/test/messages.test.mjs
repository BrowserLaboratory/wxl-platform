// zh-TW message wording for T-0022's setup questions and CW-E05/CW-E12, read against
// GLOSSARY.md.

import { describe, it, expect } from 'vitest'
import { messages, en, zhTW } from '../src/messages.mjs'

/** Strips whitespace and every punctuation/symbol character (ASCII and full-width alike), so two
 * strings that differ only in punctuation compare equal: zh-TW and en text that differ only in
 * full-width vs. half-width punctuation are not meaningfully different in wording. */
function stripPunctuation(s) {
  return s.replace(/[\s\p{P}\p{S}]/gu, '')
}

describe('zh-TW wording (T-0022 review)', () => {
  it('CW-E12 says 靶場 for the range, not 範圍', () => {
    const text = messages['zh-TW']['CW-E12']({ message: 'x', directory: 'd', argv: [], version: '1.0.0' })
    expect(text).toContain('靶場')
    expect(text).not.toContain('範圍')
  })

  it('S2 and the summary repository line differ from en in wording, not just punctuation, keeping the term "repository"', () => {
    expect(stripPunctuation(zhTW.S2())).not.toBe(stripPunctuation(en.S2()))
    expect(zhTW.S2()).toContain('repository')
    const zhSummary = zhTW['S6-REPO']({ value: 'alice/r' })
    const enSummary = en['S6-REPO']({ value: 'alice/r' })
    expect(stripPunctuation(zhSummary)).not.toBe(stripPunctuation(enSummary))
    expect(zhSummary).toContain('repository')
  })

  it('zh-TW uses one term, 部署目標, for host across the prompt, its reason line and the summary; options keep the en shape, no U+3000', () => {
    expect(zhTW.S3()).toContain('部署目標')
    expect(zhTW['S3-INVALID']({ value: 'x' })).toContain('部署目標')
    expect(zhTW['S6-HOST']({ value: 'github-pages' })).toContain('部署目標')
    expect(zhTW.S3()).not.toContain('　')
    expect(zhTW.S3()).toMatch(/1\) .*2\)/)
  })

  it('zh-TW CW-E05 says 參數, not 旗標, consistent with CW-E02', () => {
    const text = zhTW['CW-E05']({ missing: ['author'] })
    expect(text).toContain('參數')
    expect(text).not.toContain('旗標')
  })

  it('S4 reads naturally in zh-TW; CW-E05 shows the same command fragment in both languages, without backticks', () => {
    const zhOrigin = zhTW.S4()
    expect(zhOrigin).not.toMatch(/留空.*留空/)
    const zhE05 = zhTW['CW-E05']({ missing: ['author'] })
    const enE05 = en['CW-E05']({ missing: ['author'] })
    expect(zhE05).not.toContain('`')
    expect(enE05).not.toContain('`')
    const fragment = 'npm create wxl <directory> -- <flags>'
    expect(zhE05).toContain(fragment)
    expect(enE05).toContain(fragment)
  })
})
