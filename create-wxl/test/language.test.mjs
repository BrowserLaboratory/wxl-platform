// T-0024: the language rule (traceability.md "Language") and the two message tables (AC-18).

import { describe, it, expect } from 'vitest'
import { rm } from 'node:fs/promises'
import { run } from '../src/run.mjs'
import { makeDeps } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { en, zhTW, messages } from '../src/messages.mjs'

const CJK_RE = /[㐀-鿿豈-﫿]/

/** Strips every `CW-Exx`/`CW-Wxx` code, then reports whether any CJK character remains: the
 * approved plan's own rule for telling which table answered (T-0024 ticket Notes). */
function looksZhTW(text) {
  return CJK_RE.test(text.replace(/CW-[EW]\d\d/g, ''))
}

async function runCase(overrides, argv = []) {
  const tmpRoot = await makeTmpRoot()
  try {
    const deps = makeDeps({ cwd: tmpRoot, ...overrides })
    const ioHelper = makeIo()
    const exitCode = await run(argv, ioHelper.io, deps)
    return { exitCode, stderrText: ioHelper.stderrText }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true })
  }
}

describe('language selection', () => {
  it.each([
    ['--lang zh-TW, env empty, locale en-US -> zh-TW', { lang: 'zh-TW' }, { env: {}, locale: 'en-US' }],
    ['LC_ALL=zh_TW.UTF-8, locale en-US -> zh-TW', {}, { env: { LC_ALL: 'zh_TW.UTF-8' }, locale: 'en-US' }],
    ['LANG=en_US, locale zh-Hant-TW -> en', {}, { env: { LANG: 'en_US' }, locale: 'zh-Hant-TW' }],
    ['env unset, locale zh-Hant-TW -> zh-TW', {}, { env: {}, locale: 'zh-Hant-TW' }],
    ['LANG=C, locale zh-Hant-TW -> en', {}, { env: { LANG: 'C' }, locale: 'zh-Hant-TW' }],
    ['--lang zh-TW, LANG=en_US -> zh-TW (an extra ordering case)', { lang: 'zh-TW' }, { env: { LANG: 'en_US' } }],
    [
      'LC_ALL empty, LC_MESSAGES=zh_TW, LANG=en_US -> zh-TW (empty counts as unset)',
      {},
      { env: { LC_ALL: '', LC_MESSAGES: 'zh_TW', LANG: 'en_US' } },
    ],
  ])('%s', async (label, flagOverrides, depOverrides) => {
    const env = { LANG: undefined, ...depOverrides.env }
    const { exitCode, stderrText } = await runCase(
      { ...depOverrides, env },
      flagOverrides.lang ? ['--lang', flagOverrides.lang, '--no-setup'] : ['--no-setup'],
    )
    // No directory, non-interactive: always CW-E03, so every case lands on the same message id
    // and only the language differs.
    expect(exitCode).toBe(1)
    expect(stderrText).toMatch(/^CW-E03/m)
    // Derive the expectation straight from the row label's own "-> zh-TW"/"-> en" suffix.
    const wantsZhTW = label.includes('-> zh-TW')
    expect(looksZhTW(stderrText)).toBe(wantsZhTW)
  })

  it('C41 sixth case: --lang zh-TW is ignored for CW-E02 (env-only rule) too; --bogus, LANG=en_US -> CW-E02 in en', async () => {
    const { exitCode, stderrText } = await runCase(
      { env: { LANG: 'en_US' } },
      ['--lang', 'zh-TW', '--bogus', '--no-setup'],
    )
    expect(exitCode).toBe(1)
    expect(stderrText).toMatch(/^CW-E02/m)
    expect(looksZhTW(stderrText)).toBe(false)
  })

  it('AC-18: --lang zh-TW is ignored for CW-E01 (env-only rule); nodeVersion 22.5.0, LANG=en_US -> CW-E01 in en', async () => {
    const { exitCode, stderrText } = await runCase(
      { env: { LANG: 'en_US' }, nodeVersion: '22.5.0' },
      ['--lang', 'zh-TW', '--no-setup'],
    )
    expect(exitCode).toBe(1)
    expect(stderrText).toMatch(/^CW-E01/m)
    expect(looksZhTW(stderrText)).toBe(false)
  })
})

describe('message tables', () => {
  it('en and zh-TW have the same id set, sorted', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhTW).sort())
  })

  it('this ticket\'s new ids (CW-E09, CW-E11, CW-E14, CW-W05) are present in both tables', () => {
    for (const id of ['CW-E09', 'CW-E11', 'CW-E14', 'CW-W05']) {
      expect(en[id]).toBeTypeOf('function')
      expect(zhTW[id]).toBeTypeOf('function')
    }
  })

  // Representative arguments for every message id this table defines (needed to call each and
  // compare the rendered text): a conservative shape that satisfies every id's destructuring.
  const ARGS = {
    running: '22.5.0',
    minimum: '22.6.0',
    value: 'x',
    usage: false,
    reason: 'unknown',
    path: '/a/b',
    conditionId: 'file',
    detail: 'd',
    missing: ['author'],
    message: 'm',
    url: 'https://x',
    rule: 1,
    parseError: undefined,
    isCommentMarker: false,
    file: 'CHANGELOG.md',
    target: '/a/b',
    stranded: [],
    tmpDir: '/a/.create-wxl-x',
    directory: 'd',
    argv: ['--author=A'],
    version: '1.0.0',
    remainingCommands: ['git init'],
    command: 'git add -A',
    commit: '0123456789abcdef0123456789abcdef01234567',
    origin: 'https://x',
    owner: 'o',
    name: 'n',
  }

  /** Each CW message removed of its code, placeholders, backtick-quoted commands/paths, and URLs
   * (the approved comparison rule): what remains must differ between the two languages. */
  function stripForComparison(text) {
    return text
      .replace(/CW-[EW]\d\d[:：]?/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '')
      .replace(/\s+/g, '')
  }

  // CW-E07's `detail` is a structured object, not the plain string every other id's `detail` is.
  const ARGS_OVERRIDES = {
    'CW-E07': { ...ARGS, detail: { kind: 'error', message: 'm' } },
  }
  function argsFor(id) {
    return ARGS_OVERRIDES[id] ?? ARGS
  }

  it('every id text differs between en and zh-TW outside commands, paths, codes and placeholders', () => {
    for (const id of Object.keys(en)) {
      const enText = en[id](argsFor(id))
      const zhText = zhTW[id](argsFor(id))
      const enStripped = stripForComparison(enText)
      const zhStripped = stripForComparison(zhText)
      expect(enStripped).not.toBe('')
      expect(zhStripped).not.toBe('')
      expect(enStripped).not.toBe(zhStripped)
    }
  })

  it('every line in either table containing a CW code starts with that code', () => {
    for (const table of [en, zhTW]) {
      for (const id of Object.keys(table)) {
        const text = table[id](argsFor(id))
        for (const line of text.split('\n')) {
          const match = line.match(/CW-[EW]\d\d/)
          if (match) expect(line.startsWith(match[0])).toBe(true)
        }
      }
    }
  })

  // (P-11/S-12) AC-18 "every CW message begins with its code": the check above only catches a
  // WRONG code at the front of a line; it does not catch a CW message that forgot to print its
  // own code at all (no line would match `/CW-[EW]\d\d/`, so the loop above finds nothing to
  // complain about). Every CW-Exx/CW-Wxx id is checked explicitly here instead.
  // (S-32) Each of this ticket's new branches gets its own en/zh-TW comparison: the single
  // representative ARGS above only exercises ONE branch per id (e.g. CW-E11 with an EMPTY
  // `stranded`, CW-W05 with a NON-empty `remainingCommands`), so a branch that is translated in
  // only one language, or not at all, could still pass that check.
  it('CW-E11 with stranded entries differs between en and zh-TW outside commands/paths/codes', () => {
    const strandedArgs = { target: '/t', detail: 'd', stranded: ['a', 'b'], tmpDir: '/t/.create-wxl-x' }
    const enText = en['CW-E11'](strandedArgs)
    const zhText = zhTW['CW-E11'](strandedArgs)
    expect(stripForComparison(enText)).not.toBe(stripForComparison(zhText))
  })

  it('CW-E14 WITH remainingCommands differs between en and zh-TW outside commands/paths/codes', () => {
    const args = { message: 'm', remainingCommands: ['git init'] }
    expect(stripForComparison(en['CW-E14'](args))).not.toBe(stripForComparison(zhTW['CW-E14'](args)))
  })

  it('CW-E14 WITHOUT remainingCommands differs between en and zh-TW outside commands/paths/codes', () => {
    const args = { message: 'm', remainingCommands: undefined }
    expect(stripForComparison(en['CW-E14'](args))).not.toBe(stripForComparison(zhTW['CW-E14'](args)))
  })

  it('CW-W05 with an EMPTY remainingCommands (the range is complete) differs between en and zh-TW', () => {
    const args = { remainingCommands: [] }
    expect(stripForComparison(en['CW-W05'](args))).not.toBe(stripForComparison(zhTW['CW-W05'](args)))
  })

  it('CW-E02 bad-env WITH a badValue differs between en and zh-TW outside commands/paths/codes', () => {
    const args = { value: 'CREATE_WXL_COMMIT', usage: false, reason: 'bad-env', badValue: 'abc\u007f' }
    expect(stripForComparison(en['CW-E02'](args))).not.toBe(stripForComparison(zhTW['CW-E02'](args)))
  })

  it('the withheld control-character notice (N1) differs between en and zh-TW outside commands/paths/codes', () => {
    const args = { directory: 'r\u001bx' }
    expect(stripForComparison(en['N1'](args))).not.toBe(stripForComparison(zhTW['N1'](args)))
  })

  it('every CW-E01..E15 and CW-W01..W05 id actually starts with its own code, in both tables', () => {
    const ids = [...Array.from({ length: 15 }, (_, i) => `CW-E${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 5 }, (_, i) => `CW-W${String(i + 1).padStart(2, '0')}`)]
    for (const id of ids) {
      expect(en[id], `en[${id}] is missing`).toBeTypeOf('function')
      expect(zhTW[id], `zhTW[${id}] is missing`).toBeTypeOf('function')
      expect(en[id](argsFor(id)).startsWith(id), `en.${id} does not start with its own code`).toBe(true)
      expect(zhTW[id](argsFor(id)).startsWith(id), `zhTW.${id} does not start with its own code`).toBe(true)
    }
  })
})
