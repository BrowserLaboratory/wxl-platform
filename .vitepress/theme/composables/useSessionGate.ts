import { ref, readonly, computed, onMounted, getCurrentInstance, type Ref } from 'vue'
import { useChallengePersistence } from './useChallengePersistence'
import { listClearableLocalStorageKeys, listLearnerEvidenceKeys } from './localStorageKeys'

/**
 * Marks that this browser session has answered the gate.
 *
 * `sessionStorage` and not a timestamp: it is emptied when the tab closes and kept
 * across a reload, which is exactly "the same person is still sitting here". Every
 * clock-based rule gets this wrong in both directions at once — a break between
 * classes and a trip to the corridor occupy the same span of minutes.
 */
export const GATE_STORAGE_KEY = 'wxl-session-gate'

/** The marker's value. Its presence is what counts; the value makes it readable. */
export const GATE_DECIDED = 'decided'

/**
 * Marks that a clear was started in this browser session and has not confirmed success.
 *
 * A second key rather than a value on the decision marker, because the two say opposite
 * things to the detection: the decision marker stops the gate asking, and an unconfirmed
 * clear is exactly the case that needs it to keep asking.
 *
 * `sessionStorage`, for the same reason the decision marker uses it — it dies with the
 * tab and survives a reload, which is the shape of "the same person is still here". In
 * `localStorage` an unconfirmed clear would follow the machine forever.
 *
 * It exists because the one way out of an unconfirmed clear is a full page load, and
 * every ref in this file dies with the document. Without a record that outlives the load,
 * the reloaded page offers to continue with work that a queued deletion is still on its
 * way to removing — which is the offer this whole rule withdraws.
 */
export const CLEAR_STARTED_STORAGE_KEY = 'wxl-clear-started'

/** The started-record's value. Its presence is what counts. */
export const CLEAR_STARTED = 'started'

/**
 * What the learner has answered this browser session, if anything.
 *
 * - `undecided` — the choice is on screen and nothing has happened.
 * - `not-needed` — already answered this session, or there was nothing to ask about.
 * - `kept` — carry on with the stored work.
 * - `dismissed` — a clear that stopped after the delete had its report acknowledged.
 *   Not an answer to the question: no marker is written, so the next cold load asks
 *   again. It exists because that state has no other way out — see
 *   `dismissClearFailure`.
 * - `cleared` — everything local was deleted and the page is being reloaded.
 *
 * The locale redirect reads this: it must not run while the choice is open, because
 * the preference it reads is one of the values that is about to be deleted. Every
 * value other than `cleared` leaves the page in place and therefore releases it;
 * `cleared` is the one that does not, because a full page load is already coming.
 */
export type GateDecision = 'undecided' | 'not-needed' | 'kept' | 'dismissed' | 'cleared'

/**
 * Why progress and flag submission are unavailable, for the surfaces that have to say so.
 *
 * Not a sixth `GateDecision`. The five decisions each name something that has already
 * happened; `checking` names the absence of any of them, and folding it in would make
 * every reader of `GateDecision` — the write guards, the fast path, the surfaces — decide
 * for itself whether the new value counts as `undecided`.
 *
 * `checking` is not a shorter `undecided`. The wait on the database has no time limit, so
 * it can be the state a learner is looking at, and the sentence written for `undecided`
 * points at a choice that is not on screen yet. An instruction that cannot be followed is
 * worse than none.
 */
export type ProgressBlockReason = 'checking' | 'undecided' | null

/**
 * Module-level, not per-call.
 *
 * The gate is one question asked once per browser session, and two components are
 * involved in it: the site layout, which defers the locale redirect until it is
 * answered, and the dialog, which answers it. Per-call state would give them separate
 * copies, so the dialog's answer would never reach the layout and the redirect would
 * wait forever.
 */
const shouldAskState = ref(false)
const clearErrorState = ref<string | null>(null)
const decisionState = ref<GateDecision>('undecided')

/**
 * Whether `evaluate` has reached any of its exits this page load.
 *
 * Initial value is the honest one: nothing has been checked yet. Read together with the
 * access predicate it separates "we have not looked" from "we looked and must ask" — two
 * states that deny access identically and call for opposite things from the learner.
 */
const evaluatedState = ref(false)

/**
 * Whether `deleteDatabase()` has resolved in this document.
 *
 * Set at the instant that call resolves, and not derived from which failure happened to be
 * recorded afterwards. The fact being tracked is exactly that: the database delete
 * resolved. It is not "the learner's work is gone" — a delete can resolve on a database
 * whose object stores held no learner rows, and the learner's work may live in
 * `localStorage`, which the sweep after it may fail to clear. Inferring the fact from a failure being present would
 * read a different fact that merely coincides with it today.
 *
 * Never reset within the document. A resolved delete cannot be undone, so a flag that
 * could go false again would describe an operation that does not exist; a new document
 * starts with it false, and a retry that succeeds replaces the page anyway.
 */
const databaseDeletedState = ref(false)

/**
 * Whether a clear has been started in this browser session and has not confirmed success.
 *
 * Set before the delete request is issued, not after it settles. `deleteDatabase` neither
 * fails nor completes while another connection holds the database open, and the bound
 * placed on it does not cancel the request — so from the instant the request exists there
 * is no moment at which anyone can say the stored work is still there. Keying the
 * withdrawal to the outcome leaves the offer standing across the whole in-flight window
 * and across every failure, which is where it was taken and where the work was then lost.
 *
 * Mirrors `CLEAR_STARTED_STORAGE_KEY`, and is restored from it by `evaluate` on every
 * later page load. Cleared only when a clear confirms success, at which point the
 * decision marker is written and the page is being replaced anyway.
 */
const clearStartedState = ref(false)

/**
 * Whether this page is where the choice gets presented.
 *
 * Two facts, deliberately kept apart. `shouldAskState` is about the BROWSER: something is
 * stored here and nobody has said what to do with it, and that is true on every page until
 * it is answered. This function is about the PAGE: the platform has no site-wide download
 * or upload, so outside the challenges there is nothing of a previous learner's that a
 * visitor can act on, and asking there makes every visitor answer a question about someone
 * else's work before they can read anything.
 *
 * Folding the page into `shouldAskState` instead was the alternative, and it loses the
 * first fact: "there is something to ask" would blink off and on as the learner navigates,
 * and the decision marker and the recovery would each have to re-derive it.
 *
 * The recovery from an unconfirmed clear overrides the page, and it has to: a clear
 * replaces the page with a load of the site root, which is not a challenge page. Confining
 * the recovery to challenge pages would put it out of reach from exactly where the learner
 * lands. `databaseDeleted` is the same state one step later — the delete returned and the
 * sweep threw — and it outlives `clearStarted`, which a successful clear forgets.
 *
 * Callers read this inside a `computed`, which is what makes it reactive: every ref it
 * touches is one of this module's own.
 */
export function shouldPresentGateHere(isChallengePage: boolean): boolean {
  if (!shouldAskState.value) return false
  return isChallengePage || clearStartedState.value || databaseDeletedState.value
}

/** Progress belongs to this visit only after accepting the stored work. */
export function isProgressAccessAllowed(): boolean {
  const decision = decisionState.value
  if (clearStartedState.value || databaseDeletedState.value || readClearStarted()) return false
  return readMarker() !== null || decision === 'kept' || decision === 'not-needed'
}

export function useProgressAccess() {
  // Match server HTML during hydration; mounted updates patch real DOM attributes.
  const mounted = ref(!getCurrentInstance())
  if (!mounted.value) onMounted(() => { mounted.value = true })
  return computed(() => mounted.value && isProgressAccessAllowed())
}

/**
 * Why access is denied, or `null` when it is not.
 *
 * Same hydration guard as `useProgressAccess`, and for the same reason: the server has no
 * storage to consult, so it renders what an unevaluated client renders. Both sides agree
 * on `checking`, which is what the server has genuinely established.
 */
export function useProgressBlockReason() {
  const mounted = ref(!getCurrentInstance())
  if (!mounted.value) onMounted(() => { mounted.value = true })
  return computed<ProgressBlockReason>(() => {
    if (!mounted.value) return 'checking'
    if (isProgressAccessAllowed()) return null
    return evaluatedState.value ? 'undecided' : 'checking'
  })
}


/**
 * Set while a delete request issued from here is outstanding.
 *
 * Not a published fact and not reactive: nothing renders it. It exists so a second press
 * of clear cannot start a second run, because the two would share `clearError` and the
 * first failure would put an exit on screen while the other run was still going.
 */
let clearInFlight = false

/**
 * The reported reason when a clear could not be started at all.
 *
 * A sentinel rather than a message, because the surface that renders it needs to pick a
 * sentence in the reader's language, and because it names a state rather than describing
 * one failure of it.
 */
export const CLEAR_NOT_STARTED = 'clear-not-started'

function readMarker(): string | null {
  try {
    return sessionStorage.getItem(GATE_STORAGE_KEY)
  } catch {
    // Private browsing, a blocking setting, a thrown SecurityError. Treated as absent,
    // which means the learner is asked. Asking twice is a nuisance; skipping the
    // question because storage misbehaved hands the previous learner's work over.
    return null
  }
}

function readClearStarted(): boolean {
  try {
    return sessionStorage.getItem(CLEAR_STARTED_STORAGE_KEY) !== null
  } catch {
    // Same direction as `readMarker`: unreadable is treated as absent. The cost lands on
    // the learner being offered continue again after a reload, which is the limit noted
    // in `markClearStarted` — there is no second storage to fall back to that would not
    // fail the same way.
    return false
  }
}

/**
 * Record that a clear is being started, and report whether the record will survive.
 *
 * Written and then read back, because a write that appeared to succeed and a store that
 * kept nothing look identical from here — a full `sessionStorage`, a private window, a
 * browser setting. The caller needs the answer, not the attempt: without a durable record
 * the withdrawal lasts only as long as this document, and the one way out of an
 * unconfirmed clear is a full page load. The next page would offer to continue with work
 * a queued deletion is still on its way to removing, which is the whole defect again.
 */
function markClearStarted(): boolean {
  clearStartedState.value = true
  try {
    sessionStorage.setItem(CLEAR_STARTED_STORAGE_KEY, CLEAR_STARTED)
    return sessionStorage.getItem(CLEAR_STARTED_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function forgetClearStarted(): void {
  clearStartedState.value = false
  try {
    sessionStorage.removeItem(CLEAR_STARTED_STORAGE_KEY)
  } catch {
    // Nothing to do, and nothing is lost that matters: the decision marker is written in
    // the same step, so the gate does not ask again this session anyway.
  }
}

function writeMarker(): void {
  try {
    sessionStorage.setItem(GATE_STORAGE_KEY, GATE_DECIDED)
  } catch {
    // Nothing to do about it, and nothing is lost that matters: the gate will ask
    // again on the next page load, which is the safe direction.
  }
}

/**
 * The choice offered on a shared machine when a new browser session finds work already
 * stored locally.
 *
 * Nothing here happens on its own. There is no default action, no countdown, and
 * ignoring the choice changes nothing — clearing cannot be undone and inheriting is
 * merely awkward, so the two mistakes do not cost the same and nothing may advance on
 * the learner's behalf.
 */
/**
 * Whether this browser session has already answered, read synchronously.
 *
 * Separate from `evaluate` so the common path — the marker is there, the gate has
 * nothing to do — costs no await at all, and the locale redirect keeps running in the
 * same tick it always did.
 */
export function hasGateDecision(): boolean {
  return readMarker() !== null && !readClearStarted() && !clearStartedState.value && !databaseDeletedState.value
}

export function useSessionGate() {
  const { deleteDatabase, hasAnyStoredData } = useChallengePersistence()

  const shouldAsk: Readonly<Ref<boolean>> = readonly(shouldAskState)
  /** What the learner answered, or that there was nothing to answer. */
  const decision: Readonly<Ref<GateDecision>> = readonly(decisionState)
  /** Why the last clear failed, or `null`. Rendered beside the choice, which stays up. */
  const clearError: Readonly<Ref<string | null>> = readonly(clearErrorState)
  /**
   * Whether the database delete has resolved in this document.
   *
   * The choice can outlive that delete: the localStorage sweep runs afterwards, it can
   * fail, and the failure keeps the choice on screen. The clear cannot be taken back from
   * the moment the delete resolved, so "continue with this work" is no longer an offer the
   * platform can honour, and the surface rendering the choice must stop making it. What the flag does
   * not say is whether the database held anything, or whose it was.
   */
  const databaseDeleted: Readonly<Ref<boolean>> = readonly(databaseDeletedState)
  /**
   * Whether a clear has been started this browser session and has not confirmed success.
   *
   * The surface rendering the choice reads this to withdraw the continue action and to
   * pick the text describing what this browser holds. `databaseDeleted` still decides
   * between the two reports and outranks this one when both are true: a deletion that
   * completed is the fact that settles the question this one leaves open.
   */
  const clearStarted: Readonly<Ref<boolean>> = readonly(clearStartedState)

  /**
   * Wraps the evaluation so that every exit records that it happened.
   *
   * A `finally` and not a line before each `return`: the inner function has five exits
   * including a `catch`, and the one that would be forgotten is the one that matters most
   * — storage that refuses to answer is a conclusion, not a check still running.
   */
  async function evaluate(): Promise<void> {
    try {
      await runEvaluation()
    } finally {
      evaluatedState.value = true
    }
  }

  async function runEvaluation(): Promise<void> {
    // Restored before anything else decides what to show. This runs on every page load
    // where the choice could appear, which is the only place the record has to be read
    // back: the one exit from an unconfirmed clear is a full page load, and the ref that
    // carried the withdrawal died with the previous document.
    if (readClearStarted()) clearStartedState.value = true

    // An unfinished clear needs a recovery action even when deletion left no learner data.
    // It also outranks a stale decision marker written by a previous page.
    if (clearStartedState.value) {
      shouldAskState.value = true
      decisionState.value = 'undecided'
      return
    }

    // Once unfinished clearing is excluded, a marker skips both learner-data checks.
    if (readMarker() !== null) {
      shouldAskState.value = false
      decisionState.value = 'not-needed'
      return
    }

    let hasData: boolean
    try {
      // Both subsystems, because the clear empties both. localStorage first: it is
      // synchronous, so the common "there is something here" answer costs no await, and
      // it is exactly the residue an unopenable database leaves behind — an
      // `indexedDB.open` blocked by another tab stays pending until the time limit while
      // the note drafts and the learner's saved Repeater requests sit here untouched.
      // Asking the object stores alone let the gate delete work it never asked about.
      //
      // `listLearnerEvidenceKeys` and not `listOwnedLocalStorageKeys`: ownership is the
      // clear's question, not this one. The platform writes the locale from `enhanceApp`
      // on every cold load of a localised path, before this runs, and the panel keys are
      // written at their panels' setup at fixed defaults. Asking on the strength of those
      // told a brand-new visitor, on a machine holding nothing, that this browser already
      // held saved work — and offered only to inherit it or to delete it.
      hasData = listLearnerEvidenceKeys().length > 0 || (await hasAnyStoredData())
    } catch {
      // Unreadable is unknown, not empty. Either subsystem refusing to answer leaves the
      // question open, and the answer to an open question here is to ask: asking twice
      // is a nuisance, skipping the question because storage misbehaved hands the
      // previous learner's work to the next person. The marker is deliberately not
      // written — "we could not look" must never harden into "there was nothing there".
      shouldAskState.value = true
      decisionState.value = 'undecided'
      return
    }

    if (!hasData) {
      // The other place that dismisses the choice without the learner answering it, and
      // it needs the same guard as `keepExistingData` for the same reason. After a delete
      // that succeeded and a sweep that did not, the object stores really are empty, so a
      // re-run of this check would find nothing, write the marker, and take the failure
      // report off the screen — recording an answer to a question nobody answered, over
      // residue that is still there.
      if (databaseDeletedState.value) return
      // Nobody to ask about. Record the decision so the check does not repeat on every
      // page of this visit.
      writeMarker()
      shouldAskState.value = false
      decisionState.value = 'not-needed'
      return
    }

    shouldAskState.value = true
    decisionState.value = 'undecided'
  }

  function keepExistingData(): void {
    // There is nothing left to continue with. Once the delete has resolved the stored
    // work is gone and cannot be brought back, so answering "continue" would write the
    // session marker over a clear that never finished: the choice would disappear, the
    // learner would be told nothing more, and an unknown amount of the previous learner's
    // localStorage would still be on the machine. The surface rendering the choice
    // withdraws the offer; this refuses it, because a guard that lives only in the markup
    // is a guard the next caller does not have.
    if (databaseDeletedState.value) return
    // The second refusal, and the one that covers the longer window. A clear that has
    // been started put the stored work beyond knowing the moment its delete request was
    // issued: the request neither fails nor completes while another tab holds the
    // database, and the bound on it does not cancel it. Continuing from here would
    // promise work that a queued deletion is still on its way to removing, and the
    // measured run of exactly that sequence is why this guard exists.
    if (clearStartedState.value) return
    writeMarker()
    shouldAskState.value = false
    decisionState.value = 'kept'
  }

  /**
   * Acknowledge the report of a clear that stopped after the delete, and let the page go.
   *
   * The one state with no other way out. A sweep that threw leaves `databaseDeleted` set,
   * and from there `keepExistingData` refuses, the markup withdraws that button, a retry
   * throws at the same line for the same reason, and `evaluate` returns early on the same
   * flag. Nothing moves `decision` off `undecided`, so the deferred locale redirect —
   * which waits on it — never runs: the learner sits behind a report they cannot close,
   * on the wrong locale tree, until they reload the whole page by hand.
   *
   * Two guards, because the trapped state is the conjunction of two facts and each guard
   * reads exactly one of them. `clearError` is the report being acknowledged, and there is
   * nothing to acknowledge without one. `databaseDeleted` is what removed the other exits:
   * on the delete-failed path nothing was destroyed, continue is still on screen and still
   * honoured, so the question is live and answerable and this must not stand in for an
   * answer. Neither fact implies the other, so neither guard covers for the other.
   *
   * No marker is written, and that is the whole difference between this and an answer.
   * The question — whose work is this — was never answered; the clear stopped half way and
   * an unknown amount of the previous learner's `localStorage` is still on the machine. A
   * marker would make the next cold load of this browser session silent about residue that
   * is still there. Asking again is the safe direction, and the same direction every other
   * unwritten-marker path in this file takes.
   */
  function dismissClearFailure(): void {
    if (clearErrorState.value === null) return
    if (!databaseDeletedState.value) return
    shouldAskState.value = false
    decisionState.value = 'dismissed'
  }

  /**
   * Delete every local trace and reload.
   *
   * `reload` is passed in rather than called here so the caller decides where the page
   * lands — the site root, because the learner asked to start fresh and the root is where
   * a first-time visitor starts. The stored locale is no longer part of that reasoning:
   * it survives the clear, so the page the reload lands on is still in the language that
   * was on screen.
   *
   * A full page load and not an in-place update: the current attack session lives in a
   * closure variable inside `useAttackSession`, so it survives the database being
   * deleted and the next save would write it straight back.
   */
  async function clearEverything(reload: () => void): Promise<void> {
    // One clear at a time. Two overlapping runs share `clearError`, so the first to fail
    // reports over a second that is still in flight, and the exit offered on the strength
    // of that report would navigate away from a delete still running in this document.
    if (clearInFlight) return
    clearErrorState.value = null

    // Before the request, not after it settles. Everything from here on is a state in
    // which nobody can say whether the stored work is still there, and that includes the
    // seconds this call is awaiting.
    //
    // And only if the record is durable. A delete issued without one leaves the learner
    // one page load away from being offered work that is on its way out — the request
    // outlives the document, the withdrawal does not. Not issuing it keeps the two facts
    // in step: nothing was requested, so nothing is pending, so continuing really is
    // still true and the offer stays.
    if (!markClearStarted()) {
      clearStartedState.value = false
      clearErrorState.value = CLEAR_NOT_STARTED
      return
    }

    clearInFlight = true
    try {
      await deleteDatabase()
    } catch (err: unknown) {
      // The choice stays up carrying the reason. Removing the local keys now would
      // leave half a clear — the locale gone, the previous learner's sessions still
      // there — and reloading would show a page that still holds their work.
      clearErrorState.value = err instanceof Error ? err.message : String(err)
      clearInFlight = false
      return
    }
    clearInFlight = false

    // Between the two halves, because only the first is irreversible. From here the
    // learner's stored work is gone whatever the sweep does, so continuing with it stops
    // being something this platform can offer. Recorded on the fact that the delete
    // returned, not on which failure follows: the failed-delete path above leaves
    // everything intact, and continuing there is still exactly true.
    databaseDeletedState.value = true

    try {
      // The one declaration `evaluate` also reads, and not a scan written here. A list of
      // key names written at this call site is exactly how the two came apart before: it
      // named the two keys that existed when it was written, and the editor settings and
      // the learner's saved Repeater requests were added later and survived a clear that
      // reported success.
      //
      // Wider than what `evaluate` asks about, deliberately. The gate asks only about keys
      // whose presence proves a learner acted; the clear removes the previous learner's
      // panel state and saved requests too, because that is their residue and a key left
      // behind is a key the next learner inherits. So the clear can take a key the gate
      // never asked about — never the reverse, which is the direction that loses work.
      //
      // And narrower than ownership by exactly the keys the declaration exempts. The
      // locale is the one: both the platform and the learner write it, with the same kind
      // of value, so removing it returns nothing of anybody's work and restarts the next
      // learner in a language nobody chose. That exemption is declared per key beside the
      // key, not decided here — this loop has no opinion about which keys it is given.
      for (const key of listClearableLocalStorageKeys()) localStorage.removeItem(key)
    } catch (err: unknown) {
      // The same policy as the failed delete above, for the same reason. The keys are
      // listed before any is removed, but the removals are separate calls: a throw part
      // way through leaves some gone and the rest in place, and an unknown amount left
      // behind is not none. The choice stays up carrying the reason, no marker is
      // written, and nothing reloads. Half a clear is not a clear.
      clearErrorState.value = err instanceof Error ? err.message : String(err)
      return
    }

    forgetClearStarted()
    writeMarker()
    shouldAskState.value = false
    // Set before the reload so anything watching the decision sees `cleared` and does
    // not start a navigation of its own on the way out.
    decisionState.value = 'cleared'
    reload()
  }

  const evaluated: Readonly<Ref<boolean>> = readonly(evaluatedState)

  return { shouldAsk, clearError, databaseDeleted, clearStarted, decision, evaluated, evaluate, keepExistingData, clearEverything, dismissClearFailure }
}
