import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// `pnpm fork:init` copies deploy.yml.template into every fork as its deploy
// workflow, so the template is what forks actually run. Nothing linked it to a
// known-good baseline: the template sat at unpinned `@v4` actions, Node 22,
// `cargo install wasm-pack`, and no wasm-tools at all, while the upstream
// GitHub Pages workflow moved to SHA pins, Node 24, and a pinned wasm-pack +
// wasm-tools pair. The existing fork-init tests never caught it because they
// write their own two-line fixture and never read the real file.
//
// The baseline used to be .github/workflows/deploy.yml. That file is gone —
// this repository deploys through Cloudflare Pages Git integration, not GitHub
// Actions — but forks keep the GitHub Pages option, so the template still needs
// a baseline to be held against. That baseline is now the frozen fixture below,
// a verbatim copy of the upstream workflow as it stood when it was deleted.
//
// These assertions derive the expected values FROM the baseline rather than
// restating them, so the next upgrade to the baseline fails here until the
// template follows. Note the baseline no longer advances on its own: whoever
// upgrades the template must update the fixture in the same change.

const ROOT = resolve(__dirname, '../../..')
const TEMPLATE = resolve(ROOT, 'scripts/templates/deploy.yml.template')
const UPSTREAM = resolve(ROOT, 'tests/unit/workflows/fixtures/upstream-deploy.yml')

interface Step {
  name?: string
  uses?: string
  run?: string
  env?: Record<string, string>
  with?: Record<string, unknown>
}

interface Workflow {
  on?: Record<string, unknown>
  jobs: Record<string, { steps?: Step[] }>
}

function load(path: string): { doc: Workflow; raw: string } {
  const raw = readFileSync(path, 'utf8')
  return { doc: parse(raw) as Workflow, raw }
}

function buildSteps(doc: Workflow): Step[] {
  return doc.jobs.build?.steps ?? []
}

/** action name -> pinned ref, for every `uses:` in the workflow. */
function actionPins(doc: Workflow): Map<string, string> {
  const pins = new Map<string, string>()
  for (const job of Object.values(doc.jobs)) {
    for (const step of job.steps ?? []) {
      if (!step.uses) continue
      const [action, ref] = step.uses.split('@')
      pins.set(action, ref)
    }
  }
  return pins
}

const template = load(TEMPLATE)
const upstream = load(UPSTREAM)

describe('fork deploy template parity', () => {
  it('SHA-pins every action, with a version comment', () => {
    // A floating `@v4` is the supply-chain hole this repo closed everywhere
    // else; a fork inheriting the template must not reopen it.
    const uses = [...template.raw.matchAll(/^\s*uses:\s*(\S+)\s*(#.*)?$/gm)]
    expect(uses.length).toBeGreaterThan(0)
    for (const [line, ref, comment] of uses) {
      expect(ref, `unpinned action: ${line.trim()}`).toMatch(/@[0-9a-f]{40}$/)
      expect(comment, `no version comment on: ${line.trim()}`).toBeTruthy()
    }
  })

  it('pins every action to the same SHA upstream uses', () => {
    const templatePins = actionPins(template.doc)
    const upstreamPins = actionPins(upstream.doc)
    expect([...templatePins.keys()].sort()).toEqual([...upstreamPins.keys()].sort())
    for (const [action, ref] of templatePins) {
      expect(ref, `${action} drifted from tests/unit/workflows/fixtures/upstream-deploy.yml`).toBe(upstreamPins.get(action))
    }
  })

  it('installs the same pinned tool list as upstream', () => {
    // Missing wasm-tools does not fail the build — keygen degrades to a warning
    // and the fork ships an unstripped, unmutated payload while CI stays green.
    const toolOf = (doc: Workflow) =>
      buildSteps(doc).find((s) => s.uses?.startsWith('taiki-e/install-action@'))?.with?.tool
    expect(toolOf(template.doc)).toBe(toolOf(upstream.doc))
    expect(toolOf(template.doc)).toContain('wasm-tools@')
  })

  it('disables the rust-cache binary cache, as upstream does', () => {
    const cacheOf = (doc: Workflow) =>
      buildSteps(doc).find((s) => s.uses?.startsWith('Swatinem/rust-cache@'))?.with?.['cache-bin']
    expect(cacheOf(template.doc)).toBe('false')
    expect(cacheOf(template.doc)).toBe(cacheOf(upstream.doc))
  })

  it('uses the same Node version as upstream', () => {
    const nodeOf = (doc: Workflow) =>
      buildSteps(doc).find((s) => s.uses?.startsWith('actions/setup-node@'))?.with?.['node-version']
    expect(nodeOf(template.doc)).toBe(nodeOf(upstream.doc))
  })

  it('matches upstream trigger, permissions, and concurrency', () => {
    expect(template.doc.on).toEqual(upstream.doc.on)
    expect((template.doc as Record<string, unknown>).permissions).toEqual(
      (upstream.doc as Record<string, unknown>).permissions,
    )
    expect((template.doc as Record<string, unknown>).concurrency).toEqual(
      (upstream.doc as Record<string, unknown>).concurrency,
    )
  })

  it('tells the fork owner to add the `v*` tag rule to the github-pages environment', () => {
    // The deploy job runs from refs/tags/v*, but a fresh repo's github-pages
    // environment authorises only the default branch — the first release fails
    // with an error that never mentions the setting responsible.
    expect(template.raw).toMatch(/github-pages/)
    expect(template.raw).toMatch(/Settings\s*→\s*Environments/)
  })

  it('deliberately omits SITE_BASE — forks get a literal base instead', () => {
    // Upstream bakes the project-site base in via SITE_BASE. `fork:init --base`
    // rewrites .vitepress/config.mts to a plain literal, so a copied SITE_BASE
    // would hardcode the UPSTREAM path into every fork's asset URLs.
    const buildStep = buildSteps(template.doc).find((s) => s.run === 'pnpm build')
    expect(buildStep, 'template has no `pnpm build` step').toBeTruthy()
    expect(buildStep?.env?.SITE_BASE).toBeUndefined()
    expect(buildSteps(upstream.doc).find((s) => s.run === 'pnpm build')?.env?.SITE_BASE).toBeTruthy()
  })
})
