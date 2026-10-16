import { dirname, join, resolve as resolvePath } from 'node:path'
import { createHash } from 'node:crypto'
import { messages } from './messages.mjs'
import { selectLanguage } from './language.mjs'
import { parseArchive } from './archive.mjs'
import { parseArgvStrict, ArgvError, SETUP_FLAG_NAMES } from './argv.mjs'
import { checkTarget, extractEntries, moveIntoPlace } from './fsops.mjs'
import { applyChangelog, applyOpenQuestions, applyPackageJson, writeRangeJson } from './pristine.mjs'
import { isNodeVersionOk, MINIMUM_NODE_VERSION } from './node-version.mjs'

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
 * create-wxl's one exported seam (0005-S1): the `--no-setup` happy path through the Step order
 * table's steps 1-4, 6-10 and 13. Setup (steps 5, 11, 12), strict archive entry-rule validation,
 * signals and most failure-path messages belong to later tickets (T-0021-T-0024) and are not
 * implemented here.
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

  deps.checkpoint('step-3')
  const directory = parsed.directory
  const target = resolvePath(deps.cwd, directory)

  deps.checkpoint('step-4')

  const rejection = await checkTarget(deps, target)
  if (rejection) {
    io.stderr.write(t2['CW-E04']({ path: target, conditionId: rejection.id, detail: rejection.detail }) + '\n')
    return 1
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
  const { entries } = await parseArchive(body)

  deps.checkpoint('step-8')
  const tmpDir = await deps.fs.mkdtemp(join(dirname(target), '.create-wxl-'))
  await extractEntries(deps, entries, tmpDir)

  deps.checkpoint('step-9')
  await applyChangelog(deps.fs, tmpDir)
  await applyOpenQuestions(deps.fs, tmpDir)
  await applyPackageJson(deps.fs, tmpDir)
  await writeRangeJson(deps.fs, tmpDir, {
    repository: deps.source.repository,
    version: deps.source.version,
    commit,
  })

  deps.checkpoint('step-10')
  await moveIntoPlace(deps, tmpDir, target)

  deps.checkpoint('step-13')
  io.stdout.write(t2['N1']({ directory }) + '\n')
  io.stdout.write(t2['N8']() + '\n')
  return 0
}
