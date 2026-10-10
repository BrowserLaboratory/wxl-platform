import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge } from '../../../scripts/challenge-retype'

const SAMPLE_INDEX = [
  '---',
  'title: Door Is Open',
  'layout: challenge',
  'difficulty: easy',
  'category: web',
  'backend: fastapi',
  'app: app.py',
  'packages: []',
  'tools: [ browser, network, repeater, code ]',
  'source_visible: false',
  'date: 2026-04-02T08:54:17.674Z',
  'tags: [ idor, access-control, fastapi, sqlite ]',
  'description: A file-sharing app with an IDOR vulnerability.',
  'wasmModule: /challenge/door-is-open/runtime.wasm',
  '---',
  '',
  '# Door Is Open',
  '',
  'FileHub is a simple file-sharing platform.',
  '',
].join('\n')

describe('retypeChallenge — frontmatter-only mutations', () => {
  let projectRoot: string
  let indexPath: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-meta-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    indexPath = join(slugDir, 'index.md')
    writeFileSync(indexPath, SAMPLE_INDEX)
    writeFileSync(join(slugDir, 'src', 'app.py'), 'from fastapi import FastAPI\napp = FastAPI()\n')
    writeFileSync(join(slugDir, 'src', 'flag.txt'), 'FLAG{test}')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('changes difficulty in place without touching anything else', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', difficulty: 'hard' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    const after = readFileSync(indexPath, 'utf8')
    expect(after).toContain('difficulty: hard')
    expect(after).not.toContain('difficulty: easy')
    // Inline array style preserved
    expect(after).toContain('tools: [ browser, network, repeater, code ]')
    expect(after).toContain('tags: [ idor, access-control, fastapi, sqlite ]')
    // Body intact
    expect(after).toContain('# Door Is Open')
    expect(after).toContain('FileHub is a simple file-sharing platform.')
  })

  it('replaces tags array', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', tags: ['sqli', 'flask'] },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    const after = readFileSync(indexPath, 'utf8')
    expect(after).toMatch(/tags:\s*\n\s*-\s*sqli\n\s*-\s*flask/)
    expect(after).not.toContain('idor')
  })

  it('changes category', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', category: 'pwn' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    expect(readFileSync(indexPath, 'utf8')).toContain('category: pwn')
  })

  it('applies multiple frontmatter flags in a single invocation', () => {
    const result = retypeChallenge(
      { slug: 'door-is-open', difficulty: 'medium', category: 'crypto' },
      { projectRoot },
    )
    expect(result.exitCode).toBe(0)
    const after = readFileSync(indexPath, 'utf8')
    expect(after).toContain('difficulty: medium')
    expect(after).toContain('category: crypto')
    // backend untouched (no --backend flag)
    expect(after).toContain('backend: fastapi')
  })
})
