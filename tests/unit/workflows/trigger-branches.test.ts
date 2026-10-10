import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// Which branches reach the quality gates is normative — the branch model in
// CONTRIBUTE.md states the set the triggers have to cover. Until this file existed, nothing checked it: the trigger
// block was verified by whoever happened to read the workflow, and a branch
// silently dropped from `on.push` would have cost nothing at PR time and shown
// up only as an ungated merge commit.
//
// The assertions are set equality, not containment. Not triggering on pull
// requests into any other branch is as normative as the positive half, and
// containment would let an extra branch through unnoticed.
//
// `pull_request` and `push` are checked against the same expected set and then
// against each other. A branch gated in only one of the two positions is the
// failure this pins: pull requests into it are checked, the merge result is
// not — or the reverse.

const WORKFLOW = resolve(__dirname, '../../../.github/workflows/quality-gates.yml')

/** The repository's long-lived branches, per the branch model in CONTRIBUTE.md. */
const LONG_LIVED = ['main']

interface Workflow {
  on?: {
    pull_request?: { branches?: string[] }
    push?: { branches?: string[]; tags?: string[] }
  }
}

function triggers(): NonNullable<Workflow['on']> {
  // YAML 1.1 would fold the `on` key into the boolean `true`; the `yaml`
  // package parses 1.2, where it stays a string key. Assert rather than assume,
  // so a parser change surfaces here instead of as a vacuous pass below.
  const doc = parse(readFileSync(WORKFLOW, 'utf8')) as Workflow & Record<string, unknown>
  expect(Object.keys(doc), 'quality-gates.yml has no `on` key').toContain('on')
  return doc.on as NonNullable<Workflow['on']>
}

function sorted(branches: string[] | undefined): string[] {
  return [...(branches ?? [])].sort()
}

describe('quality-gates trigger branches', () => {
  it('gates pull requests into exactly the long-lived branches', () => {
    expect(sorted(triggers().pull_request?.branches)).toEqual([...LONG_LIVED].sort())
  })

  it('gates pushes to exactly the long-lived branches', () => {
    expect(sorted(triggers().push?.branches)).toEqual([...LONG_LIVED].sort())
  })

  it('gates the same branch set on both triggers', () => {
    const on = triggers()
    expect(sorted(on.pull_request?.branches)).toEqual(sorted(on.push?.branches))
  })

  it('does not trigger on tag pushes', () => {
    // Tag-driven work belongs to release.yml. A `tags:` filter here would make
    // every release pay for the PR-time gates a second time.
    expect(triggers().push?.tags).toBeUndefined()
  })

  it('declares no trigger beyond pull_request and push', () => {
    expect(Object.keys(triggers()).sort()).toEqual(['pull_request', 'push'])
  })
})
