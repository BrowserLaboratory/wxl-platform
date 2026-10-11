import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import {
  resetTruthEnvironment, mountRealGate, sentence, pressClearAndSettle, holdDatabase,
  withSweepFailing, bannedTermsIn, navigations, DATABASE_NAME, seedDatabase, storeNamesOnReopen, rowsOnReopen,
} from '../../__helpers__/sessionGateTruth'

// The component resolves the site root through VitePress; the harness cannot mock it for us.
vi.mock('vitepress', () => ({ withBase: (p: string) => p }))

/**
 * Truth tests for the session gate (spec 0001, seam S2).
 *
 * Each test builds the machine state first, reads it back, and only then compares what is on
 * screen with sentences written out here, by exact equality. Changing a message file into a
 * sentence that is false on its path turns one of these red; the routing tests cannot see that.
 */

const NOTE_DRAFT = 'pentest-draft-door-is-open'
const CLEAR_STARTED_RECORD = 'wxl-clear-started'

/**
 * The three sentences shown after a sweep failure (`body_cleared`, `sweep_failed`,
 * `sweep_failed_hint`), written out from the copy table in `traceability.md`.
 */
const SWEEP_FAILED = {
  'en': {
    body: "This site's database in this browser has been deleted, and anything it held cannot be brought back.",
    heading: 'Not every other value this site stored in this browser could be removed.',
    hint: 'There is no way to tell from here how many are left. '
      + 'Pressing delete again retries the whole site-wide clear, starting with the database.',
  },
  'zh-TW': {
    body: '本站在這個瀏覽器裡的資料庫已經刪除；裡面若有東西，也都救不回來了。',
    heading: '本站在這個瀏覽器存的其他項目，沒能全部刪掉。',
    hint: '從這裡無從得知還剩下多少。再按一次刪除，會從資料庫開始，把全站清除整個重試一次。',
  },
} as const

/**
 * What the platform writes on its own when a challenge page first opens: not learner
 * evidence. The harness's own test below shows the platform's detection does not count it.
 */
const INITIALIZATION_ONLY_SESSION = {
  sessionId: 'auto-1',
  challengeSlug: 'door-is-open',
  challengeTitle: 'Need to Know',
  startedAt: 1_760_000_000_000,
  solvedAt: null,
  events: [{ type: 'challenge_start', timestamp: 1_760_000_000_000 }],
}

beforeEach(() => {
  resetTruthEnvironment()
})

afterEach(() => {
  vi.restoreAllMocks()
})

enableAutoUnmount(afterEach)

describe('session gate truth: P0, the untouched question', () => {
  it.each([
    ['en', 'Is this your work?',
      'This browser already holds saved work for these challenges — requests, notes and flag attempts. '
      + 'If the machine is shared, it may belong to whoever used it before you. '
      + 'Nothing is deleted unless you choose to delete it.',
      'Continue with this work', 'Delete it and start fresh'],
    ['zh-TW', '這些紀錄是你的嗎？',
      '這台瀏覽器裡已經存有這些題目的解題紀錄——請求、筆記與 flag 嘗試。'
      + '如果這是共用的電腦，那可能是前一位使用者留下的。'
      + '除非你選擇刪除，否則不會刪掉任何東西。',
      '沿用這些紀錄', '刪除並重新開始'],
  ] as const)('asks with every sentence as written (%s)', async (locale, title, body, keep, clear) => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    expect(localStorage.getItem(NOTE_DRAFT)).not.toBeNull()

    const { wrapper } = await mountRealGate(locale)

    expect(sentence(wrapper, 'title')).toBe(title)
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'keep')).toBe(keep)
    expect(sentence(wrapper, 'clear')).toBe(clear)
    expect(sentence(wrapper, 'reload')).toBeNull()
    expect(sentence(wrapper, 'dismiss')).toBeNull()
    expect(sentence(wrapper, 'report-heading')).toBeNull()
    expect(sentence(wrapper, 'report-hint')).toBeNull()
    expect(sentence(wrapper, 'raw-error')).toBeNull()
  })

  it('does not ask a browser that holds no learner evidence', async () => {
    expect(localStorage.length).toBe(0)
    expect(await indexedDB.databases()).toEqual([])

    const { wrapper } = await mountRealGate('en')

    expect(wrapper.find('[data-session-gate]').exists()).toBe(false)
  })
})

describe('session gate truth: P1, a first run still in flight', () => {
  it.each([
    ['en', 'Is this your work?',
      'A deletion of the saved work was started and could not be confirmed. '
      + 'It may still be in progress, so there is no way to tell from here whether anything is left.',
      'Delete it and start fresh'],
    ['zh-TW', '這些紀錄是你的嗎？',
      '已存紀錄的刪除已經開始，但結果無法確認。它可能還在進行中，所以從這裡無從得知還剩下什麼。',
      '刪除並重新開始'],
  ] as const)('says the outcome is not known yet (%s)', async (locale, title, body, clear) => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const held = await holdDatabase()
    try {
      const { wrapper } = await mountRealGate(locale)

      await wrapper.get('[data-session-gate-clear]').trigger('click')

      // The delete really is pending: the held connection was asked to make way for a delete
      // and has not, the start record exists, and the database is still there.
      await vi.waitFor(() => expect(held.deleteRequested()).toBe(true))
      expect(sessionStorage.getItem(CLEAR_STARTED_RECORD)).not.toBeNull()
      expect(await indexedDB.databases()).toContainEqual(expect.objectContaining({ name: DATABASE_NAME }))

      expect(sentence(wrapper, 'title')).toBe(title)
      expect(sentence(wrapper, 'body')).toBe(body)
      expect(sentence(wrapper, 'clear')).toBe(clear)
      expect(sentence(wrapper, 'keep')).toBeNull()
      expect(sentence(wrapper, 'reload')).toBeNull()
      expect(sentence(wrapper, 'dismiss')).toBeNull()
      expect(sentence(wrapper, 'report-heading')).toBeNull()
      expect(sentence(wrapper, 'raw-error')).toBeNull()
    } finally {
      held.close()
    }

    // Released, the run completes: the database goes and the gate asks for the site root.
    await vi.waitFor(() => expect(navigations).toEqual(['/']))
    expect(await indexedDB.databases()).toEqual([])
  })
})

describe('session gate truth: P4, the sweep failed on a database without learner rows', () => {
  it.each([
    ['en', 'Is this your work?', 'Close this report and carry on', 'Delete it and start fresh'],
    ['zh-TW', '這些紀錄是你的嗎？', '關掉這則說明，繼續使用', '刪除並重新開始'],
  ] as const)('says the database went and some other values did not (%s)', async (locale, title, dismiss, clear) => {
    const { body, heading, hint } = SWEEP_FAILED[locale]
    await seedDatabase([{ store: 'attack-sessions', value: INITIALIZATION_ONLY_SESSION }])
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    // The database holds a row, and none of it is learner evidence: the draft is.
    expect(await rowsOnReopen('attack-sessions')).toEqual([INITIALIZATION_ONLY_SESSION])
    expect(await rowsOnReopen('pentest-notes')).toEqual([])
    const { gate, wrapper } = await mountRealGate(locale)

    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))

    // The database really went, with the row seeded before the run; the draft really stayed.
    expect(await indexedDB.databases()).toEqual([])
    expect(await storeNamesOnReopen()).toEqual([])
    expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')

    expect(sentence(wrapper, 'title')).toBe(title)
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(sentence(wrapper, 'raw-error')).toBe('injected: removeItem refused')
    expect(sentence(wrapper, 'dismiss')).toBe(dismiss)
    expect(sentence(wrapper, 'clear')).toBe(clear)
    expect(sentence(wrapper, 'keep')).toBeNull()
    expect(sentence(wrapper, 'reload')).toBeNull()
  })
})

describe('session gate truth: P5, the sweep failed after learner rows were deleted', () => {
  it.each([
    ['en', 'Is this your work?', 'Close this report and carry on', 'Delete it and start fresh'],
    ['zh-TW', '這些紀錄是你的嗎？', '關掉這則說明，繼續使用', '刪除並重新開始'],
  ] as const)('says the same, whatever the database held (%s)', async (locale, title, dismiss, clear) => {
    const { body, heading, hint } = SWEEP_FAILED[locale]
    await seedDatabase([{ store: 'pentest-notes', value: { id: 'n1', challengeSlug: 'door-is-open' } }])
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    expect(await rowsOnReopen('pentest-notes')).toHaveLength(1)
    const { gate, wrapper } = await mountRealGate(locale)

    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))

    expect(await indexedDB.databases()).toEqual([])
    expect(await storeNamesOnReopen()).toEqual([])
    expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')

    expect(sentence(wrapper, 'title')).toBe(title)
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(sentence(wrapper, 'raw-error')).toBe('injected: removeItem refused')
    expect(sentence(wrapper, 'dismiss')).toBe(dismiss)
    expect(sentence(wrapper, 'clear')).toBe(clear)
    expect(sentence(wrapper, 'keep')).toBeNull()
    expect(sentence(wrapper, 'reload')).toBeNull()
  })
})

describe('session gate truth: copy invariant CI-1 on the changed sentences', () => {
  it.each([['en'], ['zh-TW']] as const)('the sweep-failure sentences contain no banned term (%s)', (locale) => {
    for (const text of Object.values(SWEEP_FAILED[locale])) expect(bannedTermsIn(text, locale)).toEqual([])
  })
})

describe('session gate truth: the harness itself', () => {
  it('makes the sweep fail only while F1 is installed', async () => {
    localStorage.setItem(NOTE_DRAFT, 'x')

    await withSweepFailing(async () => {
      expect(() => localStorage.removeItem(NOTE_DRAFT)).toThrow('injected: removeItem refused')
    })

    // Restored: the next caller gets the real method back.
    localStorage.removeItem(NOTE_DRAFT)
    expect(localStorage.getItem(NOTE_DRAFT)).toBeNull()
  })

  it('restores the sweep even when the guarded block throws', async () => {
    await expect(withSweepFailing(async () => { throw new Error('test body failed') })).rejects.toThrow('test body failed')
    localStorage.setItem(NOTE_DRAFT, 'x')
    localStorage.removeItem(NOTE_DRAFT)
    expect(localStorage.getItem(NOTE_DRAFT)).toBeNull()
  })

  it('drives a sweep failure through the gate with F1 around the settled press', async () => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate('en')

    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))

    // State only; the sentences this state shows are pinned under P4 and P5 above.
    expect(gate.databaseDeleted.value).toBe(true)
    expect(gate.clearError.value).toBe('injected: removeItem refused')
    expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')
    expect(await indexedDB.databases()).toEqual([])
    expect(navigations).toEqual([])
  })

  it('seeds rows the platform reads through its own schema, and leaves no connection open', async () => {
    await seedDatabase([{ store: 'pentest-notes', value: { id: 'n1', challengeSlug: 'door-is-open' } }])

    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    expect(await useChallengePersistence().hasAnyStoredData()).toBe(true)
    // A connection left open by the seed would stall the delete this harness exists to run.
    await useChallengePersistence().deleteDatabase()
    expect(await indexedDB.databases()).toEqual([])
  })

  it('seeds an initialization-only session that detection does not count', async () => {
    await seedDatabase([{ store: 'attack-sessions', value: INITIALIZATION_ONLY_SESSION }])

    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    expect(await useChallengePersistence().hasAnyStoredData()).toBe(false)
  })

  it('reads back the store names of the database, closing the connection it opened', async () => {
    await seedDatabase([])
    expect(await storeNamesOnReopen()).toContain('pentest-notes')

    // Closed: a delete issued now is not held up by the read.
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    await useChallengePersistence().deleteDatabase()
    expect(await indexedDB.databases()).toEqual([])
  })

  it.each([
    ['en', 'Is this your work?', ['work', 'your']],
    ['en', 'The saved work has already been deleted', ['work', 'saved']],
    ['en', 'Learners keep yours and it works', ['work', 'learner', 'your']],
    ['en', 'Not every other value this site stored in this browser could be removed.', []],
    ['en', 'Network and framework settings', []],
    ['zh-TW', '這些紀錄是你的嗎？', ['紀錄', '你的']],
    ['zh-TW', '已存的解題紀錄已經刪掉', ['解題紀錄', '紀錄', '已存']],
    ['zh-TW', '本站在這個瀏覽器存的其他項目，沒能全部刪掉。', []],
  ] as const)('CI-1 finds the banned terms in (%s) "%s"', (locale, text, expected) => {
    expect(bannedTermsIn(text, locale)).toEqual(expected)
  })
})
