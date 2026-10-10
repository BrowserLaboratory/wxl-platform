import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Two content loaders, one per locale tree, each mapping frontmatter onto the
// same `ChallengeData` shape. They are separate files that have to stay in
// step, and nothing structural makes them.
//
// This is not hypothetical: the short link shipped working on the root list and
// missing from the Traditional Chinese one, because `number` was added to
// `challenges.data.ts` and not to `challenges.zh-TW.data.ts`. Every unit test
// passed — the component was fine, the data never reached it. Only opening the
// built page showed it.
//
// A loader runs inside VitePress's build and cannot be imported here, so this
// reads the source. That is a weak instrument and it is used for one narrow
// claim: every field the shared interface declares is mentioned by both
// loaders. It cannot tell whether the mapping is correct.

const REPO_ROOT = resolve(__dirname, '../../..')
const SHARED = resolve(REPO_ROOT, 'platform/shared')

const LOADERS = ['challenges.data.ts', 'challenges.zh-TW.data.ts']

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
    expect(declaredFields().length).toBeGreaterThan(5)
  })

  it.each(LOADERS)('%s maps every field the shared interface declares', (loader) => {
    const src = readFileSync(resolve(SHARED, loader), 'utf8')
    const transform = src.slice(src.indexOf('transform('))
    for (const field of declaredFields()) {
      expect(transform, `${loader} never mentions "${field}"`).toContain(`${field}:`)
    }
  })

  it.each(LOADERS)('%s reads the number from frontmatter and never invents one', (loader) => {
    const src = readFileSync(resolve(SHARED, loader), 'utf8')
    expect(src).toContain('page.frontmatter.number')
    // `id` falls back to the position in the array. The number must not: a
    // position shifts when a challenge is added out of order or retired, and
    // `/c/003` would then name a different challenge than the handout does.
    expect(src).not.toMatch(/number:\s*[^\n]*\?\?\s*idx/)
  })
})
