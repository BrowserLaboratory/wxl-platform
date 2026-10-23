/**
 * The 0007-S5 fixture: a temporary git repository for running the real
 * `scripts/pre-commit.sh`, plus the snapshots its cases compare.
 *
 * The repository sits at `<mkdtemp>/暫存 repo`, so its path holds a space and
 * non-ASCII characters. It holds:
 * - `platform/challenge/test-chall/` (#1, English only), today's fixture challenge;
 * - `platform/challenge/door/` (#2) with a Traditional Chinese brief;
 * - `.archive/challenge/old-chall/` (#3), a valid retired challenge;
 * - `platform/public/` with a `_redirects` that matches the tree, and one other file;
 * - copies of the scripts the hook calls and the `.vitepress/challenge/` modules they import;
 * - a `node_modules` link to this checkout's packages, excluded through `.git/info/exclude`;
 * - a `.gitignore` holding `logs/` and `tmp/`, and this checkout's `.gitattributes`
 *   (`* text=auto eol=lf`), so git normalizes line endings as it does in a range;
 * - one stash entry made before any case runs, which changes `platform/public/` files;
 * - the hook installed as `.git/hooks/pre-commit`, running this checkout's hook by path.
 *
 * Child processes get the test's environment with every inherited `GIT_*`
 * variable removed, `HOME` set to a temporary directory and `GIT_CONFIG_GLOBAL`
 * set to a temporary file holding the identity, so an outer hook cannot point
 * them at the real repository.
 */

import {
  appendFileSync,
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { generateRedirects } from '../../scripts/generate-redirects'

export const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
export const HOOK = join(PROJECT_ROOT, 'scripts/pre-commit.sh')
export const REDIRECTS = 'platform/public/_redirects'

/** The scripts the hook calls, and every module they import. */
const COPIED_FILES = [
  'scripts/pre-commit.sh',
  'scripts/challenge-lint-staged.ts',
  'scripts/challenge-analyze.ts',
  'scripts/challenge-validate.ts',
  'scripts/challenge-utils.ts',
  'scripts/challenge-numbers.ts',
  'scripts/challenge-source-display.ts',
  'scripts/fsignore.ts',
  'scripts/generate-redirects.ts',
  '.vitepress/challenge/config.ts',
  '.vitepress/challenge/shortLink.ts',
  '.vitepress/challenge/reserved-keys.ts',
]

export interface Repo {
  /** The temporary directory holding the repository, its home and its logs. */
  base: string
  /** The repository's top level, as a physical path. */
  dir: string
  env: NodeJS.ProcessEnv
}

export interface Fixture extends Repo {
  /** The commit id of the stash entry made before any case runs. */
  preexisting: string
}

export interface Run {
  status: number | null
  stdout: string
  stderr: string
}

/** The test's environment without any inherited `GIT_*` variable, and an isolated home. */
export function isolatedEnv(home: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_')) env[key] = value
  }
  env.HOME = home
  env.GIT_CONFIG_GLOBAL = join(home, 'gitconfig')
  env.GIT_CONFIG_NOSYSTEM = '1'
  return env
}

export function gitRun(repo: Repo, args: string[], extraEnv: NodeJS.ProcessEnv = {}, input?: string): Run {
  const r = spawnSync('git', args, {
    cwd: repo.dir,
    env: { ...repo.env, ...extraEnv },
    encoding: 'utf8',
    input,
  })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

/** Run git and return its stdout; throw when it fails. */
export function git(repo: Repo, args: string[], extraEnv: NodeJS.ProcessEnv = {}): string {
  const r = gitRun(repo, args, extraEnv)
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed (${r.status}): ${r.stderr}`)
  return r.stdout
}

/** Run this checkout's hook directly, with `bash`, at the repository's top level. */
export function runHook(repo: Repo, extraEnv: NodeJS.ProcessEnv = {}): Run {
  const r = spawnSync('bash', [HOOK], { cwd: repo.dir, env: { ...repo.env, ...extraEnv }, encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

/** Run a real `git commit`, which runs the installed hook. */
export function commit(repo: Repo, args: string[]): Run {
  return gitRun(repo, ['commit', ...args])
}

export function write(repo: Repo, path: string, content: string | Buffer): void {
  const full = join(repo.dir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

export function read(repo: Repo, path: string): string {
  return readFileSync(join(repo.dir, path), 'utf8')
}

export interface ChallengeOptions {
  title?: string
  /** Write `src/app.py`; true by default. */
  app?: boolean
  /** Write `src/flag.txt`; true by default. */
  flag?: boolean
}

/** A complete English challenge, as the validator accepts it. */
export function writeChallenge(repo: Repo, tree: string, slug: string, number: number, options: ChallengeOptions = {}): void {
  const dir = `${tree}/${slug}`
  write(repo, `${dir}/index.md`, challengeIndex(options.title ?? slug, number))
  if (options.app !== false) write(repo, `${dir}/src/app.py`, 'from flask import Flask\napp = Flask(__name__)\n')
  if (options.flag !== false) write(repo, `${dir}/src/flag.txt`, `FLAG{${slug}-flag}`)
}

export function challengeIndex(title: string, number: number): string {
  return ['---', `title: "${title}"`, `number: ${number}`, 'backend: flask', 'app: app.py', '---', '', `${title} content`, ''].join('\n')
}

/** A Traditional Chinese brief: a directory holding only `index.md`. */
export function writeBrief(repo: Repo, slug: string, number: number): void {
  write(repo, `platform/zh-TW/challenge/${slug}/index.md`, ['---', `title: "${slug} 中文"`, `number: ${number}`, '---', '', '說明', ''].join('\n'))
}

/** Build the fixture once; cases start from a copy (`cloneFixture`). */
export function buildFixture(): Fixture {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'wxl-pre-commit-')))
  const home = join(base, 'home')
  mkdirSync(home)
  writeFileSync(join(home, 'gitconfig'), '[user]\n\tname = Test\n\temail = test@example.com\n[init]\n\tdefaultBranch = main\n')
  const dir = join(base, '暫存 repo')
  mkdirSync(dir)
  const repo: Repo = { base, dir, env: isolatedEnv(home) }

  git(repo, ['init', '-q'])
  for (const file of COPIED_FILES) write(repo, file, readFileSync(join(PROJECT_ROOT, file)))
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(dir, 'node_modules'))
  appendFileSync(join(dir, '.git/info/exclude'), '/node_modules\n')
  write(repo, '.gitignore', 'logs/\ntmp/\n')
  write(repo, '.gitattributes', readFileSync(join(PROJECT_ROOT, '.gitattributes')))
  write(repo, 'README.md', '# Fixture\n')

  writeChallenge(repo, 'platform/challenge', 'test-chall', 1, { title: 'Test Challenge' })
  writeChallenge(repo, 'platform/challenge', 'door', 2)
  writeBrief(repo, 'door', 2)
  writeChallenge(repo, '.archive/challenge', 'old-chall', 3)
  write(repo, 'platform/public/other.txt', 'other\n')
  write(repo, REDIRECTS, generateRedirects(dir))

  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '--no-verify', '-m', 'fixture'])

  // The teacher's own stash entry. It changes platform/public/ files, so
  // applying or dropping it by mistake shows in the byte comparison.
  write(repo, 'platform/public/other.txt', 'other, stashed by the teacher\n')
  write(repo, REDIRECTS, `${read(repo, REDIRECTS)}# stashed by the teacher\n`)
  git(repo, ['stash', 'push', '-q', '-m', "teacher's own entry"])
  const preexisting = git(repo, ['rev-parse', 'refs/stash']).trim()

  const hook = join(dir, '.git/hooks/pre-commit')
  mkdirSync(dirname(hook), { recursive: true })
  writeFileSync(hook, `#!/bin/sh\nexec bash '${HOOK}'\n`)
  chmodSync(hook, 0o755)

  return { ...repo, preexisting }
}

/** A fresh copy of the fixture, in a new temporary directory. */
export function cloneFixture(fixture: Fixture): Fixture {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'wxl-pre-commit-')))
  cpSync(fixture.base, base, { recursive: true, verbatimSymlinks: true })
  const home = join(base, 'home')
  return { base, dir: join(base, '暫存 repo'), env: isolatedEnv(home), preexisting: fixture.preexisting }
}

export function removeRepo(repo: Repo): void {
  rmSync(repo.base, { recursive: true, force: true })
}

// ─── Snapshots ──────────────────────────────────────────────────────────────

export interface Snapshot {
  /** `git ls-files --stage` of the repository's own index. */
  index: string[]
  /** Every working-tree path except `.git`: file bytes (with the executable bit) or a link's target. */
  files: Map<string, string>
  /** The untracked lines of `git status --porcelain=v1 --untracked-files=all`. */
  untracked: string[]
  /** `git stash list`, with each entry's commit id. */
  stash: string[]
}

function walk(root: string, rel: string, out: Map<string, string>): void {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const path = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (path === '.git') continue
    const full = join(root, path)
    if (entry.isSymbolicLink()) out.set(path, `link:${readlinkSync(full)}`)
    else if (entry.isDirectory()) walk(root, path, out)
    else {
      const exec = (lstatSync(full).mode & 0o111) !== 0 ? 'x' : '-'
      out.set(path, `${exec}:${readFileSync(full).toString('base64')}`)
    }
  }
}

export function snapshot(repo: Repo): Snapshot {
  const files = new Map<string, string>()
  walk(repo.dir, '', files)
  const lines = (s: string) => s.split('\n').filter((l) => l !== '')
  return {
    index: lines(git(repo, ['ls-files', '--stage'])),
    files,
    untracked: lines(git(repo, ['status', '--porcelain=v1', '--untracked-files=all'])).filter((l) => l.startsWith('??')),
    stash: stashList(repo),
  }
}

export function stashList(repo: Repo): string[] {
  return git(repo, ['stash', 'list', '--format=%H %gd %gs']).split('\n').filter((l) => l !== '')
}

/** The staged `_redirects`, or null when the index has none. */
export function stagedRedirects(repo: Repo): string | null {
  const r = gitRun(repo, ['show', `:${REDIRECTS}`])
  return r.status === 0 ? r.stdout : null
}

/** A copy of a byte map without the given paths; compare two of them to check that a change touched only those paths. */
export function withoutPaths(files: Map<string, string>, paths: string[]): Map<string, string> {
  const copy = new Map(files)
  for (const p of paths) copy.delete(p)
  return copy
}

// ─── The oracle ─────────────────────────────────────────────────────────────

/**
 * The expected `_redirects` of the staged snapshot: `generateRedirects` from
 * this checkout over `git checkout-index --all` into a directory outside the
 * repository. Taken after the case has staged its change and before the hook runs.
 */
export function expectedRedirects(repo: Repo, extraEnv: NodeJS.ProcessEnv = {}): string {
  const out = realpathSync(mkdtempSync(join(tmpdir(), 'wxl-pre-commit-oracle-')))
  try {
    git(repo, ['checkout-index', '--all', `--prefix=${out}/`], extraEnv)
    return generateRedirects(out)
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

/** The rule lines of a `_redirects`, as `<from> <to>`. */
export function rulesOf(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => l.split(/\s+/).slice(0, 2).join(' '))
}

// ─── The real repository (H30) ──────────────────────────────────────────────

export interface RealState {
  redirects: string
  index: string
  stash: string
}

export function realRepoState(): RealState {
  // Only reads run here, so no identity is needed: the developer's global and
  // system configuration are both left out, as is every inherited GIT_* variable.
  const env = isolatedEnv(tmpdir())
  env.GIT_CONFIG_GLOBAL = '/dev/null'
  const run = (args: string[]) => {
    const r = spawnSync('git', args, { cwd: PROJECT_ROOT, env, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed in the real repository: ${r.stderr}`)
    return r.stdout
  }
  return {
    redirects: readFileSync(join(PROJECT_ROOT, REDIRECTS), 'utf8'),
    index: run(['ls-files', '--stage']),
    stash: run(['stash', 'list', '--format=%H %gd %gs']),
  }
}

// ─── Recording stubs ────────────────────────────────────────────────────────

/**
 * Rename a script the hook calls to `real-<name>` and put a stub at its path
 * that appends a JSON line to `log` (outside the repository), then runs the
 * renamed copy with the same arguments. The renamed name still ends with the
 * original one, so the copy's own direct-run check passes.
 *
 * `recordStash` also records `git stash list` while the stub runs.
 */
export function recordScript(repo: Repo, script: string, log: string, recordStash = false): void {
  const path = join(repo.dir, 'scripts', script)
  renameSync(path, join(repo.dir, 'scripts', `real-${script}`))
  writeFileSync(path, `import { appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const args = process.argv.slice(2)
const entry: Record<string, unknown> = { argv: args }
if (${recordStash}) {
  entry.stash = spawnSync('git', ['stash', 'list', '--format=%H'], { encoding: 'utf8' }).stdout.split('\\n').filter((l) => l !== '')
}
appendFileSync(${JSON.stringify(log)}, JSON.stringify(entry) + '\\n')
const real = fileURLToPath(new URL('./real-${script}', import.meta.url))
const r = spawnSync(process.execPath, ['--experimental-strip-types', real, ...args], { stdio: 'inherit' })
process.exit(r.status ?? 1)
`)
}

export interface Recorded {
  argv: string[]
  stash?: string[]
}

export function readRecord(log: string): Recorded[] {
  let raw = ''
  try {
    raw = readFileSync(log, 'utf8')
  } catch {
    return []
  }
  return raw.split('\n').filter((l) => l !== '').map((l) => JSON.parse(l) as Recorded)
}
