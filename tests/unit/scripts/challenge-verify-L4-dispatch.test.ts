import { describe, it, expect } from 'vitest'
import {
  runVerify,
  parseVerifyArgs,
  resolveAgentsForL4,
  VerifyArgError,
  type LayerRunners,
  type LayerOutcome,
} from '../../../scripts/challenge-verify'

function makeFakeRunners(overrides: Partial<LayerRunners> = {}): {
  runners: LayerRunners
  calls: string[]
} {
  const calls: string[] = []
  const make = (name: 'L1' | 'L2' | 'L3' | 'L4'): ((slug: string) => Promise<LayerOutcome>) =>
    async () => {
      calls.push(name)
      return { layer: name, status: 'pass', reason: null }
    }
  return {
    calls,
    runners: {
      L1: overrides.L1 ?? make('L1'),
      L2: overrides.L2 ?? make('L2'),
      L3: overrides.L3 ?? make('L3'),
      L4: overrides.L4 ?? make('L4'),
    },
  }
}

describe('L4 dispatch gate (task 4.5)', () => {
  it('does NOT invoke L4 without --blind', async () => {
    const { runners, calls } = makeFakeRunners()
    await runVerify(parseVerifyArgs(['door-is-open']), runners)
    expect(calls).toEqual(['L1', 'L2', 'L3'])
    expect(calls).not.toContain('L4')
  })

  it('invokes L4 only when --blind is set', async () => {
    const { runners, calls } = makeFakeRunners()
    await runVerify(parseVerifyArgs(['door-is-open', '--blind']), runners)
    expect(calls).toEqual(['L1', 'L2', 'L3', 'L4'])
  })

  it('passes the exit code through from the L4 runner', async () => {
    const { runners } = makeFakeRunners({
      L4: async () => ({ layer: 'L4', status: 'inconclusive', reason: 'no FINAL_FLAG line' }),
    })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--blind']), runners)
    expect(result.exitCode).toBe(2)
    expect(result.summary).toBe('inconclusive')
    expect(result.failedAt).toBe('L4')
  })

  it('threads args.agents into the L4 runner when --agents is given', async () => {
    let captured: { agents?: string[] } | undefined
    const { runners } = makeFakeRunners({
      L4: async (_slug, opts) => {
        captured = opts as { agents?: string[] } | undefined
        return { layer: 'L4', status: 'pass', reason: null }
      },
    })
    await runVerify(
      parseVerifyArgs(['door-is-open', '--blind', '--agents', 'claude,codex']),
      runners,
    )
    expect(captured?.agents).toEqual(['claude', 'codex'])
  })
})

describe('resolveAgentsForL4 precedence (l4-multi-agent-cross-check task 4.1)', () => {
  it('prefers --agents over WXL_VERIFY_RUNTIME env', () => {
    expect(resolveAgentsForL4(['claude'], 'codex,gemini')).toEqual(['claude'])
  })

  it('falls back to WXL_VERIFY_RUNTIME (list-form) when --agents is undefined', () => {
    expect(resolveAgentsForL4(undefined, 'codex,gemini')).toEqual(['codex', 'gemini'])
  })

  it('falls back to [claude] default when both are absent', () => {
    expect(resolveAgentsForL4(undefined, undefined)).toEqual(['claude'])
    expect(resolveAgentsForL4(undefined, '')).toEqual(['claude'])
  })

  it('throws VerifyArgError on unknown runtime via env', () => {
    expect(() => resolveAgentsForL4(undefined, 'claude,copilot')).toThrow(VerifyArgError)
  })
})
