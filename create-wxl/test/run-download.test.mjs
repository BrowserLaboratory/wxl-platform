import { describe, it, expect } from 'vitest'
import { rm, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { run } from '../src/run.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const EXPECTED_URL = `https://codeload.github.com/${engineModule.UPSTREAM_SLUG}/tar.gz/${FIXED_COMMIT}`

describe('download failures', () => {
  async function runCase(tmpRoot, { fetchArchive, downloadTimeoutMs }) {
    const target = join(tmpRoot, 'range')
    const before = await snapshotTree(tmpRoot)
    const { fs, calls } = recordingFs()
    let capturedSignal
    const wrapped = (repo, ref, opts) => {
      capturedSignal = opts.signal
      return fetchArchive(repo, ref, opts)
    }
    const deps = makeDeps({ cwd: tmpRoot, fs, fetchArchive: wrapped, downloadTimeoutMs })
    const ioHelper = makeIo()
    const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
    const after = await snapshotTree(tmpRoot)
    const mkdtempCalls = calls.filter((c) => c.method === 'mkdtemp')
    const parentNames = await readdir(dirname(target)).catch(() => [])
    return { exitCode, ioHelper, deps, calls, before, after, mkdtempCalls, parentNames, capturedSignal }
  }

  /** Common to every case (S-08/P-09): named URL, no temporary directory created or left behind,
   * and the target's parent is exactly as it was. */
  function expectCommonFailure({ exitCode, ioHelper, mkdtempCalls, parentNames, before, after }) {
    expect(exitCode).toBe(1)
    expect(ioHelper.stderrText).toMatch(/^CW-E07/m)
    expect(ioHelper.stderrText).toContain(JSON.stringify(EXPECTED_URL))
    expect(mkdtempCalls).toEqual([])
    expect(parentNames.some((n) => n.startsWith('.create-wxl-'))).toBe(false)
    expect(after).toEqual(before)
  }

  it('fetchArchive rejects (network error) -> CW-E07 naming the URL', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runCase(tmpRoot, {
        fetchArchive: async () => {
          throw new Error('ECONNRESET')
        },
      })
      expectCommonFailure(result)
      expect(result.ioHelper.stderrText).toContain('ECONNRESET')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('fetchArchive rejects with an AbortError mid-body -> CW-E07', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runCase(tmpRoot, {
        fetchArchive: async () => {
          throw new DOMException('aborted', 'AbortError')
        },
      })
      expectCommonFailure(result)
      expect(result.ioHelper.stderrText).toContain('aborted')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('fetchArchive resolves status 404 -> CW-E07 naming the URL and 404', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const result = await runCase(tmpRoot, {
        fetchArchive: async () => ({ status: 404, body: new Uint8Array() }),
      })
      expectCommonFailure(result)
      expect(result.ioHelper.stderrText).toContain('404')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it(
    'fetchArchive respects the abort signal and never delivers the body -> CW-E07 within the time limit',
    { timeout: 2000 },
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = (_repo, _ref, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          })

        const result = await runCase(tmpRoot, { fetchArchive, downloadTimeoutMs: 20 })
        expectCommonFailure(result)
        expect(result.capturedSignal.aborted).toBe(true)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )

  it(
    'fetchArchive ignores the abort signal and never settles -> run still finishes within the time limit',
    { timeout: 2000 },
    async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const fetchArchive = () => new Promise(() => {}) // never settles, ignores the signal entirely

        const result = await runCase(tmpRoot, { fetchArchive, downloadTimeoutMs: 20 })
        expectCommonFailure(result)
        expect(result.capturedSignal.aborted).toBe(true)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
  )
})
