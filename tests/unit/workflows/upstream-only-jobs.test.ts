import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { UPSTREAM_SLUG } from '../../../scripts/fork-init'

// T71-T72/AC-C2/AC-C3: the release job and the new cross-OS job must run only in the upstream
// repository, never in a fork (rebranded or not) — including after a `--rebrand` run, which cannot
// reach these lines at all (they spell the slug through `format`, never importing UPSTREAM_SLUG,
// since a workflow YAML cannot import a TS module; traceability.md, "confinement"). The expected
// value is built from the two halves of UPSTREAM_SLUG, not its full literal, so this file itself
// never spells the slug.
// The `test` job, the new job (fork-init-cross-os) and the `release` job all set
// `WXL_EXPECT_UPSTREAM` to the same comparison (T71, revision 2.3).
// `format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')` appears five times across the two
// workflow files — two `if:` lines (release.yml's `release` job, quality-gates.yml's new job) and
// three `env:` lines (quality-gates.yml's `test` job and new job, release.yml's `release` job) —
// listed here so a future rename of the slug has every occurrence to check off against.
const [UPSTREAM_OWNER, UPSTREAM_NAME] = UPSTREAM_SLUG.split('/')
const EXPECTED_IF = `github.repository == format('{0}/{1}', '${UPSTREAM_OWNER}', '${UPSTREAM_NAME}')`
const EXPECTED_ENV = '${{ ' + EXPECTED_IF + ' }}'

const RELEASE_PATH = resolve(__dirname, '../../../.github/workflows/release.yml')
const QUALITY_GATES_PATH = resolve(__dirname, '../../../.github/workflows/quality-gates.yml')
const NEW_JOB_ID = 'fork-init-cross-os'

interface Job {
  if?: string
  env?: Record<string, unknown>
  'runs-on'?: unknown
  strategy?: { matrix?: { include?: Array<Record<string, unknown>> } }
  steps?: Array<{ name?: string; uses?: string; run?: string; with?: Record<string, unknown> }>
}
interface Workflow {
  jobs: Record<string, Job>
}

function loadRelease(): Workflow {
  return parse(readFileSync(RELEASE_PATH, 'utf8')) as Workflow
}
function loadQualityGates(): Workflow {
  return parse(readFileSync(QUALITY_GATES_PATH, 'utf8')) as Workflow
}

describe('upstream-only jobs (T71)', () => {
  it("release.yml's release job if: is exactly the format() comparison", () => {
    expect(loadRelease().jobs.release.if).toBe(EXPECTED_IF)
  })

  it(`quality-gates.yml's ${NEW_JOB_ID} job if: is exactly the format() comparison`, () => {
    expect(loadQualityGates().jobs[NEW_JOB_ID].if).toBe(EXPECTED_IF)
  })

  it("quality-gates.yml's test job sets WXL_EXPECT_UPSTREAM to the same comparison", () => {
    expect(loadQualityGates().jobs.test.env?.WXL_EXPECT_UPSTREAM).toBe(EXPECTED_ENV)
  })

  it(`quality-gates.yml's ${NEW_JOB_ID} job sets WXL_EXPECT_UPSTREAM to the same comparison`, () => {
    expect(loadQualityGates().jobs[NEW_JOB_ID].env?.WXL_EXPECT_UPSTREAM).toBe(EXPECTED_ENV)
  })

  it("release.yml's release job sets WXL_EXPECT_UPSTREAM to the same comparison", () => {
    expect(loadRelease().jobs.release.env?.WXL_EXPECT_UPSTREAM).toBe(EXPECTED_ENV)
  })
})

describe(`${NEW_JOB_ID} (T72)`, () => {
  const job = () => loadQualityGates().jobs[NEW_JOB_ID]

  it('is a job in quality-gates.yml', () => {
    expect(job()).toBeDefined()
  })

  it('declares exactly the four expected matrix entries', () => {
    const include = job().strategy?.matrix?.include ?? []
    const normalised = include.map((entry) => `${entry.os}/${entry['node-version']}`).sort()
    expect(normalised).toEqual(
      ['windows-latest/24', 'macos-latest/24', 'ubuntu-latest/24', 'ubuntu-latest/22'].sort(),
    )
  })

  it('derives runs-on and the setup-node node-version from the matrix', () => {
    expect(job()['runs-on']).toBe('${{ matrix.os }}')
    const setupNode = job().steps?.find((s) => s.uses?.startsWith('actions/setup-node@'))
    expect(setupNode?.with?.['node-version']).toBe('${{ matrix.node-version }}')
  })

  it('has a step running exactly the fork-init and upstream-guard test files', () => {
    const steps = job().steps ?? []
    const runSteps = steps.filter((s) => s.run !== undefined).map((s) => s.run)
    expect(runSteps).toContain('pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts')
  })

  // T-0025/U3: create-wxl's own tests get a pinned CI step too, after the existing one.
  it('has a step pinning the create-wxl test run', () => {
    const steps = job().steps ?? []
    const runSteps = steps.filter((s) => s.run !== undefined).map((s) => s.run)
    expect(runSteps).toContain('pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test')
  })

  it('installs no Rust toolchain, rust-cache, install-action or binaryen step', () => {
    const steps = job().steps ?? []
    const usesList = steps.map((s) => s.uses).filter((u): u is string => u !== undefined)
    expect(usesList.some((u) => u.startsWith('dtolnay/rust-toolchain@'))).toBe(false)
    expect(usesList.some((u) => u.startsWith('Swatinem/rust-cache@'))).toBe(false)
    expect(usesList.some((u) => u.startsWith('taiki-e/install-action@'))).toBe(false)
    expect(usesList.some((u) => u === './.github/actions/install-binaryen')).toBe(false)
  })
})

// T72/AC-C3: "the set of jobs using them is unchanged" — fork-init-cross-os installs neither
// action (asserted above), and every OTHER job that does is still exactly the five jobs
// toolchain-parity.test.ts already pins by its install-action/binaryen sets (quality-gates.yml:
// test, build, site-smoke, challenge-verify; release.yml: release) — confirmed directly against
// `git show 1f4096a:.github/workflows/{quality-gates,release}.yml` (main, before this ticket).
describe('dtolnay/rust-toolchain and Swatinem/rust-cache job sets (T72)', () => {
  const EXPECTED_JOBS = [
    'quality-gates.yml › build',
    'quality-gates.yml › challenge-verify',
    'quality-gates.yml › site-smoke',
    'quality-gates.yml › test',
    'release.yml › release',
  ]

  function jobsUsing(actionPrefix: string): string[] {
    const jobs: string[] = []
    for (const [workflow, doc] of [
      ['quality-gates.yml', loadQualityGates()] as const,
      ['release.yml', loadRelease()] as const,
    ]) {
      for (const [jobName, job] of Object.entries(doc.jobs)) {
        const usesList = (job.steps ?? []).map((s) => s.uses).filter((u): u is string => u !== undefined)
        if (usesList.some((u) => u.startsWith(actionPrefix))) jobs.push(`${workflow} › ${jobName}`)
      }
    }
    return jobs.sort()
  }

  it('dtolnay/rust-toolchain@ is used in exactly the existing five jobs', () => {
    expect(jobsUsing('dtolnay/rust-toolchain@')).toEqual(EXPECTED_JOBS)
  })

  it('Swatinem/rust-cache@ is used in exactly the existing five jobs', () => {
    expect(jobsUsing('Swatinem/rust-cache@')).toEqual(EXPECTED_JOBS)
  })
})
