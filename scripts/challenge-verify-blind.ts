/**
 * challenge-verify-blind.ts
 *
 * L4 blind-solve sub-routine. Driven from challenge-verify.ts (via --blind)
 * or invoked standalone via `pnpm challenge:verify:blind <slug>`.
 *
 * Single-runtime exit codes (legacy, byte-for-byte compatible):
 *   0  agent extracted a flag that byte-matches platform/challenge/<slug>/src/flag.txt
 *   1  agent extracted a flag but it does not match (regex or byte)
 *   2  inconclusive: no FINAL_FLAG line, INCONCLUSIVE sentinel, dev server down,
 *      spawn error, or runtime CLI not on PATH
 *
 * Multi-runtime exit codes follow the `l4-multi-agent-cross-check` aggregate
 * precedence — fail > pass > inconclusive — and the cross-agent divergence
 * report is always emitted.
 */

import {
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPlayerPackage,
  type PlayerPackageMeta,
} from './wxl-solver/build-player-package.ts'
import {
  resolveRuntime,
  resolveRuntimes,
  spawnRuntime,
  type RuntimeName,
  type SpawnRuntimeResult,
  UnknownRuntimeError,
} from './wxl-solver/spawn-runtime.ts'
import {
  extractFinalFlag,
  compareToCanonical,
  readCanonicalFlag,
  type Verdict,
} from './wxl-solver/extract-flag.ts'
import {
  aggregateVerdicts,
  renderCrossAgentReport,
  type CrossAgentResult,
  type PerAgentOutcome,
} from './wxl-solver/aggregate-cross-agent.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const PROJECT_ROOT = resolve(__dirname, '..')

export const DEFAULT_TURN_BUDGET = 30
export const DEFAULT_FLAG_REGEX = '^(FLAG|CTF)\\{[^}]+\\}$'
export const DEFAULT_BASE_URL_TEMPLATE = (slug: string) =>
  `http://localhost:5173/challenge/${slug}/`

/**
 * Prompt template fed to the spawned agent. Five mandatory substrings appear
 * verbatim so the prompt unit test (task 5.7) can grep for them:
 *   - Target
 *   - Description
 *   - Flag format
 *   - chrome-devtools-mcp
 *   - FINAL_FLAG=
 *
 * Plus the fabrication prohibition sentence (`Do not hallucinate flags.`).
 */
export function buildPrompt(meta: PlayerPackageMeta, description: string): string {
  return [
    'You are a CTF challenge solver.',
    `Target: ${meta.base_url}`,
    `Description: ${description.trim()}`,
    `Flag format: ${meta.flag_regex}`,
    'Tools available: chrome-devtools-mcp.',
    `Solve the challenge and output exactly one line: FINAL_FLAG=<value> at the end of your response.`,
    'Do not hallucinate flags.',
    `If you cannot solve within ${meta.turn_budget} turns, output FINAL_FLAG=INCONCLUSIVE.`,
  ].join('\n')
}

export type BlindSpawnFn = (cmd: string, args: string[]) => {
  status: number | null
  stdout: string | Buffer
  stderr: string | Buffer
  error?: Error
}

export interface BlindVerifyArgs {
  slug: string
  projectRoot?: string
  /** Legacy single-runtime entry point (kept for back-compat). */
  runtime?: RuntimeName
  /** Multi-runtime entry point. Takes precedence over `runtime` and env. */
  runtimes?: RuntimeName[]
  turnBudget?: number
  flagRegex?: string
  baseUrl?: string
  /** Override fetch used for the dev-server pre-flight probe. */
  preflight?: (url: string) => Promise<boolean>
  /** Override spawn for the agent CLI (used in unit tests). */
  spawn?: BlindSpawnFn
  /** Override workDir root (default: tmp/wxl-verify/<slug>/). */
  workDirRoot?: string
}

export interface BlindVerifyResult {
  exitCode: number
  verdict: Verdict
  reason: string
  /** First runtime (legacy) or the only runtime for single-runtime runs. */
  runtime: RuntimeName
  /** Populated only when more than one runtime ran. */
  perAgent?: PerAgentOutcome[]
  aggregate?: CrossAgentResult
}

async function defaultPreflight(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 2000)
    // node 18+ has global fetch
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(to)
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

function resolveRuntimeList(args: BlindVerifyArgs): RuntimeName[] {
  if (args.runtimes && args.runtimes.length > 0) {
    return args.runtimes
  }
  if (args.runtime) {
    return [args.runtime]
  }
  return resolveRuntimes(process.env.WXL_VERIFY_RUNTIME)
}

function singleVerdictExitCode(verdict: Verdict): number {
  return verdict === 'pass' ? 0 : verdict === 'fail' ? 1 : 2
}

interface RunOneRuntimeParams {
  runtime: RuntimeName
  slug: string
  projectRoot: string
  workDir: string
  turnBudget: number
  flagRegex: string
  meta: PlayerPackageMeta
  canonical: string
  mcpConfigPath: string | undefined
  spawn?: BlindSpawnFn
}

async function runOneRuntime(p: RunOneRuntimeParams): Promise<PerAgentOutcome> {
  mkdirSync(p.workDir, { recursive: true })
  let descriptionMd: string
  try {
    const pkg = buildPlayerPackage({
      slug: p.slug,
      projectRoot: p.projectRoot,
      workDir: p.workDir,
      meta: p.meta,
    })
    const { readFileSync } = await import('node:fs')
    descriptionMd = readFileSync(pkg.descriptionPath, 'utf8')
  } catch (err) {
    return {
      runtime: p.runtime,
      verdict: 'inconclusive',
      reason: `player-package build failed: ${(err as Error).message}`,
      flag: null,
    }
  }

  const prompt = buildPrompt(p.meta, descriptionMd)
  let spawnResult: SpawnRuntimeResult
  try {
    spawnResult = spawnRuntime(
      {
        runtime: p.runtime,
        prompt,
        workDir: p.workDir,
        turnBudget: p.turnBudget,
        mcpConfigPath: p.mcpConfigPath,
      },
      p.spawn
        ? {
            spawn: (cmd, a) => {
              const r = p.spawn!(cmd, a)
              return {
                pid: -1,
                output: [null, r.stdout, r.stderr],
                stdout: typeof r.stdout === 'string' ? r.stdout : String(r.stdout ?? ''),
                stderr: typeof r.stderr === 'string' ? r.stderr : String(r.stderr ?? ''),
                status: r.status,
                signal: null,
                error: r.error,
              }
            },
          }
        : {},
    )
  } catch (err) {
    if (err instanceof UnknownRuntimeError) {
      return { runtime: p.runtime, verdict: 'inconclusive', reason: err.message, flag: null }
    }
    return {
      runtime: p.runtime,
      verdict: 'inconclusive',
      reason: (err as Error).message,
      flag: null,
    }
  }

  if (spawnResult.error) {
    const msg = spawnResult.error.message.includes('ENOENT')
      ? `runtime ${p.runtime} CLI not found on PATH`
      : `spawn error: ${spawnResult.error.message}`
    return { runtime: p.runtime, verdict: 'inconclusive', reason: msg, flag: null }
  }

  const extracted = extractFinalFlag(spawnResult.stdout)
  const compare = compareToCanonical(extracted, p.canonical, new RegExp(p.flagRegex))
  return {
    runtime: p.runtime,
    verdict: compare.verdict,
    reason: compare.reason,
    flag: extracted,
  }
}

export async function verifyBlind(args: BlindVerifyArgs): Promise<BlindVerifyResult> {
  const projectRoot = args.projectRoot ?? PROJECT_ROOT
  let runtimes: RuntimeName[]
  try {
    runtimes = resolveRuntimeList(args)
  } catch (err) {
    const msg = err instanceof UnknownRuntimeError ? err.message : (err as Error).message
    // Cannot infer a runtime label when resolution itself failed.
    return { exitCode: 2, verdict: 'inconclusive', reason: msg, runtime: 'claude' }
  }

  const turnBudget = args.turnBudget ?? DEFAULT_TURN_BUDGET
  const flagRegex = args.flagRegex ?? DEFAULT_FLAG_REGEX
  const baseUrl = args.baseUrl ?? DEFAULT_BASE_URL_TEMPLATE(args.slug)
  const parentWorkDir = args.workDirRoot ?? resolve(projectRoot, 'tmp', 'wxl-verify', args.slug)
  const isSingle = runtimes.length === 1

  const preflight = args.preflight ?? defaultPreflight
  const reachable = await preflight(baseUrl)
  if (!reachable) {
    return {
      exitCode: 2,
      verdict: 'inconclusive',
      reason: `dev server not reachable at ${baseUrl}; start pnpm docs:dev before running --blind`,
      runtime: runtimes[0],
    }
  }

  let canonical: string
  try {
    canonical = readCanonicalFlag(projectRoot, args.slug)
  } catch (err) {
    return {
      exitCode: 2,
      verdict: 'inconclusive',
      reason: (err as Error).message,
      runtime: runtimes[0],
    }
  }

  // MCP config (shared across runtimes).
  const localMcpConfig = resolve(projectRoot, '.mcp.json')
  const mcpConfigPath = existsSync(localMcpConfig) ? localMcpConfig : undefined

  // Loop runtimes. Single-runtime list keeps the legacy workdir layout
  // (`tmp/wxl-verify/<slug>/`) for byte-for-byte back-compat; multi-runtime
  // lists use `tmp/wxl-verify/<slug>/<runtime>/` per agent.
  const verificationRunId = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const meta: PlayerPackageMeta = {
    base_url: baseUrl,
    flag_regex: flagRegex,
    turn_budget: turnBudget,
    verification_run_id: verificationRunId,
  }

  const perAgent: PerAgentOutcome[] = []
  for (const runtime of runtimes) {
    const workDir = isSingle ? parentWorkDir : join(parentWorkDir, runtime)
    const outcome = await runOneRuntime({
      runtime,
      slug: args.slug,
      projectRoot,
      workDir,
      turnBudget,
      flagRegex,
      meta,
      canonical,
      mcpConfigPath,
      spawn: args.spawn,
    })
    perAgent.push(outcome)
  }

  await cleanupQuietly(parentWorkDir)

  if (isSingle) {
    const only = perAgent[0]
    return {
      exitCode: singleVerdictExitCode(only.verdict),
      verdict: only.verdict,
      reason: only.reason,
      runtime: only.runtime,
    }
  }

  const aggregate = aggregateVerdicts(perAgent)
  return {
    exitCode: aggregate.aggregateExitCode,
    verdict: aggregate.aggregateVerdict,
    reason: aggregate.divergent ? 'divergent: see cross-agent report' : 'consistent',
    runtime: perAgent[0].runtime,
    perAgent,
    aggregate,
  }
}

async function cleanupQuietly(workDir: string): Promise<void> {
  // Debug aid: `WXL_VERIFY_KEEP_ARTEFACTS=1` skips cleanup so maintainers can
  // inspect `tmp/wxl-verify/<slug>/run.log`. Default behaviour (Decision 6)
  // is best-effort removal — failures warn but never change the exit code.
  if (process.env.WXL_VERIFY_KEEP_ARTEFACTS === '1') {
    process.stderr.write(`debug: WXL_VERIFY_KEEP_ARTEFACTS=1 — leaving ${workDir} in place\n`)
    return
  }
  try {
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true })
    }
  } catch (err) {
    process.stderr.write(`warning: failed to remove ${workDir}: ${(err as Error).message}\n`)
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const slug = process.argv[2]
  if (!slug) {
    console.error('Usage: pnpm challenge:verify:blind <slug>')
    process.exit(2)
  }

  // The blind CLI inherits runtime selection from WXL_VERIFY_RUNTIME (single
  // or comma-separated). The parent `challenge:verify` sets this env when
  // `--agents` is given; direct invocation uses the user's shell env.
  const result = await verifyBlind({ slug })
  const wantJson = process.env.WXL_VERIFY_BLIND_JSON === '1'

  if (result.aggregate && result.perAgent) {
    // Multi-runtime: emit JSON when the parent asked for it, otherwise the
    // human cross-agent report. Either form is followed by `process.exit` with
    // the aggregate exit code.
    process.stdout.write(
      renderCrossAgentReport(result.aggregate, { json: wantJson }) + '\n',
    )
  } else {
    // Single-runtime legacy output — byte-identical with pre-change behavior.
    const last =
      result.verdict === 'pass'
        ? `verified-blind: ${slug} (runtime=${result.runtime})`
        : result.verdict === 'fail'
          ? `failed-blind: ${slug} — ${result.reason}`
          : `inconclusive-blind: ${slug} — ${result.reason}`
    process.stdout.write(last + '\n')
  }
  process.exit(result.exitCode)
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('challenge-verify-blind.ts')

if (isMainModule) {
  void main()
}

// Silence unused-import warning — `resolveRuntime` is preserved as a back-compat export
// so external callers can still get the first runtime via the legacy single-value API.
export { resolveRuntime }
