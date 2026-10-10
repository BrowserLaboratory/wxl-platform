import { beforeEach, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import 'fake-indexeddb/auto'
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); sessionStorage.clear(); localStorage.clear(); vi.resetModules() })

it('accepts the marker fast path without evaluate, and revokes when clearing starts', async () => {
 const m = await import('../../../.vitepress/theme/composables/useSessionGate')
 sessionStorage.setItem(m.GATE_STORAGE_KEY, m.GATE_DECIDED)
 const access = m.useProgressAccess()
 expect(access.value).toBe(true)
 sessionStorage.removeItem(m.GATE_STORAGE_KEY)
 const gate = m.useSessionGate()
 const clearing = gate.clearEverything(() => {})
 expect(access.value).toBe(false)
 await clearing
})
it('denies undecided access and grants an explicit keep', async () => {
 const m = await import('../../../.vitepress/theme/composables/useSessionGate')
 const access = m.useProgressAccess()
 expect(access.value).toBe(false)
 m.useSessionGate().keepExistingData()
 expect(access.value).toBe(true)
})
it('does not read or write prior progress until accepted; accepted reads load the stored result', async () => {
 const { openDB } = await import('idb')
 const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
 const api = useChallengePersistence()
 await api.loadProgress('a')
 const db = await openDB('challenge-tools', 7)
 const original = { challengeSlug:'a',firstCompletedAt:1,lastAttemptAt:2,attemptCount:3 }
 await db.put('challenge-progress',original)
 const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
 const scope = effectScope()
 const progress = scope.run(() => useChallengeProgress())!
 await progress.load()
 expect(progress.settled.value).toBe(false)
 expect(progress.completedSlugs.value.size).toBe(0)
 const read = vi.spyOn(IDBObjectStore.prototype, 'get')
 try {
   await expect(api.recordAttempt('a',true)).rejects.toThrow()
   expect(read).not.toHaveBeenCalled()
 } finally { read.mockRestore() }
 expect(await db.get('challenge-progress','a')).toEqual(original)
 const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
 useSessionGate().keepExistingData()
 await nextTick()
 await vi.waitFor(() => expect(progress.completedSlugs.value.has('a')).toBe(true))
 await api.recordAttempt('a',false)
 expect((await db.get('challenge-progress','a')).attemptCount).toBe(4)
 scope.stop(); db.close()
})

it('aborts the transaction if access is revoked while its read is pending', async () => {
  const { IDBObjectStore } = await import('fake-indexeddb')
  const { openDB } = await import('idb')
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  sessionStorage.setItem('wxl-session-gate', 'decided')
  const api = useChallengePersistence()
  await api.recordAttempt('a', false)
  const db = await openDB('challenge-tools', 7)
  const original = await db.get('challenge-progress', 'a')
  const get = IDBObjectStore.prototype.get
  const spy = vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (this: IDBObjectStore, key) {
    const request = get.call(this, key)
    if (this.name === 'challenge-progress') sessionStorage.removeItem('wxl-session-gate')
    return request
  })
  try {
    await expect(api.recordAttempt('a', true)).rejects.toThrow('stored-work decision')
  } finally { spy.mockRestore() }
  expect(await db.get('challenge-progress', 'a')).toEqual(original)
  db.close()
})


it('refuses before opening any database when work has not been accepted', async () => {
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const open = vi.spyOn(indexedDB, 'open')
  try {
    await expect(useChallengePersistence().recordAttempt('a', true)).rejects.toThrow('stored-work decision')
    expect(open).not.toHaveBeenCalled()
  } finally { open.mockRestore() }
})

it('refuses before reading progress when access changes while obtaining the database', async () => {
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const api = useChallengePersistence()
  await api.loadProgress('a')
  sessionStorage.setItem('wxl-session-gate', 'decided')
  const read = vi.spyOn(IDBObjectStore.prototype, 'get')
  try {
    const writing = api.recordAttempt('a', true)
    sessionStorage.removeItem('wxl-session-gate')
    await expect(writing).rejects.toThrow('stored-work decision')
    expect(read).not.toHaveBeenCalled()
  } finally { read.mockRestore() }
})

it.each([false, true])('keeps clear recovery reachable with no learner data and existing decision=%s', async marked => {
  sessionStorage.setItem('wxl-clear-started', 'started')
  if (marked) sessionStorage.setItem('wxl-session-gate', 'decided')
  const gateModule = await import('../../../.vitepress/theme/composables/useSessionGate')
  expect(gateModule.hasGateDecision()).toBe(false)
  const gate = gateModule.useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(true)
  expect(gate.clearStarted.value).toBe(true)
  expect(gateModule.useProgressAccess().value).toBe(false)
  const reload = vi.fn()
  await gate.clearEverything(reload)
  expect(reload).toHaveBeenCalledOnce()
  expect(sessionStorage.getItem('wxl-clear-started')).toBeNull()
  vi.resetModules()
  const fresh = await import('../../../.vitepress/theme/composables/useSessionGate')
  expect(fresh.hasGateDecision()).toBe(true)
  expect(fresh.useProgressAccess().value).toBe(true)
})
it('reports checking before evaluate concludes, undecided once it asks, and nothing once access is granted', async () => {
 const m = await import('../../../.vitepress/theme/composables/useSessionGate')
 const reason = m.useProgressBlockReason()
 expect(reason.value).toBe('checking')
 const gate = m.useSessionGate()
 localStorage.setItem('pentest-draft-a', 'learner wrote this')
 await gate.evaluate()
 expect(gate.shouldAsk.value).toBe(true)
 expect(reason.value).toBe('undecided')
 gate.keepExistingData()
 expect(reason.value).toBe(null)
})
it('concludes with nothing to ask about, so the block reason clears without the learner answering', async () => {
 const m = await import('../../../.vitepress/theme/composables/useSessionGate')
 const reason = m.useProgressBlockReason()
 const gate = m.useSessionGate()
 await gate.evaluate()
 expect(gate.shouldAsk.value).toBe(false)
 expect(reason.value).toBe(null)
})
