/**
 * generate-redirects.ts
 *
 * Produces `platform/public/_redirects` from the challenge tree.
 *
 * Usage:
 *   pnpm redirects:generate           # rewrite platform/public/_redirects
 *   node --experimental-strip-types scripts/generate-redirects.ts --staged --root <top level>
 *                                     # print the staged snapshot's file (the pre-commit hook)
 *
 * The file used to be hand-edited. Nothing then kept it in step with the
 * challenge tree, and its contents are a public commitment — the paths in it
 * are printed on handouts. Generating it makes the tree the single source, and
 * `tests/unit/site/redirects-generated.test.ts` fails when the committed file
 * and the tree disagree.
 *
 * Full mode reads the primary locale `P` from `range.json` first (D123), then checks the
 * layout of `platform/` (D19), then writes the file; every challenge's rules follow D58 from
 * its declaration `platform/challenge/<slug>/challenge.yaml` and its briefs
 * `platform/<locale>/challenge/<slug>/index.md`.
 *
 * `--staged` is how `scripts/pre-commit.sh` regenerates the file, on every commit that carries a
 * change at a watched path. It reads the index slugs (`indexSlugs`); the hook has already put
 * the staged snapshot in the working tree under `platform/`, but ignored directories stay on
 * disk, so a file counts only when git's index lists it. The output goes to stdout; the hook
 * writes and stages it only once generation succeeded.
 */

import { writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import {
  collectChallengeNumbers,
  checkChallengeNumbers,
  padChallengeNumber,
  isChallengeNumber,
} from './challenge-numbers.ts'
import { challengePagePath, SLUG_GRAMMAR } from '../.vitepress/challenge/shortLink.ts'
import { DEFAULT_PRIMARY_LOCALE, LOCALES, LOCALE_ENGLISH_NAMES, type Locale } from '../.vitepress/locales.ts'
import { readPrimaryLocale } from '../.vitepress/primary-locale.ts'
import { checkSourceLayout, classifySourcePath } from '../.vitepress/source-layout.ts'
import { jsonStringifyEscaped } from '../.vitepress/layout-error.ts'

/**
 * A short-link form: the rule source prefix and the locale whose page it opens. `null` is the
 * primary locale (`/c/` opens the primary locale's page, whichever locale that is).
 */
export interface Form {
  prefix: string
  locale: Locale | null
}

/**
 * The short-link forms, in the order each challenge's rules are written (D57): `/c/`, then
 * `/<L>/c/` for each locale `L` of the list in list order, the legacy alias `/zh/c/` written
 * immediately before `/zh-TW/c/`. `/en/c/` and `/zh-TW/c/` are what the copy control gives;
 * `/c/` and `/zh/c/`, given out before spec 0008, are kept so links already handed out keep
 * opening. The order does not depend on `P`, so switching `P` changes targets only.
 */
const FORMS: ReadonlyArray<Form> = [
  { prefix: '/c/', locale: null },
  ...LOCALES.flatMap((locale): Form[] => [
    ...(locale === 'zh-TW' ? [{ prefix: '/zh/c/', locale }] : []),
    { prefix: `/${locale}/c/`, locale },
  ]),
]

const STATUS = '302'

/** Cloudflare Pages' limit on static redirect rules (K1). */
const STATIC_RULE_LIMIT = 2000

/** The old-address rule, written last and only when `P = zh-TW` (D60). */
const OLD_ADDRESS_RULE: [string, string] = ['/zh-TW/*', '/:splat']

/** Wrap prose into `# ` comment lines that read back, joined by one space, as the same text. */
function commentLines(text: string, width = 78): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line !== '' && `# ${line} ${word}`.length > width) {
      lines.push(`# ${line}`)
      line = word
    } else {
      line = line === '' ? word : `${line} ${word}`
    }
  }
  if (line !== '') lines.push(`# ${line}`)
  return lines
}

/**
 * The file's header. The capacity sentences are computed from the form list (K1–K3): F forms
 * take F static rules per numbered challenge and F dynamic slug rules, and the old-address rule
 * of `P = zh-TW` is one more dynamic rule.
 */
export function redirectsHeader(primary: Locale, forms: ReadonlyArray<Form> = FORMS): string {
  const f = forms.length
  const n = Math.floor(STATIC_RULE_LIMIT / f)
  const k1 = `Cloudflare Pages allows 2,000 static and 100 dynamic rules. Every numbered challenge takes one static rule per short-link form, ${f} in all, so a range holds at most ${n} numbered challenges.`
  const k2 = primary === 'zh-TW'
    ? `The slug links take ${f} dynamic rules, and the rule for old /zh-TW/ addresses takes 1 more.`
    : `The slug links take ${f} dynamic rules.`
  const syntax = [
    '# Cloudflare Pages redirect rules. This file is copied verbatim to the site root',
    '# by VitePress (everything under platform/public/ lands in .vitepress/dist/).',
    '#',
    '# It has no effect under `pnpm dev` — the VitePress dev server does not read it.',
    '# Test it with `pnpm pages:dev`, which serves the built output through the same',
    '# Pages runtime that production uses.',
    '#',
  ]
  const generated = [
    '#',
    '# `platform/public/_redirects` is generated from the challenges; do not edit it',
    '# by hand. `pnpm create:challenge` and the pre-commit hook regenerate it when',
    '# challenges change. Commit it together with them: GitHub Pages does not read',
    '# it, but CI checks that it matches the challenges. If CI reports it stale, run',
    '# `pnpm redirects:generate` and commit the result.',
    '#',
    '# `pnpm build` rewrites it too. The CI check is',
    '# tests/unit/site/redirects-generated.test.ts.',
  ]
  return [
    ...syntax,
    ...commentLines(
      `Syntax: <from> <to> <status>. \`:name\` captures one path segment and is substituted on the right. First matching rule wins, so put specific rules above general ones. ${k1} ${k2}`,
    ),
    ...generated,
  ].join('\n')
}

/** The numbered section's comment (K4), with `P`'s name filled in, then the order paragraph. */
function numericSection(primary: Locale, forms: ReadonlyArray<Form> = FORMS): string {
  const k4 = `Numbered short links, ${forms.length} per challenge. A number is assigned once and never reused, so a link printed on a handout keeps pointing at the same challenge even after the challenge is renamed. The copy control gives each locale's own form, /en/c/NNN and /zh-TW/c/NNN; /c/NNN, which opens the primary locale's page, and /zh/c/NNN are kept so links already handed out keep opening. A locale's rules open the ${LOCALE_ENGLISH_NAMES[primary]} page, the primary locale's, while the challenge has no page in that locale, or, for a challenge without a primary-locale page, the first locale's page that exists.`
  return [
    ...commentLines(k4),
    '#',
    '# These come first on purpose: Cloudflare takes the first match and `/c/:slug`',
    '# matches any single segment, a number included. A numeric rule placed after it',
    '# would never run, and nothing about that would be visible at deploy time.',
  ].join('\n')
}

const PARAMETERISED_SECTION = `# Slug short links for classroom use — students can be given /en/c/<slug> or
# /zh-TW/c/<slug> to type or paste rather than the full /challenge/<slug>/ path;
# /c/<slug> and /zh/c/<slug> keep working. Parameterised, so they follow a
# rename; the numbered rules above are what survives one.`

/** K5: the old-address section, written only when `P = zh-TW`. */
const OLD_ADDRESS_SECTION = commentLines(
  "Addresses under /zh-TW/ from when Traditional Chinese was a translation. This range's primary locale is Traditional Chinese, so its pages are at the root: /zh-TW/<path> goes to /<path>. Last on purpose: every /zh-TW/c/ rule above must match first.",
).join('\n')

interface NumericRule {
  number: number
  from: string
  to: string
}

/** The tree names `includeSlug` is asked about: a challenge declaration, or a locale's brief tree. */
export type IncludeTree = 'declaration' | Locale

export interface GenerateOptions {
  /**
   * Which files to include, asked once per file with its slug and the tree it sits in: the
   * challenge declaration (`declaration`) or a locale's brief (`en`, `zh-TW`, … the locale
   * list's codes). Defaults to all of them.
   *
   * Two callers restrict it, both to what git tracks:
   *
   * - The guard test that compares the committed file with freshly generated
   *   content. Other test files scaffold a throwaway challenge into the real tree to exercise
   *   the keygen CLI, and vitest runs test files in parallel — so the guard can observe a
   *   directory that exists for a few hundred milliseconds and belongs to nobody. Bounding it
   *   to what git tracks removes that race without weakening the assertion.
   * - The pre-commit hook (`--staged`) passes the index slugs: a file counts only when it is
   *   in the index, and the primary locale comes from the index's `range.json` (D67). A brief left
   *   out this way re-points its locale's rules at the primary locale's page (D58). On a clean
   *   checkout, as in CI, both give the same file.
   */
  includeSlug?: (slug: string, tree: string) => boolean
}

/** The slugs under `platform/<locale>/challenge/` whose folder holds an `index.md` file (D127). */
function briefSlugs(root: string, locale: Locale): string[] {
  const dir = join(root, 'platform', locale, 'challenge')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => {
      try {
        return statSync(join(dir, d.name, 'index.md')).isFile()
      } catch {
        return false
      }
    })
    .map((d) => d.name)
    .sort()
}

/** D150: the slug lines (outside the grammar, or equal to another challenge's padded number), UTF-16 sorted. */
function slugFaults(names: ReadonlySet<string>, numbers: ReadonlyMap<string, number>): string[] {
  const faults: string[] = []
  for (const name of names) {
    if (!SLUG_GRAMMAR.test(name)) {
      faults.push(`redirects: challenge slug ${jsonStringifyEscaped(name)} is outside ${SLUG_GRAMMAR.source}`)
    }
  }
  const padded = new Map<string, string>()
  for (const [slug, number] of numbers) padded.set(padChallengeNumber(number), slug)
  for (const name of names) {
    if (!/^[0-9]+$/.test(name)) continue
    const holder = padded.get(name)
    if (holder !== undefined && holder !== name) {
      faults.push(`redirects: challenge slug ${jsonStringifyEscaped(name)} equals challenge ${name}'s padded number`)
    }
  }
  return faults.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/**
 * The numeric rules the tree calls for, ordered by number, then the form order.
 *
 * A challenge is its declaration `platform/challenge/<slug>/challenge.yaml`, which carries the
 * number; its briefs `platform/<L>/challenge/<slug>/index.md` are pages and are never read for
 * a number. A challenge with at least one included brief gets one rule per form, for a form of
 * locale `L` at `L`'s page when its brief is included, otherwise at the primary locale's page
 * `P` when that brief is included, otherwise at the first locale of the list whose brief is
 * included (D58). A rule never targets a page known not to exist. Adding or deleting a
 * translation, or leaving its directory untracked or ignored, re-points rules; it never adds or
 * removes them. A challenge with no included brief gets none.
 *
 * A brief with no included declaration has no number: that is a number fault (D64 b).
 */
function numericRules(root: string, primary: Locale, options: GenerateOptions = {}): NumericRule[] {
  const include = options.includeSlug ?? (() => true)
  const entries = collectChallengeNumbers(root).filter((e) => include(e.slug, 'declaration'))
  const briefs = new Map<Locale, Set<string>>(
    LOCALES.map((locale) => [locale, new Set(briefSlugs(root, locale).filter((slug) => include(slug, locale)))]),
  )

  // D150, after the primary locale and before any number fault.
  const names = new Set<string>(entries.map((e) => e.slug))
  for (const set of briefs.values()) for (const slug of set) names.add(slug)
  const numbers = new Map<string, number>()
  for (const e of entries) if (isChallengeNumber(e.value)) numbers.set(e.slug, e.value)
  const slugLines = slugFaults(names, numbers)
  if (slugLines.length > 0) throw new Error(slugLines.join('\n'))

  const failures = checkChallengeNumbers(entries).filter((c) => !c.passed).map((c) => c.message)
  const declared = new Set(entries.map((e) => e.slug))
  for (const slug of [...names].sort()) {
    if (declared.has(slug)) continue
    for (const locale of LOCALES) {
      if (briefs.get(locale)?.has(slug)) {
        const brief = ['platform', locale, 'challenge', slug, 'index.md'].join('/')
        const declaration = ['platform', 'challenge', slug, 'challenge.yaml'].join('/')
        failures.push(`${slug} (${brief}) has no declaration ${declaration}, so no number`)
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(
      'Cannot generate _redirects: the challenge tree is inconsistent.\n' +
        failures.map((f) => `  - ${f}`).join('\n'),
    )
  }

  const rules: NumericRule[] = []
  for (const entry of entries) {
    if (!isChallengeNumber(entry.value)) continue // unreachable: checked above
    const slug = entry.slug
    const has = (locale: Locale) => briefs.get(locale)?.has(slug) ?? false
    const fallback = has(primary) ? primary : LOCALES.find(has)
    if (fallback === undefined) continue
    const padded = padChallengeNumber(entry.value)
    for (const form of FORMS) {
      const locale = form.locale ?? primary
      rules.push({
        number: entry.value,
        from: `${form.prefix}${padded}`,
        to: challengePagePath(slug, has(locale) ? locale : fallback, primary),
      })
    }
  }

  // By number; within a number the form order above, which `sort` keeps. Stable, so a
  // regeneration produces no spurious diff.
  return rules.sort((a, b) => a.number - b.number)
}

/** Lay the three fields out in columns, the way the hand-written file did. */
function formatRules(rows: ReadonlyArray<[string, string]>): string[] {
  const fromWidth = Math.max(...rows.map(([from]) => from.length))
  const toWidth = Math.max(...rows.map(([, to]) => to.length))
  return rows.map(([from, to]) => `${from.padEnd(fromWidth)}  ${to.padEnd(toWidth)}  ${STATUS}`)
}

/**
 * The complete contents of `platform/public/_redirects` for a given repository root. `P` is read
 * first, before any challenge (D123). The layout check is `writeRedirects`'s: this function is
 * also called on index snapshots and by guards (D19).
 */
export function generateRedirects(root: string, options: GenerateOptions = {}): string {
  const primary = readPrimaryLocale(join(root, 'range.json'))
  const numeric = numericRules(root, primary, options)
  // Slug rules: one per form, after every numbered rule, at the form locale's page (D59). A slug
  // rule cannot know whether the page exists; the site's not-found handling takes a missing one.
  const parameterised: Array<[string, string]> = FORMS.map((form) => [
    `${form.prefix}:slug`,
    challengePagePath(':slug', form.locale ?? primary, primary),
  ])
  const oldAddress = primary === 'zh-TW'
  const rows: Array<[string, string]> = [
    ...numeric.map((r) => [r.from, r.to] as [string, string]),
    ...parameterised,
    ...(oldAddress ? [OLD_ADDRESS_RULE] : []),
  ]
  const lines = formatRules(rows)
  const numericLines = lines.slice(0, numeric.length)
  const parameterisedLines = lines.slice(numeric.length, numeric.length + parameterised.length)
  const oldAddressLines = lines.slice(numeric.length + parameterised.length)

  const blocks = [redirectsHeader(primary), '']
  if (numericLines.length > 0) blocks.push(numericSection(primary), ...numericLines, '')
  blocks.push(PARAMETERISED_SECTION, ...parameterisedLines, '')
  if (oldAddress) blocks.push(OLD_ADDRESS_SECTION, ...oldAddressLines, '')
  return blocks.join('\n')
}

/**
 * Rewrite `platform/public/_redirects` (the full mode; the CLI and `create:challenge` go through it).
 *
 * `P` is read first, then the layout check runs on `platform/` (D19, D123); generation then
 * throws on an inconsistent tree, so a refusal leaves whatever was on disk untouched rather
 * than writing a partial file.
 */
export function writeRedirects(root: string, options: GenerateOptions = {}): string {
  const primary = readPrimaryLocale(join(root, 'range.json'))
  checkSourceLayout(join(root, 'platform'), primary)
  const content = generateRedirects(root, options)
  const target = join(root, 'platform', 'public', '_redirects')
  writeFileSync(target, content, 'utf-8')
  return target
}

export type Slug = string

/** What the index holds, sorted into the trees the brief check reads (S-§4.7). */
export interface IndexTrees {
  /** `declaration` ← `platform/challenge/<slug>/challenge.yaml`; `<L>` ← `platform/<L>/challenge/<slug>/index.md`. */
  slugs: Map<'declaration' | Locale, Set<Slug>>
  /** Index paths under `platform/challenge/` that `classifySourcePath` calls `outside`, UTF-16 sorted. */
  legacyPaths: string[]
}

/** Sort the repository-relative paths `git ls-files -z` prints into `IndexTrees` (S-§4.7). */
export function indexTrees(paths: readonly string[]): IndexTrees {
  const slugs = new Map<'declaration' | Locale, Set<Slug>>([
    ['declaration', new Set<Slug>()],
    ...LOCALES.map((locale): ['declaration' | Locale, Set<Slug>] => [locale, new Set<Slug>()]),
  ])
  const legacyPaths: string[] = []
  for (const path of paths) {
    const parts = path.split('/')
    if (parts[0] !== 'platform') continue
    if (parts.length === 4 && parts[1] === 'challenge' && parts[3] === 'challenge.yaml') {
      slugs.get('declaration')?.add(parts[2])
    }
    const locale = LOCALES.find((l) => l === parts[1])
    if (locale !== undefined && parts.length === 5 && parts[2] === 'challenge' && parts[4] === 'index.md') {
      slugs.get(locale)?.add(parts[3])
    }
    if (
      parts[1] === 'challenge' &&
      classifySourcePath(parts.slice(1).join('/'), DEFAULT_PRIMARY_LOCALE) === 'outside'
    ) {
      legacyPaths.push(path)
    }
  }
  legacyPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return { slugs, legacyPaths }
}

/**
 * The index slugs of `root`'s repository, per tree (`declaration` and each locale), the input of
 * the brief-fault check (D64) and of the `--staged` mode's `includeSlug` (D67). git is run in
 * `root` with the caller's environment, so inside a hook it reads the index git handed it.
 */
export function indexSlugs(root: string): Map<'declaration' | Locale, Set<Slug>> {
  const out = execFileSync('git', ['ls-files', '-z', '--', 'platform/'], { cwd: root, encoding: 'utf8' })
  return indexTrees(out.split('\0').filter((p) => p !== '')).slugs
}

/** A brief fault (S-§4.7). `present` and `missing` are repository-relative paths. */
export type BriefFault =
  | { kind: 'missing-primary'; slug: Slug; present: string; missing: string }
  | { kind: 'missing-declaration'; slug: Slug; present: string; missing: string }
  | { kind: 'old-layout'; slug: Slug; present: string; missing: null }

const briefPath = (locale: Locale, slug: Slug): string => ['platform', locale, 'challenge', slug, 'index.md'].join('/')
const declarationPath = (slug: Slug): string => ['platform', 'challenge', slug, 'challenge.yaml'].join('/')

/** The faults of the index's briefs under primary locale `primary` (D64). */
export function briefFaults(trees: IndexTrees, primary: Locale): BriefFault[] {
  const faults: BriefFault[] = []
  const has = (locale: Locale, slug: Slug) => trees.slugs.get(locale)?.has(slug) ?? false
  const slugs = new Set<Slug>()
  for (const set of trees.slugs.values()) for (const slug of set) slugs.add(slug)
  for (const slug of slugs) {
    const first = LOCALES.find((locale) => has(locale, slug))
    if (!has(primary, slug)) {
      const present = first !== undefined ? briefPath(first, slug) : declarationPath(slug)
      faults.push({ kind: 'missing-primary', slug, present, missing: briefPath(primary, slug) })
    }
    if (!(trees.slugs.get('declaration')?.has(slug) ?? false)) {
      for (const locale of LOCALES) {
        if (!has(locale, slug)) continue
        faults.push({
          kind: 'missing-declaration',
          slug,
          present: briefPath(locale, slug),
          missing: declarationPath(slug),
        })
      }
    }
  }
  for (const present of trees.legacyPaths) {
    const parts = present.split('/')
    const slug = parts.length === 3 ? parts[2].replace(/\.md$/, '') : parts[2]
    faults.push({ kind: 'old-layout', slug, present, missing: null })
  }
  // D64's order: slug, then kind (W6a/W6b missing-primary, W6c missing-declaration, W6d old-layout),
  // then present, each by UTF-16 code unit.
  const rank = { 'missing-primary': 0, 'missing-declaration': 1, 'old-layout': 2 } as const
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return faults.sort(
    (a, b) => cmp(a.slug, b.slug) || rank[a.kind] - rank[b.kind] || cmp(a.present, b.present),
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

const __filename_ = fileURLToPath(import.meta.url)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('generate-redirects.ts') ||
  process.argv[1].endsWith('generate-redirects.js')
)
if (isDirectRun) {
  const { values } = parseArgs({ options: { staged: { type: 'boolean' }, root: { type: 'string' } } })
  const root = values.root !== undefined ? resolve(values.root) : resolve(dirname(__filename_), '..')
  try {
    if (values.staged) {
      const slugs = indexSlugs(root)
      process.stdout.write(
        generateRedirects(root, { includeSlug: (slug, locale) => slugs.get(locale)?.has(slug) ?? false }),
      )
    } else {
      if (!existsSync(join(root, 'platform', 'public'))) {
        console.error(`platform/public not found under ${root}`)
        process.exit(1)
      }
      const target = writeRedirects(root)
      console.log(`✓ Wrote ${target}`)
    }
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}
