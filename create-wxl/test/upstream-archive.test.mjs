// Upstream configuration U1 and the archive entry rules run against upstream's own `git archive
// HEAD` (traceability.md "Upstream configuration", C44/AC-20). `create-wxl/test/` exists only
// upstream (U1 excludes it from an exported range), so this file needs no upstream skip.

import { describe, it, expect } from 'vitest'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Parser } from 'tar'
import { run } from '../src/run.mjs'
import { makeDeps, PACKAGE_VERSION, ENGINE_FILE, ENGINE_SHA256 } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const GITATTRIBUTES_PATH = join(REPO_ROOT, '.gitattributes')

describe('U1', () => {
  it('.gitattributes is exactly U1', async () => {
    const content = await readFile(GITATTRIBUTES_PATH, 'utf8')
    const expected = [
      "# Keep template text and recorded upstream checksums stable across checkouts; keep upstream's own records out of ranges.",
      '* text=auto eol=lf',
      '/.proj.specs/** export-ignore',
      '/.proj.specs/OPEN-QUESTIONS.md -export-ignore',
      '/.proj.tickets export-ignore',
      '/create-wxl export-ignore',
      '',
    ].join('\n')
    expect(content).toBe(expected)
  })
})

describe('git archive HEAD', () => {
  it(
    "upstream's own git archive HEAD passes entry rules 1-5 and holds only the allowed .proj.specs/ entries",
    { timeout: 120000 },
    async () => {
      const name = engineModule.UPSTREAM_SLUG.split('/')[1]

      const isolatedHome = await mkdtemp(join(tmpdir(), 'create-wxl-git-home-'))
      const outFile = join(isolatedHome, 'archive.tar.gz')
      try {
        // S-09: every git invocation in this test uses the SAME isolated env, not only the
        // `archive` call -- `rev-parse` can be influenced by the user's own git config too
        // (an `include` directive, `GIT_DIR`, ...).
        const env = {
          HOME: isolatedHome,
          XDG_CONFIG_HOME: isolatedHome,
          PATH: process.env.PATH,
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_ATTR_NOSYSTEM: '1',
        }
        const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, env, encoding: 'utf8' }).stdout.trim()
        expect(head).toMatch(/^[0-9a-f]{40}$/)

        const result = spawnSync(
          'git',
          ['archive', '--format=tar.gz', `--prefix=${name}-${head}/`, '-o', outFile, 'HEAD'],
          { cwd: REPO_ROOT, env },
        )
        expect(result.status).toBe(0)

        const body = await readFile(outFile)

        // The path list, independent of create-wxl's own run (for the `.proj.specs/`/
        // `.proj.tickets/`/`create-wxl/` assertions D4's isolation and C44 both need).
        const paths = await new Promise((resolvePaths, reject) => {
          const parser = new Parser({ strict: true })
          const list = []
          parser.on('entry', (e) => {
            list.push(e.header.path)
            e.resume()
          })
          parser.on('ignoredEntry', (e) => list.push(e.header.path))
          parser.on('error', reject)
          parser.on('end', () => resolvePaths(list))
          parser.end(body)
        })
        const prefix = `${name}-${head}/`
        const relPaths = paths.map((p) => p.slice(prefix.length))

        const specsPaths = relPaths.filter((p) => p.startsWith('.proj.specs/'))
        expect(new Set(specsPaths)).toEqual(new Set(['.proj.specs/', '.proj.specs/OPEN-QUESTIONS.md']))
        expect(relPaths.some((p) => p.startsWith('.proj.tickets/') || p === '.proj.tickets')).toBe(false)
        expect(relPaths.some((p) => p.startsWith('create-wxl/') || p === 'create-wxl')).toBe(false)

        const normalized = relPaths.map((p) => (p.endsWith('/') ? p.slice(0, -1) : p).normalize('NFC').toLowerCase())
        expect(new Set(normalized).size).toBe(normalized.length)

        const tmpRoot = await makeTmpRoot()
        try {
          const fetchArchive = async () => ({ status: 200, body })
          const deps = makeDeps({
            env: { LANG: 'en_US' },
            cwd: tmpRoot,
            fetchArchive,
            source: {
              repository: engineModule.UPSTREAM_SLUG,
              version: PACKAGE_VERSION,
              commit: head,
              engineSha256: ENGINE_SHA256,
            },
            engineFile: ENGINE_FILE,
          })
          const ioHelper = makeIo()
          const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)

          expect(ioHelper.stderrText.startsWith('CW-E08')).toBe(false)
          expect(ioHelper.stderrText.startsWith('CW-E10')).toBe(false)
          expect(exitCode).toBe(0)
        } finally {
          await rm(tmpRoot, { recursive: true, force: true })
        }
      } finally {
        await rm(isolatedHome, { recursive: true, force: true })
      }
    },
  )
})
