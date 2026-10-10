import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AttackSession } from '../../../.vitepress/theme/composables/useChallengePersistence'

// ─── Mock idb ─────────────────────────────────────────────────────────────────
// We use an in-memory store to simulate IndexedDB without a real browser IDB.
let codeDrafts: Record<string, any> = {}
let attackSessions: Record<string, any> = {}
let pentestNotes: Record<string, any> = {}
let challengeProgress: Record<string, any> = {}
let activityTraces: Record<string, any> = {}
let createdStores: string[] = []
let createdIndexes: Array<{ store: string; name: string; keyPath: string }> = []
let deletedStores: string[] = []
let storeKeyPaths: Record<string, string> = {}

/** The keyPath each store is addressed by once it exists, for stores the harness seeds. */
const DEFAULT_KEY_PATHS: Record<string, string> = {
  'code-drafts': 'challengeSlug',
  'attack-sessions': 'sessionId',
  'pentest-notes': 'id',
  'challenge-progress': 'challengeSlug',
  'activity-traces': 'id',
}

/** The in-memory tables, addressed the way the composable addresses object stores. */
function tableFor(store: string): Record<string, any> | null {
  if (store === 'code-drafts') return codeDrafts
  if (store === 'attack-sessions') return attackSessions
  if (store === 'pentest-notes') return pentestNotes
  if (store === 'challenge-progress') return challengeProgress
  if (store === 'activity-traces') return activityTraces
  return null
}

function writeTo(store: string, value: any): unknown {
  const table = tableFor(store)
  if (!table) return undefined
  const keyPath = storeKeyPaths[store] ?? DEFAULT_KEY_PATHS[store] ?? 'id'
  table[value[keyPath]] = value
  return value[keyPath]
}

/**
 * Stand-ins for the database handle the `upgrade` callback receives and for the
 * versionchange transaction it reads through.
 *
 * The transaction is not decoration. Re-keying `attack-sessions` means reading the
 * existing records out before the store is deleted, and IndexedDB only allows that
 * through the upgrade transaction — a harness without one cannot exercise the
 * migration at all, which is how a "migration test" can pass while testing nothing
 * but a fresh install.
 */
function makeUpgradeTarget(existing: Iterable<string> = []) {
  const existingStores = new Set<string>(existing)
  const storeHandle = (name: string) => ({
    createIndex: vi.fn((indexName: string, keyPath: string) => {
      createdIndexes.push({ store: name, name: indexName, keyPath })
    }),
    getAll: async () => Object.values(tableFor(name) ?? {}),
    get: async (key: string) => tableFor(name)?.[key],
    put: async (value: any) => writeTo(name, value),
  })
  const db = {
    objectStoreNames: { contains: (name: string) => existingStores.has(name) },
    createObjectStore: vi.fn((name: string, opts?: { keyPath?: string }) => {
      existingStores.add(name)
      createdStores.push(name)
      if (opts?.keyPath) storeKeyPaths[name] = opts.keyPath
      return storeHandle(name)
    }),
    deleteObjectStore: vi.fn((name: string) => {
      if (!existingStores.has(name)) throw new Error(`NotFoundError: no object store named ${name}`)
      existingStores.delete(name)
      deletedStores.push(name)
      // A deleted store takes its records with it. Keeping them would let a broken
      // re-key look correct: the records would still be readable afterwards without
      // the migration ever having written them back.
      const table = tableFor(name)
      if (table) for (const k of Object.keys(table)) delete table[k]
    }),
  }
  const tx = { objectStore: (name: string) => storeHandle(name) }
  return { db, tx, existingStores }
}

/** The database handle returned once the upgrade has run. */
function makeHandle() {
  return {
    close: vi.fn(() => { idbCalls.push('close') }),
    transaction: (store: string, _mode: string) => ({
      store: {
        get: async (key: string) => tableFor(store)?.[key],
        put: async (value: any) => writeTo(store, value),
        getAll: async () => Object.values(tableFor(store) ?? {}),
      },
      done: Promise.resolve(),
    }),
    put: async (store: string, value: any) => writeTo(store, value),
    // `undefined` for a missing key, as idb does. Returning `null` here would hide
    // whether the composable normalises the absent case at all.
    get: async (store: string, key: string) => tableFor(store)?.[key],
    getAll: async (store: string) => Object.values(tableFor(store) ?? {}),
    count: async (store: string) => Object.keys(tableFor(store) ?? {}).length,
    getAllFromIndex: async (store: string, _index: string, query: any) =>
      Object.values(tableFor(store) ?? {}).filter((r: any) => r.challengeSlug === query),
    delete: async (store: string, key: string) => { delete tableFor(store)?.[key] },
  }
}

/**
 * An `openDB` stand-in that runs the real upgrade callback against a database seeded
 * with `existing` stores, reporting itself as coming from `oldVersion`.
 *
 * `failOnCreate` makes `createObjectStore` throw for one store name, to exercise an
 * upgrade that dies part way through.
 *
 * The versionchange transaction is all-or-nothing, and the harness models that: the
 * tables are snapshotted before the callback runs and restored if it throws. Without
 * the restore, a rollback test would be asserting against whatever wreckage the failed
 * upgrade happened to leave — which is the opposite of what a rollback means.
 */
function openDbFrom(oldVersion: number, existing: Iterable<string> = [], failOnCreate?: string) {
  return async (_name: string, version: number, { upgrade }: any) => {
    const snapshot = {
      codeDrafts: { ...codeDrafts },
      attackSessions: { ...attackSessions },
      pentestNotes: { ...pentestNotes },
      challengeProgress: { ...challengeProgress },
      activityTraces: { ...activityTraces },
    }
    const { db, tx } = makeUpgradeTarget(existing)
    if (failOnCreate) {
      const real = db.createObjectStore
      db.createObjectStore = vi.fn((name: string, opts?: any) => {
        if (name === failOnCreate) throw new Error(`ConstraintError: cannot create ${name}`)
        return real(name, opts)
      }) as any
    }
    try {
      await upgrade?.(db, oldVersion, version, tx)
    } catch (err) {
      codeDrafts = snapshot.codeDrafts
      attackSessions = snapshot.attackSessions
      pentestNotes = snapshot.pentestNotes
      challengeProgress = snapshot.challengeProgress
      activityTraces = snapshot.activityTraces
      throw err
    }
    return makeHandle()
  }
}

/** Every idb call the module makes, in order, so orderings can be asserted. */
let idbCalls: string[] = []

vi.mock('idb', () => ({
  openDB: vi.fn((name: string, version: number, opts: any) => {
    idbCalls.push('openDB')
    return openDbFrom(0)(name, version, opts)
  }),
  deleteDB: vi.fn(async (_name: string, _opts?: any) => {
    idbCalls.push('deleteDB')
    for (const table of [codeDrafts, attackSessions, pentestNotes, challengeProgress]) {
      for (const k of Object.keys(table)) delete table[k]
    }
  }),
}))

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem('wxl-session-gate', 'decided')
  codeDrafts = {}
  attackSessions = {}
  pentestNotes = {}
  challengeProgress = {}
  activityTraces = {}
  createdStores = []
  deletedStores = []
  createdIndexes = []
  storeKeyPaths = {}
  idbCalls = []
  // The instrument for the boundary test below, not an assertion itself: without it a
  // key written by one test is still there for the next, and a test asserting that
  // `hasAnyStoredData` ignores localStorage would be asserting the state of whatever
  // ran before it.
  localStorage.clear()
  vi.resetModules()
})

describe('useChallengePersistence', () => {
  it('opens challenge-tools DB at version 7 on first use', async () => {
    const { openDB } = await import('idb')
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = useChallengePersistence()
    await loadCodeDraft('x')  // triggers lazy DB open
    expect(openDB).toHaveBeenCalledWith('challenge-tools', 7, expect.any(Object))
  })

  it('creates attack-sessions store on initialization', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = useChallengePersistence()
    await loadCodeDraft('x') // triggers DB open
    expect(createdStores).toContain('attack-sessions')
  })

  it('creates all five stores on fresh install (v0 → v7)', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = useChallengePersistence()
    await loadCodeDraft('x')
    // Asserted as an exact set, not as separate `toContain`s. Positive assertions
    // cannot notice one more store appearing, and the store set is exactly the kind
    // of thing this change alters.
    expect([...createdStores].sort()).toEqual([
      'activity-traces', 'attack-sessions', 'challenge-progress', 'code-drafts', 'pentest-notes',
    ])
    expect(createdStores).not.toContain('code-scripts')
  })

  it('keys attack-sessions by sessionId, not by challenge slug', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await useChallengePersistence().loadCodeDraft('x')
    // The whole point of the change. Keyed by slug, a challenge holds one session and
    // a second attempt overwrites the first.
    expect(storeKeyPaths['attack-sessions']).toBe('sessionId')
  })

  it('keys challenge-progress by challenge slug', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await useChallengePersistence().loadCodeDraft('x')
    expect(storeKeyPaths['challenge-progress']).toBe('challengeSlug')
  })

  it('creates a by-slug index on every store that is read by challenge', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await useChallengePersistence().loadCodeDraft('x')
    for (const store of ['pentest-notes', 'attack-sessions', 'activity-traces']) {
      const idx = createdIndexes.find(i => i.store === store && i.name === 'by-slug')
      expect(idx, `${store} is missing its by-slug index`).toBeDefined()
      expect(idx?.keyPath).toBe('challengeSlug')
    }
  })

  const aSession = (over: Partial<import('../../../.vitepress/theme/composables/useChallengePersistence').AttackSession> = {}) => ({
    sessionId: 's-1',
    challengeSlug: 'sqli-demo',
    challengeTitle: 'SQL Injection Demo',
    startedAt: 1000,
    solvedAt: null,
    events: [{ type: 'challenge_start' as const, timestamp: 1000 }],
    ...over,
  })

  it('saveAttackSession persists a session under its own session id', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, loadAttackSession } = useChallengePersistence()

    const session = aSession()
    await saveAttackSession(session)
    expect(await loadAttackSession('s-1')).toEqual(session)
    // The key is the session id, not the slug. Looking it up by slug has to miss, or
    // the store is still one-record-per-challenge under a new name.
    expect(await loadAttackSession('sqli-demo')).toBeNull()
  })

  it('loadAttackSession returns null for an unknown session id', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadAttackSession } = useChallengePersistence()
    await expect(loadAttackSession('nonexistent-session-id')).resolves.toBeNull()
  })

  // The defect this change exists to fix, stated as a test. Under the old keyPath the
  // second save landed on the first record and an entire solved attempt was gone.
  it('two sessions for the same challenge coexist', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, loadAttackSession } = useChallengePersistence()

    const solved = aSession({ sessionId: 's-1', solvedAt: 2000, events: [
      { type: 'challenge_start' as const, timestamp: 1000 },
      { type: 'challenge_solved' as const, timestamp: 2000 },
    ] })
    await saveAttackSession(solved)
    await saveAttackSession(aSession({ sessionId: 's-2', startedAt: 3000 }))

    expect(Object.keys(attackSessions)).toHaveLength(2)
    // The first attempt's own events, not just its presence: a record that survived
    // with an emptied timeline is the same loss wearing a key.
    expect(await loadAttackSession('s-1')).toEqual(solved)
  })

  it('listAttackSessions returns that challenge\'s sessions, oldest first', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, listAttackSessions } = useChallengePersistence()

    await saveAttackSession(aSession({ sessionId: 'b', startedAt: 3000 }))
    await saveAttackSession(aSession({ sessionId: 'a', startedAt: 1000 }))
    await saveAttackSession(aSession({ sessionId: 'other', challengeSlug: 'staff-only', startedAt: 2000 }))

    const found = await listAttackSessions('sqli-demo')
    // Both the filtering and the order. Insertion order here is b then a, so an
    // implementation that returns the index's rows untouched passes a length check
    // and fails this one.
    expect(found.map(s => s.sessionId)).toEqual(['a', 'b'])
  })

  // Both fields are optional and absent on a locally started record, so the store has
  // to carry them without either being declared on every row. Absence is what marks a
  // record as locally started, which only holds if presence survives the round trip.
  it('a session carrying an origin marker and a carried draft comes back with both', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, loadAttackSession } = useChallengePersistence()

    const imported: AttackSession = {
      ...aSession({ sessionId: 'imported-1' }),
      origin: { kind: 'imported', importedAt: 5000, sourceSessionId: 'from-the-file', sourceExportedAt: '2026-09-16T10:00:00+08:00' },
      draft: { code: 'never run', updatedAt: 4000 },
    }
    await saveAttackSession(imported)

    expect(await loadAttackSession('imported-1')).toEqual(imported)
  })

  // Storing an attempt is not evidence that this learner completed the challenge.
  // Progress is kept apart from attempts precisely so it is not derived from them, and
  // an imported record can have come from another device or another person — letting it
  // mark a challenge complete would make completion something a file can obtain.
  it('storing a solved attempt does not record progress for the challenge', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, loadProgress } = useChallengePersistence()

    const before = await loadProgress('sqli-demo')
    await saveAttackSession({
      ...aSession({ sessionId: 'brought-in', solvedAt: 2000 }),
      origin: { kind: 'imported', importedAt: 5000, sourceSessionId: 'elsewhere', sourceExportedAt: '2026-09-16T10:00:00+08:00' },
      draft: null,
    })

    expect(before).toBeNull()
    expect(await loadProgress('sqli-demo')).toBeNull()
    expect(Object.keys(challengeProgress)).toHaveLength(0)
  })

  it('listAttackSessions returns an empty array for a challenge with no sessions', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { listAttackSessions } = useChallengePersistence()
    // An empty array, not null: the caller iterates it, and `null` would make every
    // call site carry a guard for a case that has no meaning.
    await expect(listAttackSessions('never-opened')).resolves.toEqual([])
  })

  // ─── removal and its trace ───────────────────────────────────────────────────

  it('deleteAttackSession removes exactly the one it was given', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, deleteAttackSession, loadAttackSession } = useChallengePersistence()

    for (const id of ['a', 'b', 'c']) await saveAttackSession(aSession({ sessionId: id }))
    await deleteAttackSession('b')

    expect(Object.keys(attackSessions).sort()).toEqual(['a', 'c'])
    expect(await loadAttackSession('a')).toEqual(aSession({ sessionId: 'a' }))
  })

  it('deleteAttackSession on an id that is not there is not an error', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { deleteAttackSession } = useChallengePersistence()
    // A removal the caller already lost a race for has the outcome the caller wanted.
    await expect(deleteAttackSession('never-existed')).resolves.toBeUndefined()
  })

  it('removing an attempt writes no progress record', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, deleteAttackSession, loadProgress } = useChallengePersistence()

    await saveAttackSession(aSession({ sessionId: 'a', solvedAt: 2000 }))
    await deleteAttackSession('a')

    expect(await loadProgress('sqli-demo')).toBeNull()
    expect(Object.keys(challengeProgress)).toHaveLength(0)
  })

  it('saveActivityTrace stores one trace under an id of its own', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveActivityTrace } = useChallengePersistence()

    const before = Date.now()
    await saveActivityTrace('sqli-demo', { kind: 'removed', removed: [{ startedAt: 1000, solved: false }, { startedAt: 2000, solved: true }] })

    const [trace] = Object.values(activityTraces) as any[]
    expect(trace.challengeSlug).toBe('sqli-demo')
    expect(trace.removed).toEqual([{ startedAt: 1000, solved: false }, { startedAt: 2000, solved: true }])
    expect(trace.at).toBeGreaterThanOrEqual(before)
    expect(trace.kind).toBe('removed')
    expect(typeof trace.id).toBe('string')
  })

  it('two traces for one challenge coexist', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveActivityTrace } = useChallengePersistence()

    await saveActivityTrace('sqli-demo', { kind: 'removed', removed: [{ startedAt: 1, solved: false }] })
    await saveActivityTrace('sqli-demo', { kind: 'removed', removed: [{ startedAt: 2, solved: false }] })

    // Each removal is its own event. Keyed by the challenge they would overwrite.
    expect(Object.keys(activityTraces)).toHaveLength(2)
  })

  it('listActivityTraces returns that challenge\'s traces, oldest first', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { listActivityTraces } = useChallengePersistence()

    // Seeded out of order and written straight into the store rather than through
    // `saveActivityTrace`, which stamps the clock itself: two calls in the same
    // millisecond carry the same `at`, and then insertion order already
    // satisfies an oldest-first assertion whether or not anything sorts.
    activityTraces = {
      later: { id: 'later', challengeSlug: 'sqli-demo', at: 3000, removed: [] },
      earlier: { id: 'earlier', challengeSlug: 'sqli-demo', at: 1000, removed: [] },
      elsewhere: { id: 'elsewhere', challengeSlug: 'staff-only', at: 2000, removed: [] },
    }

    const found = await listActivityTraces('sqli-demo')
    expect(found.map(t => t.id)).toEqual(['earlier', 'later'])
  })

  it('stores all three kinds and hands them back as one sequence', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveActivityTrace, listActivityTraces } = useChallengePersistence()

    await saveActivityTrace('sqli-demo', { kind: 'exported', sessionId: 's-1', mode: 'thinned', identitySupplied: true })
    await saveActivityTrace('sqli-demo', { kind: 'imported', sessionId: 's-2', sourceSessionId: 'elsewhere', sourceExportedAt: '2026-09-16T10:00:00+08:00' })
    await saveActivityTrace('sqli-demo', { kind: 'removed', removed: [{ startedAt: 1000, solved: true }] })

    const found = await listActivityTraces('sqli-demo')
    // One store and one sequence: what happened to a challenge's records reads in order
    // rather than as three lists a reader has to interleave.
    expect(found.map(t => t.kind)).toEqual(['exported', 'imported', 'removed'])
    expect(found.every(t => t.challengeSlug === 'sqli-demo' && typeof t.at === 'number' && typeof t.id === 'string')).toBe(true)
  })

  it('keeps each kind\'s own payload', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveActivityTrace, listActivityTraces } = useChallengePersistence()

    await saveActivityTrace('sqli-demo', { kind: 'exported', sessionId: 's-1', mode: 'full', identitySupplied: false })
    await saveActivityTrace('sqli-demo', { kind: 'imported', sessionId: 'new', sourceSessionId: 'old', sourceExportedAt: '2026-09-16T10:00:00+08:00' })

    const [exported, imported] = await listActivityTraces('sqli-demo')
    expect(exported).toMatchObject({ kind: 'exported', sessionId: 's-1', mode: 'full', identitySupplied: false })
    expect(imported).toMatchObject({ kind: 'imported', sessionId: 'new', sourceSessionId: 'old', sourceExportedAt: '2026-09-16T10:00:00+08:00' })
  })

  it('listActivityTraces returns an empty array for a challenge with none', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    // An empty array, not null: the caller renders it, exactly as with attempts.
    await expect(useChallengePersistence().listActivityTraces('never-cleared')).resolves.toEqual([])
  })

  it('saving the same session id twice replaces rather than appends', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveAttackSession, loadAttackSession } = useChallengePersistence()

    await saveAttackSession(aSession({ sessionId: 'dup' }))
    await saveAttackSession(aSession({ sessionId: 'dup', startedAt: 2000, solvedAt: 3000 }))

    expect(Object.keys(attackSessions)).toHaveLength(1)
    const loaded = await loadAttackSession('dup')
    expect(loaded?.startedAt).toBe(2000)
    expect(loaded?.solvedAt).toBe(3000)
  })

  /** Open against a database seeded at `oldVersion` with `existing` stores. */
  async function openFromVersion(oldVersion: number, existing: string[]) {
    const { openDB } = await import('idb')
    ;(openDB as ReturnType<typeof vi.fn>).mockImplementationOnce(openDbFrom(oldVersion, existing))
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await mod.useChallengePersistence().loadCodeDraft('x')
  }

  it('v1 → v6 adds every surviving store and deletes both retired stores', async () => {
    await openFromVersion(1, ['code-scripts', 'terminal-history'])

    expect(createdStores).toContain('attack-sessions')
    expect(createdStores).toContain('pentest-notes')
    expect(createdStores).toContain('code-drafts')
    expect(createdStores).toContain('challenge-progress')
    expect(createdStores).not.toContain('code-scripts')
    // The positive fact, not the absence of a create. `not.toContain('terminal-history')`
    // would pass for the wrong reason now that nothing creates it — it would hold whether
    // or not the store was ever removed from this learner's database.
    expect(deletedStores).toContain('terminal-history')
    expect(deletedStores).toContain('code-scripts')
  })

  it('v2 → v6 re-keys the sessions it already has and deletes both retired stores', async () => {
    await openFromVersion(2, ['code-scripts', 'terminal-history', 'attack-sessions'])

    expect(createdStores).toContain('pentest-notes')
    expect(createdStores).toContain('code-drafts')
    expect(createdStores).toContain('challenge-progress')
    expect(createdStores).not.toContain('code-scripts')
    // `attack-sessions` existed here and is recreated, because v6 changes its keyPath
    // and IndexedDB cannot change one in place. Before v6 this line asserted the
    // opposite — that the store was left alone — which is exactly the behaviour that
    // made a challenge hold only one session.
    expect(createdStores).toContain('attack-sessions')
    expect(deletedStores).toContain('attack-sessions')
    expect(deletedStores).toContain('terminal-history')
    expect(deletedStores).toContain('code-scripts')
  })

  it('v3 → v6 removes both retired stores from a database that has them', async () => {
    await openFromVersion(3, ['code-scripts', 'terminal-history', 'attack-sessions', 'pentest-notes'])
    expect(deletedStores).toContain('terminal-history')
    expect(deletedStores).toContain('code-scripts')
  })

  it('v4 → v6 loses the code scripts store and keeps the rest', async () => {
    await openFromVersion(4, ['code-scripts', 'attack-sessions', 'pentest-notes'])
    expect(deletedStores).toContain('code-scripts')
    expect(createdStores).toContain('code-drafts')
    expect(createdStores).toContain('challenge-progress')
    expect(deletedStores).not.toContain('pentest-notes')
  })

  // The guard, stated as its own test because the failure it prevents is a thrown
  // exception during upgrade — which would leave the database unopenable, not merely
  // leave a store behind.
  it('a first-time visitor does not attempt to delete a store that is not there', async () => {
    await openFromVersion(0, [])
    expect(deletedStores).toEqual([])
  })

  // An exact key set, not four `toBeUndefined()`s. The named-script methods are gone,
  // and a listing of what must be absent cannot notice a fifth one coming back.
  it('exposes exactly the surviving persistence methods', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    expect(Object.keys(useChallengePersistence()).sort()).toEqual([
      'deleteAttackSession',
      'deleteDatabase',
      'deleteNote',
      'hasAnyStoredData',
      'listActivityTraces',
      'listAllProgress',
      'listAttackSessions',
      'loadAttackSession',
      'loadCodeDraft',
      'loadNotesBySlug',
      'loadProgress',
      'recordAttempt',
      'saveActivityTrace',
      'saveAttackSession',
      'saveCodeDraft',
      'saveNote',
    ])
  })

  // ─── v6 → v7: the trace store ────────────────────────────────────────────────

  // The step that adds a store and touches nothing else. A database already at 6 holds
  // every field version 7 needs, so any read or write of an existing row here would be
  // work this migration has no reason to do — and the only way it could lose data.
  it('v6 → v7 adds the trace store and leaves every existing record alone', async () => {
    attackSessions = { 's-1': { sessionId: 's-1', challengeSlug: 'sqli-demo', challengeTitle: 'T', startedAt: 1, solvedAt: 2, events: [{ type: 'note', timestamp: 1 }] } }
    pentestNotes = { 'n-1': { id: 'n-1', challengeSlug: 'sqli-demo', content: 'kept', createdAt: 1, updatedAt: null } }
    codeDrafts = { 'sqli-demo': { challengeSlug: 'sqli-demo', code: 'kept', updatedAt: 1 } }
    challengeProgress = { 'sqli-demo': { challengeSlug: 'sqli-demo', firstCompletedAt: 2, lastAttemptAt: 2, attemptCount: 1 } }
    const before = structuredClone({ attackSessions, pentestNotes, codeDrafts, challengeProgress })

    await openFromVersion(6, ['attack-sessions', 'pentest-notes', 'code-drafts', 'challenge-progress'])

    expect(createdStores).toEqual(['activity-traces'])
    const idx = createdIndexes.find(i => i.store === 'activity-traces' && i.name === 'by-slug')
    expect(idx?.keyPath).toBe('challengeSlug')
    expect({ attackSessions, pentestNotes, codeDrafts, challengeProgress }).toEqual(before)
  })

  // ─── v5 → v6: the re-key ─────────────────────────────────────────────────────
  //
  // The one irreversible part of this change. A learner's sessions exist in exactly one
  // place, so a migration that drops them drops them for good.
  //
  // Every test below starts from a *seeded version 5 database*, not from a fresh one.
  // A migration test that opens an empty database and finds four stores has asserted
  // nothing about migrating: it is the fresh-install test wearing a different name.

  /** A session as version 5 held it: keyed by slug, with no `sessionId` at all. */
  const v5Session = (slug: string, solvedAt: number | null, events: any[]) => ({
    challengeSlug: slug,
    challengeTitle: slug.toUpperCase(),
    startedAt: 1000,
    solvedAt,
    events,
  })

  async function openFromV5() {
    const { openDB } = await import('idb')
    ;(openDB as ReturnType<typeof vi.fn>).mockImplementationOnce(
      openDbFrom(5, ['attack-sessions', 'pentest-notes', 'code-drafts']),
    )
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await mod.useChallengePersistence().loadCodeDraft('x')
    return mod
  }

  it('v5 → v6 keeps every session through the re-key, each under its own id', async () => {
    const doorEvents = [
      { type: 'challenge_start', timestamp: 1000 },
      { type: 'challenge_solved', timestamp: 1756000000000 },
    ]
    attackSessions['door-is-open'] = v5Session('door-is-open', 1756000000000, doorEvents)
    attackSessions['staff-only'] = v5Session('staff-only', null, [{ type: 'challenge_start', timestamp: 1000 }])

    await openFromV5()

    const carried = Object.values(attackSessions) as any[]
    expect(carried).toHaveLength(2)
    // Distinct ids, not merely present ones: one id shared by both would collapse them
    // back to a single record on the next write.
    expect(new Set(carried.map(s => s.sessionId)).size).toBe(2)
    for (const s of carried) expect(typeof s.sessionId).toBe('string')

    const door = carried.find(s => s.challengeSlug === 'door-is-open')!
    // Every other field, byte for byte. A carried-over record with an emptied timeline
    // is the same loss with a key attached.
    expect(door.challengeTitle).toBe('DOOR-IS-OPEN')
    expect(door.startedAt).toBe(1000)
    expect(door.solvedAt).toBe(1756000000000)
    expect(door.events).toEqual(doorEvents)
  })

  it('v5 → v6 reads the sessions out before deleting the store', async () => {
    attackSessions['door-is-open'] = v5Session('door-is-open', null, [])
    await openFromV5()
    // The order is the whole migration. Deleting first takes the records with it, and
    // the harness models that: a store deleted before its rows are read comes back empty.
    expect(deletedStores).toContain('attack-sessions')
    expect(createdStores).toContain('attack-sessions')
    expect(Object.keys(attackSessions)).toHaveLength(1)
    expect(storeKeyPaths['attack-sessions']).toBe('sessionId')
    const idx = createdIndexes.find(i => i.store === 'attack-sessions' && i.name === 'by-slug')
    expect(idx?.keyPath).toBe('challengeSlug')
  })

  it('v5 → v6 derives progress from every solved session it carries over', async () => {
    attackSessions['door-is-open'] = v5Session('door-is-open', 1756000000000, [])
    attackSessions['staff-only'] = v5Session('staff-only', null, [])

    await openFromV5()

    expect(challengeProgress['door-is-open']).toMatchObject({
      challengeSlug: 'door-is-open',
      firstCompletedAt: 1756000000000,
    })
    // The unsolved one gets no record at all — not a record with a null completion.
    // Before this change there was nowhere to record "attempted", and inventing one
    // here would report attempts the platform never actually counted.
    expect(challengeProgress['staff-only']).toBeUndefined()
  })

  it('v5 → v6 does not overwrite a progress record that already exists', async () => {
    attackSessions['door-is-open'] = v5Session('door-is-open', 1756009999999, [])
    challengeProgress['door-is-open'] = {
      challengeSlug: 'door-is-open',
      firstCompletedAt: 1756000000000,
      lastAttemptAt: 1756000000000,
      attemptCount: 1,
    }

    await openFromV5()

    // Same rule as `recordAttempt`, not a migration-only special case: a first
    // completion time already written is never moved.
    expect(challengeProgress['door-is-open'].firstCompletedAt).toBe(1756000000000)
  })

  it('a re-key that fails part way rolls back rather than half-migrating', async () => {
    const original = v5Session('door-is-open', 1756000000000, [{ type: 'challenge_start', timestamp: 1000 }])
    attackSessions['door-is-open'] = original

    const { openDB } = await import('idb')
    ;(openDB as ReturnType<typeof vi.fn>).mockImplementationOnce(
      // Dies after the sessions have been read and their store deleted.
      openDbFrom(5, ['attack-sessions', 'pentest-notes', 'code-drafts'], 'challenge-progress'),
    )
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')

    await expect(mod.useChallengePersistence().loadCodeDraft('x')).rejects.toThrow()

    // The learner's sessions are exactly as version 5 left them — same key, same
    // record, no half-applied `sessionId`.
    expect(attackSessions).toEqual({ 'door-is-open': original })
    // And the failure is visible. Resolving to an empty database instead would look
    // to the learner exactly like their work having been deleted.
    expect(mod.persistenceError.value).toEqual(expect.any(String))
    expect(mod.persistenceError.value).not.toBe('')
  })

  it('v5 → v6 leaves the other stores alone', async () => {
    pentestNotes['n1'] = { id: 'n1', challengeSlug: 'door-is-open', content: 'keep me', createdAt: 1, updatedAt: null }
    codeDrafts['door-is-open'] = { challengeSlug: 'door-is-open', code: 'print(1)', updatedAt: 1 }
    await openFromV5()
    expect(pentestNotes['n1'].content).toBe('keep me')
    expect(codeDrafts['door-is-open'].code).toBe('print(1)')
    expect(deletedStores).not.toContain('pentest-notes')
    expect(deletedStores).not.toContain('code-drafts')
  })

  // ─── v6: per-challenge progress ──────────────────────────────────────────────
  //
  // Kept apart from the sessions because "has this been completed" is a fact about the
  // challenge. Derived from the sessions it would change whenever one is deleted or one
  // recorded on another machine is brought in.

  it('a first solve sets the completion time', async () => {
    vi.setSystemTime(1756000000000)
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, loadProgress } = useChallengePersistence()

    await recordAttempt('door-is-open', true)

    const p = await loadProgress('door-is-open')
    expect(p).toEqual({
      challengeSlug: 'door-is-open',
      firstCompletedAt: 1756000000000,
      lastAttemptAt: 1756000000000,
      attemptCount: 1,
    })
  })

  it('an unsuccessful attempt records the attempt but no completion', async () => {
    vi.setSystemTime(1756000000000)
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, loadProgress } = useChallengePersistence()

    await recordAttempt('staff-only', false)

    const p = await loadProgress('staff-only')
    // `null`, not an absent key: an omitted field is indistinguishable from a record
    // written before the field existed.
    expect(p!.firstCompletedAt).toBeNull()
    expect(Object.keys(p!)).toContain('firstCompletedAt')
    expect(p!.lastAttemptAt).toBe(1756000000000)
    expect(p!.attemptCount).toBe(1)
  })

  it('progress is kept per challenge', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, loadProgress } = useChallengePersistence()
    await recordAttempt('door-is-open', true)
    await recordAttempt('staff-only', false)
    expect((await loadProgress('door-is-open'))!.firstCompletedAt).not.toBeNull()
    expect((await loadProgress('staff-only'))!.firstCompletedAt).toBeNull()
  })

  it('a later solve does not move the first completion time', async () => {
    vi.setSystemTime(1756000000000)
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, loadProgress } = useChallengePersistence()
    await recordAttempt('door-is-open', true)

    vi.setSystemTime(1756009999999)
    await recordAttempt('door-is-open', true)

    const p = await loadProgress('door-is-open')
    expect(p!.firstCompletedAt).toBe(1756000000000)
    // The other two fields do move, or "first" would be indistinguishable from
    // "the record is frozen".
    expect(p!.lastAttemptAt).toBe(1756009999999)
    expect(p!.attemptCount).toBe(2)
  })

  it('an unsuccessful attempt after a solve does not clear the completion time', async () => {
    vi.setSystemTime(1756000000000)
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, loadProgress } = useChallengePersistence()
    await recordAttempt('door-is-open', true)

    vi.setSystemTime(1756009999999)
    await recordAttempt('door-is-open', false)

    expect((await loadProgress('door-is-open'))!.firstCompletedAt).toBe(1756000000000)
  })

  it('loadProgress returns null for an untouched challenge', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadProgress } = useChallengePersistence()
    await expect(loadProgress('never-opened')).resolves.toBeNull()
  })

  // ─── Reading every progress record at once ───────────────────────────────────
  //
  // The challenge list needs the completion state of every challenge to render one
  // screen. Asked one challenge at a time that is one query per challenge on every
  // visit; asked this way the cost does not grow with the number of challenges.
  //
  // The action is deliberately uninterpreted — no filter, no sort, no verdict on what
  // counts as completed. A reader that decided completion here would put that rule in
  // the storage layer, where the list could not disagree with it and where the rule
  // would be invisible to anyone reading the list.

  it('listAllProgress returns every stored progress record', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, listAllProgress } = useChallengePersistence()
    await recordAttempt('door-is-open', true)
    await recordAttempt('staff-only', false)

    const slugs = (await listAllProgress()).map(r => r.challengeSlug).sort()
    expect(slugs).toEqual(['door-is-open', 'staff-only'])
  })

  it('listAllProgress returns an empty array when the store holds nothing', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { listAllProgress } = useChallengePersistence()
    await expect(listAllProgress()).resolves.toEqual([])
  })

  // Both records, unchanged. A `listAllProgress` that quietly dropped the unsolved ones
  // would still satisfy the list's happy path — and would make "attempted but not
  // solved" indistinguishable from "never opened" for every future caller.
  it('listAllProgress returns records whether or not the challenge was completed', async () => {
    vi.setSystemTime(1756000000000)
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { recordAttempt, listAllProgress } = useChallengePersistence()
    await recordAttempt('door-is-open', true)
    await recordAttempt('staff-only', false)

    const bySlug = Object.fromEntries((await listAllProgress()).map(r => [r.challengeSlug, r]))
    expect(bySlug['door-is-open'].firstCompletedAt).toBe(1756000000000)
    expect(bySlug['staff-only'].firstCompletedAt).toBeNull()
    expect(Object.keys(bySlug)).toHaveLength(2)
  })

  // ─── Deleting the whole database ─────────────────────────────────────────────
  //
  // Used by the shared-machine session gate when a learner chooses to clear. The whole
  // database rather than each store emptied in turn: the store list changes — this very
  // change adds one — and a list maintained at the call site would quietly stop covering
  // everything.

  it('deleteDatabase closes the cached connection and clears the cache before deleting', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft, deleteDatabase } = useChallengePersistence()
    await loadCodeDraft('x') // opens and caches a connection

    await deleteDatabase()

    // The order is the requirement. `deleteDatabase` does not fail while a connection
    // is open — it stalls in `blocked` indefinitely — so a delete issued before the
    // close never completes at all.
    expect(idbCalls).toEqual(['openDB', 'close', 'deleteDB'])
  })

  it('a later call opens a fresh database after a delete', async () => {
    const { openDB } = await import('idb')
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft, deleteDatabase } = useChallengePersistence()
    await loadCodeDraft('x')
    await deleteDatabase()

    ;(openDB as ReturnType<typeof vi.fn>).mockClear()
    await loadCodeDraft('x')
    // Not the cached handle: it points at a database that no longer exists, and every
    // read and write through it would throw with nothing to retry.
    expect(openDB).toHaveBeenCalledTimes(1)
  })

  it('the database is empty after a successful delete', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const api = useChallengePersistence()
    await api.saveAttackSession(aSession())
    await api.saveNote({ id: 'n1', challengeSlug: 'sqli-demo', content: 'x', createdAt: 1, updatedAt: null })
    await api.saveCodeDraft('sqli-demo', 'print(1)')
    await api.recordAttempt('sqli-demo', true)

    await api.deleteDatabase()

    expect(await api.listAttackSessions('sqli-demo')).toEqual([])
    expect(await api.loadNotesBySlug('sqli-demo')).toEqual([])
    expect(await api.loadCodeDraft('sqli-demo')).toBeNull()
    expect(await api.loadProgress('sqli-demo')).toBeNull()
  })

  it('deleting with nothing open does not fail', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    // No connection has been opened yet. Clearing has to work on a first visit too.
    await expect(useChallengePersistence().deleteDatabase()).resolves.toBeUndefined()
    expect(idbCalls).toEqual(['deleteDB'])
  })

  it('a delete blocked by another tab settles as a failure rather than hanging', async () => {
    vi.useFakeTimers()
    try {
      const { deleteDB } = await import('idb')
      ;(deleteDB as ReturnType<typeof vi.fn>).mockImplementationOnce((_n: string, { blocked }: any) => {
        blocked?.(6, null, {} as IDBVersionChangeEvent)
        // A blocked delete does not reject. It waits for every other connection to
        // close, which may be never.
        return new Promise(() => {})
      })

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().deleteDatabase()
      const settled = vi.fn()
      void call.then(settled, settled)

      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).rejects.toThrow()
      expect(settled).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a delete that never settles and never reports blocked still fails', async () => {
    vi.useFakeTimers()
    try {
      const { deleteDB } = await import('idb')
      // The bound is unconditional, not armed by `blocked`. Measured on the open path:
      // `blocked` fires only for the request at the head of the version-change queue,
      // so a request queued behind an abandoned one receives no callback at all.
      ;(deleteDB as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise(() => {}))

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().deleteDatabase()
      void call.catch(() => {})
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).rejects.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a delete that completes inside the bound resolves', async () => {
    vi.useFakeTimers()
    try {
      const { deleteDB } = await import('idb')
      ;(deleteDB as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise<void>(resolve => { setTimeout(resolve, 1000) }),
      )

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().deleteDatabase()
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('hasAnyStoredData reports false when every store is empty', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await expect(useChallengePersistence().hasAnyStoredData()).resolves.toBe(false)
  })

  it('hasAnyStoredData asks every store this database has', async () => {
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    // One case per store, so a check that consults a shorter list than the schema
    // creates fails on whichever store it left out — including the one this change
    // adds, which no earlier version of such a list could have named.
    for (const store of mod.OBJECT_STORES) {
      vi.resetModules()
      const fresh = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      for (const table of [codeDrafts, attackSessions, pentestNotes, challengeProgress]) {
        for (const k of Object.keys(table)) delete table[k]
      }
      tableFor(store)!['only-row'] = { marker: store }
      await expect(fresh.useChallengePersistence().hasAnyStoredData(), store).resolves.toBe(true)
    }
  })

  it('hasAnyStoredData answers for the object stores alone, not for localStorage', async () => {
    // A note draft and a saved Repeater request: the learner's own attack work, both of
    // them localStorage keys that the shared-machine clear removes, and neither of them
    // in any object store. This function must keep saying false here. It answers half
    // the shared-machine question and the gate composes the other half, so a version
    // that quietly grew to read localStorage would put the composition in two places at
    // once — and the doc comment above it would be over-claiming again, which is the
    // defect this pins shut.
    localStorage.setItem('pentest-draft-door-is-open', 'my notes')
    localStorage.setItem('challenge-door-is-open.localhost:repeater-snapshots', '[{"name":"admin bypass"}]')

    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await expect(useChallengePersistence().hasAnyStoredData()).resolves.toBe(false)
  })

  // ─── The failure has to be visible ──────────────────────────────────────────
  //
  // Measured: with the database blocked, the learner's notes vanished on reload and the
  // export button produced no file, with nothing in the console. The failure needs to be
  // readable state, not just a rejected promise nobody renders.

  it('persistenceError is null while the database opens normally', async () => {
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await mod.useChallengePersistence().loadCodeDraft('x')
    expect(mod.persistenceError.value).toBeNull()
  })

  it('persistenceError carries the reason after a failed open', async () => {
    const { openDB } = await import('idb')
    const mockOpenDB = openDB as ReturnType<typeof vi.fn>
    mockOpenDB.mockImplementationOnce(async () => { throw new Error('SecurityError: storage disabled') })

    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await expect(mod.useChallengePersistence().loadCodeDraft('x')).rejects.toThrow()
    expect(mod.persistenceError.value).toEqual(expect.any(String))
    expect(mod.persistenceError.value).not.toBe('')
  })

  it('persistenceError clears once the database opens again', async () => {
    const { openDB } = await import('idb')
    const mockOpenDB = openDB as ReturnType<typeof vi.fn>
    mockOpenDB.mockImplementationOnce(async () => { throw new Error('transient failure') })

    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = mod.useChallengePersistence()
    await expect(loadCodeDraft('x')).rejects.toThrow()
    expect(mod.persistenceError.value).not.toBeNull()

    // The tab that was in the way has gone; the next call succeeds and the warning must
    // stop being shown, or it becomes a permanent scar on a working page.
    await expect(loadCodeDraft('x')).resolves.toBeNull()
    expect(mod.persistenceError.value).toBeNull()
  })

  // ─── Opening the database cannot hang ───────────────────────────────────────
  //
  // Measured in a real browser: with a second tab holding the version 4 connection open,
  // `indexedDB.open('challenge-tools')` never settled, and every path that awaited it
  // stopped — including the Code panel's editor creation, which left a sized but empty
  // container next to an enabled Run button.

  // Measured in Chrome: `blocked` fires only for the request at the head of the
  // version-change queue. Once one request has been abandoned, every later `open` sits
  // behind it and receives no `blocked` event at all — two consecutive probes both
  // stayed pending with `blockedFired === false`. A timeout armed inside `blocked`
  // therefore never arms for exactly the calls that need it.
  it('rejects an open that never settles even when blocked never fires', async () => {
    vi.useFakeTimers()
    try {
      const { openDB } = await import('idb')
      const mockOpenDB = openDB as ReturnType<typeof vi.fn>
      mockOpenDB.mockImplementationOnce(() => new Promise(() => { /* never settles, and no callback fires */ }))

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().loadCodeDraft('x')
      void call.catch(() => {})
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).rejects.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not reject an open that settles inside the bound', async () => {
    vi.useFakeTimers()
    try {
      const { openDB } = await import('idb')
      const mockOpenDB = openDB as ReturnType<typeof vi.fn>
      mockOpenDB.mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({ get: () => undefined, put: vi.fn(), getAll: () => [], getAllFromIndex: () => [], delete: vi.fn(), close: vi.fn() }), 1000)
      }))

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().loadCodeDraft('x')
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a blocked open instead of leaving it pending', async () => {
    vi.useFakeTimers()
    try {
      const { openDB } = await import('idb')
      const mockOpenDB = openDB as ReturnType<typeof vi.fn>
      mockOpenDB.mockImplementationOnce((_n: string, _v: number, { blocked }: any) => {
        blocked?.(4, 5, {} as IDBVersionChangeEvent)
        return new Promise(() => { /* never settles, as a blocked open does not */ })
      })

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const call = mod.useChallengePersistence().loadCodeDraft('x')
      const settled = vi.fn()
      void call.then(settled, settled)

      await vi.advanceTimersByTimeAsync(10_000)
      await expect(call).rejects.toThrow()
      expect(settled).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('reopens on the next call after a blocked open rejected', async () => {
    vi.useFakeTimers()
    try {
      const { openDB } = await import('idb')
      const mockOpenDB = openDB as ReturnType<typeof vi.fn>
      mockOpenDB.mockImplementationOnce((_n: string, _v: number, { blocked }: any) => {
        blocked?.(4, 5, {} as IDBVersionChangeEvent)
        return new Promise(() => {})
      })

      vi.resetModules()
      const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
      const { loadCodeDraft } = mod.useChallengePersistence()
      const first = loadCodeDraft('x')
      // Attach a handler before advancing: the rejection lands during the advance, and a
      // promise with no handler at that moment is reported as an unhandled rejection.
      void first.catch(() => {})
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(first).rejects.toThrow()

      // The cached promise has to be cleared, or every later call returns this rejection
      // and the tool never recovers even once the other tab is gone.
      mockOpenDB.mockClear()
      vi.useRealTimers()
      await expect(loadCodeDraft('x')).resolves.toBeNull()
      expect(mockOpenDB).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('closes this connection when it is blocking another tab upgrade', async () => {
    const { openDB } = await import('idb')
    const mockOpenDB = openDB as ReturnType<typeof vi.fn>
    const close = vi.fn()
    let fireBlocking: (() => void) | null = null
    mockOpenDB.mockImplementationOnce(async (_n: string, _v: number, { blocking }: any) => {
      fireBlocking = () => blocking?.(5, 6, {} as IDBVersionChangeEvent)
      return { close, get: vi.fn(() => undefined), put: vi.fn(), getAll: vi.fn(() => []), getAllFromIndex: vi.fn(() => []), delete: vi.fn() }
    })

    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = mod.useChallengePersistence()
    await loadCodeDraft('x')
    fireBlocking!()
    await Promise.resolve()
    await Promise.resolve()
    expect(close).toHaveBeenCalled()
  })

  it('opens a fresh connection after getting out of another tab\'s way', async () => {
    const { openDB } = await import('idb')
    const mockOpenDB = openDB as ReturnType<typeof vi.fn>
    let fireBlocking: (() => void) | null = null
    mockOpenDB.mockImplementationOnce(async (_n: string, _v: number, { blocking }: any) => {
      fireBlocking = () => blocking?.(5, 6, {} as IDBVersionChangeEvent)
      return { close: vi.fn(), get: vi.fn(() => undefined), put: vi.fn(), getAll: vi.fn(() => []), getAllFromIndex: vi.fn(() => []), delete: vi.fn() }
    })

    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = mod.useChallengePersistence()
    await loadCodeDraft('x')
    fireBlocking!()
    await Promise.resolve()
    await Promise.resolve()

    mockOpenDB.mockClear()
    await loadCodeDraft('x')
    // Reusing the closed handle is the failure this guards: every later read and write
    // would throw InvalidStateError with nothing to retry.
    expect(mockOpenDB).toHaveBeenCalledTimes(1)
  })

  // ─── v5: the code-drafts store ───────────────────────────────────────────────
  //
  // One record per challenge, so the write is an upsert and there is no cleanup path.
  // That is the whole reason this replaces the named-script store, whose every save
  // minted a fresh uuid and therefore accumulated duplicates under one name.

  it('saveCodeDraft stores the draft under the challenge slug', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveCodeDraft, loadCodeDraft } = useChallengePersistence()
    const before = Date.now()
    await saveCodeDraft('door-is-open', "print(1)")
    const draft = await loadCodeDraft('door-is-open')
    expect(draft).not.toBeNull()
    expect(draft!.challengeSlug).toBe('door-is-open')
    expect(draft!.code).toBe("print(1)")
    expect(draft!.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('saving a draft twice replaces rather than appends', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveCodeDraft, loadCodeDraft } = useChallengePersistence()
    await saveCodeDraft('door-is-open', 'first')
    await saveCodeDraft('door-is-open', 'second')
    // The count, not just the content: the defect this replaces was a second record
    // appearing under the same name, which a content-only assertion cannot see.
    expect(Object.keys(codeDrafts)).toHaveLength(1)
    expect((await loadCodeDraft('door-is-open'))!.code).toBe('second')
  })

  it('drafts are separated by challenge', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveCodeDraft, loadCodeDraft } = useChallengePersistence()
    await saveCodeDraft('door-is-open', 'A')
    await saveCodeDraft('staff-only', 'B')
    expect((await loadCodeDraft('door-is-open'))!.code).toBe('A')
    expect((await loadCodeDraft('staff-only'))!.code).toBe('B')
  })

  it('an empty draft is stored, not discarded', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveCodeDraft, loadCodeDraft } = useChallengePersistence()
    await saveCodeDraft('door-is-open', '')
    const draft = await loadCodeDraft('door-is-open')
    // `toBeNull()` and `code === ''` are different facts here. A learner who cleared the
    // editor and reloaded must get the empty editor back, not the starter document.
    expect(draft).not.toBeNull()
    expect(draft!.code).toBe('')
  })

  it('loadCodeDraft returns null for a challenge that has no draft', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadCodeDraft } = useChallengePersistence()
    await expect(loadCodeDraft('never-opened')).resolves.toBeNull()
  })

  // ─── v3: pentest-notes store ─────────────────────────────────────────────────

  it('saveNote persists note to IndexedDB', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveNote } = useChallengePersistence()
    const note = { id: 'note-1', challengeSlug: 'sqli-demo', content: 'test note', createdAt: Date.now(), updatedAt: null }
    await saveNote(note)
    expect(pentestNotes['note-1']).toEqual(note)
  })

  it('loadNotesBySlug returns only notes for the given slug', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveNote, loadNotesBySlug } = useChallengePersistence()
    const now = Date.now()
    await saveNote({ id: 'n1', challengeSlug: 'sqli-demo', content: 'a', createdAt: now, updatedAt: null })
    await saveNote({ id: 'n2', challengeSlug: 'php-demo',  content: 'b', createdAt: now, updatedAt: null })

    const notes = await loadNotesBySlug('sqli-demo')
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('n1')
  })

  it('loadNotesBySlug returns empty array when no notes exist', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { loadNotesBySlug } = useChallengePersistence()
    const notes = await loadNotesBySlug('nonexistent-challenge')
    expect(notes).toEqual([])
  })

  it('deleteNote removes note from the store', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveNote, deleteNote, loadNotesBySlug } = useChallengePersistence()
    await saveNote({ id: 'del-1', challengeSlug: 'test', content: 'bye', createdAt: Date.now(), updatedAt: null })
    await deleteNote('del-1')
    const notes = await loadNotesBySlug('test')
    expect(notes.find(n => n.id === 'del-1')).toBeUndefined()
  })

  it('saveNote performs upsert (second save overwrites first)', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const { saveNote, loadNotesBySlug } = useChallengePersistence()
    const base = { id: 'upsert-1', challengeSlug: 'test', content: 'original', createdAt: 1000, updatedAt: null }
    await saveNote(base)
    await saveNote({ ...base, content: 'updated', updatedAt: 2000 })
    const notes = await loadNotesBySlug('test')
    expect(notes).toHaveLength(1)
    expect(notes[0].content).toBe('updated')
    expect(notes[0].updatedAt).toBe(2000)
  })
})
