import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, readonly } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'

// ─── Mock useSessionGate ──────────────────────────────────────────────────────
const shouldAsk = ref(false)
const clearError = ref<string | null>(null)
// True from the instant `deleteDatabase()` resolves. The clear has two halves and only
// the first is irreversible, so this is the fact that decides which sentences about the
// machine are still true — and whether continuing is still something to offer.
const databaseDeleted = ref(false)
// True from the instant the delete request is issued — before it settles, and for the
// rest of the browser session unless a clear confirms success. The offer to continue is
// keyed on this rather than on the outcome, because between the request and its outcome
// there is no moment at which the stored work is known to be there.
const clearStarted = ref(false)
const mockKeep = vi.fn()
const mockClear = vi.fn(async () => {})
const mockEvaluate = vi.fn(async () => {})
const mockDismiss = vi.fn()

// The component resolves the site root through VitePress. Nothing else in this file
// reaches it — the existing cases all stop at the mocked `clearEverything` — so it was
// never needed until an exit that navigates on its own was added.
vi.mock('vitepress', () => ({ withBase: (p: string) => p }))

// Which page the component was told it is on, recorded at the call. The rule itself —
// challenge page, or anywhere when a clear is unconfirmed — is `useSessionGate`'s and is
// tested there; what this file checks is that the component asks about the page it was
// given and renders what the answer says.
const presentedOn: boolean[] = []

vi.mock('../../../.vitepress/theme/composables/useSessionGate', () => ({
  GATE_STORAGE_KEY: 'wxl-session-gate',
  GATE_DECIDED: 'decided',
  CLEAR_NOT_STARTED: 'clear-not-started',
  shouldPresentGateHere: (isChallengePage: boolean) => {
    presentedOn.push(isChallengePage)
    if (!shouldAsk.value) return false
    return isChallengePage || clearStarted.value || databaseDeleted.value
  },
  useSessionGate: () => ({
    shouldAsk: readonly(shouldAsk),
    clearError: readonly(clearError),
    databaseDeleted: readonly(databaseDeleted),
    clearStarted: readonly(clearStarted),
    evaluate: mockEvaluate,
    keepExistingData: mockKeep,
    clearEverything: mockClear,
    dismissClearFailure: mockDismiss,
  }),
}))

import SessionGate from '../../../.vitepress/theme/components/SessionGate.vue'

function makeI18n(locale: 'en' | 'zh-TW') {
  return createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, 'zh-TW': zhTW } })
}

// A challenge page by default: that is where the choice is presented, so it is the state
// every existing case in this file was written against.
function mountGate(locale: 'en' | 'zh-TW' = 'en', isChallengePage = true) {
  return mount(SessionGate, {
    props: { isChallengePage },
    global: { plugins: [makeI18n(locale)] },
  })
}

beforeEach(() => {
  shouldAsk.value = false
  clearError.value = null
  databaseDeleted.value = false
  clearStarted.value = false
  mockKeep.mockClear()
  mockClear.mockClear()
  mockEvaluate.mockClear()
  mockDismiss.mockClear()
  presentedOn.length = 0
})

describe('SessionGate', () => {
  it('renders nothing until the gate says to ask', () => {
    const w = mountGate()
    expect(w.find('[data-session-gate]').exists()).toBe(false)
  })

  it('renders the choice when the gate says to ask', () => {
    shouldAsk.value = true
    const w = mountGate()
    expect(w.find('[data-session-gate]').exists()).toBe(true)
    expect(w.find('[data-session-gate-keep]').exists()).toBe(true)
    expect(w.find('[data-session-gate-clear]').exists()).toBe(true)
  })

  it('each action calls its own composable action and no other', async () => {
    shouldAsk.value = true
    const w = mountGate()

    await w.find('[data-session-gate-keep]').trigger('click')
    expect(mockKeep).toHaveBeenCalledTimes(1)
    expect(mockClear).not.toHaveBeenCalled()

    await w.find('[data-session-gate-clear]').trigger('click')
    expect(mockClear).toHaveBeenCalledTimes(1)
    expect(mockKeep).toHaveBeenCalledTimes(1)
  })

  // ─── The way out of the one state that has none ─────────────────────────────
  //
  // A clear that stopped after the database delete withdraws continue and fails again on
  // retry, so both answers are gone and the question is no longer answerable. The
  // condition is the conjunction of the two facts, and the three tests below pin each
  // corner of it: a single-fact condition renders this on a state that still has exits.

  it('offers a way past the report only once the database delete has resolved', () => {
    shouldAsk.value = true
    clearError.value = 'QuotaExceededError'
    databaseDeleted.value = true
    const w = mountGate()

    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(true)
    // The state this exists for: the other answer is not on screen either.
    expect(w.find('[data-session-gate-keep]').exists()).toBe(false)
  })

  it('offers no way past a delete that destroyed nothing', () => {
    // Continue is present and honoured here, so the question is live and answerable.
    // Rendering a dismissal would let it be walked away from with the previous
    // learner's work fully intact — the inheritance this dialog exists to prevent.
    shouldAsk.value = true
    clearError.value = 'blocked by another tab'
    databaseDeleted.value = false
    const w = mountGate()

    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(false)
    expect(w.find('[data-session-gate-keep]').exists()).toBe(true)
  })

  it('offers no way past an unanswered choice with nothing yet attempted', () => {
    shouldAsk.value = true
    clearError.value = null
    databaseDeleted.value = false
    const w = mountGate()

    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(false)
  })

  it('offers no way past a clear that is still running', () => {
    // The window between the two halves: the delete has resolved, so the database is gone,
    // but the sweep has not thrown and there is nothing yet to acknowledge. The dialog
    // is still up. A condition reading `databaseDeleted` alone puts a control here that
    // the handler refuses to honour — an offer written on screen and not kept, which is
    // the same defect the withdrawn continue button exists to avoid.
    shouldAsk.value = true
    clearError.value = null
    databaseDeleted.value = true
    const w = mountGate()

    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(false)
  })

  it('the way past calls the composable and answers nothing itself', async () => {
    shouldAsk.value = true
    clearError.value = 'QuotaExceededError'
    databaseDeleted.value = true
    const w = mountGate()

    await w.find('[data-session-gate-dismiss]').trigger('click')

    expect(mockDismiss).toHaveBeenCalledTimes(1)
    // Not an answer, and not a third one: neither answer's handler is reached.
    expect(mockKeep).not.toHaveBeenCalled()
    expect(mockClear).not.toHaveBeenCalled()
  })

  // Clearing cannot be undone and inheriting is merely awkward, so nothing may advance
  // on the learner's behalf: no preselected button, no timer, no dismissal that counts
  // as an answer.
  it('neither action is privileged over the other', () => {
    shouldAsk.value = true
    const w = mountGate()
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(2)
    for (const b of buttons) {
      expect(b.attributes('autofocus')).toBeUndefined()
      expect(b.attributes('data-default')).toBeUndefined()
    }
  })

  it('the choice runs no timer of its own', () => {
    shouldAsk.value = true
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    mountGate()
    // A countdown is the one way this could act without the learner. There is none.
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(setIntervalSpy).not.toHaveBeenCalled()
    setTimeoutSpy.mockRestore()
    setIntervalSpy.mockRestore()
  })

  it('collects no identifier', () => {
    shouldAsk.value = true
    const w = mountGate()
    // The gate answers "whose work is this" by offering to discard it, not by asking
    // the learner to name themselves. The platform holds no identity anywhere and this
    // is not where the first one appears.
    expect(w.findAll('input')).toHaveLength(0)
    expect(w.findAll('textarea')).toHaveLength(0)
    expect(w.findAll('select')).toHaveLength(0)
  })

  // This case used to assert that the report said "Nothing was deleted." and that the
  // continue action stayed. Both were false: the bound the platform puts on the delete
  // does not cancel the request, so a delete that passed it is still queued and completes
  // as soon as the blocking tab closes. The claim replaced here is that one, not the
  // presence of a report — the report is still asserted, and now in both directions.
  it('reports a delete that could not be confirmed as unknown, in both directions', () => {
    shouldAsk.value = true
    clearStarted.value = true
    clearError.value = 'challenge-tools could not be deleted: another tab still has it open'
    const w = mountGate()
    expect(w.find('[data-session-gate]').exists()).toBe(true)
    const failure = w.find('[data-session-gate-error]')
    expect(failure.exists()).toBe(true)
    expect(failure.text()).toContain('another tab')
    expect(w.text()).toContain(en.session_gate.clear_unconfirmed)
    expect(w.text()).toContain(en.session_gate.clear_unconfirmed_hint)
    // Neither of the two things that are not known. The old wording asserted one of them.
    expect(w.text()).not.toContain('Nothing was deleted')
    expect(w.text()).not.toContain(en.session_gate.sweep_failed)
    expect(w.text()).not.toContain(en.session_gate.sweep_failed_hint)
    // And the standing body, which says nothing is deleted unless the learner chooses to,
    // is gone too — it is the same false claim in the other paragraph.
    expect(w.text()).not.toContain(en.session_gate.body)
    expect(w.text()).toContain(en.session_gate.body_unconfirmed)
  })

  it('withdraws continue from the moment a clear is started, before it settles', () => {
    shouldAsk.value = true
    clearStarted.value = true
    const w = mountGate()
    expect(w.find('[data-session-gate-keep]').exists()).toBe(false)
    // The clear stays: closing the blocking tab makes a retry succeed.
    expect(w.find('[data-session-gate-clear]').exists()).toBe(true)
  })

  it('offers a full page load and no in-place exit while the outcome is unknown', async () => {
    shouldAsk.value = true
    clearStarted.value = true
    clearError.value = 'another tab still has it open'
    const w = mountGate()
    const reload = w.find('[data-session-gate-reload]')
    expect(reload.exists()).toBe(true)
    // The dismiss button leaves this page in place, and the queued deletion may still
    // land, so the attack session held in a closure would be written back.
    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(false)
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true, writable: true })
    await reload.trigger('click')
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('reports a clear that never began as not started, and keeps continue', () => {
    // The record of a started clear could not be persisted, so no delete request was
    // issued. Nothing is queued, the stored work really is untouched, and continuing
    // with it is still exactly true — so this is the one failure that keeps the offer.
    shouldAsk.value = true
    clearStarted.value = false
    clearError.value = 'clear-not-started'
    const w = mountGate()
    expect(w.text()).toContain(en.session_gate.clear_not_started)
    expect(w.text()).toContain(en.session_gate.clear_not_started_hint)
    expect(w.text()).not.toContain(en.session_gate.clear_unconfirmed)
    expect(w.text()).not.toContain(en.session_gate.sweep_failed)
    // The sentinel is a state name, not a message; showing it raw would be worse than
    // showing nothing.
    expect(w.text()).not.toContain('clear-not-started')
    expect(w.find('[data-session-gate-keep]').exists()).toBe(true)
    expect(w.find('[data-session-gate-reload]').exists()).toBe(false)
  })

  it('a completed deletion outranks a started clear when both are true', () => {
    shouldAsk.value = true
    clearStarted.value = true
    databaseDeleted.value = true
    clearError.value = 'sweep failed'
    const w = mountGate()
    // A retry that completed after an earlier attempt did not: the deletion having
    // completed is the fact that settles the question the other one leaves open.
    expect(w.text()).toContain(en.session_gate.sweep_failed)
    expect(w.text()).not.toContain(en.session_gate.clear_unconfirmed)
    expect(w.text()).toContain(en.session_gate.body_cleared)
    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(true)
    expect(w.find('[data-session-gate-reload]').exists()).toBe(false)
  })

  // The path the one shared message was false on. The sweep runs only after the delete
  // has resolved, so here the database is already gone, no tab is holding anything,
  // and closing tabs cannot make a `localStorage` write succeed — yet this state
  // rendered "Nothing was deleted" and told the learner to close their other tabs,
  // which was the only remedy the screen offered.
  it('reports a failed sweep as its own failure, never as the blocked delete', () => {
    shouldAsk.value = true
    databaseDeleted.value = true
    clearError.value = 'SecurityError: access denied'
    const w = mountGate()
    const failure = w.find('[data-session-gate-error]')
    expect(failure.exists()).toBe(true)
    expect(failure.text()).toContain('SecurityError')
    expect(w.text()).toContain(en.session_gate.sweep_failed)
    expect(w.text()).toContain(en.session_gate.sweep_failed_hint)
    // The other report, which this state must not borrow. Named through the key that
    // exists now: the old one was removed together with the claim it made, and asserting
    // `not.toContain(undefined)` would have been an assertion about nothing.
    expect(w.text()).not.toContain(en.session_gate.clear_unconfirmed)
    expect(w.text()).not.toContain(en.session_gate.clear_unconfirmed_hint)
  })

  // "Continue with this work" is an offer about a database that still exists. Past the
  // resolve of the database delete there is none, so the offer goes rather than being
  // greyed out — a disabled button leaves the sentence on screen and refuses to honour
  // it. Clear stays: retrying the whole site-wide clear is a real action.
  it('withdraws the continue offer once the database has been deleted', () => {
    shouldAsk.value = true
    databaseDeleted.value = true
    clearError.value = 'SecurityError: access denied'
    const w = mountGate()
    expect(w.find('[data-session-gate-keep]').exists()).toBe(false)
    expect(w.find('[data-session-gate-clear]').exists()).toBe(true)
    // And the body stops saying nothing is deleted unless you choose to, which the
    // report directly beneath it would otherwise contradict in the same breath.
    expect(w.text()).toContain(en.session_gate.body_cleared)
    expect(w.text()).not.toContain(en.session_gate.body)
  })

  it('shows no failure region when there is no failure', () => {
    shouldAsk.value = true
    const w = mountGate()
    expect(w.find('[data-session-gate-error]').exists()).toBe(false)
  })

  it('every visible string comes from i18n', () => {
    shouldAsk.value = true
    const enText = mountGate('en').text()
    const zhText = mountGate('zh-TW').text()
    // Same component, two locales, no shared visible text: anything hard-coded would
    // appear in both.
    expect(enText).toContain(en.session_gate.title)
    expect(zhText).toContain(zhTW.session_gate.title)
    expect(zhText).not.toContain(en.session_gate.title)
    expect(enText).not.toContain(zhTW.session_gate.title)
  })

  it('announces itself to assistive technology', () => {
    shouldAsk.value = true
    const w = mountGate()
    const gate = w.find('[data-session-gate]')
    expect(gate.attributes('role')).toBe('dialog')
  })

  // The gate is rendered beside the layout, with no focus trap and nothing `inert`
  // behind it, so a keyboard user can Tab straight past it into the page. Claiming
  // modality would hide that page from a screen reader alone — the one class of user
  // who could not check. The claim goes, not the page.
  it('does not claim to be modal', () => {
    shouldAsk.value = true
    const w = mountGate()
    const gate = w.find('[data-session-gate]')
    expect(gate.exists()).toBe(true)
    expect(gate.attributes('aria-modal')).toBeUndefined()
  })

  // Dropping `aria-modal` settled only the half a screen reader can see. A backdrop
  // covering the viewport takes every click by default, so on its own that change moved
  // the same false claim to the pointer user: the accessibility tree saying the page
  // behind is still reachable, and every click landing on the backdrop.
  it('lets pointer events reach the page behind it', () => {
    shouldAsk.value = true
    const w = mountGate()
    const gate = w.find('[data-session-gate]')
    expect(gate.exists()).toBe(true)
    expect(gate.classes()).toContain('pointer-events-none')
  })

  // The other direction, and it is not implied by the one above: a backdrop that passes
  // everything through passes the learner's own answer through too, and the choice
  // becomes unanswerable. The card takes pointer events back — below the root and not
  // at it, because re-enabling at the root re-enables the backdrop with it.
  it('keeps every control of the choice clickable inside that backdrop', () => {
    shouldAsk.value = true
    const w = mountGate()
    const gate = w.find('[data-session-gate]')
    const buttons = w.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) {
      const reenabled = b.element.closest('.pointer-events-auto')
      expect(reenabled).not.toBeNull()
      expect(reenabled).not.toBe(gate.element)
      expect(gate.element.contains(reenabled)).toBe(true)
    }
  })
})

/**
 * Where this component renders, which the layout tells it and it does not work out.
 *
 * The page kind comes in as a prop from the same `frontmatter.layout` value that decides
 * which layout renders, so the two cannot disagree about what a challenge page is. The
 * component's part is to ask about the page it was given — not to hold a second copy of
 * the rule, and not to read the route and reach a different answer from the layout that
 * mounted it.
 */
describe('SessionGate on pages that do not ask', () => {
  it('asks the gate about the page it was given', () => {
    shouldAsk.value = true
    // Cleared after the state change, not before it: components mounted by earlier cases
    // in this file are still alive and re-evaluate on that change, and their page kind
    // would otherwise be counted as this mount's.
    presentedOn.length = 0
    mountGate('en', false)
    expect(presentedOn).toContain(false)
    expect(presentedOn).not.toContain(true)
  })

  it('renders nothing on a page that is not a challenge page', () => {
    // The detection found something — `shouldAsk` is true — and this page still does not
    // put the question on screen. Without the first half this assertion would pass on an
    // empty machine and say nothing.
    shouldAsk.value = true
    const w = mountGate('en', false)
    expect(w.find('[data-session-gate]').exists()).toBe(false)
  })

  it('renders the choice on a challenge page', () => {
    shouldAsk.value = true
    const w = mountGate('en', true)
    expect(w.find('[data-session-gate]').exists()).toBe(true)
  })

  it('renders the recovery away from the challenge pages while a clear is unconfirmed', () => {
    // Clearing replaces the page with a load of the site root, which is not a challenge
    // page. A recovery that rendered only on challenge pages would be unreachable from
    // exactly where the learner lands.
    shouldAsk.value = true
    clearStarted.value = true
    const w = mountGate('en', false)
    expect(w.find('[data-session-gate]').exists()).toBe(true)
    // And with continue withdrawn, as on any other page in that state.
    expect(w.find('[data-session-gate-keep]').exists()).toBe(false)
  })

  it('renders the report away from the challenge pages after the delete succeeded', () => {
    shouldAsk.value = true
    databaseDeleted.value = true
    clearError.value = 'SecurityError: access denied'
    const w = mountGate('en', false)
    expect(w.find('[data-session-gate]').exists()).toBe(true)
    expect(w.find('[data-session-gate-dismiss]').exists()).toBe(true)
  })
})
