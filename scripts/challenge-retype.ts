/**
 * challenge-retype.ts
 *
 * Mutate an existing challenge's backend / difficulty / tags / category.
 * Skill prose calls this CLI instead of editing frontmatter or renaming
 * source files by hand.
 *
 * Usage:
 *   pnpm challenge:retype <slug> [--backend flask|fastapi|php]
 *                                [--difficulty easy|medium|hard]
 *                                [--tags '<a>,<b>,<c>']
 *                                [--category <name>]
 *
 * Exit codes:
 *   0  success
 *   1  user input error (unknown slug / invalid flag value / no flags)
 *   2  vuln body cannot be auto-converted (cross-language backend swap)
 *   3  internal error (IO failure, keygen failure)
 */

import { parseArgs } from 'node:util'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { Document, parseDocument } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const PROJECT_ROOT = resolve(__dirname, '..')

export const VALID_BACKENDS = ['flask', 'fastapi', 'php'] as const
export type Backend = (typeof VALID_BACKENDS)[number]

export const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof VALID_DIFFICULTIES)[number]

const PYTHON_BACKENDS: ReadonlySet<Backend> = new Set(['flask', 'fastapi'])

export interface RetypeArgs {
  slug: string
  backend?: Backend
  difficulty?: Difficulty
  tags?: string[]
  category?: string
}

export interface RetypeResult {
  exitCode: number
  message: string
  warnings: string[]
}

// ─── CLI parsing ────────────────────────────────────────────────────────────

export class RetypeArgError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message)
    this.name = 'RetypeArgError'
  }
}

export function parseRetypeArgs(argv: string[]): RetypeArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      backend: { type: 'string' },
      difficulty: { type: 'string' },
      tags: { type: 'string' },
      category: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help) {
    throw new RetypeArgError(formatHelp(), 0)
  }

  const slug = positionals[0]
  if (!slug) {
    throw new RetypeArgError(
      'Missing <slug>.\n' + formatHelp(),
      1,
    )
  }

  const result: RetypeArgs = { slug }

  if (values.backend !== undefined) {
    if (!(VALID_BACKENDS as readonly string[]).includes(values.backend)) {
      throw new RetypeArgError(
        `Invalid --backend "${values.backend}". Accepted values: ${VALID_BACKENDS.join(', ')}.`,
        1,
      )
    }
    result.backend = values.backend as Backend
  }

  if (values.difficulty !== undefined) {
    if (!(VALID_DIFFICULTIES as readonly string[]).includes(values.difficulty)) {
      throw new RetypeArgError(
        `Invalid --difficulty "${values.difficulty}". Accepted values: ${VALID_DIFFICULTIES.join(', ')}.`,
        1,
      )
    }
    result.difficulty = values.difficulty as Difficulty
  }

  if (values.tags !== undefined) {
    result.tags = values.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }

  if (values.category !== undefined) {
    result.category = values.category
  }

  const hasAnyMutation =
    result.backend !== undefined ||
    result.difficulty !== undefined ||
    result.tags !== undefined ||
    result.category !== undefined

  if (!hasAnyMutation) {
    throw new RetypeArgError(
      'No mutation flag provided. Pass at least one of --backend / --difficulty / --tags / --category.',
      1,
    )
  }

  return result
}

function formatHelp(): string {
  return [
    'Usage: pnpm challenge:retype <slug> [flags]',
    '',
    'Flags:',
    '  --backend <flask|fastapi|php>      Change backend runtime',
    '  --difficulty <easy|medium|hard>    Change difficulty rating',
    '  --tags <a,b,c>                     Replace the tags array',
    '  --category <name>                  Change category',
    '  -h, --help                         Show this help',
    '',
    'Exit codes: 0 success | 1 user error | 2 manual retype required | 3 internal error',
  ].join('\n')
}

// ─── Frontmatter helpers ────────────────────────────────────────────────────

export interface ParsedIndex {
  /** Editable YAML Document — preserves original key order, comments, collection style. */
  doc: Document.Parsed
  body: string
}

export function splitFrontmatter(indexMd: string): ParsedIndex {
  const match = indexMd.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    throw new Error('index.md has no YAML frontmatter block')
  }
  const doc = parseDocument(match[1])
  const body = indexMd.slice(match[0].length)
  return { doc, body }
}

export function serializeIndex(parsed: ParsedIndex): string {
  const yaml = parsed.doc.toString({ lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n${parsed.body}`
}

function getFrontmatterString(doc: Document.Parsed, key: string): string | undefined {
  const value = doc.get(key)
  return typeof value === 'string' ? value : undefined
}

// ─── App-file helpers ───────────────────────────────────────────────────────

function appFileFor(backend: Backend): string {
  return backend === 'php' ? 'src/index.php' : 'src/app.py'
}

const FASTAPI_HEADER_RE =
  /from\s+fastapi\s+import\s+[^\n]+(?:\nfrom\s+fastapi\.responses\s+import\s+[^\n]+)?/

const FLASK_HEADER_RE = /from\s+flask\s+import\s+[^\n]+/

/**
 * Best-effort same-family Python backend swap.
 *
 * Replaces the framework import header and the `app = FastAPI()` / `app = Flask(__name__)`
 * bootstrap line. Route handler bodies (SQL, templates, vuln logic) are not touched —
 * they may still need maintainer follow-up for full functional parity.
 */
export function swapPythonBackendHeader(
  source: string,
  from: Backend,
  to: Backend,
): { source: string; changed: boolean } {
  if (from === to) return { source, changed: false }
  if (!PYTHON_BACKENDS.has(from) || !PYTHON_BACKENDS.has(to)) {
    return { source, changed: false }
  }

  let next = source
  let changed = false

  if (from === 'fastapi' && to === 'flask') {
    const headerMatch = next.match(FASTAPI_HEADER_RE)
    if (headerMatch) {
      next = next.replace(
        headerMatch[0],
        'from flask import Flask, request, Response, redirect, make_response',
      )
      changed = true
    }
    next = next.replace(/app\s*=\s*FastAPI\(\s*\)/, 'app = Flask(__name__)')
  } else if (from === 'flask' && to === 'fastapi') {
    const headerMatch = next.match(FLASK_HEADER_RE)
    if (headerMatch) {
      next = next.replace(
        headerMatch[0],
        [
          'from fastapi import FastAPI, Request',
          'from fastapi.responses import HTMLResponse, RedirectResponse, Response',
        ].join('\n'),
      )
      changed = true
    }
    next = next.replace(/app\s*=\s*Flask\(\s*__name__\s*\)/, 'app = FastAPI()')
  }

  if (next !== source) changed = true

  return { source: next, changed }
}

// ─── Spec sync ──────────────────────────────────────────────────────────────

/**
 * Update EXPLOIT_PATH in tests/challenges/<slug>.spec.ts if the new backend's
 * routing convention demands a different path. Returns the path's outcome.
 */
export function syncSpecExploitPath(
  specPath: string,
  oldBackend: Backend,
  newBackend: Backend,
):
  | { kind: 'no-spec' }
  | { kind: 'no-change'; reason: string }
  | { kind: 'updated'; from: string; to: string }
  | { kind: 'warning'; reason: string } {
  if (!existsSync(specPath)) return { kind: 'no-spec' }
  if (oldBackend === newBackend) return { kind: 'no-change', reason: 'backend unchanged' }

  // Same-family Python swap usually keeps the same paths (route decorators don't
  // change endpoint URLs across flask ↔ fastapi). Cross-family is rejected earlier.
  if (PYTHON_BACKENDS.has(oldBackend) && PYTHON_BACKENDS.has(newBackend)) {
    return { kind: 'no-change', reason: 'same Python family — EXPLOIT_PATH preserved' }
  }

  return { kind: 'warning', reason: 'cross-family backend swap — EXPLOIT_PATH cannot be inferred automatically' }
}

// ─── Main retype routine ────────────────────────────────────────────────────

export function retypeChallenge(
  args: RetypeArgs,
  opts: { projectRoot?: string; runKeygen?: (slug: string) => void } = {},
): RetypeResult {
  const root = opts.projectRoot ?? PROJECT_ROOT
  const slugDir = resolve(root, 'platform', 'challenge', args.slug)
  const indexPath = resolve(slugDir, 'index.md')

  if (!existsSync(indexPath)) {
    return {
      exitCode: 1,
      message: `Challenge ${args.slug} not found at ${indexPath}`,
      warnings: [],
    }
  }

  const original = readFileSync(indexPath, 'utf8')
  const parsed = splitFrontmatter(original)
  const oldBackendRaw = getFrontmatterString(parsed.doc, 'backend')
  const oldBackend = (
    oldBackendRaw && (VALID_BACKENDS as readonly string[]).includes(oldBackendRaw)
      ? (oldBackendRaw as Backend)
      : undefined
  )

  const warnings: string[] = []
  const changesSummary: string[] = []

  // ── Cross-family fail-fast (Decision 3, cross-family contract) ─────────
  if (args.backend && oldBackend && args.backend !== oldBackend) {
    const oldIsPy = PYTHON_BACKENDS.has(oldBackend)
    const newIsPy = PYTHON_BACKENDS.has(args.backend)
    if (oldIsPy !== newIsPy) {
      return {
        exitCode: 2,
        message: `manual retype required: cross-language backend swap (${oldBackend} → ${args.backend}) cannot preserve vuln body automatically`,
        warnings: [],
      }
    }
  }

  // ── Same-family backend swap (app file rewrite + frontmatter) ──────────
  if (args.backend && oldBackend && args.backend !== oldBackend) {
    const oldAppFile = resolve(slugDir, appFileFor(oldBackend))
    const newAppFile = resolve(slugDir, appFileFor(args.backend))

    if (!existsSync(oldAppFile)) {
      return {
        exitCode: 3,
        message: `expected app file ${oldAppFile} not found`,
        warnings: [],
      }
    }

    const appSrc = readFileSync(oldAppFile, 'utf8')
    const { source: rewritten, changed } = swapPythonBackendHeader(
      appSrc,
      oldBackend,
      args.backend,
    )

    if (!changed) {
      warnings.push(
        `swapPythonBackendHeader: no header pattern matched in ${oldAppFile}; left vuln body untouched`,
      )
    }

    // Same-family Python swap: file name stays src/app.py.
    if (oldAppFile !== newAppFile) {
      renameSync(oldAppFile, newAppFile)
    }
    writeFileSync(newAppFile, rewritten, 'utf8')

    parsed.doc.set('backend', args.backend)
    parsed.doc.set('app', args.backend === 'php' ? 'index.php' : 'app.py')

    changesSummary.push(`backend ${oldBackend} → ${args.backend}`)

    // Spec sync after backend change
    const specPath = resolve(root, 'tests', 'challenges', `${args.slug}.spec.ts`)
    const specOutcome = syncSpecExploitPath(specPath, oldBackend, args.backend)
    if (specOutcome.kind === 'warning') {
      warnings.push(specOutcome.reason)
    } else if (specOutcome.kind === 'updated') {
      changesSummary.push(`spec.ts EXPLOIT_PATH ${specOutcome.from} → ${specOutcome.to}`)
    }
  }

  // ── Frontmatter-only mutations ─────────────────────────────────────────
  if (args.difficulty !== undefined) {
    parsed.doc.set('difficulty', args.difficulty)
    changesSummary.push(`difficulty=${args.difficulty}`)
  }

  if (args.tags !== undefined) {
    parsed.doc.set('tags', args.tags)
    changesSummary.push(`tags=[${args.tags.join(',')}]`)
  }

  if (args.category !== undefined) {
    parsed.doc.set('category', args.category)
    changesSummary.push(`category=${args.category}`)
  }

  writeFileSync(indexPath, serializeIndex(parsed), 'utf8')

  // ── Keygen rerun on backend change ─────────────────────────────────────
  if (args.backend && oldBackend && args.backend !== oldBackend) {
    const runner = opts.runKeygen ?? defaultRunKeygen
    try {
      runner(args.slug)
    } catch (err) {
      return {
        exitCode: 3,
        message: `keygen failed for ${args.slug}: ${(err as Error).message}`,
        warnings,
      }
    }
  }

  return {
    exitCode: 0,
    message: `✓ Mutated ${args.slug}: ${changesSummary.join(', ')}`,
    warnings,
  }
}

function defaultRunKeygen(slug: string): void {
  execFileSync('pnpm', ['challenge:keygen', slug], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  })
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    const args = parseRetypeArgs(process.argv.slice(2))
    const result = retypeChallenge(args)
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.error(`warning: ${w}`)
      }
    }
    if (result.exitCode === 0) {
      console.log(result.message)
    } else {
      console.error(result.message)
    }
    process.exit(result.exitCode)
  } catch (err) {
    if (err instanceof RetypeArgError) {
      if (err.exitCode === 0) {
        console.log(err.message)
      } else {
        console.error(err.message)
      }
      process.exit(err.exitCode)
    }
    console.error((err as Error).stack ?? String(err))
    process.exit(3)
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('challenge-retype.ts')

if (isMainModule) {
  main()
}
