import { describe, it, expect } from 'vitest'
import { jsonStringifyEscaped } from '../../../.vitepress/layout-error'
import { jsonStringifyEscaped as jsonStringifyEscapedCreateWxl } from '../../../create-wxl/src/text.mjs'

// B95: one quoting function equal to create-wxl's (D140).
describe('jsonStringifyEscaped equals create-wxl’s (B95)', () => {
  const VALUES: unknown[] = [
    '\u0009', // Tab
    '\u000d', // CR
    '\n', // LF
    '\u001b', // ESC
    '\ud800', // lone surrogate
    '\u007f', // DEL
    '\u0085',
    '\u009b[31m',
    undefined,
    () => {},
  ]

  it.each(VALUES)('gives equal output for %j', (value) => {
    expect(jsonStringifyEscaped(value)).toBe(jsonStringifyEscapedCreateWxl(value))
  })
})
