import { beforeEach, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import 'fake-indexeddb/auto'
import { checkpointCodeDraft, CODE_DRAFT_PREFIX } from '../../../.vitepress/theme/composables/codeDraftSnapshot'

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); globalThis.indexedDB = new IDBFactory(); vi.resetModules() })

it.each(['print("latest")', ''])('restores checkpoint %s after a fresh module load ahead of older IDB', async code => {
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  await useChallengePersistence().saveCodeDraft('a', 'old')
  checkpointCodeDraft('a', code)
  vi.resetModules()
  const fresh = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  expect((await fresh.useChallengePersistence().loadCodeDraft('a'))?.code).toBe(code)
  expect(await fresh.useChallengePersistence().loadCodeDraft('b')).toBeNull()
})

it.each(['{broken', '{"challengeSlug":"other","code":"wrong","updatedAt":1}', '{"challengeSlug":"a","code":1,"updatedAt":1}'])('falls back to IDB for invalid checkpoint %s', async raw => {
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  const api = useChallengePersistence()
  await api.saveCodeDraft('a', 'old')
  localStorage.setItem(CODE_DRAFT_PREFIX + 'a', raw)
  expect((await api.loadCodeDraft('a'))?.code).toBe('old')
})

it('detects checkpoint-only learner work and clears all snapshots', async () => {
  checkpointCodeDraft('a', 'private')
  checkpointCodeDraft('b', '')
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  expect(gate.shouldAsk.value).toBe(true)
  const reload = vi.fn()
  await gate.clearEverything(reload)
  expect(reload).toHaveBeenCalledOnce()
  expect(localStorage.getItem(CODE_DRAFT_PREFIX + 'a')).toBeNull()
  expect(localStorage.getItem(CODE_DRAFT_PREFIX + 'b')).toBeNull()
})

it('removes an older checkpoint on write failure so a later database save can recover', async () => {
  checkpointCodeDraft('a', 'stale')
  const set = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('quota') })
  expect(() => checkpointCodeDraft('a', 'new')).toThrow('quota')
  set.mockRestore()
  const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
  await useChallengePersistence().saveCodeDraft('a', 'new')
  expect((await useChallengePersistence().loadCodeDraft('a'))?.code).toBe('new')
})
