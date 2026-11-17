import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { processChallengeFrontmatter, assembleChallengeFrontmatter } from '../../../.vitepress/challenge/plugin'
import { readChallengeDeclaration } from '../../../.vitepress/challenge/declaration'
import { readPrimaryLocale } from '../../../.vitepress/primary-locale'
import { LOCALES as REAL_LOCALES } from '../../../.vitepress/locales'

const BASE_FRONTMATTER = {
  title: 'Test Challenge',
  layout: 'challenge',
  backend: 'flask' as const,
  app: './app.py',
  fs: { '/flag.txt': 'FLAG{test}' },
}


describe('processChallengeFrontmatter - simplified (no encryption)', () => {
  it('returns public metadata from frontmatter', () => {
    const result = processChallengeFrontmatter(BASE_FRONTMATTER)
    expect(result.title).toBe('Test Challenge')
    expect(result.backend).toBe('flask')
    expect(result.sourceVisible).toBe(false)
  })

  it('does NOT include encryptedFs, fsKeyParts, or flagVerifier', () => {
    const result = processChallengeFrontmatter(BASE_FRONTMATTER)
    const json = JSON.stringify(result)
    expect(json).not.toContain('encryptedFs')
    expect(json).not.toContain('fsKeyParts')
    expect(json).not.toContain('flagVerifier')
  })

  it('passes through wasmModule when present', () => {
    const result = processChallengeFrontmatter({ ...BASE_FRONTMATTER, wasmModule: '/challenge/test/runtime.wasm' })
    expect(result.wasmModule).toBe('/challenge/test/runtime.wasm')
  })
})

describe('processChallengeFrontmatter - validators', () => {
  it('throws when title is missing (a brief fault reaches processChallengeFrontmatter; pins the missing-title behaviour)', () => {
    const { title: _title, ...withoutTitle } = BASE_FRONTMATTER
    expect(() => processChallengeFrontmatter(withoutTitle)).toThrow('title must be a non-empty string')
  })

  it('throws when description is not a string (a brief fault reaches processChallengeFrontmatter)', () => {
    expect(() => processChallengeFrontmatter({ ...BASE_FRONTMATTER, description: 42 })).toThrow('description must be a string')
  })

  it('throws when app is not a string (validateChallengeDeclaration now checked)', () => {
    expect(() => processChallengeFrontmatter({ ...BASE_FRONTMATTER, app: 3 })).toThrow(/app must be a string/)
  })
})

describe('processChallengeFrontmatter - packages', () => {
  it('packages is passed through', () => {
    const result = processChallengeFrontmatter({ ...BASE_FRONTMATTER, packages: ['requests', 'pyjwt'] })
    expect(result.packages).toEqual(['requests', 'pyjwt'])
  })

  it('missing packages defaults to []', () => {
    const result = processChallengeFrontmatter(BASE_FRONTMATTER)
    expect(result.packages).toEqual([])
  })
})

describe('assembleChallengeFrontmatter (0010-S33)', () => {
  const LOCALES = ['en', 'zh-TW'] as const
  const noReadDeclaration = () => {
    throw new Error('readDeclaration should not be called for this page')
  }

  it.each([
    ['home', 'en/index.md', { layout: 'home', title: 'WXL' }],
    ['list', 'en/challenges.md', {}],
    ['guide', 'en/guide/intro.md', { layout: 'doc', title: 'Intro' }],
    ['reference', 'en/reference/x.md', {}],
  ])('Y48: returns null untouched for a %s page', (_kind, sourcePath, frontmatter) => {
    expect(
      assembleChallengeFrontmatter(sourcePath, frontmatter, '---\n---\nbody', noReadDeclaration, LOCALES),
    ).toBeNull()
  })

  it.each(['en', 'zh-TW'])('Y44 (locale folder %s; this seam takes no P): a brief path without layout: challenge throws PL-E17', (locale) => {
    const sourcePath = `${locale}/challenge/door-is-open/index.md`
    expect(() =>
      assembleChallengeFrontmatter(sourcePath, { title: 'Door Is Open' }, '---\n---\nbody', noReadDeclaration, LOCALES),
    ).toThrowError(`PL-E17: platform/${sourcePath}: a brief must set layout: challenge`)
  })

  it.each([
    ['en/guide/x.md', { layout: 'challenge' }],
    ['en/challenge/index.md', { layout: 'challenge' }],
    ['en/challenge/a/b/index.md', { layout: 'challenge' }],
    ['en/challenge/door-is-open.md', { layout: 'challenge' }],
  ])('Y45: layout: challenge at %s throws PL-E18', (sourcePath, frontmatter) => {
    expect(() =>
      assembleChallengeFrontmatter(sourcePath, frontmatter, '---\n---\nbody', noReadDeclaration, LOCALES),
    ).toThrowError(
      'PL-E18: platform/' + sourcePath + ': layout: challenge is only for platform/<locale>/challenge/<slug>/index.md',
    )
  })

  it('Y40: brief path, layout: challenge, no challenge.yaml, throws PL-E13', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const readDeclaration = () => ({ ok: false as const, reason: 'absent' as const, path: 'platform/challenge/door-is-open/challenge.yaml' })
    expect(() =>
      assembleChallengeFrontmatter(sourcePath, { layout: 'challenge', title: 'Door Is Open' }, '---\n---\nbody', readDeclaration, LOCALES),
    ).toThrowError(`PL-E13: platform/${sourcePath}: no platform/challenge/door-is-open/challenge.yaml for this brief`)
  })

  it.each(['multi-document', 'not-a-mapping', 'invalid-yaml'] as const)(
    'Y41: challenge.yaml with reason %s throws PL-E14',
    (reason) => {
      const sourcePath = 'en/challenge/door-is-open/index.md'
      const readDeclaration = () => ({ ok: false as const, reason, path: 'platform/challenge/door-is-open/challenge.yaml' })
      expect(() =>
        assembleChallengeFrontmatter(sourcePath, { layout: 'challenge', title: 'Door Is Open' }, '---\n---\nbody', readDeclaration, LOCALES),
      ).toThrowError(`PL-E14: platform/challenge/door-is-open/challenge.yaml: not one YAML mapping (${reason})`)
    },
  )

  it('Y42: a brief frontmatter key outside BRIEF_KEYS throws PL-E15 listing the keys in file order', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const readDeclaration = () => ({ ok: true as const, value: { backend: 'flask', app: 'app.py' } })
    expect(() =>
      assembleChallengeFrontmatter(
        sourcePath,
        { title: 'Door Is Open', number: 1, layout: 'challenge' },
        '---\n---\nbody',
        readDeclaration,
        LOCALES,
      ),
    ).toThrowError(`PL-E15: platform/${sourcePath}: a brief may carry only title, description and layout, found number`)
  })

  it('Y43: challenge.yaml with a brief key throws PL-E16 listing the keys', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const readDeclaration = () => ({
      ok: true as const,
      value: { backend: 'flask', app: 'app.py', title: 'Door Is Open' },
    })
    expect(() =>
      assembleChallengeFrontmatter(
        sourcePath,
        { title: 'Door Is Open', layout: 'challenge' },
        '---\n---\nbody',
        readDeclaration,
        LOCALES,
      ),
    ).toThrowError('PL-E16: platform/challenge/door-is-open/challenge.yaml: carries brief key(s) title')
  })

  it('Y47: an invalid backend or tools: [terminal] in challenge.yaml does not throw, assembled frontmatter unchanged', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const readDeclaration = () => ({
      ok: true as const,
      value: { backend: 'not-a-real-backend', app: 'app.py', tools: ['terminal'] },
    })
    const result = assembleChallengeFrontmatter(
      sourcePath,
      { title: 'Door Is Open', layout: 'challenge' },
      '---\n---\nbody',
      readDeclaration,
      LOCALES,
    )
    expect(result).toEqual({
      title: 'Door Is Open',
      layout: 'challenge',
      backend: 'not-a-real-backend',
      app: 'app.py',
      tools: ['terminal'],
      markdownBody: 'body',
    })
  })

  it('Y19: unknown declaration keys id, commands, author pass through unchanged', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const readDeclaration = () => ({
      ok: true as const,
      value: { backend: 'flask', app: 'app.py', id: 7, commands: [], author: 'x' },
    })
    const result = assembleChallengeFrontmatter(
      sourcePath,
      { title: 'Door Is Open', layout: 'challenge' },
      '---\n---\nbody',
      readDeclaration,
      LOCALES,
    )
    expect(result).toMatchObject({ id: 7, commands: [], author: 'x' })
  })

  it('Y113: __proto__ and constructor stay own keys, no prototype change', () => {
    const sourcePath = 'en/challenge/door-is-open/index.md'
    const pollutingValue = JSON.parse('{"backend":"flask","app":"app.py","__proto__":{"polluted":1},"constructor":"x"}')
    const readDeclaration = () => ({ ok: true as const, value: pollutingValue })
    const result = assembleChallengeFrontmatter(
      sourcePath,
      { title: 'Door Is Open', layout: 'challenge' },
      '---\n---\nbody',
      readDeclaration,
      LOCALES,
    ) as Record<string, unknown>
    expect(Object.hasOwn(result, '__proto__')).toBe(true)
    expect(Object.hasOwn(result, 'constructor')).toBe(true)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

// Y38 (0010-S33): every slug × every locale's brief on the real tree. Not upstream-only
// (AC-61): the slugs come from the tree, the primary locale's brief must exist for each, and the
// other locales' briefs are checked where the tree has them (a translation may be missing), so
// this holds in a range too.
describe('Y38: every slug × every brief the real tree holds (the primary locale\'s is required)', () => {
  const REPO_ROOT = resolve(__dirname, '../../..')
  const CHALLENGE_ROOT = resolve(REPO_ROOT, 'platform', 'challenge')
  const PRIMARY = readPrimaryLocale(resolve(REPO_ROOT, 'range.json'))

  function extractFrontmatter(raw: string): Record<string, unknown> {
    const m = raw.match(/^---\n([\s\S]*?)\n---/)
    return m ? (parseYaml(m[1]) as Record<string, unknown>) : {}
  }

  // Only a directory that actually carries a challenge.yaml is a declared slug (D78); any other
  // folder under platform/challenge/ (no challenge.yaml) is not one, by this same definition.
  const slugs = readdirSync(CHALLENGE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(CHALLENGE_ROOT, entry.name, 'challenge.yaml')))
    .map((entry) => entry.name)

  it('finds at least one challenge declaration on the tree', () => {
    expect(slugs.length).toBeGreaterThan(0)
  })

  it.each(slugs)('%s: assembled keys equal brief ∪ challenge.yaml ∪ markdownBody, same declaration projection across locales', (slug) => {
    const readDeclaration = (s: string) => readChallengeDeclaration(REPO_ROOT, s)
    const declResult = readDeclaration(slug)
    expect(declResult.ok).toBe(true)
    if (!declResult.ok) return
    const declKeys = Object.keys(declResult.value)
    const projections: Record<string, unknown>[] = []

    const briefPathOf = (locale: string) => resolve(REPO_ROOT, 'platform', locale, 'challenge', slug, 'index.md')
    expect(existsSync(briefPathOf(PRIMARY))).toBe(true)
    for (const locale of REAL_LOCALES.filter((l) => existsSync(briefPathOf(l)))) {
      const briefPath = briefPathOf(locale)
      const raw = readFileSync(briefPath, 'utf8')
      const frontmatter = extractFrontmatter(raw)
      const sourcePath = `${locale}/challenge/${slug}/index.md`
      const result = assembleChallengeFrontmatter(sourcePath, frontmatter, raw, readDeclaration, REAL_LOCALES) as Record<string, unknown>
      expect(new Set(Object.keys(result))).toEqual(new Set([...Object.keys(frontmatter), ...declKeys, 'markdownBody']))

      const projection: Record<string, unknown> = { ...result }
      for (const key of Object.keys(frontmatter)) delete projection[key]
      delete projection.markdownBody
      projections.push(projection)
    }

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i]).toEqual(projections[0])
    }
  })
})
