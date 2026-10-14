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
 * Modes (both currently walk the whole tree for identity fields, base and the upstream-slug
 * swap, plus the deploy workflow):
 *   A (default)          identity fields, base, upstream-slug swap, deploy workflow.
 *   B (--rebrand <name>) also renames the four runtime-sensitive keys (deterministic,
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
 * throw — only `parseForkInitArgs` throws (`ForkInitArgError`), for argument errors. Today the
 * only checked tree error is the manifest check (A1) below; a filesystem failure elsewhere in the
 * walk (e.g. a permission error) still throws an uncaught exception until T55 wraps it. Every
 * exitCode 1 `ForkInitResult` — every value this function returns — carries empty
 * changedFiles/sensitiveKeys/residualFiles/residualHits/warnings arrays: nothing is collected
 * before the error surfaces.
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

  const applyEdit = (rel: string, next: string, prev: string) => {
    if (next === prev) return
    changedFiles.push(rel)
    if (!args.dryRun) writeFileSync(abs(rel), next)
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
  // A + B text transform for one file: sensitive-key rename (B, on original content) ->
  // upstream-slug swap (A) -> VitePress base (config only). Returns the keys hit so the caller
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

  // ── A-mode: package.json identity (structured) ──
  {
    const pkgObj = pkg as Record<string, unknown>
    pkgObj.version = '0.1.0'
    pkgObj.author = args.author
    // T13: `repository`/`bugs` that is not a plain object is replaced wholesale; a plain object
    // keeps its other keys (only `repository.type`/`url` and `bugs.url` are set).
    pkgObj.repository = { ...asPlainObject(pkgObj.repository), type: 'git', url: `git+https://github.com/${args.repo}.git` }
    pkgObj.bugs = { ...asPlainObject(pkgObj.bugs), url: `https://github.com/${args.repo}/issues` }
    pkgObj.homepage = `https://github.com/${args.repo}#readme`
    pkgObj.license = 'ECL-2.0'
    if (args.rebrand) pkgObj.name = args.name ?? args.rebrand
    else if (args.name) pkgObj.name = args.name
    if (args.description) pkgObj.description = args.description
    const pkgNext = JSON.stringify(pkgObj, null, 2) + '\n'
    applyEdit(PKG_REL, pkgNext, pkgRaw)
    if (args.rebrand) scanResidual(PKG_REL, pkgNext)
  }

  // Read the deploy template up front: it decides whether the deploy target is handled by the
  // dedicated block below. Only skip DEPLOY_REL in the walk when that block will handle it — so
  // if the template is absent, an existing deploy.yml is still inventoried like any active file
  // (never silently omitted -> no false "clean").
  const tmplRaw = readIf(DEPLOY_TEMPLATE_REL)

  // ── A + B on every active text file, computed in memory, written once. ──
  for (const rel of walkTextFiles(root)) {
    if (rel === PKG_REL) continue // structured above
    if (rel === DEPLOY_REL && tmplRaw !== null) continue // handled with the deploy copy below
    const raw = readIf(rel)
    if (raw === null) continue
    const { next, keysHit } = transformText(rel, raw)
    applyEdit(rel, next, raw)
    for (const k of keysHit) recordSensitive(k, rel)
    if (args.rebrand) scanResidual(rel, next)
  }

  // ── A-mode: copy deploy workflow — transformed like any active file, then inventoried, so a
  //   `wxl` in the tool-created workflow is never omitted from the honest inventory. Handled
  //   here (not in the walk) because on a fresh fork the target does not exist yet; never
  //   clobbers a customized deploy.yml. ──
  if (tmplRaw) {
    const { next: deployContent, keysHit } = transformText(DEPLOY_REL, tmplRaw)
    const existing = readIf(DEPLOY_REL)
    if (existing === null) {
      changedFiles.push(DEPLOY_REL)
      if (!args.dryRun) {
        mkdirSync(dirname(abs(DEPLOY_REL)), { recursive: true })
        writeFileSync(abs(DEPLOY_REL), deployContent)
      }
      // The workflow deploys on a `v*` tag, but a fresh repo's `github-pages`
      // environment only authorises the default branch. Without the tag rule the
      // first release fails inside the deploy job, and nothing in that error
      // points back at an environment setting the fork owner never saw.
      warnings.push(
        `${DEPLOY_REL} deploys on a \`v*\` tag push. GitHub's \`github-pages\` environment authorises only the default branch by default, so add a Tag rule \`v*\` under Settings > Environments > github-pages > "Deployment branches and tags" (keep the existing \`main\` rule — workflow_dispatch needs it) before cutting a release.`,
      )
      for (const k of keysHit) recordSensitive(k, DEPLOY_REL)
      if (args.rebrand) scanResidual(DEPLOY_REL, deployContent)
    } else {
      // Already present: never clobber. Warn only if it diverges from our generated content,
      // and inventory the file that is actually on disk (honest about its real content).
      if (existing !== deployContent) {
        warnings.push(
          `${DEPLOY_REL} already exists with different content — left untouched; merge the deploy workflow manually if needed.`,
        )
      }
      if (args.rebrand) scanResidual(DEPLOY_REL, existing)
    }
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
