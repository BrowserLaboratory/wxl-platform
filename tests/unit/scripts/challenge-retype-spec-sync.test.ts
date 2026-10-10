import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge, syncSpecExploitPath } from '../../../scripts/challenge-retype'

const FASTAPI_APP = 'from fastapi import FastAPI\napp = FastAPI()\n'
const INDEX = [
  '---',
  'title: Door Is Open',
  'backend: fastapi',
  'app: app.py',
  'difficulty: easy',
  'category: web',
  '---',
  '',
  '# Body',
  '',
].join('\n')

const SPEC = `import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173/challenge/door-is-open/'
const FLAG_REGEX = /FLAG\\{[^}]+\\}/
const EXPLOIT_PATH = '/download?id=1'

test('door-is-open is solvable', async ({ page }) => {
  await page.goto(BASE_URL)
  const body = await page.evaluate(async () => {
    const r = await fetch('/download?id=1')
    return await r.text()
  })
  expect(body).toMatch(FLAG_REGEX)
})
`

describe('retypeChallenge — spec.ts EXPLOIT_PATH sync', () => {
  let projectRoot: string
  let specPath: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-spec-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'app.py'), FASTAPI_APP)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')

    const testsDir = join(projectRoot, 'tests', 'challenges')
    mkdirSync(testsDir, { recursive: true })
    specPath = join(testsDir, 'door-is-open.spec.ts')
    writeFileSync(specPath, SPEC)
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('preserves EXPLOIT_PATH on same-family swap (fastapi → flask)', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', backend: 'flask' },
      { projectRoot, runKeygen: () => {} },
    )
    expect(result.exitCode).toBe(0)
    // EXPLOIT_PATH unchanged; routes survive flask ↔ fastapi.
    expect(readFileSync(specPath, 'utf8')).toContain("const EXPLOIT_PATH = '/download?id=1'")
  })

  it('syncSpecExploitPath signals warning for cross-family swap', () => {
    const outcome = syncSpecExploitPath(specPath, 'fastapi', 'php')
    expect(outcome.kind).toBe('warning')
  })

  it('syncSpecExploitPath returns no-spec when file missing', () => {
    const outcome = syncSpecExploitPath('/tmp/does-not-exist.spec.ts', 'fastapi', 'flask')
    expect(outcome.kind).toBe('no-spec')
  })
})
