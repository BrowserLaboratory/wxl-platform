/**
 * fork-init.ts
 *
 * Deterministic edits to fork this template repo into a new project.
 * The wxl-fork-init skill calls this CLI instead of hand-editing files.
 * create-wxl (the npm package, 0005-create-wxl) carries a type-stripped copy of this file: it
 * calls parseForkInitArgs and runForkInit on a range it just created, and also uses
 * deriveGithubPagesOrigin, ForkInitArgError and UPSTREAM_SLUG.
 *
 * Usage:
 *   pnpm fork:init --author <name> --repo <owner/repo>
 *                  [--base <path> | --base none | --host github-pages|cloudflare-pages]
 *                  [--origin <https://host[/path]>] [--site-name <text>]
 *                  [--name <pkg-name>] [--description <text>]
 *                  [--rebrand <newshortname>] [--dry-run]
 *
 *   --host and --base are mutually exclusive: --host decides the workflow and resets A9
 *   (the base definition) to its upstream form from deployment; --base only applies without
 *   --host, and writes A9 as a literal.
 *
 *   --origin sets the short-link origin (A8); --host github-pages derives it when --origin is
 *   not given (required with --host cloudflare-pages). --site-name sets the site title (A6) and
 *   both home pages' hero name (A7). --rebrand cannot be combined with --host, --origin or
 *   --site-name (A mode's new flags are rejected in B mode).
 *
 * Modes:
 *   A (default)          rewrites only the identity anchors (traceability.md's A1-A9):
 *                        the manifest (structured), the doc-anchor forms in README.md,
 *                        README.en.md and CONTRIBUTE.md — wherever they occur, whatever
 *                        repository slug they held — A9 (the base definition), A6/A7 (the site
 *                        name, from --site-name), A8 (the short-link origin, from --origin or
 *                        derived), and the deploy workflow (chosen by --host). No tree walk;
 *                        every other file is byte-identical.
 *   B (--rebrand <name>) today's path: walks the whole tree doing the upstream-slug swap and
 *                        also renames the four runtime-sensitive keys (deterministic,
 *                        structure-aware), plus an HONEST residual inventory of every
 *                        remaining case-insensitive `wxl` (which is NOT auto-renamed — see
 *                        "Why not rename every wxl?" below). Unlike the rest of the walk, a root
 *                        range.json (create-wxl's setup record) is never rewritten in B mode —
 *                        it still goes through the residual scan, so it keeps appearing in the
 *                        inventory when it carries the upstream slug.
 *
 * Why not rename every `wxl`?
 *   In this repo the substring `wxl` spans several unrelated identifier families that a
 *   deterministic text tool cannot tell apart: the brand short-name, the `wxlsh` challenge
 *   subsystem / `X-Wxlsh-*` wire headers, the four runtime-sensitive keys, the upstream repo
 *   slug, and path-referenced skill/spec directory names. A blind `wxl`->`x` replace corrupts
 *   the ones that must survive (e.g. `wxlsh`->`xsh`, or a dead `.../x-template` link) and does
 *   so silently. So B-mode renames ONLY what it can prove is a full, self-contained token (the
 *   upstream slug + the 4 keys) and reports everything else as a manual, namespace-aware to-do,
 *   computed from the bytes actually written. It never claims the rebrand is complete while a
 *   `wxl` remains.
 *
 * Exit codes:
 *   0  success (A mode complete; B mode: deterministic edits done — a residual inventory may remain)
 *   1  user input error or tree error (invalid/missing flag, or a problem found in the tree — see
 *      ForkInitArgError and the tree-error returns in runForkInit)
 */

import { parseArgs } from 'node:util'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  lstatSync,
  chmodSync,
  renameSync,
  unlinkSync,
} from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse as parseYaml, parseDocument as parseYamlDocument, isScalar, isMap, isPair } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const PROJECT_ROOT = resolve(__dirname, '..')

// ─── args ────────────────────────────────────────────────────────────────────

export interface ForkInitArgs {
  author: string
  repo: string
  /** undefined = A9 untouched; null = --base none, written as A9 `const siteBase = '/'`; string =
   *  --base <path>, written as A9 `const siteBase = '<path>'` */
  base?: string | null
  /** present => --host decides the workflow and resets A9 to its upstream form; mutually
   *  exclusive with `base` (T17) */
  host?: 'github-pages' | 'cloudflare-pages'
  /** present => --origin <value>, validated against the origin grammar (T32-T34) and normalised
   *  (hostname lowercased); undefined => A8 is derived (--host github-pages) or left untouched */
  origin?: string
  /** present => --site-name <value>, trimmed and validated (character rule plus `<`, `>`, `&`);
   *  undefined => A6/A7 are left untouched */
  siteName?: string
  name?: string
  description?: string
  /** present => rebrand (B) mode */
  rebrand?: string
  dryRun: boolean
}

export class ForkInitArgError extends Error {
  readonly exitCode: number

  constructor(message: string, exitCode: number = 1) {
    super(message)
    this.name = 'ForkInitArgError'
    this.exitCode = exitCode
  }
}

// Repository-slug grammar (traceability.md, "Repository-slug grammar" / T45): owner is
// alphanumerics and `-`, 1-39 characters, no leading or trailing `-`; name is
// `[A-Za-z0-9._-]{1,100}`, not `.` or `..`, and not ending in `.git` (any case).
const REPO_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const REPO_NAME_RE = /^[A-Za-z0-9._-]{1,100}$/
// Base grammar (traceability.md, "Base grammar" / T21): `/`, or `/` followed by one or more
// segments each ending in `/`; a segment is URL-path-safe and is never `.` or `..` — the same
// grammar `.vitepress/config.mts` checks on the resolved `siteBase` (T31), unified here in one
// place for `--base`. Rejecting quotes and `$` also keeps the value from breaking out of the A9
// string literal it is written into (.vitepress/config.mts is an executable TS module).
const BASE_RE = /^\/(?:(?!\.\.?\/)[A-Za-z0-9._~-]+\/)*$/

// Origin grammar (traceability.md, "Origin grammar" / T32-T34): `https://` + hostname + path.
// A hostname label and a path segment share the same base alphabet; the label additionally bounds
// its own length (1-63) and forbids a leading/trailing `-`.
const ORIGIN_LABEL_RE = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/
const ORIGIN_PATH_SEGMENT_RE = /^[A-Za-z0-9._~-]+$/

/** T32-T34/AC-O1: validates `raw` against the origin grammar and returns it with the hostname
 *  lowercased (the path's case is untouched). Throws `ForkInitArgError` naming `--origin` and the
 *  JSON-quoted value for any grammar violation (T33), and separately for a path given together
 *  with `--host cloudflare-pages` (T34, which needs to know whether the host is Cloudflare —
 *  passed in by the caller, since this function only knows the origin's own shape). */
function validateOriginValue(raw: string, host: 'github-pages' | 'cloudflare-pages' | undefined): string {
  const fail = (reason?: string): never => {
    throw new ForkInitArgError(
      `--origin must be https://<hostname>[/path] (no userinfo, port, query, fragment or trailing slash)${
        reason ? ` (${reason})` : ''
      }, got: ${JSON.stringify(raw)}`,
    )
  }
  if (!raw.startsWith('https://')) fail()
  const rest = raw.slice('https://'.length)
  const slashIdx = rest.indexOf('/')
  const hostPart = slashIdx === -1 ? rest : rest.slice(0, slashIdx)
  const pathPart = slashIdx === -1 ? '' : rest.slice(slashIdx) // includes the leading '/', if any
  if (hostPart === '' || hostPart.length > 253) fail()
  const labels = hostPart.split('.')
  if (labels.length < 2) fail()
  for (const label of labels) {
    if (!ORIGIN_LABEL_RE.test(label)) fail()
  }
  if (/^[0-9]+$/.test(labels[labels.length - 1])) fail('the last label is all digits')
  if (pathPart !== '') {
    // pathPart starts with '/', so splitting on '/' always yields a leading '' element.
    const segments = pathPart.split('/').slice(1)
    for (const segment of segments) {
      if (segment === '' || segment === '.' || segment === '..' || !ORIGIN_PATH_SEGMENT_RE.test(segment)) fail()
    }
  }
  if (host === 'cloudflare-pages' && pathPart !== '') {
    throw new ForkInitArgError(`--origin must have no path when --host is cloudflare-pages, got: ${JSON.stringify(raw)}`)
  }
  return `https://${hostPart.toLowerCase()}${pathPart}`
}

/** T70/AC-C1: whether `raw` matches the origin grammar (traceability.md, "Origin grammar"),
 *  ignoring the `--host cloudflare-pages` path restriction (a caller-supplied condition, not part
 *  of the grammar itself — see `validateOriginValue`). Exported so S6's component tests reuse this
 *  exact grammar instead of re-implementing it (Note 8, T-0011). */
export function matchesOriginGrammar(raw: string): boolean {
  try {
    validateOriginValue(raw, undefined)
    return true
  } catch (e) {
    if (e instanceof ForkInitArgError) return false
    throw e
  }
}

/** T45: `--repo` is a single `owner/name` slug; the value itself is never trimmed. */
function validateRepoValue(value: string): void {
  const firstSlash = value.indexOf('/')
  const lastSlash = value.lastIndexOf('/')
  const owner = firstSlash === -1 ? '' : value.slice(0, firstSlash)
  const name = firstSlash === -1 ? '' : value.slice(firstSlash + 1)
  const ok =
    firstSlash !== -1 &&
    firstSlash === lastSlash &&
    REPO_OWNER_RE.test(owner) &&
    REPO_NAME_RE.test(name) &&
    name !== '.' &&
    name !== '..' &&
    !/\.git$/i.test(name)
  if (!ok) {
    throw new ForkInitArgError(`--repo must be in owner/repo form, got: ${JSON.stringify(value)}`)
  }
}

/** The 66 Unicode noncharacters: U+FDD0-U+FDEF, and every code point ending in FFFE or FFFF. */
function isNoncharacter(codePoint: number): boolean {
  if (codePoint >= 0xfdd0 && codePoint <= 0xfdef) return true
  return (codePoint & 0xfffe) === 0xfffe
}

/**
 * The character rule shared by `--author` and (later) `--site-name` (traceability.md,
 * "Character rules"): length is counted in Unicode code points, without normalisation; the
 * trimmed value must hold at least one code point other than U+200C/U+200D; Cc, Cs, Zl, Zp, Cf
 * (except U+200C/U+200D) and the noncharacters are rejected.
 */
function validateCharacterRuleValue(trimmed: string, flag: string, rawForMessage: string, maxLength = 100): void {
  // Written as escapes, not the literal invisible characters, so the source stays readable.
  const ZWNJ = '\u200C'
  const ZWJ = '\u200D'
  const codePoints = Array.from(trimmed)
  // `reason` says what was wrong (too long, which character, or only joiners) so the message is
  // actionable, not just a bare rejection.
  const fail = (reason: string): never => {
    throw new ForkInitArgError(`${flag} rejected (${reason}), got: ${JSON.stringify(rawForMessage)}`)
  }
  if (codePoints.length < 1) fail('empty')
  if (codePoints.length > maxLength) fail('too long')
  let hasOther = false
  for (const ch of codePoints) {
    if (ch !== ZWNJ && ch !== ZWJ) hasOther = true
    const codePoint = ch.codePointAt(0)!
    const disallowed =
      /\p{Cc}|\p{Cs}|\p{Zl}|\p{Zp}/u.test(ch) ||
      (/\p{Cf}/u.test(ch) && ch !== ZWNJ && ch !== ZWJ) ||
      isNoncharacter(codePoint)
    if (disallowed) {
      fail(`disallowed character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`)
    }
  }
  if (!hasOther) fail('only joiners')
}

/** T39-T41/AC-N1/AC-N2: --site-name is trimmed, then validated against the shared character rule
 *  (1-60 code points), then against the characters that would break the home page's HTML (`<`,
 *  `>`, `&`), each refused by name. Returns the trimmed value to write. */
function validateSiteNameValue(raw: string): string {
  const trimmed = raw.trim()
  validateCharacterRuleValue(trimmed, '--site-name', raw, 60)
  for (const ch of Array.from(trimmed)) {
    if (ch === '<' || ch === '>' || ch === '&') {
      throw new ForkInitArgError(`--site-name rejected (disallowed character ${JSON.stringify(ch)}), got: ${JSON.stringify(raw)}`)
    }
  }
  return trimmed
}

/** Extract the flag Node names in an `ERR_PARSE_ARGS_INVALID_OPTION_VALUE` message, stopping at
 *  the first space or quote — handles both the `'--author <value>'` and the plain `'--repo'`
 *  shape Node uses depending on which sub-case raised the error. Every message this function
 *  receives (argument missing, argument is ambiguous, does not take an argument — confirmed for
 *  every flag this CLI declares, on every Node version this code has run against) begins with
 *  `Option '...'`. The branch below exists only for a future Node message format this code has not
 *  seen, so a non-match throws a `ForkInitArgError` instead of crashing on a null regex match. */
function flagFromParseArgsMessage(message: string): string {
  const m = /^Option '([^ ']+)/.exec(message)
  if (!m) throw new ForkInitArgError(`invalid arguments: ${JSON.stringify(message)}`)
  return m[1]
}

/** The `=value` an argv token gave for `flag` (e.g. `--dry-run=yes` -> `yes`) — Node's own "does
 *  not take an argument" message for a boolean flag never echoes the value, so this reads it back
 *  from the original argv instead. */
function inlineValueFor(argv: string[], flag: string): string | undefined {
  const prefix = `${flag}=`
  const token = argv.find((a) => a.startsWith(prefix))
  return token?.slice(prefix.length)
}

/**
 * Rebuild one of Node's `util.parseArgs` errors into a `ForkInitArgError` with our own message:
 * Node's own text for an unknown option appends a "place it at the end after '--'" hint that does
 * not apply here (this CLI takes no positionals), and never runs an echoed flag/value through
 * `JSON.stringify`. Every message here names the flag; every echoed value is
 * `JSON.stringify`-quoted.
 */
function rewrapParseArgsError(err: Error & { code?: string }, argv: string[]): ForkInitArgError {
  const message = err.message
  if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
    const m = /^Unknown option '([^]*?)'\. To specify/.exec(message)
    // Every current Node message for an unknown option matches; this branch exists only for a
    // future Node message format this code has not seen.
    if (!m) throw new ForkInitArgError(`invalid arguments: ${JSON.stringify(message)}`)
    return new ForkInitArgError(`unknown flag: ${JSON.stringify(m[1])}`)
  }
  const flag = flagFromParseArgsMessage(message)
  if (/does not take an argument/.test(message)) {
    return new ForkInitArgError(`${flag} takes no value, got: ${JSON.stringify(inlineValueFor(argv, flag))}`)
  }
  // "argument missing" (the flag is the last token) and "argument is ambiguous" (the next known
  // flag ate the value) are both, from the caller's point of view, this flag not getting a value.
  return new ForkInitArgError(`${flag} needs a value`)
}

export function parseForkInitArgs(argv: string[]): ForkInitArgs {
  const options = {
    author: { type: 'string' },
    repo: { type: 'string' },
    base: { type: 'string' },
    host: { type: 'string' },
    origin: { type: 'string' },
    'site-name': { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    rebrand: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  } as const

  try {
    const { tokens, values } = parseArgs({ args: argv, options, tokens: true, allowPositionals: true })

    // This CLI takes no positional arguments; the first one found is itself the rejection.
    const positional = tokens.find((t) => t.kind === 'positional')
    if (positional) {
      throw new ForkInitArgError(`unexpected positional argument: ${JSON.stringify(positional.value)}`)
    }

    // parseArgs silently keeps only the last value of a repeated flag; detect it ourselves.
    const seenFlags = new Set<string>()
    for (const t of tokens) {
      if (t.kind !== 'option') continue
      if (seenFlags.has(t.name)) {
        throw new ForkInitArgError(`flag given more than once: --${t.name}`)
      }
      seenFlags.add(t.name)
    }

    const authorRaw = values.author
    const repoRaw = values.repo
    if (authorRaw === undefined) {
      throw new ForkInitArgError('missing required flag: --author <name>')
    }
    if (authorRaw.trim() === '') {
      throw new ForkInitArgError(`--author must not be empty, got: ${JSON.stringify(authorRaw)}`)
    }
    if (repoRaw === undefined) {
      throw new ForkInitArgError('missing required flag: --repo <owner/repo>')
    }
    if (repoRaw.trim() === '') {
      throw new ForkInitArgError(`--repo must not be empty, got: ${JSON.stringify(repoRaw)}`)
    }

    const hostRaw = values.host
    const baseRaw = values.base
    const rebrandRaw = values.rebrand

    // T50 (before T17/T16/T35, traceability.md "Argument check order"): --rebrand together with
    // any of --host, --origin, --site-name is an argument error naming --rebrand and every one of
    // those flags given — checked by presence alone, ahead of every value check (including
    // --rebrand's own syntax and --host's own value), so an invalid value on either side still
    // surfaces this message.
    if (rebrandRaw !== undefined) {
      const conflicting = [
        hostRaw !== undefined ? '--host' : null,
        values.origin !== undefined ? '--origin' : null,
        values['site-name'] !== undefined ? '--site-name' : null,
      ].filter((f): f is string => f !== null)
      if (conflicting.length > 0) {
        throw new ForkInitArgError(`--rebrand cannot be combined with ${conflicting.join(', ')}`)
      }
    }

    // T17 (before T16 and every value check): --host together with --base is an argument error.
    // Read here, ahead of any value validation, so a combination of the two flags is rejected
    // before either value is judged on its own.
    if (hostRaw !== undefined && baseRaw !== undefined) {
      throw new ForkInitArgError(
        `--host decides the workflow and cannot be combined with --base (which only applies without --host), got --base: ${JSON.stringify(baseRaw)}`,
      )
    }
    // T16: --host must be one of the two known values.
    let host: 'github-pages' | 'cloudflare-pages' | undefined
    if (hostRaw !== undefined) {
      if (hostRaw !== 'github-pages' && hostRaw !== 'cloudflare-pages') {
        throw new ForkInitArgError(
          `--host must be "github-pages" or "cloudflare-pages", got: ${JSON.stringify(hostRaw)}`,
        )
      }
      host = hostRaw
    }
    // T35/AC-O2: --host cloudflare-pages needs --origin — the engine cannot derive a Cloudflare
    // Pages project's own pages.dev subdomain the way it derives a GitHub Pages one.
    if (host === 'cloudflare-pages' && values.origin === undefined) {
      throw new ForkInitArgError('--origin is required with --host cloudflare-pages')
    }

    validateRepoValue(repoRaw)
    const authorTrimmed = authorRaw.trim()
    validateCharacterRuleValue(authorTrimmed, '--author', authorRaw)

    if (rebrandRaw !== undefined) {
      // --rebrand is substituted verbatim into the sensitive-key replacements, which land in
      // executable TS modules and CI YAML, so it must be a plain identifier — reject
      // quotes/$/backtick/whitespace that could break out of a string literal at build time.
      // It MUST start with a letter: the uppercased form seeds an env-var / JS-identifier
      // (`<UPPER>_VERIFY_RUNTIME`), which cannot begin with a digit. (Interior `-`/`.` are
      // allowed for the brand short-name and sanitized to `_` when building that identifier.)
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(rebrandRaw)) {
        throw new ForkInitArgError(
          `--rebrand must start with a letter and contain only [A-Za-z0-9._-] (no spaces/quotes/$), got: ${JSON.stringify(rebrandRaw)}`,
        )
      }
      if (rebrandRaw.toLowerCase().includes('wxl')) {
        throw new ForkInitArgError(
          `--rebrand name must not contain "wxl" (case-insensitive; would reintroduce the token and break idempotent rename), got: ${JSON.stringify(rebrandRaw)}`,
        )
      }
    }

    let base: string | null | undefined
    if (baseRaw === undefined) base = undefined
    else if (baseRaw === 'none') base = null
    else {
      if (!BASE_RE.test(baseRaw)) {
        throw new ForkInitArgError(
          `--base must be an absolute URL path like /myfork/ (letters, digits, . _ ~ - and slashes), or "none"; got: ${JSON.stringify(baseRaw)}`,
        )
      }
      base = baseRaw
    }

    // --origin (T33, then T34): validated after --base, before --site-name, per the argument check
    // order (traceability.md).
    const originRaw = values.origin
    const origin = originRaw !== undefined ? validateOriginValue(originRaw, host) : undefined

    // --site-name (T40, then T41): validated last, after --origin, per the argument check order.
    const siteNameRaw = values['site-name']
    const siteName = siteNameRaw !== undefined ? validateSiteNameValue(siteNameRaw) : undefined

    return {
      author: authorTrimmed,
      repo: repoRaw,
      base,
      host,
      origin,
      siteName,
      name: values.name,
      description: values.description,
      rebrand: rebrandRaw,
      dryRun: values['dry-run'],
    }
  } catch (err) {
    if (err instanceof ForkInitArgError) throw err
    const code = (err as NodeJS.ErrnoException).code
    // Only Node's own argument-parser errors are rebuilt with our own message; anything else is a
    // real failure (a bug, a resource error, ...) and must propagate, not be mislabelled as a
    // user input error.
    if (!code || !code.startsWith('ERR_PARSE_ARGS_')) throw err
    throw rewrapParseArgsError(err as Error & { code?: string }, argv)
  }
}

// ─── result ──────────────────────────────────────────────────────────────────

export interface SensitiveKeyEdit {
  key: string
  files: string[]
}

export interface ResidualHit {
  file: string
  line: number
  text: string
}

export interface ForkInitResult {
  exitCode: number
  message: string
  changedFiles: string[]
  /** runtime-sensitive keys ACTUALLY renamed, verified against the bytes written. */
  sensitiveKeys: SensitiveKeyEdit[]
  /** active files that still contain a case-insensitive `wxl` after all deterministic edits. */
  residualFiles: string[]
  /** honest, per-occurrence inventory of the remaining `wxl` (from the final content). */
  residualHits: ResidualHit[]
  warnings: string[]
}

// T44/AC-G1: exported so the guard and pristine tests (tests/unit/scripts/upstream-guard.test.ts)
// build their fixtures from it instead of holding a second copy of the literal, and so the
// upstream-only `if:`/`env` of T71 can be cross-checked against it (they themselves spell it
// through `format`, never importing this directly, since a workflow YAML cannot import a TS
// module).
export const UPSTREAM_SLUG = 'BrowserLaboratory/wxl-platform'

/**
 * A tree error (traceability.md: `exitCode` 1, nothing written) as a returned result, not a
 * throw — only `parseForkInitArgs` throws (`ForkInitArgError`), for argument errors. The manifest
 * check (A1) below and, in anchor mode, a write failure partway through (T55) both return one of
 * these. Every exitCode 1 `ForkInitResult` — every value this function returns — carries empty
 * changedFiles/sensitiveKeys/residualFiles/residualHits/warnings arrays: nothing is collected
 * before the error surfaces.
 *
 * Every CHECKED tree error — a condition this function itself tests for and deliberately returns
 * one of these for (the manifest check (A1) above all of them) — is returned before any write
 * happens in the same run. A write failure, by contrast, can only happen once the write phase has
 * begun (T55): its own tree error still carries these same empty arrays, but any file that phase
 * had already written stays on disk (T6's convergence then applies on a re-run) — "nothing
 * written" describes this function's own bookkeeping, not an undo of earlier writes in the same
 * run.
 */
function treeError(message: string): ForkInitResult {
  return {
    exitCode: 1,
    message,
    changedFiles: [],
    sensitiveKeys: [],
    residualFiles: [],
    residualHits: [],
    warnings: [],
  }
}

/** `value` if it is a plain JSON object (not null, not an array), else an empty base to spread
 *  from — so a non-object `repository`/`bugs` (string, array, number, boolean, null, absent) is
 *  replaced wholesale instead of producing spread-indexed keys (T13). */
function asPlainObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** T4/T11: the manifest's line ending, decided by its FIRST line break only (a file with no line
 *  break at all has no first line ending, so it is treated as LF). */
function firstLineEnding(raw: string): '\r\n' | '\n' {
  const nl = raw.indexOf('\n')
  return nl > 0 && raw[nl - 1] === '\r' ? '\r\n' : '\n'
}

// ─── doc anchors (A2–A5, anchor mode only) ──────────────────────────────────

// traceability.md, "Repository-slug grammar", the wildcard forms used to recognise a doc anchor
// (distinct from T45's stricter grammar for a --repo VALUE): owner has no leading/trailing `-`;
// name allows `.`, `_` and `-`.
const OWNER_WILDCARD = `[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?`
const NAME_WILDCARD = `[A-Za-z0-9._-]+`

function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A doc-anchor form: `prefix` + any repository slug + `suffix`, built as a global regex so every
 *  occurrence is found and replaced in one pass. `requireEol` adds the "end of the line" lookahead
 *  A3/A4 need (traceability.md: before LF or CRLF, or at the end of the file (optionally after a
 *  CR); trailing white space after the form is NOT an end of line, so it is not matched) — it never
 *  consumes the line ending itself, so CRLF files keep their line endings untouched (T11). An
 *  anchor form may be preceded by anything — approved by the user on 2026-10-14 (recorded in the
 *  T-0013 ticket): there is no left-hand boundary check.
 *
 *  The slug sits in a capture group — never relied on by `runForkInit` itself (which only ever
 *  checks match COUNT via `.match()` and performs a whole-match `.replace()`), but `DOC_ANCHORS`
 *  (below, which carries every regex this function builds) is exported so S5's pristine check
 *  (upstream-guard.test.ts) can read back exactly the slug fork-init itself recognised, instead of
 *  re-deriving it with a second, boundary-unaware regex (Note 8, T-0011). */
function docAnchorRegex(prefix: string, suffix: string, requireEol: boolean): RegExp {
  const body = `${escapeForRegExp(prefix)}(${OWNER_WILDCARD}/${NAME_WILDCARD})${escapeForRegExp(suffix)}`
  return new RegExp(requireEol ? `${body}(?=\\r?\\n|\\r?$)` : body, 'g')
}

export interface DocAnchor {
  id: 'A2' | 'A3' | 'A4' | 'A5'
  file: string
  regex: RegExp
  replacement: (repo: string) => string
}

/** A2–A5 (traceability.md, "Identity anchors"): every occurrence of its form, in its file(s),
 *  carries the new repository slug — whatever repository slug it held. Declared once, in file
 *  order, so `runForkInit` below processes each anchor file's anchors together. */
// Exported so the guard and pristine tests recognise A2-A5 exactly as fork-init itself does
// (Note 8, T-0011), instead of re-implementing the recognition rule.
export const DOC_ANCHORS: readonly DocAnchor[] = [
  {
    id: 'A2',
    file: 'README.md',
    regex: docAnchorRegex('https://github.com/', '/actions/workflows/quality-gates.yml', false),
    replacement: (repo) => `https://github.com/${repo}/actions/workflows/quality-gates.yml`,
  },
  {
    id: 'A3',
    file: 'README.md',
    regex: docAnchorRegex('git clone https://github.com/', '.git', true),
    replacement: (repo) => `git clone https://github.com/${repo}.git`,
  },
  {
    id: 'A2',
    file: 'README.en.md',
    regex: docAnchorRegex('https://github.com/', '/actions/workflows/quality-gates.yml', false),
    replacement: (repo) => `https://github.com/${repo}/actions/workflows/quality-gates.yml`,
  },
  {
    id: 'A3',
    file: 'README.en.md',
    regex: docAnchorRegex('git clone https://github.com/', '.git', true),
    replacement: (repo) => `git clone https://github.com/${repo}.git`,
  },
  {
    id: 'A4',
    file: 'CONTRIBUTE.md',
    regex: docAnchorRegex('git remote add upstream https://github.com/', '.git', true),
    replacement: (repo) => `git remote add upstream https://github.com/${repo}.git`,
  },
  {
    id: 'A5',
    file: 'CONTRIBUTE.md',
    regex: docAnchorRegex('(https://github.com/', '/issues)', false),
    replacement: (repo) => `(https://github.com/${repo}/issues)`,
  },
]

/** Write `content` to `rel` through `<file>.fork-init-tmp` + rename (traceability.md, T55; the
 *  root `.gitignore` ignores the temporary name). A temp file left over from an earlier,
 *  interrupted run is removed first — `lstatSync`, not `statSync`, so a symbolic link at that name
 *  is detected without being followed, and unlinked rather than having its target touched; if that
 *  `lstatSync` itself throws (no leftover temp file to begin with), this is the ordinary case and
 *  is swallowed, but if the leftover DOES exist and its `unlinkSync` fails, that failure is NOT
 *  swallowed — it propagates (becoming an `AnchorWriteError` at the call site) rather than falling
 *  through to write the fresh content through whatever that leftover name still points at (e.g. a
 *  symlink). The fresh temp file is then written and renamed over the original, and only THEN does
 *  the original's permission bits get re-applied to the now-renamed target (best-effort keeps them
 *  when the target already existed; not observed by any test). If anything fails after the temp
 *  file is (or may be) written, that temp file is removed, best-effort, before the failure
 *  propagates to the caller, which turns it into a tree error naming the file. */
function writeAnchorFile(absPath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
  mkdirSync(dirname(absPath), { recursive: true })
  const tmpPath = `${absPath}.fork-init-tmp`
  let leftoverTmpExists = false
  try {
    lstatSync(tmpPath)
    leftoverTmpExists = true
  } catch {
    // no leftover temp file to remove before this run's own write
  }
  if (leftoverTmpExists) {
    // Do NOT catch this: a leftover temp file that cannot be removed must not be written through.
    unlinkSync(tmpPath)
  }
  let mode: number | undefined
  try {
    mode = statSync(absPath).mode
  } catch {
    mode = undefined
  }
  try {
    writeFileSync(tmpPath, content, encoding)
    renameSync(tmpPath, absPath)
    if (mode !== undefined) chmodSync(absPath, mode)
  } catch (err) {
    try {
      unlinkSync(tmpPath)
    } catch {
      // best-effort only; the temp file may never have been created, or may already be gone
    }
    throw err
  }
}

/** Carries the repo-relative path a `writeAnchorFile` or `unlinkSync` failure was for, so the
 *  single `try`/`catch` around anchor mode's writes (T55) can name it in the returned tree error
 *  without every call site repeating that plumbing. The message names only the relative path, the
 *  operation (`write` or `remove`, so a `--host cloudflare-pages` removal failure is not reported
 *  as a write) and the error code — never Node's own message (which would embed the absolute
 *  `projectRoot` path and, inside it, the `.fork-init-tmp` temp-file name) — and keeps the original
 *  error as `cause` for anyone inspecting the exception directly. Rebrand mode's writes never throw
 *  this (they call `writeFileSync` directly), so an exception there still propagates unwrapped, as
 *  today. */
class AnchorWriteError extends Error {
  readonly rel: string
  constructor(rel: string, cause: Error, op: 'write' | 'remove' = 'write') {
    super(`failed to ${op} ${rel} (${(cause as NodeJS.ErrnoException).code ?? 'unknown'})`, { cause })
    this.rel = rel
  }
}

// Directories/files never touched by any rewrite.
// The skill trees `.claude`/`.agents` and the Codex config dir `.codex` are excluded because
// skill identifiers (e.g. `wxl-create`) are structural: they name the skill directories, so a
// content-only rename would break them without a coordinated path rename (out of scope; see
// inventory).
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.claude', '.agents', '.codex'])
const EXCLUDED_FILE = new Set(['pnpm-lock.yaml', 'pnpm-lock.yml'])
// Repo-relative paths below are always `/`-joined (T57: every path in the result uses `/`, on
// every OS) — `join`/`sep` would produce `\` on Windows. Node's fs functions accept `/` in a
// relative path on every OS, so this never needs an OS-specific join for file access either.
//
// Path prefixes (matched at a path-segment boundary, so `dist-notes.md` is NOT excluded by
// `.vitepress/dist`): regenerated build output/cache.
const EXCLUDED_PATH_FRAGMENTS = ['.vitepress/dist', '.vitepress/cache']
// This tool's own source + test must not be rewritten — they need the literal `wxl`/`WXL`
// probes, fixtures, and UPSTREAM_SLUG to keep working on subsequent runs.
const SELF_EXCLUDE = new Set(['scripts/fork-init.ts', 'tests/unit/scripts/fork-init.test.ts'])
// package.json is edited structurally, never via text passes.
const PKG_REL = 'package.json'
const CONFIG_REL = '.vitepress/config.mts'
// create-wxl's setup record (0005-create-wxl override of 0004 T51): the tree root's own
// range.json is never a text-pattern edit in rebrand mode — see the walk below.
const RANGE_JSON_REL = 'range.json'
const DEPLOY_TEMPLATE_REL = 'scripts/templates/deploy.yml.template'
const UPSTREAM_URL = `https://github.com/${UPSTREAM_SLUG}`

// ─── A9 (base definition) and the deploy workflow (--host, spec.en.md "Host, base and
// origin" and traceability.md "Workflow states") ────────────────────────────────────────────

/** A9's upstream form, exactly (traceability.md, "Identity anchors"). `--host` resets A9 to this
 *  line; the config's required `  base: siteBase,` line is never itself rewritten — only A9 is. */
export const A9_UPSTREAM_LINE = `const siteBase = process.env.SITE_BASE || '/'`
const BASE_SITEBASE_LINE = '  base: siteBase,'
// A9 candidate line (traceability.md: `^const siteBase = .+$`), tolerant of a trailing CRLF `\r`
// the file's own line ending may have left on this line (T11: anchors are recognised in CRLF
// files as in LF ones).
export const A9_CANDIDATE_RE = /^const siteBase = .+?\r?$/
export const BASE_SITEBASE_RE = /^ {2}base: siteBase,\r?$/

/** Every known old `.github/workflows/deploy.yml` output, as the LF-normalised file's SHA-256
 *  (traceability.md, "Workflow states"): initially one value, the template at `72327e2`, which the
 *  engine wrote verbatim for every argument combination. T27 (0004-S5, an upstream-only test) pins
 *  the current template's hash separately and fails until a changed template's old hash has moved
 *  into this list. */
export const KNOWN_OLD_DEPLOY_SHA256: readonly string[] = [
  '0cf52f116082bed48b19462d02b6827123a26cf882a428f841cd6646f73f7276',
]

/** CRLF normalised to LF — the comparison traceability.md's "Workflow states" and T25 require for
 *  every deploy-workflow byte comparison and hash in anchor mode. */
export function normalizeLf(s: string): string {
  return s.replace(/\r\n/g, '\n')
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

interface DeployWorkflowStep {
  run?: string
  env?: Record<string, unknown>
}
interface DeployWorkflowDoc {
  jobs?: Record<string, { steps?: DeployWorkflowStep[] }>
}

/** traceability.md, "Workflow states": the file parses with the `yaml` package and the step whose
 *  `run` is exactly `pnpm build` has `env.SITE_BASE` exactly
 *  `${{ steps.pages.outputs.base_path }}/`; a file that does not parse does not derive it.
 *  `contentLf` is expected already LF-normalised (YAML parses either line ending identically, but
 *  every caller here already holds the LF-normalised form for the hash/compare above it). */
function derivesSiteBase(contentLf: string): boolean {
  let doc: unknown
  try {
    doc = parseYaml(contentLf, { logLevel: 'error' })
  } catch {
    return false
  }
  if (typeof doc !== 'object' || doc === null) return false
  const jobs = (doc as DeployWorkflowDoc).jobs
  // A parseable but malformed workflow (a null job, a non-array `steps`, a null step) must be
  // judged "does not derive SITE_BASE" rather than throw — every layer below is type-guarded
  // instead of trusting `DeployWorkflowDoc`'s shape.
  if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) return false
  for (const job of Object.values(jobs)) {
    if (typeof job !== 'object' || job === null || Array.isArray(job)) continue
    const steps = (job as { steps?: unknown }).steps
    if (!Array.isArray(steps)) continue
    for (const step of steps) {
      if (typeof step !== 'object' || step === null || Array.isArray(step)) continue
      const typedStep = step as DeployWorkflowStep
      if (typedStep.run === 'pnpm build') {
        return typedStep.env?.SITE_BASE === '${{ steps.pages.outputs.base_path }}/'
      }
    }
  }
  return false
}

/** T18/AC-H2: the message `--host` or `--base` returns when the config does not have exactly one
 *  A9 line and exactly one `  base: siteBase,` line — naming A9, the file, both exact lines to
 *  bring over, and upstream's URL. */
function a9MissingMessage(): string {
  return (
    `A9: ${CONFIG_REL} must have exactly one line matching \`const siteBase = ...\` and exactly one ` +
    `\`${BASE_SITEBASE_LINE.trim()}\` line — bring both over from upstream (${UPSTREAM_URL}): ` +
    `\`${A9_UPSTREAM_LINE}\` and \`${BASE_SITEBASE_LINE.trim()}\``
  )
}

/** T24/AC-H3: the message `--host` returns when its tree's template cannot be used as given. */
function templateUnusableMessage(reason: string): string {
  return `${DEPLOY_TEMPLATE_REL} ${reason} — bring the current template over from upstream (${UPSTREAM_URL})`
}

/** Finds A9's and `base: siteBase`'s candidate lines in a config already split on `\n` (so each
 *  entry may still carry a trailing `\r` from a CRLF file, T11). Returns every matching line
 *  index — the caller decides what "not exactly one" means for its own message. */
function findA9Candidates(lines: readonly string[]): { a9Idx: number[]; baseIdx: number[] } {
  const a9Idx: number[] = []
  const baseIdx: number[] = []
  lines.forEach((line, i) => {
    if (A9_CANDIDATE_RE.test(line)) a9Idx.push(i)
    if (BASE_SITEBASE_RE.test(line)) baseIdx.push(i)
  })
  return { a9Idx, baseIdx }
}

/** The exact A9 line (traceability.md's stated exception) for a resolved base-definition target:
 *  `--base <path>` (a validated T21 value), `--base none` (`null`), or `--host` (resetting to the
 *  upstream form). Never parses the existing value. */
function a9LineFor(target: { base: string | null } | { host: true }): string {
  if ('host' in target) return A9_UPSTREAM_LINE
  const value = target.base === null ? '/' : target.base
  return `const siteBase = '${value}'`
}

type DeployWorkflowState = 'absent' | 'current' | 'old' | 'other'

/** traceability.md, "Workflow states": the existing deploy.yml, classified against the tree's
 *  current template output (both LF-normalised). `templateLf` is already LF-normalised; `existingRaw`
 *  is the file's raw (possibly CRLF) bytes, or `null` when it does not exist. */
function classifyDeployWorkflow(existingRaw: string | null, templateLf: string): DeployWorkflowState {
  if (existingRaw === null) return 'absent'
  const existingLf = normalizeLf(existingRaw)
  if (existingLf === templateLf) return 'current'
  if (KNOWN_OLD_DEPLOY_SHA256.includes(sha256Hex(existingLf))) return 'old'
  return 'other'
}

/**
 * The four runtime-sensitive keys, as EXACT full-token rename rules (structure-aware, so
 * `wxlsh` and other `wxl`-containing tokens are never touched). Applied to original template
 * content BEFORE the slug swap writes user identity, so a `--repo`/`--author` that happens to
 * contain a key token can never be corrupted.
 */
function sensitiveRenames(lower: string, upper: string): ReadonlyArray<{ key: string; from: string; to: string }> {
  return [
    { key: 'wxl-locale', from: 'wxl-locale', to: `${lower}-locale` },
    { key: 'WXL_VERIFY_RUNTIME', from: 'WXL_VERIFY_RUNTIME', to: `${upper}_VERIFY_RUNTIME` },
    { key: 'tmp/wxl-verify', from: 'tmp/wxl-verify', to: `tmp/${lower}-verify` },
    // release-asset prefix in release.yml, e.g. `wxl-${GITHUB_REF_NAME}.zip`. Built with
    // concatenation so the literal `${` is never parsed as an interpolation here.
    { key: 'release-asset', from: 'wxl-' + '${', to: lower + '-' + '${' },
  ]
}

// ─── A6-A8 (site name, short-link origin): anchor mode only — never reached in rebrand mode,
// since --rebrand rejects --host/--origin/--site-name (T50) ───────────────────────────────────

const PLATFORM_HOME_RELS = ['platform/index.md', 'platform/zh-TW/index.md'] as const
const SHORT_LINK_REL = '.vitepress/challenge/shortLink.ts'
/** The upstream short-link origin (traceability.md, T81): replacing a value that is not this one
 *  warns; a run that starts from this one never does. */
const UPSTREAM_SITE_ORIGIN = 'https://wxl.browserlab.online'

/** A single- or double-quoted JS string literal containing only STANDARD ECMAScript escape
 *  sequences, with nothing after the closing quote (traceability.md, "Identity anchors": "single-
 *  or double-quoted with standard escapes") — the shape every new A6/A7/A8 value is written as,
 *  and the shape an existing A6/A8 value must already be in to be replaced (T9). Returns the
 *  decoded value on success, `null` for anything else — including a quote character that is not
 *  the literal's own closing quote, an escape outside the nine single-character ones (`' " \ b f
 *  n r t v`), `\0` followed by a digit (a legacy octal escape, not the standalone NUL this accepts),
 *  `\xHH`/`\uHHHH` with the wrong number of hex digits, an unterminated or empty `\u{...}`, and a
 *  `\u{...}` whose value exceeds U+10FFFF. Never throws: every malformed escape — including one
 *  `String.fromCodePoint` would otherwise reject with an uncaught `RangeError`, and an unterminated
 *  `\u{` that would otherwise loop forever looking for a `}` that is not there — is caught by this
 *  function's own bounds/format checks before it ever reaches `String.fromCodePoint`/
 *  `String.fromCharCode`, so a malformed anchor value always falls through to the ordinary T9 tree
 *  error instead of crashing or hanging the whole run. A line continuation can never occur: every
 *  caller matches this against one single line (T9's own candidate-line regexes never span more
 *  than one). */
function parseJsStringLiteral(s: string): string | null {
  if (s.length < 2) return null
  const quote = s[0]
  if ((quote !== "'" && quote !== '"') || s[s.length - 1] !== quote) return null
  const inner = s.slice(1, -1)
  let result = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === quote) return null // the literal's own quote character, unescaped: ends it early
    if (ch !== '\\') {
      result += ch
      continue
    }
    i++
    const esc = inner[i]
    switch (esc) {
      case "'":
      case '"':
      case '\\':
        result += esc
        break
      case 'b':
        result += '\b'
        break
      case 'f':
        result += '\f'
        break
      case 'n':
        result += '\n'
        break
      case 'r':
        result += '\r'
        break
      case 't':
        result += '\t'
        break
      case 'v':
        result += '\v'
        break
      case '0':
        if (/[0-9]/.test(inner[i + 1] ?? '')) return null // \0 followed by a digit: a legacy octal escape, not standard
        result += '\0'
        break
      case 'x': {
        const hex = inner.slice(i + 1, i + 3)
        if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return null
        result += String.fromCharCode(parseInt(hex, 16))
        i += 2
        break
      }
      case 'u': {
        if (inner[i + 1] === '{') {
          const end = inner.indexOf('}', i + 2)
          if (end === -1) return null // unterminated \u{...: no closing } to be found at all
          const hex = inner.slice(i + 2, end)
          if (!/^[0-9A-Fa-f]{1,6}$/.test(hex)) return null // empty, or not 1-6 hex digits
          const codePoint = parseInt(hex, 16)
          if (codePoint > 0x10ffff) return null
          result += String.fromCodePoint(codePoint)
          i = end
        } else {
          const hex = inner.slice(i + 1, i + 5)
          if (!/^[0-9A-Fa-f]{4}$/.test(hex)) return null
          result += String.fromCharCode(parseInt(hex, 16))
          i += 4
        }
        break
      }
      default:
        return null // not one of the standard escapes above
    }
  }
  return result
}

export function isJsStringLiteral(s: string): boolean {
  return parseJsStringLiteral(s) !== null
}

/** Decodes a JS string literal already known (by its caller, via `isJsStringLiteral`) to parse —
 *  used only to compare an EXISTING A8 value against the upstream origin and the new one (T81). */
export function evalJsStringLiteral(literal: string): string {
  const result = parseJsStringLiteral(literal)
  if (result === null) {
    // Unreachable in practice: every caller only reaches this after `isJsStringLiteral` (the same
    // parser) has already confirmed `literal` parses.
    throw new Error(`evalJsStringLiteral: not a valid JS string literal: ${JSON.stringify(literal)}`)
  }
  return result
}

/** Encodes `text` (an arbitrary Unicode string — a trimmed `--site-name`, or a validated
 *  `--origin`) as the sequence of latin1 "characters" whose codes are its UTF-8 bytes. Splicing
 *  the result into a file already decoded with `.toString('latin1')`, then writing the whole
 *  result back with the `latin1` encoding, reproduces the correct UTF-8 bytes for `text` while
 *  leaving every other byte in the file — including one that is not valid UTF-8 on its own —
 *  unchanged (T4). */
function utf8AsLatin1(text: string): string {
  return Buffer.from(text, 'utf8').toString('latin1')
}

/** Finds every line index matching `re` — shared by every A6-A8 candidate search below (each
 *  anchor needs "exactly one", T9). */
function findMatchingLines(lines: readonly string[], re: RegExp): number[] {
  const idx: number[] = []
  lines.forEach((line, i) => {
    if (re.test(line)) idx.push(i)
  })
  return idx
}

// A6 (VitePress config site title, traceability.md "Identity anchors"): candidate lines
// `^  title: .+,$` (exactly two spaces), CRLF-tolerant; its value is a JS string literal.
export const A6_CANDIDATE_RE = /^ {2}title: .+,\r?$/
export const A6_VALUE_RE = /^ {2}title: (.+?),\r?$/

/** A6's new line, given the already-JSON-stringified new title literal; keeps the line's own CRLF. */
function a6LineFor(line: string, newLiteral: string): string {
  return `  title: ${newLiteral},${line.endsWith('\r') ? '\r' : ''}`
}

// A8 (short-link module, traceability.md "Identity anchors"): candidate lines
// `^export const SITE_ORIGIN = .+$`; its value is a JS string literal (a trailing `;` makes the
// value fail to parse, per the stated exception in traceability.md).
export const A8_CANDIDATE_RE = /^export const SITE_ORIGIN = .+\r?$/
export const A8_VALUE_RE = /^export const SITE_ORIGIN = (.+?)\r?$/

function a8LineFor(line: string, newLiteral: string): string {
  return `export const SITE_ORIGIN = ${newLiteral}${line.endsWith('\r') ? '\r' : ''}`
}

// A7 (home-page hero name, traceability.md "Identity anchors"): candidate lines `^  name: .+$`
// (exactly two spaces), inside the first `---` frontmatter block, after the column-0 `hero:` line
// and before the next column-0 key.
// Exported so S5's pristine check (upstream-guard.test.ts) can find A7's candidate lines the same
// way fork-init itself does, instead of re-implementing the pattern (Note 8, T-0011).
export const A7_CANDIDATE_RE = /^ {2}name: .+\r?$/

/** The indices of A7's candidate lines in `lines` (traceability.md's scoping rule), or `[]` when
 *  there is no frontmatter, no column-0 `hero:` line inside it, or no candidate under it. The
 *  frontmatter block must start at the file's own first line — a `---`/`---` pair that merely
 *  looks like frontmatter further down the file (after other prose) is not one (T9): unlike a
 *  Markdown parser, this scan never backtracks to "the first `---` anywhere", so a body divider
 *  can never be mistaken for the real frontmatter fence. */
export function findA7Candidates(lines: readonly string[]): number[] {
  const stripped = lines.map((l) => l.replace(/\r$/, ''))
  if (stripped[0] !== '---') return []
  const isDashes = (s: string) => s === '---'
  const fmEnd = stripped.findIndex((s, i) => i > 0 && isDashes(s))
  if (fmEnd === -1) return []
  let heroIdx = -1
  for (let i = 1; i < fmEnd; i++) {
    if (stripped[i] === 'hero:') {
      heroIdx = i
      break
    }
  }
  if (heroIdx === -1) return []
  const candidates: number[] = []
  for (let i = heroIdx + 1; i < fmEnd; i++) {
    if (/^\S/.test(stripped[i])) break // the next column-0 key ends hero's scope
    if (A7_CANDIDATE_RE.test(lines[i])) candidates.push(i)
  }
  return candidates
}

/** Parses `line` as one YAML scalar shaped the way A7's existing value must already be in to be
 *  replaced (traceability.md: parses as a one-key map whose value is a string, not a block scalar,
 *  with nothing after it on the line — a trailing `# comment` is unparsable, caught here via the
 *  `yaml` package's own comment tracking) (T9), returning the decoded string value, or `null` when
 *  `line` does not have this shape. Exported so S5's pristine check (upstream-guard.test.ts)
 *  compares A7's actual decoded value against the YAML scalar rule the engine uses, instead of
 *  decoding it with the unrelated JS-string-literal rule A6/A8 use (Note 8, T-0011). */
export function parseA7ScalarValue(line: string): string | null {
  const content = line.replace(/\r$/, '').trim()
  let doc: ReturnType<typeof parseYamlDocument>
  try {
    doc = parseYamlDocument(content, { logLevel: 'silent' })
  } catch {
    return null
  }
  if (doc.errors.length > 0) return null
  const map = doc.contents
  if (!isMap(map) || map.items.length !== 1) return null
  const pair = map.items[0]
  if (!isPair(pair) || !isScalar(pair.key) || pair.key.value !== 'name') return null
  const val = pair.value
  if (!isScalar(val)) return null
  if (val.type === 'BLOCK_LITERAL' || val.type === 'BLOCK_FOLDED') return null
  if (val.comment !== undefined && val.comment !== null) return null
  return typeof val.value === 'string' ? val.value : null
}

/** Whether `line` is one YAML scalar shaped the way A7's existing value must already be in to be
 *  replaced (T9). The decoded value itself is never used here (A7's new value always comes from
 *  `--site-name`, never from the old line) — only whether `line` has this shape at all. */
function isA7ScalarValue(line: string): boolean {
  return parseA7ScalarValue(line) !== null
}

/** A7's new line, given the already-JSON-stringified new name literal; keeps the line's own CRLF. */
function a7LineFor(line: string, newLiteral: string): string {
  return `  name: ${newLiteral}${line.endsWith('\r') ? '\r' : ''}`
}

/** `https://<owner, lowercased>.github.io[/<name as given>]` (traceability.md, T36-T37): the
 *  derived short-link origin for `--host github-pages` without `--origin`, omitting the path for
 *  the user site `<owner>.github.io` (compared case-insensitively). `repo` must already have passed
 *  parseForkInitArgs's `owner/name` check (T45); create-wxl calls it only after a successful parse. */
export function deriveGithubPagesOrigin(repo: string): string {
  const [owner, name] = repo.split('/')
  const ownerLower = owner.toLowerCase()
  if (name.toLowerCase() === `${ownerLower}.github.io`) return `https://${ownerLower}.github.io`
  return `https://${ownerLower}.github.io/${name}`
}

// ─── core ────────────────────────────────────────────────────────────────────

export function runForkInit(
  args: ForkInitArgs,
  opts: { projectRoot: string },
): ForkInitResult {
  const root = opts.projectRoot
  const changedFiles: string[] = []
  const warnings: string[] = []
  const sensitiveMap = new Map<string, Set<string>>()
  const residualHits: ResidualHit[] = []

  const abs = (rel: string) => join(root, rel)
  const readIf = (rel: string): string | null =>
    existsSync(abs(rel)) ? readFileSync(abs(rel), 'utf8') : null

  // Rebrand mode writes in place and fails as today; anchor mode writes through
  // `<file>.fork-init-tmp` + rename (T55), so a write failure partway through is a tree error
  // (caught by the caller below), never a half-written file. `encoding` defaults to `utf8` (the
  // manifest and the config are both always-valid-UTF-8 sources); doc-anchor files pass `latin1`
  // so an invalid UTF-8 byte outside any anchor form round-trips unchanged (T1).
  const applyEdit = (rel: string, next: string, prev: string, encoding: BufferEncoding = 'utf8') => {
    if (next === prev) return
    changedFiles.push(rel)
    if (args.dryRun) return
    if (args.rebrand) {
      writeFileSync(abs(rel), next, encoding)
      return
    }
    try {
      writeAnchorFile(abs(rel), next, encoding)
    } catch (err) {
      throw new AnchorWriteError(rel, err as Error)
    }
  }

  // The env-var / JS-identifier seed for the WXL_VERIFY_RUNTIME rename: uppercased, with any
  // `-`/`.` (legal in the brand short-name) collapsed to `_` so `<UPPER>_VERIFY_RUNTIME` is
  // always a valid identifier (e.g. `--rebrand my-ctf` -> `MY_CTF_VERIFY_RUNTIME`, not the
  // syntax-breaking `MY-CTF_VERIFY_RUNTIME`). --rebrand is required to start with a letter.
  const upperEnv = args.rebrand ? args.rebrand.toUpperCase().replace(/[^A-Z0-9_]/g, '_') : ''
  const renames = args.rebrand ? sensitiveRenames(args.rebrand, upperEnv) : []
  const recordSensitive = (key: string, rel: string) => {
    if (!sensitiveMap.has(key)) sensitiveMap.set(key, new Set())
    sensitiveMap.get(key)!.add(rel)
  }
  // Honest residual inventory: scan the ACTUAL final content for any case-insensitive `wxl`,
  // with NO masking/stripping. Because the tool no longer renames the general brand token,
  // every remaining `wxl` is genuinely un-handled and must be surfaced — brand prose, the
  // `wxlsh` subsystem, skill/spec dir refs, and even the user's own `--repo`/`--author` slug
  // (intentional identity, called out in the warning). Never subtracting anything is what
  // guarantees a bare `--author wxl`, or a slug that is a substring of another token, can never
  // mask real residual work (a subtraction-based mask silently hid such cases).
  const scanResidual = (rel: string, finalContent: string) => {
    const lines = finalContent.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (/wxl/i.test(lines[i])) {
        residualHits.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 200) })
      }
    }
  }
  // Rebrand-mode-only text transform for one file (anchor mode never calls this): sensitive-key
  // rename (on original content) -> upstream-slug swap. Returns the keys hit so the caller
  // records them ONLY when it actually commits this content.
  const transformText = (rel: string, raw: string): { next: string; keysHit: string[] } => {
    let next = raw
    const keysHit: string[] = []
    for (const { key, from, to } of renames) {
      if (next.includes(from)) {
        next = next.split(from).join(to)
        keysHit.push(key)
      }
    }
    next = next.split(UPSTREAM_SLUG).join(args.repo)
    // CONFIG_REL's A9 line is handled separately, below (T-0014): it is an exact-line replacement,
    // never a text-pattern edit, and needs the same validation (T18) in both modes.
    return { next, keysHit }
  }

  const DEPLOY_REL = '.github/workflows/deploy.yml'

  // ── A1: the manifest, a tree error (T12) when missing, BOM-prefixed, unparsable, or not a
  //   JSON object. Checked before anything is written, in both modes (T53, T54). ──
  const pkgRaw = readIf(PKG_REL)
  if (pkgRaw === null) {
    return treeError(`A1: ${PKG_REL} is missing`)
  }
  // A leading byte-order mark is not valid JSON syntax, so JSON.parse below would always fail on
  // it too — checked first so the message names the actual cause instead of the generic one.
  if (pkgRaw.charCodeAt(0) === 0xfeff) {
    return treeError(`A1: ${PKG_REL} starts with a byte-order mark`)
  }
  let pkg: unknown
  try {
    pkg = JSON.parse(pkgRaw)
  } catch {
    return treeError(`A1: ${PKG_REL} does not parse as JSON`)
  }
  if (typeof pkg !== 'object' || pkg === null || Array.isArray(pkg)) {
    return treeError(`A1: ${PKG_REL} must be a JSON object`)
  }

  try {
    // ── A1: package.json identity (structured), both modes ──
    const pkgObj = pkg as Record<string, unknown>
    const existingRepository = pkgObj.repository
    // T15 "first conversion" (traceability.md): before any edit, `repository` is an object whose
    // `url` is EXACTLY upstream's `git+https://...` URL (case-sensitive) — checked on the
    // original value, before the T13 replacement below turns a non-object `repository` into one.
    const firstConversion =
      typeof existingRepository === 'object' &&
      existingRepository !== null &&
      !Array.isArray(existingRepository) &&
      (existingRepository as Record<string, unknown>).url === `git+https://github.com/${UPSTREAM_SLUG}.git`

    pkgObj.author = args.author
    // T13: `repository`/`bugs` that is not a plain object is replaced wholesale; a plain object
    // keeps its other keys (only `repository.type`/`url` and `bugs.url` are set).
    pkgObj.repository = { ...asPlainObject(pkgObj.repository), type: 'git', url: `git+https://github.com/${args.repo}.git` }
    pkgObj.bugs = { ...asPlainObject(pkgObj.bugs), url: `https://github.com/${args.repo}/issues` }
    pkgObj.homepage = `https://github.com/${args.repo}#readme`
    // T15: rebrand mode resets `version`/`license` unconditionally (today's behaviour); anchor
    // mode only on first conversion, so a teacher's later manual version bump survives every
    // subsequent run.
    if (args.rebrand || firstConversion) {
      pkgObj.version = '0.1.0'
      pkgObj.license = 'ECL-2.0'
    }
    if (args.rebrand) {
      pkgObj.name = args.name ?? args.rebrand
      if (args.description) pkgObj.description = args.description
    } else {
      // T14: anchor mode trims `--name`/`--description`; empty after trim, or not given, leaves
      // the manifest's current value alone (rebrand mode keeps today's untrimmed handling above).
      if (args.name !== undefined) {
        const trimmedName = args.name.trim()
        if (trimmedName !== '') pkgObj.name = trimmedName
      }
      if (args.description !== undefined) {
        const trimmedDescription = args.description.trim()
        if (trimmedDescription !== '') pkgObj.description = trimmedDescription
      }
    }
    const pkgNextLf = JSON.stringify(pkgObj, null, 2) + '\n'
    // T4/T11: re-serialised in the manifest's own line-ending style — CRLF when its FIRST line
    // ending is CRLF, LF otherwise (a file with no newline at all has no first line ending, so it
    // gets LF) — but only in anchor mode; rebrand mode keeps writing LF, as today.
    const pkgNext = !args.rebrand && firstLineEnding(pkgRaw) === '\r\n' ? pkgNextLf.replace(/\n/g, '\r\n') : pkgNextLf
    // Rebrand mode's own write of this (as today, immediate) is deferred to below the A9/template
    // checks (T18/T24), which must see nothing written yet (T54) — see "compute before write"
    // below. Anchor mode already deferred its own write to the end of the A-mode branch.

    // Read the deploy template up front: it decides whether the deploy target is handled by the
    // dedicated block below. If the template is absent, an existing deploy.yml in rebrand mode's
    // walk is still inventoried like any active file (never silently omitted -> no false "clean").
    const tmplRaw = readIf(DEPLOY_TEMPLATE_REL)
    // Read any existing deploy.yml here too, alongside the template — before either mode's write
    // phase begins — so the compute-before-write property (anchor mode's own goal below) also
    // covers the one read the deploy block further down used to make on its own, after other
    // files had already been written.
    const existingDeploy = readIf(DEPLOY_REL)

    // ── A9 (base definition), both modes: read and validated here, before any write in this run
    //   (T54), whenever --base or --host is given (T18). The read is shared by the A/B mode
    //   branches below (which only ever apply the already-computed edit) and by the no-`--host`
    //   T26 check at the end of this function (which needs the ORIGINAL line, before this run's
    //   own edit, when neither --base nor --host touches it). ──
    const cfgRawShared = readIf(CONFIG_REL)
    const cfgLines = cfgRawShared !== null ? cfgRawShared.split('\n') : null
    const cfgCandidates = cfgLines ? findA9Candidates(cfgLines) : { a9Idx: [] as number[], baseIdx: [] as number[] }
    const originalA9Line =
      cfgLines && cfgCandidates.a9Idx.length === 1 ? cfgLines[cfgCandidates.a9Idx[0]].replace(/\r$/, '') : null

    // idx/hadCR/newA9Line, when set, describe the single edit A9 needs — applied, below, to
    // whichever text (anchor mode's untouched read, or rebrand mode's already slug-swapped text)
    // ends up being written for CONFIG_REL. Neither A9's own line nor `  base: siteBase,` ever
    // contains the upstream repository slug or a rebrand key, so this index and content stay valid
    // whichever of those two texts they are applied to (rebrand's slug/key swap never changes the
    // line count: none of its `from`/`to` values contain a newline).
    let a9Idx = -1
    let a9HadCR = false
    let newA9Line: string | null = null
    // Whether A9 ends this run in the upstream form (T26, below): true under --host (which always
    // resets it there); under --base it is always a literal, never upstream's form; without
    // either, A9 is untouched, so it ends upstream iff it already started there.
    const a9EndsUpstream =
      args.host !== undefined ? true : args.base !== undefined ? false : originalA9Line === A9_UPSTREAM_LINE

    if (args.base !== undefined || args.host !== undefined) {
      if (cfgLines === null || cfgCandidates.a9Idx.length !== 1 || cfgCandidates.baseIdx.length !== 1) {
        return treeError(a9MissingMessage())
      }
      a9Idx = cfgCandidates.a9Idx[0]
      a9HadCR = cfgLines[a9Idx].endsWith('\r')
      newA9Line = args.host !== undefined ? a9LineFor({ host: true }) : a9LineFor({ base: args.base! })
      if (originalA9Line !== newA9Line) {
        if (args.host !== undefined && originalA9Line !== A9_UPSTREAM_LINE) {
          // T82/AC-H2: resetting a literal A9 under --host warns with the old line and the
          // upstream form it is about to become.
          warnings.push(
            `A9: ${CONFIG_REL} line \`${originalA9Line}\` reset to the upstream form \`${A9_UPSTREAM_LINE}\` — ` +
              `--host decides the base from deployment, not from source.`,
          )
        }
      } else {
        newA9Line = null // already the target form: no edit, no T82 warning
      }
    }

    /** Applies the A9 edit computed above (if any) to `text`, which must have the same line count
     *  and the same content at `a9Idx` as `cfgRawShared` (true of both anchor mode's untouched read
     *  and rebrand mode's slug/key-swapped text — see the comment above). */
    const applyA9Edit = (text: string): string => {
      if (newA9Line === null) return text
      const lines = text.split('\n')
      lines[a9Idx] = newA9Line + (a9HadCR ? '\r' : '')
      return lines.join('\n')
    }

    // ── the deploy template, both modes, whenever --host is given (T24/AC-H3): the tree's
    //   template must exist, must not itself be a known old output, and (GitHub Pages only) must
    //   derive SITE_BASE — checked here, before any write in this run (T54). ──
    let templateLf: string | null = null
    if (args.host !== undefined) {
      if (tmplRaw === null) return treeError(templateUnusableMessage('is missing'))
      templateLf = normalizeLf(tmplRaw)
      if (KNOWN_OLD_DEPLOY_SHA256.includes(sha256Hex(templateLf))) {
        return treeError(templateUnusableMessage('is an old, already-superseded version'))
      }
      if (args.host === 'github-pages' && !derivesSiteBase(templateLf)) {
        return treeError(templateUnusableMessage('does not derive SITE_BASE (needed for --host github-pages)'))
      }
    }

    if (args.rebrand) {
      // Rebrand mode writes the manifest immediately, as today — deferred to here (past the
      // A9/template checks above) so compute-before-write (T54) holds for them too.
      applyEdit(PKG_REL, pkgNext, pkgRaw)
      scanResidual(PKG_REL, pkgNext)
      // ── B mode: today's tree-wide swap, kept exactly as before (0004 T51), except CONFIG_REL,
      //   whose A9 line is never a text-pattern edit (handled explicitly, below, with the same A9
      //   logic anchor mode uses), and the tree root's own range.json (0005-create-wxl override of
      //   0004 T51, C61), which is only scanned, never rewritten, below. ──
      for (const rel of walkTextFiles(root)) {
        if (rel === PKG_REL) continue // structured above
        if (rel === CONFIG_REL) continue // handled explicitly, below
        if (rel === DEPLOY_REL && tmplRaw !== null) continue // handled with the deploy copy below
        const raw = readIf(rel)
        if (raw === null) continue
        if (rel === RANGE_JSON_REL) {
          // 0005-create-wxl override (0004 T51, C61): the tree root's own setup record is never
          // rewritten here — only scanned, so the honest inventory still reports it when it
          // carries the upstream slug. A nested `sub/range.json` is not this exact root-relative
          // path, so it falls through to the ordinary swap below, unaffected.
          scanResidual(rel, raw)
          continue
        }
        const { next, keysHit } = transformText(rel, raw)
        applyEdit(rel, next, raw)
        for (const k of keysHit) recordSensitive(k, rel)
        scanResidual(rel, next)
      }
      if (cfgRawShared !== null) {
        const { next: cfgSwapped, keysHit } = transformText(CONFIG_REL, cfgRawShared)
        const cfgNext = applyA9Edit(cfgSwapped)
        applyEdit(CONFIG_REL, cfgNext, cfgRawShared)
        for (const k of keysHit) recordSensitive(k, CONFIG_REL)
        scanResidual(CONFIG_REL, cfgNext)
      }
    } else {
      // ── A mode: only the identity anchors (A1–A9, traceability.md) and the workflow — the doc
      //   anchors (A2–A5), the config's A9 line, A6 (site title) and A7 (home-page hero name) when
      //   --site-name is given, and A8 (short-link origin) when --origin is given or derived. No
      //   tree walk — every file outside A1–A9 and the workflow is byte-identical (T3).
      //
      //   Every CHECKED read/content computation below happens before anything is written —
      //   including the manifest, whose own write was deferred above, and the deploy workflow's
      //   own existing-file read, moved up above this branch — so the write phase that follows is
      //   the only place a write failure (T55) can still occur. A read failure that is not one of
      //   this function's own checks (e.g. a doc-anchor path that is a directory) is not caught
      //   here: it propagates as an uncaught exception, same as it did before this restructuring
      //   — T2 governs only "the file does not exist", never any other read failure. ──
      const anchorsByFile = new Map<string, DocAnchor[]>()
      for (const anchor of DOC_ANCHORS) {
        if (!anchorsByFile.has(anchor.file)) anchorsByFile.set(anchor.file, [])
        anchorsByFile.get(anchor.file)!.push(anchor)
      }

      // ── compute phase ──
      const docWrites: Array<{ file: string; next: string; raw: string }> = []
      for (const [file, anchors] of anchorsByFile) {
        // Read as a Buffer, decoded latin1 (not utf8): a byte-for-byte reversible mapping, so any
        // invalid UTF-8 outside the anchor forms round-trips unchanged — the forms themselves are
        // ASCII, which latin1 decodes identically to utf8, so the matching below is unaffected. A
        // read failure other than "the file does not exist" (e.g. the path is a directory) is NOT
        // caught here (T2): it throws, uncaught, before any write in this run — same as every
        // other anchor file's read failure, which this ticket leaves untouched.
        const raw: string | null = existsSync(abs(file)) ? readFileSync(abs(file)).toString('latin1') : null
        if (raw === null) {
          for (const anchor of anchors) warnings.push(`${anchor.id}: ${file} is missing`)
          continue
        }
        let next = raw
        for (const anchor of anchors) {
          const matches = next.match(anchor.regex)
          if (!matches || matches.length === 0) {
            warnings.push(`${anchor.id}: no occurrence of its form in ${file}`)
          } else {
            next = next.replace(anchor.regex, () => anchor.replacement(args.repo))
          }
        }
        docWrites.push({ file, next, raw })
      }

      // ── A6 (site title), whenever --site-name is given (T39-T43/AC-N1-AC-N3): validated here
      //   (candidate count, value shape), before any write in this run (T54), using the shared
      //   utf8 read already in hand for A9 — ASCII-only structure, so utf8's possible replacement
      //   characters for an invalid byte elsewhere in the file never affect this check. The actual
      //   new content is built below, from a byte-preserving (latin1) read, so a byte outside this
      //   line — including one that is not valid UTF-8 on its own — round-trips unchanged (T4);
      //   only `a6Idx`, the validated line INDEX (identical under either decoding, since neither
      //   adds nor removes a line), crosses from this check into that later construction. ──
      let a6Idx: number | null = null
      if (args.siteName !== undefined) {
        if (cfgLines === null) return treeError(`A6: ${CONFIG_REL} is missing`)
        const a6Candidates = findMatchingLines(cfgLines, A6_CANDIDATE_RE)
        if (a6Candidates.length !== 1) {
          return treeError(`A6: ${CONFIG_REL} must have exactly one line matching \`  title: ...,\``)
        }
        a6Idx = a6Candidates[0]
        const a6ValueMatch = A6_VALUE_RE.exec(cfgLines[a6Idx])
        if (!a6ValueMatch || !isJsStringLiteral(a6ValueMatch[1])) {
          return treeError(`A6: ${CONFIG_REL} existing title does not parse as a JS string literal`)
        }
      }

      // ── A7 (home-page hero name), whenever --site-name is given: read byte-preserving (latin1)
      //   from the start (T4) — unlike config.mts, a home page is never shared with A9/rebrand, so
      //   there is no separate utf8 read to keep in step with. ──
      const homeWrites: Array<{ file: string; next: string; raw: string }> = []
      if (args.siteName !== undefined) {
        const newNameLiteral = utf8AsLatin1(JSON.stringify(args.siteName))
        for (const file of PLATFORM_HOME_RELS) {
          const raw = existsSync(abs(file)) ? readFileSync(abs(file)).toString('latin1') : null
          if (raw === null) return treeError(`A7: ${file} is missing`)
          const lines = raw.split('\n')
          const candidates = findA7Candidates(lines)
          if (candidates.length !== 1) {
            return treeError(`A7: ${file} must have exactly one \`  name: ...\` line under \`hero:\``)
          }
          const idx = candidates[0]
          const line = lines[idx]
          if (!isA7ScalarValue(line)) {
            return treeError(`A7: ${file} existing hero name does not parse as one YAML scalar`)
          }
          const nextLines = lines.slice()
          nextLines[idx] = a7LineFor(line, newNameLiteral)
          homeWrites.push({ file, next: nextLines.join('\n'), raw })
        }
      }

      // ── A8 (short-link origin): --origin, or derived from --host github-pages without
      //   --origin (T32-T38/T81/AC-O1-AC-O2). Read byte-preserving (latin1) (T4); the write
      //   decision compares the WHOLE LINE about to be written against the existing one, not just
      //   the decoded value (T8: a same-VALUE line in a different quote style is still rewritten
      //   into the canonical JSON-string-literal form) — the T81 warning, separately, still
      //   compares the decoded values (an equal value never warns, regardless of quoting). ──
      const finalOrigin: string | undefined =
        args.origin !== undefined ? args.origin : args.host === 'github-pages' ? deriveGithubPagesOrigin(args.repo) : undefined
      let shortLinkNext: string | null = null
      let shortLinkRaw: string | null = null
      if (finalOrigin !== undefined) {
        shortLinkRaw = existsSync(abs(SHORT_LINK_REL)) ? readFileSync(abs(SHORT_LINK_REL)).toString('latin1') : null
        if (shortLinkRaw === null) return treeError(`A8: ${SHORT_LINK_REL} is missing`)
        const lines = shortLinkRaw.split('\n')
        const candidates = findMatchingLines(lines, A8_CANDIDATE_RE)
        if (candidates.length !== 1) {
          return treeError(`A8: ${SHORT_LINK_REL} must have exactly one line matching \`export const SITE_ORIGIN = ...\``)
        }
        const idx = candidates[0]
        const line = lines[idx]
        const valueMatch = A8_VALUE_RE.exec(line)
        if (!valueMatch || !isJsStringLiteral(valueMatch[1])) {
          return treeError(`A8: ${SHORT_LINK_REL} existing value does not parse as a JS string literal`)
        }
        const newLine = a8LineFor(line, utf8AsLatin1(JSON.stringify(finalOrigin)))
        if (line !== newLine) {
          const oldValue = evalJsStringLiteral(valueMatch[1])
          if (oldValue !== finalOrigin && oldValue !== UPSTREAM_SITE_ORIGIN) {
            // T81/AC-O2: replacing a short-link origin that is not upstream's warns — the engine
            // keeps no state, so it cannot otherwise tell a fork's own custom domain from one that
            // should be silently kept. Compares the DECODED value: a line rewritten only to
            // normalise its quoting (the same value, differently quoted) never warns.
            warnings.push(
              `A8: ${SHORT_LINK_REL} changes from ${JSON.stringify(oldValue)} to ${JSON.stringify(finalOrigin)} — ` +
                `a custom short-link origin is replaced only when --origin (or a derived GitHub Pages origin) says so.`,
            )
          }
          const nextLines = lines.slice()
          nextLines[idx] = newLine
          shortLinkNext = nextLines.join('\n')
        } // else: already byte-identical to the line that would be written — no write, no warning
      }

      // The config's final content: read byte-preserving (latin1) (T4) so a byte outside the A6/A9
      // lines — including one that is not valid UTF-8 on its own — round-trips unchanged; A9's own
      // edit (`applyA9Edit`, shared with rebrand mode) only ever touches pure-ASCII lines, so
      // reusing it here on this latin1-decoded text is safe (same line count, same indices as the
      // utf8-decoded `cfgLines` used for validation above).
      let cfgNext: string | null = null
      let cfgRawLatin1: string | null = null
      if (cfgRawShared !== null) {
        cfgRawLatin1 = readFileSync(abs(CONFIG_REL)).toString('latin1')
        let cfgLatin1Lines = cfgRawLatin1.split('\n')
        if (a6Idx !== null) {
          cfgLatin1Lines = cfgLatin1Lines.slice()
          cfgLatin1Lines[a6Idx] = a6LineFor(cfgLatin1Lines[a6Idx], utf8AsLatin1(JSON.stringify(args.siteName!)))
        }
        cfgNext = applyA9Edit(cfgLatin1Lines.join('\n'))
      }

      // ── write phase: the config (a subdirectory file) first, then the manifest (root) whose
      //   write was deferred above, then both home pages and the short-link module (also
      //   subdirectory files), then the doc anchors (root) — so a root-directory write failure can
      //   still be observed, in a test, to leave an already-written subdirectory file in place
      //   (traceability.md, T55: "files already written stay"). ──
      if (cfgRawLatin1 !== null) applyEdit(CONFIG_REL, cfgNext!, cfgRawLatin1, 'latin1')
      for (const { file, next, raw } of homeWrites) applyEdit(file, next, raw, 'latin1')
      if (shortLinkNext !== null) applyEdit(SHORT_LINK_REL, shortLinkNext, shortLinkRaw!, 'latin1')
      applyEdit(PKG_REL, pkgNext, pkgRaw)
      for (const { file, next, raw } of docWrites) applyEdit(file, next, raw, 'latin1')
    }

    // The tag-rule warning (traceability.md, "Tag-rule warning"): today's warning on installing
    // the workflow, pushed whenever this run installs it (absent -> installed), in GH and
    // no-host runs — never on a replace (GH's "old" branch) and never under --host
    // cloudflare-pages in the non-rebrand branches below, which never install the workflow there.
    // Rebrand mode's own install, further below, does not branch on --host at all — but T50
    // rejects --rebrand together with --host, so args.host is always undefined whenever
    // args.rebrand is set; this warning is pushed on an absent workflow regardless, since rebrand
    // mode never reaches a Cloudflare-Pages-shaped run in the first place.
    const pushTagRuleWarning = () => {
      warnings.push(
        `${DEPLOY_REL} deploys on a \`v*\` tag push. GitHub's \`github-pages\` environment authorises only the default branch by default, so add a Tag rule \`v*\` under Settings > Environments > github-pages > "Deployment branches and tags" (keep the existing \`main\` rule — workflow_dispatch needs it) before cutting a release.`,
      )
    }
    // `finalDeployRaw` tracks whatever ends up on disk for DEPLOY_REL after this block (its own
    // write respecting --dry-run below) — read by the no-`--host` T26 check further down, which
    // needs the workflow's state AFTER this run, including one just installed this same run.
    let finalDeployRaw: string | null = existingDeploy

    if (args.rebrand) {
      // ── rebrand mode (T51): compared "as today" — raw bytes, no LF normalisation, never
      //   replaced. T50 rejects --rebrand together with --host (among --origin and --site-name),
      //   so args.host is always undefined here; the A9 reset and the template checks above (which
      //   branch on args.host) are therefore exercised, under rebrand, only via their --base path,
      //   never their --host one. This install step itself does not branch on --host either — it
      //   installs the template whenever absent — but since args.host can never be set alongside
      //   args.rebrand, that absence of a branch is never actually exercised against a Cloudflare
      //   Pages run. ──
      if (tmplRaw) {
        const { next: deployContent, keysHit: deployKeysHit } = transformText(DEPLOY_REL, tmplRaw)
        if (existingDeploy === null) {
          changedFiles.push(DEPLOY_REL)
          if (!args.dryRun) {
            mkdirSync(dirname(abs(DEPLOY_REL)), { recursive: true })
            writeFileSync(abs(DEPLOY_REL), deployContent)
          }
          pushTagRuleWarning()
          for (const k of deployKeysHit) recordSensitive(k, DEPLOY_REL)
          scanResidual(DEPLOY_REL, deployContent)
          finalDeployRaw = deployContent
        } else {
          if (existingDeploy !== deployContent) {
            warnings.push(
              `${DEPLOY_REL} already exists with different content — left untouched; merge the deploy workflow manually if needed.`,
            )
          }
          scanResidual(DEPLOY_REL, existingDeploy)
        }
      }
    } else if (args.host === 'github-pages') {
      // ── T22/AC-H3: templateLf is non-null and already validated (T24, above). ──
      const state = classifyDeployWorkflow(existingDeploy, templateLf!)
      if (state === 'absent') {
        changedFiles.push(DEPLOY_REL)
        if (!args.dryRun) {
          try {
            writeAnchorFile(abs(DEPLOY_REL), templateLf!)
          } catch (err) {
            throw new AnchorWriteError(DEPLOY_REL, err as Error)
          }
        }
        pushTagRuleWarning()
        finalDeployRaw = templateLf!
      } else if (state === 'old') {
        changedFiles.push(DEPLOY_REL)
        if (!args.dryRun) {
          try {
            writeAnchorFile(abs(DEPLOY_REL), templateLf!)
          } catch (err) {
            throw new AnchorWriteError(DEPLOY_REL, err as Error)
          }
        }
        warnings.push(`${DEPLOY_REL} was an old template output — replaced with the current template.`)
        finalDeployRaw = templateLf!
      } else if (state === 'other') {
        if (derivesSiteBase(normalizeLf(existingDeploy!))) {
          warnings.push(`${DEPLOY_REL} left untouched — it does not match the current template, but it derives SITE_BASE.`)
        } else {
          warnings.push(
            `${DEPLOY_REL} does not derive SITE_BASE — pages under a sub-path 404; install the GitHub Pages workflow ` +
              `with \`pnpm fork:init --host github-pages\` (or set SITE_BASE yourself).`,
          )
        }
      } // 'current': nothing
    } else if (args.host === 'cloudflare-pages') {
      // ── T23/AC-H4: no workflow is ever installed; current/old is removed, other is left. ──
      const state = classifyDeployWorkflow(existingDeploy, templateLf!)
      if (state === 'current' || state === 'old') {
        changedFiles.push(DEPLOY_REL)
        if (!args.dryRun) {
          try {
            unlinkSync(abs(DEPLOY_REL))
          } catch (err) {
            throw new AnchorWriteError(DEPLOY_REL, err as Error, 'remove')
          }
        }
        warnings.push(`${DEPLOY_REL} removed — Cloudflare Pages ranges get no GitHub Pages workflow.`)
        finalDeployRaw = null
      } else if (state === 'other') {
        warnings.push(`${DEPLOY_REL} left untouched — it does not match the current or a known old template output.`)
      } // 'absent': nothing
    } else {
      // ── T25/AC-H5: no --host — today's behaviour, compared LF-normalised. ──
      if (tmplRaw === null) {
        warnings.push(`${DEPLOY_TEMPLATE_REL} is missing — the deploy workflow cannot be installed or verified.`)
      } else {
        const templateLfNoHost = normalizeLf(tmplRaw)
        const state = classifyDeployWorkflow(existingDeploy, templateLfNoHost)
        if (state === 'absent') {
          changedFiles.push(DEPLOY_REL)
          if (!args.dryRun) {
            try {
              writeAnchorFile(abs(DEPLOY_REL), templateLfNoHost)
            } catch (err) {
              throw new AnchorWriteError(DEPLOY_REL, err as Error)
            }
          }
          pushTagRuleWarning()
          finalDeployRaw = templateLfNoHost
        } else if (state === 'old' || state === 'other') {
          // never replaced without --host (today's behaviour)
          warnings.push(
            `${DEPLOY_REL} already exists with different content — left untouched; merge the deploy workflow manually if needed.`,
          )
        } // 'current': nothing
      }
    }

    // T26/AC-H5: without --host, when A9 ends this run in the upstream form and the workflow
    // exists (including one just installed this run) but does not derive SITE_BASE, warn naming
    // the workflow path, SITE_BASE, 404 and --host github-pages.
    if (args.host === undefined && a9EndsUpstream && finalDeployRaw !== null && !derivesSiteBase(normalizeLf(finalDeployRaw))) {
      warnings.push(
        `${DEPLOY_REL} does not derive SITE_BASE — pages under a sub-path 404; install the GitHub Pages workflow ` +
          `with \`pnpm fork:init --host github-pages\` (or set SITE_BASE yourself).`,
      )
    }
  } catch (err) {
    // In anchor mode, a write failure partway is a tree error asking the teacher to run the same
    // command again (T6 then converges); in rebrand mode a write failure still propagates
    // unwrapped, as today.
    if (err instanceof AnchorWriteError) {
      return treeError(`${err.message}; run the same command again`)
    }
    throw err
  }

  // ── B-mode residual summary ──
  const residualFiles: string[] = []
  if (args.rebrand) {
    for (const h of residualHits) if (!residualFiles.includes(h.file)) residualFiles.push(h.file)
    warnings.push(
      'Rebrand renamed only the upstream slug and the 4 runtime-sensitive keys — the tokens it can prove are self-contained. Every other `wxl` is left as a deliberate, namespace-aware decision: the brand short-name vs the `wxlsh` subsystem / `X-Wxlsh-*` wire headers vs path-referenced skill/spec directory names cannot be told apart automatically. Directory names (e.g. scripts/wxl-solver) are NOT auto-renamed. `pnpm build` does not touch them, so it keeps working; what breaks is the path references into them — scripts/challenge-verify.ts statically imports ./wxl-solver/spawn-runtime.ts, and the skill docs and .mcp.json name those paths as text. Rename a dir and you must update every reference by hand.',
    )
    if (residualFiles.length) {
      warnings.push(
        `${residualFiles.length} file(s) still contain a case-insensitive "wxl" — the rebrand is NOT complete; run \`git grep -in wxl\` and finish it manually (occurrences of your own --repo/--author are intentional).`,
      )
    }
  }

  const sensitiveKeys: SensitiveKeyEdit[] = [...sensitiveMap.entries()].map(([key, files]) => ({
    key,
    files: [...files].sort(),
  }))

  const uniqueChanged = [...new Set(changedFiles)]

  const message = args.dryRun
    ? `dry-run: ${uniqueChanged.length} file(s) would change`
    : args.rebrand && residualFiles.length
      ? `fork:init done (rebrand) — ${uniqueChanged.length} file(s) changed; ${residualFiles.length} file(s) still contain "wxl" and need manual, namespace-aware handling (rebrand NOT complete)`
      : `fork:init done — ${uniqueChanged.length} file(s) changed`

  return {
    exitCode: 0,
    message,
    changedFiles: uniqueChanged,
    sensitiveKeys,
    residualFiles,
    residualHits,
    warnings,
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** True when `childRel` equals an excluded fragment or is a path segment beneath one. */
function isExcludedPath(childRel: string): boolean {
  return EXCLUDED_PATH_FRAGMENTS.some(
    (frag) => childRel === frag || childRel.startsWith(frag + '/'),
  )
}

/** Recursively list repo-relative text files eligible for the text passes. `rel` is always
 *  `/`-joined (T57); `join(root, rel)` below still resolves correctly on Windows, which accepts
 *  `/` in a path. */
function walkTextFiles(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      if (isExcludedPath(childRel)) continue
      out.push(...walkTextFiles(root, childRel))
    } else if (entry.isFile()) {
      if (EXCLUDED_FILE.has(entry.name)) continue
      if (SELF_EXCLUDE.has(childRel)) continue
      if (isExcludedPath(childRel)) continue
      // skip binary-looking files (any null byte in the file)
      const buf = readFileSync(join(root, childRel))
      if (buf.includes(0)) continue
      out.push(childRel)
    }
  }
  return out
}

// ─── CLI entry ───────────────────────────────────────────────────────────────

function main() {
  let args: ForkInitArgs
  try {
    args = parseForkInitArgs(process.argv.slice(2))
  } catch (err) {
    if (err instanceof ForkInitArgError) {
      console.error(`✗ ${err.message}`)
      process.exit(err.exitCode)
    }
    throw err
  }

  const result = runForkInit(args, { projectRoot: PROJECT_ROOT })
  if (result.exitCode !== 0) {
    // A tree error: nothing was written, and no warning collected before it is printed.
    console.error(`✗ ${result.message}`)
    process.exit(result.exitCode)
  }
  console.log(result.message)
  if (result.changedFiles.length) {
    console.log('\nChanged files:')
    for (const f of result.changedFiles) console.log(`  ${f}`)
  }
  if (result.sensitiveKeys.length) {
    console.log('\n[!] Runtime-sensitive keys renamed (verify storage/env/release impact):')
    for (const k of result.sensitiveKeys) console.log(`  ${k.key} -> in ${k.files.join(', ')}`)
  }
  if (result.residualFiles.length) {
    console.log(`\n[!] ${result.residualFiles.length} file(s) still contain a case-insensitive "wxl" (NOT auto-renamed — finish manually):`)
    for (const f of result.residualFiles) console.log(`  ${f}`)
    console.log('    Run `git grep -in wxl` to review each; decide brand vs wxlsh-subsystem vs skill/spec dir per occurrence.')
  }
  for (const w of result.warnings) console.log(`\n[i] ${w}`)
  process.exit(result.exitCode)
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main()
}
