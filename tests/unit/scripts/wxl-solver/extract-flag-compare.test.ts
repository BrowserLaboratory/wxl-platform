import { describe, it, expect } from 'vitest'
import { compareToCanonical } from '../../../../scripts/wxl-solver/extract-flag'

const FLAG_REGEX = /^(FLAG|CTF)\{[^}]+\}$/
const CANONICAL = 'FLAG{door-is-open_abcd1234}'

describe('compareToCanonical (task 5.4)', () => {
  it('verdict=pass when extracted matches the canonical flag byte-for-byte', () => {
    const out = compareToCanonical(CANONICAL, CANONICAL, FLAG_REGEX)
    expect(out.verdict).toBe('pass')
  })

  it('verdict=fail when the extracted flag does not match FLAG_REGEX', () => {
    const out = compareToCanonical('bogus', CANONICAL, FLAG_REGEX)
    expect(out.verdict).toBe('fail')
    expect(out.reason).toContain('does not match FLAG_REGEX')
  })

  it('verdict=fail when regex matches but the canonical bytes differ', () => {
    const out = compareToCanonical('FLAG{wrong-but-shaped}', CANONICAL, FLAG_REGEX)
    expect(out.verdict).toBe('fail')
    expect(out.reason).toContain('byte-match')
  })

  it('verdict=inconclusive when extracted is null (no FINAL_FLAG line)', () => {
    const out = compareToCanonical(null, CANONICAL, FLAG_REGEX)
    expect(out.verdict).toBe('inconclusive')
    expect(out.reason).toContain('no FINAL_FLAG')
  })

  it('verdict=inconclusive when extracted is the INCONCLUSIVE sentinel', () => {
    const out = compareToCanonical('INCONCLUSIVE', CANONICAL, FLAG_REGEX)
    expect(out.verdict).toBe('inconclusive')
  })
})
