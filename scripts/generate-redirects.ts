/**
 * generate-redirects.ts
 *
 * Produces `platform/public/_redirects` from the challenge tree.
 *
 * Usage:
 *   pnpm redirects:generate           # rewrite platform/public/_redirects
 *
 * The file used to be hand-edited. Nothing then kept it in step with the
 * challenge tree, and its contents are a public commitment — the paths in it
 * are printed on handouts. Generating it makes the tree the single source, and
 * `tests/unit/site/redirects-generated.test.ts` fails when the committed file
 * and the tree disagree.
 */

import { writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectChallengeNumbers,
  checkChallengeNumbers,
  padChallengeNumber,
  isChallengeNumber,
} from './challenge-numbers.ts'

/** The two parameterised rules. Unchanged by this change, and always last. */
const PARAMETERISED: ReadonlyArray<[string, string]> = [
  ['/c/:slug', '/challenge/:slug/'],
  ['/zh/c/:slug', '/zh-TW/challenge/:slug/'],
]

const STATUS = '302'

const HEADER = `# Cloudflare Pages redirect rules. This file is copied verbatim to the site root
# by VitePress (everything under platform/public/ lands in .vitepress/dist/).
#
# It has no effect under \`pnpm dev\` — the VitePress dev server does not read it.
# Test it with \`pnpm pages:dev\`, which serves the built output through the same
# Pages runtime that production uses.
#
# Syntax: <from> <to> <status>. \`:name\` captures one path segment and is
# substituted on the right. First matching rule wins, so put specific rules
# above general ones. Cloudflare caps this file at 2100 rules.
#
# GENERATED FILE — DO NOT EDIT BY HAND.
# Produced by \`pnpm redirects:generate\` from the challenge tree, and rewritten
# as part of \`pnpm build\`. A hand edit is reverted by the next build and fails
# tests/unit/site/redirects-generated.test.ts in the meantime.`

const NUMERIC_SECTION = `# Numbered short links, one pair per challenge. A number is assigned once and
# never reused, so a link printed on a handout keeps pointing at the same
# challenge even after the challenge is renamed.
#
# These come first on purpose: Cloudflare takes the first match and \`/c/:slug\`
# matches any single segment, a number included. A numeric rule placed after it
# would never run, and nothing about that would be visible at deploy time.`

const PARAMETERISED_SECTION = `# Slug short links for classroom use — students can be given /c/<slug> to type
# or paste rather than the full /challenge/<slug>/ path. Parameterised, so they
# follow a rename; the numbered rules above are what survives one.`

interface NumericRule {
  number: number
  from: string
  to: string
}

export interface GenerateOptions {
  /**
   * Which challenge slugs to include. Defaults to all of them.
   *
   * The escape hatch exists for one caller: the guard test that compares the
   * committed file with freshly generated content. Other test files scaffold a
   * throwaway challenge into the real `platform/challenge/` tree to exercise the
   * keygen CLI, and vitest runs test files in parallel — so the guard can
   * observe a directory that exists for a few hundred milliseconds and belongs
   * to nobody. Bounding it to what git tracks removes that race without
   * weakening the assertion: an unregenerated file is still caught the moment
   * the new challenge is staged, which is before it can be committed or built.
   */
  includeSlug?: (slug: string) => boolean
}

/**
 * The numeric rules the tree calls for, ordered by number.
 *
 * A challenge gets a Traditional Chinese rule only when it has a Traditional
 * Chinese page. Translation is optional by design — `redirects.test.ts` asserts
 * the subset direction and not equality — and emitting a rule whose target is
 * known not to exist would 302 a reader into a 404 while looking correct in the
 * file.
 */
function numericRules(root: string, options: GenerateOptions = {}): NumericRule[] {
  const include = options.includeSlug ?? (() => true)
  const entries = collectChallengeNumbers(root).filter((e) => include(e.slug))

  const failures = checkChallengeNumbers(entries).filter((c) => !c.passed)
  if (failures.length > 0) {
    throw new Error(
      'Cannot generate _redirects: the challenge tree is inconsistent.\n' +
        failures.map((f) => `  - ${f.message}`).join('\n'),
    )
  }

  const rules: NumericRule[] = []
  for (const entry of entries) {
    if (!isChallengeNumber(entry.value)) continue // unreachable: checked above
    const padded = padChallengeNumber(entry.value)
    rules.push(
      entry.locale === 'root'
        ? { number: entry.value, from: `/c/${padded}`, to: `/challenge/${entry.slug}/` }
        : { number: entry.value, from: `/zh/c/${padded}`, to: `/zh-TW/challenge/${entry.slug}/` },
    )
  }

  // By number, then root locale before the translation — the order a reader of
  // the file expects, and stable so a regeneration produces no spurious diff.
  return rules.sort((a, b) =>
    a.number !== b.number ? a.number - b.number : a.from.length - b.from.length,
  )
}

/** Lay the three fields out in columns, the way the hand-written file did. */
function formatRules(rows: ReadonlyArray<[string, string]>): string[] {
  const fromWidth = Math.max(...rows.map(([from]) => from.length))
  const toWidth = Math.max(...rows.map(([, to]) => to.length))
  return rows.map(([from, to]) => `${from.padEnd(fromWidth)}  ${to.padEnd(toWidth)}  ${STATUS}`)
}

/** The complete contents of `platform/public/_redirects` for a given repository root. */
export function generateRedirects(root: string, options: GenerateOptions = {}): string {
  const numeric = numericRules(root, options)
  const rows: Array<[string, string]> = [
    ...numeric.map((r) => [r.from, r.to] as [string, string]),
    ...PARAMETERISED.map(([from, to]) => [from, to] as [string, string]),
  ]
  const lines = formatRules(rows)
  const numericLines = lines.slice(0, numeric.length)
  const parameterisedLines = lines.slice(numeric.length)

  const blocks = [HEADER, '']
  if (numericLines.length > 0) blocks.push(NUMERIC_SECTION, ...numericLines, '')
  blocks.push(PARAMETERISED_SECTION, ...parameterisedLines, '')
  return blocks.join('\n')
}

/**
 * Rewrite `platform/public/_redirects`.
 *
 * Generation runs first and throws on an inconsistent tree, so a refusal leaves
 * whatever was on disk untouched rather than writing a partial file.
 */
export function writeRedirects(root: string, options: GenerateOptions = {}): string {
  const content = generateRedirects(root, options)
  const target = join(root, 'platform', 'public', '_redirects')
  writeFileSync(target, content, 'utf-8')
  return target
}

// ─── Main ───────────────────────────────────────────────────────────────────

const __filename_ = fileURLToPath(import.meta.url)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('generate-redirects.ts') ||
  process.argv[1].endsWith('generate-redirects.js')
)
if (isDirectRun) {
  const root = resolve(dirname(__filename_), '..')
  if (!existsSync(join(root, 'platform', 'public'))) {
    console.error(`platform/public not found under ${root}`)
    process.exit(1)
  }
  try {
    const target = writeRedirects(root)
    console.log(`✓ Wrote ${target}`)
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}
