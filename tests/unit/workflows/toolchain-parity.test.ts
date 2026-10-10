import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// Every job that builds challenge artifacts must install the same pinned
// toolchain. A job that misses wasm-tools silently degrades keygen to its
// copyFileSync fallback — CI stays green while the deployed payload skips the
// strip and mutate passes, which is exactly how the empty-template corruption
// went unnoticed. The spec (ci-quality-gates, "Both jobs SHALL share an
// identical setup step sequence") states the pins; this test enforces them.

// The set is quality-gates + release only. A GitHub Pages deploy workflow used
// to be a third member; it was removed when the site moved to Cloudflare Pages
// Git integration, which is configured in the Cloudflare dashboard rather than
// in this repository. Forks still get a GitHub Pages workflow from the
// fork-init template, and that one is held to a frozen baseline by
// fork-template-parity.test.ts instead.
const WORKFLOW_DIR = resolve(__dirname, '../../../.github/workflows')
const WORKFLOWS = ['quality-gates.yml', 'release.yml']

const EXPECTED_TOOL_LIST = 'wasm-pack@0.14.0,wasm-tools@1.249.0'
const INSTALL_ACTION = 'taiki-e/install-action@'
const RUST_CACHE = 'Swatinem/rust-cache@'
const BINARYEN_ACTION = './.github/actions/install-binaryen'
const BINARYEN_VERSION = '132'

interface Step {
  uses?: string
  with?: Record<string, unknown>
}

interface JobSteps {
  workflow: string
  jobName: string
  steps: Step[]
}

function loadAllJobs(): JobSteps[] {
  const jobs: JobSteps[] = []
  for (const workflow of WORKFLOWS) {
    const doc = parse(readFileSync(resolve(WORKFLOW_DIR, workflow), 'utf8'))
    for (const [jobName, job] of Object.entries<Record<string, unknown>>(doc.jobs)) {
      jobs.push({ workflow, jobName, steps: (job.steps as Step[]) ?? [] })
    }
  }
  return jobs
}

function stepsUsing(jobs: JobSteps[], actionPrefix: string) {
  return jobs.flatMap(({ workflow, jobName, steps }) =>
    steps
      .filter((s) => s.uses?.startsWith(actionPrefix))
      .map((step) => ({ workflow, jobName, step })),
  )
}

describe('workflow toolchain parity', () => {
  const jobs = loadAllJobs()

  it('pins the full tool list in every install-action step', () => {
    const installs = stepsUsing(jobs, INSTALL_ACTION)
    expect(installs.length).toBeGreaterThan(0)
    for (const { workflow, jobName, step } of installs) {
      expect(step.with?.tool, `${workflow} › ${jobName}`).toBe(EXPECTED_TOOL_LIST)
    }
  })

  it('disables the binary cache in every rust-cache step', () => {
    // install-action installs pinned prebuilt binaries into $CARGO_HOME/bin;
    // a restored rust-cache would shadow them with stale versions.
    const caches = stepsUsing(jobs, RUST_CACHE)
    expect(caches.length).toBeGreaterThan(0)
    for (const { workflow, jobName, step } of caches) {
      expect(step.with?.['cache-bin'], `${workflow} › ${jobName}`).toBe('false')
    }
  })

  // binaryen used to be installed with `apt-get install -y binaryen`. That step
  // hung three times in one day — once for five hours, twice blocking a pull
  // request's required checks — because apt waits on a stalled mirror instead
  // of failing. It also left binaryen as the one component whose version was
  // whatever the package index served. These assertions keep both properties
  // from coming back.
  it('installs binaryen through the composite action, never through a package manager', () => {
    for (const workflow of WORKFLOWS) {
      const raw = readFileSync(resolve(WORKFLOW_DIR, workflow), 'utf8')
      expect(raw, `${workflow} installs binaryen via a package manager`).not.toMatch(
        /apt-get|apt install|yum |dnf |apk add/,
      )
    }
  })

  it('calls the binaryen action from exactly the toolchain jobs, and no others', () => {
    const withBinaryen = stepsUsing(jobs, BINARYEN_ACTION)
      .map(({ workflow, jobName }) => `${workflow} \u203a ${jobName}`)
      .sort()
    const withToolchain = stepsUsing(jobs, INSTALL_ACTION)
      .map(({ workflow, jobName }) => `${workflow} \u203a ${jobName}`)
      .sort()
    // Tied to the other installer's job set rather than to a second literal
    // list: a job added to one and not the other is the failure being caught.
    expect(withBinaryen).toEqual(withToolchain)
  })

  it('declares the binaryen version exactly once, in the action default', () => {
    // A call site that passes `version` would reintroduce the drift the apt
    // step had, where each job resolved its own version.
    for (const { workflow, jobName, step } of stepsUsing(jobs, BINARYEN_ACTION)) {
      expect(step.with, `${workflow} \u203a ${jobName} pins its own version`).toBeUndefined()
    }
    const action = parse(
      readFileSync(resolve(WORKFLOW_DIR, '../actions/install-binaryen/action.yml'), 'utf8'),
    )
    expect(String(action.inputs.version.default)).toBe(BINARYEN_VERSION)
  })

  it('verifies the download against the published checksum', () => {
    // Swapping a distribution package for a downloaded archive removes the
    // package manager's signature check; without this the change would be a net
    // reduction in what CI trusts.
    //
    // Asserted against the parsed `run` scripts, NOT the raw file. The first
    // version of this test matched the raw text, and the action's own comment
    // explains the checksum format — so deleting the actual `sha256sum -c`
    // command left the assertion green. Mutation testing caught it; nothing
    // else would have.
    const action = parse(
      readFileSync(resolve(WORKFLOW_DIR, '../actions/install-binaryen/action.yml'), 'utf8'),
    )
    const scripts: string[] = (action.runs.steps as Array<{ run?: string }>)
      .map((s) => s.run ?? '')
      .map((s) => s.replace(/^\s*#.*$/gm, ''))
    const joined = scripts.join('\n')
    expect(joined).toMatch(/sha256sum -c/)
    expect(joined).toMatch(/set -euo pipefail/)
    expect(joined).toMatch(/\.sha256/)
  })

  it('installs the toolchain in exactly the expected artifact-building jobs', () => {
    // quality-gates: test, build, site-smoke, challenge-verify; release: release.
    // A new job that builds artifacts must join this list — and install the
    // same pinned tools — rather than silently running without them.
    const jobsWithInstall = stepsUsing(jobs, INSTALL_ACTION)
      .map(({ workflow, jobName }) => `${workflow} › ${jobName}`)
      .sort()
    expect(jobsWithInstall).toEqual([
      'quality-gates.yml › build',
      'quality-gates.yml › challenge-verify',
      'quality-gates.yml › site-smoke',
      'quality-gates.yml › test',
      'release.yml › release',
    ])
  })
})
