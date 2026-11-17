import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs'
import { resolve } from 'node:path'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeDefaultRunners, formatHuman, runVerify, parseVerifyArgs } from '../../../scripts/challenge-verify'

const DECLARATION = [
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
  'packages: []',
  'source_visible: false',
  '',
].join('\n')

const BRIEF = [
  '---',
  'title: "Door Is Open"',
  'layout: challenge',
  '---',
  '',
  '# Door',
].join('\n')

// Messages as in 5a's Y36 table (the text is `.vitepress/primary-locale.ts`'s own).
const RANGE_FAULTS: Array<[string, (path: string) => void, string]> = [
  ['PL-E01 range.json is a folder', (p) => mkdirSync(p), 'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'],
  ['PL-E03 not valid JSON', (p) => writeFileSync(p, '{'), 'PL-E03: range.json is not valid JSON.'],
  ['PL-E04 not an object', (p) => writeFileSync(p, '[]'), 'PL-E04: range.json does not hold a JSON object.'],
  ['PL-E05 not a string', (p) => writeFileSync(p, '{"primaryLocale":7}'), 'PL-E05: "primaryLocale" in range.json is not a string: 7.'],
  ['PL-E06 not on the list', (p) => writeFileSync(p, '{"primaryLocale":"ja"}'), 'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.'],
]
const E02: [string, (path: string) => void, string] = [
  'PL-E02 mode 000',
  (p) => { writeFileSync(p, '{}'); chmodSync(p, 0o000) },
  'PL-E02: range.json could not be read (EACCES).',
]

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
    writeFileSync(join(projectRoot, 'platform', 'challenge', 'door-is-open', 'challenge.yaml'), DECLARATION)
    mkdirSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md'), BRIEF)
    writeFileSync(join(slugDir, 'app.py'), FASTAPI_APP)
    writeFileSync(join(slugDir, 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    try { chmodSync(join(projectRoot, 'range.json'), 0o600) } catch { /* absent or a folder */ }
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('Y87: challenge.yaml absent → VF1, keygen never spawned', async () => {
    rmSync(join(projectRoot, 'platform', 'challenge', 'door-is-open', 'challenge.yaml'))
    const { spawn, calls } = makeFakeSpawn({})
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(
      `challenge.yaml not found: ${join(projectRoot, 'platform', 'challenge', 'door-is-open', 'challenge.yaml')}`,
    )
    expect(calls).toEqual([])
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

  it.each(RANGE_FAULTS)('Y109: %s → L2 fails with the PL line, keygen never spawned', async (_label, make, line) => {
    make(join(projectRoot, 'range.json'))
    const { spawn, calls } = makeFakeSpawn({})
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(line)
    expect(calls).toEqual([])
  })

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('Y109: PL-E02 mode 000 → L2 fails with the PL line, keygen never spawned', async () => {
    E02[1](join(projectRoot, 'range.json'))
    const { spawn, calls } = makeFakeSpawn({})
    const runners = makeDefaultRunners({ projectRoot, spawn })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L2']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(E02[2])
    expect(calls).toEqual([])
  })
})
