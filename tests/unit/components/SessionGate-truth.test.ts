import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import {
  resetTruthEnvironment, mountRealGate, sentence, pressClearAndSettle, holdDatabase,
  withSweepFailing, bannedTermsIn, navigations, DATABASE_NAME, seedDatabase, storeNamesOnReopen, rowsOnReopen,
  withDeleteNeverSettling, withDeleteFailing, pressClearPastDeleteBound, withStartRecordRefused, inNewDocument, mountGateOnly,
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
 * The three sentences shown while a delete has not been confirmed (`body_unconfirmed`,
 * `clear_unconfirmed`, and the new `clear_unconfirmed_hint` from the copy table).
 */
const UNCONFIRMED = {
  'en': {
    body: 'A deletion of the saved work was started and could not be confirmed. '
      + 'It may still be in progress, so there is no way to tell from here whether anything is left.',
    heading: 'The outcome could not be confirmed.',
    hint: 'The site-wide clear cannot finish while another tab of this site has the data open. '
      + 'Close any other tabs, then reload.',
  },
  'zh-TW': {
    body: '已存紀錄的刪除已經開始，但結果無法確認。它可能還在進行中，所以從這裡無從得知還剩下什麼。',
    heading: '結果無法確認。',
    hint: '本站還有其他分頁開著同一份資料時，全站清除無法完成。請先關掉其他分頁，再重新載入。',
  },
} as const

/** `clear_retry_not_started_hint`, written out from the copy table. */
const RETRY_HINT = {
  'en': "This browser would not let the site record that the site-wide clear began, so nothing was deleted this time. "
    + "Free up this browser's storage for this site, or use a normal window, then try again.",
  'zh-TW': '這個瀏覽器不讓本站記下全站清除已經開始，所以這次沒有刪掉任何東西。請清出本站在這個瀏覽器的儲存空間，或改用一般視窗，再試一次。',
} as const

/** True when the retry notice comes after the report hint in the document. */
function noticeFollowsReport(wrapper: Parameters<typeof sentence>[0]): boolean {
  const hint = wrapper.find('[data-session-gate-report-hint]').element
  const notice = wrapper.find('[data-session-gate-retry-hint]').element
  return Boolean(hint.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/** The not-started report a refused first run shows, unchanged by this epic. */
const NOT_STARTED = {
  'en': {
    heading: 'The deletion was not started.',
    hint: 'This browser would not let the site record that a deletion had begun, and starting one without that record '
      + 'could later tell you your work was safe when it was not. Nothing was deleted. '
      + "Free up this browser's storage for this site, or use a normal window, then try again.",
  },
  'zh-TW': {
    heading: '刪除沒有開始。',
    hint: '這個瀏覽器不讓本站記下「刪除已經開始」這件事，而在沒有這筆記錄的情況下開始刪除，之後可能會告訴你紀錄安然無恙、實際上卻不是。'
      + '目前沒有刪掉任何東西。請清出這個網站在本瀏覽器的儲存空間，或改用一般視窗，再試一次。',
  },
} as const

/**
 * Press delete while the start record cannot be written, and let the refusal render.
 *
 * The bare click is enough here, unlike a run: the refusal is decided before the clear's
 * first `await`, so it has fully happened when the click handler returns.
 */
async function pressRefused(wrapper: Parameters<typeof sentence>[0]): Promise<void> {
  await withStartRecordRefused(async () => {
    await wrapper.get('[data-session-gate-clear]').trigger('click')
    await wrapper.vm.$nextTick()
  })
}

/** The two exit labels besides delete, as the copy reads today (unchanged by this epic). */
const EXIT = {
  'en': { reload: 'Reload and start over', dismiss: 'Close this report and carry on' },
  'zh-TW': { reload: '重新載入並重來', dismiss: '關掉這則說明，繼續使用' },
} as const

/** Which of continue, reload and dismiss are on screen, by their exact labels. */
function exitsOnScreen(wrapper: Parameters<typeof sentence>[0]) {
  return { keep: sentence(wrapper, 'keep'), reload: sentence(wrapper, 'reload'), dismiss: sentence(wrapper, 'dismiss') }
}

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

describe('session gate truth: P11a, a new document after a sweep failure', () => {
  // The learner reloads by hand after P5. The new document restores the start record and
  // nothing else: no run of its own has failed, so there is no report to show, and the flag
  // that the earlier document set is not carried over.
  it.each([
    ['en', true, 'Is this your work?', 'Delete it and start fresh'],
    ['zh-TW', true, '這些紀錄是你的嗎？', '刪除並重新開始'],
    ['en', false, 'Is this your work?', 'Delete it and start fresh'],
  ] as const)('says only that nothing is confirmed (%s, challenge page: %s)', async (locale, isChallengePage, title, clear) => {
    await seedDatabase([{ store: 'pentest-notes', value: { id: 'n1', challengeSlug: 'door-is-open' } }])
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    expect(await rowsOnReopen('pentest-notes')).toHaveLength(1)
    const first = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(first.wrapper, first.gate))
    expect(first.gate.clearFailurePhase.value).toBe('sweep')
    first.wrapper.unmount()

    const { gate, wrapper } = await inNewDocument(locale, isChallengePage)

    // The record the earlier document left, and a database with nothing in it: the delete
    // went through, and nothing in this document reopened it.
    expect(sessionStorage.getItem(CLEAR_STARTED_RECORD)).not.toBeNull()
    expect(gate.databaseDeleted.value).toBe(false)
    expect(await indexedDB.databases()).toEqual([])
    expect(await storeNamesOnReopen()).toEqual([])

    expect(sentence(wrapper, 'title')).toBe(title)
    expect(sentence(wrapper, 'body')).toBe(UNCONFIRMED[locale].body)
    expect(sentence(wrapper, 'clear')).toBe(clear)
    expect(sentence(wrapper, 'report-heading')).toBeNull()
    expect(sentence(wrapper, 'report-hint')).toBeNull()
    expect(sentence(wrapper, 'raw-error')).toBeNull()
    expect(sentence(wrapper, 'retry-hint')).toBeNull()
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: null, dismiss: null })
  })
})

describe('session gate truth: P7, a later run blocked after a sweep failure', () => {
  it.each([['en'], ['zh-TW']] as const)('P7: reports the delete that did not finish, not the sweep (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))
    expect(gate.databaseDeleted.value).toBe(true)

    const held = await holdDatabase()
    try {
      await pressClearPastDeleteBound(wrapper, gate)

      // The later run's delete really was held: the handle was asked to make way and the
      // run gave up on the platform's bound with the blocked reason.
      expect(held.deleteRequested()).toBe(true)
      expect(sentence(wrapper, 'raw-error')).toContain('another tab still has it open')
    } finally {
      held.close()
    }
    // Released, the queued delete goes through.
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))

    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })
})

describe('session gate truth: deletes that did not finish', () => {
  it.each([['en'], ['zh-TW']] as const)('P3: a first run whose delete timed out (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)

    await withDeleteNeverSettling(() => pressClearPastDeleteBound(wrapper, gate))

    // No handle of the test's own held anything: the run gave up on time alone.
    expect(sentence(wrapper, 'raw-error')).toContain('within the time limit')
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })

  it.each([['en'], ['zh-TW']] as const)('P8: a later run whose delete timed out after a sweep failure (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))
    expect(sentence(wrapper, 'report-heading')).toBe(SWEEP_FAILED[locale].heading)

    await withDeleteNeverSettling(() => pressClearPastDeleteBound(wrapper, gate))

    expect(sentence(wrapper, 'raw-error')).toContain('within the time limit')
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })

  it.each([['en'], ['zh-TW']] as const)('P3x: a first run whose delete failed for another reason (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)

    await withDeleteFailing(() => pressClearAndSettle(wrapper, gate))

    expect(sentence(wrapper, 'raw-error')).toBe('injected: delete failed')
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })

  it.each([['en'], ['zh-TW']] as const)('P2: a first run whose delete another tab held (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    const held = await holdDatabase()
    try {
      await pressClearPastDeleteBound(wrapper, gate)

      expect(held.deleteRequested()).toBe(true)
      expect(sentence(wrapper, 'raw-error')).toContain('another tab still has it open')
      expect(sentence(wrapper, 'body')).toBe(body)
      expect(sentence(wrapper, 'report-heading')).toBe(heading)
      expect(sentence(wrapper, 'report-hint')).toBe(hint)
      expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
    } finally {
      held.close()
    }
    // Released, every queued delete goes through before the next test starts.
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))
  })

  it.each([['en'], ['zh-TW']] as const)('P13: a later run held again after a held one (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    const held = await holdDatabase()
    try {
      await pressClearPastDeleteBound(wrapper, gate)
      expect(sentence(wrapper, 'raw-error')).toContain('another tab still has it open')

      await pressClearPastDeleteBound(wrapper, gate)

      // The second delete queues behind the first, still held; only the request at the head
      // of the queue is told it is blocked, so this one gives up on time alone.
      expect(sentence(wrapper, 'raw-error')).toContain('within the time limit')
      expect(sentence(wrapper, 'body')).toBe(body)
      expect(sentence(wrapper, 'report-heading')).toBe(heading)
      expect(sentence(wrapper, 'report-hint')).toBe(hint)
      expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
    } finally {
      held.close()
    }
    // Released, every queued delete goes through before the next test starts.
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))
  })
})

describe('session gate truth: runs that end on the sweep, and a run in flight', () => {
  it.each([['en'], ['zh-TW']] as const)('P6: a later run in flight says only that nothing is confirmed (%s)', async (locale) => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))
    const held = await holdDatabase()
    try {
      await wrapper.get('[data-session-gate-clear]').trigger('click')
      await vi.waitFor(() => expect(held.deleteRequested()).toBe(true))

      expect(sentence(wrapper, 'body')).toBe(UNCONFIRMED[locale].body)
      expect(sentence(wrapper, 'report-heading')).toBeNull()
      expect(sentence(wrapper, 'raw-error')).toBeNull()
      expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: null, dismiss: null })
    } finally {
      held.close()
    }
    // Released, the run completes on its own sweep, which the draft no longer blocks.
    await vi.waitFor(() => expect(navigations).toEqual(['/']))
  })

  it.each([['en'], ['zh-TW']] as const)('P9: a later run whose sweep failed again (%s)', async (locale) => {
    const { body, heading, hint } = SWEEP_FAILED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(async () => {
      await pressClearAndSettle(wrapper, gate)
      await pressClearAndSettle(wrapper, gate)
    })

    expect(await indexedDB.databases()).toEqual([])
    expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')
    expect(sentence(wrapper, 'raw-error')).toBe('injected: removeItem refused')
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: null, dismiss: EXIT[locale].dismiss })
  })

  it.each([['en'], ['zh-TW']] as const)('P14: a held first run, then a later run whose sweep failed (%s)', async (locale) => {
    const { body, heading, hint } = SWEEP_FAILED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    const held = await holdDatabase()
    try {
      await pressClearPastDeleteBound(wrapper, gate)
      expect(sentence(wrapper, 'raw-error')).toContain('another tab still has it open')
    } finally {
      held.close()
    }
    // The first run's request was queued, not cancelled; released, it goes through.
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))

    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))

    expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')
    expect(sentence(wrapper, 'raw-error')).toBe('injected: removeItem refused')
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: null, dismiss: EXIT[locale].dismiss })
  })
})

describe('session gate truth: a later run starts with the database again (T15)', () => {
  it('deletes the database again after a sweep failure, rather than retrying only the sweep', async () => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate('en')

    // F1 stays in place for both runs: if the later run went straight to the sweep, it
    // would fail there again and record a sweep failure.
    await withSweepFailing(async () => {
      await pressClearAndSettle(wrapper, gate)
      expect(gate.clearFailurePhase.value).toBe('sweep')

      const held = await holdDatabase()
      try {
        await pressClearPastDeleteBound(wrapper, gate)

        // The later run asked for the database to be deleted, and stopped there.
        expect(held.deleteRequested()).toBe(true)
        expect(gate.clearFailurePhase.value).toBe('delete')
        expect(sentence(wrapper, 'raw-error')).toContain('another tab still has it open')
        expect(localStorage.getItem(NOTE_DRAFT)).toBe('a draft the previous learner typed')
      } finally {
        held.close()
      }
    })
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))
  })
})

describe('session gate truth: a refused press adds a notice and keeps the earlier report', () => {
  it.each([['en'], ['zh-TW']] as const)('P10: after a sweep failure (%s)', async (locale) => {
    const { body, heading, hint } = SWEEP_FAILED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))
    const before = await indexedDB.databases()
    const earlierError = sentence(wrapper, 'raw-error')
    const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase')

    await pressRefused(wrapper)

    // Nothing was sent to the database by this press.
    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(await indexedDB.databases()).toEqual(before)

    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(sentence(wrapper, 'retry-hint')).toBe(RETRY_HINT[locale])
    expect(noticeFollowsReport(wrapper)).toBe(true)
    expect(sentence(wrapper, 'raw-error')).toBe(earlierError)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: null, dismiss: EXIT[locale].dismiss })
  })

  it.each([['en'], ['zh-TW']] as const)('P10b: after a first delete that timed out (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withDeleteNeverSettling(() => pressClearPastDeleteBound(wrapper, gate))
    const earlierError = sentence(wrapper, 'raw-error')
    expect(earlierError).toContain('within the time limit')
    const before = await indexedDB.databases()
    const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase')

    await pressRefused(wrapper)

    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(await indexedDB.databases()).toEqual(before)
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(heading)
    expect(sentence(wrapper, 'report-hint')).toBe(hint)
    expect(sentence(wrapper, 'retry-hint')).toBe(RETRY_HINT[locale])
    expect(noticeFollowsReport(wrapper)).toBe(true)
    expect(sentence(wrapper, 'raw-error')).toBe(earlierError)
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })

    // The same state on the site root (T29p): presented, with the same report and exits.
    const root = await mountGateOnly(locale, false)
    expect(sentence(root, 'report-heading')).toBe(heading)
    expect(sentence(root, 'retry-hint')).toBe(RETRY_HINT[locale])
    expect(exitsOnScreen(root)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })

  it.each([['en'], ['zh-TW']] as const)('P10c: after a later delete that was held (%s)', async (locale) => {
    const { body, heading, hint } = UNCONFIRMED[locale]
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { gate, wrapper } = await mountRealGate(locale)
    await withSweepFailing(() => pressClearAndSettle(wrapper, gate))
    const held = await holdDatabase()
    try {
      await pressClearPastDeleteBound(wrapper, gate)
      const earlierError = sentence(wrapper, 'raw-error')
      expect(earlierError).toContain('another tab still has it open')
      const before = await indexedDB.databases()
      const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase')

      await pressRefused(wrapper)

      expect(deleteDatabase).not.toHaveBeenCalled()
      expect(await indexedDB.databases()).toEqual(before)
      expect(sentence(wrapper, 'body')).toBe(body)
      expect(sentence(wrapper, 'report-heading')).toBe(heading)
      expect(sentence(wrapper, 'report-hint')).toBe(hint)
      expect(sentence(wrapper, 'retry-hint')).toBe(RETRY_HINT[locale])
      expect(noticeFollowsReport(wrapper)).toBe(true)
      expect(sentence(wrapper, 'raw-error')).toBe(earlierError)
      expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })

      // On the site root too (T29p).
      const root = await mountGateOnly(locale, false)
      expect(sentence(root, 'retry-hint')).toBe(RETRY_HINT[locale])
      expect(exitsOnScreen(root)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
    } finally {
      held.close()
    }
    await vi.waitFor(async () => expect(await indexedDB.databases()).toEqual([]))
  })

  it.each([
    ['en', true], ['zh-TW', true], ['en', false],
  ] as const)('P11r: in a new document after a delete that timed out (%s, challenge page: %s)', async (locale, isChallengePage) => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const first = await mountRealGate(locale)
    await withDeleteNeverSettling(() => pressClearPastDeleteBound(first.wrapper, first.gate))
    first.wrapper.unmount()

    const { wrapper } = await inNewDocument(locale, isChallengePage)
    // The record the earlier document left is what this one starts from.
    expect(sessionStorage.getItem(CLEAR_STARTED_RECORD)).not.toBeNull()
    const before = await indexedDB.databases()
    const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase')

    await pressRefused(wrapper)

    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(await indexedDB.databases()).toEqual(before)
    expect(sentence(wrapper, 'body')).toBe(UNCONFIRMED[locale].body)
    expect(sentence(wrapper, 'report-heading')).toBeNull()
    expect(sentence(wrapper, 'report-hint')).toBeNull()
    expect(sentence(wrapper, 'raw-error')).toBeNull()
    expect(sentence(wrapper, 'retry-hint')).toBe(RETRY_HINT[locale])
    expect(exitsOnScreen(wrapper)).toEqual({ keep: null, reload: EXIT[locale].reload, dismiss: null })
  })

  it.each([
    ['en', 'This browser already holds saved work for these challenges — requests, notes and flag attempts. '
      + 'If the machine is shared, it may belong to whoever used it before you. '
      + 'Nothing is deleted unless you choose to delete it.', 'Continue with this work'],
    ['zh-TW', '這台瀏覽器裡已經存有這些題目的解題紀錄——請求、筆記與 flag 嘗試。'
      + '如果這是共用的電腦，那可能是前一位使用者留下的。'
      + '除非你選擇刪除，否則不會刪掉任何東西。', '沿用這些紀錄'],
  ] as const)('P12: a refused first run shows what it showed before (%s)', async (locale, body, keep) => {
    localStorage.setItem(NOTE_DRAFT, 'a draft the previous learner typed')
    const { wrapper } = await mountRealGate(locale)
    const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase')

    await pressRefused(wrapper)

    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(sentence(wrapper, 'body')).toBe(body)
    expect(sentence(wrapper, 'report-heading')).toBe(NOT_STARTED[locale].heading)
    expect(sentence(wrapper, 'report-hint')).toBe(NOT_STARTED[locale].hint)
    expect(sentence(wrapper, 'retry-hint')).toBeNull()
    expect(sentence(wrapper, 'raw-error')).toBeNull()
    expect(exitsOnScreen(wrapper)).toEqual({ keep, reload: null, dismiss: null })
  })
})

describe('session gate truth: copy invariant CI-1 on the changed sentences', () => {
  it.each([['en'], ['zh-TW']] as const)('the sweep-failure sentences contain no banned term (%s)', (locale) => {
    for (const text of Object.values(SWEEP_FAILED[locale])) expect(bannedTermsIn(text, locale)).toEqual([])
  })

  it.each([['en'], ['zh-TW']] as const)('the new unconfirmed hint contains no banned term (%s)', (locale) => {
    expect(bannedTermsIn(UNCONFIRMED[locale].hint, locale)).toEqual([])
  })

  it.each([['en'], ['zh-TW']] as const)('the retry notice contains no banned term (%s)', (locale) => {
    expect(bannedTermsIn(RETRY_HINT[locale], locale)).toEqual([])
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

  it('F3 hands the delete a real request that never settles, and only while installed', async () => {
    await withDeleteNeverSettling(async () => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME)
      expect(request).toBeInstanceOf(IDBRequest)
      let fired = false
      request.addEventListener('success', () => { fired = true })
      request.addEventListener('error', () => { fired = true })
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(fired).toBe(false)
      expect(request.readyState).toBe('pending')
    })

    // Restored: a real delete runs again.
    await seedDatabase([])
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    expect(await indexedDB.databases()).toEqual([])
  })

  it('F5 hands the delete a real request that fails with the injected error', async () => {
    const { useChallengePersistence } = await import('../../../.vitepress/theme/composables/useChallengePersistence')

    await withDeleteFailing(async () => {
      await expect(useChallengePersistence().deleteDatabase()).rejects.toThrow('injected: delete failed')
    })

    await seedDatabase([])
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
