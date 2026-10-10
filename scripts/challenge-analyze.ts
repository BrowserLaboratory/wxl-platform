/**
 * challenge-analyze.ts
 *
 * CLI tool for challenge validation + content analysis.
 *
 * Usage:
 *   pnpm challenge:analyze              # analyze all challenges
 *   pnpm challenge:analyze door-is-open # analyze one challenge
 *
 * Exit code 0 on success, 1 on validation failure.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'
import { VALID_TOOLS, validateChallengeConfig } from '../.vitepress/challenge/config.ts'
import { scanSrcDirectory } from './challenge-utils.ts'

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
  mdPath: string
  isPerFolder: boolean
}

/**
 * Discover all challenge markdown files.
 * Supports both per-folder (slug/index.md) and legacy (slug.md) structures.
 */
export function discoverChallenges(challengesDir: string, targetSlug?: string): ChallengeFile[] {
  if (!existsSync(challengesDir)) return []

  // New pattern: challengesDir/<slug>/index.md
  const newPatternFiles: ChallengeFile[] = readdirSync(challengesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(challengesDir, d.name, 'index.md')))
    .filter((d) => !targetSlug || d.name === targetSlug)
    .map((d) => ({
      slug: d.name,
      mdPath: join(challengesDir, d.name, 'index.md'),
      isPerFolder: true,
    }))

  // Legacy pattern: challengesDir/<slug>.md (fallback)
  const newSlugs = new Set(newPatternFiles.map((f) => f.slug))
  const legacyFiles: ChallengeFile[] = readdirSync(challengesDir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .map((f) => f.replace(/\.md$/, ''))
    .filter((slug) => !newSlugs.has(slug))
    .filter((slug) => !targetSlug || slug === targetSlug)
    .map((slug) => ({
      slug,
      mdPath: join(challengesDir, `${slug}.md`),
      isPerFolder: false,
    }))

  return [...newPatternFiles, ...legacyFiles]
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a single challenge. Returns an array of error messages.
 * Empty array means the challenge is valid.
 */
export function validateChallenge(challenge: ChallengeFile): string[] {
  const errors: string[] = []
  let raw: string

  try {
    raw = readFileSync(challenge.mdPath, 'utf-8')
  } catch {
    errors.push(`Cannot read file: ${challenge.mdPath}`)
    return errors
  }

  const parsed = parseMd(raw)
  if (!parsed) {
    errors.push('No YAML frontmatter found')
    return errors
  }

  let fm: Record<string, unknown>
  try {
    const doc = parseDocument(parsed.fmRaw)
    fm = doc.toJSON() as Record<string, unknown>
  } catch (e) {
    errors.push(`Invalid YAML frontmatter: ${(e as Error).message}`)
    return errors
  }

  // Validate config shape
  try {
    validateChallengeConfig(fm)
  } catch (e) {
    errors.push((e as Error).message)
    return errors
  }

  const baseDir = dirname(challenge.mdPath)
  const appRef = String(fm.app ?? 'app.py')

  if (challenge.isPerFolder) {
    const srcDir = resolve(baseDir, 'src')
    if (!existsSync(srcDir)) {
      errors.push(`src/ directory not found: ${srcDir}`)
      return errors
    }

    const appPath = resolve(srcDir, appRef)
    if (!existsSync(appPath)) {
      errors.push(`App file not found: ${appPath}`)
    }

    const flagRef = String(fm.flag ?? 'flag.txt')
    const flagPath = resolve(srcDir, flagRef)
    if (!existsSync(flagPath)) {
      errors.push(`Flag file not found: ${flagPath}`)
    }
  } else {
    // Legacy
    const appPath = resolve(baseDir, appRef)
    if (!existsSync(appPath)) {
      errors.push(`App file not found: ${appPath}`)
    }
  }

  return errors
}

// ─── Analysis ───────────────────────────────────────────────────────────────

/**
 * Analyze a single challenge. Assumes validation has already passed.
 */
export function analyzeChallenge(challenge: ChallengeFile): AnalysisResult {
  const raw = readFileSync(challenge.mdPath, 'utf-8')
  const parsed = parseMd(raw)!
  const doc = parseDocument(parsed.fmRaw)
  const fm = doc.toJSON() as Record<string, unknown>

  const title = String(fm.title ?? challenge.slug)
  const backend = String(fm.backend ?? 'unknown')
  const difficulty = String(fm.difficulty ?? 'unset')
  const category = String(fm.category ?? 'unset')
  const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : []

  const baseDir = dirname(challenge.mdPath)
  const warnings: string[] = []

  // ─── Collect files ─────────────────────────────────────────────────

  let files: FileInfo[] = []

  if (challenge.isPerFolder) {
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
  } else {
    // Legacy: check for fs map or app file directly
    const appRef = String(fm.app ?? '')
    const appPath = resolve(baseDir, appRef)
    if (existsSync(appPath)) {
      const st = statSync(appPath)
      files.push({ name: appRef, sizeBytes: st.size })
    }
    const fsMap = (fm.fs ?? {}) as Record<string, string>
    for (const [, ref] of Object.entries(fsMap)) {
      const p = resolve(baseDir, ref)
      if (existsSync(p)) {
        const st = statSync(p)
        files.push({ name: ref, sizeBytes: st.size })
      }
    }
  }

  const totalFiles = files.length
  const totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)
  // AES-GCM overhead: 12 bytes IV + 16 bytes auth tag per file, plus ~4x for WASM structure
  const estimatedWasmBytes = Math.ceil(totalSizeBytes * 4)

  // ─── Flag format check ────────────────────────────────────────────

  const flagRef = String(fm.flag ?? 'flag.txt')
  let flagPath: string
  if (challenge.isPerFolder) {
    flagPath = resolve(baseDir, 'src', flagRef)
  } else {
    const fsMap = (fm.fs ?? {}) as Record<string, string>
    const flagEntry = Object.entries(fsMap).find(([vpath]) => vpath === '/flag.txt')
    flagPath = flagEntry ? resolve(baseDir, flagEntry[1]) : resolve(baseDir, flagRef)
  }

  if (existsSync(flagPath)) {
    const flagContent = readFileSync(flagPath, 'utf-8').trim()
    if (!FLAG_PATTERN.test(flagContent)) {
      warnings.push(`Flag does not match FLAG{...} or CTF{...} pattern: "${flagContent}"`)
    }
  }

  // ─── Localhost check ──────────────────────────────────────────────

  for (const file of files) {
    let filePath: string
    if (challenge.isPerFolder) {
      filePath = resolve(baseDir, 'src', file.name)
    } else {
      filePath = resolve(baseDir, file.name)
    }
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
  const challengesDir = resolve(root, 'platform', 'challenge')

  const challenges = discoverChallenges(challengesDir, target)

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
