import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge, parseRetypeArgs, RetypeArgError } from '../../../scripts/challenge-retype'

const DECLARATION = [
  'backend: fastapi',
  'app: app.py',
  'difficulty: easy',
  'category: web',
  '',
].join('\n')

describe('retypeChallenge — error paths', () => {
  let projectRoot: string
  let slugDir: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-err-'))
    slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'challenge.yaml'), DECLARATION)
    writeFileSync(join(slugDir, 'src', 'app.py'), 'from fastapi import FastAPI\napp = FastAPI()\n')
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  // Y63 (RT1): the existence check is on challenge.yaml; a brief alone is not a challenge.
  function snapshot(dir: string): Record<string, string> {
    const out: Record<string, string> = {}
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else out[p] = readFileSync(p).toString('base64')
      }
    }
    walk(dir)
    return out
  }

  it.each([
    ['no directory and no brief', () => {}],
    ['only the briefs of both locales', (root: string) => {
      for (const locale of ['zh-TW', 'en']) {
        const dir = join(root, 'platform', locale, 'challenge', 'no-such-challenge')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.md'), '---\ntitle: Ghost\n---\n')
      }
    }],
  ])('returns exit code 1 when slug not found: %s (RT1)', (_label, shape) => {
    shape(projectRoot)
    const before = snapshot(projectRoot)
    const result = retypeChallenge(
      { slug: 'no-such-challenge', difficulty: 'hard' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(1)
    expect(result.message).toBe(
      `Challenge no-such-challenge not found at ${join(projectRoot, 'platform', 'challenge', 'no-such-challenge', 'challenge.yaml')}`,
    )
    expect(snapshot(projectRoot)).toEqual(before)
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
    const declarationPath = join(slugDir, 'challenge.yaml')
    const before = readFileSync(declarationPath, 'utf8')

    const result = retypeChallenge(
      { slug: 'door-is-open', backend: 'flask' },
      {
        projectRoot,
        runKeygen: () => { throw new Error('keygen exploded') },
      },
    )

    expect(result.exitCode).toBe(3)
    expect(result.message).toContain('keygen failed')
    // challenge.yaml has already been written before keygen runs — assertion is that
    // we surface exit 3 rather than silently swallowing.
    const declarationAfter = readFileSync(declarationPath, 'utf8')
    expect(declarationAfter).toContain('backend: flask')
    expect(before).not.toBe(declarationAfter)
  })

  it('rejects invocation without any mutation flag', () => {
    expect(() => parseRetypeArgs(['door-is-open'])).toThrow(RetypeArgError)
  })

  it('rejects invocation without slug', () => {
    expect(() => parseRetypeArgs(['--difficulty', 'hard'])).toThrow(RetypeArgError)
  })
})
