import { describe, it, expect } from 'vitest'
import { processChallengeFrontmatter } from '../../../.vitepress/challenge/plugin'
import { detectLegacyFields } from '../../../.vitepress/challenge/plugin'

const BASE = {
  title: 'T',
  backend: 'flask' as const,
  app: 'app.py',
  fs: { '/flag.txt': 'FLAG{secret}', '/db': 'data' },
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
    expect(warnings).toHaveLength(4)
  })

  it('returns empty array when no legacy fields present', () => {
    const warnings = detectLegacyFields(BASE as Record<string, unknown>)
    expect(warnings).toHaveLength(0)
  })
})
