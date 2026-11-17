import { describe, it, expect } from 'vitest'
import { processChallengeFrontmatter } from '../../../.vitepress/challenge/plugin'
import { detectLegacyFields } from '../../../.vitepress/challenge/plugin'

const BASE = {
  title: 'T',
  layout: 'challenge',
  backend: 'flask' as const,
  app: 'app.py',
  fs: { '/flag.txt': 'FLAG{secret}', '/db': 'data' },
}

/** `obj` without `key`, so the field cannot itself satisfy `detectLegacyFields` — without leaving
 *  an unused destructured binding the way `const { fs, ...withoutFs } = BASE` would (D76). */
function omit<T extends Record<string, unknown>>(obj: T, key: string): Record<string, unknown> {
  const rest: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) if (k !== key) rest[k] = obj[k]
  return rest
}

describe('[RED] no sensitive data in ProcessedChallenge output', () => {
  it('output does not contain fs_key, fsKeyParts, encryptedFs, or flagVerifier', () => {
    const result = processChallengeFrontmatter(BASE)
    const serialised = JSON.stringify(result)
    expect(serialised).not.toContain('fsKeyParts')
    expect(serialised).not.toContain('encryptedFs')
    expect(serialised).not.toContain('flagVerifier')
    expect(serialised).not.toContain('fs_key')
  })
})

describe('detectLegacyFields', () => {
  it('detects all legacy fields when present', () => {
    const raw = { ...BASE, fs_key: 'x', fsKeyParts: [], encryptedFs: {}, flag_verifier: 'h' }
    const warnings = detectLegacyFields(raw)
    expect(warnings).toHaveLength(5)
    expect(warnings).toContain("deprecated field 'fs' found in frontmatter — this field is ignored and should be removed")
  })

  it('returns empty array when no legacy fields present', () => {
    const warnings = detectLegacyFields(omit(BASE, 'fs'))
    expect(warnings).toHaveLength(0)
  })
})
