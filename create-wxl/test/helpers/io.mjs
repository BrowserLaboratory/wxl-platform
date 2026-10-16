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

/** `io.interactive: false` by default; stdout/stderr text is read synchronously as it is written. */
export function makeIo(overrides = {}) {
  const stdout = makeCollector()
  const stderr = makeCollector()
  return {
    io: {
      stdin: new PassThrough(),
      stdout: stdout.stream,
      stderr: stderr.stream,
      interactive: false,
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
