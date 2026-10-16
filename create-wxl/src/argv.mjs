// Command grammar (traceability.md "Command grammar"): `parseArgvStrict` is the full grammar.
// The `--no-setup` + setup-flag rule (C03) is checked separately by `run.mjs`.

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
  const result = { directory: undefined, noSetup: false, lang: undefined, flags: {} }
  const seen = new Set()
  let positionalCount = 0
  let endOfFlags = false

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
        result.noSetup = true
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
      }
      continue
    }

    // positional
    if (arg === '') throw new ArgvError(arg)
    if (arg === 'upgrade') throw new ArgvError(arg)
    positionalCount++
    if (positionalCount > 1) throw new ArgvError(arg)
    result.directory = arg
  }

  return result
}
