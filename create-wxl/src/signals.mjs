// Signal handling (traceability.md "Signals"): `SIGINT`, `SIGTERM` and `SIGHUP` are handled
// alike, from step 3 on. `createSignalGuard` listens on `deps.signals` and remembers only the
// FIRST signal received (further signals during cleanup are ignored, traceability.md "Signals").
// A pending question's `ask()` can register itself to be rejected the moment a signal arrives
// (questions.mjs), instead of only being checked at the next `checkpoint`.

export class SignalAbort extends Error {
  constructor(signal) {
    super(`aborted by ${signal}`)
    this.name = 'SignalAbort'
    this.signal = signal
  }
}

/** `signals`: the `EventEmitter` this run's `deps.signals` is. `names`: which signal names to
 * listen for; defaults to all three traceability.md "Signals" handles alike. */
export function createSignalGuard(signals, names = ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  let raised = null
  let pendingReject = null
  const onRaiseCallbacks = []
  const handlers = new Map()

  function onSignal(name) {
    if (raised) return // one-time: a second signal during cleanup is ignored
    raised = name
    for (const cb of onRaiseCallbacks) cb(name)
    if (pendingReject) {
      const reject = pendingReject
      pendingReject = null
      reject(new SignalAbort(name))
    }
  }

  for (const name of names) {
    const handler = () => onSignal(name)
    handlers.set(name, handler)
    signals.on(name, handler)
  }

  return {
    raised() {
      return raised
    },
    // S-18: one name for "has a signal arrived" wherever a caller needs a plain boolean (the
    // `shouldStop` callback `fsops.mjs`/`git-steps.mjs` are given), instead of each call site
    // re-writing `guard.raised() !== null` for itself.
    isRaised() {
      return raised !== null
    },
    throwIfRaised() {
      if (raised) throw new SignalAbort(raised)
    },
    /** Registers `reject` to be called the moment a signal arrives while something else is
     * waiting (a pending question's `ask()`). The caller clears this itself (`clearWait()`) once
     * settled any other way (a line arrived, EOF) -- `waitForSignal` only knows about the signal
     * side of that race, not the other one. */
    waitForSignal(reject) {
      if (raised) {
        reject(new SignalAbort(raised))
        return
      }
      pendingReject = reject
    },
    clearWait() {
      pendingReject = null
    },
    /** Registers `cb` to run once, synchronously, the moment a signal is first raised --
     * immediately when one already has been. Independent of `waitForSignal`'s single pending
     * slot (decision 6: step 6's download aborts its own `AbortController` this way). Returns an
     * unsubscribe function, so a caller whose own window has already closed (step 6 finishing)
     * does not leave a stale callback registered for the rest of the run. */
    onRaise(cb) {
      if (raised) {
        cb(raised)
        return () => {}
      }
      onRaiseCallbacks.push(cb)
      return () => {
        const i = onRaiseCallbacks.indexOf(cb)
        if (i !== -1) onRaiseCallbacks.splice(i, 1)
      }
    },
    off() {
      for (const [name, handler] of handlers) signals.removeListener(name, handler)
      handlers.clear()
    },
  }
}
