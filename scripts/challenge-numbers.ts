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

/** The locale trees a live challenge can appear in, keyed by the locale segment. */
export const CHALLENGE_TREES: ReadonlyArray<{ locale: string; segments: string[] }> = [
  { locale: 'root', segments: ['platform', 'challenge'] },
  { locale: 'zh-TW', segments: ['platform', 'zh-TW', 'challenge'] },
]

/** Retired challenges. They are not validated, but their numbers stay reserved. */
export const RETIRED_TREE: string[] = ['.archive', 'challenge']

export interface ChallengeNumberEntry {
  slug: string
  /** `root` or a locale segment such as `zh-TW`. */
  locale: string
  /** Whatever frontmatter carried, unvalidated — `undefined` when the key is absent. */
  value: unknown
  /** Repo-relative path of the page the value came from, for error messages. */
  path: string
}

export interface NumberCheckResult {
  label: string
  passed: boolean
  message: string
}

/** The `number` frontmatter value of one challenge page, unvalidated. */
export function readChallengeNumber(mdPath: string): unknown {
  const raw = readFileSync(mdPath, 'utf-8')
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return undefined
  let fm: unknown
  try {
    fm = parseYaml(m[1])
  } catch {
    // Malformed frontmatter is already a validation failure elsewhere; here it
    // simply carries no number.
    return undefined
  }
  if (typeof fm !== 'object' || fm === null) return undefined
  return (fm as Record<string, unknown>).number
}

/** The challenge directories under one tree, in directory order. */
function slugsUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(dir, d.name, 'index.md')))
    .map((d) => d.name)
    .sort()
}

/** Every live challenge page's number, across both locale trees. */
export function collectChallengeNumbers(root: string): ChallengeNumberEntry[] {
  const entries: ChallengeNumberEntry[] = []
  for (const tree of CHALLENGE_TREES) {
    const dir = join(root, ...tree.segments)
    for (const slug of slugsUnder(dir)) {
      const mdPath = join(dir, slug, 'index.md')
      entries.push({
        slug,
        locale: tree.locale,
        value: readChallengeNumber(mdPath),
        path: [...tree.segments, slug, 'index.md'].join('/'),
      })
    }
  }
  return entries
}

/**
 * The four numbering faults, checked over a whole tree.
 *
 * Presence and shape are per page; agreement across locales and uniqueness are
 * not visible from a single page at all, which is why this takes the collected
 * set rather than one path.
 */
export function checkChallengeNumbers(entries: ChallengeNumberEntry[]): NumberCheckResult[] {
  const results: NumberCheckResult[] = []

  // ── Presence and shape, one message per offending page ──────────────────
  const malformed = entries.filter((e) => !isChallengeNumber(e.value))
  if (malformed.length === 0) {
    results.push({ label: 'number', passed: true, message: `${entries.length} page(s) carry an integer number` })
  } else {
    for (const e of malformed) {
      const what = e.value === undefined
        ? 'has no `number` in its frontmatter'
        : `has number ${JSON.stringify(e.value)}, which is not an integer greater than zero`
      results.push({ label: 'number', passed: false, message: `${e.slug} (${e.path}) ${what}` })
    }
  }

  // ── Agreement across locale trees ───────────────────────────────────────
  const bySlug = new Map<string, ChallengeNumberEntry[]>()
  for (const e of entries) {
    const list = bySlug.get(e.slug) ?? []
    list.push(e)
    bySlug.set(e.slug, list)
  }
  const disagreeing = [...bySlug.entries()].filter(
    ([, list]) => new Set(list.map((e) => JSON.stringify(e.value))).size > 1,
  )
  if (disagreeing.length === 0) {
    results.push({ label: 'number-locales', passed: true, message: 'every challenge carries the same number in every locale' })
  } else {
    for (const [slug, list] of disagreeing) {
      const spelled = list.map((e) => `${e.locale}=${JSON.stringify(e.value)}`).join(', ')
      results.push({
        label: 'number-locales',
        passed: false,
        message: `${slug} carries different numbers across locale trees (${spelled})`,
      })
    }
  }

  // ── Uniqueness across challenges ────────────────────────────────────────
  // Grouped by slug first: the same challenge appearing in two locale trees is
  // one challenge holding one number, not two challenges colliding.
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
  const retired: unknown[] = slugsUnder(retiredDir).map((slug) =>
    readChallengeNumber(join(retiredDir, slug, 'index.md')),
  )
  const assigned = [...live.map((e) => e.value), ...retired].filter(isChallengeNumber)
  return assigned.length === 0 ? 1 : Math.max(...assigned) + 1
}
