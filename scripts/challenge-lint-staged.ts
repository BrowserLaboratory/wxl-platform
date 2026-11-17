/**
 * challenge-lint-staged.ts
 *
 * Called by lint-staged with a list of staged file paths. Those under platform/challenge/
 * (the declaration tree) and platform/<L>/challenge/<slug>/index.md for each listed locale L
 * (the briefs) name a challenge. Derives the affected slugs, runs the full validator
 * (challenge-validate.ts) and analyzer (challenge-analyze.ts) on each, and exits with code 1
 * if any issues are found (blocking the commit). The primary locale is read from the index's
 * range.json, not the working tree (D122); an unusable one ends the run with its PL line.
 *
 * Usage (via lint-staged), from the repository root:
 *   node --experimental-strip-types scripts/challenge-lint-staged.ts <file1> <file2> ...
 */

import { join } from 'node:path'
import { existsSync } from 'node:fs'
import {
  discoverChallenges,
  validateChallenge as analyzeValidate,
  analyzeChallenge,
} from './challenge-analyze.ts'
import {
  validateChallenge as fullValidate,
  discoverChallenges as fullDiscover,
} from './challenge-validate.ts'
import { LOCALES } from '../.vitepress/locales.ts'
import { SiteLayoutError } from '../.vitepress/layout-error.ts'
import { readIndexPrimaryLocale } from '../.vitepress/primary-locale.ts'

// ─── Slug derivation ────────────────────────────────────────────────────────

/**
 * Extract unique challenge slugs from a list of file paths (Y88, D122).
 *
 * Supports:
 *   - Declaration tree: platform/challenge/<slug>/...      -> slug
 *   - Brief:            platform/<L>/challenge/<slug>/index.md -> slug, for L in `locales` only (D127)
 *
 * Paths are matched anchored on a path segment, after backslash normalisation. Anything else
 * (an unlisted locale, a flat platform/challenge/<slug>.md, a guide page) is ignored.
 */
export function deriveSlugs(filePaths: string[], locales: readonly string[]): string[] {
  const slugs = new Set<string>()
  const escaped = locales.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const declaration = /(?:^|\/)platform\/challenge\/([^/]+)\/./
  const brief = new RegExp(`(?:^|/)platform/(?:${escaped.join('|')})/challenge/([^/]+)/index\\.md$`)

  for (const filePath of filePaths) {
    const normalised = filePath.replace(/\\/g, '/')
    const match = declaration.exec(normalised) ?? (locales.length > 0 ? brief.exec(normalised) : null)
    if (match) slugs.add(match[1])
  }

  return [...slugs]
}

// ─── Core validation logic ──────────────────────────────────────────────────

export interface LintStagedResult {
  hasErrors: boolean
  errors: Array<{ slug: string; messages: string[] }>
}

/**
 * Run full validation + analysis on a list of challenge slugs.
 *
 * @param root          The repository root (the directory holding `platform/`)
 * @param slugs          Challenge slugs to validate
 * @returns              Result with hasErrors flag and per-slug error details
 */
export function runLintStaged(root: string, slugs: string[]): LintStagedResult {
  const challengesDir = join(root, 'platform', 'challenge')
  // D122/D123: P is read once, from the index, before any slug is looked at
  const primary = readIndexPrimaryLocale(root)
  const result: LintStagedResult = { hasErrors: false, errors: [] }

  for (const slug of slugs) {
    // ── Step 1: Full validation (challenge-validate.ts — 8 checks) ────
    const slugDir = join(challengesDir, slug)
    if (existsSync(slugDir)) {
      // LS1: the directory exists but holds no challenge.yaml
      if (!existsSync(join(slugDir, 'challenge.yaml'))) {
        result.hasErrors = true
        result.errors.push({ slug, messages: ['incomplete challenge (missing challenge.yaml)'] })
        continue
      }
    } else if (fullDiscover(root, slug).length === 0) {
      // No directory and no brief — whole challenge removed, skip validation
      console.error(`[pre-commit] ⊘ ${slug} (removed)`)
      continue
    }
    // (A brief without a directory goes to validation, which reports it as VM1.)

    const fullResult = fullValidate(root, slug, primary)
    const failedChecks = fullResult.checks.filter((c) => !c.passed)
    if (failedChecks.length > 0) {
      result.hasErrors = true
      result.errors.push({
        slug,
        messages: failedChecks.map((c) => `${c.label}: ${c.message}`),
      })
      continue
    }

    // ── Step 2: Analysis (challenge-analyze.ts — warnings) ────────────
    const challenges = discoverChallenges(root, primary, slug)
    if (challenges.length === 0) continue

    const analysisResult = analyzeChallenge(challenges[0])
    if (analysisResult.warnings.length > 0) {
      result.hasErrors = true
      result.errors.push({ slug, messages: analysisResult.warnings })
      continue
    }
  }

  return result
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const stagedFiles = process.argv.slice(2)
  const slugs = deriveSlugs(stagedFiles, LOCALES)

  if (slugs.length === 0) {
    process.exit(0)
  }

  // Use cwd — pre-commit hooks always run from the repo root
  let result: LintStagedResult
  try {
    result = runLintStaged(process.cwd(), slugs)
  } catch (err) {
    // An unusable range.json ends the run with its PL line alone (D114, D123)
    if (err instanceof SiteLayoutError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  for (const err of result.errors) {
    console.error(`[pre-commit] ✗ ${err.slug}`)
    for (const msg of err.messages) {
      console.error(`  - ${msg}`)
    }
  }

  // Print success for slugs without errors
  const errorSlugs = new Set(result.errors.map((e) => e.slug))
  for (const slug of slugs) {
    if (!errorSlugs.has(slug)) {
      console.error(`[pre-commit] ✓ ${slug}`)
    }
  }

  process.exit(result.hasErrors ? 1 : 0)
}

// Only run main when executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('challenge-lint-staged.ts') ||
  process.argv[1].endsWith('challenge-lint-staged.js')
)
if (isDirectRun) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
