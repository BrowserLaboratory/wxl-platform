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
 * A commit-form case may replace that installed hook with a recording shim
 * (`recordingShim`), and may add a linked worktree under the same temporary
 * directory (`addWorktree`).
 *
 * The first-commit fixture (H27, H28, `buildFirstCommitFixture`) is a new
 * repository at the same kind of path with no commit and no stash entry. It
 * holds the copied scripts, the `node_modules` link, `.gitignore`,
 * `.gitattributes`, `test-chall` (#1) and `platform/public/other.txt`, and no
 * `_redirects`.
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
  existsSync,
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
import { spawn, spawnSync } from 'node:child_process'
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
  /** The commit id of the stash entry made before any case runs; null for the first-commit fixture, which has none. */
  preexisting: string | null
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

/** Run this checkout's hook directly, with `bash` (or the given shell), at the repository's top level. */
export function runHook(repo: Repo, extraEnv: NodeJS.ProcessEnv = {}, bash = 'bash'): Run {
  const r = spawnSync(bash, [HOOK], { cwd: repo.dir, env: { ...repo.env, ...extraEnv }, encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

/** Run a real `git commit`, which runs the installed hook. */
export function commit(repo: Repo, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Run {
  return gitRun(repo, ['commit', ...args], extraEnv)
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

/** A new repository at `<mkdtemp>/暫存 repo` holding the copied scripts, the `node_modules` link and the attributes. */
function initRepo(): Repo {
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
  return repo
}

function installHook(repo: Repo): void {
  const hook = join(repo.dir, '.git/hooks/pre-commit')
  mkdirSync(dirname(hook), { recursive: true })
  writeFileSync(hook, `#!/bin/sh\nexec bash '${HOOK}'\n`)
  chmodSync(hook, 0o755)
}

/** The first-commit fixture (H27, H28): no commit, no stash entry, nothing staged yet, no `_redirects`. */
export function buildFirstCommitFixture(): Fixture {
  const repo = initRepo()
  writeChallenge(repo, 'platform/challenge', 'test-chall', 1, { title: 'Test Challenge' })
  write(repo, 'platform/public/other.txt', 'other\n')
  installHook(repo)
  return { ...repo, preexisting: null }
}

/** Build the fixture once; cases start from a copy (`cloneFixture`). */
export function buildFixture(): Fixture {
  const repo = initRepo()
  const { dir } = repo
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
  installHook(repo)

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

/** The non-empty lines of `s`. */
export function lines(s: string): string[] {
  return s.split('\n').filter((l) => l !== '')
}

export function snapshot(repo: Repo): Snapshot {
  const files = new Map<string, string>()
  walk(repo.dir, '', files)
  return {
    index: lines(git(repo, ['ls-files', '--stage'])),
    files,
    untracked: lines(git(repo, ['status', '--porcelain=v1', '--untracked-files=all'])).filter((l) => l.startsWith('??')),
    stash: stashList(repo),
  }
}

export function stashList(repo: Repo): string[] {
  return lines(git(repo, ['stash', 'list', '--format=%H %gd %gs']))
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

/** A stub's expression for the commit ids `git stash list` gives, newest first. */
const STASH_IDS = `spawnSync('git', ['stash', 'list', '--format=%H'], { encoding: 'utf8' }).stdout.split('\\n').filter((l) => l !== '')`

/**
 * Rename a script the hook calls to `real-<name>` and put a stub at its path
 * that runs `prelude`, then the renamed copy with the same arguments, and
 * exits with its status. The renamed name still ends with the original one, so
 * the copy's own direct-run check passes. `prelude` sees `args`, and the
 * imports `appendFileSync`, `writeFileSync` and `spawnSync`.
 */
function wrapScript(repo: Repo, script: string, prelude: string): void {
  const path = join(repo.dir, 'scripts', script)
  renameSync(path, join(repo.dir, 'scripts', `real-${script}`))
  writeFileSync(path, `import { appendFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const args = process.argv.slice(2)
${prelude}
const real = fileURLToPath(new URL('./real-${script}', import.meta.url))
const r = spawnSync(process.execPath, ['--experimental-strip-types', real, ...args], { stdio: 'inherit' })
process.exit(r.status ?? 1)
`)
}

/**
 * Put a stub at a script the hook calls that appends a JSON line to `log`
 * (outside the repository), then runs the real script (`wrapScript`).
 *
 * `recordStash` also records `git stash list` while the stub runs.
 */
export function recordScript(repo: Repo, script: string, log: string, recordStash = false): void {
  wrapScript(repo, script, `const entry: Record<string, unknown> = { argv: args }
if (${recordStash}) entry.stash = ${STASH_IDS}
appendFileSync(${JSON.stringify(log)}, JSON.stringify(entry) + '\\n')`)
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
  return lines(raw).map((l) => JSON.parse(l) as Recorded)
}

// ─── Commit forms (H32, H34–H38) ────────────────────────────────────────────

/** A path as a physical absolute path, resolved against `cwd`; its last component need not exist. */
export function physicalPath(cwd: string, path: string): string {
  const full = resolve(cwd, path)
  return join(realpathSync(dirname(full)), full.slice(dirname(full).length + 1))
}

export interface Shim {
  /** The copy of the index file git handed the hook, taken before the hook ran. */
  index: string
  /** Each run's `GIT_INDEX_FILE`, as git handed it, or `<unset>`. */
  recorded(): string[]
}

/**
 * Replace the installed `.git/hooks/pre-commit` (which every worktree of the
 * repository shares) with a shim that appends `GIT_INDEX_FILE` to a log under
 * `<base>/索引 記錄/`, copies the file it names there, then runs this
 * checkout's hook with `exec bash`, as the installed hook does. It changes no
 * tracked file. For `-p` and `-i` the copy is the only index that holds the
 * staged snapshot before the hook runs.
 */
export function recordingShim(repo: Repo): Shim {
  const dir = join(repo.base, '索引 記錄')
  mkdirSync(dir, { recursive: true })
  const log = join(dir, 'log')
  const index = join(dir, 'index')
  writeFileSync(join(repo.dir, '.git/hooks/pre-commit'), `#!/bin/sh
printf '%s\\n' "\${GIT_INDEX_FILE-<unset>}" >> ${shQuote(log)}
if [ -n "\${GIT_INDEX_FILE+set}" ]; then cp -- "$GIT_INDEX_FILE" ${shQuote(index)} || exit 1; fi
exec bash ${shQuote(HOOK)}
`)
  return {
    index,
    recorded: () => (existsSync(log) ? lines(readFileSync(log, 'utf8')) : []),
  }
}

/**
 * A linked worktree of the fixture repository at `<base>/連結 worktree`, on a
 * new branch `wt` (without `-b`, git derives the branch name from the path,
 * which is not a valid one). It gets its own `node_modules` link, which the
 * shared `.git/info/exclude` already excludes. It lives under `<base>`, so
 * `removeRepo` removes it with the repository.
 */
export function addWorktree(repo: Repo): Repo {
  const path = join(repo.base, '連結 worktree')
  git(repo, ['worktree', 'add', '-q', '-b', 'wt', path])
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(path, 'node_modules'))
  return { base: repo.base, dir: realpathSync(path), env: repo.env }
}

// ─── Interruption and failure stubs (H25, H26, H46–H49, H52) ────────────────

/** The directory the stubs and the wrapper write their markers into: `<base>/標記 dir/`. */
export function markerDir(repo: Repo): string {
  const dir = join(repo.base, '標記 dir')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Poll for a file against a deadline: a condition, never a fixed sleep. */
export async function waitForFile(path: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path}`)
    await new Promise((r) => setTimeout(r, 20))
  }
}

export interface GroupRun extends Run {
  /** The signal that ended the group's leader, when one did. */
  signal: NodeJS.Signals | null
  /** True when a process of the group was still alive after the deadline and had to be killed. */
  leftover: boolean
}

export interface Group {
  /** Send a signal to every process of the group. */
  kill(signal: NodeJS.Signals): void
  /** Send a signal to the group's leader alone, as `kill <pid>` does. */
  killLeader(signal: NodeJS.Signals): void
  /** Wait for the leader's exit, then for the whole group to be gone; kill whatever is left. */
  done(): Promise<GroupRun>
}

function groupAlive(pgid: number): boolean {
  try {
    process.kill(-pgid, 0)
    return true
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw e
  }
}

/** The groups `startGroup` started that may still be alive. */
const groups = new Set<number>()

/**
 * Kill every group `startGroup` started that is still alive, for a file's
 * `afterEach`: a case that failed before its `done()` would otherwise leave a
 * blocked stub or wrapper running.
 */
export function killStrayGroups(): void {
  for (const pgid of groups) {
    if (groupAlive(pgid)) process.kill(-pgid, 'SIGKILL')
  }
  groups.clear()
}

/**
 * Start a command at the repository's top level as the leader of a new
 * process group (`detached`), so a signal can go to the hook and every
 * process it started, as a terminal's Ctrl-C does.
 */
export function startGroup(repo: Repo, command: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Group {
  const child = spawn(command, args, { cwd: repo.dir, env: { ...repo.env, ...extraEnv }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const pgid = child.pid
  if (pgid === undefined) throw new Error(`could not start ${command}`)
  groups.add(pgid)
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (d: string) => { stdout += d })
  child.stderr.setEncoding('utf8').on('data', (d: string) => { stderr += d })
  const closed = new Promise<{ status: number | null; signal: NodeJS.Signals | null }>((res) => {
    child.on('close', (status, signal) => res({ status, signal }))
  })
  return {
    kill: (signal) => process.kill(-pgid, signal),
    killLeader: (signal) => process.kill(pgid, signal),
    async done() {
      let leftover = false
      try {
        const { status, signal } = await closed
        const deadline = Date.now() + 30_000
        while (groupAlive(pgid)) {
          if (Date.now() > deadline) {
            leftover = true
            break
          }
          await new Promise((r) => setTimeout(r, 20))
        }
        return { status, signal, stdout, stderr, leftover }
      } finally {
        // Cleanup only: a group still alive here was reported as leftover above.
        if (groupAlive(pgid)) process.kill(-pgid, 'SIGKILL')
        groups.delete(pgid)
      }
    },
  }
}

export interface BlockingOptions {
  /** Where the stub writes its marker once it blocks. */
  marker: string
  /** A JSON file where the stub records `git stash list` ids and `GIT_INDEX_FILE` before blocking. */
  record?: string
  /** Remove the file `GIT_INDEX_FILE` names before writing the marker. */
  removeIndexFile?: boolean
}

export interface BlockingRecord {
  stash: string[]
  indexFile: string | null
}

/**
 * Replace the fixture's generator with a stub that writes a marker and blocks
 * (`setInterval`). node dies of SIGINT, SIGTERM and SIGHUP by default.
 */
export function blockingGenerator(repo: Repo, options: BlockingOptions): void {
  writeFileSync(join(repo.dir, 'scripts/generate-redirects.ts'), `import { rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const options = ${JSON.stringify(options)}
const indexFile = process.env.GIT_INDEX_FILE ?? null
if (options.record) writeFileSync(options.record, JSON.stringify({ stash: ${STASH_IDS}, indexFile }))
if (options.removeIndexFile && indexFile) rmSync(indexFile)
writeFileSync(options.marker, '')
setInterval(() => {}, 1000)
`)
}

export function readBlockingRecord(path: string): BlockingRecord {
  return JSON.parse(readFileSync(path, 'utf8')) as BlockingRecord
}

/**
 * Put a stub at the fixture's generator that creates `<gitdir>/index.lock`,
 * then runs the real generator (`wrapScript`) (H26).
 */
export function lockingGenerator(repo: Repo): void {
  wrapScript(repo, 'generate-redirects.ts', `writeFileSync(${JSON.stringify(join(repo.dir, '.git/index.lock'))}, '')`)
}

export type WrapperMode =
  /** Exit 128 without running git. */
  | 'fail'
  /** Run git, then exit 1 whatever it returned. */
  | 'run-then-fail'
  /** Write the `blocked` marker, wait for the `release` file, then run git. Dies with a signal. */
  | 'block'
  /** As `block`, but ignoring INT, TERM and HUP itself (`trap '' INT TERM HUP`). */
  | 'block-ignoring'
  /** Run git, then write the `blocked` marker, wait for the `release` file and exit with git's status. Dies with a signal. */
  | 'run-then-block'
  /** Remove the file `GIT_INDEX_FILE` names, as git does with its `index.lock` when an interrupted commit ends, then run git. */
  | 'remove-index-then-run'

export interface Wrapper {
  /** The environment that puts the wrapper first on `PATH`. */
  env: NodeJS.ProcessEnv
  /** Written once the wrapper blocks. */
  blocked: string
  /** Let a blocked wrapper go on. */
  release(): void
  /** True once the wrapper matched an invocation. */
  matched(): boolean
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * A `git` on `PATH` (`<base>/bin 工具/git`) that runs the real git, resolved
 * once by absolute path, and acts on the first invocation whose arguments,
 * joined with spaces, equal `args` (or start with it, with `prefix`). Every
 * other invocation runs git unchanged.
 */
export function gitWrapper(repo: Repo, args: string, mode: WrapperMode, prefix = false): Wrapper {
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { env: repo.env, encoding: 'utf8' }).stdout.trim()
  if (!realGit.startsWith('/')) throw new Error(`git not found: ${realGit}`)
  const bin = join(repo.base, 'bin 工具')
  const dir = join(repo.base, 'wrapper 標記')
  mkdirSync(bin, { recursive: true })
  mkdirSync(dir, { recursive: true })
  const test = prefix ? `case "$*" in ${shQuote(args)}*) true ;; *) false ;; esac` : `[ "$*" = ${shQuote(args)} ]`
  const wait = `: > ${shQuote(join(dir, 'blocked'))}
  while [ ! -e ${shQuote(join(dir, 'release'))} ]; do sleep 0.05; done`
  const block = `${wait}
  exec ${shQuote(realGit)} "$@"`
  const action = {
    fail: 'exit 128',
    'run-then-fail': `${shQuote(realGit)} "$@"\n  exit 1`,
    block,
    'block-ignoring': `trap '' INT TERM HUP\n  ${block}`,
    'run-then-block': `status=0\n  ${shQuote(realGit)} "$@" || status=$?\n  ${wait}\n  exit "$status"`,
    'remove-index-then-run': 'rm -f -- "$GIT_INDEX_FILE"',
  }[mode]
  writeFileSync(join(bin, 'git'), `#!/bin/sh
if ${test} && mkdir ${shQuote(join(dir, 'matched'))} 2>/dev/null; then
  ${action}
fi
exec ${shQuote(realGit)} "$@"
`)
  chmodSync(join(bin, 'git'), 0o755)
  return {
    env: { PATH: `${bin}:${repo.env.PATH ?? ''}` },
    blocked: join(dir, 'blocked'),
    release: () => writeFileSync(join(dir, 'release'), ''),
    matched: () => existsSync(join(dir, 'matched')),
  }
}

export interface ChildBlocker {
  /** The environment that sets `GIT_EXEC_PATH`. */
  env: NodeJS.ProcessEnv
  /** Written once git's child command blocks. */
  blocked: string
  /** True once the blocker matched a child command. */
  matched(): boolean
}

/**
 * Block one of the commands git runs itself. git runs its own child commands
 * from `GIT_EXEC_PATH` (`git stash push` with a pathspec stores its entry, then
 * runs `git add`, `git diff-index`, `git apply --index -R` and
 * `git checkout --no-overlay`), so a `git` on `PATH` never sees them. The
 * directory `<base>/exec 工具/` links every entry of the real exec path except
 * `git`, a script that runs the real one. The first child command whose
 * arguments, joined with spaces, start with `args` writes the `blocked` marker
 * and becomes `sleep`, which a signal ends. A shell loop could outlive the
 * signal: a shell that receives SIGINT while reaping a child that exited
 * normally may carry on, and then keep the group's output open. With `fail`,
 * that child command writes the marker and exits 1 instead, as a git failure
 * that no signal causes: `git commit -a` then still holds its `index.lock`
 * when the hook ends.
 */
export function gitChildBlocker(repo: Repo, args: string, mode: 'block' | 'fail' = 'block'): ChildBlocker {
  const execPath = spawnSync('git', ['--exec-path'], { env: repo.env, encoding: 'utf8' }).stdout.trim()
  if (!execPath.startsWith('/')) throw new Error(`no git exec path: ${execPath}`)
  const realGit = existsSync(join(execPath, 'git'))
    ? join(execPath, 'git')
    : spawnSync('sh', ['-c', 'command -v git'], { env: repo.env, encoding: 'utf8' }).stdout.trim()
  const dir = join(repo.base, 'exec 工具')
  const marks = join(repo.base, 'exec 標記')
  mkdirSync(dir, { recursive: true })
  mkdirSync(marks, { recursive: true })
  for (const entry of readdirSync(execPath)) {
    if (entry !== 'git') symlinkSync(join(execPath, entry), join(dir, entry))
  }
  writeFileSync(join(dir, 'git'), `#!/bin/sh
case "$*" in
  ${shQuote(args)}*)
    if mkdir ${shQuote(join(marks, 'matched'))} 2>/dev/null; then
      : > ${shQuote(join(marks, 'blocked'))}
      ${mode === 'fail' ? 'exit 1' : 'exec sleep 3600'}
    fi ;;
esac
exec ${shQuote(realGit)} "$@"
`)
  chmodSync(join(dir, 'git'), 0o755)
  return {
    env: { GIT_EXEC_PATH: dir },
    blocked: join(marks, 'blocked'),
    matched: () => existsSync(join(marks, 'matched')),
  }
}
