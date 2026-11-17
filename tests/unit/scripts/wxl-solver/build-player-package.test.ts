import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildPlayerPackage,
  extractDescription,
} from '../../../../scripts/wxl-solver/build-player-package'
import { SiteLayoutError } from '../../../../.vitepress/layout-error'

const INDEX_BASIC = [
  '---',
  'title: Door Is Open',
  'tags: [ idor, fastapi ]',
  '---',
  '',
  '# Door Is Open',
  '',
  'FileHub is a simple file-sharing platform. Exploit the IDOR to read the admin\'s file.',
  '',
  '## Maintainer hint',
  '',
  'Internal note: vuln is the /download endpoint.',
  '',
].join('\n')

const INDEX_NO_BODY = [
  '---',
  'title: Empty',
  '---',
  '',
  '# Empty',
  '',
].join('\n')

const INDEX_MULTI_PARAGRAPH = [
  '---',
  'title: Multi',
  '---',
  '',
  '# Multi',
  '',
  'First paragraph that the player should see.',
  '',
  'Second paragraph — this one should be stripped.',
  '',
].join('\n')

describe('extractDescription (task 5.1)', () => {
  it('returns H1 + first paragraph, stripping later sections and hints', () => {
    const out = extractDescription(INDEX_BASIC)
    expect(out).toContain('# Door Is Open')
    expect(out).toContain('FileHub is a simple file-sharing platform')
    expect(out).not.toContain('Maintainer hint')
    expect(out).not.toContain('Internal note')
  })

  it('handles H1-only documents (no body paragraph)', () => {
    expect(extractDescription(INDEX_NO_BODY)).toBe('# Empty\n')
  })

  it('keeps only the first paragraph when several exist', () => {
    const out = extractDescription(INDEX_MULTI_PARAGRAPH)
    expect(out).toContain('First paragraph that the player should see.')
    expect(out).not.toContain('Second paragraph')
  })

  it('throws when no H1 heading is present', () => {
    const noH1 = '---\ntitle: X\n---\n\nJust prose, no heading.\n'
    expect(() => extractDescription(noH1)).toThrow(/H1/)
  })
})

const BRIEF_ZH = [
  '---',
  'title: 知的必要',
  'layout: challenge',
  '---',
  '',
  '# 知的必要',
  '',
  '檔案分享平台 FileHub。利用 IDOR 讀取管理員的檔案。',
  '',
  '## Maintainer hint',
  '',
  '內部備註：漏洞在 /download 端點。',
  '',
].join('\n')

const BRIEF_EN = [
  '---',
  'title: Need to Know',
  'layout: challenge',
  '---',
  '',
  '# Need to Know',
  '',
  'FileHub is a file-sharing platform. Exploit the IDOR to read the admin\'s file.',
  '',
  '## Maintainer hint',
  '',
  'Internal note: vuln is the /download endpoint.',
  '',
].join('\n')

// Y93: long, unique values that must not reach the package; the brief carries none of them.
const DECLARATION = [
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: zz_entry_module_9f3a.py',
  'flag: zz_flag_location_77c1.txt',
  'wasmModule: /challenge/door-is-open/runtime-zz5d2e9b.wasm',
  'source_files: [zz_models_layer_41aa.py, zz_routes_layer_8be0.py]',
  'source_visible: false',
  '',
].join('\n')
const DECLARATION_VALUES = [
  'zz_entry_module_9f3a.py',
  'zz_flag_location_77c1.txt',
  '/challenge/door-is-open/runtime-zz5d2e9b.wasm',
  'runtime-zz5d2e9b.wasm',
  'zz_models_layer_41aa.py',
  'zz_routes_layer_8be0.py',
]

// Messages as in 5a's Y36 table (the text is `.vitepress/primary-locale.ts`'s own).
const RANGE_FAULTS: Array<[string, (path: string) => void, string]> = [
  ['PL-E01 range.json is a folder', (p) => mkdirSync(p), 'PL-E01'],
  ['PL-E03 not valid JSON', (p) => writeFileSync(p, '{'), 'PL-E03'],
  ['PL-E04 not an object', (p) => writeFileSync(p, '[]'), 'PL-E04'],
  ['PL-E05 not a string', (p) => writeFileSync(p, '{"primaryLocale":7}'), 'PL-E05'],
  ['PL-E06 not on the list', (p) => writeFileSync(p, '{"primaryLocale":"ja"}'), 'PL-E06'],
]
const E02: [string, (path: string) => void, string] = [
  'PL-E02 mode 000',
  (p) => { writeFileSync(p, '{}'); chmodSync(p, 0o000) },
  'PL-E02',
]

const META = {
  base_url: 'http://localhost:5173/challenge/door-is-open/',
  flag_regex: '^(FLAG|CTF)\\{[^}]+\\}$',
  turn_budget: 30,
  verification_run_id: '2026-05-21T00:00:00Z',
}

describe('buildPlayerPackage (task 5.1)', () => {
  let projectRoot: string
  let workDir: string
  const zhBrief = () => join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md')
  const enBrief = () => join(projectRoot, 'platform', 'en', 'challenge', 'door-is-open', 'index.md')
  const build = () => buildPlayerPackage({ slug: 'door-is-open', projectRoot, workDir, meta: META })

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'bp-pkg-'))
    workDir = mkdtempSync(join(tmpdir(), 'bp-work-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'challenge.yaml'), DECLARATION)
    writeFileSync(join(slugDir, 'src', 'zz_entry_module_9f3a.py'), 'SECRET_VULN_CODE = "sqli pattern"')
    writeFileSync(join(slugDir, 'src', 'zz_flag_location_77c1.txt'), 'FLAG{door-is-open_abcdef12}')
    writeFileSync(join(slugDir, 'src', 'zz_models_layer_41aa.py'), '')
    writeFileSync(join(slugDir, 'src', 'zz_routes_layer_8be0.py'), '')
    mkdirSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(zhBrief(), BRIEF_ZH)
    mkdirSync(join(projectRoot, 'platform', 'en', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(enBrief(), BRIEF_EN)
  })

  afterEach(() => {
    try { chmodSync(join(projectRoot, 'range.json'), 0o600) } catch { /* absent or a folder */ }
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDir, { recursive: true, force: true })
  })

  it('writes exactly description.md + META.yaml under player-package/, and nothing else', () => {
    const paths = build()

    const files = readdirSync(paths.packageDir).sort()
    expect(files).toEqual(['META.yaml', 'description.md'])

    const description = readFileSync(paths.descriptionPath, 'utf8')
    expect(description).toContain('# 知的必要')
    expect(description).not.toContain('SECRET_VULN_CODE')
    expect(description).not.toContain('FLAG{')

    const meta = readFileSync(paths.metaPath, 'utf8')
    expect(meta).toContain('base_url: "http://localhost:5173/challenge/door-is-open/"')
    expect(meta).toContain('turn_budget: 30')
    expect(meta).toContain('verification_run_id: "2026-05-21T00:00:00Z"')
  })

  it('does not include any byte from src/ in the package', () => {
    const paths = build()
    const description = readFileSync(paths.descriptionPath, 'utf8')
    const meta = readFileSync(paths.metaPath, 'utf8')
    expect(description).not.toContain('SECRET_VULN_CODE')
    expect(meta).not.toContain('SECRET_VULN_CODE')
    expect(description).not.toMatch(/FLAG\{[^}]+\}(?!\$)/)
  })

  it.each([
    ['Y91 / Y110 absent: no range.json → the zh-TW brief', undefined, BRIEF_ZH, '# 知的必要\n\n檔案分享平台 FileHub。利用 IDOR 讀取管理員的檔案。\n', '# Need to Know'],
    ['Y91 / Y110 en: primaryLocale "en" → the en brief', '{"primaryLocale":"en"}', BRIEF_EN, '# Need to Know\n\nFileHub is a file-sharing platform. Exploit the IDOR to read the admin\'s file.\n', '# 知的必要'],
  ] as const)('%s', (_label, rangeJson, brief, literal, otherTitle) => {
    if (rangeJson !== undefined) writeFileSync(join(projectRoot, 'range.json'), rangeJson)
    const paths = build()
    const description = readFileSync(paths.descriptionPath, 'utf8')
    expect(description).toBe(extractDescription(brief))
    expect(description).toBe(literal)
    expect(description).not.toContain(otherTitle)
  })

  it('Y92: the primary locale brief absent (translation present) → PP1, nothing written', () => {
    rmSync(zhBrief())
    expect(() => build()).toThrow(
      new Error(`buildPlayerPackage: brief not found for slug door-is-open (${join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md')})`),
    )
    expect(readdirSync(workDir)).toEqual([])
  })

  it('Y93: the package holds no declaration value (wasmModule, app, flag, source_files)', () => {
    const paths = build()
    expect(readdirSync(paths.packageDir).sort()).toEqual(['META.yaml', 'description.md'])
    for (const file of [paths.descriptionPath, paths.metaPath]) {
      const text = readFileSync(file, 'utf8')
      for (const value of DECLARATION_VALUES) expect(text).not.toContain(value)
    }
  })

  it.each(RANGE_FAULTS)('Y110: %s → SiteLayoutError, output folder empty', (_label, make, code) => {
    make(join(projectRoot, 'range.json'))
    let err: unknown
    try { build() } catch (e) { err = e }
    expect(err).toBeInstanceOf(SiteLayoutError)
    expect((err as SiteLayoutError).code).toBe(code)
    expect(readdirSync(workDir)).toEqual([])
  })

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('Y110: PL-E02 mode 000 → SiteLayoutError, output folder empty', () => {
    E02[1](join(projectRoot, 'range.json'))
    let err: unknown
    try { build() } catch (e) { err = e }
    expect(err).toBeInstanceOf(SiteLayoutError)
    expect((err as SiteLayoutError).code).toBe(E02[2])
    expect(readdirSync(workDir)).toEqual([])
  })
})
