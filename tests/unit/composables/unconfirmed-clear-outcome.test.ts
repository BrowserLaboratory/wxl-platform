import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The window in which "continue with this work" is not something the platform can honour.
 *
 * `indexedDB.deleteDatabase` neither fails nor completes while another connection holds
 * the database open — it stalls, and the bound the platform puts on it does not cancel
 * the request. So from the instant the request is issued there is no moment at which
 * anyone can say the stored work is still there. These tests pin the withdrawal to that
 * instant, and pin it to outliving a full page load, because the one way out of an
 * unconfirmed clear is a load and module state does not survive one.
 */

const deleteDatabase = vi.fn<[], Promise<void>>()
const hasAnyStoredData = vi.fn(async () => true)

vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  useChallengePersistence: () => ({ deleteDatabase, hasAnyStoredData }),
}))

vi.mock('../../../.vitepress/theme/composables/localStorageKeys', () => ({
  // What the SWEEP asks for — the keys clearing removes, which is ownership minus the
  // declared exemptions. Nothing here needs a key to actually go; these tests are about
  // the record of a clear that was started, not about which keys it takes.
  listClearableLocalStorageKeys: () => [],
  listLearnerEvidenceKeys: () => ['pentest-draft-door-is-open'],
}))

const GATE_MODULE = '../../../.vitepress/theme/composables/useSessionGate'

async function loadGate() {
  const mod = await import(GATE_MODULE)
  return { mod, gate: mod.useSessionGate() }
}

/**
 * Make `sessionStorage.setItem` keep nothing for the duration of one call, then put it
 * back.
 *
 * Not `vi.spyOn` plus `restoreAllMocks`: the restore does not take on happy-dom's storage
 * object, so the swallowing stub survives into the next test — where it silently makes
 * every later clear refuse to start, and the assertions there stop meaning what they say.
 * Restored in a finally instead.
 */
async function withSessionStorageThatKeepsNothing<T>(fn: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(globalThis.sessionStorage, 'setItem')
    ?? { value: globalThis.sessionStorage.setItem, configurable: true, writable: true }
  Object.defineProperty(globalThis.sessionStorage, 'setItem', {
    value: () => { /* accepted and dropped, exactly as a full quota behaves */ },
    configurable: true,
    writable: true,
  })
  try {
    return await fn()
  } finally {
    Object.defineProperty(globalThis.sessionStorage, 'setItem', original)
  }
}

/** A delete that never settles: the in-flight window, held open for assertions. */
function neverSettles(): Promise<void> {
  return new Promise<void>(() => { /* deliberately never resolved */ })
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  deleteDatabase.mockReset()
  hasAnyStoredData.mockReset()
  hasAnyStoredData.mockResolvedValue(true)
  vi.resetModules()
})

describe('the withdrawal starts when the delete is issued', () => {
  it('refuses continue while the delete is still in flight', async () => {
    const { gate } = await loadGate()
    await gate.evaluate()
    deleteDatabase.mockImplementation(neverSettles)

    void gate.clearEverything(() => { /* no reload in this test */ })
    await Promise.resolve()

    gate.keepExistingData()

    expect(gate.decision.value).not.toBe('kept')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStorage.getItem('wxl-session-gate')).toBeNull()
  })

  it('refuses continue after the delete times out', async () => {
    const { gate } = await loadGate()
    await gate.evaluate()
    deleteDatabase.mockRejectedValue(new Error('challenge-tools was not deleted within the time limit'))

    await gate.clearEverything(() => { /* no reload on this path */ })
    gate.keepExistingData()

    expect(gate.clearError.value).toContain('time limit')
    expect(gate.decision.value).not.toBe('kept')
    expect(gate.decision.value).not.toBe('cleared')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStorage.getItem('wxl-session-gate')).toBeNull()
  })

  it('refuses continue after the delete request is rejected', async () => {
    const { gate } = await loadGate()
    await gate.evaluate()
    deleteDatabase.mockRejectedValue(new Error('InvalidStateError'))

    await gate.clearEverything(() => { /* no reload on this path */ })
    gate.keepExistingData()

    expect(gate.decision.value).not.toBe('kept')
    expect(gate.decision.value).not.toBe('cleared')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStorage.getItem('wxl-session-gate')).toBeNull()
  })
})

describe('the withdrawal outlives the page', () => {
  it('still refuses continue after a full page load', async () => {
    const first = await loadGate()
    await first.gate.evaluate()
    deleteDatabase.mockRejectedValue(new Error('another tab still has it open'))
    await first.gate.clearEverything(() => { /* the learner reloads instead */ })
    expect(first.gate.clearStarted.value).toBe(true)

    // A full page load: sessionStorage survives it, every module-level ref does not.
    // Without the stored record the reloaded page offers continue again while the
    // queued deletion is still on its way to completing.
    vi.resetModules()
    const second = await loadGate()
    await second.gate.evaluate()

    expect(second.gate.clearStarted.value).toBe(true)
    second.gate.keepExistingData()
    expect(second.gate.decision.value).not.toBe('kept')
    expect(sessionStorage.getItem('wxl-session-gate')).toBeNull()
  })
})

describe('the confirmed path is unchanged', () => {
  it('writes the marker, reloads, and removes the started record', async () => {
    const { mod, gate } = await loadGate()
    await gate.evaluate()
    const reload = vi.fn()

    // Held open so the record can be observed while it is supposed to exist. Without
    // this the removal assertion below passes just as well against an implementation
    // that never wrote the record at all — the store starts empty.
    let release: () => void = () => {}
    deleteDatabase.mockImplementation(() => new Promise<void>(r => { release = () => r() }))
    const running = gate.clearEverything(reload)
    await Promise.resolve()
    expect(sessionStorage.getItem(mod.CLEAR_STARTED_STORAGE_KEY)).toBe(mod.CLEAR_STARTED)
    release()
    await running

    expect(gate.decision.value).toBe('cleared')
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('wxl-session-gate')).toBe('decided')
    // Assert the constant exists before asserting about the value it keys. Without this
    // the key is `undefined`, `getItem(undefined)` returns null, and the next line is a
    // pass that says nothing.
    expect(typeof mod.CLEAR_STARTED_STORAGE_KEY).toBe('string')
    expect(sessionStorage.getItem(mod.CLEAR_STARTED_STORAGE_KEY)).toBeNull()
  })
})

describe('a clear that cannot be recorded is not started at all', () => {
  it('issues no delete request and keeps continue offered', async () => {
    const { mod, gate } = await loadGate()
    await gate.evaluate()
    // A store that accepts the write and keeps nothing — a full quota, a private window,
    // a browser setting. Indistinguishable from a working store unless it is read back.
    await withSessionStorageThatKeepsNothing(() => gate.clearEverything(vi.fn()))

    // No request was issued, so nothing is queued and nothing is on its way out.
    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(gate.clearError.value).toBe(mod.CLEAR_NOT_STARTED)
    expect(gate.clearStarted.value).toBe(false)

    // And because nothing is pending, continuing is still exactly true. This is the one
    // clear failure that does not withdraw the offer.
    gate.keepExistingData()
    expect(gate.decision.value).toBe('kept')
  })
})

describe('overlapping clears', () => {
  it('a second press does not start a second run', async () => {
    const { gate } = await loadGate()
    await gate.evaluate()
    let release: () => void = () => {}
    deleteDatabase.mockImplementation(() => new Promise<void>(r => { release = () => r() }))

    const first = gate.clearEverything(vi.fn())
    await Promise.resolve()
    await gate.clearEverything(vi.fn())

    // Two runs would share `clearError`, so the first to fail would put an exit on screen
    // while the other was still going, and acting on it would navigate away from a delete
    // still running in this document.
    expect(deleteDatabase).toHaveBeenCalledTimes(1)
    release()
    await first
  })
})
