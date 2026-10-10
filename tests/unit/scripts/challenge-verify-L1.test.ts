import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeDefaultRunners, formatHuman, runVerify, parseVerifyArgs } from '../../../scripts/challenge-verify'

const INDEX = [
  '---',
  'title: "Door Is Open"',
  'number: 1',
  'layout: challenge',
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
  'source_visible: false',
  '---',
  '',
  '# Door',
].join('\n')

describe('L1 layer (task 4.2)', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cv-L1-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open', 'src')
    mkdirSync(slugDir, { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'challenge', 'door-is-open', 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'app.py'), 'from fastapi import FastAPI')
    writeFileSync(join(slugDir, 'flag.txt'), 'FLAG{test_case}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('passes for a well-formed challenge and surfaces "✓ L1 passed"', async () => {
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].layer).toBe('L1')
    expect(result.results[0].status).toBe('pass')
    expect(formatHuman(result)).toContain('✓ L1 passed')
  })

  it('fails when index.md is missing', async () => {
    rmSync(join(projectRoot, 'platform', 'challenge', 'door-is-open', 'index.md'))
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toContain('not found')
  })
})
