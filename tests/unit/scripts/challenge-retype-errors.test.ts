import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge, parseRetypeArgs, RetypeArgError } from '../../../scripts/challenge-retype'

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

describe('retypeChallenge — error paths', () => {
  let projectRoot: string
  let slugDir: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-err-'))
    slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'app.py'), 'from fastapi import FastAPI\napp = FastAPI()\n')
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('returns exit code 1 when slug not found', () => {
    const result = retypeChallenge(
      { slug: 'no-such-challenge', difficulty: 'hard' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(1)
    expect(result.message).toContain('not found')
  })

  it('rejects unknown --backend value and lists accepted values', () => {
    expect(() => parseRetypeArgs(['door-is-open', '--backend', 'rails'])).toThrow(RetypeArgError)
    try {
      parseRetypeArgs(['door-is-open', '--backend', 'rails'])
    } catch (err) {
      const e = err as RetypeArgError
      expect(e.exitCode).toBe(1)
      expect(e.message).toContain('flask')
      expect(e.message).toContain('fastapi')
      expect(e.message).toContain('php')
    }
  })

  it('returns exit code 3 when keygen throws', () => {
    const indexPath = join(slugDir, 'index.md')
    const before = readFileSync(indexPath, 'utf8')

    const result = retypeChallenge(
      { slug: 'door-is-open', backend: 'flask' },
      {
        projectRoot,
        runKeygen: () => { throw new Error('keygen exploded') },
      },
    )

    expect(result.exitCode).toBe(3)
    expect(result.message).toContain('keygen failed')
    // index.md has already been written before keygen runs — assertion is that
    // we surface exit 3 rather than silently swallowing.
    const indexAfter = readFileSync(indexPath, 'utf8')
    expect(indexAfter).toContain('backend: flask')
    expect(before).not.toBe(indexAfter)
  })

  it('rejects invocation without any mutation flag', () => {
    expect(() => parseRetypeArgs(['door-is-open'])).toThrow(RetypeArgError)
  })

  it('rejects invocation without slug', () => {
    expect(() => parseRetypeArgs(['--difficulty', 'hard'])).toThrow(RetypeArgError)
  })
})
