import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { parse } from 'yaml'

// Spec 0009 D3, "The workflow" (W1-W8) and W12 (0009-S2): publish-npm.yml is the only place that
// publishes create-wxl. Its shape is fixed key by key, so a later edit that adds a token, a cache,
// a direct publish or another trigger fails here instead of reaching npm. The expected values are
// transcribed from traceability.md, except the action pins and their version comments, which are
// read from release.yml (W4: the same pins as release.yml).

const WORKFLOWS_DIR = resolve(__dirname, '../../../.github/workflows')
const PUBLISH_PATH = resolve(WORKFLOWS_DIR, 'publish-npm.yml')
const RELEASE_PATH = resolve(WORKFLOWS_DIR, 'release.yml')

type Step = Record<string, unknown> & { uses?: string; run?: string; with?: Record<string, unknown> }
interface Job {
  if?: string
  'runs-on'?: unknown
  environment?: unknown
  permissions?: unknown
  env?: unknown
  steps?: Step[]
}
interface Workflow {
  name?: string
  on?: unknown
  permissions?: unknown
  concurrency?: unknown
  jobs: Record<string, Job>
}

function load(path: string): { doc: Workflow; raw: string } {
  const raw = readFileSync(path, 'utf8')
  return { doc: parse(raw) as Workflow, raw }
}

const publish = () => load(PUBLISH_PATH)
const release = () => load(RELEASE_PATH)
const steps = () => publish().doc.jobs.stage?.steps ?? []

const ACTIONS = ['actions/checkout', 'pnpm/action-setup', 'actions/setup-node']

/** The raw `uses:` line for `action` in `raw`, from `uses:` to the line's end (comment included). */
function usesLine(raw: string, action: string): string | undefined {
  const line = raw.split('\n').find((l) => l.trim().replace(/^- /, '').startsWith(`uses: ${action}@`))
  return line?.trim().replace(/^- /, '')
}

describe('publish-npm.yml (spec 0009 W1-W8)', () => {
  it('exists', () => {
    expect(existsSync(PUBLISH_PATH)).toBe(true)
  })

  it('W1: triggers only on pushed v* tags', () => {
    expect(publish().doc.on).toEqual({ push: { tags: ['v*'] } })
  })

  it("W2: has exactly one job, stage, whose if: equals release.yml's release job", () => {
    const doc = publish().doc
    expect(Object.keys(doc.jobs)).toEqual(['stage'])
    expect(doc.jobs.stage.if).toBeDefined()
    expect(doc.jobs.stage.if).toBe(release().doc.jobs.release.if)
  })

  it('W3: grants nothing at the top, runs one at a time, and the job gets contents: read and id-token: write in environment npm', () => {
    const doc = publish().doc
    expect(doc.permissions).toEqual({})
    expect(doc.concurrency).toEqual({ group: 'publish-npm', 'cancel-in-progress': false })
    expect(doc.jobs.stage.environment).toBe('npm')
    expect(doc.jobs.stage.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
  })

  it.each(ACTIONS)("W4: %s uses release.yml's pin and version comment", (action) => {
    const releaseLine = usesLine(release().raw, action)
    expect(releaseLine, `release.yml has no ${action}`).toMatch(/@[0-9a-f]{40} # v\S+/)
    expect(usesLine(publish().raw, action)).toBe(releaseLine)
    const parsedUses = steps().find((s) => s.uses?.startsWith(`${action}@`))?.uses
    expect(parsedUses).toBe(release().doc.jobs.release.steps?.find((s) => s.uses?.startsWith(`${action}@`))?.uses)
  })

  it("W4: each action's with is exactly as specified", () => {
    const withOf = (action: string) => steps().find((s) => s.uses?.startsWith(`${action}@`))?.with
    expect(withOf('actions/checkout')).toEqual({ 'fetch-depth': 0, 'persist-credentials': false })
    expect(withOf('pnpm/action-setup')).toBeUndefined()
    expect(withOf('actions/setup-node')).toEqual({ 'node-version': 24, 'package-manager-cache': false })
  })

  it('W5: step 4 installs one exact npm 11.y.z with y >= 15, and no earlier run starts with npm', () => {
    const run = steps()[3]?.run
    const m = /^npm install --global npm@11\.(\d+)\.(\d+)$/.exec(run ?? '')
    expect(m, `step 4 run: ${run}`).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(15)
    for (const step of steps().slice(0, 3)) {
      expect(step.run === undefined || !step.run.startsWith('npm ')).toBe(true)
    }
  })

  it('W6: exactly eight steps, in order, with steps 5-8 verbatim and only steps 7-8 in create-wxl', () => {
    const s = steps()
    expect(s).toHaveLength(8)
    ACTIONS.forEach((action, i) => expect(s[i].uses?.startsWith(`${action}@`), `step ${i + 1}`).toBe(true))
    expect(s[3].run).toMatch(/^npm install --global npm@/)
    expect(s[4].run).toBe('git merge-base --is-ancestor HEAD origin/main')
    expect(s[5].run).toBe('pnpm --dir create-wxl install --frozen-lockfile --prod --ignore-scripts')
    expect(s[6].run).toBe('node scripts/prepare-dist.mjs && node scripts/check-publish.mjs')
    expect(s[7].run).toBe('npm stage publish')
    s.forEach((step, i) => {
      expect(step['working-directory'], `step ${i + 1}`).toBe(i >= 6 ? 'create-wxl' : undefined)
    })
  })

  it.each([
    'secrets.',
    'vars.',
    'NODE_AUTH_TOKEN',
    'NPM_TOKEN',
    '_authToken',
    'NPM_CONFIG',
    'npm_config_',
    '--registry',
    'registry-url',
    'npm dist-tag',
    '--provenance',
    'actions/cache',
    'rust-cache',
  ])('W7: the raw file never contains %s', (banned) => {
    expect(publish().raw).not.toContain(banned)
  })

  it('W7: npm publish appears only inside npm stage publish, and no step has a cache key', () => {
    expect(publish().raw.replaceAll('npm stage publish', '')).not.toContain('npm publish')
    for (const step of steps()) {
      expect(Object.keys(step.with ?? {})).not.toContain('cache')
    }
  })

  it('W8: the workflow, job and step key sets are closed', () => {
    const doc = publish().doc
    expect(Object.keys(doc).sort()).toEqual(['concurrency', 'jobs', 'name', 'on', 'permissions'])
    expect(Object.keys(doc.jobs.stage).sort()).toEqual(['environment', 'if', 'permissions', 'runs-on', 'steps'])
    expect(doc.jobs.stage['runs-on']).toBe('ubuntu-latest')
    for (const [i, step] of steps().entries()) {
      const keys = Object.keys(step)
      const allowed = step.uses !== undefined ? ['uses', 'with', 'name'] : ['run', 'working-directory', 'name']
      expect(step.uses !== undefined || step.run !== undefined, `step ${i + 1}`).toBe(true)
      expect(step.uses !== undefined && step.run !== undefined, `step ${i + 1}`).toBe(false)
      expect(keys.filter((k) => !allowed.includes(k)), `step ${i + 1}`).toEqual([])
    }
  })
})

// W12: the ancestry step, run exactly as the workflow spells it, in a temporary repository whose
// `origin/main` is a remote-tracking ref (as `actions/checkout` with `fetch-depth: 0` leaves it).
describe('publish-npm.yml ancestry step (spec 0009 W12)', () => {
  let dir: string
  const git = (...args: string[]) => {
    const r = spawnSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      env: { HOME: dir, XDG_CONFIG_HOME: dir, PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' },
    })
    return { code: r.status, stdout: (r.stdout ?? '').trim() }
  }
  const commit = (name: string) => {
    writeFileSync(join(dir, name), name)
    git('add', name)
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', name)
    return git('rev-parse', 'HEAD').stdout
  }
  let onMainOld: string
  let onMainTip: string
  let offMain: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'publish-npm-ancestry-'))
    git('init', '-q', '-b', 'main')
    onMainOld = commit('a')
    onMainTip = commit('b')
    git('update-ref', 'refs/remotes/origin/main', onMainTip)
    git('switch', '-q', '-c', 'topic')
    offMain = commit('c')
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  function runAncestryAt(commitSha: string) {
    git('checkout', '-q', '--detach', commitSha)
    const run = steps()[4].run!
    const [cmd, ...args] = run.split(' ')
    expect(cmd).toBe('git')
    return git(...args).code
  }

  it.each([
    ["origin/main's own commit", () => onMainTip, 0],
    ['an ancestor of origin/main', () => onMainOld, 0],
    ['a commit not on main', () => offMain, 1],
  ] as const)('exits as expected at %s', (_label, shaOf, code) => {
    expect(runAncestryAt(shaOf())).toBe(code)
  })
})
