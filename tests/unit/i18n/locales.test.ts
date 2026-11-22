import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { LOCALES, DEFAULT_PRIMARY_LOCALE, isKnownLocale, LOCALE_ENGLISH_NAMES } from '../../../.vitepress/locales'
import { otherLocale } from '../../../.vitepress/theme/i18n'

const REPO_ROOT = resolve(__dirname, '../../..')
const IS_GIT_CHECKOUT = existsSync(join(REPO_ROOT, '.git'))

describe('locale list module (B17)', () => {
  it('exports LOCALES in order', () => {
    expect(LOCALES).toEqual(['en', 'zh-TW'])
  })

  it('exports DEFAULT_PRIMARY_LOCALE as zh-TW and a member of LOCALES', () => {
    expect(DEFAULT_PRIMARY_LOCALE).toBe('zh-TW')
    expect(LOCALES).toContain(DEFAULT_PRIMARY_LOCALE)
  })

  it('isKnownLocale is true for en and zh-TW', () => {
    expect(isKnownLocale('en')).toBe(true)
    expect(isKnownLocale('zh-TW')).toBe(true)
  })

  it('isKnownLocale is false for EN, zh-tw, empty string, null and 1', () => {
    expect(isKnownLocale('EN')).toBe(false)
    expect(isKnownLocale('zh-tw')).toBe(false)
    expect(isKnownLocale('')).toBe(false)
    expect(isKnownLocale(null)).toBe(false)
    expect(isKnownLocale(1)).toBe(false)
  })

  it('exports LOCALE_ENGLISH_NAMES keyed exactly by LOCALES', () => {
    expect(LOCALE_ENGLISH_NAMES).toEqual({ en: 'English', 'zh-TW': 'Traditional Chinese' })
    expect(Object.keys(LOCALE_ENGLISH_NAMES).sort()).toEqual([...LOCALES].sort())
  })
})

// B18 (PAT1, traceability.md revision 2.3): no locale enumeration outside this module. Commands 1
// and 2 of PAT1, run from the repository root over tracked files of .vitepress and
// platform/shared; command 3 (object-key enumerations) is stage 6's.
describe.skipIf(!IS_GIT_CHECKOUT)('B18: no locale enumeration outside the locale-list module (PAT1)', () => {
  it('command 1 (KNOWN_LOCALES) prints nothing', () => {
    const res = spawnSync('git', ['grep', '-n', 'KNOWN_LOCALES', '--', '.vitepress', 'platform/shared'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    })
    expect(res.stdout.trim()).toBe('')
  })

  it('command 2 (union / array-of-two / comparison-chain enumerations): every line is in .vitepress/locales.ts', () => {
    const script = [
      'q="[\\"\']"',
      'c="${q}(en|zh-TW)${q}"',
      'git grep -nE "${c} *[|] *${c}|\\[ *${c} *, *${c} *\\]|[!=]== *${c} *[|][|] *[A-Za-z_\\$][A-Za-z0-9_\\$.]* *[!=]== *${c}" -- .vitepress platform/shared',
    ].join('; ')
    const res = spawnSync('bash', ['-c', script], { cwd: REPO_ROOT, encoding: 'utf-8' })
    const lines = res.stdout.split('\n').filter((line) => line.length > 0)
    for (const line of lines) {
      expect(line.startsWith('.vitepress/locales.ts:')).toBe(true)
    }
  })
})

describe('otherLocale reads the locale list (D4, D33)', () => {
  it('names, for every locale on the list, the other member of the list', () => {
    for (const code of LOCALES) {
      expect(otherLocale(code)).toBe(LOCALES.find((c) => c !== code))
    }
  })

  it('does not spell a locale code in its own body', () => {
    expect(otherLocale.toString()).not.toMatch(/['"](en|zh-TW)['"]/)
  })
})
