import { describe, it, expect, vi, beforeEach } from 'vitest'

// The only thing this composable reads. Mocked at the module boundary rather than
// through the idb harness: what is under test is the *reading* of completion, and a
// test that also had to set up an object store would pass or fail for reasons that
// have nothing to do with it.
const mockListAllProgress = vi.fn(async () => [] as any[])
vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  useChallengePersistence: () => ({ listAllProgress: mockListAllProgress }),
}))

function record(slug: string, firstCompletedAt: number | null, extra: Record<string, unknown> = {}) {
  return { challengeSlug: slug, firstCompletedAt, lastAttemptAt: 1756000000000, attemptCount: 1, ...extra }
}

async function load() {
  const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
  const progress = useChallengeProgress()
  await progress.load()
  return progress
}

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem('wxl-session-gate', 'decided')
  mockListAllProgress.mockReset()
  mockListAllProgress.mockResolvedValue([])
  vi.resetModules()
})

describe('useChallengeProgress', () => {
  it('starts with nothing completed before anything is loaded', async () => {
    const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
    const progress = useChallengeProgress()
    expect(progress.completedSlugs.value.size).toBe(0)
    expect(mockListAllProgress).not.toHaveBeenCalled()
  })

  it('marks a challenge completed when its firstCompletedAt is set', async () => {
    mockListAllProgress.mockResolvedValue([record('door-is-open', 1756000000000)])
    const progress = await load()
    expect(progress.completedSlugs.value.has('door-is-open')).toBe(true)
  })

  // The whole reason completion lives in its own store: a challenge can hold several
  // attempts, so anything derived from attempt activity changes when an attempt is
  // deleted or replaced. A record with attempts and no completion is the shape that
  // catches a reader keying off the wrong field.
  it('does not mark a challenge attempted but never solved', async () => {
    mockListAllProgress.mockResolvedValue([
      record('staff-only', null, { attemptCount: 7, lastAttemptAt: 1756000009999 }),
    ])
    const progress = await load()
    expect(progress.completedSlugs.value.has('staff-only')).toBe(false)
    expect(progress.completedSlugs.value.size).toBe(0)
  })

  it('separates completed from uncompleted across many records', async () => {
    mockListAllProgress.mockResolvedValue([
      record('door-is-open', 1756000000000),
      record('staff-only', null),
      record('selected-excerpts', 1756000005000),
    ])
    const progress = await load()
    expect([...progress.completedSlugs.value].sort()).toEqual(['door-is-open', 'selected-excerpts'])
  })

  // `firstCompletedAt: 0` is a real timestamp, not an absence. A `!record.firstCompletedAt`
  // test would read it as uncompleted; only a null check gets this right.
  it('treats a zero completion time as completed', async () => {
    mockListAllProgress.mockResolvedValue([record('epoch-solver', 0)])
    const progress = await load()
    expect(progress.completedSlugs.value.has('epoch-solver')).toBe(true)
  })

  // D5: the list is entirely usable without progress, so an unreadable store is not an
  // error the caller has to handle — it is an empty map. `load()` resolving is the
  // assertion: a rejection here would reach the component as an unhandled rejection.
  it('resolves with an empty map when the read rejects', async () => {
    mockListAllProgress.mockRejectedValue(new Error('challenge-tools did not open within the time limit'))
    const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
    const progress = useChallengeProgress()
    await expect(progress.load()).resolves.toBeUndefined()
    expect(progress.completedSlugs.value.size).toBe(0)
  })

  // A failed read must not leave a previous good read's answers standing either — but
  // more importantly it must not throw on the way out. Asserted with a real prior load
  // so the failure path runs against non-empty state.
  it('does not throw when a later read fails after a successful one', async () => {
    mockListAllProgress.mockResolvedValue([record('door-is-open', 1756000000000)])
    const progress = await load()
    expect(progress.completedSlugs.value.size).toBe(1)

    mockListAllProgress.mockRejectedValue(new Error('blocked'))
    await expect(progress.load()).resolves.toBeUndefined()
    expect(progress.completedSlugs.value.size).toBe(0)
  })

  it('reads the store exactly once per load, not once per challenge', async () => {
    mockListAllProgress.mockResolvedValue([
      record('a', 1), record('b', null), record('c', 2), record('d', null),
    ])
    await load()
    expect(mockListAllProgress).toHaveBeenCalledTimes(1)
  })
})

it('never reads while undecided and loads automatically after keep', async () => {
  sessionStorage.clear()
  const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const progress = useChallengeProgress()
  await progress.load()
  expect(mockListAllProgress).not.toHaveBeenCalled()
  expect(progress.settled.value).toBe(false)
  mockListAllProgress.mockResolvedValue([record('accepted', 1)])
  useSessionGate().keepExistingData()
  await vi.waitFor(() => expect(progress.completedSlugs.value.has('accepted')).toBe(true))
})

it('discards a pending read when clearing starts', async () => {
  let finish!: (records: any[]) => void
  mockListAllProgress.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  const progress = useChallengeProgress()
  const loading = progress.load()
  const clearing = useSessionGate().clearEverything(() => {})
  finish([record('previous-user', 1)])
  await loading
  await clearing
  expect(progress.completedSlugs.value.size).toBe(0)
  expect(progress.settled.value).toBe(false)
})

it('keeps the newest load when an older response arrives later', async () => {
  let finish!: (records: any[]) => void
  mockListAllProgress.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
  const progress = useChallengeProgress()
  const older = progress.load()
  mockListAllProgress.mockResolvedValue([record('new', 1)])
  await progress.load()
  finish([record('old', 1)])
  await older
  expect([...progress.completedSlugs.value]).toEqual(['new'])
})

it('distinguishes failed reads from empty progress and clears the error on retry', async () => {
  mockListAllProgress.mockRejectedValueOnce(new Error('blocked'))
  const progress = await load()
  expect(progress.failed.value).toBe(true)
  expect(progress.settled.value).toBe(true)
  let finish!: (records: any[]) => void
  mockListAllProgress.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const retry = progress.load()
  expect(progress.failed.value).toBe(false)
  expect(progress.settled.value).toBe(false)
  finish([record('recovered', 1)])
  await retry
  expect(progress.failed.value).toBe(false)
  expect(progress.completedSlugs.value.has('recovered')).toBe(true)
})

it('suppresses late failures after access revocation', async () => {
  let fail!: (error: Error) => void
  mockListAllProgress.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
  const { useChallengeProgress } = await import('../../../.vitepress/theme/composables/useChallengeProgress')
  const progress = useChallengeProgress()
  const loading = progress.load()
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  await useSessionGate().clearEverything(() => {})
  fail(new Error('late failure'))
  await loading
  expect(progress.failed.value).toBe(false)
  expect(progress.settled.value).toBe(false)
})

it('keeps retry available through repeated failures', async () => {
  mockListAllProgress.mockRejectedValue(new Error('blocked'))
  const progress = await load()
  await progress.load()
  expect(progress.failed.value).toBe(true)
  expect(progress.settled.value).toBe(true)
  expect(mockListAllProgress).toHaveBeenCalledTimes(2)
})
