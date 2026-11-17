/**
 * challenge-numbers.ts
 *
 * A challenge's number: how it is read out of the tree, what makes one valid,
 * and what the next one is.
 *
 * The number is the identifier a printed handout names. A slug is what a
 * challenge is *called* and follows a rename; the number is what it *is* and
 * does not. Everything here exists to keep that promise: the number is written
 * down in frontmatter, never derived from an ordering, and never reused.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  NUMBER_PAD_WIDTH,
  isChallengeNumber,
  padChallengeNumber,
} from '../.vitepress/challenge/shortLink.ts'

// Re-exported so callers walking the tree get the number helpers from one
// import. The definitions live in `.vitepress/challenge/` because the site
// needs them too and cannot import anything that touches `node:fs`.
export { NUMBER_PAD_WIDTH, isChallengeNumber, padChallengeNumber }

/**
 * The locale trees a live challenge can appear in, keyed by the locale segment.
 * Kept only for `scripts/generate-redirects.ts`, which still imports it; the number
 * walk below no longer reads a locale tree (segment 4b removes this with the generator).
 */
export const CHALLENGE_TREES: ReadonlyArray<{ locale: string; segments: string[] }> = [
  { locale: 'root', segments: ['platform', 'challenge'] },
  { locale: 'zh-TW', segments: ['platform', 'zh-TW', 'challenge'] },
]

/** Where a live challenge's declaration lives: `platform/challenge/<slug>/challenge.yaml`. */
const LIVE_TREE: string[] = ['platform', 'challenge']

/** Retired challenges. They are not validated, but their numbers stay reserved. */
export const RETIRED_TREE: string[] = ['.archive', 'challenge']

export interface ChallengeNumberEntry {
  slug: string
  /** Whatever the declaration carried, unvalidated — `undefined` when the key is absent or the file unreadable. */
  value: unknown
  /** Repo-relative path of the declaration the value came from, for error messages. */
  path: string
}

export interface NumberCheckResult {
  label: string
  passed: boolean
  message: string
}

/** The `number` of one challenge declaration (`challenge.yaml`), unvalidated. */
export function readChallengeNumber(yamlPath: string): unknown {
  let doc: unknown
  try {
    doc = parseYaml(readFileSync(yamlPath, 'utf-8'))
  } catch {
    // An unreadable or malformed declaration carries no number; the number fault names the file.
    return undefined
  }
  if (typeof doc !== 'object' || doc === null) return undefined
  return (doc as Record<string, unknown>).number
}

/** The `number` frontmatter value of an old-layout retired page; kept until the retired walk is rewritten. */
function readLegacyRetiredNumber(mdPath: string): unknown {
  const raw = readFileSync(mdPath, 'utf-8')
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return undefined
  let fm: unknown
  try {
    fm = parseYaml(m[1])
  } catch {
    return undefined
  }
  if (typeof fm !== 'object' || fm === null) return undefined
  return (fm as Record<string, unknown>).number
}

/** The challenge directories under one tree that hold `file`, in directory order. */
function slugsUnder(dir: string, file: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(dir, d.name, file)))
    .map((d) => d.name)
    .sort()
}

/** Every live challenge's number: one entry per declaration file. Briefs are not read. */
export function collectChallengeNumbers(root: string): ChallengeNumberEntry[] {
  const dir = join(root, ...LIVE_TREE)
  return slugsUnder(dir, 'challenge.yaml').map((slug) => ({
    slug,
    value: readChallengeNumber(join(dir, slug, 'challenge.yaml')),
    path: [...LIVE_TREE, slug, 'challenge.yaml'].join('/'),
  }))
}

/**
 * The numbering faults, checked over a whole tree: presence and shape per
 * declaration, and uniqueness, which no single declaration shows, which is why
 * this takes the collected set rather than one path.
 */
export function checkChallengeNumbers(entries: ChallengeNumberEntry[]): NumberCheckResult[] {
  const results: NumberCheckResult[] = []

  // ── Presence and shape, one message per offending declaration ──────────────────
  const malformed = entries.filter((e) => !isChallengeNumber(e.value))
  if (malformed.length === 0) {
    results.push({ label: 'number', passed: true, message: `${entries.length} declaration(s) carry an integer number` })
  } else {
    for (const e of malformed) {
      const what = e.value === undefined
        ? 'has no `number` in its declaration'
        : `has number ${JSON.stringify(e.value)}, which is not an integer greater than zero`
      results.push({ label: 'number', passed: false, message: `${e.slug} (${e.path}) ${what}` })
    }
  }

  const bySlug = new Map<string, ChallengeNumberEntry[]>()
  for (const e of entries) {
    const list = bySlug.get(e.slug) ?? []
    list.push(e)
    bySlug.set(e.slug, list)
  }

  // ── Uniqueness across challenges ────────────────────────────────────────
  // Grouped by slug first: one challenge holds one number, however many entries name it.
  const slugOf = new Map<number, string[]>()
  for (const [slug, list] of bySlug) {
    const value = list.find((e) => isChallengeNumber(e.value))?.value
    if (!isChallengeNumber(value)) continue
    const holders = slugOf.get(value) ?? []
    holders.push(slug)
    slugOf.set(value, holders)
  }
  const duplicated = [...slugOf.entries()].filter(([, holders]) => holders.length > 1)
  if (duplicated.length === 0) {
    results.push({ label: 'number-unique', passed: true, message: 'every challenge number is held by one challenge' })
  } else {
    for (const [value, holders] of duplicated) {
      results.push({
        label: 'number-unique',
        passed: false,
        message: `number ${value} is held by more than one challenge: ${holders.sort().join(', ')}`,
      })
    }
  }

  return results
}

/**
 * The number to assign to the next challenge: one greater than every number
 * ever assigned, retired challenges included.
 *
 * Retired numbers stay in range on purpose. Reissuing one would send a link
 * already printed on a handout to a different challenge — the exact failure
 * numbering exists to prevent.
 */
export function nextChallengeNumber(root: string): number {
  const live = collectChallengeNumbers(root)
  const retiredDir = join(root, ...RETIRED_TREE)
  // A retired folder counts both shapes it can hold: a declaration and a legacy page.
  const retired: unknown[] = [
    ...slugsUnder(retiredDir, 'challenge.yaml').map((slug) =>
      readChallengeNumber(join(retiredDir, slug, 'challenge.yaml')),
    ),
    ...slugsUnder(retiredDir, 'index.md').map((slug) =>
      readLegacyRetiredNumber(join(retiredDir, slug, 'index.md')),
    ),
  ]
  const assigned = [...live.map((e) => e.value), ...retired].filter(isChallengeNumber)
  return assigned.length === 0 ? 1 : Math.max(...assigned) + 1
}
