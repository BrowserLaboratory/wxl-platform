/**
 * challenge-validate.ts
 *
 * CLI tool that validates each challenge's declaration, briefs and directory.
 *
 * A challenge is `platform/challenge/<slug>/{challenge.yaml,src/}` plus one brief per locale at
 * `platform/<locale>/challenge/<slug>/index.md`. The command reads range.json, then checks the
 * source layout (PL-E07..PL-E10), then validates the declaration once and every brief that exists
 * in a listed locale; the primary locale's brief is required (VM10).
 *
 * Usage:
 *   pnpm challenge:validate              # validate all challenges
 *   pnpm challenge:validate door-is-open  # validate one challenge
 *
 * Exits with code 0 if all checks pass, 1 if any fail.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument, visit, isScalar, type Pair } from 'yaml'
import { readChallengeDeclaration, type DeclarationReason } from '../.vitepress/challenge/declaration.ts'
import {
  VALID_TOOLS,
  BRIEF_KEYS,
  validateChallengeDeclaration,
  validateChallengeBrief,
  type BackendType,
} from '../.vitepress/challenge/config.ts'
import { readPrimaryLocale } from '../.vitepress/primary-locale.ts'
import { LOCALES } from '../.vitepress/locales.ts'
import { checkSourceLayout } from '../.vitepress/source-layout.ts'
import { SiteLayoutError } from '../.vitepress/layout-error.ts'
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

// ─── YAML parsing for validate's messages (D129) ───────────────────────────────────────────

const YAML_OPTIONS = { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false } as const

const NON_SCALAR_KEY_TEXT = 'a mapping key is not a scalar'

type YamlOutcome = { ok: true; value: unknown } | { ok: false; message: string }

/** `yaml`'s parse of `src` with the declaration reader's options (D129), reporting the first
 *  problem's text instead of the reader's bare reason. */
function parseYamlStrict(src: string): YamlOutcome {
  const doc = parseDocument(src, YAML_OPTIONS)
  const first = doc.errors[0] ?? doc.warnings[0]
  if (first) return { ok: false, message: first.message }
  let nonScalarKey = false
  visit(doc, {
    Pair(_, pair: Pair) {
      if (!isScalar(pair.key)) {
        nonScalarKey = true
        return visit.BREAK
      }
    },
  })
  if (nonScalarKey) return { ok: false, message: NON_SCALAR_KEY_TEXT }
  try {
    return { ok: true, value: doc.toJS({ maxAliasCount: 100 }) }
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }
}

function declarationFailureMessage(reason: DeclarationReason, slug: string, path: string): string {
  switch (reason) {
    case 'absent':
      return `platform/challenge/${slug}/challenge.yaml not found`
    case 'not-a-mapping':
      return 'challenge.yaml is not a YAML mapping'
    case 'multi-document':
      return 'challenge.yaml holds more than one YAML document'
    case 'invalid-yaml': {
      let detail = NON_SCALAR_KEY_TEXT
      try {
        const outcome = parseYamlStrict(readFileSync(path, 'utf-8'))
        if (!outcome.ok && outcome.message !== '') detail = outcome.message
      } catch {
        // the reader saw the file a moment ago; keep the fixed text
      }
      return `invalid YAML in challenge.yaml: ${detail}`
    }
  }
}

// ─── Brief checks (D74, VM6-VM9, VM14, VM15) ───────────────────────────────────────────────────

function checkBrief(briefPath: string, locale: string, slug: string): CheckResult {
  const label = `brief (${locale})`
  const rel = `platform/${locale}/challenge/${slug}/index.md`
  const parsed = parseMd(readFileSync(briefPath, 'utf-8'))
  if (!parsed) return { label, passed: false, message: `${rel}: no YAML frontmatter found` }
  const outcome = parseYamlStrict(parsed.fmRaw)
  if (!outcome.ok) return { label, passed: false, message: `${rel}: invalid YAML: ${outcome.message}` }
  if (outcome.value !== null && (typeof outcome.value !== 'object' || Array.isArray(outcome.value))) {
    return { label, passed: false, message: `${rel}: invalid YAML: the frontmatter is not a mapping` }
  }
  const frontmatter = (outcome.value ?? {}) as Record<string, unknown>
  const extra = Object.keys(frontmatter).filter((key) => !(BRIEF_KEYS as readonly string[]).includes(key))
  if (extra.length > 0) {
    return {
      label,
      passed: false,
      message: `${rel} carries key(s) ${extra.join(', ')} that a brief may not carry; a brief holds only title, description and layout, and the challenge declaration belongs in platform/challenge/${slug}/challenge.yaml`,
    }
  }
  try {
    validateChallengeBrief(frontmatter)
  } catch (err) {
    return { label, passed: false, message: `${rel}: ${(err as Error).message}` }
  }
  return { label, passed: true, message: rel }
}

// ─── Core validation function ───────────────────────────────────────────────

/**
 * Validate a single challenge by its slug under `root`.
 *
 * @param root  The repository root (the directory holding `platform/`)
 * @param slug  The challenge's slug
 * @returns     Validation result with individual check outcomes
 */
export function validateChallenge(root: string, slug: string): ValidationResult {
  const baseDir = join(root, 'platform', 'challenge', slug)
  const checks: CheckResult[] = []

  // ── Check 1: the declaration is read ────────────────────────────────────
  const declaration = readChallengeDeclaration(root, slug)
  if (!declaration.ok) {
    checks.push({ label: 'declaration', passed: false, message: declarationFailureMessage(declaration.reason, slug, declaration.path) })
    return { slug, checks, allPassed: false }
  }
  let fm: Record<string, unknown>
  try {
    validateChallengeDeclaration(declaration.value)
    fm = declaration.value
  } catch (err) {
    checks.push({ label: 'declaration', passed: false, message: (err as Error).message })
    return { slug, checks, allPassed: false }
  }
  checks.push({ label: 'declaration', passed: true, message: 'valid challenge.yaml with required keys' })

  // ── Check 2b: Challenge number present and shaped ───────────────────────
  // The number (from challenge.yaml) is what a printed handout names, so it is checked on
  // every challenge rather than only on the ones a redirect rule happens to cover.
  // Uniqueness across challenges is not visible from a single declaration; it runs once
  // over the whole tree in main().
  const numberValue = fm.number
  if (isChallengeNumber(numberValue)) {
    checks.push({ label: 'number', passed: true, message: `number ${numberValue}` })
  } else if (numberValue === undefined) {
    checks.push({
      label: 'number',
      passed: false,
      message: 'no `number` in challenge.yaml; assign one greater than every number ever assigned',
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
  const appPath = resolve(baseDir, 'src', app)
  if (existsSync(appPath)) {
    checks.push({ label: 'app', passed: true, message: `src/${app} exists` })
  } else {
    checks.push({ label: 'app', passed: false, message: `src/${app} not found` })
  }

  // ── Check 5: Flag file exists ───────────────────────────────────────────
  const flagRef = (fm.flag as string) ?? 'flag.txt'
  let resolvedFlagPath: string | null = null
  const flagPath = resolve(baseDir, 'src', flagRef)
  if (existsSync(flagPath)) {
    checks.push({ label: 'flag', passed: true, message: `src/${flagRef} exists` })
    resolvedFlagPath = flagPath
  } else {
    checks.push({ label: 'flag', passed: false, message: `src/${flagRef} not found` })
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

  // ── Check 8: the challenge directory holds only src/ and challenge.yaml (D117) ──
  const stray = readdirSync(baseDir)
    .filter((name) => name !== 'src' && name !== 'challenge.yaml' && !name.startsWith('.'))
    .sort()
  if (stray.length > 0) {
    checks.push({
      label: 'structure',
      passed: false,
      message: `platform/challenge/${slug}/ holds ${stray.join(', ')}; a challenge directory holds only src/ and challenge.yaml`,
    })
  } else {
    checks.push({ label: 'structure', passed: true, message: 'only src/ and challenge.yaml' })
  }

  // ── Check 9: the briefs, primary locale first ───────────────────────────
  const primary = readPrimaryLocale(join(root, 'range.json'))
  for (const locale of [primary, ...LOCALES.filter((l) => l !== primary)]) {
    const briefPath = join(root, 'platform', locale, 'challenge', slug, 'index.md')
    if (existsSync(briefPath)) {
      checks.push(checkBrief(briefPath, locale, slug))
    } else if (locale === primary) {
      checks.push({
        label: `brief (${locale})`,
        passed: false,
        message: `platform/${locale}/challenge/${slug}/index.md not found; every challenge has a brief in the primary locale (${locale})`,
      })
    }
  }

  const allPassed = checks.every((c) => c.passed)
  return { slug, checks, allPassed }
}

// ─── Discovery ──────────────────────────────────────────────────────────────

function directoryNames(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

/**
 * Discover every challenge slug: each directory under `platform/challenge/` together with each
 * directory under a listed locale's `platform/<locale>/challenge/` (D86), so a brief without a
 * declaration and a declaration without a brief are both reported.
 *
 * @param root    The repository root
 * @param target  Optional slug to filter to a single challenge
 * @returns       Sorted, de-duplicated slugs
 */
export function discoverChallenges(root: string, target?: string): string[] {
  const slugs = new Set<string>(directoryNames(join(root, 'platform', 'challenge')))
  for (const locale of LOCALES) {
    // D127: a brief is a folder's index.md; any other entry there makes no slug.
    for (const name of directoryNames(join(root, 'platform', locale, 'challenge'))) {
      if (existsSync(join(root, 'platform', locale, 'challenge', name, 'index.md'))) slugs.add(name)
    }
  }
  return [...slugs].filter((slug) => !target || slug === target).sort()
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

  // D19, D123: range.json is read first; a fault in it, or in the layout, stops the command before
  // anything is validated, with the error's own text (no class name, no stack).
  try {
    const primary = readPrimaryLocale(join(root, 'range.json'))
    // D19: then the layout check, so a legacy-layout page is named before any challenge is.
    checkSourceLayout(join(root, 'platform'), primary)
  } catch (err) {
    if (err instanceof SiteLayoutError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const slugs = discoverChallenges(root, target)

  if (slugs.length === 0) {
    console.error(target ? `Challenge not found: ${target}` : 'No challenge files found')
    process.exit(1)
  }

  let allPassed = true
  for (const slug of slugs) {
    const result = validateChallenge(root, slug)
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
