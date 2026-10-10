/**
 * challenge-verify.ts
 *
 * Layered release-blocking gate for a wxl challenge.
 *
 * Layers:
 *   L1  structure + frontmatter lint (delegates to validateChallenge())
 *   L2  content analysis + keygen + wasm-tools validate
 *   L3  Playwright e2e via tests/challenges/<slug>.spec.ts
 *   L4  blind solve via scripts/challenge-verify-blind.ts (opt-in, --blind)
 *
 * Usage:
 *   pnpm challenge:verify <slug> [--blind] [--agents <list>] [--layers L1,L2,L3,L4] [--json]
 *
 * Exit codes:
 *   0  every requested layer passed
 *   1  at least one layer failed
 *   2  L4 inconclusive (run succeeded but no verdict — no other failure)
 */

import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync, type SpawnSyncOptions } from 'node:child_process'
import { validateChallenge as l1Validate } from './challenge-validate.ts'
import {
  analyzeChallenge,
  validateChallenge as analyzeValidate,
  discoverChallenges as discoverForAnalyze,
} from './challenge-analyze.ts'
import {
  KNOWN_RUNTIMES,
  resolveRuntimes,
  UnknownRuntimeError,
  type RuntimeName,
} from './wxl-solver/spawn-runtime.ts'
import type { PerAgentOutcome } from './wxl-solver/aggregate-cross-agent.ts'
import type { Verdict } from './wxl-solver/extract-flag.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const PROJECT_ROOT = resolve(__dirname, '..')

export type LayerName = 'L1' | 'L2' | 'L3' | 'L4'
export const ALL_LAYERS: readonly LayerName[] = ['L1', 'L2', 'L3', 'L4']

export type LayerStatus = 'pass' | 'fail' | 'inconclusive' | 'skip'

export interface L4Aggregate {
  verdict: Verdict
  divergent: boolean
  exitCode: number
}

export interface LayerOutcome {
  layer: LayerName
  status: LayerStatus
  reason: string | null
  /** Populated only on multi-runtime L4 outcomes. */
  perAgent?: PerAgentOutcome[]
  aggregate?: L4Aggregate
}

export interface VerifyArgs {
  slug: string
  blind: boolean
  layers?: LayerName[]
  agents?: RuntimeName[]
  json: boolean
}

export interface VerifyResult {
  slug: string
  layersRun: LayerName[]
  results: LayerOutcome[]
  summary: 'verified' | 'failed' | 'inconclusive'
  failedAt: LayerName | null
  exitCode: number
}

export interface VerifyJsonResultEntry {
  layer: LayerName
  status: LayerStatus
  reason: string | null
  perAgent?: PerAgentOutcome[]
  aggregate?: L4Aggregate
}

export interface VerifyJsonOutput {
  slug: string
  layers_run: LayerName[]
  results: VerifyJsonResultEntry[]
  summary: 'verified' | 'failed' | 'inconclusive'
  failed_at: LayerName | null
}

export class VerifyArgError extends Error {
  constructor(message: string, public readonly exitCode: number = 1) {
    super(message)
    this.name = 'VerifyArgError'
  }
}

// ─── CLI parsing ────────────────────────────────────────────────────────────

function parseAgentsList(raw: string): RuntimeName[] {
  const tokens = raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
  const seen = new Set<RuntimeName>()
  const out: RuntimeName[] = []
  for (const tok of tokens) {
    if (!(KNOWN_RUNTIMES as readonly string[]).includes(tok)) {
      throw new VerifyArgError(
        `Invalid --agents entry "${tok}". Accepted: ${KNOWN_RUNTIMES.join(', ')}.`,
        1,
      )
    }
    if (!seen.has(tok as RuntimeName)) {
      seen.add(tok as RuntimeName)
      out.push(tok as RuntimeName)
    }
  }
  return out
}

export function parseVerifyArgs(argv: string[]): VerifyArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      blind: { type: 'boolean', default: false },
      layers: { type: 'string' },
      agents: { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help) {
    throw new VerifyArgError(formatHelp(), 0)
  }

  const slug = positionals[0]
  if (!slug) {
    throw new VerifyArgError('Missing <slug>.\n' + formatHelp(), 1)
  }

  let layers: LayerName[] | undefined
  if (values.layers !== undefined) {
    layers = values.layers
      .split(',')
      .map((l) => l.trim().toUpperCase())
      .filter((l) => l.length > 0) as LayerName[]
    for (const l of layers) {
      if (!(ALL_LAYERS as readonly string[]).includes(l)) {
        throw new VerifyArgError(
          `Invalid --layers entry "${l}". Accepted: ${ALL_LAYERS.join(', ')}.`,
          1,
        )
      }
    }
  }

  let agents: RuntimeName[] | undefined
  if (values.agents !== undefined) {
    agents = parseAgentsList(values.agents)
    if (values.blind !== true) {
      throw new VerifyArgError(
        '`--agents` requires `--blind`. Multi-runtime cross-check only applies to L4.',
        1,
      )
    }
  }

  return {
    slug,
    blind: values.blind === true,
    layers,
    agents,
    json: values.json === true,
  }
}

function formatHelp(): string {
  return [
    'Usage: pnpm challenge:verify <slug> [flags]',
    '',
    'Flags:',
    '  --blind                            Include the L4 blind-solve gate',
    '  --agents <list>                    Comma-separated runtimes for L4 cross-check',
    '                                     (requires --blind). Accepted: claude, codex, gemini.',
    '  --layers L1,L2,L3,L4               Run only the listed subset (debug)',
    '  --json                             Emit a single JSON object instead of human stdout',
    '  -h, --help                         Show this help',
    '',
    'Exit codes: 0 verified | 1 at least one layer failed | 2 L4 inconclusive',
  ].join('\n')
}

// ─── Layer selection ────────────────────────────────────────────────────────

export function selectLayers(args: VerifyArgs): LayerName[] {
  if (args.layers !== undefined) {
    // Preserve user-specified order (debug-friendly).
    return args.layers
  }
  return args.blind ? ['L1', 'L2', 'L3', 'L4'] : ['L1', 'L2', 'L3']
}

// ─── Agent resolution ───────────────────────────────────────────────────────

/**
 * Resolve the runtime list for L4 using the precedence:
 *   1. `--agents` (highest)
 *   2. list-form `WXL_VERIFY_RUNTIME`
 *   3. default `['claude']`
 *
 * Throws `VerifyArgError` on an unknown runtime supplied via env.
 */
export function resolveAgentsForL4(
  fromFlag: RuntimeName[] | undefined,
  fromEnv: string | undefined,
): RuntimeName[] {
  if (fromFlag && fromFlag.length > 0) return fromFlag
  try {
    return resolveRuntimes(fromEnv)
  } catch (err) {
    if (err instanceof UnknownRuntimeError) {
      throw new VerifyArgError(err.message, 1)
    }
    throw err
  }
}

// ─── Default layer runners ──────────────────────────────────────────────────

export interface L4RunnerOpts {
  agents?: RuntimeName[]
}

export interface LayerRunners {
  L1: (slug: string) => Promise<LayerOutcome>
  L2: (slug: string) => Promise<LayerOutcome>
  L3: (slug: string) => Promise<LayerOutcome>
  L4: (slug: string, opts?: L4RunnerOpts) => Promise<LayerOutcome>
}

interface DefaultRunnerDeps {
  projectRoot: string
  spawn: (cmd: string, args: string[], opts?: SpawnSyncOptions) => {
    status: number | null
    stdout: string | Buffer
    stderr: string | Buffer
    error?: Error
  }
}

function l4StatusFromExit(code: number): LayerStatus {
  if (code === 0) return 'pass'
  if (code === 2) return 'inconclusive'
  return 'fail'
}

export function makeDefaultRunners(deps: Partial<DefaultRunnerDeps> = {}): LayerRunners {
  const projectRoot = deps.projectRoot ?? PROJECT_ROOT
  const spawn = deps.spawn ?? ((cmd, args, opts) => spawnSync(cmd, args, { encoding: 'utf8', ...opts }))

  return {
    L1: async (slug) => {
      const indexPath = resolve(projectRoot, 'platform', 'challenge', slug, 'index.md')
      if (!existsSync(indexPath)) {
        return { layer: 'L1', status: 'fail', reason: `index.md not found: ${indexPath}` }
      }
      const result = l1Validate(indexPath)
      if (result.allPassed) return { layer: 'L1', status: 'pass', reason: null }
      const failedLabels = result.checks.filter((c) => !c.passed).map((c) => c.label).join(', ')
      return { layer: 'L1', status: 'fail', reason: `validate failed: ${failedLabels}` }
    },

    L2: async (slug) => {
      const indexPath = resolve(projectRoot, 'platform', 'challenge', slug, 'index.md')
      if (!existsSync(indexPath)) {
        return { layer: 'L2', status: 'fail', reason: `index.md not found: ${indexPath}` }
      }
      const challenges = discoverForAnalyze(resolve(projectRoot, 'platform', 'challenge'), slug)
      if (challenges.length === 0) {
        return { layer: 'L2', status: 'fail', reason: `analyze could not discover slug ${slug}` }
      }
      // Content checks (flag format, localhost grep, etc.) — fail L2 on any error.
      const contentErrors = analyzeValidate(challenges[0])
      if (contentErrors.length > 0) {
        return { layer: 'L2', status: 'fail', reason: `analyze errors: ${contentErrors.join('; ')}` }
      }
      // analysis result is recorded but warnings alone do not fail L2 — the legacy
      // pnpm challenge:analyze surfaces them informationally.
      analyzeChallenge(challenges[0])

      // Keygen
      const keygen = spawn('pnpm', ['challenge:keygen', slug], { cwd: projectRoot, encoding: 'utf8' })
      if (keygen.error) {
        return { layer: 'L2', status: 'fail', reason: `keygen spawn error: ${keygen.error.message}` }
      }
      if ((keygen.status ?? 1) !== 0) {
        return { layer: 'L2', status: 'fail', reason: `keygen exit ${keygen.status}: ${String(keygen.stderr).trim()}` }
      }

      // wasm-tools validate — keygen writes to platform/public/challenge/<slug>/runtime.wasm
      const wasmPath = resolve(projectRoot, 'platform', 'public', 'challenge', slug, 'runtime.wasm')
      if (!existsSync(wasmPath)) {
        return { layer: 'L2', status: 'fail', reason: `runtime.wasm not produced at ${wasmPath}` }
      }
      const wasmTools = spawn('wasm-tools', ['validate', wasmPath], { cwd: projectRoot, encoding: 'utf8' })
      if (wasmTools.error) {
        return { layer: 'L2', status: 'fail', reason: `wasm-tools spawn error: ${wasmTools.error.message}` }
      }
      if ((wasmTools.status ?? 1) !== 0) {
        return { layer: 'L2', status: 'fail', reason: `wasm-tools validate exit ${wasmTools.status}: ${String(wasmTools.stderr).trim()}` }
      }

      return { layer: 'L2', status: 'pass', reason: null }
    },

    L3: async (slug) => {
      const specPath = resolve(projectRoot, 'tests', 'challenges', `${slug}.spec.ts`)
      if (!existsSync(specPath)) {
        return { layer: 'L3', status: 'fail', reason: `spec not found: tests/challenges/${slug}.spec.ts` }
      }
      const playwright = spawn(
        'pnpm',
        ['exec', 'playwright', 'test', `tests/challenges/${slug}.spec.ts`],
        { cwd: projectRoot, encoding: 'utf8' },
      )
      if (playwright.error) {
        return { layer: 'L3', status: 'fail', reason: `playwright spawn error: ${playwright.error.message}` }
      }
      if ((playwright.status ?? 1) !== 0) {
        const stderr = String(playwright.stderr).trim().split('\n').slice(-3).join(' | ')
        return { layer: 'L3', status: 'fail', reason: `playwright exit ${playwright.status}: ${stderr || 'see stdout'}` }
      }
      return { layer: 'L3', status: 'pass', reason: null }
    },

    L4: async (slug, opts) => {
      // Resolve runtime list (precedence: --agents > list-form env > [claude]).
      let agents: RuntimeName[]
      try {
        agents = resolveAgentsForL4(opts?.agents, process.env.WXL_VERIFY_RUNTIME)
      } catch (err) {
        if (err instanceof VerifyArgError) {
          return { layer: 'L4', status: 'fail', reason: err.message }
        }
        throw err
      }
      const isMulti = agents.length > 1

      // Spawn env: when --agents was supplied (or precedence picked it up),
      // pin WXL_VERIFY_RUNTIME for the child so it sees the same list. Pass
      // WXL_VERIFY_BLIND_JSON=1 for multi-runtime so blind emits structured
      // output we can re-export through --json. Single-runtime path leaves env
      // untouched to preserve byte-for-byte back-compat.
      const spawnEnv: NodeJS.ProcessEnv | undefined = isMulti
        ? {
            ...process.env,
            WXL_VERIFY_RUNTIME: agents.join(','),
            WXL_VERIFY_BLIND_JSON: '1',
          }
        : opts?.agents
          ? { ...process.env, WXL_VERIFY_RUNTIME: agents.join(',') }
          : undefined

      const child = spawn('pnpm', ['challenge:verify:blind', slug], {
        cwd: projectRoot,
        encoding: 'utf8',
        ...(spawnEnv ? { env: spawnEnv } : {}),
      })

      if (child.error) {
        return {
          layer: 'L4',
          status: 'inconclusive',
          reason: `blind spawn error: ${child.error.message}`,
        }
      }

      if (!isMulti) {
        // Single-runtime — legacy behavior, byte-identical with pre-change.
        const code = child.status ?? 2
        if (code === 0) return { layer: 'L4', status: 'pass', reason: null }
        if (code === 2)
          return {
            layer: 'L4',
            status: 'inconclusive',
            reason: String(child.stderr).trim() || 'see run.log',
          }
        return {
          layer: 'L4',
          status: 'fail',
          reason: String(child.stderr).trim() || `blind exit ${code}`,
        }
      }

      // Multi-runtime: parse the JSON line blind emitted on stdout.
      const stdout = String(child.stdout).trim()
      const lastLine = stdout.split('\n').filter((l) => l.trim().length > 0).pop() ?? ''
      let parsed: { perAgent?: PerAgentOutcome[]; aggregate?: L4Aggregate } | null = null
      try {
        const obj = JSON.parse(lastLine)
        if (obj && Array.isArray(obj.perAgent) && obj.aggregate) {
          parsed = obj
        }
      } catch {
        parsed = null
      }
      if (!parsed) {
        return {
          layer: 'L4',
          status: 'inconclusive',
          reason: 'blind did not emit a parseable cross-agent JSON line',
        }
      }
      const code = child.status ?? 2
      const status = l4StatusFromExit(code)
      const reason =
        status === 'pass'
          ? null
          : parsed.aggregate!.divergent
            ? 'divergent: see cross-agent report'
            : `blind aggregate ${parsed.aggregate!.verdict}`
      return {
        layer: 'L4',
        status,
        reason,
        perAgent: parsed.perAgent,
        aggregate: parsed.aggregate,
      }
    },
  }
}

// ─── Orchestration ──────────────────────────────────────────────────────────

export async function runVerify(args: VerifyArgs, runners: LayerRunners): Promise<VerifyResult> {
  const layersToRun = selectLayers(args)
  const results: LayerOutcome[] = []
  let failedAt: LayerName | null = null
  let summary: VerifyResult['summary'] = 'verified'
  let exitCode = 0

  for (const layer of layersToRun) {
    const outcome =
      layer === 'L4'
        ? await runners.L4(args.slug, { agents: args.agents })
        : await runners[layer](args.slug)
    results.push(outcome)
    if (outcome.status === 'fail') {
      failedAt = layer
      summary = 'failed'
      exitCode = 1
      break
    }
    if (outcome.status === 'inconclusive') {
      failedAt = layer
      summary = 'inconclusive'
      exitCode = 2
      // Inconclusive halts the cascade — no other layer to run after L4.
      break
    }
  }

  return {
    slug: args.slug,
    layersRun: layersToRun.slice(0, results.length),
    results,
    summary,
    failedAt,
    exitCode,
  }
}

// ─── Output formatting ──────────────────────────────────────────────────────

export function formatHuman(result: VerifyResult): string[] {
  const lines: string[] = []
  for (const r of result.results) {
    if (r.status === 'pass') {
      lines.push(`✓ ${r.layer} passed`)
    } else if (r.status === 'skip') {
      lines.push(`- ${r.layer} skipped`)
    } else if (r.status === 'inconclusive') {
      lines.push(`? ${r.layer} inconclusive: ${r.reason ?? '(no reason)'}`)
    } else {
      lines.push(`✗ ${r.layer} failed: ${r.reason ?? '(no reason)'}`)
    }
    // Surface per-agent breakdown when L4 ran multi-runtime.
    if (r.layer === 'L4' && r.perAgent && r.aggregate) {
      lines.push('  === Cross-Agent Report ===')
      for (const p of r.perAgent) {
        const flag = p.flag ?? '(no flag)'
        const reason = p.reason ? ` — ${p.reason}` : ''
        lines.push(`    ${p.runtime}: ${p.verdict}  ${flag}${reason}`)
      }
      lines.push(`    Aggregate: ${r.aggregate.verdict} (divergent: ${r.aggregate.divergent})`)
    }
  }
  if (result.summary === 'verified') {
    lines.push(`verified: ${result.slug} (${result.layersRun.join(' ')})`)
  } else if (result.summary === 'failed') {
    lines.push(`failed: ${result.slug} at ${result.failedAt}`)
  } else {
    lines.push(`inconclusive: ${result.slug} at ${result.failedAt}`)
  }
  return lines
}

export function formatJson(result: VerifyResult): VerifyJsonOutput {
  return {
    slug: result.slug,
    layers_run: result.layersRun,
    results: result.results.map((r) => {
      const entry: VerifyJsonResultEntry = { layer: r.layer, status: r.status, reason: r.reason }
      if (r.perAgent) entry.perAgent = r.perAgent
      if (r.aggregate) entry.aggregate = r.aggregate
      return entry
    }),
    summary: result.summary,
    failed_at: result.failedAt,
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    const args = parseVerifyArgs(process.argv.slice(2))
    const runners = makeDefaultRunners()
    const result = await runVerify(args, runners)
    if (args.json) {
      process.stdout.write(JSON.stringify(formatJson(result)) + '\n')
    } else {
      for (const line of formatHuman(result)) {
        process.stdout.write(line + '\n')
      }
    }
    process.exit(result.exitCode)
  } catch (err) {
    if (err instanceof VerifyArgError) {
      if (err.exitCode === 0) {
        console.log(err.message)
      } else {
        console.error(err.message)
      }
      process.exit(err.exitCode)
    }
    console.error((err as Error).stack ?? String(err))
    process.exit(1)
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('challenge-verify.ts')

if (isMainModule) {
  main()
}
