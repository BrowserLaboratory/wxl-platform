import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, symlinkSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { readPrimaryLocale, parsePrimaryLocale } from '../../../.vitepress/primary-locale'
import { DEFAULT_PRIMARY_LOCALE } from '../../../.vitepress/locales'
import { SiteLayoutError } from '../../../.vitepress/layout-error'

const PL_E01_LINE =
  'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'

describe('B1: no file gives the default primary locale', () => {
  it('readPrimaryLocale returns zh-TW when range.json does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
    try {
      const result = readPrimaryLocale(join(dir, 'range.json'))
      expect(result).toBe('zh-TW')
      expect(result).toBe(DEFAULT_PRIMARY_LOCALE)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('parsePrimaryLocale(undefined) also returns zh-TW', () => {
    expect(parsePrimaryLocale(undefined)).toBe('zh-TW')
  })
})

describe('B2: an object without an own primaryLocale gives zh-TW', () => {
  it('returns zh-TW for {}', () => {
    expect(parsePrimaryLocale('{}')).toBe('zh-TW')
  })

  it('returns zh-TW for an upstream-only object', () => {
    const text = JSON.stringify({
      upstream: {
        repository: 'example-org/example-range',
        version: '3.2.0',
        commit: '0123456789abcdef0123456789abcdef01234567',
      },
    })
    expect(parsePrimaryLocale(text)).toBe('zh-TW')
  })
})

describe('B3: "en" is read', () => {
  it('returns en for {"primaryLocale": "en"}', () => {
    expect(parsePrimaryLocale('{"primaryLocale": "en"}')).toBe('en')
  })
})

describe('B4: "zh-TW" is read', () => {
  it('returns zh-TW for {"primaryLocale": "zh-TW"}', () => {
    expect(parsePrimaryLocale('{"primaryLocale": "zh-TW"}')).toBe('zh-TW')
  })
})

describe('B5: a non-regular range.json is PL-E01 and a link is not followed', () => {
  it('throws PL-E01 for a directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
    try {
      const rangeJsonAsDir = join(dir, 'range.json')
      mkdirSync(rangeJsonAsDir)
      let error: unknown
      try {
        readPrimaryLocale(rangeJsonAsDir)
      } catch (err) {
        error = err
      }
      expect(error).toBeInstanceOf(SiteLayoutError)
      expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E01')
      expect((error as Error).message.split('\n')[0]).toBe(PL_E01_LINE)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it.skipIf(platform() === 'win32')(
    'throws PL-E01 for a symbolic link whose target does not exist (lstat, not stat) ' +
      '(skipped on win32: symlinkSync needs elevated privileges there by default)',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
      try {
        const link = join(dir, 'range.json')
        symlinkSync(join(dir, 'does-not-exist'), link)
        let error: unknown
        try {
          readPrimaryLocale(link)
        } catch (err) {
          error = err
        }
        expect(error).toBeInstanceOf(SiteLayoutError)
        expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E01')
        expect((error as Error).message.split('\n')[0]).toBe(PL_E01_LINE)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )

  it.skipIf(platform() === 'win32')(
    'throws PL-E01 for a FIFO (call returns without blocking) ' +
      '(skipped on win32: there is no mkfifo there)',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
      try {
        const fifo = join(dir, 'range.json')
        execFileSync('mkfifo', [fifo])
        let error: unknown
        try {
          readPrimaryLocale(fifo)
        } catch (err) {
          error = err
        }
        expect(error).toBeInstanceOf(SiteLayoutError)
        expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E01')
        expect((error as Error).message.split('\n')[0]).toBe(PL_E01_LINE)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )
})

describe('B6: a read failure other than ENOENT is PL-E02 with its errno', () => {
  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)(
    'throws PL-E02 (EACCES) for a mode 000 regular file',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
      try {
        const file = join(dir, 'range.json')
        writeFileSync(file, '{}')
        chmodSync(file, 0o000)
        let error: unknown
        try {
          readPrimaryLocale(file)
        } catch (err) {
          error = err
        }
        expect(error).toBeInstanceOf(SiteLayoutError)
        expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E02')
        expect((error as Error).message.split('\n')[0]).toBe(
          'PL-E02: range.json could not be read (EACCES).',
        )
      } finally {
        chmodSync(join(dir, 'range.json'), 0o644)
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )

  it('throws PL-E02 (ENOTDIR) when the parent path is a regular file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
    try {
      const parentFile = join(dir, 'not-a-dir')
      writeFileSync(parentFile, 'x')
      const path = join(parentFile, 'range.json')
      let error: unknown
      try {
        readPrimaryLocale(path)
      } catch (err) {
        error = err
      }
      expect(error).toBeInstanceOf(SiteLayoutError)
      expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E02')
      expect((error as Error).message.split('\n')[0]).toBe(
        'PL-E02: range.json could not be read (ENOTDIR).',
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('B7: text that is not JSON is PL-E03', () => {
  const cases: [string, Buffer][] = [
    ['empty file', Buffer.from('')],
    ['unbalanced', Buffer.from('{')],
    ['BOM-prefixed', Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])],
    ['commented', Buffer.from('// c\n{}')],
    ['trailing text', Buffer.from('{} x')],
  ]

  it.each(cases)('throws PL-E03 for %s', (_label, bytes) => {
    const dir = mkdtempSync(join(tmpdir(), 'wxl-primary-locale-'))
    try {
      const file = join(dir, 'range.json')
      writeFileSync(file, bytes)
      let error: unknown
      try {
        readPrimaryLocale(file)
      } catch (err) {
        error = err
      }
      expect(error).toBeInstanceOf(SiteLayoutError)
      expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E03')
      expect((error as Error).message.split('\n')[0]).toBe('PL-E03: range.json is not valid JSON.')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('B8: JSON that is not an object is PL-E04', () => {
  const cases: unknown[] = [null, [], 'en', 1, true]

  it.each(cases)('throws PL-E04 for %j', (value) => {
    let error: unknown
    try {
      parsePrimaryLocale(JSON.stringify(value))
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(SiteLayoutError)
    expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E04')
    expect((error as Error).message.split('\n')[0]).toBe('PL-E04: range.json does not hold a JSON object.')
  })
})

describe('B9: a non-string value is PL-E05 quoting the value', () => {
  const cases: [unknown, string][] = [
    [null, 'PL-E05: "primaryLocale" in range.json is not a string: null.'],
    [1, 'PL-E05: "primaryLocale" in range.json is not a string: 1.'],
    [true, 'PL-E05: "primaryLocale" in range.json is not a string: true.'],
    [['en'], 'PL-E05: "primaryLocale" in range.json is not a string: ["en"].'],
    [{}, 'PL-E05: "primaryLocale" in range.json is not a string: {}.'],
  ]

  it.each(cases)('throws the exact first line for %j', (value, expected) => {
    const text = JSON.stringify({ primaryLocale: value })
    let error: unknown
    try {
      parsePrimaryLocale(text)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(SiteLayoutError)
    expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E05')
    expect((error as Error).message.split('\n')[0]).toBe(expected)
  })
})

describe('B10: a string off the list is PL-E06, JSON-quoted (D140)', () => {
  const cases: [string, string][] = [
    ['ja', '"ja"'],
    ['', '""'],
    ['EN', '"EN"'],
    ['zh-tw', '"zh-tw"'],
    ['zh', '"zh"'],
    [' en', '" en"'],
    ['en\n', '"en\\n"'],
    ['\u001b[31m', '"\\u001b[31m"'],
    ['\u009b[31m', '"\\u009b[31m"'],
  ]

  it.each(cases)('throws the exact first line for %j', (value, quoted) => {
    const text = JSON.stringify({ primaryLocale: value })
    let error: unknown
    try {
      parsePrimaryLocale(text)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(SiteLayoutError)
    expect((error as InstanceType<typeof SiteLayoutError>).code).toBe('PL-E06')
    const firstLine = (error as Error).message.split('\n')[0]
    expect(firstLine).toBe(
      `PL-E06: "primaryLocale" in range.json is ${quoted}, which is not on the locale list: en, zh-TW.`,
    )
    for (const ch of firstLine) {
      expect(ch.codePointAt(0)!).toBeGreaterThanOrEqual(0x20)
    }
  })
})

describe('B11: other keys are not read', () => {
  it('returns zh-TW with an upstream of the wrong type and an unknown key', () => {
    expect(parsePrimaryLocale('{"upstream": 7, "primaryLocale": "zh-TW", "x": []}')).toBe('zh-TW')
  })

  it('returns zh-TW for an unknown key alone', () => {
    expect(parsePrimaryLocale('{"upstream": 7}')).toBe('zh-TW')
  })
})

describe('B12: a duplicated key keeps the last', () => {
  it('keeps the last primaryLocale value', () => {
    expect(parsePrimaryLocale('{"primaryLocale":"en","primaryLocale":"zh-TW"}')).toBe('zh-TW')
  })
})

describe('B13: only an own property counts', () => {
  it('ignores a __proto__-only primaryLocale', () => {
    expect(parsePrimaryLocale('{"__proto__":{"primaryLocale":"en"}}')).toBe('zh-TW')
  })
})
