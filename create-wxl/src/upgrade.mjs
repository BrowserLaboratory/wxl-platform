// The upgrade path (0006-S1, traceability.md "Step order"): `run.mjs` dispatches here once
// `parseArgvStrict` reports `mode === 'upgrade'` (Command grammar). Step 7 ends by building both
// pristine ranges (base, then target); step 8 plans the merge (merge-plan.mjs), step 9 applies
// it (merge-apply.mjs), and step 10 removes the run's temporary directories and prints the
// report (upgrade-report.mjs).

import { join, resolve as resolvePath } from 'node:path'
import { buildGitEnv } from './git-env.mjs'
import { SignalAbort } from './signals.mjs'
import { planMerge, MergeFileError, PlanningError } from './merge-plan.mjs'
import { applyMerge } from './merge-apply.mjs'
import { buildReport } from './upgrade-report.mjs'
import { COMMIT_RE, VERSION_RE } from './patterns.mjs'
import { parseGitVersion, isGitVersionOk, MINIMUM_GIT_VERSION } from './git-version.mjs'
import { downloadArchive, readArchiveEntries, makeTmpDir, extractInto, applyPristine, removeTmpDir } from './run-shared.mjs'
import { isAtLeast } from './numeric-version.mjs'
import { MINIMUM_BASE_VERSION } from './base-version.mjs'

/** `version`'s numeric parts (always `X.Y.Z` here: either `VERSION_RE`-checked already, or a
 * literal like `deps.source.version`), for `isAtLeast`'s own comparison (S-11). */
function versionParts(version) {
  return version.split('.').map(Number)
}

/** Strictly greater, not `isAtLeast`'s own ">=": `a` is at least `b` AND `b` is not at least `a`. */
function isHigherVersion(a, b) {
  const partsA = versionParts(a)
  const partsB = versionParts(b)
  return isAtLeast(partsA, partsB) && !isAtLeast(partsB, partsA)
}

/** `\` is Windows' own path separator; `git rev-parse --show-toplevel`'s own output always uses
 * `/`, so comparing after turning `\` into `/` on both sides (traceability.md "Step order" row 3)
 * makes the comparison platform-neutral. */
function toSlash(value) {
  return value.replace(/\\/g, '/')
}

/** `git rev-parse`'s own stdout ends with exactly one trailing newline (amendment 3, 2026-11-07);
 * trimmed before use, including before `realpath`. */
function trimTrailingNewline(value) {
  return value.replace(/\r?\n$/, '')
}

/** `git rev-parse --git-dir`'s own stdout is a path, often relative to `deps.cwd` ("the stdout of
 * ... --git-dir ... is resolved against deps.cwd", amendment 3). */
function parseGitDirStdout(deps, stdout) {
  return resolvePath(deps.cwd, trimTrailingNewline(stdout))
}

/** `git ls-files -v`'s own tag letter (traceability.md "Step order" row 4): any lowercase letter
 * means assume-unchanged, `S` means skip-worktree. */
function lsFilesTag(line) {
  return line[0]
}

// D7 (candidate 15, stage 7): `sequencer/` holds a multi-commit cherry-pick or revert's own
// to-do list in progress; a mid-sequence commit removes `CHERRY_PICK_HEAD`/`REVERT_HEAD` without
// finishing the operation, so this marker is needed in addition to those two.
const IN_PROGRESS_MARKERS = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG', 'rebase-merge', 'rebase-apply', 'sequencer']

/** D6: a non-zero OR `null` exit (killed by a signal) from any of
 * step 4's three git commands is never treated as "no output, therefore clean" -- it stops the
 * run with CW-E14 naming the command and the stderr git reported, through the same bug/signal
 * catch `runUpgrade` already has (fail closed). */
function requireGitSuccess(command, result) {
  if (result.code !== 0) {
    throw new Error(`git ${command} failed (exit code ${result.code}): ${result.stderr}`)
  }
}

/** D19 (traceability.md revision 3.1; T-0061): runs one git command of steps 4 and 5 and, when
 * `runGit` rejects (not an exit code -- the spawn itself failed), rethrows it as a bug whose
 * message names the command, so CW-E14 says which git command failed. A signal already received,
 * or a `SignalAbort`, passes through unchanged so the run still exits 130. */
async function runGitNamed(deps, guard, args, opts, name) {
  try {
    return await deps.runGit(args, opts)
  } catch (err) {
    if (err instanceof SignalAbort) throw err
    if (guard.raised()) throw new SignalAbort(guard.raised())
    throw new Error(`git ${name} failed: ${err?.message ?? String(err)}`)
  }
}

/** J1 (`lstat`: absent, or a regular file) then J3 (parses as JSON,
 * and is an object) for `range.json` at `deps.cwd` -- the shape increment 13's `--from` branch and
 * increment 14's no-`--from` branch both need. Returns `{ absent: true }` when there is no
 * `range.json`, `{ token }` for a J1/J3 failure (`not-a-file`/`not-json`/`not-object`), or
 * `{ value }` with the parsed object otherwise. */
async function readRangeJson(deps) {
  let rangeJsonStat
  try {
    rangeJsonStat = await deps.fs.lstat(join(deps.cwd, 'range.json'))
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
    return { absent: true }
  }
  if (!rangeJsonStat.isFile()) return { token: 'not-a-file' }
  const raw = await deps.fs.readFile(join(deps.cwd, 'range.json'), 'utf8')
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return { token: 'not-json' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { token: 'not-object' }
  return { value }
}

/** D3 (inc 19): removes every directory in `tmpDirs` by its own path -- idempotent (`removeTmpDir`
 * uses `force: true`), so calling it again on a directory a shared function's own cleanup already
 * removed is harmless. Used at every early return in step 7 after the first `makeTmpDir`, so an
 * earlier, already-built range is never left behind when a later one fails. */
async function cleanupTmpDirs(deps, tmpDirs) {
  for (const dir of tmpDirs) {
    try {
      await removeTmpDir(deps, dir)
    } catch {
      // F14 (stage 6 disposition): one directory's own `rm` failure must not stop the rest of
      // this list from being removed, and must never replace the exit code the run was already
      // going to return with a rejection of its own.
    }
  }
}

async function runUpgradeBody(parsed, io, deps, t2, lang2, guard, { hasOverride, overrideRaw }, tmpDirs) {
  const gitEnv = buildGitEnv(deps.env)

  // F02/A2 (stage 6 disposition): every step 3-7 opens with the same `checkpoint`/`throwIfRaised`
  // pair 0005's own steps use (run.mjs:203,217-218,...), so a signal during any of them is never
  // silently absorbed into an unrelated exit code -- the existing `checkpoint('step-8')` after
  // step 7 (below) is unchanged, marking the start of step 8 (T-0027's).
  deps.checkpoint('step-3')
  guard.throwIfRaised()

  // Step 3 (traceability.md "Step order" row 3): `git --version` must report 2.20 or later
  // before anything else -- a rejection (git cannot be spawned, U04(1)) and an unparsable or too
  // old a version (U04(2)) are reported the same way; `undefined` is passed to the message when
  // there is no version string to show.
  let versionStdout
  try {
    ;({ stdout: versionStdout } = await deps.runGit(['--version'], { cwd: deps.cwd, env: gitEnv }))
  } catch {
    versionStdout = undefined
  }
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  const parsedVersion = versionStdout === undefined ? null : parseGitVersion(versionStdout)
  if (!isGitVersionOk(parsedVersion, MINIMUM_GIT_VERSION)) {
    io.stderr.write(t2['UP-E02']({ version: parsedVersion ? parsedVersion.join('.') : undefined }) + '\n')
    return 1
  }

  // Git tells a work tree from a non-work-tree, then its own (possibly symlink-resolved) top
  // level is compared with `deps.cwd`, both through `realpath` so a range reached through a
  // symbolic link to its root is still accepted (U03).
  const toplevel = await deps.runGit(['rev-parse', '--show-toplevel'], {
    cwd: deps.cwd,
    env: gitEnv,
  })
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  if (toplevel.code !== 0) {
    io.stderr.write(t2['UP-E01']({ path: deps.cwd }) + '\n')
    return 1
  }
  const [realTop, realCwd] = await Promise.all([
    deps.fs.realpath(trimTrailingNewline(toplevel.stdout)),
    deps.fs.realpath(deps.cwd),
  ])
  if (toSlash(realTop) !== toSlash(realCwd)) {
    io.stderr.write(t2['UP-E01']({ path: deps.cwd }) + '\n')
    return 1
  }

  deps.checkpoint('step-4')
  guard.throwIfRaised()

  // Step 4 (traceability.md "Step order" row 4): a clean repository, checked in this order so a
  // missing HEAD (no-head) is never misreported through the other checks' own behaviour on a
  // headless repository.
  const headCheck = await deps.runGit(['rev-parse', '--verify', 'HEAD'], { cwd: deps.cwd, env: gitEnv })
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  if (headCheck.code !== 0) {
    io.stderr.write(t2['UP-E03']({ reason: 'no-head' }) + '\n')
    return 1
  }
  const statusResult = await deps.runGit(
    ['--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'],
    { cwd: deps.cwd, env: gitEnv },
  )
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  requireGitSuccess('status', statusResult)
  if (statusResult.stdout !== '') {
    io.stderr.write(t2['UP-E03']({ reason: 'changes' }) + '\n')
    return 1
  }
  const lsFilesResult = await deps.runGit(['ls-files', '-v'], { cwd: deps.cwd, env: gitEnv })
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  requireGitSuccess('ls-files -v', lsFilesResult)
  for (const line of lsFilesResult.stdout.split('\n')) {
    if (line === '') continue
    const tag = lsFilesTag(line)
    if (/^[a-z]$/.test(tag)) {
      io.stderr.write(t2['UP-E03']({ reason: 'assume-unchanged' }) + '\n')
      return 1
    }
    if (tag === 'S') {
      io.stderr.write(t2['UP-E03']({ reason: 'skip-worktree' }) + '\n')
      return 1
    }
  }
  const gitDirResult = await deps.runGit(['rev-parse', '--git-dir'], { cwd: deps.cwd, env: gitEnv })
  guard.throwIfRaised() // candidate 13 (stage 7): a signal already received wins over interpreting this result
  requireGitSuccess('rev-parse --git-dir', gitDirResult)
  const gitDir = parseGitDirStdout(deps, gitDirResult.stdout)
  for (const marker of IN_PROGRESS_MARKERS) {
    try {
      await deps.fs.lstat(join(gitDir, marker))
    } catch (err) {
      // Candidate 03/14 (stage 7): only "absent" means not in progress; any other lstat error
      // (e.g. EACCES) is a bug, not evidence of a clean range -- fail closed, like D6.
      if (err?.code === 'ENOENT') continue
      throw err
    }
    io.stderr.write(t2['UP-E03']({ reason: 'in-progress' }) + '\n')
    return 1
  }

  deps.checkpoint('step-5')
  guard.throwIfRaised()

  // Step 5 (bare, inc 6; U08, inc 12; U09, inc 13): `--from <commit>` names the base commit
  // directly; `--from <version>` sets only `baseVersion`, leaving `baseCommit` unknown until step
  // 7's download resolves the tag; either way `range.json`'s own commit/version is never read
  // (U08) -- but when `--from` is given AND `range.json` is present, it still has to pass J1
  // (`lstat`: absent, or a regular file) and J3 (parses as JSON, and is an object); J2, J4 and J5
  // do not apply with `--from` (U09). Absent `--from`, read the base from `range.json`. J2 (inc
  // 11): an absent `range.json` without `--from` is UP-E04, not a bug. Full J1/J3/J4 validation
  // of the no-`--from` path (U10) is the `else` branch below.
  let baseCommit
  let baseVersion
  // D11 (T-0061): a base read from `range.json` must be a release -- it is downloaded through
  // upstream's own tag (step 7, J6); a `--from` base is not checked against a tag (D17).
  const baseFromRecord = parsed.from === undefined
  if (parsed.from !== undefined) {
    const rangeJsonResult = await readRangeJson(deps)
    if (rangeJsonResult.token !== undefined) {
      io.stderr.write(t2['UP-E06']({ reason: rangeJsonResult.token }) + '\n')
      return 1
    }
    if (COMMIT_RE.test(parsed.from)) {
      baseCommit = parsed.from
    } else {
      baseVersion = parsed.from
    }
  } else {
    const rangeJsonResult = await readRangeJson(deps)
    if (rangeJsonResult.absent) {
      io.stderr.write(t2['UP-E04']() + '\n')
      return 1
    }
    if (rangeJsonResult.token !== undefined) {
      io.stderr.write(t2['UP-E06']({ reason: rangeJsonResult.token }) + '\n')
      return 1
    }
    // J4 (inc 14): `upstream` must be a non-null, non-array object with a string `repository`, a
    // `version` matching `VERSION_RE` and a `commit` matching `COMMIT_RE` -- the first broken
    // field is reported, in that order (traceability.md "Base from range.json" J4).
    const { upstream } = rangeJsonResult.value
    let j4Token
    if (upstream === null || typeof upstream !== 'object' || Array.isArray(upstream)) {
      j4Token = 'upstream'
    } else if (typeof upstream.repository !== 'string') {
      j4Token = 'upstream.repository'
    } else if (typeof upstream.version !== 'string' || !VERSION_RE.test(upstream.version)) {
      j4Token = 'upstream.version'
    } else if (typeof upstream.commit !== 'string' || !COMMIT_RE.test(upstream.commit)) {
      j4Token = 'upstream.commit'
    }
    if (j4Token !== undefined) {
      io.stderr.write(t2['UP-E06']({ reason: j4Token }) + '\n')
      return 1
    }
    // J5 (inc 15): the repositories are compared after mapping only ASCII `[A-Z]` to lowercase,
    // not a case-sensitive `!==` (U11(b) pins this).
    const foldAsciiCase = (value) => value.replace(/[A-Z]/g, (c) => c.toLowerCase())
    if (foldAsciiCase(upstream.repository) !== foldAsciiCase(deps.source.repository)) {
      io.stderr.write(t2['UP-E05']({ rangeRepository: upstream.repository, sourceRepository: deps.source.repository }) + '\n')
      return 1
    }
    baseCommit = upstream.commit
    baseVersion = upstream.version
  }

  // D15 (OQ-026; T-0061): with or without `--from`, after J1-J5 and before step 6, a `range.json`
  // that is not tracked and that the range's rules ignore is refused -- step 9 would write it, and
  // the restore commands could neither restore nor remove an ignored, untracked file. The path is
  // given as `./range.json` so both commands read it literally. `check-ignore` exits 0 (ignored)
  // or 1 (not ignored); any other result of either command is CW-E14 naming it (D19).
  const recordTracked = await runGitNamed(deps, guard, ['ls-files', '-z', '--', './range.json'], { cwd: deps.cwd, env: gitEnv }, 'ls-files')
  guard.throwIfRaised()
  requireGitSuccess('ls-files', recordTracked)
  if (recordTracked.stdout === '') {
    const recordIgnored = await runGitNamed(
      deps,
      guard,
      ['check-ignore', '-q', '--no-index', '--', './range.json'],
      { cwd: deps.cwd, env: gitEnv },
      'check-ignore',
    )
    guard.throwIfRaised()
    if (recordIgnored.code === 0) {
      io.stderr.write(t2['UP-E13']() + '\n')
      return 1
    }
    if (recordIgnored.code !== 1) {
      throw new Error(`git check-ignore failed (exit code ${recordIgnored.code}): ${recordIgnored.stderr}`)
    }
  }

  // Step 6: gathers the checks written by increments 6 (commit
  // equal), 17 (U50's floor), 16 (U13's downgrade) and 18 (U14's equal-version no-op) into one
  // function, callable again in step 7 once the base's version/commit are actually known
  // (amendment 2, U51/U52). Prints and returns an exit code, or `null` to go on. Amendment 6:
  // UP-I01 always carries the base's own version and commit.
  function checkBaseAgainstTarget({ baseCommit, baseVersion }) {
    if (baseCommit === targetCommit) {
      io.stdout.write(t2['UP-I01']({ version: baseVersion ?? deps.source.version, commit: baseCommit }) + '\n')
      return 0
    }
    if (baseVersion !== undefined && !isAtLeast(versionParts(baseVersion), MINIMUM_BASE_VERSION)) {
      io.stderr.write(t2['UP-E10']({ version: baseVersion }) + '\n')
      return 1
    }
    if (baseVersion !== undefined && isHigherVersion(baseVersion, deps.source.version)) {
      io.stderr.write(t2['UP-E07']({ baseVersion, targetVersion: deps.source.version }) + '\n')
      return 1
    }
    // U14 (inc 18): equal versions, a known different commit, and no override is also a no-op --
    // this does not apply to a version-form `--from` base, whose commit is unknown until step 7
    // resolves its tag (Q4).
    if (baseCommit !== undefined && baseVersion === deps.source.version && !hasOverride) {
      io.stdout.write(t2['UP-I01']({ version: baseVersion, commit: baseCommit }) + '\n')
      return 0
    }
    return null
  }

  deps.checkpoint('step-6')
  guard.throwIfRaised()

  // The target commit is resolved -- the override, when given, prints CW-W04 once, before any of
  // the checks above run.
  const targetCommit = hasOverride ? overrideRaw : deps.source.commit
  if (hasOverride) {
    io.stderr.write(t2['CW-W04']({ commit: overrideRaw }) + '\n')
  }
  const preDownloadResult = checkBaseAgainstTarget({ baseCommit, baseVersion })
  if (preDownloadResult !== null) return preDownloadResult

  deps.checkpoint('step-7')
  guard.throwIfRaised()

  // Step 7 (bare, inc 10; U08, inc 12; U14, inc 18): download the base -- by commit, or for a
  // version-form base, from its tag -- then the target (traceability.md "Step order" row 7);
  // validate both, then build each into its own pristine range under `deps.tmpRoot` (`run-shared.mjs`'s
  // shared functions), base fully before target. The tag-mode comment rule (U16, below) and
  // repeating step 6's checks with the now-known base version/commit (amendment 2, U51/U52,
  // below) both apply here; a null/failing result here returns 1 after the shared function's own
  // message and own cleanup.
  const baseRef = baseFromRecord ? `refs/tags/v${baseVersion}` : (baseCommit ?? `refs/tags/v${baseVersion}`)
  const baseDownload = await downloadArchive({
    io,
    deps,
    t2,
    guard,
    repository: deps.source.repository,
    ref: baseRef,
    // D18: a 404 on the tag download of a base read from range.json carries the remedies.
    remediesOn404: baseFromRecord,
  })
  if (!baseDownload) return 1
  const targetDownload = await downloadArchive({ io, deps, t2, guard, repository: deps.source.repository, ref: targetCommit })
  if (!targetDownload) return 1

  // U16 (inc 20): a version-form `--from` base has no known commit yet; its download is a tag
  // (`refs/tags/v<version>`), so rule 2 is replaced by "the comment is 40 lowercase hex" (and the
  // resolved comment becomes the commit rule 2 compares the REST of the archive's own path
  // prefix against) -- `readArchiveEntries`'s own `tag` parameter.
  const baseTag = baseFromRecord || baseCommit === undefined ? `v${baseVersion}` : undefined
  const baseResult = await readArchiveEntries({
    io,
    t2,
    body: baseDownload.body,
    commit: baseCommit,
    tag: baseTag,
    // J6 (D11): the tag's own comment must equal the commit range.json records.
    expectedCommit: baseFromRecord ? baseCommit : undefined,
    version: baseVersion,
  })
  if (!baseResult) return 1
  // U52 (inc 22): in tag mode `baseResult` is `{ entries, commit }` -- the base commit a
  // version-form `--from` base never names on its own, now known from the tag's own pax comment.
  const baseEntries = baseTag === undefined ? baseResult : baseResult.entries
  if (baseTag !== undefined) baseCommit = baseResult.commit
  const targetEntries = await readArchiveEntries({ io, t2, body: targetDownload.body, commit: targetCommit })
  if (!targetEntries) return 1

  // Amendment 2 (2026-11-07), inc 21: once both archives are validated, repeat step 6's checks
  // with the base's now-known version/commit, before any directory is created. A commit-form
  // `--from` base has no known version until now; it comes from the base archive's own
  // `package.json`, read before P3. Decision (3): an absent entry, unparsable JSON, or a version
  // not matching `VERSION_RE` is UP-E10 naming the raw value found.
  if (baseVersion === undefined) {
    const packageEntry = baseEntries.find((entry) => entry.rest === 'package.json' && entry.kind === 'file')
    let rawVersion
    if (packageEntry !== undefined) {
      try {
        ;({ version: rawVersion } = JSON.parse(packageEntry.content.toString('utf8')))
      } catch {
        rawVersion = undefined
      }
    }
    if (rawVersion === undefined || typeof rawVersion !== 'string' || !VERSION_RE.test(rawVersion)) {
      io.stderr.write(t2['UP-E10']({ version: rawVersion }) + '\n')
      return 1
    }
    baseVersion = rawVersion
  }
  const postDownloadResult = checkBaseAgainstTarget({ baseCommit, baseVersion })
  if (postDownloadResult !== null) return postDownloadResult

  // D3 (inc 19): `tmpDirs` (owned by `runUpgrade`, below) is pushed to as soon as each
  // `makeTmpDir` succeeds; every early return below it removes every directory already in the
  // list -- `extractInto`/`applyPristine`'s own cleanup already removed the ONE directory THEY
  // were given, but an earlier, already-fully-built range needs this to be removed too.
  const baseTmpDir = await makeTmpDir({ io, deps, t2, parent: deps.tmpRoot, prefix: 'create-wxl-upgrade-' })
  if (!baseTmpDir) return 1
  tmpDirs.push(baseTmpDir)
  if (!(await extractInto({ io, deps, t2, guard, entries: baseEntries, tmpDir: baseTmpDir }))) {
    await cleanupTmpDirs(deps, tmpDirs)
    return 1
  }
  if (
    !(await applyPristine({
      io,
      deps,
      t2,
      guard,
      tmpDir: baseTmpDir,
      record: { repository: deps.source.repository, version: baseVersion, commit: baseCommit },
    }))
  ) {
    await cleanupTmpDirs(deps, tmpDirs)
    return 1
  }

  const targetTmpDir = await makeTmpDir({ io, deps, t2, parent: deps.tmpRoot, prefix: 'create-wxl-upgrade-' })
  if (!targetTmpDir) {
    await cleanupTmpDirs(deps, tmpDirs)
    return 1
  }
  tmpDirs.push(targetTmpDir)
  if (!(await extractInto({ io, deps, t2, guard, entries: targetEntries, tmpDir: targetTmpDir }))) {
    await cleanupTmpDirs(deps, tmpDirs)
    return 1
  }
  if (
    !(await applyPristine({
      io,
      deps,
      t2,
      guard,
      tmpDir: targetTmpDir,
      record: { repository: deps.source.repository, version: deps.source.version, commit: targetCommit },
    }))
  ) {
    await cleanupTmpDirs(deps, tmpDirs)
    return 1
  }

  // Decision (4) (ticket Comments, 2026-11-09) no longer falls through to
  // CW-E14 as of T-0027 increment 1: both pristine ranges exist, so step 8 plans the merge against
  // them (merge-plan.mjs), step 9 applies the plan (merge-apply.mjs), and only then (step 10) are
  // the temporary directories -- including the merge-inputs one merge-plan.mjs may have created
  // lazily -- removed and the report printed.
  deps.checkpoint('step-8')
  guard.throwIfRaised()
  let planResult
  try {
    planResult = await planMerge({
      deps,
      guard,
      rangeRoot: deps.cwd,
      baseDir: baseTmpDir,
      targetDir: targetTmpDir,
      baseVersion,
      targetVersion: deps.source.version,
    })
  } catch (err) {
    // `planMerge`'s own catch attaches the merge-inputs directory (if one
    // was created) to ANY error it rethrows -- a `MergeFileError`, a signal, a read error, or a
    // `runGit` rejection -- so it is removed here before the error is handled further, the same
    // way every other early exit's temporary directories are.
    if (err?.mergeDir !== undefined) tmpDirs.push(err.mergeDir)
    // T-0027 increment 18 (U57): `git merge-file` exited outside 0-127 -- planning failed, so
    // nothing from step 9 ever runs; UP-E11 names the path.
    // `PlanningError` is the same planning failure, with the underlying error's own text
    // (`err.detail`) added -- a read error of o/b/t, or a `runGit` rejection for `merge-file`.
    if (err instanceof MergeFileError || err instanceof PlanningError) {
      io.stderr.write(t2['UP-E11']({ path: err.path, detail: err.detail }) + '\n')
      await cleanupTmpDirs(deps, tmpDirs)
      return 1
    }
    throw err
  }
  if (planResult.mergeDir !== undefined) tmpDirs.push(planResult.mergeDir)

  deps.checkpoint('step-9')
  guard.throwIfRaised()
  const applyResult = await applyMerge({
    deps,
    guard,
    rangeRoot: deps.cwd,
    ops: planResult.ops,
    upstream: { repository: deps.source.repository, version: deps.source.version, commit: targetCommit },
  })
  if (!applyResult.ok) {
    io.stderr.write(
      t2['UP-E09'](
        applyResult.signal !== undefined ? { signal: applyResult.signal } : { path: applyResult.path, detail: applyResult.detail },
      ) + '\n',
    )
    await cleanupTmpDirs(deps, tmpDirs)
    return applyResult.signal !== undefined ? 130 : 1
  }

  // D8 (traceability.md "Step order"): unlike every earlier checkpoint, `step-10` does not pair with
  // an immediate `guard.throwIfRaised()` -- a signal here still lets the report print in full
  // first; only once it is on stdout does a raised signal turn this run's exit code into 130.
  deps.checkpoint('step-10')
  await cleanupTmpDirs(deps, tmpDirs)

  // T-0027 increment 21 (U26), traceability.md "Report" R4: "for a range with
  // .github/workflows/deploy.yml" -- read AFTER apply (step 9), so the advice reflects the
  // range's own state once this run is done, not its state before it started. Unlike the parent
  // check's and `existingMode`'s own `lstat` (merge-plan.mjs, merge-apply.mjs), which are
  // fail-closed, this one stays fail-open ON PURPOSE -- R4's own advice is best-effort, so ANY
  // `lstat` error here (not only `ENOENT`) is read as "no deploy.yml", never stopping a run
  // that has already fully applied the plan.
  let hasDeployWorkflow = false
  try {
    const deployStat = await deps.fs.lstat(join(deps.cwd, '.github', 'workflows', 'deploy.yml'))
    hasDeployWorkflow = deployStat.isFile()
  } catch {
    hasDeployWorkflow = false
  }

  io.stdout.write(
    buildReport({
      lang2,
      toolVersion: deps.packageVersion,
      baseVersion,
      baseCommit,
      targetVersion: deps.source.version,
      targetCommit,
      ops: planResult.ops,
      attention: planResult.attention,
      hasDeployWorkflow,
      t2,
    }),
  )
  guard.throwIfRaised()
  return 0
}

/** Mirrors `runSteps`' own catch (run.mjs): a `SignalAbort` or any other error (a bug, printed as
 * CW-E14) removes every temporary directory this run created (D3, inc 19) before returning. */
export async function runUpgrade(parsed, io, deps, t2, lang2, guard, overrideInfo) {
  const tmpDirs = []
  try {
    return await runUpgradeBody(parsed, io, deps, t2, lang2, guard, overrideInfo, tmpDirs)
  } catch (err) {
    await cleanupTmpDirs(deps, tmpDirs)
    if (err instanceof SignalAbort) return 130
    io.stderr.write(t2['CW-E14']({ message: err?.message ?? String(err) }) + '\n')
    return 1
  }
}
