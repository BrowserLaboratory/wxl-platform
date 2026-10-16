#!/usr/bin/env node
// create-wxl's real entry point (0005-S1, traceability.md "Step order" row 1 and "Signals"):
// `npm create wxl` / `pnpm create wxl` runs this file. Checks `process.versions.node` BEFORE
// importing anything else (a too-old Node must not crash trying to parse a later module instead
// of reporting CW-E01 cleanly); everything else is imported dynamically only after that check.
//
// Step 2's package source record check (`dist/source.json`'s fields and the engine's hash) lives
// entirely inside `run()`'s own step 2 (`src/run.mjs`), not here: this file's own `try`/`catch`
// below only covers LOADING `dist/` -- a missing file, invalid JSON, or an engine that fails to
// import at all (a syntax error) -- and turns any of those into `source: null`, `engine:
// undefined`. `run()` then does argv parsing, the `--no-setup` conflict check and
// `CREATE_WXL_COMMIT`'s grammar BEFORE it ever looks at `source` (Command grammar: "Argument
// errors are checked before the package source record"), so an argument error still wins over a
// broken package (AC-2); when `source` is null, `run()`'s own step 2 fails closed and prints
// CW-E13 itself, in the environment's language -- this file never prints CW-E13 on its own.

// Used only for the pre-import version gate below (step 1 must run before any project-local
// module loads); once that gate passes, the REAL minimum (`src/node-version.mjs`) is what every
// later check uses. Kept distinct so this literal is never mistaken for the one source of truth.
const MINIMUM_NODE_VERSION_FALLBACK = [22, 6, 0]

function isNodeVersionOkInline(version, minimum = MINIMUM_NODE_VERSION_FALLBACK) {
  if (!/^\d+(\.\d+)*$/.test(version)) return false
  const parts = version.split('.').map(Number)
  for (let i = 0; i < minimum.length; i++) {
    const have = parts[i] ?? 0
    const want = minimum[i]
    if (have > want) return true
    if (have < want) return false
  }
  return true
}

/** The too-old-Node report (step 1's own failure): reuses `node-version.mjs`'s real minimum and
 * `messages.mjs`'s real CW-E01 text through `language.mjs`'s real language rule, instead of
 * hand-duplicating any of the three (S-03: one place for the minimum and the text; S-04: the
 * same LC_ALL/LC_MESSAGES/LANG-then-Intl fallback `language.mjs` uses, not a shorter hand-rolled
 * one that stops at `'en'`). Importing these three now is safe: the version decision itself is
 * already made; this import is only to report it correctly. A Node so old even these tiny,
 * dependency-free modules fail to load falls back to a hand-written, best-effort English line. */
async function reportNodeTooOld(version) {
  let text
  try {
    const [{ MINIMUM_NODE_VERSION }, { selectLanguage }, { messages }] = await Promise.all([
      import('../src/node-version.mjs'),
      import('../src/language.mjs'),
      import('../src/messages.mjs'),
    ])
    const lang = selectLanguage({ env: process.env })
    text = messages[lang]['CW-E01']({ running: version, minimum: MINIMUM_NODE_VERSION })
  } catch {
    const minimum = MINIMUM_NODE_VERSION_FALLBACK.join('.')
    text = `CW-E01: the running Node.js "${version}" is older than the minimum "${minimum}"; install a newer Node.js from https://nodejs.org/.`
  }
  process.stderr.write(text + '\n')
}

async function main() {
  // Step 1: before importing anything else.
  if (!isNodeVersionOkInline(process.versions.node)) {
    await reportNodeTooOld(process.versions.node)
    process.exitCode = 1
    return
  }

  const { pathToFileURL, fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const fsp = await import('node:fs/promises')
  const { readFile } = fsp

  const { run } = await import('../src/run.mjs')
  const { createSpawnGitRunner } = await import('../src/git-runner.mjs')

  const here = dirname(fileURLToPath(import.meta.url))
  const packageRoot = dirname(here)

  // Step 2's load (this file's own catch, traceability.md "Step order" row 2): a missing
  // `dist/source.json`, invalid JSON, a missing `dist/fork-init.mjs`, or an engine that fails to
  // import (a syntax error) -- any of these leaves `source` null and `engine` undefined, so
  // `run()`'s own step 2 (`validateSourceRecord`) fails closed without ever touching `engine`.
  let source = null
  let engine
  try {
    const sourceText = await readFile(join(packageRoot, 'dist', 'source.json'), 'utf8')
    source = JSON.parse(sourceText)
    engine = await import(pathToFileURL(join(packageRoot, 'dist', 'fork-init.mjs')).href)
  } catch {
    source = null
    engine = undefined
  }

  const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))

  const deps = {
    env: process.env,
    cwd: process.cwd(),
    nodeVersion: process.versions.node,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    packageVersion: packageJson.version,
    source,
    engine,
    engineFile: join(packageRoot, 'dist', 'fork-init.mjs'),
    fetchArchive: async (repository, ref, { signal } = {}) => {
      const response = await fetch(`https://codeload.github.com/${repository}/tar.gz/${ref}`, { signal })
      const body = new Uint8Array(await response.arrayBuffer())
      return { status: response.status, body }
    },
    downloadTimeoutMs: 120000,
    runGit: createSpawnGitRunner(),
    fs: fsp,
    // `process` itself is `deps.signals` (the seam's own dependency list, traceability.md
    // 0005-S1): `createSignalGuard` (run.mjs, from step 3 on) registers its own listeners
    // directly on it and removes them once `run` returns, so Node's default SIGINT/SIGTERM/SIGHUP
    // termination holds before step 3 and after `run` returns -- this file never registers a
    // listener of its own to re-emit from (that used to suppress the default termination for the
    // whole run, including steps 1-2, and leave it suppressed after `run` returned). The readline
    // forwarder (`questions.mjs`) already does `deps.signals.emit('SIGINT')`, which is a real
    // `process.emit('SIGINT')` here, reaching the guard's own listener the same way an actual
    // signal would.
    signals: process,
    checkpoint: () => {},
  }

  const io = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    interactive: Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY),
  }

  const argv = process.argv.slice(2)
  // `process.exitCode` (not `process.exit`): the latter can truncate output still buffered on a
  // piped stdout/stderr.
  process.exitCode = await run(argv, io, deps)
}

// traceability.md "Signals": "An error that is none of the CW codes (a bug) ... is printed as
// CW-E14 ... and exits 1" -- `run()` already does this for everything inside its own body; this
// is the same rule for everything OUTSIDE it (reading `package.json`, `process.cwd()`, the
// dynamic imports above, ...), which used to become an unhandled rejection printing Node's own
// raw stack trace instead.
main().catch(async (err) => {
  let text
  try {
    const [{ selectLanguage }, { messages }] = await Promise.all([import('../src/language.mjs'), import('../src/messages.mjs')])
    const lang = selectLanguage({ env: process.env })
    text = messages[lang]['CW-E14']({ message: err?.message ?? String(err) })
  } catch {
    text = `CW-E14: an unexpected error happened: ${JSON.stringify(err?.message ?? String(err))}.`
  }
  process.stderr.write(text + '\n')
  process.exitCode = 1
})
