// Shared run helpers, moved out of run.mjs so steps 6-9 (0005) and the upgrade path's step 7
// (0006) can call the same functions: the one place every "print a failure line, then remove the
// temporary directory this run created, then fail" sequence lives, the file-system-vs-bug error
// classifier, the download window (`downloadArchive`, now taking the repository/ref to download
// instead of being tied to `deps.source`/`commit`), and the archive-read/mkdtemp/extract/
// pristine-apply window (`readArchiveEntries` also gained the optional `tag` parameter here, for
// 0006's U16 tag-mode base).

import { join } from 'node:path'
import { SignalAbort } from './signals.mjs'
import { parseArchive, ArchiveParseError } from './archive.mjs'
import { checkEntryRules, ArchiveRuleError } from './archive-rules.mjs'
import { extractEntries } from './fsops.mjs'
import { applyChangelog, applyOpenQuestions, applyPackageJson, writeRangeJson, PristineError } from './pristine.mjs'
import { COMMIT_RE } from './patterns.mjs'

/** S-20: the one place every "print a failure line, then remove the temporary directory this run
 * created, then fail" sequence lives (steps 8-10's CW-E09/CW-E10/CW-E04 branches, and the
 * generic bug/signal catch, each used to repeat this pair of calls for itself). */
export async function removeTmpDir(deps, tmpDir) {
  await deps.fs.rm(tmpDir, { recursive: true, force: true })
}

export async function failWithCleanup(io, deps, tmpDir, line) {
  io.stderr.write(line + '\n')
  await removeTmpDir(deps, tmpDir)
  return 1
}

/** CW-E09 (steps 8-9) vs. CW-E14 (a bug): a real file-system error carries a string `code` that
 * does NOT start with `ERR_` (review finding C-12) -- Node's own argument-validation errors
 * (`ERR_INVALID_ARG_TYPE`, `ERR_INVALID_ARG_VALUE`, `ERR_OUT_OF_RANGE`, ...) also carry a string
 * `code`, but they are a programming bug in this codebase, not an environment problem to report
 * as CW-E09. */
export function isFileSystemError(err) {
  return typeof err?.code === 'string' && !err.code.startsWith('ERR_')
}

/** The URL, `AbortController`, timeout, the `fetchArchive` race and CW-E07
 * for a rejection, a timeout or a non-200 status -- the whole window 0005's step 6 (`runSteps`)
 * and 0006's step 7 (`upgrade.mjs`) share, now taking the repository/ref to download instead of
 * being tied to `deps.source`/`commit`. Returns `{ body }`, or `null` after CW-E07 is already
 * printed; the caller's own `checkpoint('step-6')`/`guard.throwIfRaised()`/CW-W04 are unchanged by
 * this move, and so is `checkpoint('step-7')` (both stay at the call site). */
export async function downloadArchive({ io, deps, t2, guard, repository, ref, remediesOn404 = false }) {
  const url = `https://codeload.github.com/${repository}/tar.gz/${ref}`
  const controller = new AbortController()
  // decision 6: a signal during the download aborts it through this same controller, instead of
  // waiting out the full `downloadTimeoutMs` -- traceability.md "Signals": "after a signal no new
  // file-system operation starts" (the download itself is not a file-system operation, but the
  // rule not to keep running applies the same way).
  const unsubscribeAbort = guard.onRaise(() => controller.abort())
  let timedOut = false
  let timer
  const timeoutPromise = new Promise((_resolveTimeout, rejectTimeout) => {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
      rejectTimeout(new Error())
    }, deps.downloadTimeoutMs)
  })

  let status, body
  try {
    ;({ status, body } = await Promise.race([deps.fetchArchive(repository, ref, { signal: controller.signal }), timeoutPromise]))
  } catch (err) {
    if (guard.raised()) throw new SignalAbort(guard.raised())
    const detail = timedOut ? { kind: 'timeout' } : { kind: 'error', message: err?.message ?? String(err) }
    io.stderr.write(t2['CW-E07']({ url, detail }) + '\n')
    return null
  } finally {
    clearTimeout(timer)
    // S-17: this window has closed either way; this `AbortController` is no longer useful to
    // abort, so the callback is removed instead of lingering for the rest of the run.
    unsubscribeAbort()
  }

  guard.throwIfRaised() // P-17/C-14: a signal already received wins over a non-200 status
  if (status !== 200) {
    io.stderr.write(t2['CW-E07']({ url, detail: { kind: 'status', status }, remedies: remediesOn404 && status === 404 }) + '\n')
    return null
  }

  return { body }
}

/** With an optional `tag` (U16): parses `body` (CW-E08 on a parse
 * failure) and validates its entries against the archive entry rules (CW-E08 for a broken rule),
 * returning the enriched entry list, or `null` after the message is already printed -- never
 * throwing for either of those two conditions; anything else (a bug) is rethrown. Without `tag`,
 * `commit` is compared against the archive's own pax comment exactly as rule 2 always has
 * (0005's own call site never passes `tag`, so its behaviour is unchanged, and the return value
 * stays the bare entry list). With `tag` (a version-form `--from` base), the comment is resolved
 * first: when it is not a string matching `COMMIT_RE`, UP-E08 is printed instead of CW-E08 and
 * `commit` is never consulted; otherwise the comment itself becomes the `commit` rule 2 compares
 * against (unchanged `checkEntryRules`), and the resolved commit is also returned (U52, inc 22:
 * `{ entries, commit: comment }`) so the caller can learn the base commit a tag download alone
 * never names. */
export async function readArchiveEntries({ io, t2, body, commit, tag, expectedCommit, version }) {
  let parsedArchive
  try {
    parsedArchive = await parseArchive(body)
  } catch (err) {
    if (err instanceof ArchiveParseError) {
      io.stderr.write(t2['CW-E08']({ parseError: err.message }) + '\n')
      return null
    }
    throw err
  }
  let effectiveCommit = commit
  if (tag !== undefined) {
    const { comment } = parsedArchive
    if (typeof comment !== 'string' || !COMMIT_RE.test(comment)) {
      io.stderr.write(t2['UP-E08']({ tag, remedies: expectedCommit !== undefined }) + '\n')
      return null
    }
    effectiveCommit = comment
    // J6 (D11, T-0061): a base read from range.json must be the commit the tag names. Checked
    // right after the comment's own shape and before every entry rule, so a mismatched archive is
    // UP-E12 whatever else it holds.
    if (expectedCommit !== undefined && comment !== expectedCommit) {
      io.stderr.write(t2['UP-E12']({ version, recordedCommit: expectedCommit, tagCommit: comment }) + '\n')
      return null
    }
  }
  try {
    const entries = checkEntryRules(parsedArchive, { commit: effectiveCommit })
    return tag !== undefined ? { entries, commit: effectiveCommit } : entries
  } catch (err) {
    if (err instanceof ArchiveRuleError) {
      io.stderr.write(t2['CW-E08']({ rule: err.rule, path: err.path, isCommentMarker: err.isCommentMarker }) + '\n')
      return null
    }
    throw err
  }
}

/** `deps.fs.mkdtemp(join(parent, prefix))`, reporting CW-E09 naming `parent` for a
 * file-system error (mkdtemp itself failed: nothing was created, nothing to clean up), or
 * rethrowing a bug. Returns the new directory's path, or `null` after the message is printed. */
export async function makeTmpDir({ io, deps, t2, parent, prefix }) {
  try {
    return await deps.fs.mkdtemp(join(parent, prefix))
  } catch (err) {
    if (isFileSystemError(err)) {
      io.stderr.write(t2['CW-E09']({ path: parent, detail: err.message }) + '\n')
      return null
    }
    throw err
  }
}

/** Extracts `entries` into `tmpDir` (S-19's `{ stopped: true }` turned into the same
 * `SignalAbort` every other window throws), reporting CW-E09 through `failWithCleanup` for a
 * file-system error. Returns `true` on success, `false` after `failWithCleanup` already printed
 * the message and removed `tmpDir`; a `SignalAbort` or a bug is rethrown, uncaught. */
export async function extractInto({ io, deps, t2, guard, entries, tmpDir }) {
  try {
    const { stopped } = await extractEntries(deps, entries, tmpDir, { shouldStop: () => guard.isRaised() })
    if (stopped) throw new SignalAbort(guard.raised())
  } catch (err) {
    if (err instanceof SignalAbort) throw err
    if (isFileSystemError(err)) {
      await failWithCleanup(io, deps, tmpDir, t2['CW-E09']({ path: err.reportPath ?? tmpDir, detail: err.message }))
      return false
    }
    throw err
  }
  return true
}

/** P1-P4 against `tmpDir`, with the guard checked in between each write (decision 6: a signal
 * mid-step-9 stops before the next P-rule's write); `record` is P4's `{ repository, version,
 * commit }`. CW-E10 for a `PristineError`, CW-E09 for a file-system error, each through
 * `failWithCleanup`; anything else (including a `SignalAbort` from `guard.throwIfRaised()`) is
 * rethrown, uncaught. Returns `true` on success, `false` after the message is printed and
 * `tmpDir` removed. */
export async function applyPristine({ io, deps, t2, guard, tmpDir, record }) {
  try {
    await applyChangelog(deps.fs, tmpDir)
    guard.throwIfRaised()
    await applyOpenQuestions(deps.fs, tmpDir)
    guard.throwIfRaised()
    await applyPackageJson(deps.fs, tmpDir)
    guard.throwIfRaised()
    await writeRangeJson(deps.fs, tmpDir, record)
    guard.throwIfRaised()
  } catch (err) {
    if (err instanceof PristineError) {
      await failWithCleanup(io, deps, tmpDir, t2['CW-E10']({ file: err.file, rule: err.rule }))
      return false
    }
    if (isFileSystemError(err)) {
      await failWithCleanup(io, deps, tmpDir, t2['CW-E09']({ path: err.reportPath ?? tmpDir, detail: err.message }))
      return false
    }
    throw err
  }
  return true
}
