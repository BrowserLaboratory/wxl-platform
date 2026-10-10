import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildPlayerPackage,
  extractDescription,
} from '../../../../scripts/wxl-solver/build-player-package'

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

describe('buildPlayerPackage (task 5.1)', () => {
  let projectRoot: string
  let workDir: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'bp-pkg-'))
    workDir = mkdtempSync(join(tmpdir(), 'bp-work-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX_BASIC)
    writeFileSync(join(slugDir, 'src', 'app.py'), 'SECRET_VULN_CODE = "sqli pattern"')
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{door-is-open_abcdef12}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDir, { recursive: true, force: true })
  })

  it('writes exactly description.md + META.yaml under player-package/, and nothing else', () => {
    const paths = buildPlayerPackage({
      slug: 'door-is-open',
      projectRoot,
      workDir,
      meta: {
        base_url: 'http://localhost:5173/challenge/door-is-open/',
        flag_regex: '^(FLAG|CTF)\\{[^}]+\\}$',
        turn_budget: 30,
        verification_run_id: '2026-05-21T00:00:00Z',
      },
    })

    const files = readdirSync(paths.packageDir).sort()
    expect(files).toEqual(['META.yaml', 'description.md'])

    const description = readFileSync(paths.descriptionPath, 'utf8')
    expect(description).toContain('# Door Is Open')
    expect(description).not.toContain('SECRET_VULN_CODE')
    expect(description).not.toContain('FLAG{')

    const meta = readFileSync(paths.metaPath, 'utf8')
    expect(meta).toContain('base_url: "http://localhost:5173/challenge/door-is-open/"')
    expect(meta).toContain('turn_budget: 30')
    expect(meta).toContain('verification_run_id: "2026-05-21T00:00:00Z"')
  })

  it('does not include any byte from src/ in the package', () => {
    const paths = buildPlayerPackage({
      slug: 'door-is-open',
      projectRoot,
      workDir,
      meta: {
        base_url: 'http://localhost:5173/challenge/door-is-open/',
        flag_regex: '^(FLAG|CTF)\\{[^}]+\\}$',
        turn_budget: 30,
        verification_run_id: '2026-05-21T00:00:00Z',
      },
    })
    const description = readFileSync(paths.descriptionPath, 'utf8')
    const meta = readFileSync(paths.metaPath, 'utf8')
    expect(description).not.toContain('SECRET_VULN_CODE')
    expect(meta).not.toContain('SECRET_VULN_CODE')
    expect(description).not.toMatch(/FLAG\{[^}]+\}(?!\$)/)
  })
})
