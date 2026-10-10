import { describe, it, expect } from 'vitest'
import {
  aggregateVerdicts,
  renderCrossAgentReport,
  type PerAgentOutcome,
} from '../../../../scripts/wxl-solver/aggregate-cross-agent'

const o = (
  runtime: PerAgentOutcome['runtime'],
  verdict: PerAgentOutcome['verdict'],
  flag: string | null = null,
  reason = '',
): PerAgentOutcome => ({ runtime, verdict, reason, flag })

describe('aggregateVerdicts (l4-multi-agent-cross-check task 2.1)', () => {
  it('all pass → pass, exit 0, not divergent', () => {
    const r = aggregateVerdicts([
      o('claude', 'pass', 'FLAG{x}'),
      o('codex', 'pass', 'FLAG{x}'),
    ])
    expect(r.aggregateVerdict).toBe('pass')
    expect(r.aggregateExitCode).toBe(0)
    expect(r.divergent).toBe(false)
  })

  it('one fail + a pass → fail, exit 1, divergent', () => {
    const r = aggregateVerdicts([
      o('claude', 'pass', 'FLAG{x}'),
      o('codex', 'fail', 'FLAG{wrong}'),
      o('gemini', 'inconclusive'),
    ])
    expect(r.aggregateVerdict).toBe('fail')
    expect(r.aggregateExitCode).toBe(1)
    expect(r.divergent).toBe(true)
  })

  it('one pass + rest inconclusive → pass, exit 0, divergent', () => {
    const r = aggregateVerdicts([
      o('claude', 'pass', 'FLAG{x}'),
      o('codex', 'inconclusive'),
      o('gemini', 'inconclusive'),
    ])
    expect(r.aggregateVerdict).toBe('pass')
    expect(r.aggregateExitCode).toBe(0)
    expect(r.divergent).toBe(true)
  })

  it('all inconclusive → inconclusive, exit 2, not divergent', () => {
    const r = aggregateVerdicts([
      o('claude', 'inconclusive'),
      o('codex', 'inconclusive'),
      o('gemini', 'inconclusive'),
    ])
    expect(r.aggregateVerdict).toBe('inconclusive')
    expect(r.aggregateExitCode).toBe(2)
    expect(r.divergent).toBe(false)
  })

  it('single-runtime list preserves the per-agent verdict and exit code', () => {
    expect(aggregateVerdicts([o('claude', 'pass', 'FLAG{x}')]).aggregateExitCode).toBe(0)
    expect(aggregateVerdicts([o('claude', 'fail', 'FLAG{wrong}')]).aggregateExitCode).toBe(1)
    expect(aggregateVerdicts([o('claude', 'inconclusive')]).aggregateExitCode).toBe(2)
  })

  it('preserves the per-agent input order in the result', () => {
    const input = [
      o('gemini', 'pass', 'FLAG{x}'),
      o('claude', 'pass', 'FLAG{x}'),
      o('codex', 'pass', 'FLAG{x}'),
    ]
    const r = aggregateVerdicts(input)
    expect(r.perAgent.map((p) => p.runtime)).toEqual(['gemini', 'claude', 'codex'])
  })
})

describe('renderCrossAgentReport (l4-multi-agent-cross-check task 2.1)', () => {
  const input: PerAgentOutcome[] = [
    o('claude', 'pass', 'FLAG{x}', 'match'),
    o('codex', 'inconclusive', null, 'no FINAL_FLAG line'),
    o('gemini', 'fail', 'FLAG{wrong}', 'flag mismatch'),
  ]

  it('human report lists every runtime, its verdict, and its extracted flag (or no-flag marker)', () => {
    const result = aggregateVerdicts(input)
    const out = renderCrossAgentReport(result, { json: false })
    expect(out).toContain('claude')
    expect(out).toContain('pass')
    expect(out).toContain('FLAG{x}')
    expect(out).toContain('codex')
    expect(out).toContain('inconclusive')
    expect(out).toContain('gemini')
    expect(out).toContain('fail')
    expect(out).toContain('FLAG{wrong}')
    // divergence is surfaced in the human form
    expect(out.toLowerCase()).toContain('divergent')
  })

  it('human report marks a non-divergent run as not divergent', () => {
    const result = aggregateVerdicts([
      o('claude', 'pass', 'FLAG{x}'),
      o('codex', 'pass', 'FLAG{x}'),
    ])
    const out = renderCrossAgentReport(result, { json: false }).toLowerCase()
    expect(out).toMatch(/divergent[^a-z]*(false|no|not)/)
  })

  it('JSON report exposes perAgent[] and aggregate{} with the contract keys', () => {
    const result = aggregateVerdicts(input)
    const out = renderCrossAgentReport(result, { json: true })
    const parsed = JSON.parse(out)
    expect(Array.isArray(parsed.perAgent)).toBe(true)
    expect(parsed.perAgent).toHaveLength(3)
    expect(Object.keys(parsed.perAgent[0]).sort()).toEqual(['flag', 'reason', 'runtime', 'verdict'])
    expect(parsed.aggregate).toBeTypeOf('object')
    expect(parsed.aggregate.verdict).toBe('fail')
    expect(parsed.aggregate.divergent).toBe(true)
  })

  it('JSON report preserves null flag for no-flag outcomes', () => {
    const result = aggregateVerdicts([o('claude', 'inconclusive')])
    const out = renderCrossAgentReport(result, { json: true })
    const parsed = JSON.parse(out)
    expect(parsed.perAgent[0].flag).toBeNull()
  })
})
