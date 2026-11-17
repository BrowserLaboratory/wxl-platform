/**
 * challenge-analyze.ts
 *
 * CLI tool for challenge validation + content analysis.
 *
 * A challenge is a folder under platform/challenge/ holding challenge.yaml; its title is the
 * primary-locale brief's (platform/<P>/challenge/<slug>/index.md). P comes from range.json at the
 * repository root, which is read first: an unusable one ends the run with its PL line.
 *
 * Usage:
 *   pnpm challenge:analyze              # analyze all challenges
 *   pnpm challenge:analyze door-is-open # analyze one challenge
 *
 * Exit code 0 on success, 1 on validation failure or an unusable range.json.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'
import { VALID_TOOLS, validateChallengeDeclaration, type ChallengeDeclaration } from '../.vitepress/challenge/config.ts'
import { scanSrcDirectory } from './challenge-utils.ts'
import type { Locale } from '../.vitepress/locales.ts'
import { readPrimaryLocale } from '../.vitepress/primary-locale.ts'
import { SiteLayoutError } from '../.vitepress/layout-error.ts'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FileInfo {
  name: string
  sizeBytes: number
}

export interface AnalysisResult {
  slug: string
  title: string
  backend: string
  difficulty: string
  category: string
  tags: string[]
  files: FileInfo[]
  totalFiles: number
  totalSizeBytes: number
  estimatedWasmBytes: number
  toolsSummary: string
  warnings: string[]
}

export interface ValidationError {
  slug: string
  errors: string[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FLAG_PATTERN = /^(FLAG|CTF)\{.+\}$/

/** Patterns that suggest hardcoded localhost references in app code */
const LOCALHOST_PATTERNS = [
  /127\.0\.0\.1/,
  /localhost/i,
  /0\.0\.0\.0/,
]

// ─── Frontmatter helpers ────────────────────────────────────────────────────

function parseMd(content: string): { fmRaw: string; body: string } | null {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return null
  return { fmRaw: m[1], body: m[2] }
}

// ─── Challenge discovery ────────────────────────────────────────────────────

export interface ChallengeFile {
  slug: string
  /** platform/challenge/<slug>/challenge.yaml: the declaration (D73). */
  declarationPath: string
  /** platform/<primary>/challenge/<slug>/index.md: the primary-locale brief; it may not exist. */
  briefPath: string
}

/**
 * Discover the challenges under `root` (Y69, D89): every folder of `platform/challenge/` that
 * holds a `challenge.yaml`. A flat .md, a folder with only src/, or a brief with no folder is not
 * a challenge. `briefPath` is the primary locale's brief and is returned whether or not it exists.
 */
export function discoverChallenges(root: string, primary: Locale, targetSlug?: string): ChallengeFile[] {
  const challengesDir = join(root, 'platform', 'challenge')
  if (!existsSync(challengesDir)) return []

  return readdirSync(challengesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(challengesDir, d.name, 'challenge.yaml')))
    .filter((d) => !targetSlug || d.name === targetSlug)
    .map((d) => ({
      slug: d.name,
      declarationPath: join(challengesDir, d.name, 'challenge.yaml'),
      briefPath: join(root, 'platform', primary, 'challenge', d.name, 'index.md'),
    }))
}

// ─── Declaration ────────────────────────────────────────────────────────────

/**
 * Read challenge.yaml as a whole file (D73). Absent and unparsable files come back as the
 * error text validateChallenge reports (Y68); a root that is not a mapping is left to
 * validateChallengeDeclaration. A file with several documents is unparsable (the parser says so).
 */
function readDeclaration(declarationPath: string): { value: unknown } | { error: string } {
  let raw: string
  try {
    raw = readFileSync(declarationPath, 'utf-8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { error: 'No challenge.yaml found' }
    return { error: `Cannot read file: ${declarationPath}` }
  }
  const doc = parseDocument(raw)
  if (doc.errors.length > 0) {
    return { error: `Invalid YAML in challenge.yaml: ${doc.errors[0].message}` }
  }
  return { value: doc.toJS() }
}

/** The brief's string `title`, or undefined when the brief is unreadable, has no frontmatter or no such key (Y67). */
function readBriefTitle(briefPath: string): string | undefined {
  let raw: string
  try {
    raw = readFileSync(briefPath, 'utf-8')
  } catch {
    return undefined
  }
  const parsed = parseMd(raw)
  if (!parsed) return undefined
  const doc = parseDocument(parsed.fmRaw)
  if (doc.errors.length > 0) return undefined
  const title = (doc.toJS() as Record<string, unknown> | null)?.title
  return typeof title === 'string' ? title : undefined
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a single challenge. Returns an array of error messages.
 * Empty array means the challenge is valid.
 */
export function validateChallenge(challenge: ChallengeFile): string[] {
  const errors: string[] = []

  const read = readDeclaration(challenge.declarationPath)
  if ('error' in read) {
    errors.push(read.error)
    return errors
  }

  let declaration: ChallengeDeclaration
  try {
    declaration = validateChallengeDeclaration(read.value)
  } catch (e) {
    errors.push((e as Error).message)
    return errors
  }

  const baseDir = dirname(challenge.declarationPath)
  const appRef = String(declaration.app ?? 'app.py')

  const srcDir = resolve(baseDir, 'src')
  if (!existsSync(srcDir)) {
    errors.push(`src/ directory not found: ${srcDir}`)
    return errors
  }

  const appPath = resolve(srcDir, appRef)
  if (!existsSync(appPath)) {
    errors.push(`App file not found: ${appPath}`)
  }

  const flagRef = String(declaration.flag ?? 'flag.txt')
  const flagPath = resolve(srcDir, flagRef)
  if (!existsSync(flagPath)) {
    errors.push(`Flag file not found: ${flagPath}`)
  }

  return errors
}

// ─── Analysis ───────────────────────────────────────────────────────────────

/**
 * Analyze a single challenge. Assumes validation has already passed.
 */
export function analyzeChallenge(challenge: ChallengeFile): AnalysisResult {
  const read = readDeclaration(challenge.declarationPath)
  if ('error' in read) throw new Error(read.error)
  const fm = read.value as Record<string, unknown>

  // Y66 (D89): the title is the primary-locale brief's; the rest comes from challenge.yaml.
  const title = readBriefTitle(challenge.briefPath) ?? challenge.slug
  const backend = String(fm.backend ?? 'unknown')
  const difficulty = String(fm.difficulty ?? 'unset')
  const category = String(fm.category ?? 'unset')
  const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : []

  const baseDir = dirname(challenge.declarationPath)
  const warnings: string[] = []

  // ─── Collect files ─────────────────────────────────────────────────

  let files: FileInfo[] = []

  const srcDir = resolve(baseDir, 'src')
  if (existsSync(srcDir)) {
    const scanned = scanSrcDirectory(srcDir)
    files = scanned.map((f) => {
      const st = statSync(f.absolutePath)
      return {
        name: f.virtualPath.slice(1), // remove leading /
        sizeBytes: st.size,
      }
    })
  }

  const totalFiles = files.length
  const totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)
  // AES-GCM overhead: 12 bytes IV + 16 bytes auth tag per file, plus ~4x for WASM structure
  const estimatedWasmBytes = Math.ceil(totalSizeBytes * 4)

  // ─── Flag format check ────────────────────────────────────────────

  const flagRef = String(fm.flag ?? 'flag.txt')
  const flagPath = resolve(baseDir, 'src', flagRef)

  if (existsSync(flagPath)) {
    const flagContent = readFileSync(flagPath, 'utf-8').trim()
    if (!FLAG_PATTERN.test(flagContent)) {
      warnings.push(`Flag does not match FLAG{...} or CTF{...} pattern: "${flagContent}"`)
    }
  }

  // ─── Localhost check ──────────────────────────────────────────────

  for (const file of files) {
    const filePath = resolve(baseDir, 'src', file.name)
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        for (const pattern of LOCALHOST_PATTERNS) {
          if (pattern.test(content)) {
            warnings.push(`Hardcoded localhost reference in ${file.name}`)
            break
          }
        }
      } catch {
        // Binary file or read error — skip
      }
    }
  }

  // ─── Tools summary ────────────────────────────────────────────────

  let toolsSummary: string
  if (fm.tools === undefined) {
    // Spell out the default set rather than calling it "all", so the reader sees
    // which tabs render without cross-referencing VALID_TOOLS.
    toolsSummary = 'browser, network, repeater, code (default)'
  } else if (Array.isArray(fm.tools)) {
    // Report the tabs that actually render, so the injected browser shows up.
    // Compare by content, not length — a duplicate-padded list is not "all".
    const rendered = VALID_TOOLS.filter(t => t === 'browser' || (fm.tools as string[]).includes(t))
    toolsSummary = rendered.length === VALID_TOOLS.length ? 'all enabled' : rendered.join(', ')
  } else {
    toolsSummary = 'unknown'
  }


  return {
    slug: challenge.slug,
    title,
    backend,
    difficulty,
    category,
    tags,
    files,
    totalFiles,
    totalSizeBytes,
    estimatedWasmBytes,
    toolsSummary,
    warnings,
  }
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  return `${kb.toFixed(2)} KB`
}

export function formatAnalysis(result: AnalysisResult): string {
  const lines: string[] = []

  lines.push(`=== ${result.title} ===`)
  lines.push(`Backend:    ${result.backend}`)
  lines.push(`Difficulty: ${result.difficulty}`)
  lines.push(`Category:   ${result.category}`)
  lines.push(`Tags:       ${result.tags.length > 0 ? result.tags.join(', ') : '(none)'}`)
  lines.push('')

  lines.push('Files in src/:')
  for (const f of result.files) {
    const size = formatBytes(f.sizeBytes)
    lines.push(`  ${f.name.padEnd(16)} ${size}`)
  }
  lines.push('  ' + '\u2500'.repeat(19))
  lines.push(`  Total:  ${result.totalFiles} files, ${formatBytes(result.totalSizeBytes)}`)
  lines.push(`  Est. WASM payload: ~${formatBytes(result.estimatedWasmBytes)} (encrypted)`)
  lines.push('')

  lines.push(`Tools:    ${result.toolsSummary}`)
  lines.push('')

  lines.push('Warnings:')
  if (result.warnings.length === 0) {
    lines.push('  (none)')
  } else {
    for (const w of result.warnings) {
      lines.push(`  - ${w}`)
    }
  }

  return lines.join('\n')
}

export function formatSummaryTable(results: AnalysisResult[]): string {
  const lines: string[] = []

  lines.push('')
  lines.push('=== Summary ===')
  lines.push('')

  const header = [
    'Slug'.padEnd(25),
    'Backend'.padEnd(10),
    'Diff'.padEnd(8),
    'Files'.padEnd(6),
    'Size'.padEnd(10),
    'Warnings',
  ].join(' ')
  lines.push(header)
  lines.push('\u2500'.repeat(header.length))

  for (const r of results) {
    const row = [
      r.slug.padEnd(25),
      r.backend.padEnd(10),
      r.difficulty.padEnd(8),
      String(r.totalFiles).padEnd(6),
      formatBytes(r.totalSizeBytes).padEnd(10),
      r.warnings.length > 0 ? `${r.warnings.length} warning(s)` : 'ok',
    ].join(' ')
    lines.push(row)
  }

  lines.push('')
  lines.push(`Total challenges: ${results.length}`)

  return lines.join('\n')
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('-'))

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const root = resolve(__dirname, '..')

  // D123: range.json is read before anything else; an unusable one ends the run with its PL line.
  let primary: Locale
  try {
    primary = readPrimaryLocale(join(root, 'range.json'))
  } catch (err) {
    if (err instanceof SiteLayoutError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const challenges = discoverChallenges(root, primary, target)

  if (challenges.length === 0) {
    console.error(target ? `Challenge not found: ${target}` : 'No challenge files found')
    process.exit(1)
  }

  // ─── Step 1: Validate all ─────────────────────────────────────────

  const validationErrors: ValidationError[] = []

  for (const ch of challenges) {
    const errors = validateChallenge(ch)
    if (errors.length > 0) {
      validationErrors.push({ slug: ch.slug, errors })
    }
  }

  if (validationErrors.length > 0) {
    console.error('Validation failed:\n')
    for (const v of validationErrors) {
      console.error(`  ${v.slug}:`)
      for (const e of v.errors) {
        console.error(`    - ${e}`)
      }
    }
    process.exit(1)
  }

  // ─── Step 2: Analyze ──────────────────────────────────────────────

  const results: AnalysisResult[] = []

  for (const ch of challenges) {
    const result = analyzeChallenge(ch)
    results.push(result)
    console.log(formatAnalysis(result))
    if (challenges.length > 1) console.log('')
  }

  // Summary table when analyzing multiple
  if (results.length > 1) {
    console.log(formatSummaryTable(results))
  }
}

// Only run main when executed directly (not when imported for testing)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('challenge-analyze.ts') ||
  process.argv[1].endsWith('challenge-analyze.js')
)
if (isDirectRun) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
