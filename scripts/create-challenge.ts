/**
 * create-challenge.ts
 *
 * Scaffolds a new challenge: the primary locale's brief
 * (platform/<P>/challenge/<slug>/index.md, `title` and `layout` only), the declaration
 * (platform/challenge/<slug>/challenge.yaml), the app skeleton and flag.txt under src/.
 * `P` comes from range.json (zh-TW when it says nothing). It then auto-runs
 * challenge:keygen and regenerates platform/public/_redirects over the whole working tree.
 *
 * Usage:
 *   pnpm create:challenge --name <slug> [--title <title>] \
 *     [--backend flask|fastapi|php] [--difficulty easy|medium|hard] \
 *     [--flag <flag>]
 *
 * Exit status:
 *   0  created, keygen ran, _redirects regenerated
 *   1  invalid argument, unusable range.json, legacy-layout tree or name collision;
 *      nothing was written
 *   2  created and keygen ran, but _redirects was not regenerated (W1)
 *   3  the scaffold was written but keygen failed (W2)
 */

import { parseArgs } from 'node:util'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { stringify as yamlStringify } from 'yaml'
import { nextChallengeNumber } from './challenge-numbers.ts'
import { writeRedirects } from './generate-redirects.ts'
import { SLUG_GRAMMAR } from '../.vitepress/challenge/shortLink.ts'
import { readPrimaryLocale } from '../.vitepress/primary-locale.ts'
import { SiteLayoutError } from '../.vitepress/layout-error.ts'
import { checkSourceLayout } from '../.vitepress/source-layout.ts'
import { LOCALES, type Locale } from '../.vitepress/locales.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT       = resolve(__dirname, '..')

const VALID_BACKENDS = ['flask', 'fastapi', 'php'] as const
type Backend = (typeof VALID_BACKENDS)[number]

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const


// ─── Exported types ────────────────────────────────────────────────────────

export interface ScaffoldOptions {
  slug: string
  title: string
  backend: Backend
  difficulty: string
  flag: string
  /**
   * The challenge's permanent number, one greater than every number ever
   * assigned. Passed in rather than computed here so the generator stays pure;
   * `run()` reads the tree.
   */
  number: number
}

/**
 * Everything the CLI arguments alone determine. The number is not among them —
 * it is read out of the challenge tree, so it joins in `run()`.
 */
export type ScaffoldArgs = Omit<ScaffoldOptions, 'number' | 'title'> & {
  /** Unresolved: the default title depends on the primary locale, which `run()` reads after this. */
  title: string | undefined
}

export interface RawArgs {
  name: string | undefined
  title: string | undefined
  backend: string | undefined
  difficulty: string | undefined
  flag: string | undefined
}

/**
 * The text a scaffold writes in a locale. Total over the locale list: `Record<Locale, …>`
 * makes a locale added there without text here fail type-check (Y79).
 */
export const SCAFFOLD_TEXT: Record<Locale, { title(slug: string): string; body: string }> = {
  en: {
    title: (slug) =>
      slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    body: 'TODO: Write challenge description here.',
  },
  'zh-TW': {
    title: (slug) => `未命名題目（${slug}）`,
    body: 'TODO：在這裡寫說明頁內文。',
  },
}

// ─── Pure helpers (exported for testing) ───────────────────────────────────

/** Generate a random flag in FLAG{<slug>_<random8hex>} format. */
export function generateFlag(slug: string): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(4))
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `FLAG{${slug}_${hex}}`
}

/** The provided title, or the locale's default title for the slug. */
export function getTitle(slug: string, title: string | undefined, locale: Locale): string {
  if (title) return title
  return SCAFFOLD_TEXT[locale].title(slug)
}

/**
 * Validate raw CLI args and return normalized ScaffoldOptions.
 * Throws Error (never calls process.exit) so callers can handle the error.
 */
export function validateArgs(args: RawArgs): ScaffoldArgs {
  if (!args.name) {
    throw new Error('Missing required argument: --name <slug>')
  }

  const slug = args.name
  if (!SLUG_GRAMMAR.test(slug)) {
    throw new Error(
      `Invalid --name "${slug}". Must be kebab-case (lowercase alphanumeric and hyphens only).`,
    )
  }

  const backend = (args.backend ?? 'flask') as Backend
  if (!(VALID_BACKENDS as readonly string[]).includes(backend)) {
    throw new Error(
      `Invalid --backend "${backend}". Must be one of: ${VALID_BACKENDS.join(', ')}.`,
    )
  }

  const difficulty = args.difficulty ?? 'easy'
  if (!(VALID_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    throw new Error(
      `Invalid --difficulty "${difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(', ')}.`,
    )
  }
  const title = args.title
  const flag = args.flag ?? generateFlag(slug)

  return { slug, title, backend, difficulty, flag }
}

/**
 * Detect naming collision (CC1). Throws if the challenge directory
 * `platform/challenge/<slug>/` or any locale's `platform/<L>/challenge/<slug>/` exists.
 * A flat `platform/challenge/<slug>.md` is not checked here: the layout check refuses it.
 * @param slug - The challenge slug
 * @param root - The repository root
 * @param existsFn - Injected fs.existsSync (overridable for tests)
 */
export function checkCollision(
  slug: string,
  root: string,
  existsFn: (p: string) => boolean = existsSync,
): void {
  const dirRel = `platform/challenge/${slug}`
  if (existsFn(resolve(root, dirRel))) {
    throw new Error(`Challenge "${slug}" already exists: ${dirRel}/`)
  }
  // Any locale's brief folder collides, the primary locale's or not (D84): a translation
  // left behind would otherwise be adopted by the new challenge.
  for (const locale of LOCALES) {
    const briefRel = `platform/${locale}/challenge/${slug}`
    if (existsFn(resolve(root, briefRel))) {
      throw new Error(`Challenge "${slug}" already exists: ${briefRel}/`)
    }
  }
}

// ─── App skeletons (exported for testing) ──────────────────────────────────

/** Generate a minimal Flask app.py that reads /flag.txt. */
export function flaskSkeleton(slug: string): string {
  return `# ${slug} — Flask challenge skeleton
# TODO: Add the vulnerability here

from flask import Flask, Response

app = Flask(__name__)


@app.route('/')
def index() -> Response:
    # Read flag from the virtual filesystem (populated by the challenge runtime)
    try:
        with open('/flag.txt') as f:
            flag = f.read().strip()
    except FileNotFoundError:
        flag = '(flag not found)'

    html = f"""<!DOCTYPE html>
<html>
  <head><title>Challenge</title></head>
  <body>
    <h1>Challenge</h1>
    <p>{flag}</p>
  </body>
</html>"""
    return Response(html, mimetype='text/html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
`
}

/** Generate a minimal FastAPI app.py that reads /flag.txt. */
export function fastApiSkeleton(slug: string): string {
  return `# ${slug} — FastAPI challenge skeleton
# TODO: Add the vulnerability here

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()


@app.get('/')
async def index() -> HTMLResponse:
    # Read flag from the virtual filesystem (populated by the challenge runtime)
    try:
        with open('/flag.txt') as f:
            flag = f.read().strip()
    except FileNotFoundError:
        flag = '(flag not found)'

    html = f"""<!DOCTYPE html>
<html>
  <head><title>Challenge</title></head>
  <body>
    <h1>Challenge</h1>
    <p>{flag}</p>
  </body>
</html>"""
    return HTMLResponse(content=html)
`
}

/** Generate a minimal PHP index.php that reads /flag.txt. */
export function phpSkeleton(slug: string): string {
  return `<?php
// ${slug} — PHP challenge skeleton
// TODO: Add the vulnerability here

$flag = @file_get_contents('/flag.txt') ?: '(flag not found)';
?><!DOCTYPE html>
<html>
  <head><title>Challenge</title></head>
  <body>
    <h1>Challenge</h1>
    <p><?= htmlspecialchars($flag) ?></p>
  </body>
</html>
`
}

// ─── Declaration generator (exported for testing) ──────────────────────────

/** Generate the `challenge.yaml` content: the declaration keys only, no brief key. */
export function generateDeclaration(opts: ScaffoldOptions): string {
  const { backend, difficulty, number } = opts
  const appFile = backend === 'php' ? 'index.php' : 'app.py'

  const declaration: Record<string, unknown> = {
    // Written at creation, never afterwards. A challenge without it fails
    // validation, and a number derived later from any ordering would move.
    number,
    difficulty,
    category: 'web',
    backend,
    app: appFile,
    packages: [],
    date: new Date().toISOString(),
    tags: [],
  }

  // The trailing newline stays: keygen appends `wasmModule` after the last key.
  return yamlStringify(declaration, { lineWidth: 0 })
}

// ─── Brief generator (exported for testing) ────────────────────────────────

/** Generate the brief (`platform/<L>/challenge/<slug>/index.md`): `title` and `layout` only. */
export function generateBrief(opts: ScaffoldOptions, locale: Locale): string {
  const fmStr = yamlStringify({ title: opts.title, layout: 'challenge' }, { lineWidth: 0 }).trimEnd()
  return `---\n${fmStr}\n---\n\n# ${opts.title}\n\n${SCAFFOLD_TEXT[locale].body}\n`
}

// ─── Entry (exported for testing) ──────────────────────────────────────────

/** What a keygen runner reports. `output` is what keygen printed. */
export interface KeygenResult {
  ok: boolean
  output: string
}

export interface RunDeps {
  /** The repository root the challenge is created under. */
  root: string
  /** Runs `challenge:keygen` for one slug under `root`. A throw counts as failure. */
  runKeygen: (slug: string, root: string) => KeygenResult
  /** Output sinks; the CLI passes the process streams. */
  stdout?: (text: string) => void
  stderr?: (text: string) => void
}

const USAGE =
  'Usage: pnpm create:challenge --name <slug> [--title <title>] ' +
  '[--backend flask|fastapi|php] [--difficulty easy|medium|hard] [--flag <flag>]'

/**
 * Scaffold a challenge under `deps.root`, run keygen, then regenerate
 * `platform/public/_redirects` over the whole working tree, as `pnpm dev` and
 * `pnpm build` do. Returns the exit status.
 */
export function run(argv: string[], deps: RunDeps): number {
  const { root, runKeygen } = deps
  const out = deps.stdout ?? ((s: string) => { process.stdout.write(s) })
  const err = deps.stderr ?? ((s: string) => { process.stderr.write(s) })
  const challengesDir = resolve(root, 'platform', 'challenge')

  // ── 1. Validate CLI args ─────────────────────────────────────────────────
  let args: ScaffoldArgs
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        name:       { type: 'string' },
        title:      { type: 'string' },
        backend:    { type: 'string' },
        difficulty: { type: 'string' },
        flag:       { type: 'string' },
      },
    })
    args = validateArgs(values as RawArgs)
  } catch (e) {
    err(`Error: ${(e as Error).message}\n${USAGE}\n`)
    return 1
  }

  // ── 2. The primary locale (D123), then the layout check (D19) ─────────────
  // Order: arguments, primary locale, layout check, collision, number, write (D82).
  let primary: Locale
  try {
    primary = readPrimaryLocale(resolve(root, 'range.json'))
    checkSourceLayout(resolve(root, 'platform'), primary)
  } catch (e) {
    // A range.json or layout fault: status 1, nothing written. The first line is the PL
    // line, with no `Error:` prefix and no usage text (D123).
    if (e instanceof SiteLayoutError) {
      err(`${e.message}\n`)
      return 1
    }
    throw e
  }

  const { slug, backend, flag } = args

  // ── 3. Collision detection ───────────────────────────────────────────────
  try {
    checkCollision(slug, root)
  } catch (e) {
    err(`Error: ${(e as Error).message}\n`)
    return 1
  }

  // The number is assigned here, once, from the whole tree — live challenges
  // and retired ones alike. It is never derived from an ordering and never
  // changed afterwards; see scripts/challenge-numbers.ts.
  const opts: ScaffoldOptions = {
    ...args,
    title: getTitle(slug, args.title, primary),
    number: nextChallengeNumber(root),
  }

  // ── 4. Create directories and write files ───────────────────────────────
  const slugDir = resolve(challengesDir, slug)
  const srcDir = resolve(slugDir, 'src')
  const briefRel = `platform/${primary}/challenge/${slug}/index.md`
  const briefPath = resolve(root, briefRel)
  mkdirSync(srcDir, { recursive: true })
  mkdirSync(dirname(briefPath), { recursive: true })

  const appFile  = backend === 'php' ? 'index.php' : 'app.py'
  const skeleton =
    backend === 'flask'   ? flaskSkeleton(slug)
    : backend === 'fastapi' ? fastApiSkeleton(slug)
    : phpSkeleton(slug)

  writeFileSync(resolve(srcDir, appFile),    skeleton,                       'utf-8')
  writeFileSync(resolve(srcDir, 'flag.txt'), flag,                           'utf-8')
  writeFileSync(resolve(slugDir, 'challenge.yaml'), generateDeclaration(opts), 'utf-8')
  writeFileSync(briefPath, generateBrief(opts, primary), 'utf-8')

  out(
    `✓ Scaffold created:\n` +
    `  ${briefRel}\n` +
    `  platform/challenge/${slug}/challenge.yaml\n` +
    `  platform/challenge/${slug}/src/${appFile}\n` +
    `  platform/challenge/${slug}/src/flag.txt\n`,
  )

  // ── 5. Auto-run keygen ───────────────────────────────────────────────────
  out(`\nRunning challenge:keygen ${slug} …\n`)
  let keygen: KeygenResult
  try {
    keygen = runKeygen(slug, root)
  } catch (e) {
    keygen = { ok: false, output: (e as Error).message }
  }
  if (!keygen.ok) {
    // W2. Status 3, not 1: the scaffold is on disk, so re-asking the name
    // would collide with it (D13).
    err(
      `Error: keygen failed after the scaffold was written:\n${keygen.output.trimEnd()}\n\n` +
      `The challenge was created at platform/challenge/${slug}/ ` +
      `with its brief at ${briefRel}. ` +
      `Fix the cause above, then run:\n` +
      `  pnpm challenge:keygen ${slug}\n` +
      `  pnpm redirects:generate\n` +
      `platform/public/_redirects was not regenerated.\n`,
    )
    return 3
  }
  out(keygen.output)
  out(`✓ Keygen complete.\n`)

  // ── 6. Regenerate _redirects over the whole working tree ─────────────────
  try {
    writeRedirects(root)
  } catch (e) {
    // W1. Status 2: the challenge exists and keygen ran, so only the redirect
    // file is behind (D8). A generator refusal throws before anything is
    // written, so the file on disk is as it was.
    err(
      `Error: platform/public/_redirects was not regenerated:\n${(e as Error).message}\n\n` +
      `The challenge was created at platform/challenge/${slug}/ ` +
      `with its brief at ${briefRel}, and keygen ran. ` +
      `Fix the cause above; git commit of the challenge then regenerates ` +
      `platform/public/_redirects from what is staged, ` +
      `and pnpm redirects:generate rewrites it from the working tree.\n`,
    )
    return 2
  }
  out(`✓ Regenerated platform/public/_redirects — challenge is ready.\n`)
  return 0
}

// ─── CLI guard (only runs when executed directly) ──────────────────────────

/**
 * Runs `pnpm challenge:keygen <slug>` in `root`. Its stdout becomes the
 * result's output; on success its warnings go to stderr as they happen today,
 * and on failure both streams go into the output W2 prints.
 */
function runKeygenCli(slug: string, root: string): KeygenResult {
  // The slug is kebab-case by now (validateArgs), so it is safe in a shell string.
  const r = spawnSync(`pnpm challenge:keygen ${slug}`, { cwd: root, encoding: 'utf-8', shell: true })
  if (r.status === 0) {
    if (r.stderr) process.stderr.write(r.stderr)
    return { ok: true, output: r.stdout }
  }
  const output = `${r.stderr ?? ''}${r.stdout ?? ''}`
  return { ok: false, output: output || (r.error?.message ?? `keygen exited with status ${r.status}`) }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  // exitCode, not exit(): exit() can cut off output still queued for a pipe.
  process.exitCode = run(process.argv.slice(2), { root: ROOT, runKeygen: runKeygenCli })
}
