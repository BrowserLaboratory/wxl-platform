import { beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
  vi.resetModules()
})

const attempt = (over: Record<string, unknown> = {}) => ({
  sessionId: 'a', challengeSlug: 'sqli-demo', challengeTitle: 'SQL Injection Demo',
  startedAt: 1000, solvedAt: null,
  events: [{ type: 'challenge_start' as const, timestamp: 1000 }],
  ...over,
})

async function seeded(sessions: Record<string, unknown>[]) {
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const api = useChallengePersistence()
  for (const s of sessions) await api.saveAttackSession(s as never)
  const { useAttackLogDeletion } = await import('../../../.vitepress/theme/composables/useAttackLogDeletion')
  return { api, deletion: useAttackLogDeletion() }
}

describe('clearing one challenge', () => {
  it('removes every stored attempt except the one in progress', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'old-1', startedAt: 1000 }),
      attempt({ sessionId: 'old-2', startedAt: 2000, solvedAt: 2500 }),
      attempt({ sessionId: 'in-progress', startedAt: 3000 }),
    ])

    const outcome = await deletion.clearChallenge('sqli-demo', 'in-progress')

    expect(outcome).toEqual({ ok: true, removed: 2 })
    expect((await api.listAttackSessions('sqli-demo')).map(s => s.sessionId)).toEqual(['in-progress'])
  })

  it('leaves other challenges and the other stores alone', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'here', startedAt: 1000 }),
      attempt({ sessionId: 'in-progress', startedAt: 2000 }),
      attempt({ sessionId: 'elsewhere', challengeSlug: 'staff-only', startedAt: 1000 }),
    ])
    await api.saveCodeDraft('sqli-demo', 'still here')
    await api.saveNote({ id: 'n', challengeSlug: 'sqli-demo', content: 'still here', createdAt: 1, updatedAt: null })

    await deletion.clearChallenge('sqli-demo', 'in-progress')

    expect((await api.listAttackSessions('staff-only')).map(s => s.sessionId)).toEqual(['elsewhere'])
    expect((await api.loadCodeDraft('sqli-demo'))?.code).toBe('still here')
    expect((await api.loadNotesBySlug('sqli-demo')).map(n => n.content)).toEqual(['still here'])
  })

  it('reports nothing removed when the only attempt is the one in progress', async () => {
    const { api, deletion } = await seeded([attempt({ sessionId: 'in-progress' })])

    const outcome = await deletion.clearChallenge('sqli-demo', 'in-progress')

    expect(outcome).toEqual({ ok: true, removed: 0 })
    expect(await api.listActivityTraces('sqli-demo')).toEqual([])
    expect((await api.listAttackSessions('sqli-demo'))).toHaveLength(1)
  })

  it('does not touch challenge progress', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'solved', solvedAt: 2000 }),
      attempt({ sessionId: 'in-progress', startedAt: 3000 }),
    ])
    sessionStorage.setItem('wxl-session-gate', 'decided')
    await api.recordAttempt('sqli-demo', true)
    const before = await api.loadProgress('sqli-demo')

    await deletion.clearChallenge('sqli-demo', 'in-progress')

    // Progress is kept apart from attempts precisely so it is not derived from them.
    // Removing every record of how a challenge was solved does not un-solve it.
    expect(await api.loadProgress('sqli-demo')).toEqual(before)
    expect(before?.firstCompletedAt).not.toBeNull()
  })
})

describe('the trace a removal leaves', () => {
  it('records when, which challenge, and each attempt\'s start time and solved state', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'old-1', startedAt: 1000 }),
      attempt({ sessionId: 'old-2', startedAt: 2000, solvedAt: 2500 }),
      attempt({ sessionId: 'in-progress', startedAt: 3000 }),
    ])

    const before = Date.now()
    await deletion.clearChallenge('sqli-demo', 'in-progress')

    const [trace] = await api.listActivityTraces('sqli-demo')
    expect(trace.challengeSlug).toBe('sqli-demo')
    expect(trace.at).toBeGreaterThanOrEqual(before)
    expect(trace.removed).toEqual([
      { startedAt: 1000, solved: false },
      { startedAt: 2000, solved: true },
    ])
  })

  it('carries none of the content it removed', async () => {
    const { api, deletion } = await seeded([
      attempt({
        sessionId: 'old', startedAt: 1000,
        events: [
          { type: 'note', timestamp: 1100, id: 'n', content: 'SECRET-NOTE-TEXT', updatedAt: null },
          { type: 'http_request', timestamp: 1200, source: 'browser', id: 1, method: 'GET', url: '/SECRET-URL', requestHeaders: [], requestBody: null, status: 200, responseHeaders: [], responseBody: 'SECRET-BODY', duration: 1 },
          { type: 'code_execution', timestamp: 1300, executionId: 'e', code: 'SECRET-CODE', output: 'SECRET-OUTPUT', error: false, duration: 1 },
        ],
      }),
      attempt({ sessionId: 'in-progress', startedAt: 3000 }),
    ])

    await deletion.clearChallenge('sqli-demo', 'in-progress')

    // Keeping the content would make the removal false: the learner believes the
    // record is gone while a copy sits in the same database that nothing can remove.
    const serialized = JSON.stringify(await api.listActivityTraces('sqli-demo'))
    for (const secret of ['SECRET-NOTE-TEXT', 'SECRET-URL', 'SECRET-BODY', 'SECRET-CODE', 'SECRET-OUTPUT']) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('outlives the attempts it describes', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'old', startedAt: 1000 }),
      attempt({ sessionId: 'in-progress', startedAt: 2000 }),
    ])

    await deletion.clearChallenge('sqli-demo', 'in-progress')

    expect(await api.listActivityTraces('sqli-demo')).toHaveLength(1)
  })
})

describe('when a removal does not finish', () => {
  it('records only what actually went and says it did not finish', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'old-1', startedAt: 1000 }),
      attempt({ sessionId: 'old-2', startedAt: 2000 }),
      attempt({ sessionId: 'old-3', startedAt: 3000 }),
      attempt({ sessionId: 'in-progress', startedAt: 4000 }),
    ])
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const real = useChallengePersistence().deleteAttackSession
    let calls = 0
    vi.spyOn(await import('../../../.vitepress/theme/composables/useChallengePersistence'), 'useChallengePersistence')
      .mockImplementation(() => ({
        ...useChallengePersistence(),
        deleteAttackSession: async (id: string) => {
          if (++calls === 2) throw new Error('write failed')
          return real(id)
        },
      }) as never)

    const { useAttackLogDeletion } = await import('../../../.vitepress/theme/composables/useAttackLogDeletion')
    const outcome = await useAttackLogDeletion().clearChallenge('sqli-demo', 'in-progress')

    expect(outcome).toEqual({ ok: false, kind: 'partial', removed: 1 })
    const [trace] = await api.listActivityTraces('sqli-demo')
    // The trace describes what happened, not what was attempted.
    expect(trace.removed).toEqual([{ startedAt: 1000, solved: false }])
  })

  it('says the records are gone but no trace was left when the trace cannot be written', async () => {
    const { api, deletion } = await seeded([
      attempt({ sessionId: 'old', startedAt: 1000 }),
      attempt({ sessionId: 'in-progress', startedAt: 2000 }),
    ])
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    vi.spyOn(await import('../../../.vitepress/theme/composables/useChallengePersistence'), 'useChallengePersistence')
      .mockImplementation(() => ({
        ...useChallengePersistence(),
        saveActivityTrace: async () => { throw new Error('trace write failed') },
      }) as never)

    const { useAttackLogDeletion } = await import('../../../.vitepress/theme/composables/useAttackLogDeletion')
    const outcome = await useAttackLogDeletion().clearChallenge('sqli-demo', 'in-progress')

    // Reporting plain success here would tell the learner their removal was marked
    // when it was not.
    expect(outcome).toEqual({ ok: false, kind: 'no-trace', removed: 1 })
    expect((await api.listAttackSessions('sqli-demo')).map(s => s.sessionId)).toEqual(['in-progress'])
  })
})
