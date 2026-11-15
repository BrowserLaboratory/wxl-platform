// One error class for PL-E01-PL-E18 (D113), shared by the primary-locale reader now and the
// layout check later. `jsonStringifyEscaped` is D140's quoting function: every value or path the
// PL codes quote is printed by one function equal to create-wxl's `jsonStringifyEscaped`
// (`create-wxl/src/text.mjs`).

export class SiteLayoutError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SiteLayoutError'
    this.code = code
  }
}

function isControlCodePoint(code: number): boolean {
  return code < 0x20 || (code >= 0x7f && code <= 0x9f)
}

function isLoneSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdfff
}

const SHORT_ESCAPE_CODES: Record<string, string> = { b: '0008', f: '000c', r: '000d', t: '0009' }

export function jsonStringifyEscaped(value: unknown): string | undefined {
  let str: string | undefined
  try {
    str = JSON.stringify(value)
  } catch {
    return undefined
  }
  if (typeof str !== 'string') return undefined
  str = str.replace(/\\(.)/g, (pair, c: string) =>
    c in SHORT_ESCAPE_CODES ? `\\u${SHORT_ESCAPE_CODES[c]}` : pair,
  )
  let out = ''
  for (const ch of str) {
    const code = ch.codePointAt(0) as number
    out += isControlCodePoint(code) || isLoneSurrogate(code) ? `\\u${code.toString(16).padStart(4, '0')}` : ch
  }
  return out
}
