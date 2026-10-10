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
 *   A (default)          minimal fork: identity fields, base, upstream-slug swap, deploy workflow.
 *   B (--rebrand <name>) A + deterministic rename of the four runtime-sensitive keys, plus an
 *                        HONEST residual inventory of every remaining case-insensitive `wxl`
 *                        (which is NOT auto-renamed — see "Why not rename every wxl?" below).
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
 *   1  user input error (missing/invalid flag)
 */

import { parseArgs } from 'node:util'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs'
import { dirname, resolve, join, sep } from 'node:path'
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
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message)
    this.name = 'ForkInitArgError'
  }
}

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/
// A safe VitePress base: absolute, slash-separated, only URL-path-safe chars.
// Rejects quotes and `$` so the value cannot break out of the generated string
// literal in .vitepress/config.mts (an executable TS module).
const BASE_RE = /^\/([A-Za-z0-9._~-]+\/)*$/

export function parseForkInitArgs(argv: string[]): ForkInitArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      author: { type: 'string' },
      repo: { type: 'string' },
      base: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      rebrand: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  })

  if (!values.author) throw new ForkInitArgError('missing required flag: --author <name>')
  if (!values.repo) throw new ForkInitArgError('missing required flag: --repo <owner/repo>')
  if (!REPO_RE.test(values.repo)) {
    throw new ForkInitArgError(`--repo must be in owner/repo form, got: ${values.repo}`)
  }
  if (values.rebrand !== undefined) {
    // --rebrand is substituted verbatim into the sensitive-key replacements, which land in
    // executable TS modules and CI YAML, so it must be a plain identifier — reject
    // quotes/$/backtick/whitespace that could break out of a string literal at build time.
    // It MUST start with a letter: the uppercased form seeds an env-var / JS-identifier
    // (`<UPPER>_VERIFY_RUNTIME`), which cannot begin with a digit. (Interior `-`/`.` are
    // allowed for the brand short-name and sanitized to `_` when building that identifier.)
    if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(values.rebrand)) {
      throw new ForkInitArgError(
        `--rebrand must start with a letter and contain only [A-Za-z0-9._-] (no spaces/quotes/$), got: ${JSON.stringify(values.rebrand)}`,
      )
    }
    if (values.rebrand.toLowerCase().includes('wxl')) {
      throw new ForkInitArgError('--rebrand name must not contain "wxl" (case-insensitive; would reintroduce the token and break idempotent rename)')
    }
  }

  let base: string | null | undefined
  if (values.base === undefined) base = undefined
  else if (values.base === 'none') base = null
  else {
    if (!BASE_RE.test(values.base)) {
      throw new ForkInitArgError(
        `--base must be an absolute URL path like /myfork/ (letters, digits, . _ ~ - and slashes), or "none"; got: ${values.base}`,
      )
    }
    base = values.base
  }

  return {
    author: values.author,
    repo: values.repo,
    base,
    name: values.name,
    description: values.description,
    rebrand: values.rebrand,
    dryRun: values['dry-run'] ?? false,
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

// Directories/files never touched by any rewrite.
// The skill trees `.claude`/`.agents` and the Codex config dir `.codex` are excluded because
// skill identifiers (e.g. `wxl-create`) are structural: they name the skill directories, so a
// content-only rename would break them without a coordinated path rename (out of scope; see
// inventory).
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.claude', '.agents', '.codex'])
const EXCLUDED_FILE = new Set(['pnpm-lock.yaml', 'pnpm-lock.yml'])
// Path prefixes (matched at a path-segment boundary, so `dist-notes.md` is NOT excluded by
// `.vitepress/dist`): regenerated build output/cache.
const EXCLUDED_PATH_FRAGMENTS = [
  join('.vitepress', 'dist'),
  join('.vitepress', 'cache'),
]
// This tool's own source + test must not be rewritten — they need the literal `wxl`/`WXL`
// probes, fixtures, and UPSTREAM_SLUG to keep working on subsequent runs.
const SELF_EXCLUDE = new Set([
  join('scripts', 'fork-init.ts'),
  join('tests', 'unit', 'scripts', 'fork-init.test.ts'),
])
// package.json is edited structurally, never via text passes.
const PKG_REL = 'package.json'
const CONFIG_REL = join('.vitepress', 'config.mts')
const DEPLOY_TEMPLATE_REL = join('scripts', 'templates', 'deploy.yml.template')

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

  const DEPLOY_REL = join('.github', 'workflows', 'deploy.yml')

  // ── A-mode: package.json identity (structured) ──
  const pkgRaw = readIf(PKG_REL)
  if (pkgRaw) {
    const pkg = JSON.parse(pkgRaw)
    pkg.version = '0.1.0'
    pkg.author = args.author
    pkg.repository = { ...(pkg.repository ?? {}), type: 'git', url: `git+https://github.com/${args.repo}.git` }
    pkg.bugs = { ...(pkg.bugs ?? {}), url: `https://github.com/${args.repo}/issues` }
    pkg.homepage = `https://github.com/${args.repo}#readme`
    pkg.license = 'ECL-2.0'
    if (args.rebrand) pkg.name = args.name ?? args.rebrand
    else if (args.name) pkg.name = args.name
    if (args.description) pkg.description = args.description
    const pkgNext = JSON.stringify(pkg, null, 2) + '\n'
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
    (frag) => childRel === frag || childRel.startsWith(frag + sep),
  )
}

/** Recursively list repo-relative text files eligible for the text passes. */
function walkTextFiles(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? join(rel, entry.name) : entry.name
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
