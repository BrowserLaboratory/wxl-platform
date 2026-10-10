import { describe, it, expect } from 'vitest'
import {
  runVerify,
  parseVerifyArgs,
  type LayerRunners,
  type LayerOutcome,
} from '../../../scripts/challenge-verify'

function makeRunners(): { runners: LayerRunners; calls: string[] } {
  const calls: string[] = []
  const make = (name: 'L1' | 'L2' | 'L3' | 'L4') => async (): Promise<LayerOutcome> => {
    calls.push(name)
    return { layer: name, status: 'pass', reason: null }
  }
  return {
    calls,
    runners: { L1: make('L1'), L2: make('L2'), L3: make('L3'), L4: make('L4') },
  }
}

describe('--layers filter (task 4.8)', () => {
  it('runs only L1 and L3 when --layers L1,L3 is set, skips L2 and L4', async () => {
    const { runners, calls } = makeRunners()
    await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1,L3']), runners)
    expect(calls).toEqual(['L1', 'L3'])
    expect(calls).not.toContain('L2')
    expect(calls).not.toContain('L4')
  })

  it('runs layers in the order specified', async () => {
    const { runners, calls } = makeRunners()
    await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L3,L1']), runners)
    expect(calls).toEqual(['L3', 'L1'])
  })

  it('respects --layers L4 alone (does not require --blind)', async () => {
    const { runners, calls } = makeRunners()
    await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L4']), runners)
    expect(calls).toEqual(['L4'])
  })
})
