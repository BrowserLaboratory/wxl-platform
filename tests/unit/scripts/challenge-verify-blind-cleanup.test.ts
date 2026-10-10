import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyBlind } from '../../../scripts/challenge-verify-blind'

const INDEX = [
  '---',
  'title: Door Is Open',
  '---',
  '',
  '# Door Is Open',
  '',
  'IDOR challenge body.',
  '',
].join('\n')

const CANONICAL_FLAG = 'FLAG{door-is-open_abcd1234}'

describe('verifyBlind cleanup (task 5.8)', () => {
  let projectRoot: string
  let workDirRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cvb-cleanup-'))
    workDirRoot = mkdtempSync(join(tmpdir(), 'cvb-work-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), CANONICAL_FLAG)
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDirRoot, { recursive: true, force: true })
  })

  it('removes the ephemeral workDir at the end of a passing run', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: async () => true,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }),
    })
    expect(result.exitCode).toBe(0)
    expect(existsSync(workDirRoot)).toBe(false)
  })

  it('removes the ephemeral workDir even when the run fails', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: async () => true,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: 'FINAL_FLAG=FLAG{wrong}\n', stderr: '' }),
    })
    expect(result.exitCode).toBe(1)
    expect(existsSync(workDirRoot)).toBe(false)
  })

  it('removes the ephemeral workDir even when the run is inconclusive', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: async () => true,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: 'no flag\n', stderr: '' }),
    })
    expect(result.exitCode).toBe(2)
    expect(existsSync(workDirRoot)).toBe(false)
  })
})
