import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeDefaultRunners, runVerify, parseVerifyArgs } from '../../../scripts/challenge-verify'

describe('L3 layer (task 4.4)', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cv-L3-'))
    const specDir = join(projectRoot, 'tests', 'challenges')
    mkdirSync(specDir, { recursive: true })
    writeFileSync(join(specDir, 'door-is-open.spec.ts'), 'placeholder spec')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('assembles the spec path correctly and treats exit 0 as pass', async () => {
    const calls: { cmd: string; args: string[] }[] = []
    const spawn = (cmd: string, args: string[]) => {
      calls.push({ cmd, args })
      return { status: 0, stdout: '', stderr: '' }
    }
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L3']), runners)
    expect(result.results[0].status).toBe('pass')
    const playwrightCall = calls.find((c) => c.args.includes('playwright'))
    expect(playwrightCall).toBeTruthy()
    expect(playwrightCall!.args).toContain('tests/challenges/door-is-open.spec.ts')
  })

  it('propagates non-zero exit code as fail with stderr tail', async () => {
    const spawn = () => ({ status: 1, stdout: '', stderr: 'expected response to contain FLAG{...} but got <empty>\n' })
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L3']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toContain('playwright exit 1')
  })

  it('fails when spec file is missing', async () => {
    rmSync(join(projectRoot, 'tests', 'challenges', 'door-is-open.spec.ts'))
    const spawn = () => ({ status: 0, stdout: '', stderr: '' })
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L3']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toContain('spec not found')
  })
})
