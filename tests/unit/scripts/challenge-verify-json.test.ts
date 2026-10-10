import { describe, it, expect } from 'vitest'
import {
  runVerify,
  parseVerifyArgs,
  formatJson,
  type LayerRunners,
  type LayerOutcome,
} from '../../../scripts/challenge-verify'

function passRunners(): LayerRunners {
  const pass = (name: 'L1' | 'L2' | 'L3' | 'L4') => async (): Promise<LayerOutcome> => ({
    layer: name,
    status: 'pass',
    reason: null,
  })
  return { L1: pass('L1'), L2: pass('L2'), L3: pass('L3'), L4: pass('L4') }
}

describe('verify --json output (task 4.7)', () => {
  it('serializes the full result with the contract-mandated keys', async () => {
    const result = await runVerify(parseVerifyArgs(['door-is-open']), passRunners())
    const json = formatJson(result)
    const parsed = JSON.parse(JSON.stringify(json))
    expect(Object.keys(parsed).sort()).toEqual(['failed_at', 'layers_run', 'results', 'slug', 'summary'])
    expect(parsed.slug).toBe('door-is-open')
    expect(parsed.layers_run).toEqual(['L1', 'L2', 'L3'])
    expect(parsed.summary).toBe('verified')
    expect(parsed.failed_at).toBeNull()
    expect(parsed.results).toHaveLength(3)
    expect(Object.keys(parsed.results[0]).sort()).toEqual(['layer', 'reason', 'status'])
  })

  it('records failed_at and summary=failed when a layer fails', async () => {
    const runners: LayerRunners = {
      L1: async () => ({ layer: 'L1', status: 'pass', reason: null }),
      L2: async () => ({ layer: 'L2', status: 'fail', reason: 'oops' }),
      L3: async () => ({ layer: 'L3', status: 'pass', reason: null }),
      L4: async () => ({ layer: 'L4', status: 'pass', reason: null }),
    }
    const result = await runVerify(parseVerifyArgs(['door-is-open']), runners)
    const json = formatJson(result)
    expect(json.summary).toBe('failed')
    expect(json.failed_at).toBe('L2')
    expect(json.layers_run).toEqual(['L1', 'L2'])
  })
})

describe('verify --json includes perAgent + aggregate when L4 ran multi-runtime (task 4.1)', () => {
  it('exposes perAgent[] and aggregate object on the L4 result entry', async () => {
    const runners: LayerRunners = {
      L1: async () => ({ layer: 'L1', status: 'pass', reason: null }),
      L2: async () => ({ layer: 'L2', status: 'pass', reason: null }),
      L3: async () => ({ layer: 'L3', status: 'pass', reason: null }),
      L4: async () => ({
        layer: 'L4',
        status: 'fail',
        reason: 'divergent: see cross-agent report',
        perAgent: [
          { runtime: 'claude', verdict: 'pass', reason: 'match', flag: 'FLAG{x}' },
          { runtime: 'codex', verdict: 'fail', reason: 'flag mismatch', flag: 'FLAG{wrong}' },
          { runtime: 'gemini', verdict: 'inconclusive', reason: 'no flag', flag: null },
        ],
        aggregate: { verdict: 'fail', divergent: true, exitCode: 1 },
      }),
    }
    const result = await runVerify(
      parseVerifyArgs(['door-is-open', '--blind', '--agents', 'claude,codex,gemini']),
      runners,
    )
    const json = formatJson(result)
    const l4 = json.results.find((r) => r.layer === 'L4')!
    expect(Array.isArray(l4.perAgent)).toBe(true)
    expect(l4.perAgent).toHaveLength(3)
    expect(Object.keys(l4.perAgent![0]).sort()).toEqual(['flag', 'reason', 'runtime', 'verdict'])
    expect(l4.aggregate).toBeTypeOf('object')
    expect(l4.aggregate!.verdict).toBe('fail')
    expect(l4.aggregate!.divergent).toBe(true)
  })

  it('omits perAgent + aggregate when L4 ran single-runtime (back-compat)', async () => {
    const runners: LayerRunners = {
      L1: async () => ({ layer: 'L1', status: 'pass', reason: null }),
      L2: async () => ({ layer: 'L2', status: 'pass', reason: null }),
      L3: async () => ({ layer: 'L3', status: 'pass', reason: null }),
      L4: async () => ({ layer: 'L4', status: 'pass', reason: null }),
    }
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--blind']), runners)
    const json = formatJson(result)
    const l4 = json.results.find((r) => r.layer === 'L4')!
    expect(l4.perAgent).toBeUndefined()
    expect(l4.aggregate).toBeUndefined()
  })
})
