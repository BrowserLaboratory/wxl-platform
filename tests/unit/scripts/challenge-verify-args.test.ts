import { describe, it, expect } from 'vitest'
import { parseVerifyArgs, VerifyArgError, selectLayers } from '../../../scripts/challenge-verify'

describe('parseVerifyArgs (task 4.1)', () => {
  it('accepts --blind --layers L1,L4 --json without parse error', () => {
    const args = parseVerifyArgs(['door-is-open', '--blind', '--layers', 'L1,L4', '--json'])
    expect(args.slug).toBe('door-is-open')
    expect(args.blind).toBe(true)
    expect(args.layers).toEqual(['L1', 'L4'])
    expect(args.json).toBe(true)
  })

  it('defaults blind=false, json=false, layers=undefined', () => {
    const args = parseVerifyArgs(['door-is-open'])
    expect(args.blind).toBe(false)
    expect(args.json).toBe(false)
    expect(args.layers).toBeUndefined()
  })

  it('rejects missing slug', () => {
    expect(() => parseVerifyArgs(['--blind'])).toThrow(VerifyArgError)
  })

  it('rejects invalid --layers entry', () => {
    expect(() => parseVerifyArgs(['door-is-open', '--layers', 'L5'])).toThrow(VerifyArgError)
  })

  it('selectLayers defaults to L1+L2+L3 without --blind', () => {
    const args = parseVerifyArgs(['door-is-open'])
    expect(selectLayers(args)).toEqual(['L1', 'L2', 'L3'])
  })

  it('selectLayers adds L4 with --blind', () => {
    const args = parseVerifyArgs(['door-is-open', '--blind'])
    expect(selectLayers(args)).toEqual(['L1', 'L2', 'L3', 'L4'])
  })

  it('selectLayers honors explicit --layers subset', () => {
    const args = parseVerifyArgs(['door-is-open', '--layers', 'L1,L3'])
    expect(selectLayers(args)).toEqual(['L1', 'L3'])
  })
})

describe('parseVerifyArgs --agents (l4-multi-agent-cross-check task 4.1)', () => {
  it('parses --agents claude,codex,gemini into a 3-element list', () => {
    const args = parseVerifyArgs(['door-is-open', '--blind', '--agents', 'claude,codex,gemini'])
    expect(args.agents).toEqual(['claude', 'codex', 'gemini'])
  })

  it('trims whitespace and removes duplicates while preserving first-occurrence order', () => {
    const args = parseVerifyArgs(['door-is-open', '--blind', '--agents', 'gemini, claude , gemini'])
    expect(args.agents).toEqual(['gemini', 'claude'])
  })

  it('rejects --agents without --blind', () => {
    expect(() =>
      parseVerifyArgs(['door-is-open', '--agents', 'claude,codex']),
    ).toThrow(VerifyArgError)
  })

  it('rejects --agents with an unknown runtime', () => {
    expect(() =>
      parseVerifyArgs(['door-is-open', '--blind', '--agents', 'claude,copilot']),
    ).toThrow(VerifyArgError)
  })

  it('leaves args.agents undefined when --agents is not provided', () => {
    const args = parseVerifyArgs(['door-is-open', '--blind'])
    expect(args.agents).toBeUndefined()
  })
})
