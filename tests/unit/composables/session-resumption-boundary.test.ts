import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

/**
 * The resumption boundary, exercised against the real persistence layer.
 *
 * No mock of `useChallengePersistence` here, deliberately. The defect this file guards
 * lives in which stored row `init` picks, so a hand-written stand-in for the store would
 * be asserting against the test's own idea of what the store returns. `fake-indexeddb`
 * runs the same `idb` calls the browser does.
 *
 * Every test resets the module registry first: `useSessionGate` keeps its state in
 * module-level refs and `useChallengePersistence` memoises its open database in a
 * module-level promise, so without the reset the second test in a file inherits the
 * first one's answers and prints numbers that contradict themselves.
 */

const SLUG = 'sqli-demo'
const TITLE = 'SQL Injection Demo'

type Loaded = {
  useAttackSession: (slug: string, title: string) => ReturnType<
    typeof import('../../../.vitepress/theme/composables/useAttackSession')['useAttackSession']
  >
  persistence: ReturnType<
    typeof import('../../../.vitepress/theme/composables/useChallengePersistence')['useChallengePersistence']
  >
  GATE_STORAGE_KEY: string
  GATE_DECIDED: string
  hasGateDecision: () => boolean
}

async function load(): Promise<Loaded> {
  const gate = await import('../../../.vitepress/theme/composables/useSessionGate')
  const persistenceModule = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const attack = await import('../../../.vitepress/theme/composables/useAttackSession')
  return {
    useAttackSession: attack.useAttackSession,
    persistence: persistenceModule.useChallengePersistence(),
    GATE_STORAGE_KEY: gate.GATE_STORAGE_KEY,
    GATE_DECIDED: gate.GATE_DECIDED,
    hasGateDecision: gate.hasGateDecision,
  }
}

function storedSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: 'stored-session-id',
    challengeSlug: SLUG,
    challengeTitle: TITLE,
    startedAt: 100,
    solvedAt: null,
    events: [
      { type: 'challenge_start', timestamp: 100 },
      { type: 'flag_attempt', timestamp: 150, submitted: 'wrong', correct: false },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  // A fresh factory per test. The database name is fixed, so without this the rows one
  // test seeded are still there for the next one.
  ;(globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
  sessionStorage.clear()
  vi.resetModules()
})

/**
 * Make `sessionStorage.getItem` throw for the duration of one call, then put it back.
 *
 * Not `vi.spyOn` plus `restoreAllMocks`: the restore does not take on happy-dom's
 * storage object, so the throwing stub survived into the following tests. Every
 * later test that expected a NEW session then passed for the wrong reason — the
 * marker was unreadable rather than absent — and the one test that expected a resume
 * was the only thing that noticed. A stub that outlives its test turns its
 * neighbours into vacuous passes, so this one is restored in a finally.
 */
async function withUnreadableSessionStorage<T>(fn: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(globalThis.sessionStorage, 'getItem')
    ?? { value: globalThis.sessionStorage.getItem, configurable: true, writable: true }
  Object.defineProperty(globalThis.sessionStorage, 'getItem', {
    value: () => { throw new Error('SecurityError') },
    configurable: true,
    writable: true,
  })
  try {
    return await fn()
  } finally {
    Object.defineProperty(globalThis.sessionStorage, 'getItem', original)
  }
}

/**
 * Assert that the marker this test just wrote is actually readable.
 *
 * The positive control for every marker-present case. Without it, a test that expects
 * a new session cannot tell "the rule said no" from "the marker was never there", and
 * that is exactly how the leaked stub above went unnoticed.
 */
function expectMarkerReadable(hasGateDecision: () => boolean): void {
  expect(hasGateDecision()).toBe(true)
}

describe('resumption is conditional on the gate having been answered', () => {
  it('does not resume a stored unsolved session while the marker is absent', async () => {
    const { useAttackSession, persistence } = await load()
    await persistence.saveAttackSession(storedSession() as never)

    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    const held = session.getSession()
    expect(held).not.toBeNull()
    expect(held!.sessionId).not.toBe('stored-session-id')

    const stored = await persistence.loadAttackSession('stored-session-id')
    expect(stored).not.toBeNull()
    expect(stored!.events).toHaveLength(2)
    expect(stored!.startedAt).toBe(100)
    expect(stored!.sessionId).toBe('stored-session-id')
  })

  it('appends every later event to the new session and none to the stored one', async () => {
    const { useAttackSession, persistence } = await load()
    await persistence.saveAttackSession(storedSession() as never)

    const session = useAttackSession(SLUG, TITLE)
    await session.init()
    // The new attempt was created before the decision; accepting now must not switch its owner.
    const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
    useSessionGate().keepExistingData()
    await session.addFlagAttempt('another-guess', false)

    const stored = await persistence.loadAttackSession('stored-session-id')
    expect(stored!.events).toHaveLength(2)

    const held = session.getSession()!
    const fresh = await persistence.loadAttackSession(held.sessionId)
    expect(fresh!.events.map(e => e.type)).toEqual(['challenge_start', 'flag_attempt'])
  })

  it('treats a sessionStorage read that throws as an unanswered gate', async () => {
    const { useAttackSession, persistence } = await load()
    await persistence.saveAttackSession(storedSession() as never)

    const session = useAttackSession(SLUG, TITLE)
    await withUnreadableSessionStorage(() => session.init())

    expect(session.getSession()!.sessionId).not.toBe('stored-session-id')
    const stored = await persistence.loadAttackSession('stored-session-id')
    expect(stored!.events).toHaveLength(2)
    expect(stored!.startedAt).toBe(100)
  })
})

describe('which stored session the marker admits', () => {
  it('does not revive an older unsolved session once a newer one is solved', async () => {
    const { useAttackSession, persistence, GATE_STORAGE_KEY, GATE_DECIDED, hasGateDecision } = await load()
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
    expectMarkerReadable(hasGateDecision)
    await persistence.saveAttackSession(storedSession({ sessionId: 'older-unsolved', startedAt: 100 }) as never)
    await persistence.saveAttackSession(
      storedSession({ sessionId: 'newer-solved', startedAt: 200, solvedAt: 250 }) as never,
    )

    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    const held = session.getSession()!
    expect(held.sessionId).not.toBe('older-unsolved')
    expect(held.sessionId).not.toBe('newer-solved')

    // Not just "a different id". A fallback that copied the abandoned row's events under
    // a fresh id would satisfy every id assertion above while handing the learner
    // somebody else's history, so the held session's own contents are checked too.
    expect(held.events).toHaveLength(1)
    expect(held.events[0].type).toBe('challenge_start')

    const older = await persistence.loadAttackSession('older-unsolved')
    expect(older!.events).toHaveLength(2)
    expect(older!.solvedAt).toBeNull()
    const newerSolved = await persistence.loadAttackSession('newer-solved')
    expect(newerSolved!.solvedAt).toBe(250)
    expect(newerSolved!.events).toHaveLength(2)
  })

  it('does not resume when the newest startedAt is shared by more than one row', async () => {
    const { useAttackSession, persistence, GATE_STORAGE_KEY, GATE_DECIDED, hasGateDecision } = await load()
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
    expectMarkerReadable(hasGateDecision)
    // Two initializations landing in the same millisecond give two rows the same
    // `startedAt`, and `startedAt` is then no longer an ordering. The abandoned one can
    // sort first, so picking "the newest" would resume it even though the attempt the
    // learner actually finished is the other row.
    // The ids are chosen so the ABANDONED row is the one the store hands back first:
    // `attack-sessions` is keyed on `sessionId` and the slug listing sorts only on
    // `startedAt`, so with the timestamps equal the surviving order is the key order.
    // Named the other way round this test passes without the rule being there at all.
    await persistence.saveAttackSession(storedSession({ sessionId: 'aaa-tied-unsolved', startedAt: 400 }) as never)
    await persistence.saveAttackSession(
      storedSession({ sessionId: 'zzz-tied-solved', startedAt: 400, solvedAt: 450 }) as never,
    )
    const listed = await persistence.listAttackSessions(SLUG)
    expect(listed[0].sessionId).toBe('aaa-tied-unsolved')

    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    const held = session.getSession()!
    expect(held.sessionId).not.toBe('aaa-tied-unsolved')
    expect(held.sessionId).not.toBe('zzz-tied-solved')
    expect(held.events).toHaveLength(1)

    const tied = await persistence.loadAttackSession('aaa-tied-unsolved')
    expect(tied!.events).toHaveLength(2)
    expect(tied!.solvedAt).toBeNull()
  })

  it('does not resume on a tie even when the solved row is listed first', async () => {
    const { useAttackSession, persistence, GATE_STORAGE_KEY, GATE_DECIDED, hasGateDecision } = await load()
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
    expectMarkerReadable(hasGateDecision)
    // The mirror of the case above. Both orderings are asserted because the store's
    // order is an accident of the key, not something this rule is allowed to depend on.
    await persistence.saveAttackSession(
      storedSession({ sessionId: 'aaa-tied-solved', startedAt: 400, solvedAt: 450 }) as never,
    )
    await persistence.saveAttackSession(storedSession({ sessionId: 'zzz-tied-unsolved', startedAt: 400 }) as never)
    const listed = await persistence.listAttackSessions(SLUG)
    expect(listed[0].sessionId).toBe('aaa-tied-solved')

    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    expect(session.getSession()!.sessionId).not.toBe('zzz-tied-unsolved')
    const tied = await persistence.loadAttackSession('zzz-tied-unsolved')
    expect(tied!.events).toHaveLength(2)
  })

  // Baseline, not evidence of the fix: both of the following hold on the code as it
  // stands before this change. They are here so that adding the marker condition and
  // changing which row is picked cannot quietly take them away.
  it('baseline: resumes the most recently started session when it is unsolved', async () => {
    const { useAttackSession, persistence, GATE_STORAGE_KEY, GATE_DECIDED, hasGateDecision } = await load()
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
    expectMarkerReadable(hasGateDecision)
    await persistence.saveAttackSession(storedSession({ sessionId: 'older-solved', startedAt: 100, solvedAt: 150 }) as never)
    await persistence.saveAttackSession(storedSession({ sessionId: 'newer-unsolved', startedAt: 200 }) as never)

    const before = await persistence.listAttackSessions(SLUG)
    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    const held = session.getSession()!
    expect(held.sessionId).toBe('newer-unsolved')
    expect(held.startedAt).toBe(200)
    expect(held.events.filter(e => e.type === 'challenge_start')).toHaveLength(1)

    const after = await persistence.listAttackSessions(SLUG)
    expect(after).toHaveLength(before.length)
  })

  it('baseline: creates a new session when the marker is present and nothing is stored', async () => {
    const { useAttackSession, persistence, GATE_STORAGE_KEY, GATE_DECIDED, hasGateDecision } = await load()
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
    expectMarkerReadable(hasGateDecision)

    const session = useAttackSession(SLUG, TITLE)
    await session.init()

    const held = session.getSession()!
    expect(held.solvedAt).toBeNull()
    expect(held.events).toHaveLength(1)
    expect(held.events[0].type).toBe('challenge_start')

    const stored = await persistence.listAttackSessions(SLUG)
    expect(stored).toHaveLength(1)
    expect(stored[0].sessionId).toBe(held.sessionId)
  })
})
