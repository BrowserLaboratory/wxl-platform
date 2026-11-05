import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { indexSlugs } from '../../../scripts/generate-redirects'
import { readChallengeNumber, padChallengeNumber, isChallengeNumber } from '../../../scripts/challenge-numbers'

// `platform/public/_redirects` carries the classroom short links. They are handed to
// students on printed material, so they are a public commitment rather than an
// implementation detail — and until this file existed, nothing checked them.
//
// Cloudflare Pages does not verify that a redirect target exists. Rename a
// challenge directory and the rule keeps redirecting; what breaks is the place
// it points at, silently, with a green test suite.
//
// WHAT THIS FILE COVERS AND WHAT IT DOES NOT
//
// Everything here derives its expectations from the same tree it checks. That
// bounds what it can possibly catch: disagreements *inside* the tree, never a
// disagreement between the tree and a promise made outside it. The measured
// consequences, each reproduced against a throwaway copy of the worktree:
//
//   CAUGHT
//     a target's prefix directory renamed or deleted (`platform/challenge/`)
//     a challenge directory left without an `index.md`
//     the English target prefix's directory holding no challenges at all
//       (a Traditional Chinese one may be missing or empty, see below)
//     a Traditional Chinese page whose root-locale counterpart is missing
//     a rule that is neither a parameterised classroom link nor a numbered one
//     a challenge in git's index without its four numbered rules, or with a
//       Traditional Chinese rule at a page its tree does not track
//
// The file is now generated from the challenge tree, so "a rule added to,
// removed from, or edited in `_redirects`" moved out of this file: it is caught
// by the byte-equality assertion in `redirects-generated.test.ts`, which is
// strictly stronger than the set equality that used to live here — it also
// fails on a reordering, and on a rule left behind by a challenge that no
// longer exists. What stays here is the shape of the rules and the existence of
// their targets.
//
//   NOT CAUGHT
//     a single challenge renamed (`door-is-open` -> `door-was-open`).
//       The slug set is read out of the directory, so it follows the rename
//       and the check stays green. `/c/:slug` is parameterised, so the short
//       link follows too — what breaks is any *previously printed* link
//       naming the old slug, and this repository holds no record of what has
//       been printed.
//       The numbered rules are the answer to this one, and they answer it by
//       not being derived from the name at all: `/c/001` follows the challenge
//       through a rename because the number is written into its frontmatter.
//       That is a reason to hand out the numbered link, not a check this file
//       performs — a printed *slug* link still breaks on a rename, silently,
//       and still nothing here can see it.
//     a slug reassigned to a different challenge by a later refactor. Same
//       structural reason: the tree stays self-consistent, so nothing derived
//       from it can object. (An existence check additionally cannot catch this
//       one even in principle, since the path does exist — but that is a
//       consequence, not the reason.) The rule 302s into a 200 whose content
//       is wrong, with no error signal at all.
//     a single challenge retired — moved out of `platform/challenge/` into
//       `.archive/challenge/` while the site keeps being published. Structurally
//       identical to the rename: the slug leaves the derived set, this file stays
//       green, and `/c/<retired-slug>` 302s into a 404. `.archive/challenge/` is
//       a partial record of slugs the site once served, but no check reads it and
//       it records nothing about renames or reassignments, so it is not the
//       inventory the two forms above would need.
//
// Nor does anything here test how Cloudflare applies the rules. Whether a
// request is redirected, what status comes back, how it is cached — third-party
// runtime behaviour this repository cannot verify. Verify that by hand with
// `pnpm pages:dev`; the VitePress dev server ignores the file entirely.
//
// A green run means "every target has a counterpart in the source tree". It
// does not mean the short links work in production.
//
// HOW TARGETS ARE RESOLVED
//
// `.vitepress/config.mts` sets `srcDir` to `platform`, so the site path
// `/<prefix>/<slug>/` comes from `platform/<prefix>/<slug>/index.md`. Resolving
// against the source tree rather than `.vitepress/dist` keeps this runnable
// under `pnpm test --run`, which does not build first — a build costs three
// `wasm-pack build` invocations. Introducing a `rewrites` mapping to the
// VitePress config invalidates this correspondence, and whoever introduces one
// has to restate how targets are resolved.
//
// The slug set is derived per rule from that rule's own target directory and is
// never pooled across rules. `platform/zh-TW/challenge/` is a subset of
// `platform/challenge/`, and the two are equal whenever every challenge has been
// translated; a pooled set would demand a Traditional Chinese page for a
// combination that is not supposed to exist yet. The subset is not required to
// be proper — equality is a permitted state, not a signal that the per-rule
// derivation has collapsed into pooling.
//
// Subset, though, is directional and is asserted. A translated page whose
// root-locale counterpart is missing makes `/zh/c/<slug>` resolve while
// `/c/<slug>` 404s — an asymmetry between the two short links that nobody
// declared, and the one cross-rule claim the per-rule derivation would
// otherwise leave unguarded.
//
// A Traditional Chinese target directory may be missing or empty: translation is
// optional (spec 0008, G2), and a range can drop every translation. The English
// one may not.
//
// The rule set is not written out here: the file grows four rules with every
// challenge, so an enumerated expectation would have to be edited on every new
// challenge. Byte-equality against the generated content checks every byte and
// the order. This file asserts the four parameterised rules verbatim — they are
// the part that does not derive from the tree — that every other rule is a
// numbered short link, so an unreviewed rule of any other shape still fails,
// and, per challenge in git's index, the four rules spec 0008 gives it (G1–G3).

const REPO_ROOT = resolve(__dirname, '../../..')
const REDIRECTS = resolve(REPO_ROOT, 'platform/public/_redirects')
const DOCS = resolve(REPO_ROOT, 'platform')

/** Status codes Cloudflare Pages accepts in a `_redirects` rule. */
const ALLOWED_STATUS = [301, 302, 303, 307, 308]

interface Rule {
  from: string
  to: string
  status: number
}

/**
 * The four parameterised rules, in the order they appear.
 *
 * These are the rules that do not derive from the challenge tree, so they are
 * the ones worth writing down twice. The numbered rules are checked by shape
 * below and byte-for-byte in `redirects-generated.test.ts`.
 */
const PARAMETERISED_RULES: Rule[] = [
  { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
  { from: '/en/c/:slug', to: '/challenge/:slug/', status: 302 },
  { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
  { from: '/zh-TW/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
]

/** The numbered source forms, in the order each challenge's rules appear (spec 0008, G5). */
const FORMS = ['/c/', '/en/c/', '/zh/c/', '/zh-TW/c/']

/** A numbered short link in one of the four forms, zero-padded to at least three digits. */
const NUMBERED_SOURCE = /^\/(?:en\/|zh\/|zh-TW\/)?c\/[0-9]{3,}$/

/**
 * Every line that is neither blank nor a comment, split into its three fields.
 *
 * Comment and blank-line filtering is not incidental tidying: the file is
 * mostly header comments, and a parser that skips this step sees prose where it
 * expects rules and reports nonsense.
 */
function parseRules(file: string = REDIRECTS): Rule[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/)
      expect(fields, `rule line is not three fields: ${line}`).toHaveLength(3)
      // Cloudflare parses the third field as a literal decimal status code, so
      // the check has to be on the literal, not on what Number() makes of it.
      // `Number('0x12e')` is 302 and `Number('3e2')` is 300 — both would sail
      // through a coerced comparison while being nothing Cloudflare accepts.
      expect(fields[2], `status field is not a decimal literal: ${line}`).toMatch(/^[0-9]+$/)
      return { from: fields[0], to: fields[1], status: Number(fields[2]) }
    })
}

/** The `:name` placeholders in a path, in the order they appear. */
function placeholders(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
}

/** A rule whose target carries a placeholder serves a set of slugs; one without serves a single page. */
function isParameterised(rule: Rule): boolean {
  return rule.to.includes(':')
}

/**
 * The literal part of a path — everything before its first placeholder, or the
 * whole path when it has none.
 *
 * Written once and shared, because `indexOf(':')` returns -1 for a path with
 * no placeholder and `slice(0, -1)` then silently drops the last character
 * instead of returning the whole string: `/status` becomes `/statu`, `/c`
 * becomes `/`. Every place that needs a static prefix goes through here, so
 * fixing it at one call site cannot leave the same bug standing at another.
 */
function staticPrefix(path: string): string {
  const cut = path.indexOf(':')
  return cut === -1 ? path : path.slice(0, cut)
}

/**
 * The source directory a parameterised target resolves against, relative to
 * `platform/`. `/challenge/:slug/` gives `platform/challenge`; `/zh-TW/challenge/:slug/`
 * gives `platform/zh-TW/challenge`.
 */
function targetDir(to: string, docs: string = DOCS): string {
  expect(to.indexOf(':'), `targetDir called on a literal target: ${to}`).toBeGreaterThan(-1)
  return resolve(docs, staticPrefix(to).replace(/^\/+|\/+$/g, ''))
}

/** A path split into segments: `/zh/c/:slug` gives `['zh', 'c', ':slug']`. */
function segments(path: string): string[] {
  return path.split('/').filter((s) => s !== '')
}

/**
 * Whether an earlier rule swallows every request a later one could serve.
 *
 * A `:name` placeholder captures exactly one segment, so a rule matches paths
 * of exactly its own segment count and nothing else. The earlier rule shadows
 * the later one when the two have the same number of segments and every
 * segment of the earlier is either a placeholder or identical to the later's.
 *
 * Two weaker comparisons were tried and both were wrong. A raw `startsWith` on
 * the static prefix says `/c` shadows `/challenge-status`, because the strings
 * share characters that are not a path boundary. Segment-prefix comparison
 * fixes that but still says `/:slug` shadows `/zh/c/:slug`, because it never
 * looks at how many segments each rule actually consumes — `/:slug` matches
 * one segment and `/zh/c/:slug` matches three, so no request can reach both.
 */
function shadows(above: string, below: string): boolean {
  const a = segments(above)
  const b = segments(below)
  if (a.length !== b.length) return false
  return a.every((seg, i) => seg.startsWith(':') || seg === b[i])
}

/** The page a literal target resolves to: `/guide/setup/` gives `platform/guide/setup/index.md`. */
function targetPage(to: string): string {
  return resolve(DOCS, to.replace(/^\/+|\/+$/g, ''), 'index.md')
}

/** The slugs a rule serves, read out of that rule's own target directory; none when it is missing. */
function slugsFor(rule: Rule, docs: string = DOCS): string[] {
  const dir = targetDir(rule.to, docs)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

/**
 * What is wrong with the parameterised rules' target directories under `docs`: the English one
 * missing or holding no challenges, or a challenge directory without an `index.md`. A
 * Traditional Chinese one may be missing or empty (G2).
 */
function targetDirectoryFaults(rules: Rule[], docs: string = DOCS): string[] {
  const faults: string[] = []
  for (const rule of rules.filter(isParameterised)) {
    const dir = targetDir(rule.to, docs)
    const optional = rule.to !== '/challenge/:slug/'
    if (!existsSync(dir)) {
      if (!optional) faults.push(`${rule.from} -> ${rule.to} targets missing directory ${dir}`)
      continue
    }
    const slugs = slugsFor(rule, docs)
    // An empty prefix directory satisfies "every slug has a page" vacuously while every path
    // the rule can produce is a 404, so it is a fault of its own.
    if (slugs.length === 0 && !optional) {
      faults.push(`${rule.from} -> ${rule.to} has no slugs under ${dir}; every path it produces is a 404`)
    }
    for (const slug of slugs) {
      const page = resolve(dir, slug, 'index.md')
      if (!existsSync(page)) faults.push(`${rule.from} has no page for slug "${slug}" at ${page}`)
    }
  }
  return faults
}

/** Translated slugs under `docs` with no root-locale challenge behind them (an orphan brief). */
function orphanFaults(rules: Rule[], docs: string = DOCS): string[] {
  const parameterised = rules.filter(isParameterised)
  const root = rootRule(parameterised)
  const rootSlugs = new Set(slugsFor(root, docs))
  const faults: string[] = []
  for (const rule of parameterised) {
    if (rule.to === root.to) continue
    for (const slug of slugsFor(rule, docs)) {
      if (!rootSlugs.has(slug)) faults.push(`${rule.from} serves "${slug}" but ${root.from} has no such challenge`)
    }
  }
  return faults
}

/** The rule serving the root locale — the one whose target has no locale segment. */
function rootRule(rules: Rule[]): Rule {
  const root = rules.find((rule) => rule.to === '/challenge/:slug/')
  expect(root, 'no rule targets the root-locale challenge directory').toBeDefined()
  return root as Rule
}

describe('_redirects rule syntax', () => {
  it('yields only rules once comments and blanks are dropped', () => {
    // The file is mostly header prose. A parser that stopped filtering would
    // hand back comment text as rules; every source is a path, so no source can
    // begin with a `#`.
    const rules = parseRules()
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.from.startsWith('/'), `source is not a path: ${rule.from}`).toBe(true)
    }
  })

  it('gives every rule a status code Cloudflare accepts', () => {
    for (const rule of parseRules()) {
      expect(ALLOWED_STATUS, `${rule.from} has status ${rule.status}`).toContain(rule.status)
    }
  })

  it('pairs every placeholder across source and target', () => {
    for (const rule of parseRules()) {
      const from = [...placeholders(rule.from)].sort()
      const to = [...placeholders(rule.to)].sort()
      expect(to, `placeholders differ for ${rule.from} -> ${rule.to}`).toEqual(from)
    }
  })

  it('does not hide one rule behind a more general one', () => {
    // First match wins. A rule whose source prefix contains another rule's
    // source prefix would shadow it if ordered first, so no source may be a
    // path-boundary prefix of a source below it.
    const rules = parseRules()
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        expect(
          shadows(rules[i].from, rules[j].from),
          `${rules[i].from} shadows ${rules[j].from}`,
        ).toBe(false)
      }
    }
  })
})

describe('_redirects rule set', () => {
  it('ends with the four parameterised classroom rules (G4)', () => {
    // Last, and in this order. Cloudflare takes the first match and `/c/:slug`
    // matches a number too, so a numbered rule below these would never run.
    expect(parseRules().slice(-4)).toEqual(PARAMETERISED_RULES)
  })

  it('gives every challenge in git’s index its four rules in form order, the Traditional Chinese ones at the page its tree tracks (G1–G3, G5, G8)', () => {
    // From git's per-tree index, not a directory listing: other test files scaffold
    // throwaway challenges into the real tree while this one runs.
    const slugs = indexSlugs(REPO_ROOT)
    const english = slugs.get('root') ?? new Set<string>()
    const chinese = slugs.get('zh-TW') ?? new Set<string>()
    expect(english.size, 'no challenge is tracked').toBeGreaterThan(0)
    const numbered = parseRules().filter((r) => !isParameterised(r))

    for (const slug of english) {
      const n = readChallengeNumber(resolve(DOCS, 'challenge', slug, 'index.md'))
      expect(isChallengeNumber(n), `${slug} has no number`).toBe(true)
      const padded = padChallengeNumber(n as number)
      const page = { en: `/challenge/${slug}/`, zh: chinese.has(slug) ? `/zh-TW/challenge/${slug}/` : `/challenge/${slug}/` }
      expect(numbered.filter((r) => r.from.endsWith(`/c/${padded}`)), slug).toEqual([
        { from: `/c/${padded}`, to: page.en, status: 302 },
        { from: `/en/c/${padded}`, to: page.en, status: 302 },
        { from: `/zh/c/${padded}`, to: page.zh, status: 302 },
        { from: `/zh-TW/c/${padded}`, to: page.zh, status: 302 },
      ])
    }
    // Nothing else: every numbered rule belongs to one of those challenges (CI refuses an
    // orphan brief, so G9's two rules never reach the committed file).
    expect(numbered).toHaveLength(4 * english.size)
  })

  it('gives challenge 001, door-is-open, the four rules the spec writes out', () => {
    expect(parseRules().filter((r) => r.from.endsWith('/c/001'))).toEqual([
      { from: '/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/en/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/zh/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
      { from: '/zh-TW/c/001', to: '/zh-TW/challenge/door-is-open/', status: 302 },
    ])
  })

  it('admits no rule that is neither parameterised nor a numbered short link', () => {
    // Containment on shape, which is what survives a rule set that grows with
    // the tree. An unreviewed rule of any other shape still fails here.
    for (const rule of parseRules().filter((r) => !isParameterised(r))) {
      expect(
        NUMBERED_SOURCE.test(rule.from),
        `${rule.from} is neither parameterised nor a numbered short link`,
      ).toBe(true)
    }
  })

  it('does not offer an unpadded numbered spelling', () => {
    // One canonical spelling per challenge: printed, displayed and copied are
    // the same string.
    const sources = parseRules().map((r) => r.from)
    for (const form of FORMS) expect(sources).not.toContain(`${form}1`)
  })
})

describe('_redirects target resolution', () => {
  it('resolves every parameterised target prefix to a directory of challenges, each with an index.md', () => {
    // Missing directory, empty directory and a slug without a page are each reported by name.
    expect(targetDirectoryFaults(parseRules())).toEqual([])
  })

  it('resolves every literal target to a page', () => {
    // No rule is literal today. The branch exists so that adding one gets the
    // same guarantee instead of silently skipping every resolution check.
    for (const rule of parseRules().filter((r) => !isParameterised(r))) {
      const page = targetPage(rule.to)
      expect(existsSync(page), `${rule.from} -> ${rule.to} has no page at ${page}`).toBe(true)
    }
  })

  it('backs every translated slug with a root-locale challenge', () => {
    // The one cross-rule claim. Subset, not equality: an untranslated challenge
    // is expected and must not fail, but a translation with nothing behind it
    // leaves `/c/<slug>` a 404 while `/zh/c/<slug>` resolves.
    expect(orphanFaults(parseRules())).toEqual([])
  })
})

// The same checks on throwaway ranges, with the repository's own rule set: what a range that
// dropped its translations, or never had any, gives (spec 0008, G2), and that the refusals hold.
describe('_redirects target checks on other ranges', () => {
  let docs: string

  beforeEach(() => {
    docs = join(mkdtempSync(join(tmpdir(), 'redirects-range-')), 'platform')
  })

  afterEach(() => {
    rmSync(resolve(docs, '..'), { recursive: true, force: true })
  })

  function page(dir: string, slug: string): void {
    mkdirSync(join(docs, dir, slug), { recursive: true })
    writeFileSync(join(docs, dir, slug, 'index.md'), '---\nnumber: 1\n---\n')
  }

  it('accepts a range with no Traditional Chinese challenge directory', () => {
    page('challenge', 'door-is-open')
    expect(targetDirectoryFaults(parseRules(), docs)).toEqual([])
    expect(orphanFaults(parseRules(), docs)).toEqual([])
  })

  it('accepts a range whose Traditional Chinese challenge directory is empty', () => {
    page('challenge', 'door-is-open')
    mkdirSync(join(docs, 'zh-TW', 'challenge'), { recursive: true })
    expect(targetDirectoryFaults(parseRules(), docs)).toEqual([])
  })

  it('refuses a range with no English challenge directory', () => {
    page('zh-TW/challenge', 'door-is-open')
    // Once per English rule: `/c/:slug` and `/en/c/:slug`.
    const faults = targetDirectoryFaults(parseRules(), docs)
    expect(faults).toHaveLength(2)
    for (const fault of faults) expect(fault).toMatch(/^\/(?:en\/)?c\/:slug -> \/challenge\/:slug\/ targets missing directory /)
  })

  it('refuses a translated slug with no root-locale challenge (G6)', () => {
    page('challenge', 'door-is-open')
    page('zh-TW/challenge', 'orphan')
    // Once per Traditional Chinese rule: `/zh/c/:slug` and `/zh-TW/c/:slug`.
    const faults = orphanFaults(parseRules(), docs)
    expect(faults).toHaveLength(2)
    for (const fault of faults) expect(fault).toContain('"orphan"')
  })
})
