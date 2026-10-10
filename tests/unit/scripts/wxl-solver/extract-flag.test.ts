import { describe, it, expect } from 'vitest'
import { extractFinalFlag } from '../../../../scripts/wxl-solver/extract-flag'

describe('extractFinalFlag (task 5.3)', () => {
  it('returns the captured value for a clean FINAL_FLAG line', () => {
    const stdout = [
      'log line 1',
      'log line 2',
      'FINAL_FLAG=FLAG{door-is-open_abcd1234}',
    ].join('\n')
    expect(extractFinalFlag(stdout)).toBe('FLAG{door-is-open_abcd1234}')
  })

  it('returns the last match when multiple FINAL_FLAG lines appear', () => {
    const stdout = [
      'FINAL_FLAG=FLAG{first}',
      'noise',
      'FINAL_FLAG=FLAG{second}',
    ].join('\n')
    expect(extractFinalFlag(stdout)).toBe('FLAG{second}')
  })

  it('returns null when no FINAL_FLAG= line is present', () => {
    expect(extractFinalFlag('no flag here\nwhatsoever\n')).toBeNull()
  })

  it('returns the literal "INCONCLUSIVE" sentinel', () => {
    expect(extractFinalFlag('chatter\nFINAL_FLAG=INCONCLUSIVE\n')).toBe('INCONCLUSIVE')
  })

  it('only scans the last 20 lines by default', () => {
    const stdout = [
      'FINAL_FLAG=FLAG{too-far-back}',
      ...Array.from({ length: 25 }, (_, i) => `noise ${i}`),
    ].join('\n')
    expect(extractFinalFlag(stdout)).toBeNull()
  })

  it('handles CRLF stdout', () => {
    const stdout = 'log\r\nFINAL_FLAG=FLAG{crlf-ok}\r\n'
    expect(extractFinalFlag(stdout)).toBe('FLAG{crlf-ok}')
  })
})
