import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

async function setup() {
  const { useAttackSession } = await import('../../../.vitepress/theme/composables/useAttackSession')
  const session = useAttackSession('export-test', 'Export test')
  await session.init()
  const blobs: Blob[] = []
  const anchor = document.createElement('a')
  const click = vi.spyOn(anchor, 'click').mockImplementation(() => {})
  vi.spyOn(document, 'createElement').mockReturnValue(anchor)
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob as Blob); return 'blob:export-test' })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  async function download(draft: { code: string; updatedAt: number } | null = null) {
    const before = click.mock.calls.length
    await session.exportSession({}, draft)
    expect(click).toHaveBeenCalledTimes(before + 1)
    return JSON.parse(await blobs.at(-1)!.text())
  }
  return { session, download }
}

describe('unfinished session export', () => {
  it('omits prompt for an unsolved session while retaining events and supplied draft', async () => {
    const { session, download } = await setup()
    await session.addFlagAttempt('wrong', false)
    await session.addNoteEvent('note', 'Keep this detour')
    const draft = { code: 'print("not run")', updatedAt: 123 }
    const payload = await download(draft)
    expect(payload.meta).not.toHaveProperty('systemPrompt')
    expect(payload.session.solvedAt).toBeNull()
    expect(payload.session.events).toEqual(session.getSession()!.events)
    expect(payload.session.draft).toEqual(draft)
  })
  it.each([0, 123])('includes the solved prompt at timestamp %s, despite a later wrong flag', async solvedAt => {
    const { session, download } = await setup()
    await session.addFlagAttempt('correct', true)
    session.getSession()!.solvedAt = solvedAt
    await session.addFlagAttempt('wrong-later', false)
    const payload = await download()
    expect(payload.session.solvedAt).toBe(solvedAt)
    expect(payload.meta.systemPrompt).toContain('Compare unsuccessful attempts and detours with the eventual successful approach')
    expect(payload.session.events).toEqual(session.getSession()!.events)
    expect(payload.session.draft).toBeNull()
  })
  it('exports the in-memory attempt when the session write failed', async () => {
    const { session, download } = await setup()
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('storage unavailable') })
    await expect(session.addFlagAttempt('unsaved-wrong', false)).rejects.toThrow('storage unavailable')
    const payload = await download()
    expect(payload.meta).not.toHaveProperty('systemPrompt')
    expect(payload.session.events).toContainEqual(expect.objectContaining({ type: 'flag_attempt', submitted: 'unsaved-wrong' }))
    put.mockRestore()
  })
})
