/**
 * challenge-lint-staged.ts
 *
 * Called by lint-staged with a list of staged file paths under platform/challenge/.
 * Derives affected challenge slugs, runs the full validator (challenge-validate.ts)
 * and analyzer (challenge-analyze.ts) on each, and exits with code 1 if any
 * issues are found (blocking the commit).
 *
 * Usage (via lint-staged):
 *   node --experimental-strip-types scripts/challenge-lint-staged.ts <file1> <file2> ...
 */

import { resolve } from 'node:path'
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

// ─── Slug derivation ────────────────────────────────────────────────────────

/**
 * Extract unique challenge slugs from a list of file paths.
 *
 * Supports:
 *   - Per-folder: platform/challenge/<slug>/...  → slug
 *   - Legacy:     platform/challenge/<slug>.md   → slug
 *
 * Paths not matching platform/challenge/ are ignored.
 */
export function deriveSlugs(filePaths: string[]): string[] {
  const slugs = new Set<string>()
  const challengePrefix = 'platform/challenge/'

  for (const filePath of filePaths) {
    // Normalise to forward slashes for cross-platform, then find the prefix
    const normalised = filePath.replace(/\\/g, '/')
    const idx = normalised.indexOf(challengePrefix)
    if (idx === -1) continue

    const rest = normalised.slice(idx + challengePrefix.length)
    if (!rest) continue

    // Per-folder: <slug>/...  or  Legacy: <slug>.md
    const slashPos = rest.indexOf('/')
    if (slashPos !== -1) {
      // Per-folder structure
      slugs.add(rest.slice(0, slashPos))
    } else if (rest.endsWith('.md')) {
      // Legacy flat file
      slugs.add(rest.replace(/\.md$/, ''))
    }
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
 * @param challengesDir  The platform/challenge directory (or equivalent for tests)
 * @param slugs          Challenge slugs to validate
 * @returns              Result with hasErrors flag and per-slug error details
 */
export function runLintStaged(challengesDir: string, slugs: string[]): LintStagedResult {
  const result: LintStagedResult = { hasErrors: false, errors: [] }

  for (const slug of slugs) {
    // ── Step 1: Full validation (challenge-validate.ts — 8 checks) ────
    const fullFiles = fullDiscover(challengesDir, slug)
    if (fullFiles.length === 0) {
      const slugDir = resolve(challengesDir, slug)
      if (existsSync(slugDir)) {
        // Directory exists but no index.md found — incomplete challenge
        result.hasErrors = true
        result.errors.push({ slug, messages: ['incomplete challenge (missing index.md)'] })
      } else {
        // Directory doesn't exist — whole challenge removed, skip validation
        console.error(`[pre-commit] ⊘ ${slug} (removed)`)
      }
      continue
    }

    const fullResult = fullValidate(fullFiles[0])
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
    const challenges = discoverChallenges(challengesDir, slug)
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
  const slugs = deriveSlugs(stagedFiles)

  if (slugs.length === 0) {
    process.exit(0)
  }

  // Use cwd — pre-commit hooks always run from the repo root
  const challengesDir = resolve(process.cwd(), 'platform', 'challenge')

  const result = runLintStaged(challengesDir, slugs)

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
