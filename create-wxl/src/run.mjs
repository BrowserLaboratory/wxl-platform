import { dirname, join, resolve as resolvePath } from 'node:path'
import { createHash } from 'node:crypto'
import { messages, cwE12FinishingCommandsList } from './messages.mjs'
import { jsonValue } from './text.mjs'
import { selectLanguage } from './language.mjs'
import { parseArchive, ArchiveParseError } from './archive.mjs'
import { checkEntryRules, ArchiveRuleError } from './archive-rules.mjs'
import { parseArgvStrict, ArgvError, SETUP_FLAG_NAMES } from './argv.mjs'
import { checkTarget, extractEntries, moveIntoPlace, MoveIntoPlaceError } from './fsops.mjs'
import { applyChangelog, applyOpenQuestions, applyPackageJson, writeRangeJson, PristineError } from './pristine.mjs'
import { isNodeVersionOk, MINIMUM_NODE_VERSION } from './node-version.mjs'
import { makeQuestioner, QuestionEofError, buildEngineArgv, missingRequiredFlags, collectInteractiveAnswers } from './questions.mjs'
import { runGitSteps, orderedPrintedForms } from './git-steps.mjs'
import { buildNextSteps } from './next-steps.mjs'
import { createSignalGuard, SignalAbort } from './signals.mjs'

const VERSION_RE = /^\d+\.\d+\.\d+$/
const COMMIT_RE = /^[0-9a-f]{40}$/

/** S-20: the one place every "print a failure line, then remove the temporary directory this run
 * created, then fail" sequence lives (steps 8-10's CW-E09/CW-E10/CW-E04 branches, and the
 * generic bug/signal catch, each used to repeat this pair of calls for itself). */
async function removeTmpDir(deps, tmpDir) {
  await deps.fs.rm(tmpDir, { recursive: true, force: true })
}

async function failWithCleanup(io, deps, tmpDir, line) {
  io.stderr.write(line + '\n')
  await removeTmpDir(deps, tmpDir)
  return 1
}

/** CW-E09 (steps 8-9) vs. CW-E14 (a bug): a real file-system error carries a string `code` that
 * does NOT start with `ERR_` (review finding C-12) -- Node's own argument-validation errors
 * (`ERR_INVALID_ARG_TYPE`, `ERR_INVALID_ARG_VALUE`, `ERR_OUT_OF_RANGE`, ...) also carry a string
 * `code`, but they are a programming bug in this codebase, not an environment problem to report
 * as CW-E09. */
function isFileSystemError(err) {
  return typeof err?.code === 'string' && !err.code.startsWith('ERR_')
}

/** Step 2's package source record check (D2): `deps.engineFile` is read through `deps.fs` and its
 * SHA-256 compared with `source.engineSha256`. */
async function validateSourceRecord(deps) {
  const source = deps.source
  if (!source || typeof source !== 'object') return false
  if (source.repository !== deps.engine.UPSTREAM_SLUG) return false
  if (typeof source.version !== 'string' || source.version !== deps.packageVersion) return false
  if (!VERSION_RE.test(source.version)) return false
  if (typeof source.commit !== 'string' || !COMMIT_RE.test(source.commit)) return false

  let engineBytes
  try {
    engineBytes = await deps.fs.readFile(deps.engineFile)
  } catch {
    return false
  }
  const actualSha256 = createHash('sha256').update(engineBytes).digest('hex')
  return actualSha256 === source.engineSha256
}

/**
 * create-wxl's one exported seam (0005-S1): the Step order table's steps 1-13, every signal
 * window (traceability.md "Signals"), and the full set of failure-path messages (CW-E09,
 * CW-E11, CW-E14, CW-W05).
 */
export async function run(argv, io, deps) {
  // traceability.md "Signals": "errors writing the messages are ignored". Without a listener, a
  // `Writable`'s own `write` error is an unhandled `'error'` event (an uncaught exception), not a
  // rejection any `await` here could catch; a no-op listener is the only way to ignore it.
  // S-30: removed in `finally` below, so a run never leaves a listener behind on `io`'s streams.
  const ignoreWriteError = () => {}
  io.stdout.on('error', ignoreWriteError)
  io.stderr.on('error', ignoreWriteError)
  try {
    return await runBody(argv, io, deps)
  } finally {
    // A `Writable`'s own `write` error is emitted on a later tick (`process.nextTick`), not
    // synchronously from `write()` -- removing the listener right away could drop it before it
    // fires, turning the very error this listener exists to ignore back into an uncaught
    // exception. One `setImmediate` tick runs after any already-scheduled `nextTick` callback.
    await new Promise((resolve) => setImmediate(resolve))
    io.stdout.removeListener('error', ignoreWriteError)
    io.stderr.removeListener('error', ignoreWriteError)
  }
}

async function runBody(argv, io, deps) {
  // CW-E01 and CW-E02 use the environment language rule only (traceability.md "Language"): they
  // happen before or during parsing, so a `--lang` flag cannot select their table yet.
  const envLang = selectLanguage(deps)
  const t = messages[envLang]

  // Step 1: Node version, before anything else (including argv parsing).
  if (!isNodeVersionOk(deps.nodeVersion)) {
    io.stderr.write(t['CW-E01']({ running: deps.nodeVersion, minimum: MINIMUM_NODE_VERSION }) + '\n')
    return 1
  }

  // traceability.md "Signals": "an error that is none of the CW codes (a bug) ... is printed as
  // CW-E14 ... and exits 1" -- steps 1-2 (before `runSteps`, which has its own such catch) need
  // the same fallback, in the environment language (no `--lang` is parsed yet).
  let parsed
  try {
    parsed = parseArgvStrict(argv)
  } catch (err) {
    if (err instanceof ArgvError) {
      io.stderr.write(t['CW-E02']({ value: err.token, usage: err.usage, reason: err.reason }) + '\n')
      return 1
    }
    io.stderr.write(t['CW-E14']({ message: err?.message ?? String(err) }) + '\n')
    return 1
  }
  if (parsed.noSetup) {
    const presentSetupFlag = SETUP_FLAG_NAMES.find((name) => name in parsed.flags)
    if (presentSetupFlag) {
      io.stderr.write(
        t['CW-E02']({ value: `--${presentSetupFlag}`, usage: false, reason: 'conflicts-with-no-setup' }) + '\n',
      )
      return 1
    }
  }

  const overrideRaw = deps.env.CREATE_WXL_COMMIT
  const hasOverride = typeof overrideRaw === 'string' && overrideRaw !== ''
  if (hasOverride && !COMMIT_RE.test(overrideRaw)) {
    io.stderr.write(t['CW-E02']({ value: 'CREATE_WXL_COMMIT', usage: false, reason: 'bad-env', badValue: overrideRaw }) + '\n')
    return 1
  }

  if (!(await validateSourceRecord(deps))) {
    io.stderr.write(t['CW-E13']() + '\n')
    return 1
  }

  // From here on, a valid `--lang` (now that argv has parsed) selects the table.
  const lang2 = selectLanguage(deps, parsed.lang)
  const t2 = messages[lang2]

  // The guard is created here and passed down (T-0024 ticket Comments, "increment plan
  // confirmed"), so every window below throwing/catching `SignalAbort` shares the same one, and
  // its listeners come off `deps.signals` exactly once, however `runSteps` returns.
  const guard = createSignalGuard(deps.signals, ['SIGINT', 'SIGTERM', 'SIGHUP'])
  const questioner = makeQuestioner(io, deps, guard)
  try {
    return await runSteps(parsed, io, deps, t2, lang2, questioner, guard, { hasOverride, overrideRaw })
  } catch (err) {
    if (err instanceof QuestionEofError) {
      io.stderr.write(t2['CW-E15']() + '\n')
      return 1
    }
    throw err
  } finally {
    questioner.close()
    guard.off()
  }
}

/** Step 3/4's directory question (S-12): asks once, re-asking on its own (printing the `~` reason,
 * traceability.md "Step order" row 3) until it has an answer that does not begin with `~`. Never
 * touches `checkTarget`, so the step-4 re-ask loop that calls this only prints CW-E04 for a
 * rejection `checkTarget` itself returned, never for a stale one left over from a `~` answer
 * (S-13/P-17/C-06). */
async function askDirectory(io, t2, questioner) {
  while (true) {
    io.stdout.write(t2['Q-DIRECTORY']() + '\n')
    const raw = await questioner.ask()
    const answer = raw.trim() === '' ? 'wxl-range' : raw.trim()
    if (answer.startsWith('~')) {
      io.stdout.write(t2['Q-DIRECTORY-TILDE']() + '\n')
      continue
    }
    return answer
  }
}

async function runSteps(parsed, io, deps, t2, lang2, questioner, guard, { hasOverride, overrideRaw }) {
  // `tmpDir`, once step 8 creates it, is this function's one piece of cleanup state: a signal or a
  // "bug" (an error that is none of the expected CW conditions) caught below removes it, both
  // handled alike (traceability.md "Signals": "an error that is none of the CW codes ... is
  // handled like a signal in its window"). `remainingCommandsFn`, once step 11 starts, tells the
  // catch below which commands a bug in steps 11-13 still has to list (C-07/P-04/S-04: the same
  // decision (3) CW-W05 already follows for a signal in that window).
  let tmpDir = null
  let remainingCommandsFn = null
  try {
    return await runStepsBody(
      parsed,
      io,
      deps,
      t2,
      lang2,
      questioner,
      guard,
      { hasOverride, overrideRaw },
      (dir) => {
        tmpDir = dir
      },
      (fn) => {
        remainingCommandsFn = fn
      },
    )
  } catch (err) {
    if (err instanceof QuestionEofError) throw err
    if (tmpDir) await removeTmpDir(deps, tmpDir)
    if (err instanceof SignalAbort) return 130
    const remainingCommands = remainingCommandsFn ? remainingCommandsFn() : undefined
    io.stderr.write(t2['CW-E14']({ message: err?.message ?? String(err), remainingCommands }) + '\n')
    return 1
  }
}

async function runStepsBody(
  parsed,
  io,
  deps,
  t2,
  lang2,
  questioner,
  guard,
  { hasOverride, overrideRaw },
  setTmpDir,
  setRemainingCommandsFn,
) {
  deps.checkpoint('step-3')
  let directory = parsed.directory
  let askedDirectory = false
  if (directory === undefined) {
    if (io.interactive) {
      askedDirectory = true
      directory = await askDirectory(io, t2, questioner)
    } else {
      io.stderr.write(t2['CW-E03']() + '\n')
      return 1
    }
  }
  let target = resolvePath(deps.cwd, directory)

  deps.checkpoint('step-4')
  guard.throwIfRaised()

  const printCwE04 = (rejectionToPrint) =>
    io.stderr.write(t2['CW-E04']({ path: target, conditionId: rejectionToPrint.id, detail: rejectionToPrint.detail }) + '\n')

  let rejection = await checkTarget(deps, target)
  guard.throwIfRaised() // P-17/C-14: a signal already received wins over a rejection found after
  while (rejection && askedDirectory) {
    printCwE04(rejection)
    directory = await askDirectory(io, t2, questioner)
    target = resolvePath(deps.cwd, directory)
    rejection = await checkTarget(deps, target)
    guard.throwIfRaised()
  }
  if (rejection) {
    printCwE04(rejection)
    return 1
  }

  let setupArgs = null
  let setupArgv = null
  if (!parsed.noSetup) {
    deps.checkpoint('step-5')
    guard.throwIfRaised()
    if (!io.interactive) {
      const missing = missingRequiredFlags(parsed.flags)
      if (missing.length > 0) {
        io.stderr.write(t2['CW-E05']({ missing }) + '\n')
        return 1
      }
      setupArgv = buildEngineArgv(parsed.flags)
      try {
        setupArgs = deps.engine.parseForkInitArgs(setupArgv)
      } catch (err) {
        if (err instanceof deps.engine.ForkInitArgError) {
          io.stderr.write(t2['CW-E06']({ message: err.message }) + '\n')
          return 1
        }
        throw err
      }
    } else {
      ;({ parsedArgs: setupArgs, argv: setupArgv } = await collectInteractiveAnswers(io, deps, t2, parsed.flags, questioner))
    }
  }

  const commit = hasOverride ? overrideRaw : deps.source.commit

  deps.checkpoint('step-6')
  guard.throwIfRaised()
  if (hasOverride) {
    io.stderr.write(t2['CW-W04']({ commit }) + '\n')
  }
  const url = `https://codeload.github.com/${deps.source.repository}/tar.gz/${commit}`
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
    ;({ status, body } = await Promise.race([
      deps.fetchArchive(deps.source.repository, commit, { signal: controller.signal }),
      timeoutPromise,
    ]))
  } catch (err) {
    if (guard.raised()) throw new SignalAbort(guard.raised())
    const detail = timedOut ? { kind: 'timeout' } : { kind: 'error', message: err?.message ?? String(err) }
    io.stderr.write(t2['CW-E07']({ url, detail }) + '\n')
    return 1
  } finally {
    clearTimeout(timer)
    // S-17: step 6's own window has closed either way; this `AbortController` is no longer
    // useful to abort, so the callback is removed instead of lingering for the rest of the run.
    unsubscribeAbort()
  }

  guard.throwIfRaised() // P-17/C-14: a signal already received wins over a non-200 status
  if (status !== 200) {
    io.stderr.write(t2['CW-E07']({ url, detail: { kind: 'status', status } }) + '\n')
    return 1
  }

  deps.checkpoint('step-7')
  guard.throwIfRaised()
  let parsedArchive
  try {
    parsedArchive = await parseArchive(body)
  } catch (err) {
    if (err instanceof ArchiveParseError) {
      io.stderr.write(t2['CW-E08']({ parseError: err.message }) + '\n')
      return 1
    }
    throw err
  }
  let validatedEntries
  try {
    validatedEntries = checkEntryRules(parsedArchive, { commit })
  } catch (err) {
    if (err instanceof ArchiveRuleError) {
      io.stderr.write(t2['CW-E08']({ rule: err.rule, path: err.path, isCommentMarker: err.isCommentMarker }) + '\n')
      return 1
    }
    throw err
  }

  deps.checkpoint('step-8')
  guard.throwIfRaised()
  const parentDir = dirname(target)
  let tmpDir
  try {
    tmpDir = await deps.fs.mkdtemp(join(parentDir, '.create-wxl-'))
    setTmpDir(tmpDir)
  } catch (err) {
    if (isFileSystemError(err)) {
      io.stderr.write(t2['CW-E09']({ path: parentDir, detail: err.message }) + '\n')
      return 1 // mkdtemp itself failed: nothing was created, nothing to clean up
    }
    throw err
  }
  try {
    // S-19: `{ stopped: true }` (never a silent early return) is the one signal `extractEntries`
    // gives for "a signal arrived mid-extraction"; turned into the same `SignalAbort` every other
    // window throws, right here, instead of a separate check the caller could forget.
    const { stopped } = await extractEntries(deps, validatedEntries, tmpDir, { shouldStop: () => guard.isRaised() })
    if (stopped) throw new SignalAbort(guard.raised())
  } catch (err) {
    if (err instanceof SignalAbort) throw err
    if (isFileSystemError(err)) {
      return failWithCleanup(io, deps, tmpDir, t2['CW-E09']({ path: err.reportPath ?? tmpDir, detail: err.message }))
    }
    throw err
  }

  deps.checkpoint('step-9')
  guard.throwIfRaised()
  try {
    await applyChangelog(deps.fs, tmpDir)
    guard.throwIfRaised() // decision 6: a signal mid-step-9 stops before the next P-rule's write
    await applyOpenQuestions(deps.fs, tmpDir)
    guard.throwIfRaised()
    await applyPackageJson(deps.fs, tmpDir)
    guard.throwIfRaised()
    await writeRangeJson(deps.fs, tmpDir, {
      repository: deps.source.repository,
      version: deps.source.version,
      commit,
    })
    guard.throwIfRaised() // P-02/C-01: a signal during step 9's last write starts no step-10 work
  } catch (err) {
    if (err instanceof PristineError) {
      return failWithCleanup(io, deps, tmpDir, t2['CW-E10']({ file: err.file, rule: err.rule }))
    }
    if (isFileSystemError(err)) {
      return failWithCleanup(io, deps, tmpDir, t2['CW-E09']({ path: err.reportPath ?? tmpDir, detail: err.message }))
    }
    throw err
  }

  deps.checkpoint('step-10')
  guard.throwIfRaised() // P-02/C-01
  // Step 10's own re-check (traceability.md "Step order" row 10): another process may have created
  // something at the target since step 4. An empty directory is still accepted (moveIntoPlace's
  // existing-target branch handles it); anything else cleans up the temporary directory and reports
  // CW-E04 as step 4 would, instead of letting `rename` itself fail with an opaque ENOTDIR/ENOTEMPTY.
  const recheck = await checkTarget(deps, target)
  guard.throwIfRaised()
  if (recheck) {
    await removeTmpDir(deps, tmpDir)
    printCwE04(recheck)
    return 1
  }
  try {
    await moveIntoPlace(deps, tmpDir, target, { shouldStop: () => guard.isRaised() })
  } catch (err) {
    if (err instanceof MoveIntoPlaceError) {
      if (err.signaled) {
        // C-02/P-03/S-23: a stranded entry still keeps and names the temporary directory (the
        // same "kept and named" guarantee a non-signaled CW-E11 has); the signal still decides
        // the exit code (130), and `setTmpDir(null)` here stops the outer catch from deleting a
        // temporary directory `moveIntoPlace` deliberately kept.
        if (err.stranded.length > 0) {
          io.stderr.write(
            t2['CW-E11']({ target, detail: err.message, stranded: err.stranded, tmpDir: err.tmpDir }) + '\n',
          )
          setTmpDir(null)
          return 130
        }
        throw new SignalAbort(guard.raised())
      }
      io.stderr.write(
        t2['CW-E11']({ target, detail: err.message, stranded: err.stranded, tmpDir: err.tmpDir }) + '\n',
      )
      return 1
    }
    throw err
  }
  setTmpDir(null) // step 10 succeeded: the range stays on disk whatever happens from here on

  // Steps 11-13 (traceability.md "Signals"): a signal here is printed directly, inline (CW-W05),
  // instead of being thrown and routed through the generic `SignalAbort` catch above -- there is
  // no tmpDir cleanup left to do, and each of the three steps' CW-W05 names a different set of
  // remaining commands.
  // S-21: `lang2` is the language `selectLanguage` already picked in `run()`; reusing it here
  // avoids re-deriving the same answer from `t2`'s own object identity.
  const lang = lang2

  if (!parsed.noSetup) {
    deps.checkpoint('step-11')
    setRemainingCommandsFn(() =>
      cwE12FinishingCommandsList({ directory, argv: setupArgv, version: deps.source.version, lang }),
    )
    if (guard.raised()) {
      io.stderr.write(
        t2['CW-W05']({
          remainingCommands: cwE12FinishingCommandsList({
            directory,
            argv: setupArgv,
            version: deps.source.version,
            lang,
          }),
        }) +
          '\n',
      )
      return 130
    }
    // S-12: both CW-E12 call sites (the thrown-error and the non-zero-exitCode path) otherwise
    // repeat the same `{ directory, argv: setupArgv, version: deps.source.version }`.
    const printCwE12 = (message) =>
      io.stderr.write(t2['CW-E12']({ message, directory, argv: setupArgv, version: deps.source.version }) + '\n')
    let result
    try {
      result = deps.engine.runForkInit(setupArgs, { projectRoot: target })
    } catch (err) {
      printCwE12(err?.message ?? String(err))
      return 1
    }
    if (result.exitCode !== 0) {
      printCwE12(result.message)
      return 1
    }
    for (const warning of result.warnings) {
      io.stdout.write(jsonValue(warning) + '\n')
    }
  }

  let gitResult = { warningId: null }
  if (!parsed.noSetup) {
    deps.checkpoint('step-12')
    setRemainingCommandsFn(() => orderedPrintedForms(deps.source.version))
    if (guard.raised()) {
      io.stderr.write(t2['CW-W05']({ remainingCommands: orderedPrintedForms(deps.source.version) }) + '\n')
      return 130
    }
    gitResult = await runGitSteps({
      runGit: deps.runGit,
      cwd: target,
      env: deps.env,
      version: deps.source.version,
      shouldStop: () => guard.isRaised(),
    })
    if (gitResult.signal) {
      io.stderr.write(t2['CW-W05']({ remainingCommands: gitResult.remainingCommands }) + '\n')
      return 130
    }
  }
  if (gitResult.warningId) {
    io.stderr.write(t2[gitResult.warningId](gitResult) + '\n')
  }

  deps.checkpoint('step-13')
  setRemainingCommandsFn(() => [])
  if (guard.raised()) {
    io.stderr.write(t2['CW-W05']({ remainingCommands: [] }) + '\n')
    return 130
  }
  const nextSteps = buildNextSteps({
    t: t2,
    directory,
    noSetup: parsed.noSetup,
    parsedArgs: setupArgs,
    gitResult,
  })
  for (const line of nextSteps) {
    io.stdout.write(line + '\n')
  }
  return 0
}
