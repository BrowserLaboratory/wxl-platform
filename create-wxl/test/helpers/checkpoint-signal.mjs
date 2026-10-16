// A `deps.checkpoint` that emits a signal on `deps.signals` the first time it is called with a
// chosen step name (T-0024 ticket Notes: "a checkpoint that emits a signal"). Every call is still
// recorded on the returned `vi.fn`, so `expectOrderedCheckpoints` keeps working.

import { vi } from 'vitest'

export function makeSignalingCheckpoint(signals, stepName, signalName = 'SIGINT') {
  let fired = false
  return vi.fn((name) => {
    if (!fired && name === stepName) {
      fired = true
      signals.emit(signalName)
    }
  })
}
