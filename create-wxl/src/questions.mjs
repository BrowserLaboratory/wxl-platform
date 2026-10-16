// The interactive question machinery (traceability.md "Setup questions", step 3 and step 5):
// one `readline` interface per run, created on first use and closed before `run` returns (so a
// `--no-setup` run, or one with every flag given, never touches `io.stdin` at all); the EOF
// sentinel `run.mjs` turns into CW-E15; and the summary's yes/no/second-pass classification (S6).

import { createInterface } from 'node:readline'
import { SignalAbort } from './signals.mjs'

export class QuestionEofError extends Error {
  constructor() {
    super('input ended while a question was open')
    this.name = 'QuestionEofError'
  }
}

/**
 * `ask()` resolves to the next line `io.stdin` writes, after calling `deps.checkpoint('question')`
 * (the test driver uses that call to schedule the next scripted line); it rejects with
 * `QuestionEofError` when `io.stdin` ends (EOF) before a line arrives, including when it had
 * already ended before this `ask()` call. `close()` is idempotent and distinguishes itself
 * closing the `readline` interface from the stream's own EOF, so a run that never asks a second
 * question after EOF does not also reject that EOF on the interface's own `close` event.
 *
 * The `readline` interface's own `line` listener is resident (attached once, for the life of the
 * interface), not attached only while a question is open: `readline`, in non-terminal mode, emits
 * every complete line already sitting in one input chunk synchronously, one after another, so a
 * line arriving before the NEXT `ask()` call had the chance to attach its own listener would
 * otherwise be silently dropped (P-18/C-05) -- type-ahead or a multi-line paste on the real
 * terminal, or, in a test, several scripted answers written in one chunk. A line that arrives with
 * no question open is queued; `ask()` takes the queue's head first, only waiting when the queue is
 * empty.
 */
export function makeQuestioner(io, deps, guard) {
  let rl = null
  let closedByUs = false
  let ended = false
  const queue = []
  let pending = null

  function ensureRl() {
    if (rl) return
    rl = createInterface({ input: io.stdin })
    // traceability.md "Signals": "the bin ... forwards a readline interface's own SIGINT event to
    // the same handler, so Ctrl-C at a question ends the run instead of pausing it". `readline`
    // itself only emits this on a real TTY; `deps.signals.emit('SIGINT')` (the bin, or a test) is
    // the one path this module relies on, but forwarding `rl`'s own event keeps that promise
    // explicit here, not just in the bin.
    rl.on('SIGINT', () => deps.signals.emit('SIGINT'))
    rl.on('line', (line) => {
      if (pending) {
        const { resolve } = pending
        pending = null
        guard?.clearWait() // S-17: settled by a line, not a signal -- the pending slot is done
        resolve(line)
      } else {
        queue.push(line)
      }
    })
    rl.on('close', () => {
      ended = true
      if (pending) {
        const { reject } = pending
        pending = null
        guard?.clearWait() // S-17: settled by EOF, not a signal
        if (!closedByUs) reject(new QuestionEofError())
      }
    })
  }

  function ask() {
    deps.checkpoint('question')
    // A signal already raised by the time this question starts (T-0024's checkpoint-driven
    // tests): reject immediately, never waiting on `io.stdin` at all.
    if (guard?.raised()) return Promise.reject(new SignalAbort(guard.raised()))
    ensureRl()
    if (queue.length > 0) return Promise.resolve(queue.shift())
    if (ended || io.stdin.readableEnded) return Promise.reject(new QuestionEofError())
    return new Promise((resolve, reject) => {
      pending = { resolve, reject }
      // A signal arriving while this question is already pending (decision 4): the guard calls
      // this the moment it is raised, rejecting the same way EOF does above.
      guard?.waitForSignal((err) => {
        pending = null
        reject(err)
      })
    })
  }

  function close() {
    closedByUs = true
    guard?.clearWait()
    if (rl) rl.close()
  }

  return { ask, close }
}

/** S6 (traceability.md): trimmed, compared case-insensitively. Empty or `y`/`yes` -> proceed;
 * `n`/`no` -> second pass; anything else -> invalid (asked again). */
export function classifySummaryAnswer(raw) {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed === '' || trimmed === 'y' || trimmed === 'yes') return 'proceed'
  if (trimmed === 'n' || trimmed === 'no') return 'second-pass'
  return 'invalid'
}

// Step 5's engine argv order (traceability.md "Step order", row 5): author, repo, host, origin,
// site-name. `site-name`'s flag/answer key uses the hyphenated form the Command grammar and the
// engine's own argv both use.
const ENGINE_ARGV_ORDER = ['author', 'repo', 'host', 'origin', 'site-name']

/** Builds `--flag=value` items in the fixed order, verbatim, omitting any flag not present. */
export function buildEngineArgv(flags) {
  return ENGINE_ARGV_ORDER.filter((name) => name in flags).map((name) => `--${name}=${flags[name]}`)
}

/** CW-E05 (traceability.md "Error and warning codes"): `--author`, `--repo`, `--host` always
 * required; `--origin` only when `--host` is EXACTLY `cloudflare-pages` (Command grammar: flag
 * values are verbatim, so this is a plain string compare, never case-insensitive). */
export function missingRequiredFlags(flags) {
  const missing = []
  if (!('author' in flags)) missing.push('author')
  if (!('repo' in flags)) missing.push('repo')
  if (!('host' in flags)) missing.push('host')
  if (flags.host === 'cloudflare-pages' && !('origin' in flags)) missing.push('origin')
  return missing
}

// ─── interactive setup questions (S1-S6) ──────────────────────────────────────────────────────

const FIELD_FLAG_NAME = { author: 'author', repo: 'repo', host: 'host', origin: 'origin', siteName: 'site-name' }
const FIELD_ORDER = ['author', 'repo', 'host', 'origin', 'siteName']

function currentToFlags(current) {
  const flags = {}
  for (const field of FIELD_ORDER) {
    if (current[field] !== undefined) flags[FIELD_FLAG_NAME[field]] = current[field]
  }
  return flags
}

/** S3's mapping (traceability.md "Setup questions"): `1`, `2`, `github-pages`, `cloudflare-pages`
 * (case-insensitive, already trimmed by the caller) map to the canonical host value; anything
 * else is not a valid answer. Only applied to a TYPED answer -- Enter reuses `current.host`
 * verbatim, whatever form it is already in (a flag's raw value, or an earlier mapped answer). */
function mapHostAnswer(trimmed) {
  const lower = trimmed.toLowerCase()
  if (trimmed === '1' || lower === 'github-pages') return 'github-pages'
  if (trimmed === '2' || lower === 'cloudflare-pages') return 'cloudflare-pages'
  return null
}

/** Asks one field's question, re-asking on an invalid answer (printing why first), and returns
 * the accepted value. Enter keeps `current[field]` verbatim (decision C: a default that came
 * from a flag is never re-trimmed or re-mapped); a non-empty answer is trimmed, then validated
 * (and, for `host`, mapped). `origin`/`siteName` accept a lone `-` to clear the current answer
 * (traceability.md "Setup questions": "A single `-` answered to S4 or S5 clears the current
 * answer"). */
async function askField(io, t, questioner, field, current) {
  const promptId = { author: 'S1', repo: 'S2', host: 'S3', origin: 'S4', siteName: 'S5' }[field]
  const allowClear = field === 'origin' || field === 'siteName'

  while (true) {
    io.stdout.write(t[promptId]() + '\n')
    const raw = await questioner.ask()
    const trimmed = raw.trim()

    let candidate
    if (trimmed === '') {
      candidate = current[field]
    } else if (allowClear && trimmed === '-') {
      candidate = undefined
    } else {
      candidate = trimmed
    }

    if (field === 'host' && trimmed !== '') {
      const mapped = mapHostAnswer(trimmed)
      if (mapped === null) {
        io.stdout.write(t['S3-INVALID']({ value: trimmed }) + '\n')
        continue
      }
      candidate = mapped
    }

    if ((field === 'author' || field === 'repo') && (candidate === undefined || candidate === '')) {
      io.stdout.write(t[field === 'author' ? 'S1-EMPTY' : 'S2-EMPTY']() + '\n')
      continue
    }

    if (field === 'origin' && current.host === 'cloudflare-pages' && (candidate === undefined || candidate === '')) {
      io.stdout.write(t['S4-REQUIRED']() + '\n')
      continue
    }

    return candidate
  }
}

/** S6: each answer, and the short-link origin the engine will write (traceability.md "Setup
 * questions"): the parsed args' `origin` when present, else `deriveGithubPagesOrigin(repo)` for
 * GitHub Pages. */
function printSummary(io, t, deps, current, parsedArgs) {
  io.stdout.write(t['S6-AUTHOR']({ value: current.author }) + '\n')
  io.stdout.write(t['S6-REPO']({ value: current.repo }) + '\n')
  io.stdout.write(t['S6-HOST']({ value: current.host }) + '\n')
  if (current.origin !== undefined) {
    io.stdout.write(t['S6-ORIGIN-ANSWER']({ value: current.origin }) + '\n')
  }
  const origin =
    parsedArgs.origin !== undefined
      ? parsedArgs.origin
      : parsedArgs.host === 'github-pages'
        ? deps.engine.deriveGithubPagesOrigin(parsedArgs.repo)
        : undefined
  if (origin !== undefined) {
    io.stdout.write(t['S6-ORIGIN']({ origin }) + '\n')
  }
  if (current.siteName !== undefined) {
    io.stdout.write(t['S6-SITE-NAME']({ value: current.siteName }) + '\n')
  }
  io.stdout.write(t['S6']() + '\n')
}

/**
 * Steps 3-5's setup-questions orchestration, interactive branch (traceability.md "Setup
 * questions"). First pass asks only the questions whose flag was not given; an engine rejection
 * or a summary `n` starts a second pass that asks every question S1-S5, with the current answers
 * as defaults regardless of flags. Returns the last `parseForkInitArgs` result once the summary
 * is accepted (empty, `y` or `yes`); throws `QuestionEofError` on EOF, or rethrows anything that
 * is not `deps.engine.ForkInitArgError`.
 */
export async function collectInteractiveAnswers(io, deps, t, flags, questioner) {
  const current = {
    author: flags.author,
    repo: flags.repo,
    host: flags.host !== undefined ? flags.host : 'github-pages',
    origin: flags.origin,
    siteName: flags['site-name'],
  }
  let pass = 1

  outer: for (;;) {
    const fields = pass === 1 ? FIELD_ORDER.filter((field) => !(FIELD_FLAG_NAME[field] in flags)) : FIELD_ORDER
    for (const field of fields) {
      current[field] = await askField(io, t, questioner, field, current)
    }

    const argv = buildEngineArgv(currentToFlags(current))
    let parsedArgs
    try {
      parsedArgs = deps.engine.parseForkInitArgs(argv)
    } catch (err) {
      if (err instanceof deps.engine.ForkInitArgError) {
        io.stdout.write(t['ENGINE-REJECTED']({ message: err.message }) + '\n')
        pass = 2
        continue outer
      }
      throw err
    }

    for (;;) {
      printSummary(io, t, deps, current, parsedArgs)
      const raw = await questioner.ask()
      const classification = classifySummaryAnswer(raw)
      if (classification === 'proceed') return { parsedArgs, argv }
      if (classification === 'second-pass') {
        pass = 2
        continue outer
      }
      io.stdout.write(t['S6-INVALID']() + '\n')
    }
  }
}
