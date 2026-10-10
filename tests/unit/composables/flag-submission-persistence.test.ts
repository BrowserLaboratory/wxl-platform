import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  sessionStorage.setItem('wxl-session-gate', 'decided')
  localStorage.clear()
  vi.resetModules()
})
afterEach(() => vi.restoreAllMocks())

async function setup(init = true) {
  const { useAttackSession } = await import('../../../.vitepress/theme/composables/useAttackSession')
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const { submitFlag } = await import('../../../.vitepress/theme/composables/flagSubmission')
  const session = useAttackSession('flag-test', 'Flag test')
  if (init) await session.init()
  return { session, persistence: useChallengePersistence(), submitFlag }
}

describe('flag submission persistence', () => {
  it('shares pending and results between submission entry points', async () => {
    const { useFlagSubmission } = await import('../../../.vitepress/theme/composables/flagSubmission')
    let finish!: (value: { correct: boolean; saved: boolean }) => void
    const verify = vi.fn(() => new Promise<{ correct: boolean; saved: boolean }>(resolve => { finish = resolve }))
    const shared = useFlagSubmission(verify)
    const first = shared.submit('first')
    await shared.submit('second')
    expect(shared.pending.value).toBe(true)
    expect(verify).toHaveBeenCalledExactlyOnceWith('first')
    finish({ correct: true, saved: false })
    await first
    expect(shared.state.value).toBe('success')
    expect(shared.saved.value).toBe(false)
    expect(shared.pending.value).toBe(false)
  })
  it.each([true, false])('waits for both stored records, correct=%s', async correct => {
    const { session, persistence, submitFlag } = await setup()
    const result = await submitFlag('flag', () => correct, session.addFlagAttempt)
    expect(result).toEqual({ correct, saved: true })
    const stored = await persistence.loadAttackSession(session.getSession()!.sessionId)
    expect(stored!.events.filter(e => e.type === 'flag_attempt')).toHaveLength(1)
    expect(stored!.solvedAt !== null).toBe(correct)
    const progress = await persistence.loadProgress('flag-test')
    expect(progress!.attemptCount).toBe(1)
    expect(progress!.firstCompletedAt !== null).toBe(correct)
  })

  it.each(['attack-sessions', 'challenge-progress'])('reports incomplete persistence when %s rejects', async store => {
    const { session, persistence, submitFlag } = await setup()
    const original = IDBObjectStore.prototype.put
    const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === store) throw new DOMException('Injected storage failure', 'QuotaExceededError')
      return original.apply(this, args)
    })
    expect(await submitFlag('flag', () => true, session.addFlagAttempt)).toEqual({ correct: true, saved: false })
    fault.mockRestore()
    const stored = await persistence.loadAttackSession(session.getSession()!.sessionId)
    expect(stored!.events.filter(e => e.type === 'flag_attempt')).toHaveLength(store === 'attack-sessions' ? 0 : 1)
    expect(await persistence.loadProgress('flag-test')).toBeNull()
    // Explicitly sending again is a new submission; no hidden retry increments progress.
    expect(await submitFlag('flag', () => true, session.addFlagAttempt)).toEqual({ correct: true, saved: true })
    expect((await persistence.loadProgress('flag-test'))!.attemptCount).toBe(1)
    expect((await persistence.loadAttackSession(session.getSession()!.sessionId))!.events.filter(e => e.type === 'flag_attempt')).toHaveLength(2)
  })

  it('does not report an absent session as saved', async () => {
    const { session, persistence, submitFlag } = await setup(false)
    expect(await submitFlag('flag', () => true, session.addFlagAttempt)).toEqual({ correct: true, saved: false })
    expect(await persistence.listAttackSessions('flag-test')).toEqual([])
    expect(await persistence.loadProgress('flag-test')).toBeNull()
  })

  it('remains pending until recording resolves and passes the encoded flag', async () => {
    const { submitFlag } = await setup()
    let finish!: () => void
    const pending = new Promise<void>(resolve => { finish = resolve })
    const verify = vi.fn((bytes: Uint8Array) => new TextDecoder().decode(bytes) === '旗標')
    const record = vi.fn(() => pending)
    let settled = false
    const result = submitFlag('旗標', verify, record).then(value => { settled = true; return value })
    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(record).toHaveBeenCalledExactlyOnceWith('旗標', true)
    finish()
    expect(await result).toEqual({ correct: true, saved: true })
  })

  it.each([null, () => { throw new Error('WASM failed') }])('does not record when verification is unavailable (case %#)', async verify => {
    const { submitFlag } = await setup()
    const record = vi.fn()
    await expect(submitFlag('flag', verify, record)).rejects.toThrow()
    expect(record).not.toHaveBeenCalled()
  })
})
