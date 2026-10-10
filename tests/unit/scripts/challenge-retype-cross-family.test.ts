import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge } from '../../../scripts/challenge-retype'

const FASTAPI_APP = 'from fastapi import FastAPI\napp = FastAPI()\n# vuln body here\n'
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

describe('retypeChallenge — cross-language fail-fast', () => {
  let projectRoot: string
  let slugDir: string
  let indexPath: string
  let appPath: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-cross-'))
    slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    indexPath = join(slugDir, 'index.md')
    appPath = join(slugDir, 'src', 'app.py')
    writeFileSync(indexPath, INDEX)
    writeFileSync(appPath, FASTAPI_APP)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('rejects fastapi → php with exit code 2 and leaves filesystem clean', () => {
    let keygenCalled = false
    const result = retypeChallenge(
      { slug: 'door-is-open', backend: 'php' },
      { projectRoot, runKeygen: () => { keygenCalled = true } },
    )

    expect(result.exitCode).toBe(2)
    expect(result.message).toContain('manual retype required')
    expect(keygenCalled).toBe(false)

    // Filesystem untouched: index.md and src/app.py unchanged byte-for-byte.
    expect(readFileSync(indexPath, 'utf8')).toBe(INDEX)
    expect(readFileSync(appPath, 'utf8')).toBe(FASTAPI_APP)
    expect(readdirSync(join(slugDir, 'src')).sort()).toEqual(['app.py', 'flag.txt'])
  })
})
