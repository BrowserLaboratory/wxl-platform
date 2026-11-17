import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { briefFaults, generateRedirects, indexSlugs, indexTrees, writeRedirects, type BriefFault } from '../../../scripts/generate-redirects'
import { SiteLayoutError } from '../../../.vitepress/layout-error'
import { hasRootRangeJson, isGitWorkTree, readManifest, upstreamOnlySkipReason } from '../../__helpers__/upstreamDecision'
import { challengePagePath } from '../../../.vitepress/challenge/shortLink'
import { LOCALES, type Locale } from '../../../.vitepress/locales'
import { parsePrimaryLocale } from '../../../.vitepress/primary-locale'
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
//     a target's page directory renamed or deleted (`platform/<locale>/challenge/`)
//     a challenge directory left without an `index.md`
//     the primary locale's target directory holding no challenges at all
//       (a translation's directory may be missing or empty, see below)
//     a translation's brief whose primary-locale brief is missing
//       (`briefFaults`: `missing-primary`, D64)
//     a rule that is neither a parameterised classroom link nor a numbered one
//     a challenge in git's index without its four numbered rules, or with a
//       rule at a translation's page its tree does not track
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
//       through a rename because the number is written into its `challenge.yaml` (D62).
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
// `.vitepress/config.mts` sets `srcDir` to `platform`, and a rewrite maps the primary
// locale's pages to the output root. A target's page path is therefore resolved
// back to its source by the reverse of `challengePagePath` (D68): a path with no
// locale segment is the primary locale's `platform/<P>/challenge/<slug>/index.md`,
// one with a locale segment is that locale's. Resolving against the source tree
// rather than `.vitepress/dist` keeps this runnable under `pnpm test --run`, which
// does not build first — a build costs three `wasm-pack build` invocations.
// Changing the `rewrites` mapping invalidates this correspondence, and whoever
// changes it has to restate how targets are resolved.
//
// The slug set is derived per rule from that rule's own target directory and is
// never pooled across rules. A translation's directory is a subset of the
// primary locale's, and the two are equal whenever every challenge has been
// translated; a pooled set would demand a translated page for a combination that
// is not supposed to exist yet. The subset is not required to be proper —
// equality is a permitted state, not a signal that the per-rule derivation has
// collapsed into pooling.
//
// Subset, though, is directional and is asserted: only the primary locale's
// directory is required (D64, D127). A translated brief whose primary-locale
// brief is missing is `briefFaults`' `missing-primary`: it would make the
// translation's short link resolve while the primary locale's 404s — an
// asymmetry between the short links that nobody declared, and the one cross-rule
// claim the per-rule derivation would otherwise leave unguarded.
//
// A translation's target directory may be missing or empty: translation is
// optional (spec 0008, G2), and a range can drop every translation. The primary
// locale's may not.
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

type Primary = 'en' | 'zh-TW'
const BOTH: Primary[] = ['en', 'zh-TW']

/**
 * The slug rules by `P`, written out: S-§4.2 for `en`, S-§4.1 for `zh-TW`. The part of the file that
 * does not derive from the tree, so it is written down twice (here and in the generator).
 */
const SLUG_RULES: Record<Primary, Rule[]> = {
  en: [
    { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
    { from: '/en/c/:slug', to: '/challenge/:slug/', status: 302 },
    { from: '/zh/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
    { from: '/zh-TW/c/:slug', to: '/zh-TW/challenge/:slug/', status: 302 },
  ],
  'zh-TW': [
    { from: '/c/:slug', to: '/challenge/:slug/', status: 302 },
    { from: '/en/c/:slug', to: '/en/challenge/:slug/', status: 302 },
    { from: '/zh/c/:slug', to: '/challenge/:slug/', status: 302 },
    { from: '/zh-TW/c/:slug', to: '/challenge/:slug/', status: 302 },
  ],
}

/** The old-address rule, last and only when `P = zh-TW` (S-§4.1). */
const OLD_ADDRESS_RULE: Rule = { from: '/zh-TW/*', to: '/:splat', status: 302 }

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
  return parseRulesText(readFileSync(file, 'utf8'))
}

/** The rules of a `_redirects` text; the text itself comes from a file or from the generator. */
function parseRulesText(text: string): Rule[] {
  return text
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
  const named = [...path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
  // A trailing `*` is Cloudflare's splat: it pairs with `:splat` on the right.
  return path.endsWith('*') ? [...named, 'splat'] : named
}

/** A slug rule or the old-address rule serves a set of pages; a numbered rule serves a single page. */
function isParameterised(rule: Rule): boolean {
  return rule.from.endsWith(':slug') || rule.from === OLD_ADDRESS_RULE.from
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
  // A trailing `*` captures everything beneath its prefix (S31), whatever the segment count.
  if (above.endsWith('/*')) return below.startsWith(above.slice(0, -1))
  const a = segments(above)
  const b = segments(below)
  if (a.length !== b.length) return false
  return a.every((seg, i) => seg.startsWith(':') || seg === b[i])
}

/**
 * The page a literal target resolves to under `docs`, by reversing `challengePagePath`: the primary
 * locale's page has no locale segment (`/challenge/<slug>/` is `platform/<P>/challenge/<slug>/index.md`),
 * another locale's has its own (`/<L>/challenge/<slug>/`, L not P). `undefined` when `to` is no
 * challenge page address of this range.
 */
function literalTargetPage(to: string, docs: string, primary: Locale): string | undefined {
  for (const locale of LOCALES) {
    const template = challengePagePath(':slug', locale, primary)
    const prefix = template.slice(0, template.indexOf(':slug'))
    if (!to.startsWith(prefix) || !to.endsWith('/')) continue
    const slug = to.slice(prefix.length, -1)
    if (slug === '' || slug.includes('/')) continue
    return resolve(docs, locale, 'challenge', slug, 'index.md')
  }
  return undefined
}

/** `P` of git's index: `range.json` in the index, or the default when it holds none (D67). */
function indexPrimaryLocale(): Locale {
  const listed = execFileSync('git', ['ls-files', '-s', '--', 'range.json'], { cwd: REPO_ROOT, encoding: 'utf8' })
  if (listed.trim() === '') return parsePrimaryLocale(undefined)
  return parsePrimaryLocale(execFileSync('git', ['show', ':range.json'], { cwd: REPO_ROOT, encoding: 'utf8' }))
}

/** The slugs under `docs/<locale>/challenge/`: the folders holding an `index.md` (D127). */
function briefSlugsIn(docs: string, locale: Locale): string[] {
  const dir = resolve(docs, locale, 'challenge')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(dir, entry.name, 'index.md')))
    .map((entry) => entry.name)
}

/**
 * What is wrong with the slug rules' target directories under `docs` for primary locale `primary`:
 * a rule whose target is no challenge page address of this range, the primary locale's directory
 * missing or holding no slug folder with an `index.md`. Another locale's directory may be missing
 * or empty (G2). A rule whose target is the old-address rule's is not a directory target.
 */
function targetDirectoryFaults(rules: Rule[], docs: string = DOCS, primary: Locale = 'zh-TW'): string[] {
  const faults: string[] = []
  for (const rule of rules.filter(isParameterised)) {
    if (rule.to === OLD_ADDRESS_RULE.to) continue
    const locale = LOCALES.find((l) => challengePagePath(':slug', l, primary) === rule.to)
    if (locale === undefined) {
      faults.push(`${rule.from} -> ${rule.to} is not a challenge page address of this range`)
      continue
    }
    if (locale !== primary) continue
    const dir = resolve(docs, locale, 'challenge')
    if (!existsSync(dir)) {
      faults.push(`${rule.from} -> ${rule.to} targets missing directory ${dir}`)
    } else if (briefSlugsIn(docs, locale).length === 0) {
      // An empty directory satisfies "every slug has a page" vacuously while every path the rule
      // can produce is a 404, so it is a fault of its own.
      faults.push(`${rule.from} -> ${rule.to} has no slugs under ${dir}; every path it produces is a 404`)
    }
  }
  return faults
}

/** Every pair `above shadows below` in `rules`, in file order, as `above shadows below` lines. */
function shadowedPairs(rules: Rule[]): string[] {
  const pairs: string[] = []
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (shadows(rules[i].from, rules[j].from)) pairs.push(`${rules[i].from} shadows ${rules[j].from}`)
    }
  }
  return pairs
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

  it('pairs every placeholder across source and target, a trailing * with :splat (S30)', () => {
    expect(placeholders('/zh-TW/*')).toEqual(['splat'])
    expect(placeholders('/:splat')).toEqual(['splat'])
    expect(placeholders(OLD_ADDRESS_RULE.from)).toEqual(placeholders(OLD_ADDRESS_RULE.to))
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
    expect(shadowedPairs(parseRules())).toEqual([])
  })
})

// S31: a splat rule swallows everything beneath its prefix; same-count placeholders still shadow.
describe('shadows (S31)', () => {
  it('lets a splat rule shadow every source beneath its prefix, and nothing else', () => {
    expect(shadows('/zh-TW/*', '/zh-TW/c/001')).toBe(true)
    expect(shadows('/zh-TW/*', '/zh-TW/c/:slug')).toBe(true)
    expect(shadows('/zh-TW/*', '/zh/c/001')).toBe(false)
    expect(shadows('/zh-TW/*', '/c/001')).toBe(false)
    // The same-count comparison is unchanged.
    expect(shadows('/c/:slug', '/c/001')).toBe(true)
    expect(shadows('/:slug', '/zh/c/:slug')).toBe(false)
  })

  describe.each(BOTH)('the generated schema, P = %s', (P) => {
    let root: string
    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'redirects-shadow-'))
    })
    afterEach(() => {
      rmSync(root, { recursive: true, force: true })
    })

    it('has no shadowed pair, for a challenge translated both ways', () => {
      mkdirSync(join(root, 'platform', 'challenge', 'x'), { recursive: true })
      writeFileSync(join(root, 'platform', 'challenge', 'x', 'challenge.yaml'), 'title: x\nnumber: 1\n')
      for (const locale of BOTH) {
        mkdirSync(join(root, 'platform', locale, 'challenge', 'x'), { recursive: true })
        writeFileSync(join(root, 'platform', locale, 'challenge', 'x', 'index.md'), '# x\n')
      }
      writeFileSync(join(root, 'range.json'), JSON.stringify({ primaryLocale: P }))
      const rules = parseRulesText(generateRedirects(root))
      expect(rules.some((r) => r.from.startsWith('/c/'))).toBe(true)
      expect(rules.some((r) => r.from === '/zh-TW/*')).toBe(P === 'zh-TW')
      expect(shadowedPairs(rules)).toEqual([])
    })
  })

  it('has no shadowed pair in the committed file', () => {
    expect(shadowedPairs(parseRules())).toEqual([])
  })

  it('counts one pair per later /zh-TW/ source once the old-address rule is first', () => {
    const rules = parseRules()
    const rest = rules.filter((r) => r.from !== OLD_ADDRESS_RULE.from)
    const later = rest.filter((r) => r.from.startsWith('/zh-TW/')).length
    expect(later).toBeGreaterThan(0)
    expect(shadowedPairs([OLD_ADDRESS_RULE, ...rest])).toHaveLength(later)
  })
})

describe('_redirects rule set', () => {
  const P = indexPrimaryLocale() as Primary

  it('ends with the four slug rules, then the old-address rule when P = zh-TW (G4, S30)', () => {
    // Last, and in this order. Cloudflare takes the first match and `/c/:slug`
    // matches a number too, so a numbered rule below these would never run.
    const rules = parseRules()
    if (P === 'zh-TW') {
      expect(rules.at(-1)).toEqual(OLD_ADDRESS_RULE)
      expect(rules.filter((r) => r.from === OLD_ADDRESS_RULE.from)).toHaveLength(1)
      expect(rules.slice(-5, -1)).toEqual(SLUG_RULES['zh-TW'])
    } else {
      expect(rules.slice(-4)).toEqual(SLUG_RULES.en)
    }
  })

  it('gives every challenge in git’s index its four rules in form order, each at the page D58 names (S29)', () => {
    // From git's per-tree index, not a directory listing: other test files scaffold
    // throwaway challenges into the real tree while this one runs.
    const slugs = indexSlugs(REPO_ROOT)
    const declared = slugs.get('declaration') ?? new Set<string>()
    expect(declared.size, 'no challenge declaration is tracked').toBeGreaterThan(0)
    const numbered = parseRules().filter((r) => !isParameterised(r))
    const forms: Array<[string, Locale | null]> = [
      ['/c/', null],
      ['/en/c/', 'en'],
      ['/zh/c/', 'zh-TW'],
      ['/zh-TW/c/', 'zh-TW'],
    ]

    let included = 0
    for (const slug of declared) {
      const n = readChallengeNumber(resolve(DOCS, 'challenge', slug, 'challenge.yaml'))
      expect(isChallengeNumber(n), `${slug} has no number`).toBe(true)
      const padded = padChallengeNumber(n as number)
      const has = (locale: Locale) => slugs.get(locale)?.has(slug) ?? false
      const mine = numbered.filter((r) => r.from.endsWith(`/c/${padded}`))
      const fallback = has(P) ? P : LOCALES.find(has)
      if (fallback === undefined) {
        expect(mine, `${slug} has no brief, so no rule`).toEqual([])
        continue
      }
      included++
      expect(mine, slug).toEqual(
        forms.map(([prefix, locale]) => ({
          from: `${prefix}${padded}`,
          to: challengePagePath(slug, has(locale ?? P) ? (locale ?? P) : fallback, P),
          status: 302,
        })),
      )
    }
    // Nothing else: every numbered rule belongs to one of those challenges.
    expect(numbered).toHaveLength(4 * included)
  })

  // D124/D149: the real tree's own challenge, so it holds on the upstream tree only.
  it.skipIf(
    upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(REPO_ROOT), isGitWorkTree(REPO_ROOT), hasRootRangeJson(REPO_ROOT)),
  )('gives challenge 001, door-is-open, the four rules the spec writes out (S-§4.1)', () => {
    expect(parseRules().filter((r) => r.from.endsWith('/c/001'))).toEqual([
      { from: '/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/en/c/001', to: '/en/challenge/door-is-open/', status: 302 },
      { from: '/zh/c/001', to: '/challenge/door-is-open/', status: 302 },
      { from: '/zh-TW/c/001', to: '/challenge/door-is-open/', status: 302 },
    ])
  })

  it('admits no rule that is neither a numbered short link, one of P’s slug rules, nor the old-address rule', () => {
    // Containment on shape, which is what survives a rule set that grows with
    // the tree. An unreviewed rule of any other shape still fails here.
    const same = (a: Rule, b: Rule) => a.from === b.from && a.to === b.to && a.status === b.status
    for (const rule of parseRules()) {
      const shape =
        NUMBERED_SOURCE.test(rule.from) ||
        SLUG_RULES[P].some((r) => same(r, rule)) ||
        (P === 'zh-TW' && same(OLD_ADDRESS_RULE, rule))
      expect(shape, `${rule.from} -> ${rule.to} is none of the three shapes`).toBe(true)
      if (P === 'en') expect(rule.from, 'P = en has no splat rule').not.toContain('*')
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
  const P = indexPrimaryLocale()

  it('resolves every parameterised target prefix to a directory of challenges, each with an index.md', () => {
    // A target that is no challenge page address, a missing directory and an empty one are each reported by name.
    expect(targetDirectoryFaults(parseRules(), DOCS, P)).toEqual([])
  })

  it('resolves every literal target to a page', () => {
    // The numbered rules' targets, through the page-path correspondence (D127).
    for (const rule of parseRules().filter((r) => !isParameterised(r))) {
      const page = literalTargetPage(rule.to, DOCS, P)
      expect(
        page !== undefined && existsSync(page),
        `${rule.from} -> ${rule.to} has no page${page === undefined ? ' address in this range' : ` at ${page}`}`,
      ).toBe(true)
    }
  })
})

describe('brief faults on the real tree (S33)', () => {
  const P = indexPrimaryLocale()
  const indexPaths = () =>
    execFileSync('git', ['ls-files', '-z', '--', 'platform/'], { cwd: REPO_ROOT, encoding: 'utf8' })
      .split('\0')
      .filter((p) => p !== '')

  it('holds no brief fault in git’s index (S33)', () => {
    // Every tracked challenge has a declaration and the primary locale's brief; no page lies
    // outside the locale folders under platform/challenge/.
    expect(briefFaults(indexTrees(indexPaths()), P)).toEqual([])
  })

  it('would report a missing primary brief, in memory (the check is not vacuous)', () => {
    const without = `platform/${P}/challenge/door-is-open/index.md`
    const paths = indexPaths()
    expect(paths).toContain(without)
    const faults = briefFaults(indexTrees(paths.filter((p) => p !== without)), P)
    expect(faults.map((f) => `${f.kind}:${f.slug}`)).toEqual(['missing-primary:door-is-open'])
  })
})

// The same checks on throwaway ranges, with each `P`'s own slug rules: what a range that dropped its
// translations, or never had any, gives (spec 0008, G2), and that the refusals hold (S34).
describe.each(BOTH)('_redirects target checks on other ranges, P = %s', (P) => {
  const O: Primary = P === 'en' ? 'zh-TW' : 'en'
  const rules = [...SLUG_RULES[P], ...(P === 'zh-TW' ? [OLD_ADDRESS_RULE] : [])]
  let docs: string

  beforeEach(() => {
    docs = join(mkdtempSync(join(tmpdir(), 'redirects-range-')), 'platform')
  })

  afterEach(() => {
    rmSync(resolve(docs, '..'), { recursive: true, force: true })
  })

  function page(locale: string, slug: string): void {
    mkdirSync(join(docs, locale, 'challenge', slug), { recursive: true })
    writeFileSync(join(docs, locale, 'challenge', slug, 'index.md'), '---\ntitle: x\n---\n')
  }

  const sources = (faults: string[]) => faults.map((f) => f.split(' -> ')[0])

  it(`accepts a range with no ${O} challenge directory`, () => {
    page(P, 'door-is-open')
    expect(targetDirectoryFaults(rules, docs, P)).toEqual([])
  })

  it(`accepts a range whose ${O} challenge directory is empty`, () => {
    page(P, 'door-is-open')
    mkdirSync(join(docs, O, 'challenge'), { recursive: true })
    expect(targetDirectoryFaults(rules, docs, P)).toEqual([])
  })

  it('ignores a folder with no index.md: it is no slug (D127)', () => {
    page(P, 'door-is-open')
    mkdirSync(join(docs, P, 'challenge', 'u'), { recursive: true })
    writeFileSync(join(docs, P, 'challenge', 'u', 'notes.md'), 'x\n')
    expect(targetDirectoryFaults(rules, docs, P)).toEqual([])
  })

  it(`counts a ${P} directory holding only a folder with no index.md as empty (D127)`, () => {
    mkdirSync(join(docs, P, 'challenge', 'u'), { recursive: true })
    writeFileSync(join(docs, P, 'challenge', 'u', 'notes.md'), 'x\n')
    const faults = targetDirectoryFaults(rules, docs, P)
    expect(faults).toHaveLength(P === 'en' ? 2 : 3)
    for (const fault of faults) expect(fault).toContain('has no slugs under')
  })

  it(`refuses a range with no ${P} challenge directory, once per rule that targets it`, () => {
    page(O, 'door-is-open')
    const faults = targetDirectoryFaults(rules, docs, P)
    const expected = P === 'en' ? ['/c/:slug', '/en/c/:slug'] : ['/c/:slug', '/zh/c/:slug', '/zh-TW/c/:slug']
    expect(faults).toHaveLength(expected.length)
    expect(sources(faults)).toEqual(expected)
    for (const fault of faults) expect(fault).toContain('targets missing directory')
  })
})

// B38 (generator half): the full-mode entry reads P, then runs the layout check, before it reads a
// challenge or writes a file. Trees are built under os.tmpdir().
describe('redirects:generate on an old-layout tree (B38)', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'redirects-layout-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const PL_E08_FIRST_LINE =
    'PL-E08: these pages are outside the locale folders. Every page lives in platform/<locale>/ for a locale on the locale list (en, zh-TW); a range on the old layout moves its pages as README.en.md describes in "Moving to the locale folders" (README.md: 「搬到語系資料夾」):'

  function oldLayout(): string {
    mkdirSync(join(root, 'platform', 'public'), { recursive: true })
    mkdirSync(join(root, 'platform', 'challenge', 'x'), { recursive: true })
    writeFileSync(join(root, 'platform', 'index.md'), '# home\n')
    writeFileSync(join(root, 'platform', 'challenge', 'x', 'index.md'), '---\nnumber: 1\n---\n')
    // A declaration with no number: were the challenges read first, this would be the fault.
    writeFileSync(join(root, 'platform', 'challenge', 'x', 'challenge.yaml'), 'title: x\n')
    return join(root, 'platform', 'public', '_redirects')
  }

  function thrown(): unknown {
    try {
      writeRedirects(root)
    } catch (err) {
      return err
    }
    return undefined
  }

  it('throws PL-E08 with its first line and lists the pages, and writes no file', () => {
    const target = oldLayout()
    const err = thrown()
    expect(err).toBeInstanceOf(SiteLayoutError)
    expect((err as SiteLayoutError).code).toBe('PL-E08')
    const lines = (err as Error).message.split('\n')
    expect(lines[0]).toBe(PL_E08_FIRST_LINE)
    expect(lines).toContain('  "platform/challenge/x/index.md"')
    expect(lines).toContain('  "platform/index.md"')
    expect(existsSync(target)).toBe(false)
  })

  it('reads range.json first: an unusable one is PL-E03, not PL-E08 (D123)', () => {
    const target = oldLayout()
    writeFileSync(join(root, 'range.json'), '{')
    const err = thrown()
    expect((err as SiteLayoutError).code).toBe('PL-E03')
    expect((err as Error).message.split('\n')[0]).toBe('PL-E03: range.json is not valid JSON.')
    expect(existsSync(target)).toBe(false)
  })

  it('the same challenge in the new layout writes the file', () => {
    mkdirSync(join(root, 'platform', 'public'), { recursive: true })
    mkdirSync(join(root, 'platform', 'en', 'challenge', 'x'), { recursive: true })
    mkdirSync(join(root, 'platform', 'challenge', 'x'), { recursive: true })
    writeFileSync(join(root, 'range.json'), '{"primaryLocale":"en"}')
    writeFileSync(join(root, 'platform', 'en', 'index.md'), '# home\n')
    writeFileSync(join(root, 'platform', 'en', 'challenge', 'x', 'index.md'), '# x\n')
    writeFileSync(join(root, 'platform', 'challenge', 'x', 'challenge.yaml'), 'number: 1\n')

    const target = writeRedirects(root)
    expect(existsSync(target)).toBe(true)
    expect(readFileSync(target, 'utf8')).toContain('/c/001')
  })
})

// S-§4.7: the index's paths, sorted into the trees the brief check reads (0010-S24, D149).
describe('indexTrees (S-§4.7)', () => {
  it('builds the declaration and locale slug sets and the sorted legacy paths from git ls-files paths', () => {
    const trees = indexTrees([
      'platform/en/challenge/door/index.md',
      'platform/zh-TW/challenge/door/index.md',
      'platform/en/challenge/gate/index.md',
      'platform/challenge/gate/challenge.yaml',
      'platform/challenge/x/index.md',
      'platform/challenge/s.md',
      'platform/challenge/x/src/readme.md',
      'platform/zh-TW/challenge/t/diagram.png',
      'platform/fr/challenge/x/index.md',
      'platform/public/challenge/x/notes.md',
    ])
    expect(Object.fromEntries([...trees.slugs].map(([k, v]) => [k, [...v].sort()]))).toEqual({
      declaration: ['gate'],
      en: ['door', 'gate'],
      'zh-TW': ['door'],
    })
    expect(trees.legacyPaths).toEqual(['platform/challenge/s.md', 'platform/challenge/x/index.md'])
  })
})

// S35: the brief check's kinds by P (D64, D127).
describe.each(BOTH)('briefFaults (S35), P = %s', (P) => {
  const O = P === 'en' ? 'zh-TW' : 'en'
  const brief = (l: string, slug = 's') => `platform/${l}/challenge/${slug}/index.md`
  const decl = (slug = 's') => `platform/challenge/${slug}/challenge.yaml`
  const faultsOf = (paths: string[]): BriefFault[] => briefFaults(indexTrees(paths), P)
  const missingPrimary = (present: string): BriefFault =>
    ({ kind: 'missing-primary', slug: 's', present, missing: brief(P) })
  const missingDeclaration = (present: string): BriefFault =>
    ({ kind: 'missing-declaration', slug: 's', present, missing: decl() })

  const cases: Array<[string, () => string[], () => BriefFault[]]> = [
    ['(i) a translated brief, no primary brief, a declaration', () => [brief(O), decl()], () => [missingPrimary(brief(O))]],
    ['(ii) only a declaration', () => [decl()], () => [missingPrimary(decl())]],
    ['(iii) the primary brief, no declaration', () => [brief(P)], () => [missingDeclaration(brief(P))]],
    [
      '(iii) both briefs, no declaration',
      () => [brief(O), brief(P)],
      () => [brief('en'), brief('zh-TW')].map(missingDeclaration),
    ],
    [
      '(iv) only a translated brief, no declaration',
      () => [brief(O)],
      () => [missingPrimary(brief(O)), missingDeclaration(brief(O))],
    ],
    [
      '(v) a legacy folder page',
      () => ['platform/challenge/s/index.md'],
      () => [{ kind: 'old-layout', slug: 's', present: 'platform/challenge/s/index.md', missing: null }],
    ],
    [
      '(v) a legacy single-file page',
      () => ['platform/challenge/s.md'],
      () => [{ kind: 'old-layout', slug: 's', present: 'platform/challenge/s.md', missing: null }],
    ],
    ['(vi) the primary brief and a declaration', () => [brief(P), decl()], () => []],
    ['(vi) both briefs and a declaration', () => [brief(P), brief(O), decl()], () => []],
    ['a folder with no index.md is no brief (D127)', () => [`platform/${P}/challenge/t/diagram.png`, `platform/${O}/challenge/t/diagram.png`], () => []],
  ]
  it.each(cases)('%s', (_name, paths, expected) => {
    expect(faultsOf(paths())).toEqual(expected())
  })

  it(`ignores a folder off the locale list (P = ${P})`, () => {
    const off = 'platform/fr/challenge/x/index.md'
    const clean = [brief(P), decl()]
    const faulty = [brief(O), decl('t')]
    for (const paths of [clean, faulty]) {
      expect(faultsOf([...paths, off])).toEqual(faultsOf(paths))
      expect(faultsOf([off, ...paths])).toEqual(faultsOf(paths))
      expect(indexTrees([...paths, off]).slugs.has('fr' as never)).toBe(false)
    }
    expect(faultsOf(faulty).length).toBeGreaterThan(0)
  })
})

// Y111 (D127), the redirects clause: a folder with no index.md is no brief, so it is no slug and no
// fault. The hook clause (W4 names no such folder) is pre-commit-sh.test.ts's; `targetDirectoryFaults`
// ignoring `u` is 'ignores a folder with no index.md: it is no slug (D127)' above.
describe('Y111 (D127): only index.md makes a brief, P = zh-TW', () => {
  const declared = [
    'platform/challenge/s/challenge.yaml',
    'platform/zh-TW/challenge/s/index.md',
    'platform/zh-TW/challenge/s/hints.md',
    'platform/zh-TW/challenge/t/diagram.png',
    'platform/zh-TW/challenge/u/notes.md',
  ]

  it('indexTrees lists only s as a zh-TW slug, and briefFaults finds none', () => {
    const trees = indexTrees(declared)
    expect([...(trees.slugs.get('zh-TW') ?? [])]).toEqual(['s'])
    expect(briefFaults(trees, 'zh-TW')).toEqual([])
  })

  it('contrast: a declaration for t gives exactly one missing-primary fault (W6b), whose present file is that declaration', () => {
    const faults = briefFaults(indexTrees([...declared, 'platform/challenge/t/challenge.yaml']), 'zh-TW')
    expect(faults).toEqual([
      {
        kind: 'missing-primary',
        slug: 't',
        present: 'platform/challenge/t/challenge.yaml',
        missing: 'platform/zh-TW/challenge/t/index.md',
      },
    ])
  })
})

describe('briefFaults order (S35, S-§4.7)', () => {
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  it('returns the S-§4.7 example verbatim, in D64 order (P = zh-TW)', () => {
    const paths = [
      'platform/challenge/x/index.md',
      'platform/challenge/gate/challenge.yaml',
      'platform/en/challenge/gate/index.md',
      'platform/zh-TW/challenge/door/index.md',
      'platform/en/challenge/door/index.md',
    ]
    expect(briefFaults(indexTrees(paths), 'zh-TW')).toEqual([
      { kind: 'missing-declaration', slug: 'door', present: 'platform/en/challenge/door/index.md', missing: 'platform/challenge/door/challenge.yaml' },
      { kind: 'missing-declaration', slug: 'door', present: 'platform/zh-TW/challenge/door/index.md', missing: 'platform/challenge/door/challenge.yaml' },
      { kind: 'missing-primary', slug: 'gate', present: 'platform/en/challenge/gate/index.md', missing: 'platform/zh-TW/challenge/gate/index.md' },
      { kind: 'old-layout', slug: 'x', present: 'platform/challenge/x/index.md', missing: null },
    ])
  })

  it('orders by slug (UTF-16), then kind (W6a, W6b, W6c, W6d), then present', () => {
    // Slug 'B' sorts before 'a' by code unit (localeCompare would put 'a' first). Slug 'a' has a
    // missing-primary (W6a) and a missing-declaration (W6c); 'B' has a legacy page (W6d) too.
    const paths = [
      'platform/challenge/B/index.md',
      'platform/en/challenge/a/index.md',
      'platform/challenge/B/challenge.yaml',
      'platform/en/challenge/B/index.md',
    ]
    const faults = briefFaults(indexTrees(paths), 'zh-TW')
    expect(faults.map((f) => `${f.slug}:${f.kind}`)).toEqual([
      'B:missing-primary',
      'B:old-layout',
      'a:missing-primary',
      'a:missing-declaration',
    ])
    expect(faults.map((f) => f.slug)).toEqual([...faults.map((f) => f.slug)].sort(cmp))
  })
})
