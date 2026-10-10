import { describe, it, expect } from 'vitest'
import { processChallengeFrontmatter } from '../../../.vitepress/challenge/plugin'

const BASE_FRONTMATTER = {
  title: 'Test Challenge',
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
