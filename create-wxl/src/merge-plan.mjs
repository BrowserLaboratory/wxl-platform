// Step 8 (traceability.md "Step order" row 8, "Pre-checks", "Merge table"): for every path in
// B ∪ T ∪ tracked, decides what happens to `o` by the pre-checks and the merge table, and (for an
// M12 path) shells out to the real `git merge-file`. Nothing is written here -- `merge-apply.mjs`
// executes the plan this module returns. b and t are present only when their exact path is among
// the names the pristine range lists, so a case-insensitive file system cannot merge two paths (U53).

import { join } from 'node:path'
import { buildGitEnv } from './git-env.mjs'
import { runGitNamed } from './git-named.mjs'

/** M12 (traceability.md: "Any other exit, a signal, or output not read in full -> UP-E11"):
 * `git merge-file` ended outside the `0`-`127` range it can legitimately exit with (a clean merge
 * is `0`, a conflict is `1`-`127`; anything else, including `null` for a signal, is a planning
 * failure, not a result to write). `path` is the one `upgrade.mjs` reports. */
export class MergeFileError extends Error {
  constructor(path) {
    super(`git merge-file exited outside 0-127 at ${path}`)
    this.name = 'MergeFileError'
    this.path = path
  }
}

/** traceability.md "Codes" UP-E11: "a read error, or `git merge-file` ... or was not read in
 * full"): a read error of `o`, `b` or `t` (other than the absent cases
 * `readFileOrNull` already maps to `null`), or a `runGit` rejection for `merge-file`, is a
 * planning failure naming `path` and carrying `detail` (the underlying error's own message) --
 * unlike `MergeFileError`, which never has a `detail` (its own fixed text already says enough). */
export class PlanningError extends Error {
  constructor(path, detail) {
    super(`step 8 planning failed at ${path}: ${detail}`)
    this.name = 'PlanningError'
    this.path = path
    this.detail = detail
  }
}

const BINARY_SCAN_BYTES = 8000

function isBinary(buf) {
  if (buf === null) return false
  return buf.subarray(0, BINARY_SCAN_BYTES).includes(0)
}

/** T-0027 increment 17 (U56): `0x0D 0x0A` -> `0x0A`, scanning raw bytes -- never decode to a
 * string and back, which would corrupt a non-UTF-8 file (D4's own problem) before D4 even lands.
 * Only ever applied to a side already classified as text (binary is decided on RAW bytes first,
 * below, unaffected by this). */
function normaliseCrlf(buf) {
  const out = Buffer.alloc(buf.length)
  let o = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) continue
    out[o++] = buf[i]
  }
  return out.subarray(0, o)
}

/** `≡` (traceability.md "Vocabulary"): both absent, or both present and byte-for-byte equal for a
 * binary pair (classified on raw, unnormalised bytes), or equal after CRLF -> LF normalisation for
 * a text pair (T-0027 increment 17, U56: nothing in U17's own 13 branches at increment 1 needed
 * this, so it was added here, the first row whose fixture actually does).
 * `forceBinary`, when given, is the PATH's own binary decision (any of o/b/t present with a NUL),
 * not just this one pair's -- `classify`, below, is the caller that needs this; every other
 * caller (P-2's `eq(b, t)`, the anchor-file check's `eq(anchorB, anchorT)`) has only two sides of
 * its own to look at, so it leaves `forceBinary` `undefined` and keeps the old pair-wise reading. */
function eq(a, b, forceBinary) {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  const binary = forceBinary !== undefined ? forceBinary : isBinary(a) || isBinary(b)
  if (binary) return a.equals(b)
  return normaliseCrlf(a).equals(normaliseCrlf(b))
}

/** Manual `/`-joins (not `node:path.join`), matching `git ls-files -z`'s own output and the
 * archive's own `rest` strings -- Windows-neutral by construction. */
async function listFilesRecursive(fs, dir) {
  const result = []
  async function walk(current, rel) {
    const names = await fs.readdir(current, { withFileTypes: true })
    for (const name of names) {
      const relPath = rel ? `${rel}/${name.name}` : name.name
      const full = join(current, name.name)
      if (name.isDirectory()) await walk(full, relPath)
      else if (name.isFile()) result.push(relPath)
    }
  }
  await walk(dir, '')
  return result
}

/** `b`/`t`/`o`: "p's file in B, T, or absent" (traceability.md "Vocabulary") -- a directory at
 * that path is not a file, so reading it as one (`EISDIR`) is "absent" by the same reading as
 * `ENOENT`, not a bug. T-0027 increment 4: this is what keeps a tracked symbolic-linked
 * directory's own bare path (present as a real directory in B and/or T once any path nested under
 * it differs between them) from crashing here -- P-3, below, is what then leaves a path reached
 * THROUGH that directory untouched. T-0027 increment 15: `ENOTDIR` -- a parent component inside
 * the range, B or T is a FILE, not a directory -- means the same thing for a nested path reached
 * through it: nothing is there, so it reads as absent too, not a bug. */
async function readFileOrNull(fs, absPath) {
  try {
    return await fs.readFile(absPath)
  } catch (err) {
    if (err?.code === 'ENOENT' || err?.code === 'EISDIR' || err?.code === 'ENOTDIR') return null
    throw err
  }
}

/** P-3 (traceability.md "Pre-checks"): true when `path` itself, or any parent directory of it
 * inside the range, is a symbolic link (by `lstat`, never followed). An absent component (and
 * everything under it) is not a symlink -- not yet classified as a path at all; absence is left
 * to the merge table, as every other pre-check already does. T-0027 increment 15 (deviation,
 * recorded in the ticket): `ENOTDIR` is treated the same as `ENOENT` here too -- a parent
 * component that is itself a FILE (not a directory) means nothing is at `path` either, by the
 * same "ENOTDIR-as-absent" reading `readFileOrNull`, above, already applies; without this, a
 * path reached through a kept file (U54's own file-to-directory swap) would crash here instead of
 * reaching the merge table. */
async function hasSymlinkInPath(fs, rangeRoot, path) {
  let current = rangeRoot
  for (const part of path.split('/')) {
    current = join(current, part)
    let st
    try {
      st = await fs.lstat(current)
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') return false
      throw err
    }
    if (st.isSymbolicLink()) return true
  }
  return false
}

/** P-9 (traceability.md "Pre-checks", Vocabulary "name on disk"; D12, T-0062): true when the name
 * the file system stores for q differs from q, where q is `path` when `o` exists by `lstat`, and
 * otherwise `path`'s deepest proper ancestor that exists, found by `lstat` walking from the range
 * root (it may be a regular file). When q is the range root, P-9 does not apply. The comparison
 * takes R, the range root's native realpath as step 3 resolved it, and Q, the native realpath of
 * q, both with `\` turned into `/`; Q must start with R followed by `/` (or R itself when R
 * already ends in `/`, a drive root), and the rest of Q must equal q once both are NFC-normalised.
 * An `lstat` error other than ENOENT/ENOTDIR, or a `realpath` rejection, is a planning failure
 * naming `path` (UP-E11). This catches what P-4 cannot see: a Windows 8.3 short name, HFS+
 * ignorable code points, or letter case in a parent directory that B, T and tracked do not name. */
async function hasNameAlias(fs, rangeRoot, realRangeRoot, path) {
  const parts = path.split('/')
  const lstatOk = async (rel) => {
    try {
      await fs.lstat(join(rangeRoot, ...rel))
      return true
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') return false
      throw new PlanningError(path, err?.message ?? String(err))
    }
  }
  let q = null
  if (await lstatOk(parts)) {
    q = parts
  } else {
    for (let i = 1; i < parts.length; i++) {
      if (!(await lstatOk(parts.slice(0, i)))) break
      q = parts.slice(0, i)
    }
  }
  if (q === null) return false // q is the range root: P-9 does not apply
  let realQ
  try {
    realQ = await fs.realpath(join(rangeRoot, ...q))
  } catch (err) {
    throw new PlanningError(path, err?.message ?? String(err))
  }
  const toSlash = (value) => String(value).replace(/\\/g, '/')
  const root = toSlash(realRangeRoot)
  const prefix = root.endsWith('/') ? root : `${root}/`
  const resolved = toSlash(realQ)
  if (!resolved.startsWith(prefix)) return true
  return resolved.slice(prefix.length).normalize('NFC') !== q.join('/').normalize('NFC')
}

/** P-6 (traceability.md "Pre-checks"): true when `o` exists, is reached without crossing a
 * non-directory component (`ENOENT`/`ENOTDIR` both mean "nothing non-file is here" -- the same
 * reading as `readFileOrNull`/`hasSymlinkInPath`, above), is not a symbolic link (already ruled
 * out by P-3, which runs earlier in the pre-check order), and is not a regular file either. `t` is
 * always a file or absent in `allPaths` (a bare directory path never enters it on its own), so a
 * non-file `o` can never be `≡` to it -- "o ≢ t" is automatic once this is true, no content read
 * needed. */
async function isNonFileOther(fs, rangeRoot, path) {
  let st
  try {
    st = await fs.lstat(join(rangeRoot, ...path.split('/')))
  } catch (err) {
    if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') return false
    throw err
  }
  return !st.isSymbolicLink() && !st.isFile()
}

/** D10 (traceability.md "Pre-checks" P-8): parses `git ls-files -s -z`'s own stdout into the set
 * of paths whose INDEX entry is a gitlink (mode `160000`, a submodule) -- each NUL-terminated
 * entry is `<mode> <sha1> <stage>\t<path>`, unquoted (`-z`, the same convention `ls-files -z`'s
 * own tracked-paths call already relies on). */
function parseSubmodulePaths(stdout) {
  const paths = new Set()
  for (const entry of stdout.split('\0')) {
    if (entry === '') continue
    const tab = entry.indexOf('\t')
    const mode = entry.slice(0, tab).split(' ')[0]
    if (mode === '160000') paths.add(entry.slice(tab + 1))
  }
  return paths
}

/** P-8 (traceability.md "Pre-checks", D10): true when `path` IS a submodule, or lies under one --
 * `submodulePaths` holds exact gitlink paths (`parseSubmodulePaths`, above); a path under one is
 * never itself an index entry (the submodule's own files are not part of the range's index), so
 * this is a prefix check, not a set lookup. */
function isUnderSubmodule(path, submodulePaths) {
  for (const submodulePath of submodulePaths) {
    if (path === submodulePath || path.startsWith(`${submodulePath}/`)) return true
  }
  return false
}

/** P-4 (traceability.md "Pre-checks", T-0027 increment 13): true when some OTHER path of
 * `allPaths` differs from `path` only by NFC normalisation and ASCII/Unicode case folding --
 * `foldedGroups` maps every path's own folded key to the list of paths sharing it, built once per
 * run (not per path), so this is an O(1) lookup here. */
function hasCaseCollision(path, foldedGroups) {
  return foldedGroups.get(path.normalize('NFC').toLowerCase()).length > 1
}

/** P-5 and D15 (traceability.md "Pre-checks", step 5; Vocabulary's own "ignored path" -- "a path
 * that is not tracked and that `git check-ignore -q --no-index -- ./<path>` reports as ignored by
 * the range's rules"); shared by both since T-0062 (S1). `check-ignore`'s own exit codes are 0
 * (ignored) and 1 (not ignored); any other exit code, or a `runGit` rejection, is a bug naming the
 * command -- fail closed (D6, D19), never silently read as either answer. Called only for a path
 * the caller has already found untracked (a force-added, tracked file that also matches an ignore
 * rule is never P-5, and never D15). */
export async function isIgnoredPath(deps, guard, rangeRoot, path) {
  // `./` keeps the path literal: `check-ignore` refuses every pathspec magic (`--literal-pathspecs`
  // included), and a path starting with `:` would otherwise be read as magic and check another path.
  const name = `check-ignore -- ./${path}`
  const result = await runGitNamed(
    deps,
    guard,
    ['check-ignore', '-q', '--no-index', '--', `./${path}`],
    { cwd: rangeRoot, env: buildGitEnv(deps.env) },
    name,
  )
  // A signal this process already received while that `runGit` call was in flight wins over
  // interpreting its result, the same way `runMergeFile` already does.
  guard.throwIfRaised()
  if (result.code === 0) return true
  if (result.code === 1) return false
  throw new Error(`git ${name} failed (exit code ${result.code}): ${result.stderr}`)
}

/** The merge table (rows checked in order; the first match applies), given `o`/`b`/`t` as
 * `Buffer | null`, and ALREADY past P-2 (`b ≡ t`, checked by the caller before this is ever
 * reached). Every remaining combination is total -- traceability.md's own paragraph just below
 * the table ("with b ≢ t and o a file or absent, exactly one of M5-M12 applies"). */
function classify(path, o, b, t) {
  // Decided once per path, from all three sides -- not re-derived separately (and possibly
  // differently) for each pair `eq`, below, compares.
  const binary = isBinary(o) || isBinary(b) || isBinary(t)
  if (eq(o, t, binary)) return { row: 'M4' }
  if (eq(o, b, binary)) {
    if (t !== null) return { row: 'M5', existedBefore: o !== null }
    return { row: 'M6' }
  }
  if (o === null) return { row: 'M7' }
  if (t === null) return { row: 'M8' }
  if (b === null) return { row: 'M9' }
  if (path === 'pnpm-lock.yaml') return { row: 'M10' }
  if (binary) return { row: 'M11' }
  return { row: 'M12' }
}

/** M12: shells out to the real `git merge-file`, its three inputs written into the run's own
 * merge-inputs subdirectory, created lazily the first time any path reaches this row
 * (`mergeDirRef.current` is set once and reused, under a fresh file name, for every later M12
 * path in the same run, so a run with no M12 path never creates this directory at all --
 * F14's own `mkdtemp` count stays unaffected). `result.code === 0` is a clean merge
 * (traceability.md "Merge table" M12); `1`-`127` is a conflict, written with its three labels and
 * reported UP-A1; anything else -- including `null` for a process ended by a signal -- is a
 * planning failure (`MergeFileError`, UP-E11; U57, D4). */
async function runMergeFile({ deps, guard, rangeRoot, baseVersion, targetVersion, mergeDirRef, path, o, b, t }) {
  if (mergeDirRef.current === undefined) {
    mergeDirRef.current = await deps.fs.mkdtemp(join(deps.tmpRoot, 'create-wxl-upgrade-merge-'))
  }
  const index = (mergeDirRef.count = (mergeDirRef.count ?? 0) + 1)
  const oPath = join(mergeDirRef.current, `o-${index}`)
  const bPath = join(mergeDirRef.current, `b-${index}`)
  const tPath = join(mergeDirRef.current, `t-${index}`)
  // T-0027 increment 17 (U56's own approved extra sub-case): M12 is only reached for a text pair
  // (M11 already caught any binary one), so every input is safe to CRLF-normalise the same way
  // the `≡` helper, above, already does -- otherwise a CRLF-only `o` would make every line look
  // different from `b`/`t` to `merge-file` and conflict needlessly.
  await deps.fs.writeFile(oPath, normaliseCrlf(o))
  await deps.fs.writeFile(bPath, normaliseCrlf(b))
  await deps.fs.writeFile(tPath, normaliseCrlf(t))

  // T-0027 increment 25 (D4): `binary: true` keeps `result.stdout` as a `Buffer` -- the ordinary
  // string-decoding `runGit` would already have replaced every invalid UTF-8 byte sequence (e.g.
  // a non-UTF-8 text file such as Big5) with U+FFFD by the time this function ever saw it.
  // A `runGit` rejection (not a resolved result with an unusable `code`) is also a planning
  // failure, UP-E11 naming `path` with the rejection's own text -- not a bug.
  let result
  try {
    result = await deps.runGit(
      ['-c', 'core.autocrlf=false', 'merge-file', '-p', '--diff3', '-L', 'range', '-L', baseVersion, '-L', targetVersion, oPath, bPath, tPath],
      { cwd: rangeRoot, env: buildGitEnv(deps.env), binary: true },
    )
  } catch (err) {
    throw new PlanningError(path, err.message)
  }
  // A signal this process already received while that `runGit` call was in flight wins over
  // interpreting its result -- checked the moment it resolves, BEFORE `result.code` is read, so
  // a `merge-file` that ended with `code: null` (or any other value) because of that same signal
  // is never reported as `UP-E11`.
  guard.throwIfRaised()

  if (result.code === 0) {
    // T-0027 increment 19 (U58): a clean merge of a `.json` file whose merged output does not
    // parse keeps the range's own version and reports UP-A11, instead of writing output nothing
    // downstream can read. `JSON.parse` coerces `result.stdout` (now a `Buffer`) through its own
    // `toString()` (UTF-8), harmless here since valid JSON is ASCII/UTF-8-safe by construction.
    if (path.endsWith('.json')) {
      try {
        JSON.parse(result.stdout)
      } catch {
        return { action: 'none', report: 'UP-A11' }
      }
    }
    return { action: 'write', content: result.stdout, report: undefined }
  }
  // T-0027 increment 18 (U57): `0`-`127` is the range a real `git merge-file` process can
  // legitimately exit with (0 clean, 1-127 conflicting); anything else -- including `null` for a
  // process ended by a signal -- is a planning failure, not a result to write.
  if (Number.isInteger(result.code) && result.code >= 1 && result.code <= 127) {
    return { action: 'write', content: result.stdout, report: 'UP-A1' }
  }
  throw new MergeFileError(path)
}

/**
 * `planMerge({ deps, guard, rangeRoot, baseDir, targetDir, baseVersion, targetVersion })` ->
 * `{ ops, attention, mergeDir }`. `ops` is sorted by path, each `{ path, action: 'delete' |
 * 'write', content?, existedBefore?, report? }` (`report`, when present, is the UP-A code this op
 * also carries in `attention` -- used by the report stage to exclude an M10/M12-conflict write
 * from the "updated"/"added" counts, traceability.md "Report" R2's own "M10 is not counted as
 * updated"). `attention` is sorted by path, each `{ path, code }`. `mergeDir` is the lazily
 * created merge-inputs directory's path, or `undefined` when no path reached M12.
 */
export async function planMerge({ deps, guard, rangeRoot, realRangeRoot, baseDir, targetDir, baseVersion, targetVersion }) {
  // D10 (traceability.md "Pre-checks" P-8): a SEPARATE `git ls-files -s -z` call, kept apart from
  // the plain `ls-files -z` call below (which lists only the TRACKED PATHS, not their index mode)
  // -- a gitlink is also a tracked path, so it is in BOTH results; only this one can tell it apart
  // from an ordinary file.
  const [baseFiles, targetFiles, trackedResult, submoduleResult] = await Promise.all([
    listFilesRecursive(deps.fs, baseDir),
    listFilesRecursive(deps.fs, targetDir),
    deps.runGit(['ls-files', '-z'], { cwd: rangeRoot, env: buildGitEnv(deps.env) }),
    deps.runGit(['ls-files', '-s', '-z'], { cwd: rangeRoot, env: buildGitEnv(deps.env) }),
  ])
  guard.throwIfRaised()
  if (trackedResult.code !== 0) {
    throw new Error(`git ls-files -z failed (exit code ${trackedResult.code}): ${trackedResult.stderr}`)
  }
  if (submoduleResult.code !== 0) {
    throw new Error(`git ls-files -s -z failed (exit code ${submoduleResult.code}): ${submoduleResult.stderr}`)
  }
  const tracked = trackedResult.stdout.split('\0').filter((entry) => entry !== '')
  const trackedSet = new Set(tracked)
  const submodulePaths = parseSubmodulePaths(submoduleResult.stdout)
  // T-0027 increment 13 fix (U53): B and T are the pristine ranges listFilesRecursive already
  // listed, above -- `b`/`t` exist at `path` only when that EXACT (case-sensitive) string is one
  // of those listed names. Reading by joining `path` onto `baseDir`/`targetDir` and letting the
  // file system resolve it would, on a case-insensitive file system, silently read the OTHER
  // path's bytes for a case-only rename (`guide.md` resolving to `Guide.md`'s entry), making
  // `b ≡ t` hold and P-2 swallow the path before P-4 ever runs.
  const baseFileSet = new Set(baseFiles)
  const targetFileSet = new Set(targetFiles)

  const allPaths = new Set([...baseFiles, ...targetFiles, ...tracked])
  allPaths.delete('range.json') // P-1: step 9 writes it

  // P-4: grouped once per run, by every path's own NFC-normalised, case-folded key.
  const foldedGroups = new Map()
  for (const path of allPaths) {
    const folded = path.normalize('NFC').toLowerCase()
    if (!foldedGroups.has(folded)) foldedGroups.set(folded, [])
    foldedGroups.get(folded).push(path)
  }

  const ops = []
  const attention = []
  const mergeDirRef = {}

  // The merge-inputs directory `runMergeFile` creates lazily, above, must be removed however
  // this loop ends -- a read error, a `runGit` rejection, or a signal noticed by any of this
  // loop's own `guard.throwIfRaised()` calls, not only `MergeFileError`. Wrapping the whole loop
  // lets every one of those attach `mergeDirRef.current` (if a path has reached M12 by then) to
  // the error it throws, for the caller (`upgrade.mjs`) to clean up -- `planMerge` itself never
  // sees that caller's own `tmpDirs` list.
  try {
    for (const path of [...allPaths].sort()) {
      // A read error of b or t other than the absent cases `readFileOrNull` already maps to
      // `null` (e.g. `EACCES`) is a planning failure, UP-E11 naming this path -- not a bug
      // (`CW-E14`), since it is the range's own file system that refused the read, not a
      // programming error.
      let b, t
      try {
        ;[b, t] = await Promise.all([
          baseFileSet.has(path) ? readFileOrNull(deps.fs, join(baseDir, ...path.split('/'))) : null,
          targetFileSet.has(path) ? readFileOrNull(deps.fs, join(targetDir, ...path.split('/'))) : null,
        ])
      } catch (err) {
        throw new PlanningError(path, err.message)
      }
      guard.throwIfRaised()

      if (eq(b, t)) continue // P-2: leave o as it is, unreported

      if (await hasSymlinkInPath(deps.fs, rangeRoot, path)) {
        // P-3: untouched, UP-A7.
        attention.push({ path, code: 'UP-A7' })
        continue
      }

      if (hasCaseCollision(path, foldedGroups)) {
        // P-4: untouched, UP-A8.
        attention.push({ path, code: 'UP-A8' })
        continue
      }

      if (!trackedSet.has(path) && (await isIgnoredPath(deps, guard, rangeRoot, path))) {
        // P-5: untouched, UP-A9.
        attention.push({ path, code: 'UP-A9' })
        continue
      }

      if (await isNonFileOther(deps.fs, rangeRoot, path)) {
        // P-6 (T-0027 increment 15): untouched, UP-A10.
        attention.push({ path, code: 'UP-A10' })
        continue
      }

      // P-7 (D9): an ignore file (at any level -- the LAST path component, not only the
      // range's root one) that upstream changed is never written, so the restore commands'
      // `git clean -fd` can never delete a file the teacher's own (unwritten) ignore rules
      // still match. Checked in traceability.md's "Pre-checks" table order, after P-6 and before
      // P-8. The last component is folded the way P-4 folds a whole path, so an upstream
      // `.GITIGNORE` (or any other-cased or normalised form) is still an ignore file.
      if (path.split('/').pop().normalize('NFC').toLowerCase() === '.gitignore') {
        attention.push({ path, code: 'UP-A13' })
        continue
      }

      // P-8 (D10): `path` is a submodule, or lies under one -- its own working tree is not part
      // of the range's index, so the restore commands cannot undo a write or delete there.
      if (isUnderSubmodule(path, submodulePaths)) {
        attention.push({ path, code: 'UP-A14' })
        continue
      }

      // P-9 (D12, T-0062): a path whose name on disk differs from `path` -- in itself, or in the
      // deepest existing ancestor when `o` is absent -- is never read, written or deleted here.
      // Checked last among the pre-checks, so a symbolic link stays UP-A7 (P-3) and a collision
      // within B ∪ T ∪ tracked stays UP-A8 (P-4).
      if (await hasNameAlias(deps.fs, rangeRoot, realRangeRoot, path)) {
        attention.push({ path, code: 'UP-A15' })
        continue
      }
      guard.throwIfRaised()

      // `o` is classified by `lstat` BEFORE any read -- P-3 (a symbolic link anywhere in `path`)
      // and P-6 (a present, non-symbolic-link, non-regular-file `o`), both just above, already
      // ran and left without ever reading `o`'s own content; only once
      // neither applies is `o` known to be a regular file or absent, safe for an ordinary
      // `readFile` -- otherwise a symlink to something whose read hangs or fails (a FIFO, a
      // socket, a device) would crash or stall the whole run instead of being left untouched.
      let o
      try {
        o = await readFileOrNull(deps.fs, join(rangeRoot, ...path.split('/')))
      } catch (err) {
        throw new PlanningError(path, err.message)
      }
      guard.throwIfRaised()

      const { row, existedBefore } = classify(path, o, b, t)

      if (row === 'M4') continue
      if (row === 'M5') {
        const op = { path, action: 'write', content: t, existedBefore }
        // M5 (traceability.md "Merge table"): "new files take t's executable bit; existing ones
        // keep their mode" -- only a brand-new path (M5-added) ever needs t's own mode here; an
        // existing one's mode is preserved by `merge-apply.mjs` regardless of which row wrote it.
        if (!existedBefore) {
          const targetStat = await deps.fs.stat(join(targetDir, ...path.split('/')))
          op.newFileExecutable = (targetStat.mode & 0o111) !== 0
        }
        ops.push(op)
        continue
      }
      if (row === 'M6') {
        ops.push({ path, action: 'delete' })
        continue
      }
      if (row === 'M7') {
        attention.push({ path, code: 'UP-A5' })
        continue
      }
      if (row === 'M8') {
        attention.push({ path, code: 'UP-A3' })
        continue
      }
      if (row === 'M9') {
        attention.push({ path, code: 'UP-A4' })
        continue
      }
      if (row === 'M10') {
        // `pnpm-lock.yaml` always already exists once a path reaches M10
        // (its base and the teacher's own copy both had it) -- `existedBefore: true` is what
        // tells `merge-apply.mjs`'s own write loop to preserve its CURRENT mode, the same "M5:
        // existing ones keep their mode" guarantee every other existing-file write already gets.
        ops.push({ path, action: 'write', content: t, existedBefore: true, report: 'UP-A6' })
        attention.push({ path, code: 'UP-A6' })
        continue
      }
      if (row === 'M11') {
        attention.push({ path, code: 'UP-A2' })
        continue
      }
      // M12
      const outcome = await runMergeFile({ deps, guard, rangeRoot, baseVersion, targetVersion, mergeDirRef, path, o, b, t })
      guard.throwIfRaised()
      if (outcome.action === 'write') {
        ops.push({ path, action: 'write', content: outcome.content, existedBefore: o !== null, report: outcome.report })
      }
      if (outcome.report !== undefined) attention.push({ path, code: outcome.report })
    }
  } catch (err) {
    // Whatever throws here -- `MergeFileError`, a `SignalAbort` from
    // `guard.throwIfRaised()`, a read error, or a `runGit` rejection -- the merge-inputs
    // directory (if a path already reached M12 by then) is attached to it for the caller
    // (`upgrade.mjs`) to remove; `planMerge` itself never sees that caller's own `tmpDirs` list.
    if (mergeDirRef.current !== undefined && err.mergeDir === undefined) err.mergeDir = mergeDirRef.current
    throw err
  }

  // Parent check (traceability.md:153, after the merge table; T-0027 increment 16, tightened by
  // the verification follow-up's item 3): a planned write whose path has A PARENT INSIDE THE
  // RANGE -- any ancestor directory level, not only the immediate one -- that exists, is not a
  // directory, and is not itself being deleted by this same plan, is dropped -- UP-A10 for the
  // write's own path, not counted as added/updated. Deletions run before writes (step 9), so a
  // file replaced by a directory of the same name (U54) is unaffected: its own parent IS one of
  // this plan's own deletes. `lstat`-ing the immediate parent alone is not enough: when a
  // SHALLOWER ancestor (e.g. `a` for a write to `a/b/x`) is the non-directory the plan keeps,
  // `fs.lstat(rangeRoot, 'a', 'b')` fails with ENOTDIR (a component of the path prefix is not a
  // directory) rather than naming `a` itself -- walking every ancestor from the top catches this.
  const deletingPaths = new Set(ops.filter((op) => op.action === 'delete').map((op) => op.path))
  const finalOps = []
  for (const op of ops) {
    if (op.action === 'write') {
      const parts = op.path.split('/')
      let blocked = false
      for (let depth = 1; depth < parts.length && !blocked; depth++) {
        const ancestorParts = parts.slice(0, depth)
        const ancestorPath = ancestorParts.join('/')
        if (deletingPaths.has(ancestorPath)) continue
        let ancestorStat = null
        try {
          ancestorStat = await deps.fs.lstat(join(rangeRoot, ...ancestorParts))
        } catch (err) {
          // Only ENOENT (absent) and ENOTDIR (a SHALLOWER ancestor already a
          // file -- in practice never reached here, since this loop itself would already have set
          // `blocked` at that shallower depth first) mean "nothing to block this write at this
          // ancestor level"; any other error (e.g. EACCES) is a planning failure, not evidence of
          // absence -- fail closed, like every other pre-check's own lstat.
          if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') {
            ancestorStat = null
          } else {
            const planningErr = new PlanningError(op.path, err.message)
            if (mergeDirRef.current !== undefined) planningErr.mergeDir = mergeDirRef.current
            throw planningErr
          }
        }
        if (ancestorStat !== null && !ancestorStat.isDirectory()) blocked = true
      }
      if (blocked) {
        attention.push({ path: op.path, code: 'UP-A10' })
        continue
      }
    }
    finalOps.push(op)
  }

  finalOps.sort((a, b2) => (a.path < b2.path ? -1 : a.path > b2.path ? 1 : 0))
  attention.sort((a, b2) => (a.path < b2.path ? -1 : a.path > b2.path ? 1 : 0))

  // Fork:init-derived content (traceability.md "Fork:init-derived content", T-0027 increment 20,
  // U59): when ANY of the nine anchor files (0004's A1-A9 plus the deploy template) differs
  // between base and target, the report adds ONE UP-A12 line -- not one per anchor, and not tied
  // to any single path, so it is appended after the path-sort above, with no `path` field of its
  // own (`upgrade-report.mjs`'s own sort already places a `UP-A12` item last regardless of this
  // append order; this is also why `attention.sort`, above, never sees it). The nine paths are
  // written as literals here, at this one call site -- there is no shared module exporting them.
  const ANCHOR_PATHS = [
    'package.json',
    'README.md',
    'README.en.md',
    'CONTRIBUTE.md',
    '.vitepress/config.mts',
    '.vitepress/challenge/shortLink.ts',
    'platform/index.md',
    'platform/zh-TW/index.md',
    'scripts/templates/deploy.yml.template',
  ]
  // T-0027 verification follow-up (item 4, approved sub-case, 2026-11-09): the same exact-name
  // (case-sensitive) presence rule as the U53 fix, above (`baseFileSet`/`targetFileSet`), not a
  // path read -- on a case-insensitive filesystem, joining `anchorPath` onto `targetDir` and
  // reading it would resolve to a DIFFERENTLY-cased sibling the target pristine range actually
  // lists (e.g. `readme.md` for the literal anchor `README.md`), wrongly reading it as present.
  // This check's own reads are wrapped the same way the main loop's own reads, above, already
  // are -- a read error here (other than the absent cases `readFileOrNull` already maps to
  // `null`) is a planning failure too (traceability.md "Codes" UP-E11), naming the anchor path,
  // with the merge-inputs directory (if any path already reached M12) attached for the caller to
  // remove -- not a bug reaching step 9 with that directory left behind under `tmpRoot`.
  let anchorChanged = false
  try {
    for (const anchorPath of ANCHOR_PATHS) {
      let anchorB, anchorT
      try {
        ;[anchorB, anchorT] = await Promise.all([
          baseFileSet.has(anchorPath) ? readFileOrNull(deps.fs, join(baseDir, ...anchorPath.split('/'))) : null,
          targetFileSet.has(anchorPath) ? readFileOrNull(deps.fs, join(targetDir, ...anchorPath.split('/'))) : null,
        ])
      } catch (err) {
        throw new PlanningError(anchorPath, err.message)
      }
      if (!eq(anchorB, anchorT)) {
        anchorChanged = true
        break
      }
    }
  } catch (err) {
    if (mergeDirRef.current !== undefined && err.mergeDir === undefined) err.mergeDir = mergeDirRef.current
    throw err
  }
  if (anchorChanged) attention.push({ code: 'UP-A12' })

  return { ops: finalOps, attention, mergeDir: mergeDirRef.current }
}
