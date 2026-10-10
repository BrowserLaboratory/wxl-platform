import { describe, it, expect } from 'vitest'
import {
  REDACTED_PLACEHOLDER,
  MIN_FLAG_LENGTH,
  FLAG_VALUE_SHAPE,
  redactFlags,
  buildDisplayBundle,
  SOURCE_DISPLAY_KEY,
} from '../../../scripts/challenge-source-display'
import {
  APP_KEY,
  RESERVED_FS_KEYS,
  SOURCE_DISPLAY_KEY as PAGE_SOURCE_DISPLAY_KEY,
} from '../../../.vitepress/challenge/reserved-keys'

const FLAG = 'FLAG{d00r_1s_0p3n_87cfb87b}'

describe('redactFlags', () => {
  // The rows are the delta spec's "redaction criteria applied to source lines" example
  // table, one test each. They are the agreed specification, not illustrations.
  it.each([
    [
      'flag value',
      `FLAG_HINT = "${FLAG}"`,
      'FLAG_HINT = "FLAG{REDACTED}"',
    ],
    [
      'flag format',
      '# superseded: CTF{old_one}',
      '# superseded: FLAG{REDACTED}',
    ],
    [
      'neither',
      'open("/flag.txt").read().strip()',
      'open("/flag.txt").read().strip()',
    ],
  ])('redacts by %s', (_criterion, input, expected) => {
    expect(redactFlags(input, FLAG).content).toBe(expected)
  })

  // The flag file ends with a newline in every challenge in this repo, and the challenge
  // program strips it before comparing. Matching the untrimmed content would be a silent
  // zero-hit: the replace runs, changes nothing, and reports success.
  it('still matches when the flag file content has a trailing newline', () => {
    const result = redactFlags(`SECRET = "${FLAG}"`, `${FLAG}\n`)
    expect(result.content).toBe('SECRET = "FLAG{REDACTED}"')
    expect(result.content).not.toContain(FLAG)
  })

  it('skips the value criterion but still applies the format criterion for a blank flag', () => {
    const result = redactFlags('token = "CTF{abc}"', '   \n')
    expect(result.content).toBe('token = "FLAG{REDACTED}"')
  })

  it('does not replace the whole document when the flag content is blank', () => {
    // A naive `split('').join()` on the empty string would splice the placeholder between
    // every character. The guard is what keeps that from happening.
    const result = redactFlags('plain text, no flags here', '')
    expect(result.content).toBe('plain text, no flags here')
    expect(result.count).toBe(0)
  })

  // This test used to assert the opposite: that a non-flag-shaped flag is redacted by
  // value, on the reasoning that such a flag "has only this criterion protecting it".
  // Round 2 of review overturned that. The value criterion is a substring replace, and
  // the only thing that keeps it off ordinary source is that the substring cannot occur
  // there — which `FLAG{…}` guarantees and `wxl-2026-plain-secret` does not. Measured:
  // a 14-character flag of `return request` passed the length guard and rewrote
  // `return request.path` in the handout, reported as one flag redacted.
  it('refuses a flag that is not FLAG{...}/CTF{...} shaped rather than redacting by value', () => {
    const plain = 'wxl-2026-plain-secret'
    expect(() => redactFlags(`TOKEN = "${plain}"`, `${plain}\n`)).toThrow(/not FLAG\{\.\.\.\} or CTF\{\.\.\.\} shaped/)
  })

  it('refuses a flag that is long enough but occurs in ordinary source', () => {
    expect(() => redactFlags('def render(request):\n    return request.path\n', 'return request\n'))
      .toThrow(/not FLAG/)
  })

  it('reports length before shape for a flag that fails both', () => {
    expect(() => redactFlags('x', 'admin\n')).toThrow(/5 characters/)
  })

  // The shape is one token: braces or whitespace inside the body would let the value
  // criterion match across code, which is the thing the shape exists to prevent.
  it.each([
    ['CTF prefix', 'CTF{abcdefghij}', true],
    ['lowercase prefix', 'flag{abcdefghij}', true],
    ['whitespace in body', 'FLAG{abc defghij}', false],
    ['nested brace in body', 'FLAG{abc{d}efghij}', false],
    ['text after the closing brace', 'FLAG{abcdefghij} x', false],
    ['no braces', 'FLAGabcdefghijkl', false],
  ])('shape %s → %s', (_label, value, ok) => {
    expect(FLAG_VALUE_SHAPE.test(value)).toBe(ok)
  })

  // Criterion 2 exists to catch a flag the value criterion cannot see: a stale one, or
  // another challenge's, left in a comment. Those are not guaranteed to be uppercase.
  it.each([
    ['lowercase prefix', '# old: flag{d00r_1s_0p3n}', '# old: FLAG{REDACTED}'],
    ['mixed-case prefix', '# old: Ctf{abc}', '# old: FLAG{REDACTED}'],
  ])('redacts a flag-shaped token with a %s', (_label, input, expected) => {
    const result = redactFlags(input, FLAG)
    expect(result.content).toBe(expected)
    expect(result.count).toBe(1)
  })

  // The spec scenario "A flag prefix with no closing brace on its line does not swallow
  // later lines". Round 3 of review measured the first regex, `[^}]*`, eating the line
  // between: input of three lines came back as two, reported as one redaction.
  it('leaves a bare FLAG{ prefix and the lines after it alone', () => {
    const src = 'x = "FLAG{"\ny = {"k": 1}\nz = 2'
    const result = redactFlags(src, `${FLAG}\n`)
    expect(result.content).toBe(src)
    expect(result.count).toBe(0)
  })

  // A flag with no format constraint and a plain substring replace: below a minimum
  // length the replace hits ordinary identifiers as readily as the flag. Skipping it
  // would ship the flag in the handout; applying it would corrupt the handout. Neither
  // is an outcome to produce quietly, so it throws.
  it('throws for a flag shorter than the minimum rather than corrupting the document', () => {
    expect(() => redactFlags('if user.role == "admin":', 'admin\n')).toThrow(/5 characters/)
  })

  it('throws naming the minimum so the author knows the target', () => {
    expect(() => redactFlags('x', 'short')).toThrow(new RegExp(`below ${MIN_FLAG_LENGTH}`))
  })

  it('accepts a flag of exactly the minimum length', () => {
    const exact = `FLAG{${'a'.repeat(MIN_FLAG_LENGTH - 6)}}`
    expect(exact).toHaveLength(MIN_FLAG_LENGTH)
    expect(redactFlags(`token = "${exact}"`, `${exact}\n`).content).toBe('token = "FLAG{REDACTED}"')
  })

  it('throws for a flag one character under the minimum', () => {
    const under = `FLAG{${'a'.repeat(MIN_FLAG_LENGTH - 7)}}`
    expect(under).toHaveLength(MIN_FLAG_LENGTH - 1)
    expect(() => redactFlags(`token = "${under}"`, `${under}\n`)).toThrow(/characters/)
  })

  it('pins the minimum this build enforces', () => {
    expect(MIN_FLAG_LENGTH).toBe(12)
  })

  it('reports the number of redacted occurrences', () => {
    const result = redactFlags(`a ${FLAG} b ${FLAG} c CTF{other}`, FLAG)
    expect(result.count).toBe(3)
    expect(result.content).not.toContain(FLAG)
    expect(result.content).not.toContain('CTF{other}')
  })

  it('reports zero for content that holds no flag', () => {
    expect(redactFlags('open("/flag.txt").read()', FLAG).count).toBe(0)
  })

  it('uses the placeholder this build writes', () => {
    expect(REDACTED_PLACEHOLDER).toBe('FLAG{REDACTED}')
  })
})

describe('buildDisplayBundle', () => {
  const appPath = 'app.py'
  const appContent = 'from flask import Flask\n'
  const fsEntries = new Map<string, Uint8Array>([
    ['/flag.txt', new TextEncoder().encode(`${FLAG}\n`)],
    ['/templates/cart.html', new TextEncoder().encode('<p>cart</p>')],
    ['/logo.png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe])],
  ])

  it('names the reserved payload key this build writes', () => {
    expect(SOURCE_DISPLAY_KEY).toBe('__source__')
  })

  // The build writes this key; the challenge page withholds it from the runtime. Both
  // sides read the same module, and this pins that the withholding set actually holds
  // the keys the build emits — an edit to either that broke the pairing goes red here.
  it('is the same key the challenge page withholds from the runtime filesystem', () => {
    expect(PAGE_SOURCE_DISPLAY_KEY).toBe(SOURCE_DISPLAY_KEY)
    expect(RESERVED_FS_KEYS.has(SOURCE_DISPLAY_KEY)).toBe(true)
    expect(RESERVED_FS_KEYS.has(APP_KEY)).toBe(true)
    expect(APP_KEY).toBe('__app__')
  })

  // The rows are the delta spec's "files array ordering" example table.
  it.each([
    ['omitted', [], ['app.py']],
    ['one extra path', ['/templates/cart.html'], ['app.py', '/templates/cart.html']],
    [
      'two extra paths',
      ['/flag.txt', '/templates/cart.html'],
      ['app.py', '/flag.txt', '/templates/cart.html'],
    ],
  ])('orders files with the app first when source_files is %s', (_label, sourceFiles, expected) => {
    const bundle = buildDisplayBundle({
      appPath,
      appContent,
      sourceFiles: sourceFiles as string[],
      fsEntries,
      flagContent: FLAG,
    })
    expect(bundle.files.map((f) => f.path)).toEqual(expected)
  })

  it('redacts every file in the bundle, the flag file included', () => {
    const bundle = buildDisplayBundle({
      appPath,
      appContent: `SECRET = "${FLAG}"\n`,
      sourceFiles: ['/flag.txt'],
      fsEntries,
      flagContent: `${FLAG}\n`,
    })
    for (const file of bundle.files) {
      expect(file.content).not.toContain(FLAG)
    }
    expect(bundle.files[1].content).toContain(REDACTED_PLACEHOLDER)
    expect(bundle.redactedCount).toBe(2)
  })

  it('throws naming the path when source_files lists an entry the challenge does not have', () => {
    expect(() =>
      buildDisplayBundle({
        appPath,
        appContent,
        sourceFiles: ['/nope.html'],
        fsEntries,
        flagContent: FLAG,
      }),
    ).toThrow(/\/nope\.html/)
  })

  it('throws naming the path when a listed entry is not valid UTF-8', () => {
    expect(() =>
      buildDisplayBundle({
        appPath,
        appContent,
        sourceFiles: ['/logo.png'],
        fsEntries,
        flagContent: FLAG,
      }),
    ).toThrow(/\/logo\.png/)
  })

  it('serialises to the payload shape the viewer reads', () => {
    const bundle = buildDisplayBundle({
      appPath,
      appContent,
      sourceFiles: [],
      fsEntries,
      flagContent: FLAG,
    })
    const parsed = JSON.parse(new TextDecoder().decode(bundle.bytes))
    expect(parsed).toEqual({ files: [{ path: 'app.py', content: appContent }] })
  })
})
