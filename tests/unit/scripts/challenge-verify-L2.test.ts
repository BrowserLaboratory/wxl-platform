import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeDefaultRunners, formatHuman, runVerify, parseVerifyArgs } from '../../../scripts/challenge-verify'

const INDEX = [
  '---',
  'title: "Door Is Open"',
  'layout: challenge',
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
  'packages: []',
  'source_visible: false',
  '---',
  '',
  '# Door',
].join('\n')

const FASTAPI_APP = `"""Door is open."""
from fastapi import FastAPI
app = FastAPI()
flag = open('/flag.txt').read().strip()
`

interface FakeSpawnCall { cmd: string; args: string[] }

function makeFakeSpawn(plan: { [key: string]: { status: number; stdout?: string; stderr?: string } }) {
  const calls: FakeSpawnCall[] = []
  const spawn = (cmd: string, args: string[]) => {
    calls.push({ cmd, args })
    const key = args[0] ?? ''
    const outcome = plan[key] ?? { status: 0, stdout: '', stderr: '' }
    return {
      status: outcome.status,
      stdout: outcome.stdout ?? '',
      stderr: outcome.stderr ?? '',
    }
  }
  return { spawn, calls }
}

describe('L2 layer (task 4.3)', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cv-L2-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open', 'src')
    mkdirSync(slugDir, { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'challenge', 'door-is-open', 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'app.py'), FASTAPI_APP)
    writeFileSync(join(slugDir, 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('passes when keygen exits 0 and wasm-tools validate exits 0', async () => {
    const { spawn, calls } = makeFakeSpawn({
      'challenge:keygen': { status: 0 },
      'validate': { status: 0 },
    })
    const runners = makeDefaultRunners({ projectRoot, spawn })
    // Pre-write runtime.wasm so the existence check after keygen passes.
    mkdirSync(join(projectRoot, 'platform', 'public', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'public', 'challenge', 'door-is-open', 'runtime.wasm'), 'WASM')

    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('pass')
    expect(formatHuman(result)).toContain('✓ L2 passed')
    expect(calls.find((c) => c.args[0] === 'challenge:keygen')).toBeTruthy()
    expect(calls.find((c) => c.cmd === 'wasm-tools' && c.args[0] === 'validate')).toBeTruthy()
  })

  it('fails with explicit reason when keygen exits non-zero', async () => {
    const { spawn } = makeFakeSpawn({
      'challenge:keygen': { status: 7, stderr: 'keygen broke' },
    })
    const runners = makeDefaultRunners({ projectRoot, spawn })

    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toContain('keygen exit 7')
    expect(formatHuman(result).some((l) => l.startsWith('✗ L2 failed:'))).toBe(true)
  })

  it('fails when wasm-tools validate exits non-zero', async () => {
    const { spawn } = makeFakeSpawn({
      'challenge:keygen': { status: 0 },
      'validate': { status: 1, stderr: 'invalid wasm' },
    })
    const runners = makeDefaultRunners({ projectRoot, spawn })
    mkdirSync(join(projectRoot, 'platform', 'public', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'public', 'challenge', 'door-is-open', 'runtime.wasm'), 'WASM')

    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toContain('wasm-tools validate exit 1')
  })
})
