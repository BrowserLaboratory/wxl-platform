// A merged event log (T-0022 ticket Notes (4)): stdout/stderr writes, `checkpoint` calls, and the
// engine's `parseForkInitArgs`/`runForkInit`, `fetchArchive` and `runGit` calls, all pushed, in
// call order, into one array -- so a test can assert ordering across different kinds of event
// (e.g. "every warning line comes after the `runForkInit` call") instead of only each kind's own
// call count.
//
// Instruments IN PLACE: it wraps `io.stdout`/`io.stderr`'s own `write`, and sets a new mock
// implementation on each already-existing `vi.fn` (`deps.checkpoint`, `deps.fetchArchive`,
// `deps.engine.parseForkInitArgs`, `deps.engine.runForkInit`, `deps.runGit`) that logs around a
// call to that `vi.fn`'s own previous implementation. Every object keeps its identity, so a test
// that already holds a reference to `checkpoint`, `fetchArchive` or `deps.engine.parseForkInitArgs`
// keeps seeing its own `.mock.calls`/`.mock.results` exactly as before. Call `attachEventLog` last,
// after any test-specific `.mockImplementation()` override (e.g. a throwing `runForkInit` stub) and
// after `makePromptDriver`, so this wrapping is not itself overwritten and the driven `checkpoint`
// still schedules the next scripted answer.

function wrapStream(stream, log, type) {
  const originalWrite = stream.write.bind(stream)
  stream.write = (chunk, ...rest) => {
    log.push({ type, text: chunk.toString('utf8') })
    return originalWrite(chunk, ...rest)
  }
}

function wrapSpy(fn, log, name) {
  if (!fn || typeof fn.getMockImplementation !== 'function') return
  const original = fn.getMockImplementation()
  fn.mockImplementation((...args) => {
    log.push({ type: `${name}-start`, args })
    try {
      const result = original ? original(...args) : undefined
      if (result && typeof result.then === 'function') {
        return result.then(
          (value) => {
            log.push({ type: `${name}-end` })
            return value
          },
          (err) => {
            log.push({ type: `${name}-end`, threw: true })
            throw err
          },
        )
      }
      log.push({ type: `${name}-end` })
      return result
    } catch (err) {
      log.push({ type: `${name}-end`, threw: true })
      throw err
    }
  })
}

function wrapCheckpoint(fn, log) {
  if (!fn || typeof fn.getMockImplementation !== 'function') return
  const original = fn.getMockImplementation()
  fn.mockImplementation((...args) => {
    log.push({ type: 'checkpoint', name: args[0] })
    return original ? original(...args) : undefined
  })
}

export function attachEventLog(io, deps) {
  const log = []
  wrapStream(io.stdout, log, 'stdout')
  wrapStream(io.stderr, log, 'stderr')
  wrapCheckpoint(deps.checkpoint, log)
  wrapSpy(deps.fetchArchive, log, 'fetchArchive')
  wrapSpy(deps.runGit, log, 'runGit')
  wrapSpy(deps.engine.parseForkInitArgs, log, 'parseForkInitArgs')
  wrapSpy(deps.engine.runForkInit, log, 'runForkInit')
  return {
    log,
    /** The index of the Nth (1-based) event whose `type` is `type`, or -1. */
    indexOfNth(type, n = 1) {
      let count = 0
      for (let i = 0; i < log.length; i++) {
        if (log[i].type === type) {
          count++
          if (count === n) return i
        }
      }
      return -1
    },
    /** The number of `checkpoint` events named `name` logged so far. */
    countCheckpoint(name) {
      return log.filter((e) => e.type === 'checkpoint' && e.name === name).length
    },
    /** The index of the first logged event at or after `fromIndex` matching `predicate`, or -1. */
    indexOfAfter(fromIndex, predicate) {
      for (let i = Math.max(fromIndex, 0); i < log.length; i++) {
        if (predicate(log[i])) return i
      }
      return -1
    },
    /** One entry per `checkpoint('question')` event, each the number of `type` events logged
     * strictly before it: for "no download before the summary is accepted", every entry of this
     * array, with `type` 'fetchArchive-start', must be 0. */
    countBeforeEachQuestion(type) {
      const counts = []
      let count = 0
      for (const entry of log) {
        if (entry.type === 'checkpoint' && entry.name === 'question') counts.push(count)
        if (entry.type === type) count++
      }
      return counts
    },
  }
}
