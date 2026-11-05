import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Until spec 0008 there were two content loaders, one per locale tree, each mapping frontmatter
// onto the same `ChallengeData` shape, and they drifted: the short link shipped on the root list and
// not on the Traditional Chinese one, because `number` was added to one loader only. Every unit
// test passed; only the built page showed it.
//
// A loader runs inside VitePress's build and cannot be imported here, so this reads the source.
// Spec 0008 (overridden contract: one content loader per locale tree): both loaders now read both
// trees and hand every brief to one shared function, `mergeLocaleChallenges`, which applies the
// merge rules and is unit-tested on its own (merge-challenges.test.ts). What is left to check here,
// still from the source, is the wiring: each loader names both trees and passes its own locale,
// and the shared function maps every field the interface declares and never invents a number.

const REPO_ROOT = resolve(__dirname, '../../..')
const SHARED = resolve(REPO_ROOT, 'platform/shared')

const LOADERS = [
  ['challenges.data.ts', 'en'],
  ['challenges.zh-TW.data.ts', 'zh-TW'],
] as const

/** The property names `ChallengeData` declares. */
function declaredFields(): string[] {
  const src = readFileSync(resolve(SHARED, 'challenges.data.ts'), 'utf8')
  const body = src.slice(src.indexOf('export interface ChallengeData {'))
  const block = body.slice(0, body.indexOf('\n}'))
  return [...block.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])
}

describe('the challenge content loaders', () => {
  it('declares fields worth checking', () => {
    // Guards the parse above: a regex that stopped matching would make every
    // assertion below vacuous.
    expect(declaredFields()).toContain('number')
    expect(declaredFields()).toContain('locale')
    expect(declaredFields().length).toBeGreaterThan(5)
  })

  it.each(LOADERS)('%s reads both locale trees and merges them as the %s list', (loader, locale) => {
    const src = readFileSync(resolve(SHARED, loader), 'utf8')
    expect(src).toMatch(/createContentLoader\(\s*\[\s*'challenge\/\*\/index\.md',\s*'zh-TW\/challenge\/\*\/index\.md'\s*\]/)
    expect(src).toContain(`mergeLocaleChallenges(raw, '${locale}')`)
  })

  it('the shared merge maps every field the interface declares', () => {
    const src = readFileSync(resolve(SHARED, 'mergeChallenges.ts'), 'utf8')
    // The returned object literal only: the function's parameters (`locale`, `id`) would otherwise
    // match a field the literal dropped.
    const body = src.slice(src.indexOf('function toData('))
    const mapping = body.slice(body.indexOf('return {'), body.indexOf('\n  }\n'))
    for (const field of declaredFields()) {
      expect(mapping, `mergeChallenges.ts never maps "${field}"`).toMatch(new RegExp(`\\b${field}[,:]`))
    }
  })

  it('the shared merge reads the number from frontmatter and never invents one', () => {
    const src = readFileSync(resolve(SHARED, 'mergeChallenges.ts'), 'utf8')
    expect(src).toContain('fm.number')
    // `id` falls back to a position. The number must not: a position shifts when a challenge is
    // added out of order or retired, and `/c/003` would then name a different challenge than the
    // handout does. This guards only the old spelling of that mistake; the behaviour is
    // merge-challenges.test.ts's "never invent a number".
    expect(src).not.toMatch(/number:\s*[^\n]*\?\?\s*index/)
  })
})
