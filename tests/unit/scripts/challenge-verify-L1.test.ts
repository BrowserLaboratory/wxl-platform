import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeDefaultRunners, formatHuman, runVerify, parseVerifyArgs } from '../../../scripts/challenge-verify'

const DECLARATION = [
  'number: 1',
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
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

describe('L1 layer (task 4.2)', () => {
  let projectRoot: string
  const challengeDir = () => join(projectRoot, 'platform', 'challenge', 'door-is-open')
  const rangeJson = () => join(projectRoot, 'range.json')

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cv-L1-'))
    const srcDir = join(challengeDir(), 'src')
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(challengeDir(), 'challenge.yaml'), DECLARATION)
    mkdirSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open'), { recursive: true })
    writeFileSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md'), BRIEF)
    writeFileSync(join(srcDir, 'app.py'), 'from fastapi import FastAPI')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test_case}')
  })

  afterEach(() => {
    try { chmodSync(rangeJson(), 0o600) } catch { /* absent or a folder */ }
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

  it('Y86: challenge.yaml absent → VF1', async () => {
    rmSync(join(challengeDir(), 'challenge.yaml'))
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(
      `challenge.yaml not found: ${join(projectRoot, 'platform', 'challenge', 'door-is-open', 'challenge.yaml')}`,
    )
  })

  it('Y86: present and failing → validate failed: <failed labels>', async () => {
    rmSync(join(projectRoot, 'platform', 'zh-TW', 'challenge', 'door-is-open', 'index.md'))
    const runners = makeDefaultRunners({ projectRoot })
    let result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe('validate failed: brief (zh-TW)')

    rmSync(join(challengeDir(), 'src', 'flag.txt'))
    result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe('validate failed: flag, brief (zh-TW)')
  })

  it.each(RANGE_FAULTS)('Y109: %s → L1 fails with the PL line', async (_label, make, line) => {
    make(rangeJson())
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(line)
  })

  it('Y109 (D123): range.json unusable and no challenge.yaml → the PL line, not VF1', async () => {
    rmSync(join(challengeDir(), 'challenge.yaml'))
    const [, make, line] = RANGE_FAULTS.find(([label]) => label.startsWith('PL-E03'))!
    make(rangeJson())
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe('PL-E03: range.json is not valid JSON.')
    expect(line).toBe('PL-E03: range.json is not valid JSON.')
  })

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('Y109: PL-E02 mode 000 → L1 fails with the PL line', async () => {
    E02[1](rangeJson())
    const runners = makeDefaultRunners({ projectRoot })
    const result = await runVerify(parseVerifyArgs(['door-is-open', '--layers', 'L1']), runners)
    expect(result.results[0].status).toBe('fail')
    expect(result.results[0].reason).toBe(E02[2])
  })
})
