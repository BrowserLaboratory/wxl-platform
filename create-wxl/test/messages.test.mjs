// zh-TW message wording for T-0022's setup questions and CW-E05/CW-E12, read against
// GLOSSARY.md.

import { describe, it, expect } from 'vitest'
import { messages, en, zhTW } from '../src/messages.mjs'
import { jsonValue } from '../src/text.mjs'

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

describe('N3 prints the repository name as a JSON string literal (traceability.md "Error and warning codes")', () => {
  it('en and zh-TW both quote owner/name, not the bare value', () => {
    const literal = jsonValue('alice/r')
    const enText = en.N3({ owner: 'alice', name: 'r' })
    const zhText = zhTW.N3({ owner: 'alice', name: 'r' })
    expect(enText).toContain(literal)
    expect(zhText).toContain(literal)
  })
})

describe('zh-TW N5 and N7 wording', () => {
  it('N5 keeps "tag" in English and separates the two git commands as two steps, not a parallel list', () => {
    const text = zhTW.N5()
    expect(text).toContain('v* tag')
    expect(text).not.toContain('標籤')
    expect(text).toContain('執行 git tag v0.1.0，再執行 git push origin v0.1.0')
  })

  it('N7 says "Rust 與 wasm-pack" are what is needed, not "安裝 wasm-pack 的 Rust"', () => {
    const text = zhTW.N7()
    expect(text).toContain('Rust 與 wasm-pack')
    expect(text).not.toContain('安裝 wasm-pack 的 Rust')
  })
})
