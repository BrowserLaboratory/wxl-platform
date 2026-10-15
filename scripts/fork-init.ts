/**
 * fork-init.ts
 *
 * Deterministic edits to fork this template repo into a new project.
 * The wxl-fork-init skill calls this CLI instead of hand-editing files.
 *
 * Usage:
 *   pnpm fork:init --author <name> --repo <owner/repo>
 *                  [--base <path> | --base none]
 *                  [--name <pkg-name>] [--description <text>]
 *                  [--rebrand <newshortname>] [--dry-run]
 *
 * Modes:
 *   A (default)          rewrites only the identity anchors (traceability.md's A1-A5): the
 *                        manifest (structured), the doc-anchor forms in README.md,
 *                        README.en.md and CONTRIBUTE.md — wherever they occur, whatever
 *                        repository slug they held — the base line, and the deploy workflow.
 *                        No tree walk; every other file is byte-identical.
 *   B (--rebrand <name>) today's path: walks the whole tree doing the upstream-slug swap and
 *                        also renames the four runtime-sensitive keys (deterministic,
 *                        structure-aware), plus an HONEST residual inventory of every
 *                        remaining case-insensitive `wxl` (which is NOT auto-renamed — see
 *                        "Why not rename every wxl?" below).
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const PROJECT_ROOT = resolve(__dirname, '..')

// ─── args ────────────────────────────────────────────────────────────────────

export interface ForkInitArgs {
  author: string
  repo: string
  /** undefined = leave as-is; null = remove (--base none); string = set to this path */
  base?: string | null
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
// A safe VitePress base: absolute, slash-separated, only URL-path-safe chars.
// Rejects quotes and `$` so the value cannot break out of the generated string
// literal in .vitepress/config.mts (an executable TS module).
const BASE_RE = /^\/([A-Za-z0-9._~-]+\/)*$/

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
function validateCharacterRuleValue(trimmed: string, flag: string, rawForMessage: string): void {
  // Written as escapes, not the literal invisible characters, so the source stays readable.
  const ZWNJ = '\u200C'
  const ZWJ = '\u200D'
  const codePoints = Array.from(trimmed)
  // `reason` says what was wrong (too long, which character, or only joiners) so the message is
  // actionable, not just a bare rejection — ready for --site-name later.
  const fail = (reason: string): never => {
    throw new ForkInitArgError(`${flag} rejected (${reason}), got: ${JSON.stringify(rawForMessage)}`)
  }
  if (codePoints.length < 1) fail('empty')
  if (codePoints.length > 100) fail('too long')
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

    validateRepoValue(repoRaw)
    const authorTrimmed = authorRaw.trim()
    validateCharacterRuleValue(authorTrimmed, '--author', authorRaw)

    const rebrandRaw = values.rebrand
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

    const baseRaw = values.base
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

    return {
      author: authorTrimmed,
      repo: repoRaw,
      base,
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

const UPSTREAM_SLUG = 'BrowserLaboratory/wxl-platform'

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
 *  T-0013 ticket): there is no left-hand boundary check. */
function docAnchorRegex(prefix: string, suffix: string, requireEol: boolean): RegExp {
  const body = `${escapeForRegExp(prefix)}${OWNER_WILDCARD}/${NAME_WILDCARD}${escapeForRegExp(suffix)}`
  return new RegExp(requireEol ? `${body}(?=\\r?\\n|\\r?$)` : body, 'g')
}

interface DocAnchor {
  id: 'A2' | 'A3' | 'A4' | 'A5'
  file: string
  regex: RegExp
  replacement: (repo: string) => string
}

/** A2–A5 (traceability.md, "Identity anchors"): every occurrence of its form, in its file(s),
 *  carries the new repository slug — whatever repository slug it held. Declared once, in file
 *  order, so `runForkInit` below processes each anchor file's anchors together. */
const DOC_ANCHORS: readonly DocAnchor[] = [
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

/** Carries the repo-relative path a `writeAnchorFile` failure was for, so the single `try`/`catch`
 *  around anchor mode's writes (T55) can name it in the returned tree error without every call
 *  site repeating that plumbing. The message names only the relative path and the error code —
 *  never Node's own message (which would embed the absolute `projectRoot` path and, inside it, the
 *  `.fork-init-tmp` temp-file name) — and keeps the original error as `cause` for anyone inspecting
 *  the exception directly. Rebrand mode's writes never throw this (they call `writeFileSync`
 *  directly), so an exception there still propagates unwrapped, as today. */
class AnchorWriteError extends Error {
  readonly rel: string
  constructor(rel: string, cause: Error) {
    super(`failed to write ${rel} (${(cause as NodeJS.ErrnoException).code ?? 'unknown'})`, { cause })
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
const DEPLOY_TEMPLATE_REL = 'scripts/templates/deploy.yml.template'

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
  // rename (on original content) -> upstream-slug swap -> VitePress base (config only). Returns
  // the keys hit so the caller records them ONLY when it actually commits this content.
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
    if (rel === CONFIG_REL) next = setViteBase(next, args.base)
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
    if (args.rebrand) {
      // Rebrand mode writes immediately, as today. Anchor mode computes this same content but
      // defers its own write to the end of the A-mode branch below (compute before write).
      applyEdit(PKG_REL, pkgNext, pkgRaw)
      scanResidual(PKG_REL, pkgNext)
    }

    // Read the deploy template up front: it decides whether the deploy target is handled by the
    // dedicated block below. If the template is absent, an existing deploy.yml in rebrand mode's
    // walk is still inventoried like any active file (never silently omitted -> no false "clean").
    const tmplRaw = readIf(DEPLOY_TEMPLATE_REL)
    // Read any existing deploy.yml here too, alongside the template — before either mode's write
    // phase begins — so the compute-before-write property (anchor mode's own goal below) also
    // covers the one read the deploy block further down used to make on its own, after other
    // files had already been written.
    const existingDeploy = readIf(DEPLOY_REL)

    if (args.rebrand) {
      // ── B mode: today's tree-wide swap, kept exactly as before (T51). ──
      for (const rel of walkTextFiles(root)) {
        if (rel === PKG_REL) continue // structured above
        if (rel === DEPLOY_REL && tmplRaw !== null) continue // handled with the deploy copy below
        const raw = readIf(rel)
        if (raw === null) continue
        const { next, keysHit } = transformText(rel, raw)
        applyEdit(rel, next, raw)
        for (const k of keysHit) recordSensitive(k, rel)
        scanResidual(rel, next)
      }
    } else {
      // ── A mode: only the doc anchors (A2–A5, traceability.md) and the config's base line. No
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

      // The base line, through today's path (setViteBase): no slug swap, A9 stays T-0014's job
      // (S1 decision, 2026-10-14 — see the ticket's Notes).
      const cfgRaw = readIf(CONFIG_REL)
      const cfgNext = cfgRaw !== null ? setViteBase(cfgRaw, args.base) : null

      // ── write phase: the config (a subdirectory file) first, then the manifest (root) whose
      //   write was deferred above, then the doc anchors (also root) — so a root-directory write
      //   failure can still be observed, in a test, to leave an already-written subdirectory file
      //   in place (traceability.md, T55: "files already written stay"). ──
      if (cfgRaw !== null) applyEdit(CONFIG_REL, cfgNext!, cfgRaw)
      applyEdit(PKG_REL, pkgNext, pkgRaw)
      for (const { file, next, raw } of docWrites) applyEdit(file, next, raw, 'latin1')
    }

    // ── deploy workflow, without --host (both modes): installed when absent; an existing
    //   different file is left untouched, with a warning. T-0014 adds --host. ──
    if (tmplRaw) {
      const { next: deployContent, keysHit: deployKeysHit } = args.rebrand
        ? transformText(DEPLOY_REL, tmplRaw)
        : { next: tmplRaw, keysHit: [] as string[] }
      const existing = existingDeploy
      if (existing === null) {
        changedFiles.push(DEPLOY_REL)
        if (!args.dryRun) {
          if (args.rebrand) {
            mkdirSync(dirname(abs(DEPLOY_REL)), { recursive: true })
            writeFileSync(abs(DEPLOY_REL), deployContent)
          } else {
            try {
              writeAnchorFile(abs(DEPLOY_REL), deployContent)
            } catch (err) {
              throw new AnchorWriteError(DEPLOY_REL, err as Error)
            }
          }
        }
        // The workflow deploys on a `v*` tag, but a fresh repo's `github-pages`
        // environment only authorises the default branch. Without the tag rule the
        // first release fails inside the deploy job, and nothing in that error
        // points back at an environment setting the fork owner never saw.
        warnings.push(
          `${DEPLOY_REL} deploys on a \`v*\` tag push. GitHub's \`github-pages\` environment authorises only the default branch by default, so add a Tag rule \`v*\` under Settings > Environments > github-pages > "Deployment branches and tags" (keep the existing \`main\` rule — workflow_dispatch needs it) before cutting a release.`,
        )
        if (args.rebrand) {
          for (const k of deployKeysHit) recordSensitive(k, DEPLOY_REL)
          scanResidual(DEPLOY_REL, deployContent)
        }
      } else {
        // Already present: left untouched. Warn only if it diverges from our generated content,
        // and inventory the file that is actually on disk (honest about its real content).
        if (existing !== deployContent) {
          warnings.push(
            `${DEPLOY_REL} already exists with different content — left untouched; merge the deploy workflow manually if needed.`,
          )
        }
        if (args.rebrand) scanResidual(DEPLOY_REL, existing)
      }
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

/** Set, replace, or remove the VitePress `base` declaration. */
function setViteBase(cfg: string, base: string | null | undefined): string {
  if (base === undefined) return cfg
  const lines = cfg.split('\n')
  const baseIdx = lines.findIndex((l) => /^\s*base:\s*/.test(l))
  if (base === null) {
    return baseIdx >= 0 ? lines.filter((_, i) => i !== baseIdx).join('\n') : cfg
  }
  if (baseIdx >= 0) {
    const literalRe = /base:\s*['"][^'"]*['"]/
    if (literalRe.test(lines[baseIdx])) {
      // function replacer so any `$` in `base` is never reinterpreted by String.replace
      lines[baseIdx] = lines[baseIdx].replace(literalRe, () => `base: '${base}'`)
    } else {
      // Non-literal base declaration (e.g. the upstream env-conditional form
      // `base: process.env.SITE_BASE ?? '/'`): collapse the whole line to a
      // plain literal so the fork's --base actually takes effect and the config
      // matches the single-literal shape the rest of the tooling expects.
      const indent = lines[baseIdx].match(/^\s*/)?.[0] ?? '  '
      lines[baseIdx] = `${indent}base: '${base}',`
    }
    return lines.join('\n')
  }
  // insert before the first `title:` line, matching its indentation
  const titleIdx = lines.findIndex((l) => /^\s*title:\s*/.test(l))
  const anchor = titleIdx >= 0 ? titleIdx : 1
  const indent = lines[anchor]?.match(/^\s*/)?.[0] ?? '  '
  lines.splice(anchor, 0, `${indent}base: '${base}',`)
  return lines.join('\n')
}

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
