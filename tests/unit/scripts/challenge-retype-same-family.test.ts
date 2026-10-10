import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { retypeChallenge } from '../../../scripts/challenge-retype'

const FASTAPI_APP = `"""Door Is Open — IDOR via file download endpoint."""

import sqlite3
from urllib.parse import parse_qs
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response

app = FastAPI()

VULN_SQL = "SELECT filename, content FROM files WHERE id = ?"
VULN_TEMPLATE = "<a href=\\"/download?id={{ f.id }}\\">Download</a>"
`

const INDEX = [
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
].join('\n')

describe('retypeChallenge — same Python family backend swap', () => {
  let projectRoot: string
  let slugDir: string
  let indexPath: string
  let appPath: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'challenge-retype-same-'))
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

  function vulnBodyHash(source: string): string {
    // Strip framework import header + bootstrap line to obtain the vuln body
    // shared across fastapi / flask.
    const stripped = source
      .replace(/from\s+(fastapi|flask)[^\n]*\n/g, '')
      .replace(/from\s+fastapi\.responses[^\n]*\n/g, '')
      .replace(/app\s*=\s*(FastAPI|Flask)[^\n]*\n/g, '')
    return createHash('sha256').update(stripped).digest('hex')
  }

  it('rewrites fastapi → flask import header and preserves vuln body hash', () => {
    const beforeHash = vulnBodyHash(FASTAPI_APP)

    let keygenSlug: string | undefined
    const result = retypeChallenge(
      { slug: 'door-is-open', backend: 'flask' },
      { projectRoot, runKeygen: (s) => { keygenSlug = s } },
    )

    expect(result.exitCode).toBe(0)
    expect(keygenSlug).toBe('door-is-open')

    const after = readFileSync(appPath, 'utf8')
    expect(after).not.toMatch(/from\s+fastapi/)
    expect(after).toMatch(/from\s+flask/)
    expect(after).toContain('app = Flask(__name__)')
    expect(vulnBodyHash(after)).toBe(beforeHash)

    const indexAfter = readFileSync(indexPath, 'utf8')
    expect(indexAfter).toContain('backend: flask')
    expect(indexAfter).toContain('app: app.py')
  })
})
