// Command grammar (traceability.md "Command grammar"): `parseArgvStrict` is the full grammar.
// The `--no-setup` + setup-flag rule (C03) is checked separately by `run.mjs`.

import { VERSION_RE, COMMIT_RE } from './patterns.mjs'

export class ArgvError extends Error {
  constructor(token, { usage = false, reason = 'unknown' } = {}) {
    super(`invalid argument: ${token}`)
    this.name = 'ArgvError'
    this.token = token
    this.usage = usage
    this.reason = reason
  }
}

const VALUE_FLAGS = new Set(['--author', '--repo', '--host', '--origin', '--site-name', '--lang'])
export const SETUP_FLAG_NAMES = ['author', 'repo', 'host', 'origin', 'site-name']

export function parseArgvStrict(argv) {
  const result = { directory: undefined, noSetup: false, lang: undefined, flags: {}, mode: undefined }
  const seen = new Set()
  let positionalCount = 0
  let endOfFlags = false
  // U02: every create-only flag seen, in argv order, whether before or after `upgrade` -- checked
  // once the loop ends (below), once `mode` is known for certain.
  const createOnlyFlagsSeen = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (!endOfFlags && arg === '--') {
      endOfFlags = true
      continue
    }

    if (!endOfFlags && (arg === '-h' || arg === '--help' || arg === '--version')) {
      throw new ArgvError(arg, { usage: true })
    }

    if (!endOfFlags && arg === '-') {
      throw new ArgvError(arg)
    }

    if (!endOfFlags && arg.startsWith('-')) {
      const eq = arg.indexOf('=')
      const name = eq === -1 ? arg : arg.slice(0, eq)
      const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1)

      if (name === '--no-setup') {
        if (eq !== -1) throw new ArgvError(arg)
        if (seen.has('--no-setup')) throw new ArgvError(arg, { reason: 'repeated' })
        seen.add('--no-setup')
        createOnlyFlagsSeen.push('--no-setup')
        result.noSetup = true
        continue
      }

      // Command grammar: "`--from` after `upgrade` only" (decision (2)) -- recognised only once
      // `upgrade` has already been read as the mode, using the same value-flag shape every other
      // VALUE_FLAGS member uses (repeated/missing-value/inline `=`); its value goes to
      // `result.from`, never `result.flags`, so it can never reach `buildEngineArgv`. Anywhere
      // else (before `upgrade`, or on the create path) it falls through to the unknown-flag throw
      // below, unchanged.
      if (name === '--from' && result.mode === 'upgrade') {
        if (seen.has('--from')) throw new ArgvError('--from', { reason: 'repeated' })
        seen.add('--from')

        let fromValue
        if (eq !== -1) {
          if (inlineValue === '') throw new ArgvError('--from', { reason: 'missing-value' })
          fromValue = inlineValue
        } else {
          const next = argv[i + 1]
          if (next === undefined || next.startsWith('-')) {
            throw new ArgvError('--from', { reason: 'missing-value' })
          }
          fromValue = next
          i++
        }
        // Command grammar: "`<version>` matches ... `<commit>` matches ...; any other `--from`
        // value ... -> CW-E02" -- named by the value itself, not by "--from" (U02).
        if (!VERSION_RE.test(fromValue) && !COMMIT_RE.test(fromValue)) {
          throw new ArgvError(fromValue)
        }
        result.from = fromValue
        continue
      }

      if (!VALUE_FLAGS.has(name)) throw new ArgvError(arg)
      if (seen.has(name)) throw new ArgvError(name, { reason: 'repeated' })
      seen.add(name)

      let value
      if (eq !== -1) {
        if (inlineValue === '') throw new ArgvError(name, { reason: 'missing-value' })
        value = inlineValue
      } else {
        const next = argv[i + 1]
        // A next argument beginning with `-` (including a lone `-`) is a missing value, not a
        // value: the Command grammar makes no exception for `-` on its own.
        if (next === undefined || next.startsWith('-')) {
          throw new ArgvError(name, { reason: 'missing-value' })
        }
        value = next
        i++
      }

      if (name === '--lang') {
        if (value !== 'en' && value !== 'zh-TW') throw new ArgvError(value)
        result.lang = value
      } else {
        result.flags[name.slice(2)] = value
        createOnlyFlagsSeen.push(name)
      }
      continue
    }

    // positional
    if (arg === '') throw new ArgvError(arg)
    // U02: once `upgrade` has been read, any further positional (another directory-shaped
    // argument, or `upgrade` again) is rejected by its own literal token -- the upgrade path never
    // takes a directory argument.
    if (result.mode === 'upgrade') throw new ArgvError(arg)
    // Command grammar: "chosen when the first positional argument is `upgrade`" -- Q2's reading
    // (the first positional's literal covers one after `--` too) makes this check come before the
    // positional count, not folded into it: a later `upgrade` (positionalCount > 0) falls through
    // to the ordinary positional handling below, so `['range', 'upgrade']` still fails on the
    // second-positional check with token "upgrade".
    if (arg === 'upgrade' && positionalCount === 0) {
      result.mode = 'upgrade'
      continue
    }
    positionalCount++
    if (positionalCount > 1) throw new ArgvError(arg)
    result.directory = arg
  }

  // Command grammar: "a create-only flag (...) -> CW-E02" -- checked once `mode` is known for
  // certain, so a create-only flag given BEFORE `upgrade` is caught too (U02's 2026-11-07
  // sub-case), named by whichever such flag argv gave first.
  if (result.mode === 'upgrade' && createOnlyFlagsSeen.length > 0) {
    throw new ArgvError(createOnlyFlagsSeen[0])
  }

  return result
}
