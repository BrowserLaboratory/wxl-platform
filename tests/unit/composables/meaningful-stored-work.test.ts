import { beforeEach, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
  vi.resetModules()
})

async function initialized() {
  const { useAttackSession } = await import('../../../.vitepress/theme/composables/useAttackSession')
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const session = useAttackSession('probe', 'Probe')
  await session.init()
  return { api: useChallengePersistence(), session, stored: session.getSession()! }
}

it('does not ask about a real initialization-only session and leaves it intact', async () => {
  const { api, stored } = await initialized()
  expect((await api.listAttackSessions('probe'))).toHaveLength(1)
  expect(await api.hasAnyStoredData()).toBe(false)
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(false)
  expect(sessionStorage.getItem('wxl-session-gate')).toBe('decided')
  expect(await api.loadAttackSession(stored.sessionId)).toEqual(stored)
})

it.each(['http_request', 'code_execution', 'flag_attempt', 'note', 'challenge_solved', 'future_event'])('retains %s as learner evidence', async type => {
  const { api, stored } = await initialized()
  await api.saveAttackSession({ ...stored, events: [...stored.events, { type, timestamp: 2 }] })
  expect(await api.hasAnyStoredData()).toBe(true)
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(true)
})

it.each([
  { solvedAt: 0 },
  { events: null },
  { events: [{ type: 'challenge_start', timestamp: 1, data: 'unknown work' }] },
  { futureData: 'unknown work' },
])('preserves completed or uncertain records: %j', async patch => {
  const { api, stored } = await initialized()
  await api.saveAttackSession({ ...stored, ...patch } as never)
  expect(await api.hasAnyStoredData()).toBe(true)
})

it.each(['draft', 'note'])('keeps %s alongside initialization as learner evidence', async kind => {
  const { api } = await initialized()
  if (kind === 'draft') await api.saveCodeDraft('probe', 'unfinished code')
  else await api.saveNote({ id: 'note', challengeSlug: 'probe', content: 'unfinished note', createdAt: 1, updatedAt: null })
  expect(await api.hasAnyStoredData()).toBe(true)
})

it('ignores a recognizable empty event list without deleting it', async () => {
  const { api, stored } = await initialized()
  await api.saveAttackSession({ ...stored, events: [] })
  expect(await api.hasAnyStoredData()).toBe(false)
  expect((await api.loadAttackSession(stored.sessionId))?.events).toEqual([])
})

it('asks conservatively when session evidence cannot be read', async () => {
  await initialized()
  const { IDBObjectStore } = await import('fake-indexeddb')
  const original = IDBObjectStore.prototype.getAll
  const spy = vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (this: IDBObjectStore, ...args) {
    if (this.name === 'attack-sessions') throw new Error('unreadable evidence')
    return original.apply(this, args)
  })
  try {
    const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
    const gate = useSessionGate()
    await gate.evaluate()
    expect(gate.shouldAsk.value).toBe(true)
    expect(sessionStorage.getItem('wxl-session-gate')).toBeNull()
  } finally { spy.mockRestore() }
})

// Importing is a deliberate act that puts a record on this machine, so the record is
// evidence that somebody did something here — which is exactly what automatic
// initialization is not. Before the origin marker was a recognized field this held by
// accident, because an unrecognized field already counted; these pin it as a rule, so
// that adding the field to the recognized list does not quietly reverse it.
it('treats an imported session as stored work even when it holds only a start event', async () => {
  const { api, stored } = await initialized()
  await api.saveAttackSession({
    ...stored,
    sessionId: 'brought-in',
    origin: { kind: 'imported', importedAt: 5000, sourceSessionId: 'elsewhere', sourceExportedAt: '2026-09-16T10:00:00+08:00' },
    draft: null,
  })
  expect(await api.hasAnyStoredData()).toBe(true)
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(true)
})

// The other side of the same rule: recognizing the two new fields must not make a
// freshly initialized session start counting, which would put the shared-machine
// question in front of a learner whose machine holds nothing.
it('still does not ask about an initialization-only session once the new fields are recognized', async () => {
  const { api } = await initialized()
  expect(await api.hasAnyStoredData()).toBe(false)
})

// Somebody removed records on this machine. That act is evidence of use in exactly the
// way the removal's own absence is not — without this, clearing a challenge's attempts
// on a shared computer would take the machine back to looking untouched, and the next
// person would inherit it with no question asked.
it('treats a deletion trace as stored work even when no attempt is left', async () => {
  const { api } = await initialized()
  await api.saveActivityTrace('probe', [{ startedAt: 1000, solved: false }])

  expect(await api.hasAnyStoredData()).toBe(true)
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(true)
})
