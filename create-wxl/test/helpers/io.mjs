import { PassThrough, Writable } from 'node:stream'

function makeCollector() {
  let text = ''
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += chunk.toString('utf8')
      callback()
    },
  })
  return {
    stream,
    get text() {
      return text
    },
  }
}

/** `io.interactive: false` by default; stdout/stderr text is read synchronously as it is written.
 * A non-interactive `io` (the default, or an explicit `interactive: false` override, unless the
 * caller also passes its own `stdin`) gets `stdin` already ended (T-0022 ticket Notes (2)):
 * non-interactive code must never read it, so an already-ended stream turns an accidental read
 * into `QuestionEofError` instead of a silent, open-ended wait. */
export function makeIo(overrides = {}) {
  const stdout = makeCollector()
  const stderr = makeCollector()
  const interactive = overrides.interactive ?? false
  const stdin = overrides.stdin ?? new PassThrough()
  if (!interactive && overrides.stdin === undefined) stdin.end()
  return {
    io: {
      stdin,
      stdout: stdout.stream,
      stderr: stderr.stream,
      interactive,
      ...overrides,
    },
    get stdoutText() {
      return stdout.text
    },
    get stderrText() {
      return stderr.text
    },
  }
}
