import { readCodeDraftSnapshot } from './codeDraftSnapshot'
import { isProgressAccessAllowed } from './useSessionGate'
import { ref, readonly, type Ref } from 'vue'
import { openDB, deleteDB, type IDBPDatabase } from 'idb'

// ─── Attack Session types ──────────────────────────────────────────────────────

export type AttackEvent =
  | { type: 'challenge_start'; timestamp: number }
  | {
      type: 'http_request'; timestamp: number; source: 'browser' | 'repeater' | 'code'
      id: number; method: string; url: string
      requestHeaders: [string, string][]; requestBody: string | null
      status: number; responseHeaders: [string, string][]; responseBody: string; duration: number
      executionId?: string
    }
  | { type: 'code_execution'; timestamp: number; executionId: string; code: string; output: string; error: boolean; duration: number }
  | { type: 'flag_attempt'; timestamp: number; submitted: string; correct: boolean }
  | { type: 'challenge_solved'; timestamp: number }
  | { type: 'note'; timestamp: number; id: string; content: string; updatedAt: number | null }
  // Sessions recorded before a tool was retired still sit in IndexedDB, and export files
  // for them sit on learners' disks. This variant is what makes those sessions remain
  // `AttackEvent[]` after their producing variant is deleted: without it the declaration
  // would forbid holding exactly what the load path must carry.
  //
  // Nothing reads it. It is written by the load path and read only by the exporter, which
  // copies it out again. `type` is `string` rather than a negated literal because
  // TypeScript cannot subtract literals from `string`; the consequence is that this
  // variant also accepts a malformed recordable event, so the shapes above are enforced
  // by the recording functions' parameter types, not by the union.
  | { type: string; timestamp: number; [key: string]: unknown }

export interface NoteEntry {
  id: string
  challengeSlug: string
  content: string
  createdAt: number
  updatedAt: number | null
}

/** Editor content the learner has typed but not executed, as it travels with a record. */
export interface DraftSnapshot {
  code: string
  updatedAt: number
}

/**
 * Where a stored attempt came from, present only on a record brought in from a file.
 *
 * Absence is the marker for "started in this browser", rather than every record
 * carrying a `kind` of its own. A field on every record would be a field the
 * stored-work test does not recognize, and that test treats an unrecognized field as
 * evidence — so every freshly initialized session would count as work and the platform
 * would ask whose it is on a machine holding none.
 */
export interface ImportOrigin {
  kind: 'imported'
  importedAt: number
  /**
   * The session id the file carried.
   *
   * It cannot be the record's own id: that is the store's keyPath, so writing under it
   * would replace a record whenever the file came from this same browser or is imported
   * twice — the overwrite that importing exists to avoid. Kept here so the record is
   * still traceable to the file it came from.
   */
  sourceSessionId: string
  /**
   * The file's `meta.exportedAt`, as the string the file carries.
   *
   * Not parsed to a timestamp: the file encodes a timezone offset, and a number would
   * discard which clock the learner was reading when they exported.
   */
  sourceExportedAt: string
}

export interface AttackSession {
  /**
   * The store's keyPath. One per attempt, not one per challenge.
   *
   * Keyed by `challengeSlug`, a challenge held exactly one session, so opening a
   * solved challenge again wrote a fresh session over the finished one and the whole
   * of that attempt — every request, execution, note and flag attempt — was gone with
   * no way back. The key is what makes a second attempt a second record.
   */
  sessionId: string
  /** Indexed as `by-slug`, so every attempt at one challenge can be read together. */
  challengeSlug: string
  challengeTitle: string
  startedAt: number
  solvedAt: number | null
  events: AttackEvent[]
  /** Present only on an imported record; absence means this browser started it. */
  origin?: ImportOrigin
  /**
   * The unexecuted editor content that travelled with an imported record.
   *
   * Only an imported record carries it. A locally started attempt's draft is the live
   * per-challenge `code-drafts` row, which belongs to the attempt in progress — writing
   * an imported draft there would overwrite what the learner has in the editor now.
   */
  draft?: DraftSnapshot | null
}

/**
 * What the learner has done with one challenge, kept apart from any single attempt.
 *
 * Separate from `AttackSession` because "has this been completed" is a fact about the
 * challenge, not about one attempt at it. Derived from the sessions it would change
 * whenever a session is deleted or one recorded elsewhere is brought in.
 */
export interface ProgressRecord {
  challengeSlug: string
  /**
   * When the challenge was first solved, or `null` while it has not been.
   *
   * `null` rather than an absent key: an omitted field would be indistinguishable
   * from a record written before this field existed.
   */
  firstCompletedAt: number | null
  lastAttemptAt: number
  attemptCount: number
}

/** Only recognizable automatic initialization counts as absence of learner evidence. */
function isInitializationOnlySession(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const session = value as Record<string, unknown>
  const known = ['sessionId', 'challengeSlug', 'challengeTitle', 'startedAt', 'solvedAt', 'events', 'origin', 'draft']
  if (Object.keys(session).some(key => !known.includes(key))) return false
  // An imported record is evidence whatever it holds. Someone chose a file and brought
  // it here; automatic initialization is the only thing this function exists to excuse,
  // and that is the one thing importing is not. Stated rather than left to the unknown-
  // field rule above, which covered this only until `origin` joined that list.
  if (session.origin !== undefined) return false
  if (typeof session.sessionId !== 'string' || typeof session.challengeSlug !== 'string'
    || typeof session.challengeTitle !== 'string' || typeof session.startedAt !== 'number'
    || !Number.isFinite(session.startedAt) || session.solvedAt !== null || !Array.isArray(session.events)) return false
  return session.events.every(event => event && typeof event === 'object'
    && event.type === 'challenge_start' && typeof event.timestamp === 'number'
    && Number.isFinite(event.timestamp)
    && Object.keys(event).every(key => key === 'type' || key === 'timestamp'))
}

/**
 * What one act did to a challenge's records, kept apart from the records themselves.
 *
 * Three acts change which attempts a challenge holds — exporting one, importing one,
 * removing some — and whoever reads these wants them as one sequence, not three lists
 * to interleave. So: one store, one set of common fields, and a `kind` that says which
 * act it was and what else the entry carries.
 *
 * None of the three holds content. A removal keeps no events or note text, because
 * keeping them would make the removal false — the learner would believe the record was
 * gone while a copy sat in the same database. An export keeps whether identity fields
 * were filled, never what they said: that they were supplied is the fact; what they
 * said is not this record's business.
 *
 * It is a record that something happened here. It is not an audit trail: clearing the
 * whole database takes the traces with it, so a learner set on leaving no mark can
 * leave none, and a package written before traces existed carries none either. What it
 * defends against is an act done without thinking about it — the same shape of claim
 * the export package's integrity check makes.
 */
export type ActivityTrace = {
  id: string
  /** Indexed as `by-slug`, so a challenge's traces are read the way its attempts are. */
  challengeSlug: string
  at: number
} & ActivityTraceDetail

export type ActivityTraceDetail =
  | { kind: 'exported'; sessionId: string; mode: 'full' | 'thinned'; identitySupplied: boolean }
  | { kind: 'imported'; sessionId: string; sourceSessionId: string; sourceExportedAt: string }
  /** One entry per attempt removed, in the order they were removed. */
  | { kind: 'removed'; removed: { startedAt: number; solved: boolean }[] }

export interface CodeDraft {
  challengeSlug: string
  code: string
  updatedAt: number
}

interface ChallengeToolsDB {
  'attack-sessions': AttackSession
  'pentest-notes': NoteEntry
  'code-drafts': CodeDraft
  'challenge-progress': ProgressRecord
  'activity-traces': ActivityTrace
}

const DB_NAME = 'challenge-tools'
const DB_VERSION = 7

/**
 * Every object store the database holds, as one list.
 *
 * Exported because the shared-machine session gate has to ask whether any of them
 * holds anything, and a second copy of the list written at that call site would drift
 * from the one the upgrade creates — silently, since a store missing from the check
 * simply never reports data.
 */
export const OBJECT_STORES = [
  'attack-sessions',
  'pentest-notes',
  'code-drafts',
  'challenge-progress',
  'activity-traces',
] as const satisfies readonly (keyof ChallengeToolsDB)[]

/**
 * How long any open is allowed to sit before it is treated as a failure.
 *
 * A blocked open is not a slow open: it stays pending until every connection holding an
 * older version closes, which can be never. Measured on the version 4 → 5 upgrade with a
 * second tab open: `indexedDB.open` never settled, and every path awaiting it stopped
 * with no error anywhere — including the Code panel's editor creation, which left a
 * sized but empty container beside an enabled Run button.
 *
 * The bound is unconditional, not armed by the `blocked` callback. Measured in Chrome:
 * `blocked` fires only for the request at the head of the origin's version-change queue,
 * so once one request has been abandoned, every later `open` waits behind it and receives
 * no `blocked` event at all. Arming the timer there left exactly the calls that needed it
 * unbounded — the first version of this fix looked correct on a fresh page load and hung
 * again after a reload.
 */
const OPEN_TIMEOUT_MS = 5000

/**
 * How long a delete is allowed to sit before it is treated as a failure.
 *
 * Same reason as the open bound, and the same shape of failure: `deleteDatabase` does
 * not reject while another connection holds the database open — it stalls in `blocked`,
 * potentially forever. A learner who chose to clear and got a dialog that never closed
 * would have no way to tell that from a clear that worked.
 */
const DELETE_TIMEOUT_MS = 5000

/**
 * A key for one attempt.
 *
 * `crypto.randomUUID` is what `usePentestNotes` already mints note ids with, so both
 * stores that hold one row per thing use the same kind of key.
 */
function newSessionId(): string {
  return crypto.randomUUID()
}

const persistenceErrorState = ref<string | null>(null)

/**
 * Why the tool database is currently unusable, or `null` when it is usable.
 *
 * Module-level on purpose: one value for every caller and every component. A per-call
 * copy would leave whichever component happens to render the warning looking at a
 * different failure from the one the session recorder hit.
 */
export const persistenceError: Readonly<Ref<string | null>> = readonly(persistenceErrorState)

let dbPromise: Promise<IDBPDatabase<ChallengeToolsDB>> | null = null

/** Drop the cached handle so the next call opens a new connection. */
function forgetDb(): void {
  dbPromise = null
}

function getDb(): Promise<IDBPDatabase<ChallengeToolsDB>> {
  if (!dbPromise) {
    // Set when the browser tells us another connection is in the way. It only changes the
    // wording of the failure — the bound below applies either way, because this callback
    // does not fire for a request queued behind an earlier one.
    let blockedByAnotherTab = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(
        blockedByAnotherTab
          ? 'challenge-tools is blocked by another tab holding an older version open'
          : 'challenge-tools did not open within the time limit',
      )), OPEN_TIMEOUT_MS)
    })
    // The race attaches a handler, but only once it is constructed. Attaching one here
    // too keeps the rejection from ever counting as unhandled — the derived promise
    // resolves, so this adds no second rejection of its own.
    void timeout.catch(() => { /* the race is the real consumer */ })

    const opening = openDB<ChallengeToolsDB>(DB_NAME, DB_VERSION, {
      // `oldVersion` is not decoration. Every earlier version of this callback took
      // `db` alone and was additive-only — four `if (!contains) create` branches — so
      // raising DB_VERSION could add a store but never remove one. `terminal-history`
      // would have survived on every browser that had already opened a challenge page.
      async upgrade(db, oldVersion, _newVersion, tx) {
        // v4 retires the terminal. The guard is required, not defensive: this same
        // callback runs for a first-time visitor at oldVersion 0, whose database has no
        // stores at all, and deleteObjectStore throws on a store that is not there.
        if (oldVersion < 4 && db.objectStoreNames.contains('terminal-history')) {
          db.deleteObjectStore('terminal-history')
        }
        // v5 retires the named-script store. Same guard, same reason. The records it held
        // carry no challenge slug, so there is nothing to migrate them into.
        if (oldVersion < 5 && db.objectStoreNames.contains('code-scripts')) {
          db.deleteObjectStore('code-scripts')
        }
        if (!db.objectStoreNames.contains('code-drafts')) {
          db.createObjectStore('code-drafts', { keyPath: 'challengeSlug' })
        }
        // v6 re-keys the sessions from one-per-challenge to one-per-attempt.
        //
        // IndexedDB has no way to change a store's keyPath in place, so the records
        // have to come out, the store has to go, and a new one has to take the rows
        // back. Reading first is not a stylistic ordering: `deleteObjectStore` takes
        // the rows with it, so a delete that runs before the read destroys exactly
        // what the migration exists to preserve.
        //
        // All of it runs inside the versionchange transaction `tx`, so a failure at
        // any step aborts the whole upgrade and leaves the database at its previous
        // version with its records intact, rather than at some half-migrated state
        // that no later run knows how to finish.
        const rekeying = oldVersion < 6 && db.objectStoreNames.contains('attack-sessions')
        const carried: AttackSession[] = rekeying
          ? (await tx.objectStore('attack-sessions').getAll() as AttackSession[])
          : []
        if (rekeying) db.deleteObjectStore('attack-sessions')
        if (!db.objectStoreNames.contains('attack-sessions')) {
          const sessionStore = db.createObjectStore('attack-sessions', { keyPath: 'sessionId' })
          sessionStore.createIndex('by-slug', 'challengeSlug', { unique: false })
          for (const session of carried) {
            // `?? newSessionId()` rather than an unconditional mint: a database that
            // reached version 6 once and is being upgraded again from an earlier
            // recorded version would otherwise get a second id for the same record.
            await sessionStore.put({ ...session, sessionId: session.sessionId ?? newSessionId() })
          }
        }
        if (!db.objectStoreNames.contains('pentest-notes')) {
          const noteStore = db.createObjectStore('pentest-notes', { keyPath: 'id' })
          noteStore.createIndex('by-slug', 'challengeSlug', { unique: false })
        }
        // v6 records completion apart from the attempts, and seeds it from what the
        // sessions already say. Without this a learner who had solved eight challenges
        // would arrive at version 6 with a progress store claiming they had solved none.
        if (!db.objectStoreNames.contains('challenge-progress')) {
          const progressStore = db.createObjectStore('challenge-progress', { keyPath: 'challengeSlug' })
          for (const session of carried) {
            if (session.solvedAt === null) continue
            // Same rule as `recordAttempt`, reached the same way rather than as a
            // migration-only special case: a first completion already recorded is
            // never moved. Two solved sessions for one challenge are possible in a
            // database that reached v6 once and is being upgraded again.
            const existing = await progressStore.get(session.challengeSlug) as ProgressRecord | undefined
            if (existing?.firstCompletedAt != null) continue
            await progressStore.put({
              challengeSlug: session.challengeSlug,
              firstCompletedAt: session.solvedAt,
              lastAttemptAt: session.solvedAt,
              attemptCount: 1,
            })
          }
        }
        // v7 gives removals somewhere to leave a mark. A trace has to outlive the
        // attempts it describes, so it cannot live on the record being removed; and it
        // is deliberately a store of its own rather than a marked row in
        // `attack-sessions`, where the resume rule, the stored-work test, the list and
        // the exporter can all currently assume every row is an attempt.
        //
        // This step adds the store and reads nothing. A database already at version 6
        // holds every field version 7 needs, so there is no record to migrate — and a
        // migration that touches no rows is a migration that cannot lose any.
        if (!db.objectStoreNames.contains('activity-traces')) {
          const traceStore = db.createObjectStore('activity-traces', { keyPath: 'id' })
          traceStore.createIndex('by-slug', 'challengeSlug', { unique: false })
        }
      },
      blocked() {
        blockedByAnotherTab = true
      },
      blocking() {
        // This connection is what stops another tab from upgrading. Close it and forget
        // the handle: the other tab proceeds, and the next local call reopens at the new
        // version. This cannot rescue the upgrade that exposed the problem — the tab
        // doing the blocking there is running the code that predates this callback — it
        // keeps the next one from repeating it.
        void opening.then(db => db.close()).catch(() => { /* nothing to close */ })
        forgetDb()
      },
    })

    dbPromise = Promise.race([opening, timeout])
      .then((db) => {
        if (timer !== null) clearTimeout(timer)
        // Cleared on success, not only set on failure: the tab that was in the way can go
        // away, and a permanent warning on a working page is its own defect.
        persistenceErrorState.value = null
        return db
      })
      .catch((err: unknown) => {
        if (timer !== null) clearTimeout(timer)
        persistenceErrorState.value = err instanceof Error ? err.message : String(err)
        // Without this the rejection is cached forever, so the tool stays broken even
        // after the tab that was blocking it goes away.
        forgetDb()
        throw err
      })
  }
  return dbPromise
}

export function useChallengePersistence() {
  // ─── Attack Sessions ────────────────────────────────────────────────────────

  async function saveAttackSession(session: AttackSession): Promise<void> {
    const db = await getDb()
    // Strip Vue reactive proxies — structured clone (used by IDB) cannot
    // handle Proxy objects that wrap trafficLog header arrays.
    const plain = JSON.parse(JSON.stringify(session)) as AttackSession
    await db.put('attack-sessions', plain)
  }

  async function loadAttackSession(sessionId: string): Promise<AttackSession | null> {
    const db = await getDb()
    const session = await db.get('attack-sessions', sessionId) as AttackSession | undefined
    return session ?? null
  }

  /**
   * Every attempt at one challenge, oldest first.
   *
   * Read through the `by-slug` index rather than by scanning the whole store, and
   * sorted here rather than relied on from the index: the index orders by its own key,
   * which is the slug, so rows sharing a slug come back in whatever order the store
   * holds them.
   */
  async function listAttackSessions(slug: string): Promise<AttackSession[]> {
    const db = await getDb()
    const sessions = await db.getAllFromIndex('attack-sessions', 'by-slug', slug) as AttackSession[]
    return sessions.sort((a, b) => a.startedAt - b.startedAt)
  }

  /**
   * Remove one stored attempt.
   *
   * Takes an id and nothing else. Which attempts may be removed — never the one in
   * progress, never another challenge's — is the caller's rule, and deciding it here
   * would put it where the caller cannot see it or disagree with it.
   *
   * An id that is not there resolves rather than rejecting: `delete` on a missing key
   * is not an error in IndexedDB either, and a caller that lost a race to a second tab
   * has the outcome it asked for.
   */
  async function deleteAttackSession(sessionId: string): Promise<void> {
    const db = await getDb()
    await db.delete('attack-sessions', sessionId)
  }

  /**
   * Record one act against a challenge's records.
   *
   * Mints the id and reads the clock here rather than taking either from the caller:
   * both belong to the act being recorded, and a caller that supplies them can write
   * two traces under one key or date one wrongly.
   *
   * `detail` carries only what its kind declares. See `ActivityTrace` for why none of
   * the three keeps content.
   */
  async function saveActivityTrace(challengeSlug: string, detail: ActivityTraceDetail): Promise<void> {
    const db = await getDb()
    await db.put('activity-traces', {
      id: crypto.randomUUID(),
      challengeSlug,
      at: Date.now(),
      ...detail,
    })
  }

  /**
   * Every removal recorded for one challenge, oldest first.
   *
   * Read through `by-slug` and sorted here for the same reason `listAttackSessions`
   * is: the index orders by its own key, which is the slug, so rows sharing one come
   * back in whatever order the store holds them.
   */
  async function listActivityTraces(challengeSlug: string): Promise<ActivityTrace[]> {
    const db = await getDb()
    const traces = await db.getAllFromIndex('activity-traces', 'by-slug', challengeSlug) as ActivityTrace[]
    return traces.sort((a, b) => a.at - b.at)
  }

  // ─── The database half of clearing ───────────────────────────────────────────

  /**
   * Whether the object stores hold learner evidence beyond automatic initialization.
   *
   * One half of the shared-machine question, and not the whole of it. The learner's
   * note drafts and their saved Repeater requests are localStorage keys, in no object
   * store, and this function never looks there — the session gate asks both subsystems
   * and composes the answer itself. Asking this one alone is what let the platform
   * delete attack work it had never offered to keep, so the narrow name is the point:
   * a caller that treats this as the whole answer is making the same mistake again.
   *
   * Driven by `OBJECT_STORES` rather than a list written at the call site: this file is
   * where stores are added, and a second list elsewhere would fall behind without
   * anything failing — a store missing from the check simply never reports data, and
   * the gate stops offering to clear it.
   */
  async function hasAnyStoredData(): Promise<boolean> {
    const db = await getDb()
    const evidence = await Promise.all(OBJECT_STORES.map(async store => {
      if (store === 'attack-sessions') {
        const sessions = await db.getAll(store)
        return sessions.some(session => !isInitializationOnlySession(session))
      }
      return await db.count(store) > 0
    }))
    return evidence.some(Boolean)
  }


  /**
   * Delete the whole `challenge-tools` database.
   *
   * The whole database and not each store emptied in turn: the store list changes, and
   * a list written at the call site would fall behind the one the upgrade creates
   * without anything failing — a store missing from the list simply keeps its rows.
   *
   * Rejects rather than resolving when the delete does not complete, so a caller cannot
   * mistake a stalled clear for a finished one. The learner is told to close the other
   * tabs; reporting success and reloading would show them a page that still holds the
   * previous learner's work.
   */
  async function deleteDatabase(): Promise<void> {
    // Close first. `deleteDatabase` does not fail while a connection is open, so a
    // delete issued before this never completes at all.
    const cached = dbPromise
    forgetDb()
    if (cached) {
      // An open that failed has no handle to close, and its rejection is already
      // reported through `persistenceError`.
      await cached.then(db => db.close(), () => { /* nothing to close */ })
    }

    let blockedByAnotherTab = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(
        blockedByAnotherTab
          ? 'challenge-tools could not be deleted: another tab still has it open'
          : 'challenge-tools was not deleted within the time limit',
      )), DELETE_TIMEOUT_MS)
    })
    void timeout.catch(() => { /* the race is the real consumer */ })

    try {
      await Promise.race([
        deleteDB(DB_NAME, { blocked() { blockedByAnotherTab = true } }),
        timeout,
      ])
    } finally {
      if (timer !== null) clearTimeout(timer)
    }
  }

  // ─── Per-challenge progress ─────────────────────────────────────────────────

  async function loadProgress(challengeSlug: string): Promise<ProgressRecord | null> {
    const db = await getDb()
    const record = await db.get('challenge-progress', challengeSlug) as ProgressRecord | undefined
    return record ?? null
  }

  /**
   * Every progress record the store holds.
   *
   * The challenge list needs the completion state of every challenge to render one
   * screen. Read one challenge at a time that is one query per challenge on every
   * visit to the list; read this way the cost does not grow with the challenge count.
   *
   * Uninterpreted on purpose: no filter, no sort, no verdict on what counts as
   * completed. Deciding that here would place the rule in the storage layer, where the
   * caller cannot see it and cannot disagree with it — and a record for an attempted
   * but unsolved challenge would become indistinguishable from no record at all.
   */
  async function listAllProgress(): Promise<ProgressRecord[]> {
    const db = await getDb()
    return await db.getAll('challenge-progress') as ProgressRecord[]
  }

  /**
   * Record one attempt at a challenge, and the first completion if this is it.
   *
   * `firstCompletedAt` is written once and never moved. Solving a challenge again does
   * not push it forward and failing afterwards does not clear it — "first" has no other
   * meaning. The only thing that removes it is deleting the database.
   *
   * The read and the write are one read-write transaction rather than a get followed by
   * a put: two concurrent calls — a flag submitted while a previous one is still in
   * flight — would otherwise both read the same record and the later put would drop the
   * earlier one's increment.
   */
  async function recordAttempt(challengeSlug: string, solved: boolean): Promise<void> {
    const requireAccess = () => {
      if (!isProgressAccessAllowed()) throw new Error('Progress access requires a stored-work decision')
    }
    requireAccess()
    const db = await getDb()
    requireAccess()
    const now = Date.now()
    const tx = db.transaction('challenge-progress', 'readwrite')
    const existing = await tx.store.get(challengeSlug) as ProgressRecord | undefined
    if (!isProgressAccessAllowed()) {
      tx.abort()
      await tx.done.catch(() => {})
      requireAccess()
    }
    await tx.store.put({
      challengeSlug,
      firstCompletedAt: existing?.firstCompletedAt ?? (solved ? now : null),
      lastAttemptAt: now,
      attemptCount: (existing?.attemptCount ?? 0) + 1,
    })
    await tx.done
  }

  // ─── Code Drafts ─────────────────────────────────────────────────────────────

  /**
   * The editor content the learner has not run yet, one record per challenge.
   *
   * `challengeSlug` is the keyPath, so a write is an upsert: there is no id to mint, no
   * way to accumulate a second record for the same challenge, and nothing to clean up.
   */
  async function saveCodeDraft(challengeSlug: string, code: string): Promise<void> {
    const db = await getDb()
    await db.put('code-drafts', { challengeSlug, code, updatedAt: Date.now() })
  }

  async function loadCodeDraft(challengeSlug: string): Promise<CodeDraft | null> {
    const checkpoint = readCodeDraftSnapshot(challengeSlug)
    if (checkpoint) return checkpoint
    const db = await getDb()
    const draft = await db.get('code-drafts', challengeSlug) as CodeDraft | undefined
    // `?? null` and not `|| null`: an empty draft is a record the learner created by
    // clearing the editor, and it has to come back as the empty editor rather than as
    // the absence that would restore the starter document.
    return draft ?? null
  }

  // ─── Pentest Notes ───────────────────────────────────────────────────────────

  async function saveNote(note: NoteEntry): Promise<void> {
    const db = await getDb()
    await db.put('pentest-notes', note)
  }

  async function loadNotesBySlug(slug: string): Promise<NoteEntry[]> {
    const db = await getDb()
    const notes = await db.getAllFromIndex('pentest-notes', 'by-slug', slug) as NoteEntry[]
    return notes.sort((a, b) => a.createdAt - b.createdAt)
  }

  async function deleteNote(id: string): Promise<void> {
    const db = await getDb()
    await db.delete('pentest-notes', id)
  }

  return { saveCodeDraft, loadCodeDraft, saveAttackSession, loadAttackSession, listAttackSessions, deleteAttackSession, saveActivityTrace, listActivityTraces, loadProgress, listAllProgress, recordAttempt, deleteDatabase, hasAnyStoredData, saveNote, loadNotesBySlug, deleteNote }
}
