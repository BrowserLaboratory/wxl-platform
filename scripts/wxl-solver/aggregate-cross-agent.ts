/**
 * wxl-solver/aggregate-cross-agent.ts
 *
 * Pure aggregation + rendering for the multi-runtime L4 cross-check.
 * Decoupled from spawn / IO so the verdict precedence and report shape
 * can be unit-tested without mocking a child process.
 *
 * Verdict precedence (per `l4-multi-agent-cross-check` spec):
 *   1. ANY per-agent fail        → aggregate fail        (exit 1)
 *   2. else ≥1 per-agent pass    → aggregate pass        (exit 0)
 *   3. else (all inconclusive)   → aggregate inconclusive (exit 2)
 *
 * `divergent` is true iff per-agent verdicts are not all equal.
 */

import type { RuntimeName } from './spawn-runtime.ts'
import type { Verdict } from './extract-flag.ts'

export interface PerAgentOutcome {
  runtime: RuntimeName
  verdict: Verdict
  reason: string
  /** The flag the agent extracted, or null when no flag was emitted. */
  flag: string | null
}

export interface CrossAgentResult {
  perAgent: PerAgentOutcome[]
  aggregateVerdict: Verdict
  aggregateExitCode: number
  divergent: boolean
}

export function aggregateVerdicts(perAgent: PerAgentOutcome[]): CrossAgentResult {
  let aggregateVerdict: Verdict = 'inconclusive'
  if (perAgent.some((p) => p.verdict === 'fail')) {
    aggregateVerdict = 'fail'
  } else if (perAgent.some((p) => p.verdict === 'pass')) {
    aggregateVerdict = 'pass'
  }
  const aggregateExitCode =
    aggregateVerdict === 'pass' ? 0 : aggregateVerdict === 'fail' ? 1 : 2

  const divergent =
    perAgent.length > 1 && perAgent.some((p) => p.verdict !== perAgent[0].verdict)

  return { perAgent, aggregateVerdict, aggregateExitCode, divergent }
}

export interface RenderOptions {
  json: boolean
}

export function renderCrossAgentReport(
  result: CrossAgentResult,
  opts: RenderOptions,
): string {
  if (opts.json) {
    return JSON.stringify({
      perAgent: result.perAgent.map((p) => ({
        runtime: p.runtime,
        verdict: p.verdict,
        reason: p.reason,
        flag: p.flag,
      })),
      aggregate: {
        verdict: result.aggregateVerdict,
        exitCode: result.aggregateExitCode,
        divergent: result.divergent,
      },
    })
  }

  const lines: string[] = ['=== Cross-Agent Report ===']
  for (const p of result.perAgent) {
    const flagPart = p.flag === null ? '(no flag)' : p.flag
    const reasonPart = p.reason ? ` — ${p.reason}` : ''
    lines.push(`${p.runtime}: ${p.verdict}  ${flagPart}${reasonPart}`)
  }
  lines.push(
    `Aggregate: ${result.aggregateVerdict} (divergent: ${result.divergent ? 'true' : 'false'})`,
  )
  return lines.join('\n')
}
