/**
 * create-challenge.ts
 *
 * Scaffolds a new challenge directory structure, app skeleton, flag.txt,
 * and frontmatter stub, auto-runs challenge:keygen, then regenerates
 * platform/public/_redirects over the whole working tree.
 *
 * Usage:
 *   pnpm create:challenge --name <slug> [--title <title>] \
 *     [--backend flask|fastapi|php] [--difficulty easy|medium|hard] \
 *     [--flag <flag>]
 *
 * Exit status:
 *   0  created, keygen ran, _redirects regenerated
 *   1  invalid argument or name collision; nothing was written
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

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT       = resolve(__dirname, '..')

const VALID_BACKENDS = ['flask', 'fastapi', 'php'] as const
type Backend = (typeof VALID_BACKENDS)[number]

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

/** Slug validation: kebab-case, lowercase alphanumeric and hyphens only. */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

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
export type ScaffoldArgs = Omit<ScaffoldOptions, 'number'>

export interface RawArgs {
  name: string | undefined
  title: string | undefined
  backend: string | undefined
  difficulty: string | undefined
  flag: string | undefined
}

// ─── Pure helpers (exported for testing) ───────────────────────────────────

/** Generate a random flag in FLAG{<slug>_<random8hex>} format. */
export function generateFlag(slug: string): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(4))
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `FLAG{${slug}_${hex}}`
}

/** Convert a slug to Title Case, or return the provided title. */
export function getTitle(slug: string, title?: string): string {
  if (title) return title
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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
  if (!SLUG_RE.test(slug)) {
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
  const title = getTitle(slug, args.title)
  const flag = args.flag ?? generateFlag(slug)

  return { slug, title, backend, difficulty, flag }
}

/**
 * Detect naming collision. Throws if <slug>.md or <slug>/ already exists.
 * @param slug - The challenge slug
 * @param challengesDir - Absolute path to the challenges directory
 * @param existsFn - Injected fs.existsSync (overridable for tests)
 */
export function checkCollision(
  slug: string,
  challengesDir: string,
  existsFn: (p: string) => boolean = existsSync,
): void {
  // New per-folder structure
  const indexMdPath = resolve(challengesDir, slug, 'index.md')
  // Legacy flat structure
  const legacyMdPath = resolve(challengesDir, `${slug}.md`)

  if (existsFn(indexMdPath)) {
    throw new Error(`Challenge "${slug}" already exists: ${indexMdPath}`)
  }
  if (existsFn(legacyMdPath)) {
    throw new Error(`Challenge "${slug}" already exists (legacy): ${legacyMdPath}`)
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

// ─── Frontmatter generator (exported for testing) ──────────────────────────

/** Generate the index.md file content with per-folder frontmatter. */
export function generateMarkdown(opts: ScaffoldOptions): string {
  const { title, backend, difficulty, number } = opts
  const appFile = backend === 'php' ? 'index.php' : 'app.py'

  const fm: Record<string, unknown> = {
    title,
    // Written at creation, never afterwards. A challenge without it fails
    // validation, and a number derived later from any ordering would move.
    number,
    layout: 'challenge',
    difficulty,
    category: 'web',
    backend,
    app: appFile,
    packages: [],
    date: new Date().toISOString(),
    tags: [],
  }

  const fmStr = yamlStringify(fm, { lineWidth: 0 }).trimEnd()
  return `---\n${fmStr}\n---\n\n# ${title}\n\nTODO: Write challenge description here.\n`
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
  let opts: ScaffoldOptions
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
    // The number is assigned here, once, from the whole tree — live challenges
    // and retired ones alike. It is never derived from an ordering and never
    // changed afterwards; see scripts/challenge-numbers.ts.
    opts = { ...validateArgs(values as RawArgs), number: nextChallengeNumber(root) }
  } catch (e) {
    err(`Error: ${(e as Error).message}\n${USAGE}\n`)
    return 1
  }

  const { slug, backend, flag } = opts

  // ── 2. Collision detection ───────────────────────────────────────────────
  try {
    checkCollision(slug, challengesDir)
  } catch (e) {
    err(`Error: ${(e as Error).message}\n`)
    return 1
  }

  // ── 3. Create directory and write files (per-folder structure) ──────────
  const slugDir = resolve(challengesDir, slug)
  const srcDir = resolve(slugDir, 'src')
  mkdirSync(srcDir, { recursive: true })

  const appFile  = backend === 'php' ? 'index.php' : 'app.py'
  const skeleton =
    backend === 'flask'   ? flaskSkeleton(slug)
    : backend === 'fastapi' ? fastApiSkeleton(slug)
    : phpSkeleton(slug)

  writeFileSync(resolve(srcDir, appFile),    skeleton,                'utf-8')
  writeFileSync(resolve(srcDir, 'flag.txt'), flag,                    'utf-8')
  writeFileSync(resolve(slugDir, 'index.md'), generateMarkdown(opts), 'utf-8')

  out(
    `✓ Scaffold created:\n` +
    `  platform/challenge/${slug}/index.md\n` +
    `  platform/challenge/${slug}/src/${appFile}\n` +
    `  platform/challenge/${slug}/src/flag.txt\n`,
  )

  // ── 4. Auto-run keygen ───────────────────────────────────────────────────
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
      `The challenge was created at platform/challenge/${slug}/. ` +
      `Fix the cause above, then run:\n` +
      `  pnpm challenge:keygen ${slug}\n` +
      `  pnpm redirects:generate\n` +
      `platform/public/_redirects was not regenerated.\n`,
    )
    return 3
  }
  out(keygen.output)
  out(`✓ Keygen complete.\n`)

  // ── 5. Regenerate _redirects over the whole working tree ─────────────────
  try {
    writeRedirects(root)
  } catch (e) {
    // W1. Status 2: the challenge exists and keygen ran, so only the redirect
    // file is behind (D8). A generator refusal throws before anything is
    // written, so the file on disk is as it was.
    err(
      `Error: platform/public/_redirects was not regenerated:\n${(e as Error).message}\n\n` +
      `The challenge was created at platform/challenge/${slug}/ and keygen ran. ` +
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
