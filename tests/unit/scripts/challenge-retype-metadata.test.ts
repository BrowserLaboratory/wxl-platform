import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge } from '../../../scripts/challenge-retype'

// The declaration is challenge.yaml (D73): plain YAML, no frontmatter, no title/layout/description.
// This text is a fixed point of `toString({ lineWidth: 0 })`, so a whole-file byte comparison
// against `before.replace(...)` sees comments, key order and flow style.
const SAMPLE_DECLARATION = [
  '# the door challenge',
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
  'packages: []',
  'tools: [ browser, network, repeater, code ]',
  'source_visible: false',
  'date: 2026-04-02T08:54:17.674Z',
  'tags: [ idor, access-control, fastapi, sqlite ]',
  'wasmModule: /challenge/door-is-open/runtime.wasm',
  '',
].join('\n')

const BRIEF_ZH = '---\ntitle: 知的必要\nlayout: challenge\ndescription: 說明\n---\n\n# 知的必要\n'
const BRIEF_EN = '---\ntitle: Need to Know\nlayout: challenge\ndescription: About\n---\n\n# Need to Know\n'

describe('retypeChallenge — declaration-only mutations', () => {
  let projectRoot: string
  let slugDir: string
  let declarationPath: string
  let zhBrief: string
  let enBrief: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-meta-'))
    slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    declarationPath = join(slugDir, 'challenge.yaml')
    writeFileSync(declarationPath, SAMPLE_DECLARATION)
    writeFileSync(join(slugDir, 'src', 'app.py'), 'from fastapi import FastAPI\napp = FastAPI()\n')
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')
    zhBrief = join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md')
    enBrief = join(projectRoot, 'platform', 'en', 'challenge', 'door-is-open', 'index.md')
    mkdirSync(join(zhBrief, '..'), { recursive: true })
    mkdirSync(join(enBrief, '..'), { recursive: true })
    writeFileSync(zhBrief, BRIEF_ZH)
    writeFileSync(enBrief, BRIEF_EN)
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  /** Both briefs are byte-identical and no index.md appeared beside the declaration (Y62). */
  function expectBriefsAndFolderUntouched(): void {
    expect(readFileSync(zhBrief, 'utf8')).toBe(BRIEF_ZH)
    expect(readFileSync(enBrief, 'utf8')).toBe(BRIEF_EN)
    expect(readdirSync(slugDir).sort()).toEqual(['challenge.yaml', 'src'])
  }

  it('Y62: --difficulty changes only that line of challenge.yaml, byte for byte', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', difficulty: 'hard' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    expect(readFileSync(declarationPath, 'utf8')).toBe(
      SAMPLE_DECLARATION.replace('difficulty: easy', 'difficulty: hard'),
    )
    expectBriefsAndFolderUntouched()
  })

  it('Y62: --tags replaces the tags and leaves every other line alone', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', tags: ['sqli', 'flask'] },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    const after = readFileSync(declarationPath, 'utf8')
    expect(after).toMatch(/tags:\s*\n\s*-\s*sqli\n\s*-\s*flask/)
    expect(after).not.toContain('idor')
    // Everything outside the tags entry is unchanged.
    const outsideTags = (text: string): string[] =>
      text.split('\n').filter((line) => !/^tags:|^\s+-\s/.test(line))
    expect(outsideTags(after)).toEqual(outsideTags(SAMPLE_DECLARATION.replace(/^tags:.*\n/m, '')))
    // The tags entry itself stays where it was: the whole file differs from the sample in that entry only.
    expect(after).toBe(
      SAMPLE_DECLARATION.replace('tags: [ idor, access-control, fastapi, sqlite ]', 'tags:\n  - sqli\n  - flask'),
    )
    expectBriefsAndFolderUntouched()
  })

  it('Y62: --category changes only that line of challenge.yaml, byte for byte', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', category: 'pwn' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    expect(readFileSync(declarationPath, 'utf8')).toBe(
      SAMPLE_DECLARATION.replace('category: web', 'category: pwn'),
    )
    expectBriefsAndFolderUntouched()
  })

  it('Y62: several flags in one invocation change just those entries', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', difficulty: 'medium', category: 'crypto' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    expect(readFileSync(declarationPath, 'utf8')).toBe(
      SAMPLE_DECLARATION.replace('difficulty: easy', 'difficulty: medium').replace('category: web', 'category: crypto'),
    )
    expectBriefsAndFolderUntouched()
  })

  // Y65: a brief is not read by retype. A stray `backend` key, or frontmatter that does not even
  // parse, changes nothing (the validator reports such a brief; retype does not look).
  it.each([
    ['a primary-locale brief carrying backend: php', '---\ntitle: 知的必要\nbackend: php\n---\n'],
    ['a primary-locale brief whose frontmatter does not parse', '---\ntitle: 知的必要\nbackend: [flask\n---\n'],
  ])('Y65: %s changes nothing for --difficulty and --backend flask', (_label, brief) => {
    writeFileSync(zhBrief, brief)
    const beforeEn = readFileSync(enBrief, 'utf8')

    const difficulty = retypeChallenge({ slug: 'door-is-open', difficulty: 'hard' }, { projectRoot })
    expect(difficulty.exitCode).toBe(0)
    expect(readFileSync(declarationPath, 'utf8')).toBe(
      SAMPLE_DECLARATION.replace('difficulty: easy', 'difficulty: hard'),
    )

    const keygenSlugs: string[] = []
    const backend = retypeChallenge(
      { slug: 'door-is-open', backend: 'flask' },
      { projectRoot, runKeygen: (slug) => { keygenSlugs.push(slug) } },
    )
    expect(backend.exitCode).toBe(0)
    expect(backend.message).toBe('✓ Mutated door-is-open: backend fastapi → flask')
    expect(readFileSync(declarationPath, 'utf8')).toBe(
      SAMPLE_DECLARATION.replace('difficulty: easy', 'difficulty: hard').replace('backend: fastapi', 'backend: flask'),
    )
    expect(keygenSlugs).toEqual(['door-is-open'])

    expect(readFileSync(zhBrief, 'utf8')).toBe(brief)
    expect(readFileSync(enBrief, 'utf8')).toBe(beforeEn)
  })
})
