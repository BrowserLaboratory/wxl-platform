import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
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
  'A file-sharing app with an IDOR vulnerability.',
  '',
].join('\n')

const CANONICAL_FLAG = 'FLAG{door-is-open_abcd1234}'

describe('verifyBlind orchestration (task 5.5)', () => {
  let projectRoot: string
  let workDirRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cvb-orch-'))
    workDirRoot = mkdtempSync(join(tmpdir(), 'cvb-work-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), CANONICAL_FLAG + '\n')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDirRoot, { recursive: true, force: true })
  })

  const preflightOk = async () => true
  const preflightDown = async () => false

  it('exit 0 / verdict=pass when agent emits matching FINAL_FLAG', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: `chatter\nFINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }),
    })
    expect(result.verdict).toBe('pass')
    expect(result.exitCode).toBe(0)
  })

  it('exit 1 / verdict=fail when agent emits wrong flag', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: 'FINAL_FLAG=FLAG{wrong-flag}\n', stderr: '' }),
    })
    expect(result.verdict).toBe('fail')
    expect(result.exitCode).toBe(1)
  })

  it('exit 2 / verdict=inconclusive when agent does not emit FINAL_FLAG', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: 'agent gave up\n', stderr: '' }),
    })
    expect(result.verdict).toBe('inconclusive')
    expect(result.exitCode).toBe(2)
  })

  it('exit 2 / verdict=inconclusive when dev server is unreachable', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightDown,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: '', stderr: '' }),
    })
    expect(result.verdict).toBe('inconclusive')
    expect(result.exitCode).toBe(2)
    expect(result.reason).toContain('dev server not reachable')
  })

  it('exit 2 with explicit reason when runtime CLI is missing on PATH', async () => {
    const enoent = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: null, stdout: '', stderr: '', error: enoent }),
    })
    expect(result.verdict).toBe('inconclusive')
    expect(result.reason).toContain('not found')
  })
})

describe('verifyBlind multi-runtime orchestration (l4-multi-agent-cross-check task 3.1)', () => {
  let projectRoot: string
  let workDirRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cvb-orch-multi-'))
    workDirRoot = mkdtempSync(join(tmpdir(), 'cvb-work-multi-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), CANONICAL_FLAG + '\n')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDirRoot, { recursive: true, force: true })
  })

  const preflightOk = async () => true

  it('spawns each runtime exactly once in its own workdir tmp/wxl-verify/<slug>/<runtime>/', async () => {
    const spawnLog: { cmd: string; workdir: string | undefined }[] = []
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude', 'codex', 'gemini'],
      preflight: preflightOk,
      workDirRoot,
      spawn: (cmd, args) => {
        // claude uses --add-dir <workdir>; codex/gemini use --working-dir <workdir>
        const dirFlag = cmd === 'claude' ? '--add-dir' : '--working-dir'
        const idx = args.indexOf(dirFlag)
        const workdir = idx >= 0 ? args[idx + 1] : undefined
        spawnLog.push({ cmd, workdir })
        return { status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }
      },
    })

    expect(spawnLog).toHaveLength(3)
    expect(spawnLog[0].cmd).toBe('claude')
    expect(spawnLog[1].cmd).toBe('codex')
    expect(spawnLog[2].cmd).toBe('gemini')
    expect(spawnLog[0].workdir).toBe(join(workDirRoot, 'claude'))
    expect(spawnLog[1].workdir).toBe(join(workDirRoot, 'codex'))
    expect(spawnLog[2].workdir).toBe(join(workDirRoot, 'gemini'))

    expect(result.verdict).toBe('pass')
    expect(result.exitCode).toBe(0)
    expect(result.perAgent).toHaveLength(3)
  })

  it('aggregates fail when any per-runtime verdict is fail', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude', 'codex', 'gemini'],
      preflight: preflightOk,
      workDirRoot,
      spawn: (cmd) => {
        if (cmd === 'claude') return { status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }
        if (cmd === 'codex') return { status: 0, stdout: 'FINAL_FLAG=FLAG{wrong}\n', stderr: '' }
        return { status: 0, stdout: 'no flag here\n', stderr: '' }
      },
    })

    expect(result.verdict).toBe('fail')
    expect(result.exitCode).toBe(1)
    expect(result.perAgent).toHaveLength(3)
    const codex = result.perAgent!.find((p) => p.runtime === 'codex')
    expect(codex?.verdict).toBe('fail')
    expect(codex?.flag).toBe('FLAG{wrong}')
    expect(result.aggregate?.divergent).toBe(true)
  })

  it('aggregates pass when at least one runtime passes and none fail', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude', 'codex', 'gemini'],
      preflight: preflightOk,
      workDirRoot,
      spawn: (cmd) => {
        if (cmd === 'claude') return { status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }
        return { status: 0, stdout: 'agent gave up\n', stderr: '' }
      },
    })

    expect(result.verdict).toBe('pass')
    expect(result.exitCode).toBe(0)
    expect(result.aggregate?.divergent).toBe(true)
  })

  it('aggregates inconclusive when no runtime extracts a flag', async () => {
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude', 'codex'],
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: 'nothing\n', stderr: '' }),
    })

    expect(result.verdict).toBe('inconclusive')
    expect(result.exitCode).toBe(2)
    expect(result.aggregate?.divergent).toBe(false)
  })

  it('cleans up the whole tmp/wxl-verify/<slug>/ tree after a multi-runtime run', async () => {
    await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude', 'codex'],
      preflight: preflightOk,
      workDirRoot,
      spawn: () => ({ status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }),
    })
    expect(existsSync(workDirRoot)).toBe(false)
  })
})

describe('verifyBlind single-runtime regression (l4-multi-agent-cross-check task 3.1)', () => {
  let projectRoot: string
  let workDirRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'cvb-orch-single-'))
    workDirRoot = mkdtempSync(join(tmpdir(), 'cvb-work-single-'))
    const slugDir = join(projectRoot, 'platform', 'challenge', 'door-is-open')
    mkdirSync(join(slugDir, 'src'), { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), INDEX)
    writeFileSync(join(slugDir, 'src', 'flag.txt'), CANONICAL_FLAG + '\n')
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
    rmSync(workDirRoot, { recursive: true, force: true })
  })

  const preflightOk = async () => true

  it('single-runtime list uses tmp/wxl-verify/<slug>/ (no <runtime> subdir)', async () => {
    const spawnLog: { workdir: string | undefined }[] = []
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtimes: ['claude'],
      preflight: preflightOk,
      workDirRoot,
      spawn: (_cmd, args) => {
        const idx = args.indexOf('--add-dir')
        spawnLog.push({ workdir: idx >= 0 ? args[idx + 1] : undefined })
        return { status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }
      },
    })

    expect(spawnLog).toHaveLength(1)
    // No <runtime> subdir for single-runtime lists — byte-identical with legacy.
    expect(spawnLog[0].workdir).toBe(workDirRoot)
    expect(result.verdict).toBe('pass')
    expect(result.exitCode).toBe(0)
    expect(result.runtime).toBe('claude')
  })

  it('legacy `runtime` field (no `runtimes`) keeps tmp/wxl-verify/<slug>/ workdir', async () => {
    const spawnLog: { workdir: string | undefined }[] = []
    const result = await verifyBlind({
      slug: 'door-is-open',
      projectRoot,
      runtime: 'claude',
      preflight: preflightOk,
      workDirRoot,
      spawn: (_cmd, args) => {
        const idx = args.indexOf('--add-dir')
        spawnLog.push({ workdir: idx >= 0 ? args[idx + 1] : undefined })
        return { status: 0, stdout: `FINAL_FLAG=${CANONICAL_FLAG}\n`, stderr: '' }
      },
    })

    expect(spawnLog[0].workdir).toBe(workDirRoot)
    expect(result.verdict).toBe('pass')
    expect(result.exitCode).toBe(0)
    expect(result.runtime).toBe('claude')
  })
})
