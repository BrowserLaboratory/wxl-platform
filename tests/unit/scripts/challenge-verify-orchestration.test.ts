import { describe, it, expect } from 'vitest'
import {
  runVerify,
  parseVerifyArgs,
  formatHuman,
  type LayerRunners,
  type LayerOutcome,
} from '../../../scripts/challenge-verify'

function makeRunners(outcomes: Partial<Record<'L1' | 'L2' | 'L3' | 'L4', LayerOutcome>>): {
  runners: LayerRunners
  calls: string[]
} {
  const calls: string[] = []
  const pass = (name: 'L1' | 'L2' | 'L3' | 'L4'): LayerOutcome => ({ layer: name, status: 'pass', reason: null })
  const make = (name: 'L1' | 'L2' | 'L3' | 'L4') => async () => {
    calls.push(name)
    return outcomes[name] ?? pass(name)
  }
  return {
    calls,
    runners: { L1: make('L1'), L2: make('L2'), L3: make('L3'), L4: make('L4') },
  }
}

describe('verify orchestration (task 4.6)', () => {
  it('verified summary when every layer passes', async () => {
    const { runners } = makeRunners({})
    const result = await runVerify(parseVerifyArgs(['door-is-open']), runners)
    expect(result.summary).toBe('verified')
    expect(result.exitCode).toBe(0)
    const lines = formatHuman(result)
    expect(lines[lines.length - 1]).toBe('verified: door-is-open (L1 L2 L3)')
  })

  it('halts cascade on L2 fail and reports failed: <slug> at L2', async () => {
    const { runners, calls } = makeRunners({
      L2: { layer: 'L2', status: 'fail', reason: 'wasm-tools validate exit 1' },
    })
    const result = await runVerify(parseVerifyArgs(['door-is-open']), runners)
    expect(result.summary).toBe('failed')
    expect(result.exitCode).toBe(1)
    expect(result.failedAt).toBe('L2')
    expect(calls).toEqual(['L1', 'L2'])
    expect(calls).not.toContain('L3')
    expect(calls).not.toContain('L4')
    const lines = formatHuman(result)
    expect(lines[lines.length - 1]).toBe('failed: door-is-open at L2')
  })

  it('halts cascade on inconclusive L4 with exit 2', async () => {
    const { runners } = makeRunners({
      L4: { layer: 'L4', status: 'inconclusive', reason: 'no FINAL_FLAG' },
    })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--blind']), runners)
    expect(result.summary).toBe('inconclusive')
    expect(result.exitCode).toBe(2)
    expect(result.failedAt).toBe('L4')
    const lines = formatHuman(result)
    expect(lines[lines.length - 1]).toBe('inconclusive: door-is-open at L4')
  })
})
