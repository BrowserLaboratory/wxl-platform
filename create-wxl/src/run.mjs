import { dirname, join, resolve as resolvePath } from 'node:path'
import { createHash } from 'node:crypto'
import { messages } from './messages.mjs'
import { jsonValue } from './text.mjs'
import { selectLanguage } from './language.mjs'
import { parseArchive, ArchiveParseError } from './archive.mjs'
import { checkEntryRules, ArchiveRuleError } from './archive-rules.mjs'
import { parseArgvStrict, ArgvError, SETUP_FLAG_NAMES } from './argv.mjs'
import { checkTarget, extractEntries, moveIntoPlace } from './fsops.mjs'
import { applyChangelog, applyOpenQuestions, applyPackageJson, writeRangeJson, PristineError } from './pristine.mjs'
import { isNodeVersionOk, MINIMUM_NODE_VERSION } from './node-version.mjs'
import { makeQuestioner, QuestionEofError, buildEngineArgv, missingRequiredFlags, collectInteractiveAnswers } from './questions.mjs'
import { runGitSteps } from './git-steps.mjs'
import { buildNextSteps } from './next-steps.mjs'

const VERSION_RE = /^\d+\.\d+\.\d+$/
const COMMIT_RE = /^[0-9a-f]{40}$/

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
 * create-wxl's one exported seam (0005-S1): the Step order table's steps 1-13. Step 7's
 * strict parse and entry rules 1-5 (CW-E08) and step 9's pristine-rule failures (CW-E10, with the
 * run's own temporary directory removed) are T-0021's. T-0022 adds step 3's interactive directory
 * question and its step-4 re-ask, step 5's setup questions (interactive and non-interactive) and
 * step 11's engine apply (CW-E12, warnings). T-0023 adds step 12 (git steps, CW-W01-W03) and step
 * 13's "Next steps" lines. Signals and the remaining failure-path messages (CW-E09, CW-E11,
 * CW-E14) belong to T-0024 and are not implemented here.
 */
export async function run(argv, io, deps) {
  // CW-E01 and CW-E02 use the environment language rule only (traceability.md "Language"): they
  // happen before or during parsing, so a `--lang` flag cannot select their table yet.
  const envLang = selectLanguage(deps)
  const t = messages[envLang]

  // Step 1: Node version, before anything else (including argv parsing).
  if (!isNodeVersionOk(deps.nodeVersion)) {
    io.stderr.write(t['CW-E01']({ running: deps.nodeVersion, minimum: MINIMUM_NODE_VERSION }) + '\n')
    return 1
  }

  let parsed
  try {
    parsed = parseArgvStrict(argv)
  } catch (err) {
    if (err instanceof ArgvError) {
      io.stderr.write(t['CW-E02']({ value: err.token, usage: err.usage, reason: err.reason }) + '\n')
      return 1
    }
    throw err
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
    io.stderr.write(t['CW-E02']({ value: 'CREATE_WXL_COMMIT', usage: false, reason: 'bad-env' }) + '\n')
    return 1
  }

  if (!(await validateSourceRecord(deps))) {
    io.stderr.write(t['CW-E13']() + '\n')
    return 1
  }

  // From here on, a valid `--lang` (now that argv has parsed) selects the table.
  const t2 = messages[selectLanguage(deps, parsed.lang)]

  const questioner = makeQuestioner(io, deps)
  try {
    return await runSteps(parsed, io, deps, t2, questioner, { hasOverride, overrideRaw })
  } catch (err) {
    if (err instanceof QuestionEofError) {
      io.stderr.write(t2['CW-E15']() + '\n')
      return 1
    }
    throw err
  } finally {
    questioner.close()
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

async function runSteps(parsed, io, deps, t2, questioner, { hasOverride, overrideRaw }) {
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

  const printCwE04 = (rejectionToPrint) =>
    io.stderr.write(t2['CW-E04']({ path: target, conditionId: rejectionToPrint.id, detail: rejectionToPrint.detail }) + '\n')

  let rejection = await checkTarget(deps, target)
  while (rejection && askedDirectory) {
    printCwE04(rejection)
    directory = await askDirectory(io, t2, questioner)
    target = resolvePath(deps.cwd, directory)
    rejection = await checkTarget(deps, target)
  }
  if (rejection) {
    printCwE04(rejection)
    return 1
  }

  let setupArgs = null
  let setupArgv = null
  if (!parsed.noSetup) {
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
  if (hasOverride) {
    io.stderr.write(t2['CW-W04']({ commit }) + '\n')
  }
  const url = `https://codeload.github.com/${deps.source.repository}/tar.gz/${commit}`
  const controller = new AbortController()
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
    const detail = timedOut ? { kind: 'timeout' } : { kind: 'error', message: err?.message ?? String(err) }
    io.stderr.write(t2['CW-E07']({ url, detail }) + '\n')
    return 1
  } finally {
    clearTimeout(timer)
  }

  if (status !== 200) {
    io.stderr.write(t2['CW-E07']({ url, detail: { kind: 'status', status } }) + '\n')
    return 1
  }

  deps.checkpoint('step-7')
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
  const tmpDir = await deps.fs.mkdtemp(join(dirname(target), '.create-wxl-'))
  await extractEntries(deps, validatedEntries, tmpDir)

  deps.checkpoint('step-9')
  try {
    await applyChangelog(deps.fs, tmpDir)
    await applyOpenQuestions(deps.fs, tmpDir)
    await applyPackageJson(deps.fs, tmpDir)
    await writeRangeJson(deps.fs, tmpDir, {
      repository: deps.source.repository,
      version: deps.source.version,
      commit,
    })
  } catch (err) {
    if (err instanceof PristineError) {
      io.stderr.write(t2['CW-E10']({ file: err.file, rule: err.rule }) + '\n')
      await deps.fs.rm(tmpDir, { recursive: true, force: true })
      return 1
    }
    throw err
  }

  deps.checkpoint('step-10')
  await moveIntoPlace(deps, tmpDir, target)

  if (!parsed.noSetup) {
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
    gitResult = await runGitSteps({ runGit: deps.runGit, cwd: target, env: deps.env, version: deps.source.version })
  }
  if (gitResult.warningId) {
    io.stderr.write(t2[gitResult.warningId](gitResult) + '\n')
  }

  deps.checkpoint('step-13')
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
