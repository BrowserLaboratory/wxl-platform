import { describe, it, expect } from 'vitest'
import {
  summariseFirstLine,
  formatHistoryLabel,
} from '../../../.vitepress/theme/composables/codeHistoryLabel'

// The rules under test come from the spec's "label derivation" example table. Each row
// there is one case here — the table is the agreed specification, so the values are
// copied rather than invented.
//
// They live in their own module because `<script setup>` cannot export a named binding.
// Reading them back out of the rendered <option> text would tie the summary rule and the
// time format together in one assertion, and a mutation to either would then be
// indistinguishable from a mutation to the other.

describe('summariseFirstLine', () => {
  const cases: Array<{ label: string; code: string; expected: string }> = [
    { label: 'a single short line', code: 'print(1)', expected: 'print(1)' },
    { label: 'leading blank lines are skipped', code: '\n\n  print(1)', expected: 'print(1)' },
    {
      label: 'a line past the limit is truncated to 39 characters plus an ellipsis',
      code: 'r = requests.post(URL, data={"qty": -1000000}, timeout=5)',
      expected: 'r = requests.post(URL, data={"qty": -10…',
    },
    { label: 'an empty string has no line to summarise', code: '', expected: '(empty)' },
    { label: 'whitespace-only lines have no line to summarise', code: '\n   \n', expected: '(empty)' },
  ]

  for (const c of cases) {
    it(`${c.label}`, () => {
      expect(summariseFirstLine(c.code)).toBe(c.expected)
    })
  }

  it('a line of exactly 40 characters is not truncated', () => {
    // The boundary itself, stated separately. The table's truncation row is well past
    // the limit, so on its own it cannot tell "> 40" from ">= 40".
    const line = 'x'.repeat(40)
    expect(summariseFirstLine(line)).toBe(line)
  })

  it('a line of 41 characters is truncated', () => {
    const line = 'x'.repeat(41)
    expect(summariseFirstLine(line)).toBe('x'.repeat(39) + '…')
  })
})

describe('formatHistoryLabel', () => {
  // A fixed local wall-clock time. Constructed from components rather than parsed from a
  // UTC string so the expected `HH:MM:SS` does not depend on the runner's timezone.
  const at = new Date(2026, 7, 23, 14, 5, 9).getTime()

  it('joins the time, the separator and the summary', () => {
    expect(formatHistoryLabel({ timestamp: at, code: 'print(1)', error: false }))
      .toBe('14:05:09 · print(1)')
  })

  it('pads single-digit time parts to two digits', () => {
    const early = new Date(2026, 7, 23, 4, 5, 6).getTime()
    expect(formatHistoryLabel({ timestamp: early, code: 'print(1)', error: false }))
      .toBe('04:05:06 · print(1)')
  })

  it('prefixes a failed execution', () => {
    expect(formatHistoryLabel({ timestamp: at, code: 'print(1)', error: true }))
      .toBe('⚠ 14:05:09 · print(1)')
  })

  it('does not prefix a successful execution', () => {
    expect(formatHistoryLabel({ timestamp: at, code: 'print(1)', error: false }))
      .not.toContain('⚠')
  })
})
