import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// T9/U142 (0010-S49): the upstream-equality test (U130-U132) reads the `v*` tags, so every job that
// runs the root suite on upstream must check out with full history. A shallow checkout has no tags
// and the test would fail on upstream, naming the missing base tag.

interface Step {
  name?: string
  uses?: string
  with?: Record<string, unknown>
}
interface Job {
  steps?: Step[]
}
interface Workflow {
  jobs: Record<string, Job>
}

const WORKFLOWS = resolve(__dirname, '../../../.github/workflows')

function load(file: string): Workflow {
  return parse(readFileSync(resolve(WORKFLOWS, file), 'utf8')) as Workflow
}

describe('T9/U142: jobs that run the root suite on upstream check out tags', () => {
  it.each([
    ['quality-gates.yml', 'test'],
    ['quality-gates.yml', 'fork-init-cross-os'],
    ['release.yml', 'release'],
  ])('%s job %s: the checkout step has fetch-depth: 0', (file, jobId) => {
    const job = load(file).jobs[jobId]
    expect(job).toBeDefined()
    const checkouts = (job.steps ?? []).filter((step) => step.uses?.startsWith('actions/checkout@'))
    expect(checkouts).toHaveLength(1)
    expect(checkouts[0].with?.['fetch-depth']).toBe(0)
  })
})
