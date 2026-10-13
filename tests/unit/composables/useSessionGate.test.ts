import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock useChallengePersistence ─────────────────────────────────────────────
//
// The gate asks one question of the database — "is any of it non-empty" — and one
// action of it: delete the whole thing. Both are stubbed here; their own behaviour is
// covered by useChallengePersistence.test.ts.
let storeContents: Record<string, unknown[]> = {}
let openRejects = false
const mockDeleteDatabase = vi.fn(async () => {})
const mockCountAll = vi.fn(async () => {
  if (openRejects) throw new Error('SecurityError: storage disabled')
  return storeContents
})

vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  OBJECT_STORES: ['attack-sessions', 'pentest-notes', 'code-drafts', 'challenge-progress'] as const,
  useChallengePersistence: () => ({
    deleteDatabase: mockDeleteDatabase,
    hasAnyStoredData: async () => {
      const contents = await mockCountAll()
      return Object.values(contents).some(rows => rows.length > 0)
    },
  }),
}))

// ─── Storage doubles ──────────────────────────────────────────────────────────
let sessionStore: Record<string, string> = {}
let sessionStorageThrows = false
// Writes only: a start record an earlier document left stays readable, as it does when a
// browser setting or a full quota refuses new writes.
let sessionWriteThrows = false
let localStore: Record<string, string> = {}
// Two independent switches, because the two halves of the sweep fail in different
// places: listing the keys, and removing one key out of several. A stub that can only
// fail before it starts cannot reach the half-swept state.
let localReadThrows = false
let localRemoveThrowsOn: string | null = null

function installStorageDoubles() {
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => {
      if (sessionStorageThrows) throw new Error('SecurityError: access denied')
      return sessionStore[k] ?? null
    },
    setItem: (k: string, v: string) => {
      if (sessionStorageThrows || sessionWriteThrows) throw new Error('SecurityError: access denied')
      sessionStore[k] = v
    },
  })
  vi.stubGlobal('localStorage', {
    // Reads throw as well as writes: a localStorage that refuses to answer is the point
    // of the failure tests below, and unreadable is unknown rather than empty.
    get length() {
      if (localReadThrows) throw new Error('SecurityError: access denied')
      return Object.keys(localStore).length
    },
    key: (i: number) => {
      if (localReadThrows) throw new Error('SecurityError: access denied')
      return Object.keys(localStore)[i] ?? null
    },
    getItem: (k: string) => localStore[k] ?? null,
    setItem: (k: string, v: string) => { localStore[k] = v },
    // Fails on one named key rather than on the first call, so a sweep can be caught
    // half way: some keys already gone, the rest still there.
    removeItem: (k: string) => {
      if (k === localRemoveThrowsOn) throw new Error('SecurityError: access denied')
      delete localStore[k]
    },
  })
}

beforeEach(() => {
  storeContents = { 'attack-sessions': [], 'pentest-notes': [], 'code-drafts': [], 'challenge-progress': [] }
  openRejects = false
  sessionStore = {}
  sessionStorageThrows = false
  sessionWriteThrows = false
  localStore = {}
  localReadThrows = false
  localRemoveThrowsOn = null
  mockDeleteDatabase.mockClear()
  mockCountAll.mockClear()
  installStorageDoubles()
  vi.resetModules()
})

async function loadGate() {
  return await import('../../../.vitepress/theme/composables/useSessionGate')
}

describe('useSessionGate', () => {
  // ─── Whether to ask ─────────────────────────────────────────────────────────

  it('does not ask when every store is empty, and records the decision', async () => {
    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(false)
    // The marker is written even though nothing was asked, so the empty database is
    // not re-checked on every page of the visit.
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
  })

  it('asks when a stored attack session exists', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
  })

  it('asks when only notes exist', async () => {
    storeContents['pentest-notes'] = [{ id: 'n1' }]
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
  })

  it('asks when only a progress record exists', async () => {
    // The store this change adds. A check written against a hard-coded list of the
    // three stores that existed before would miss it and hand the previous learner's
    // completion history to the next one.
    storeContents['challenge-progress'] = [{ challengeSlug: 'door-is-open' }]
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
  })

  it('asks when only saved Repeater requests are stored, with every object store empty', async () => {
    // The learner's own attack work, and it lives in localStorage rather than in an
    // object store. Asking the database alone hands it to the next person in silence.
    //
    // The locale sits beside it deliberately: the platform writes that one by itself on
    // every cold load of a localised path, and the narrowing that stops it making the
    // gate ask must not take the learner's saved requests with it.
    localStore['wxl-locale'] = 'zh-TW'
    localStore['challenge-door-is-open.localhost:repeater-snapshots'] = '[{"name":"admin bypass"}]'
    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
    // Asking once and then marking the session decided would still hand the work over
    // on the next page.
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('asks when only a note draft is stored', async () => {
    localStore['pentest-draft-door-is-open'] = 'my notes'
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
  })

  // ─── Keys the platform writes by itself are not evidence of anybody ─────────

  it('a fresh browser that cold-loaded a localised page is not asked', async () => {
    // Measured: `enhanceApp` calls `persistLocale(detected)` for every non-`en` path, and
    // it runs before the gate's `onMounted`. So on a brand-new machine the first cold
    // load of a localised page already owns a key by the time the gate looks — and the
    // gate told that visitor this browser held saved work, offering only to inherit
    // nothing or to delete nothing.
    localStore['wxl-locale'] = 'zh-TW'

    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(false)
    expect(gate.decision.value).toBe('not-needed')
    // And it is recorded, so the same non-question is not re-asked on every page.
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
  })

  it('a fresh browser on a challenge page, with only default panel state, is not asked', async () => {
    // Every one of these lands at panel setup on a first visit: `useLocalStorage` writes
    // its default when the key is absent, and the Repeater and editor panels are rendered
    // with `v-show`, so they mount whether or not the learner opens their tab. The
    // defaults are derived from the owning modules rather than typed out again, so this
    // test cannot go on passing against a default that has moved.
    const { DEFAULT_EDITOR_SETTINGS } = await import('../../../.vitepress/theme/composables/useEditorSettings')
    const { DEFAULT_SOURCE_VIEWER_SETTINGS } = await import('../../../.vitepress/theme/composables/useSourceViewerSettings')
    const { REPEATER_SNAPSHOTS_DEFAULT } = await import('../../../.vitepress/theme/composables/localStorageKeys')
    localStore['wxl-locale'] = 'zh-TW'
    localStore['challenge-door-is-open.localhost:repeater-snapshots'] = REPEATER_SNAPSHOTS_DEFAULT
    localStore['wxl:editor-settings'] = JSON.stringify(DEFAULT_EDITOR_SETTINGS)
    localStore['wxl:source-viewer-settings'] = JSON.stringify(DEFAULT_SOURCE_VIEWER_SETTINGS)

    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(false)
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
  })

  it('asks when a panel setting differs from the default the platform wrote', async () => {
    // The converse, and the boundary: the same key, one value either side of it. A
    // learner who changed the font size did something here, and the gate must offer to
    // clear it.
    const { DEFAULT_EDITOR_SETTINGS } = await import('../../../.vitepress/theme/composables/useEditorSettings')
    localStore['wxl:editor-settings'] = JSON.stringify({ ...DEFAULT_EDITOR_SETTINGS, fontSize: 18 })

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('still clears the keys it does not ask about, apart from the exempt one', async () => {
    // Three questions read one list and they are not the same question. Detection ignores
    // panel state the platform planted; clearing must not, or the previous learner's panel
    // state survives a clear that reported success — which is the audit finding this list
    // exists to close. The locale is the one key where the third question overrides:
    // asked about by neither and removed by neither. A stored session is what makes the
    // gate ask here.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['challenge-door-is-open.localhost:repeater-snapshots'] = '[]'
    localStore['wxl:editor-settings'] = '{"version":1,"autocomplete":true,"closeBrackets":true,"fontSize":13}'

    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
    await gate.clearEverything(vi.fn())

    expect(localStore).toEqual({ 'wxl-locale': 'zh-TW' })
  })

  it('does not ask for keys this platform did not write', async () => {
    // Without this, the obvious wrong fix — `localStorage.length > 0` — passes the two
    // tests above and asks every visitor of any site on this origin, forever.
    localStore['vitepress-theme-appearance'] = 'dark'
    localStore['unrelated-key'] = 'keep me'
    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(false)
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
  })

  it('consults localStorage before the database, so a blocked open still asks', async () => {
    // The measured shape of the failure: a second tab holding an older version leaves
    // `indexedDB.open` pending until the time limit, and the note draft beside it is
    // untouched. Checking localStorage first is what makes the choice appear at all
    // here, and it appears without waiting the open out.
    openRejects = true
    localStore['pentest-draft-door-is-open'] = 'my notes'
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
    expect(mockCountAll).not.toHaveBeenCalled()
  })

  it('does not ask when the decision marker is already present', async () => {
    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    sessionStore[GATE_STORAGE_KEY] = GATE_DECIDED
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(false)
    // And it does not even look: the marker is read synchronously and the database is
    // left alone, so the common path costs nothing.
    expect(mockCountAll).not.toHaveBeenCalled()
  })

  // ─── Storage that misbehaves ────────────────────────────────────────────────

  it('asks when sessionStorage cannot be read', async () => {
    sessionStorageThrows = true
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    // Asking twice is a nuisance. Not asking because storage misbehaved hands the
    // previous learner's work to the next one.
    expect(gate.shouldAsk.value).toBe(true)
  })

  it('asks when the database cannot be opened', async () => {
    openRejects = true
    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    // Unreadable is unknown, not empty. The two subsystems fail independently: an
    // `indexedDB.open` blocked by another tab never settles, while the previous
    // learner's note drafts and saved Repeater requests sit untouched in localStorage.
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.decision.value).toBe('undecided')
    // And nothing is recorded: a question that was never answered must not be written
    // down as answered, or every later page of this visit inherits the failure.
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('asks when localStorage cannot be read', async () => {
    localReadThrows = true
    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.decision.value).toBe('undecided')
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  // ─── Continuing ─────────────────────────────────────────────────────────────

  it('continuing writes the marker and touches no data', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['pentest-draft-door-is-open'] = 'notes'

    const { useSessionGate, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.keepExistingData()

    expect(gate.shouldAsk.value).toBe(false)
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
    expect(mockDeleteDatabase).not.toHaveBeenCalled()
    expect(localStore).toEqual({ 'wxl-locale': 'zh-TW', 'pentest-draft-door-is-open': 'notes' })
  })

  // ─── Clearing ───────────────────────────────────────────────────────────────

  it('clearing deletes the database and every local key it owns but the exempt one', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['pentest-draft-door-is-open'] = 'a'
    localStore['pentest-draft-staff-only'] = 'b'
    // The learner's own attack work, and the two settings keys. All four were left
    // behind by the first version of this clear, which named only the locale and the
    // note drafts — measured in a browser after everything else reported success.
    localStore['challenge-door-is-open.localhost:repeater-snapshots'] = '[{"name":"admin bypass"}]'
    localStore['wxl:editor-settings'] = '{"fontSize":18}'
    localStore['wxl:source-viewer-settings'] = '{"fontSize":18}'
    // Not this platform's. VitePress owns it, and reaching outside what we wrote is a
    // different kind of mistake from leaving our own behind.
    localStore['vitepress-theme-appearance'] = 'dark'
    localStore['unrelated-key'] = 'keep me'

    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    const reload = vi.fn()
    await gate.clearEverything(reload)

    expect(mockDeleteDatabase).toHaveBeenCalled()
    // Only what this platform wrote. A blanket `localStorage.clear()` would take
    // anything else served from the same origin with it. And not the locale: it is the
    // one key the list declares exempt, because the platform writes it on every cold
    // load of a localised path and the learner writes the same key by picking a
    // language — the stored value cannot say which of them was here.
    expect(localStore).toEqual({
      'wxl-locale': 'zh-TW',
      'vitepress-theme-appearance': 'dark',
      'unrelated-key': 'keep me',
    })
    expect(reload).toHaveBeenCalled()
  })

  it('clearing leaves the interface in the language it was in', async () => {
    // The boundary either side of it, in one test: an exempt key at a value the learner
    // chose survives untouched, and a key one declaration away from it does not.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['wxl:editor-settings'] = '{"fontSize":18}'

    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    const reload = vi.fn()
    await gate.clearEverything(reload)

    expect(localStore['wxl-locale']).toBe('zh-TW')
    expect(localStore['wxl:editor-settings']).toBeUndefined()
    // The whole clear succeeded, so the reload happens — the exemption is not a failure.
    expect(reload).toHaveBeenCalled()
  })

  it('clearing reloads only after the delete succeeds', async () => {
    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    const reload = vi.fn()
    await gate.clearEverything(reload)

    // The choice stays up, carrying the reason and what to do about it. Reloading here
    // would show the learner a page that still holds the previous learner's work.
    expect(reload).not.toHaveBeenCalled()
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.clearError.value).toEqual(expect.any(String))
    expect(gate.clearError.value).not.toBe('')
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('a failed clear leaves the local keys alone', async () => {
    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['challenge-door-is-open.localhost:repeater-snapshots'] = '[]'

    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())

    // Half a clear is worse than none: the locale would be gone while the previous
    // learner's sessions stayed.
    expect(localStore['wxl-locale']).toBe('zh-TW')
    expect(localStore['challenge-door-is-open.localhost:repeater-snapshots']).toBe('[]')
  })

  it('a local key that refuses to be removed stops the clear instead of reloading past it', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['wxl:editor-settings'] = '{"fontSize":18}'
    localStore['pentest-draft-door-is-open'] = 'notes'
    // The second key the sweep reaches refuses; by then the first is already gone. That
    // state — some keys removed, some not — is what a swallowed error used to present to
    // the learner as a finished clear. Both of these are keys the sweep takes; the locale
    // is exempt and is never reached, so it cannot stand in for the one already removed.
    localRemoveThrowsOn = 'pentest-draft-door-is-open'

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    const reload = vi.fn()
    await gate.clearEverything(reload)

    expect(localStore['wxl:editor-settings']).toBeUndefined()
    expect(localStore['pentest-draft-door-is-open']).toBe('notes')
    // Untouched on this path too, for the same reason it is untouched on the happy one.
    expect(localStore['wxl-locale']).toBe('zh-TW')
    // The same policy as a failed delete: the choice stays up carrying the reason, no
    // marker, no reload. Reloading here would show the learner a page that still holds
    // the previous learner's note draft.
    expect(reload).not.toHaveBeenCalled()
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.decision.value).toBe('undecided')
    expect(gate.clearError.value).toEqual(expect.any(String))
    expect(gate.clearError.value).not.toBe('')
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  // ─── Continuing after the irreversible half ─────────────────────────────────

  // Clearing has two halves and only the first cannot be undone. The sweep runs after the
  // database is already gone, and a sweep that fails keeps the choice on screen — at
  // which point there is no database left for "continue with this work" to mean.
  async function reachDeletedDatabase() {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'
    localStore['pentest-draft-door-is-open'] = 'notes'
    localRemoveThrowsOn = 'pentest-draft-door-is-open'

    const mod = await loadGate()
    const gate = mod.useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())
    return { ...mod, gate }
  }

  it('records that the database is gone once the delete has resolved', async () => {
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()

    // The delete resolved, so the object stores are gone; the sweep did not, so residue
    // remains and the choice stays up carrying the reason.
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.clearError.value).not.toBe(null)
    expect(localStore['pentest-draft-door-is-open']).toBe('notes')
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('exposes the flag under its new name only, with no alias left under the old one', async () => {
    const { gate } = await reachDeletedDatabase()

    // The old name began with "stored" and claimed the learner's work was gone. No key on
    // the public surface may carry it, under any spelling of that prefix.
    expect(Object.keys(gate).filter(key => /^stored/i.test(key))).toEqual([])
    expect(gate).toHaveProperty('databaseDeleted')
  })

  it("keeps the flag set when a later run's delete is rejected", async () => {
    const { gate } = await reachDeletedDatabase()

    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    await gate.clearEverything(vi.fn())

    // The second delete really ran and really failed; the first one had already resolved.
    expect(mockDeleteDatabase).toHaveBeenCalledTimes(2)
    expect(gate.clearError.value).toBe('blocked by another tab')
    expect(gate.databaseDeleted.value).toBe(true)
  })

  it("keeps the flag set when a later run's sweep fails again", async () => {
    const { gate } = await reachDeletedDatabase()

    await gate.clearEverything(vi.fn())

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(2)
    expect(gate.clearError.value).not.toBe(null)
    expect(localStore['pentest-draft-door-is-open']).toBe('notes')
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe('sweep')
  })

  it("sets the flag when a later run's delete resolves after an earlier one was rejected", async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['pentest-draft-door-is-open'] = 'notes'
    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    await gate.clearEverything(vi.fn())
    expect(gate.databaseDeleted.value).toBe(false)

    localRemoveThrowsOn = 'pentest-draft-door-is-open'
    await gate.clearEverything(vi.fn())
    expect(gate.clearError.value).not.toBe(null)
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe('sweep')
  })

  it("leaves the flag unset when a later run's delete is rejected again", async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    mockDeleteDatabase
      .mockRejectedValueOnce(new Error('blocked by another tab'))
      .mockRejectedValueOnce(new Error('blocked by another tab'))
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    await gate.clearEverything(vi.fn())
    await gate.clearEverything(vi.fn())

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(2)
    expect(gate.databaseDeleted.value).toBe(false)
    expect(gate.clearFailurePhase.value).toBe('delete')
  })

  it('starts a new document with the flag unset after a sweep failure', async () => {
    const { gate, CLEAR_STARTED_STORAGE_KEY } = await reachDeletedDatabase()
    expect(gate.databaseDeleted.value).toBe(true)

    // A new document: module state does not survive a page load, storage does. The start
    // record survives the sweep failure, and loading reads it back; the flag is not
    // restored from it or from anything else.
    expect(sessionStore[CLEAR_STARTED_STORAGE_KEY]).toBeDefined()
    vi.resetModules()
    const { useSessionGate } = await loadGate()
    const next = useSessionGate()
    await next.evaluate()

    expect(next.clearStarted.value).toBe(true)
    expect(next.databaseDeleted.value).toBe(false)
  })

  it('starts a new document with the flag unset after a rejected delete', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    const first = await loadGate()
    const gate = first.useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())
    expect(sessionStore[first.CLEAR_STARTED_STORAGE_KEY]).toBeDefined()

    vi.resetModules()
    const { useSessionGate } = await loadGate()
    const next = useSessionGate()
    await next.evaluate()

    expect(next.clearStarted.value).toBe(true)
    expect(next.databaseDeleted.value).toBe(false)
  })

  it('continuing after the database is gone changes nothing', async () => {
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()

    gate.keepExistingData()

    // Not merely hidden. A hidden button is a statement about the screen; this composable
    // is exported and module-scoped, and reporting `kept` over a database that no longer
    // exists would be false whichever surface asked for it.
    expect(gate.decision.value).toBe('undecided')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('continuing is withdrawn by a deletion that could not be confirmed', async () => {
    // This case used to assert the opposite, on the reasoning that "a blocked delete
    // leaves every record in place, so continuing is still exactly true". That reasoning
    // is false: `deleteDatabase` neither fails nor completes while another tab holds the
    // database, and the bound placed on it does not cancel the request — so a delete that
    // was reported as failed is still queued and completes the moment the other tab
    // closes. The claim being corrected is that one. The setup and the untouched-data
    // assertions below are unchanged; what flipped is who may still be offered the work.
    mockDeleteDatabase.mockRejectedValueOnce(new Error('blocked by another tab'))
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())

    expect(gate.clearError.value).not.toBe(null)
    // Still false, and deliberately so: nothing is known to have been deleted either.
    // The withdrawal below is keyed on the clear having been started, not on this.
    expect(gate.databaseDeleted.value).toBe(false)
    expect(gate.clearStarted.value).toBe(true)

    gate.keepExistingData()
    expect(gate.decision.value).not.toBe('kept')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
    // The sweep never ran on this path, so the locale key is untouched — that half of the
    // original assertion still holds and is kept.
    expect(localStore['wxl-locale']).toBe('zh-TW')
  })

  it('a later check does not dismiss the choice by itself once the database is gone', async () => {
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()

    // What a re-run of the detection would see: the stores are gone, so they answer
    // empty, and the un-swept residue is a note draft removed here by hand to reach the
    // branch. Writing the marker there would take the failure report off the screen and
    // record an answer the learner never gave.
    storeContents['attack-sessions'] = []
    delete localStore['pentest-draft-door-is-open']
    await gate.evaluate()

    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.decision.value).toBe('undecided')
  })

  // ─── The one state with no other way out ────────────────────────────────────

  it('acknowledging the report releases the page without answering the question', async () => {
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()

    // Everything that could have moved the decision is gone by here: continue refuses on
    // `databaseDeleted`, the markup withdraws it, a retry runs the whole clear again and,
    // while the cause persists, stops at the sweep again, and a later `evaluate` returns
    // early on the same flag. Without this the decision stays `undecided` for the life of
    // the page, and the deferred locale redirect — which waits on it — never runs.
    expect(gate.decision.value).toBe('undecided')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('dismissed')
    expect(gate.shouldAsk.value).toBe(false)
    // No marker, and this is the whole difference between acknowledging a report and
    // answering the question. The question was never answered and an unknown amount of
    // the previous learner's localStorage is still on this machine, so the next cold
    // load must ask again rather than be silent about residue that is still there.
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
    expect(localStore['pentest-draft-door-is-open']).toBe('notes')
  })

  // K4. The flag is set by the earlier run's delete; this run's delete was held, and a
  // held delete is not cancelled by giving up on it. Letting the page carry on here lets
  // the attack session in memory be saved straight back while the delete may still land.
  it('acknowledging does nothing after a later run whose delete did not finish', async () => {
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    await gate.clearEverything(vi.fn())
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe('delete')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('undecided')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('acknowledging is accepted after a later run whose sweep failed again', async () => {
    // P9. That run's delete resolved, so nothing it issued is pending; the sweep is the
    // part that stopped, and there is no other way out of this report.
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()
    await gate.clearEverything(vi.fn())
    expect(gate.clearFailurePhase.value).toBe('sweep')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('dismissed')
    expect(gate.shouldAsk.value).toBe(false)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('acknowledging is accepted when a later run deleted and then failed to sweep after a held delete', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['pentest-draft-door-is-open'] = 'notes'
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    // P14. The first run's delete was held; the later run's delete resolved, and deletes
    // of one database are processed in order, so the held one had finished before it.
    await gate.clearEverything(vi.fn())
    expect(gate.clearFailurePhase.value).toBe('delete')
    expect(gate.databaseDeleted.value).toBe(false)
    localRemoveThrowsOn = 'pentest-draft-door-is-open'
    await gate.clearEverything(vi.fn())
    expect(gate.clearFailurePhase.value).toBe('sweep')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('dismissed')
    expect(gate.shouldAsk.value).toBe(false)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('acknowledging does nothing while a later run is in flight after a sweep failure', async () => {
    // P6. The earlier run's report was cleared when this run started; there is nothing
    // on screen to acknowledge, and the run's delete is still pending.
    const { gate, GATE_STORAGE_KEY } = await reachDeletedDatabase()
    let release: () => void = () => {}
    mockDeleteDatabase.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve }))
    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(2))

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('undecided')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
    release()
    await run
  })

  it('denies progress access after the report was acknowledged', async () => {
    // T16a. Acknowledging releases the page, not the question: the clear stopped half
    // way, so progress stays out of reach until a clear succeeds or a new session asks.
    const { gate, isProgressAccessAllowed } = await reachDeletedDatabase()
    gate.dismissClearFailure()
    expect(gate.decision.value).toBe('dismissed')

    expect(isProgressAccessAllowed()).toBe(false)
  })

  it('acknowledging does nothing after a first run whose delete did not finish', async () => {
    // P2. The delete may still go through after the platform gave up on it, and a page
    // left to carry on would save the attack session it holds in memory straight back;
    // the way out here is a reload, never this.
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())

    expect(gate.clearError.value).not.toBe(null)
    expect(gate.databaseDeleted.value).toBe(false)
    expect(gate.clearFailurePhase.value).toBe('delete')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('undecided')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('acknowledging does nothing while there is no report to acknowledge', async () => {
    // The unanswered choice itself. Nothing has been attempted, both answers work, and
    // this must not become a third way past the question.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(true)
    expect(gate.clearError.value).toBe(null)

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('undecided')
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('acknowledging does not overwrite the outcome of a clear that finished', async () => {
    // The clear finished: the flag is set and there is no report, because nothing failed
    // and no phase was recorded; a rule keyed on the flag would let this through.
    // `cleared` is the one decision the deferred locale redirect reads as "stay put, a
    // full page load is already coming" — overwriting it with `dismissed` releases a
    // router navigation into the reload it was meant to stand aside for.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'

    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    const reload = vi.fn()
    await gate.clearEverything(reload)

    expect(reload).toHaveBeenCalled()
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearError.value).toBe(null)
    expect(gate.decision.value).toBe('cleared')

    gate.dismissClearFailure()

    expect(gate.decision.value).toBe('cleared')
  })

  it('a localStorage that cannot be listed stops the clear rather than counting as swept', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['wxl-locale'] = 'zh-TW'

    const { useSessionGate, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    // Set after `evaluate`, so this test says nothing about what an unreadable
    // localStorage means for detection — only about what it means for clearing.
    localReadThrows = true
    const reload = vi.fn()
    await gate.clearEverything(reload)

    // Unreadable is unknown, not empty: the key listing propagates rather than
    // returning an empty list, and the gate treats that as a half that did not happen.
    expect(reload).not.toHaveBeenCalled()
    expect(gate.clearError.value).not.toBe(null)
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  // ─── Which half of a clear run failed ───────────────────────────────────────

  // The flag says whether the delete resolved at some point in this document; it cannot
  // say which half the latest run failed in. A run whose delete is rejected after an
  // earlier run's sweep failed has the flag set and a delete failure to report.

  async function loadEvaluatedGate() {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    const mod = await loadGate()
    const gate = mod.useSessionGate()
    await gate.evaluate()
    return { ...mod, gate }
  }

  /** Hold the next delete pending until `release` is called. */
  function holdNextDelete(): { release: () => void } {
    let release: () => void = () => {}
    mockDeleteDatabase.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve }))
    return { release: () => release() }
  }

  /** Every field a press could change, read in one go. */
  function snapshot(gate: Awaited<ReturnType<typeof loadEvaluatedGate>>['gate']) {
    return {
      phase: gate.clearFailurePhase.value,
      error: gate.clearError.value,
      clearStarted: gate.clearStarted.value,
      databaseDeleted: gate.databaseDeleted.value,
      shouldAsk: gate.shouldAsk.value,
      decision: gate.decision.value,
      clearRefused: gate.clearRefused.value,
    }
  }

  // The persistence layer is a double here, so the three kinds of rejection reach the gate
  // as three messages on one path. The real blocked, timed-out and failed deletes are
  // driven against fake-indexeddb in the gate's truth tests.
  it.each([
    ['blocked by another tab', new Error('challenge-tools could not be deleted: another tab still has it open')],
    ['timed out', new Error('challenge-tools was not deleted within the time limit')],
    ['rejected for any other reason', new DOMException('injected: delete failed', 'UnknownError')],
  ])('records a delete failure when a first run is %s', async (_kind, rejection) => {
    mockDeleteDatabase.mockRejectedValueOnce(rejection)
    const { gate } = await loadEvaluatedGate()

    await gate.clearEverything(vi.fn())

    expect(gate.clearFailurePhase.value).toBe('delete')
    expect(gate.databaseDeleted.value).toBe(false)
  })

  it('records a sweep failure when the delete resolved and a local key would not go', async () => {
    const { gate } = await reachDeletedDatabase()

    expect(gate.databaseDeleted.value).toBe(true)
    expect(localStore['pentest-draft-door-is-open']).toBe('notes')
    expect(gate.clearFailurePhase.value).toBe('sweep')
  })

  it('records a sweep failure when the local keys cannot even be listed', async () => {
    const { gate } = await loadEvaluatedGate()
    localReadThrows = true

    await gate.clearEverything(vi.fn())

    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe('sweep')
  })

  it('keeps one answer for every caller of the composable', async () => {
    const { gate, useSessionGate } = await reachDeletedDatabase()
    expect(gate.clearFailurePhase.value).toBe('sweep')

    // The component that renders the report and the code that ran the clear are separate
    // callers; a per-call copy would leave the renderer reading `null`.
    expect(useSessionGate().clearFailurePhase.value).toBe('sweep')
  })

  it('has no failure to report while a first run is in flight', async () => {
    const { gate } = await loadEvaluatedGate()
    const held = holdNextDelete()

    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(1))

    expect(gate.clearStarted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe(null)
    held.release()
    await run
  })

  it('forgets a sweep failure the moment a later run starts', async () => {
    const { gate } = await reachDeletedDatabase()
    expect(gate.clearFailurePhase.value).toBe('sweep')
    const held = holdNextDelete()

    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(2))

    expect(gate.clearFailurePhase.value).toBe(null)
    held.release()
    await run
  })

  it('forgets a delete failure the moment a later run starts', async () => {
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    const { gate } = await loadEvaluatedGate()
    await gate.clearEverything(vi.fn())
    expect(gate.clearFailurePhase.value).toBe('delete')
    const held = holdNextDelete()

    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(2))

    expect(gate.clearFailurePhase.value).toBe(null)
    held.release()
    await run
  })

  it("replaces a sweep failure with a delete failure when a later run's delete is rejected", async () => {
    const { gate } = await reachDeletedDatabase()
    expect(gate.clearFailurePhase.value).toBe('sweep')

    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    await gate.clearEverything(vi.fn())

    // The flag still says the first delete resolved; only the phase says this run's did not.
    expect(mockDeleteDatabase).toHaveBeenCalledTimes(2)
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe('delete')
  })

  it.each([
    ['a first run', loadEvaluatedGate],
    ['a later run after a sweep failure', reachDeletedDatabase],
  ])('ignores a press while %s is in flight, leaving every field as it was', async (_run, reach) => {
    const { gate } = await reach()
    const calls = mockDeleteDatabase.mock.calls.length
    const held = holdNextDelete()
    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(calls + 1))
    const before = snapshot(gate)

    // A start record that cannot be written would make a press that got past the guard
    // visible: with the run in flight there is earlier state, so the refusal would set
    // the notice.
    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(calls + 1)
    expect(snapshot(gate)).toEqual(before)
    held.release()
    await run
  })

  // ─── A refused run ─────────────────────────────────────────────────────────

  // A run whose start record cannot be made durable issues no delete. With an earlier run
  // on record, everything that run left is still the truth about this browser: its report,
  // its phase, and that a deletion was started and may be queued. The refusal only adds
  // that this press did nothing.

  it('keeps everything an earlier sweep failure left when a later press is refused', async () => {
    const { gate } = await reachDeletedDatabase()
    const error = gate.clearError.value

    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(1)
    expect(gate.clearFailurePhase.value).toBe('sweep')
    expect(gate.clearStarted.value).toBe(true)
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearError.value).toBe(error)
    expect(gate.clearRefused.value).toBe(true)

    // P10 keeps the way out it had: the report is still the sweep's (T12).
    gate.dismissClearFailure()
    expect(gate.decision.value).toBe('dismissed')
  })

  it('keeps a delete failure and its report when a later press is refused', async () => {
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    const { gate, GATE_STORAGE_KEY } = await loadEvaluatedGate()
    await gate.clearEverything(vi.fn())

    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(1)
    expect(gate.clearFailurePhase.value).toBe('delete')
    expect(gate.clearStarted.value).toBe(true)
    expect(gate.clearError.value).toBe('challenge-tools could not be deleted: another tab still has it open')
    expect(gate.clearRefused.value).toBe(true)

    // P10b: neither answer nor acknowledgement is accepted while that delete may be queued
    // (T11a, T13).
    gate.keepExistingData()
    gate.dismissClearFailure()
    expect(gate.decision.value).toBe('undecided')
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('keeps a restored start record when the first press of a new document is refused', async () => {
    mockDeleteDatabase.mockRejectedValueOnce(new Error('challenge-tools could not be deleted: another tab still has it open'))
    const first = await loadEvaluatedGate()
    await first.gate.clearEverything(vi.fn())
    vi.resetModules()
    const { useSessionGate } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.clearStarted.value).toBe(true)

    // Only the write fails: the record the first document left is still readable.
    sessionWriteThrows = true
    try {
      await gate.clearEverything(vi.fn())
    } finally {
      sessionWriteThrows = false
    }

    expect(mockDeleteDatabase).toHaveBeenCalledTimes(1)
    expect(gate.clearStarted.value).toBe(true)
    expect(gate.clearFailurePhase.value).toBe(null)
    expect(gate.clearError.value).toBe(null)
    expect(gate.clearRefused.value).toBe(true)

    // P11r: the earlier document's delete may still be queued (T11a, T13).
    gate.keepExistingData()
    gate.dismissClearFailure()
    expect(gate.decision.value).toBe('undecided')
  })

  it('reports a refused first run as not started, as before, with no notice', async () => {
    const { gate, CLEAR_NOT_STARTED } = await loadEvaluatedGate()

    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false

    expect(mockDeleteDatabase).not.toHaveBeenCalled()
    expect(gate.clearStarted.value).toBe(false)
    expect(gate.clearFailurePhase.value).toBe(null)
    expect(gate.clearError.value).toBe(CLEAR_NOT_STARTED)
    expect(gate.clearRefused.value).toBe(false)

    // P12: nothing was requested, so acknowledging is refused and continuing is accepted
    // (T13, T11).
    gate.dismissClearFailure()
    expect(gate.decision.value).toBe('undecided')
    gate.keepExistingData()
    expect(gate.decision.value).toBe('kept')
  })

  it('drops the notice the moment a later run starts', async () => {
    const { gate } = await reachDeletedDatabase()
    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false
    expect(gate.clearRefused.value).toBe(true)
    let release: () => void = () => {}
    mockDeleteDatabase.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve }))

    const run = gate.clearEverything(vi.fn())
    await vi.waitFor(() => expect(mockDeleteDatabase).toHaveBeenCalledTimes(2))

    expect(gate.clearRefused.value).toBe(false)
    expect(gate.clearError.value).toBe(null)
    release()
    await run
  })

  it('starts a new document with no notice after a refused press', async () => {
    const { gate } = await reachDeletedDatabase()
    sessionStorageThrows = true
    await gate.clearEverything(vi.fn())
    sessionStorageThrows = false
    expect(gate.clearRefused.value).toBe(true)

    vi.resetModules()
    const { useSessionGate } = await loadGate()
    const next = useSessionGate()
    await next.evaluate()

    expect(next.clearRefused.value).toBe(false)
  })

  it('starts a new document with no failure recorded after a sweep failure', async () => {
    const { gate, CLEAR_STARTED_STORAGE_KEY } = await reachDeletedDatabase()
    expect(gate.clearFailurePhase.value).toBe('sweep')
    expect(sessionStore[CLEAR_STARTED_STORAGE_KEY]).toBeDefined()

    vi.resetModules()
    const { useSessionGate } = await loadGate()
    const next = useSessionGate()
    await next.evaluate()

    // The start record comes back; which half failed does not, because no run of this
    // document has failed.
    expect(next.clearStarted.value).toBe(true)
    expect(next.clearFailurePhase.value).toBe(null)
  })
})

// A read that throws is a conclusion — the gate knows it must ask. Leaving the block
// reason on "checking" would tell the learner a check is still running when it has
// already finished and already decided.
it('a storage read that throws still concludes the check', async () => {
  openRejects = true
  const { useSessionGate, useProgressBlockReason } = await loadGate()
  const gate = useSessionGate()
  const reason = useProgressBlockReason()
  expect(reason.value).toBe('checking')
  await gate.evaluate()
  expect(gate.evaluated.value).toBe(true)
  expect(gate.shouldAsk.value).toBe(true)
  expect(reason.value).toBe('undecided')
})

/**
 * Where the choice is presented, which is not the same question as whether there is
 * something to ask.
 *
 * Detection runs on every page, because what it finds is a fact about the browser rather
 * than about the page. Presenting is a fact about the page: there is no site-wide download
 * or upload, so outside the challenges there is nothing of a previous learner's for a
 * visitor to act on, and asking there makes every visitor answer a question about someone
 * else's work before they can read anything.
 *
 * The recovery from an unconfirmed clear is the exception, and it has to be: clearing
 * replaces the page with a load of the site root, which is not a challenge page. A
 * recovery confined to the challenge pages would be unreachable from exactly where the
 * learner lands.
 */
describe('where the choice is presented', () => {
  const CHALLENGE_PAGE = true
  const OTHER_PAGE = false

  it('presents the choice on a challenge page', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, shouldPresentGateHere } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.shouldAsk.value).toBe(true)
    expect(shouldPresentGateHere(CHALLENGE_PAGE)).toBe(true)
  })

  it('does not present it on a page that is not a challenge page', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, shouldPresentGateHere, GATE_STORAGE_KEY } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    // The detection still ran and still found something — that is what makes the next
    // assertion meaningful rather than vacuous.
    expect(gate.shouldAsk.value).toBe(true)
    expect(shouldPresentGateHere(OTHER_PAGE)).toBe(false)
    // And nothing was recorded as answered. A marker here would spend the learner's one
    // question on a page that never asked it, and every challenge page afterwards would
    // take the fast path.
    expect(sessionStore[GATE_STORAGE_KEY]).toBeUndefined()
  })

  it('still presents it on the first challenge page of the same browser session', async () => {
    // One module instance across both pages, which is what a client-side navigation is.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, shouldPresentGateHere } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    expect(shouldPresentGateHere(OTHER_PAGE)).toBe(false)

    expect(shouldPresentGateHere(CHALLENGE_PAGE)).toBe(true)
    expect(gate.shouldAsk.value).toBe(true)
  })

  it('presents the recovery away from the challenge pages when a clear is unconfirmed', async () => {
    // The state a reload lands in: the record of a started clear outlived the document
    // that issued it, and the page it lands on is the site root.
    const { CLEAR_STARTED_STORAGE_KEY, CLEAR_STARTED } = await loadGate()
    sessionStore[CLEAR_STARTED_STORAGE_KEY] = CLEAR_STARTED

    const { useSessionGate, shouldPresentGateHere } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(gate.clearStarted.value).toBe(true)
    expect(shouldPresentGateHere(OTHER_PAGE)).toBe(true)
    expect(shouldPresentGateHere(CHALLENGE_PAGE)).toBe(true)
  })

  it('presents the recovery away from the challenge pages after the delete succeeded', async () => {
    // The other half of the recovery: the database is gone and the sweep threw, so the
    // report is on screen and the learner needs the way out of it wherever they are.
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]
    localStore['pentest-draft-door-is-open'] = 'notes'
    localRemoveThrowsOn = 'pentest-draft-door-is-open'

    const { useSessionGate, shouldPresentGateHere } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.clearEverything(vi.fn())

    expect(gate.databaseDeleted.value).toBe(true)
    expect(shouldPresentGateHere(OTHER_PAGE)).toBe(true)
  })

  it('presents nothing anywhere when there is nothing to ask about', async () => {
    const { useSessionGate, shouldPresentGateHere, GATE_STORAGE_KEY, GATE_DECIDED } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()

    expect(shouldPresentGateHere(CHALLENGE_PAGE)).toBe(false)
    expect(shouldPresentGateHere(OTHER_PAGE)).toBe(false)
    // This exit writes the marker on any page, challenge or not: nothing was detected, so
    // there is nothing left for a later page to ask.
    expect(sessionStore[GATE_STORAGE_KEY]).toBe(GATE_DECIDED)
  })

  it('presents nothing once the choice has been answered', async () => {
    storeContents['attack-sessions'] = [{ sessionId: 's1' }]

    const { useSessionGate, shouldPresentGateHere } = await loadGate()
    const gate = useSessionGate()
    await gate.evaluate()
    await gate.keepExistingData()

    expect(shouldPresentGateHere(CHALLENGE_PAGE)).toBe(false)
  })
})
