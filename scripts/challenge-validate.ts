/**
 * challenge-validate.ts
 *
 * CLI tool that validates challenge structure and frontmatter.
 *
 * Usage:
 *   pnpm challenge:validate              # validate all challenges
 *   pnpm challenge:validate door-is-open  # validate one challenge
 *
 * Exits with code 0 if all checks pass, 1 if any fail.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import {
  validateChallengeConfig,
  VALID_TOOLS,
  type BackendType,
} from '../.vitepress/challenge/config.ts'
import { parseFsIgnore } from './fsignore.ts'
import {
  isChallengeNumber,
  collectChallengeNumbers,
  checkChallengeNumbers,
} from './challenge-numbers.ts'
import { MIN_FLAG_LENGTH, FLAG_VALUE_SHAPE } from './challenge-source-display.ts'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CheckResult {
  label: string
  passed: boolean
  message: string
}

export interface ValidationResult {
  slug: string
  checks: CheckResult[]
  allPassed: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseMd(content: string): { fmRaw: string; body: string } | null {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return null
  return { fmRaw: m[1], body: m[2] }
}

const BACKEND_EXT_MAP: Record<BackendType, { ext: string; lang: string }> = {
  flask: { ext: '.py', lang: 'Python' },
  fastapi: { ext: '.py', lang: 'Python' },
  php: { ext: '.php', lang: 'PHP' },
}

// ─── Core validation function ───────────────────────────────────────────────

/**
 * Validate a single challenge by its markdown file path.
 *
 * @param mdPath  Absolute path to the challenge markdown file
 * @returns       Validation result with individual check outcomes
 */
export function validateChallenge(mdPath: string): ValidationResult {
  const filename = basename(mdPath)
  const slug = filename === 'index.md'
    ? basename(dirname(mdPath))
    : basename(mdPath, '.md')

  const isPerFolder = filename === 'index.md'
  const baseDir = dirname(mdPath)
  const checks: CheckResult[] = []

  // ── Check 1: Frontmatter exists and is parseable YAML ───────────────────
  const raw = readFileSync(mdPath, 'utf-8')
  const parsed = parseMd(raw)
  if (!parsed) {
    checks.push({ label: 'frontmatter', passed: false, message: 'no YAML frontmatter found' })
    return { slug, checks, allPassed: false }
  }

  let fm: Record<string, unknown>
  try {
    fm = parseYaml(parsed.fmRaw)
    if (typeof fm !== 'object' || fm === null) {
      throw new Error('frontmatter is not an object')
    }
  } catch (err) {
    checks.push({
      label: 'frontmatter',
      passed: false,
      message: `invalid YAML: ${(err as Error).message}`,
    })
    return { slug, checks, allPassed: false }
  }

  // ── Check 2: Required fields present (uses validateChallengeConfig) ─────
  try {
    validateChallengeConfig(fm)
    checks.push({ label: 'frontmatter', passed: true, message: 'valid YAML with required fields' })
  } catch (err) {
    checks.push({
      label: 'frontmatter',
      passed: false,
      message: (err as Error).message,
    })
    return { slug, checks, allPassed: false }
  }

  // ── Check 2b: Challenge number present and shaped ───────────────────────
  // The number is what a printed handout names, so it is checked on every
  // challenge rather than only on the ones a redirect rule happens to cover.
  // Agreement across locale trees and uniqueness across challenges are not
  // visible from a single page; they run once over the whole tree in main().
  const numberValue = fm.number
  if (isChallengeNumber(numberValue)) {
    checks.push({ label: 'number', passed: true, message: `number ${numberValue}` })
  } else if (numberValue === undefined) {
    checks.push({
      label: 'number',
      passed: false,
      message: 'no `number` in frontmatter; assign one greater than every number ever assigned',
    })
  } else {
    checks.push({
      label: 'number',
      passed: false,
      message: `number ${JSON.stringify(numberValue)} is not an integer greater than zero`,
    })
  }

  const backend = fm.backend as BackendType
  const app = fm.app as string

  // ── Check 3: Backend matches app file type ──────────────────────────────
  const expected = BACKEND_EXT_MAP[backend]
  if (expected && app.endsWith(expected.ext)) {
    checks.push({
      label: 'backend',
      passed: true,
      message: `${backend} \u2192 ${app} (${expected.lang})`,
    })
  } else if (expected) {
    checks.push({
      label: 'backend',
      passed: false,
      message: `${backend} expects ${expected.ext} file, got ${app}`,
    })
  }

  // ── Check 4: App file exists ────────────────────────────────────────────
  if (isPerFolder) {
    const appPath = resolve(baseDir, 'src', app)
    if (existsSync(appPath)) {
      checks.push({ label: 'app', passed: true, message: `src/${app} exists` })
    } else {
      checks.push({ label: 'app', passed: false, message: `src/${app} not found` })
    }
  } else {
    const appPath = resolve(baseDir, app)
    if (existsSync(appPath)) {
      checks.push({ label: 'app', passed: true, message: `${app} exists` })
    } else {
      checks.push({ label: 'app', passed: false, message: `${app} not found` })
    }
  }

  // ── Check 5: Flag file exists ───────────────────────────────────────────
  const flagRef = (fm.flag as string) ?? 'flag.txt'
  let resolvedFlagPath: string | null = null
  if (isPerFolder) {
    const flagPath = resolve(baseDir, 'src', flagRef)
    if (existsSync(flagPath)) {
      checks.push({ label: 'flag', passed: true, message: `src/${flagRef} exists` })
      resolvedFlagPath = flagPath
    } else {
      checks.push({ label: 'flag', passed: false, message: `src/${flagRef} not found` })
    }
  } else {
    // Legacy: check for /flag.txt in fs map
    const fsMap = (fm.fs ?? {}) as Record<string, string>
    const flagEntry = Object.keys(fsMap).find((vpath) => vpath === '/flag.txt')
    if (flagEntry) {
      const flagFile = fsMap[flagEntry]
      const flagPath = resolve(baseDir, flagFile)
      if (existsSync(flagPath)) {
        checks.push({ label: 'flag', passed: true, message: `${flagFile} exists (via fs map)` })
        resolvedFlagPath = flagPath
      } else {
        checks.push({ label: 'flag', passed: false, message: `${flagFile} not found (referenced in fs map)` })
      }
    } else {
      checks.push({ label: 'flag', passed: false, message: 'no /flag.txt entry in fs map' })
    }
  }

  // ── Check 5b: Flag content is long enough to redact by value ────────────
  // The white-box build replaces every occurrence of the flag's trimmed content in the
  // displayed source. Below MIN_FLAG_LENGTH that replace is as likely to hit ordinary
  // identifiers as the flag, and the build refuses; this check says so before the build.
  // Applied to every challenge, white-box or not, so a flag stays usable if the
  // challenge is later switched to white-box.
  if (resolvedFlagPath !== null) {
    const flagValue = readFileSync(resolvedFlagPath, 'utf-8').trim()
    const flagLength = flagValue.length
    if (flagLength >= MIN_FLAG_LENGTH) {
      checks.push({ label: 'flag-length', passed: true, message: `flag is ${flagLength} characters` })
    } else {
      checks.push({
        label: 'flag-length',
        passed: false,
        message: `flag is ${flagLength} characters; must be at least ${MIN_FLAG_LENGTH} so the white-box display copy can redact it by value`,
      })
    }
    // ── Check 5c: Flag is FLAG{...}/CTF{...} shaped ────────────────────────
    // Length alone lets `return request` through, and that string occurs in source. The
    // shape is what keeps the value criterion's substring replace off ordinary code.
    if (FLAG_VALUE_SHAPE.test(flagValue)) {
      checks.push({ label: 'flag-shape', passed: true, message: 'flag is FLAG{...}/CTF{...} shaped' })
    } else {
      checks.push({
        label: 'flag-shape',
        passed: false,
        message: 'flag is not FLAG{...} or CTF{...} shaped (one token, no braces or whitespace in the body); the white-box display copy cannot redact it by value',
      })
    }
  }

  // ── Check 6: tools values valid ─────────────────────────────────────────
  if (fm.tools !== undefined) {
    const tools = fm.tools as string[]
    const invalid = tools.filter((t) => !(VALID_TOOLS as readonly string[]).includes(t))
    if (invalid.length > 0) {
      checks.push({
        label: 'tools',
        passed: false,
        message: `invalid tool(s): ${invalid.join(', ')}`,
      })
    } else {
      // Show the tabs that actually render, so the injected browser is visible.
      // Word it the same way challenge:analyze does — the two must not drift.
      const rendered = VALID_TOOLS.filter((t) => t === 'browser' || tools.includes(t))
      checks.push({
        label: 'tools',
        passed: true,
        message: rendered.length === VALID_TOOLS.length ? 'all enabled' : `[${rendered.join(', ')}]`,
      })
    }
  } else {
    checks.push({
      label: 'tools',
      passed: true,
      message: 'not specified (default: browser, network, repeater, code)',
    })
  }

  // ── Check 7: .fsignore parseable ────────────────────────────────────────
  if (isPerFolder) {
    const fsIgnorePath = resolve(baseDir, 'src', '.fsignore')
    if (existsSync(fsIgnorePath)) {
      try {
        const content = readFileSync(fsIgnorePath, 'utf-8')
        parseFsIgnore(content)
        checks.push({ label: '.fsignore', passed: true, message: 'valid and parseable' })
      } catch (err) {
        checks.push({
          label: '.fsignore',
          passed: false,
          message: `parse error: ${(err as Error).message}`,
        })
      }
    } else {
      checks.push({ label: '.fsignore', passed: true, message: 'not present (using defaults)' })
    }
  } else {
    checks.push({ label: '.fsignore', passed: true, message: 'not applicable (legacy structure)' })
  }

  const allPassed = checks.every((c) => c.passed)
  return { slug, checks, allPassed }
}

// ─── Discovery ──────────────────────────────────────────────────────────────

/**
 * Discover all challenge markdown files.
 *
 * @param challengesDir  The platform/challenge directory
 * @param target         Optional slug to filter to a single challenge
 * @returns              Array of absolute paths to challenge .md files
 */
export function discoverChallenges(challengesDir: string, target?: string): string[] {
  if (!existsSync(challengesDir)) return []

  // New pattern: platform/challenge/<slug>/index.md
  const newPatternFiles = readdirSync(challengesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(challengesDir, d.name, 'index.md')))
    .filter((d) => !target || d.name === target)
    .map((d) => join(challengesDir, d.name, 'index.md'))

  // Legacy pattern: platform/challenge/<slug>.md (fallback)
  const legacyFiles = readdirSync(challengesDir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .filter((f) => {
      const slug = f.replace(/\.md$/, '')
      return !newPatternFiles.some((nf) => nf.includes(`/${slug}/index.md`))
    })
    .filter((f) => !target || f === `${target}.md`)
    .map((f) => join(challengesDir, f))

  return [...newPatternFiles, ...legacyFiles]
}

// ─── CLI output ─────────────────────────────────────────────────────────────

function printResult(result: ValidationResult): void {
  console.log(`Validating: ${result.slug}`)
  for (const check of result.checks) {
    const icon = check.passed ? '\u2713' : '\u2717'
    console.log(`  ${icon} ${check.label}: ${check.message}`)
  }
  if (result.allPassed) {
    console.log('  All checks passed.')
  } else {
    console.log('  Some checks FAILED.')
  }
  console.log()
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('-'))

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const root = resolve(__dirname, '..')
  const challengesDir = resolve(root, 'platform', 'challenge')

  const files = discoverChallenges(challengesDir, target)

  if (files.length === 0) {
    console.error(target ? `Challenge not found: ${target}` : 'No challenge files found')
    process.exit(1)
  }

  let allPassed = true
  for (const f of files) {
    const result = validateChallenge(f)
    printResult(result)
    if (!result.allPassed) allPassed = false
  }

  // ── Tree-wide numbering ─────────────────────────────────────────────────
  // Runs on a full validation only. Filtered to one challenge, the collected
  // set is one page and both cross-challenge checks would pass vacuously —
  // a green that says nothing.
  if (!target) {
    console.log('Validating: challenge numbering')
    const numbering = checkChallengeNumbers(collectChallengeNumbers(root))
    for (const check of numbering) {
      console.log(`  ${check.passed ? '\u2713' : '\u2717'} ${check.label}: ${check.message}`)
    }
    if (numbering.every((c) => c.passed)) {
      console.log('  All checks passed.')
    } else {
      console.log('  Some checks FAILED.')
      allPassed = false
    }
    console.log()
  }

  process.exit(allPassed ? 0 : 1)
}

// Only run main when executed directly (not when imported for testing)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('challenge-validate.ts') ||
  process.argv[1].endsWith('challenge-validate.js')
)
if (isDirectRun) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
