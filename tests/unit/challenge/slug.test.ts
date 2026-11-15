import { describe, it, expect } from 'vitest'
import { slugFromRelativePath } from '../../../.vitepress/challenge/slug'

describe('slugFromRelativePath (0010-S42)', () => {
  it.each([
    ['challenge/door-is-open/index.md', 'door-is-open'],
    ['en/challenge/door-is-open/index.md', 'door-is-open'],
    ['zh-TW/challenge/door-is-open/index.md', 'door-is-open'],
  ])('Y49: derives the slug from the per-folder relativePath %s', (relativePath, expected) => {
    expect(slugFromRelativePath(relativePath)).toBe(expected)
  })

  it('Y49: the flat <slug>.md branch is gone — no slug is derived from it', () => {
    expect(slugFromRelativePath('door-is-open.md')).not.toBe('door-is-open')
    expect(slugFromRelativePath('door-is-open.md')).toBeUndefined()
  })
})
