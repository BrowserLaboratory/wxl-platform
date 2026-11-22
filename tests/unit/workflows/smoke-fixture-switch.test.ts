import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// L36 / L-q5, the structural half (D49, 0010-S21): the site-smoke job builds with the smoke
// fixtures published; the build job builds without them and then proves the output holds no trace
// (PAT4). The "fails on a build made with the flag" half is checked once at stage 8 (VL6).

const PAT4 = "! find .vitepress/dist -path '*smoke-fixtures*' | grep -q . && ! grep -rq smoke-fixtures .vitepress/dist"
const FLAG = 'WXL_SMOKE_PAGES'

interface Step {
  name?: string
  run?: string
  env?: Record<string, unknown>
}
interface Job {
  env?: Record<string, unknown>
  steps?: Step[]
}
interface Workflow {
  env?: Record<string, unknown>
  jobs: Record<string, Job>
}

const workflow = parse(
  readFileSync(resolve(__dirname, '../../../.github/workflows/quality-gates.yml'), 'utf8'),
) as Workflow

const buildIndex = (job: Job) => (job.steps ?? []).findIndex((step) => step.run?.trim() === 'pnpm docs:build')

describe('the smoke fixture switch in quality-gates.yml (L36, L-q5)', () => {
  it('the build job runs PAT4 on the step right after docs:build', () => {
    const steps = workflow.jobs.build.steps ?? []
    const at = buildIndex(workflow.jobs.build)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(steps[at + 1]?.run?.trim()).toBe(PAT4)
  })

  it('the site-smoke job builds with WXL_SMOKE_PAGES set to the string 1', () => {
    const job = workflow.jobs['site-smoke']
    const step = (job.steps ?? [])[buildIndex(job)]
    expect(step?.env?.[FLAG]).toBe('1')
  })

  it('the build job sets the flag nowhere: not on its docs:build step, not on the job, not on the workflow', () => {
    const job = workflow.jobs.build
    const step = (job.steps ?? [])[buildIndex(job)]
    expect(step.env?.[FLAG]).toBeUndefined()
    expect(job.env?.[FLAG]).toBeUndefined()
    expect(workflow.env?.[FLAG]).toBeUndefined()
  })
})
