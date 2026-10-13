<script setup lang="ts">
/**
 * The choice a learner is given when a new browser session finds work already stored
 * on this machine.
 *
 * On a shared machine — a classroom with restore-on-reboot cards, or without them —
 * the previous learner's requests, notes and flag attempts are simply there, and
 * nothing on the page says they are not yours.
 *
 * There is no default action, no countdown, and no way to dismiss the question itself.
 * Clearing cannot be undone and inheriting is merely awkward, so the two mistakes do not
 * cost the same and nothing advances until the learner picks one.
 *
 * The single exception is not an exception to that rule but a consequence of it: a clear
 * that stopped after the database delete has deleted the database the question was
 * about, and it withdraws continue while a retry, which runs the whole clear again, stops
 * at the sweep again for as long as its cause persists. Both answers are gone, so the
 * question is no longer answerable — and a question that cannot be answered and cannot be
 * closed is a locked door. That one report can be acknowledged,
 * which writes no marker and answers nothing.
 */
import { computed } from 'vue'
import { useSessionGate, shouldPresentGateHere, CLEAR_NOT_STARTED } from '../composables/useSessionGate'
import { withBase } from 'vitepress'

/**
 * Whether the page this is mounted beside is a challenge page.
 *
 * Passed in rather than worked out here, from the same `frontmatter.layout` value the
 * layout uses to decide which layout to render. Reading the route here instead would put a
 * second rule in a second place, and the two would disagree the first time a path shape
 * changed — a locale prefix, a base path — with the layout rendering a challenge and this
 * component believing otherwise.
 */
const props = defineProps<{ isChallengePage: boolean }>()

const { shouldAsk, clearError, clearFailurePhase, clearRefused, databaseDeleted, clearStarted, keepExistingData, clearEverything, dismissClearFailure } = useSessionGate()

/**
 * Whether to put anything on screen here.
 *
 * `shouldAsk` says this browser has something to be asked about; this says this page is
 * where the asking happens. The difference is the whole of this change: there is no
 * site-wide download or upload, so outside the challenges there is nothing of a previous
 * learner's for a visitor to act on.
 *
 * An unconfirmed clear overrides the page — see `shouldPresentGateHere`, which owns that
 * rule; this component holds no copy of it.
 */
const present = computed(() => shouldPresentGateHere(props.isChallengePage))

function goToRoot(): void {
  // The site root, not the current URL: the learner asked to start fresh and the root is
  // where a first-time visitor starts. The stored locale is not part of that reasoning any
  // more — it survives the clear — and the root is not a dead end for a clear that did not
  // confirm: the recovery renders on every page, this one included.
  window.location.assign(withBase('/'))
}

function onClear(): void {
  void clearEverything(goToRoot)
}

/**
 * The exit from a clear whose outcome is not known.
 *
 * The same full page load the successful path performs, for the same reason: the current
 * attack session lives in a closure inside `useAttackSession` and would be written back
 * on the next event. Here the deletion may still be queued, so that risk is live.
 *
 * It resolves nothing by itself. The record that a clear was started is in
 * `sessionStorage` and outlives this load, so the choice that comes back still withholds
 * continue — the load is how the learner leaves a report they cannot otherwise close,
 * not a way to answer the question.
 */
function onReload(): void {
  goToRoot()
}

/**
 * Whether the reported failure is that a first clear never began.
 *
 * Its own branch because nothing was requested on that path: no deletion is queued, the
 * stored work really is untouched, and continuing with it is still exactly true — so the
 * report has to say that rather than borrow the sentence for an outcome nobody knows. A
 * refusal after an earlier run never reaches it: that run's report stays, with the retry
 * notice beneath, because its delete may still be queued.
 */
const clearNotStarted = computed(() => clearError.value === CLEAR_NOT_STARTED)
</script>

<template>
  <!--
    `role="dialog"` without `aria-modal`, and a backdrop that does not take the pointer.
    Three layers can each say whether the page behind is still available — the
    accessibility tree, the focus order, and hit-testing — and they have to agree.

    The gate is rendered beside the layout rather than in place of it: no focus trap,
    nothing behind it is `inert`. So `aria-modal="true"` would tell a screen-reader user
    the page had gone while a keyboard user could still Tab into it.

    Dropping that claim is only half of it, and the missing half points the other way. A
    `fixed inset-0` element takes every click across the whole viewport by default, so
    without the two rules below the pointer user is the one being lied to: ARIA and the
    focus order say the page behind is there, and every attempt to reach it lands on the
    backdrop instead. `pointer-events-none` here and `pointer-events-auto` on the card
    make the three layers say the same thing.

    Both tokens are load-bearing and in opposite directions — the `none` alone passes
    the learner's own answer through as well, leaving neither button pressable — which is
    why the tests assert them separately.
  -->
  <div
    v-if="present"
    data-session-gate
    role="dialog"
    :aria-label="$t('session_gate.title')"
    class="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center p-4 bg-[rgba(0,0,0,0.55)]"
  >
    <div
      data-session-gate-card
      class="pointer-events-auto max-w-[32rem] w-full rounded-xl border border-[var(--ch-border)] bg-[var(--ch-bg-card)] p-6 color-[var(--ch-text-1)]"
    >
      <h2 data-session-gate-title class="m-0 mb-2 text-[1.15em] font-semibold">{{ $t('session_gate.title') }}</h2>
      <!--
        Three bodies, because the standing one stops being true the moment a clear is
        started, and stops being true in a different way once a run's delete has resolved
        and only its sweep failed.

        "Nothing is deleted unless you choose to delete it" is false from the instant the
        delete request exists — it neither fails nor completes while another tab holds the
        database, and the bound on it does not cancel it. "This site's database in this
        browser has been deleted" is equally false there, because nobody knows yet. So the
        middle state gets its own sentence rather than borrowing either neighbour's.

        The half the latest started run failed in is read first, because it is the only
        fact about that run: `databaseDeleted` stays true for the whole document once any
        delete has resolved, so after a sweep failure a later run whose delete is held
        still has it set, and reading it first claimed a deletion nobody can vouch for.
        Then `clearStarted` (a run began and was not confirmed), then the flag (a delete
        resolved in this document), then the standing question — the order of the
        selection rules in the spec's traceability file.
      -->
      <p data-session-gate-body class="m-0 mb-4 text-[0.9em] color-[var(--ch-text-2)] leading-relaxed">
        <template v-if="clearFailurePhase === 'sweep'">{{ $t('session_gate.body_cleared') }}</template>
        <template v-else-if="clearFailurePhase === 'delete' || clearStarted">{{ $t('session_gate.body_unconfirmed') }}</template>
        <template v-else-if="databaseDeleted">{{ $t('session_gate.body_cleared') }}</template>
        <template v-else>{{ $t('session_gate.body') }}</template>
      </p>

      <!--
        Shown after a clear that did not finish, and after a press refused because the
        start record could not be written. The choice deliberately stays on screen:
        reloading here would hand the learner a page that still holds the previous
        learner's work while telling them it had been cleared.

        Which failure, not merely that one happened. The clear has two halves and they
        leave the machine in different states: a delete that did not finish — held by
        another tab, out of time, or rejected for some other reason — may still go through
        later, since giving up on it does not cancel it, so nobody can say what is left;
        while a sweep that failed ran after the delete resolved — the database is already
        gone, no tab is holding anything, and closing tabs cannot make a `localStorage`
        write succeed. One message for both was false in every clause on the second path,
        and it named the only remedy on screen knowing it could not work.

        The report follows the error, in order: a first run that never started has its
        own report — only a first run, since a refusal after an earlier run leaves that
        run's error in place; then the half the latest started run failed in, not whether
        some delete ever resolved in this document — a later run whose delete is held after
        an earlier sweep failure is a delete that did not finish, whatever the flag says;
        every other error falls through to the unconfirmed report, the one that claims
        least. With no error there is no report, and the box holds the refusal notice
        alone.
      -->
      <div
        v-if="clearError || clearRefused"
        data-session-gate-error
        role="alert"
        class="mb-4 px-3 py-2 rounded-lg border border-[var(--ch-border)] bg-[var(--ch-bg-soft)]"
      >
        <template v-if="clearError">
          <template v-if="clearNotStarted">
            <p data-session-gate-report-heading class="m-0 text-[0.85em] font-semibold">{{ $t('session_gate.clear_not_started') }}</p>
            <p data-session-gate-report-hint class="m-0 mt-1 text-[0.8em] color-[var(--ch-text-2)]">{{ $t('session_gate.clear_not_started_hint') }}</p>
          </template>
          <template v-else-if="clearFailurePhase === 'sweep'">
            <p data-session-gate-report-heading class="m-0 text-[0.85em] font-semibold">{{ $t('session_gate.sweep_failed') }}</p>
            <p data-session-gate-report-hint class="m-0 mt-1 text-[0.8em] color-[var(--ch-text-2)]">{{ $t('session_gate.sweep_failed_hint') }}</p>
          </template>
          <template v-else>
            <p data-session-gate-report-heading class="m-0 text-[0.85em] font-semibold">{{ $t('session_gate.clear_unconfirmed') }}</p>
            <p data-session-gate-report-hint class="m-0 mt-1 text-[0.8em] color-[var(--ch-text-2)]">{{ $t('session_gate.clear_unconfirmed_hint') }}</p>
          </template>
          <p v-if="!clearNotStarted" data-session-gate-raw-error class="m-0 mt-1 text-[0.75em] opacity-70 font-mono">{{ clearError }}</p>
        </template>
        <!--
          The refusal notice. A press refused after an earlier run adds it beneath whatever
          that run left, and replaces none of it: that run's report is still the truth about
          this browser, and its delete may still be queued. In a new document there may be no report
          above it at all, only the record that a run was started; then this stands alone.
        -->
        <p v-if="clearRefused" data-session-gate-retry-hint class="m-0 mt-2 text-[0.8em] color-[var(--ch-text-2)]">{{ $t('session_gate.clear_retry_not_started_hint') }}</p>
      </div>

      <!--
        Two buttons, styled alike. Neither takes `autofocus` and neither is drawn as
        the primary one — a visually louder button is a default in everything but name.

        Continue is withdrawn from the moment a clear is started (`clearStarted`);
        `databaseDeleted` is read as well, as a second guard, though in every state where
        this choice is on screen with the flag set `clearStarted` is set too. Withdrawn,
        not greyed out: a disabled control leaves the offer written on screen and refuses
        to honour it, and the offer is the untrue part once a delete may be queued or the
        database it would continue with is gone. Clear stays, because it is the same action
        already begun and retrying the whole site-wide clear, starting with the database,
        is truthful.
      -->
      <div class="flex flex-wrap gap-3">
        <button
          v-if="!databaseDeleted && !clearStarted"
          data-session-gate-keep
          type="button"
          class="ch-view-btn flex-1 min-w-[10rem] py-2"
          @click="keepExistingData()"
        >{{ $t('session_gate.keep') }}</button>
        <button
          data-session-gate-clear
          type="button"
          class="ch-view-btn flex-1 min-w-[10rem] py-2"
          @click="onClear()"
        >{{ $t('session_gate.clear') }}</button>
        <!--
          Rendered on exactly the state that has no other exit, and on no other. The
          condition is the one the handler guards on, not a paraphrase of it: a report is
          on screen AND the latest run failed in the sweep, so its delete resolved and no
          delete issued before it is still pending. Wherever the latest delete did not
          finish it may still go through, and closing the report would let the learner
          carry on as if it had, with the attack session in memory saved back once it
          lands; there the way out is reload, which drops that session, never this. The
          flag alone is not the test: it stays set through a later run whose delete is held.

          Placed after the two answers and not among them, and worded as acknowledging the
          report rather than as a third answer, because it is not one: it writes no marker
          and the next cold load asks again.
        -->
        <!--
          The unconfirmed state's way out. Not the dismiss button below: that one leaves
          this page in place, and here the deletion may still be queued, so the attack
          session held in a closure would be written back on the next event. It writes no
          decision marker and resolves nothing — the started record outlives the load and
          the choice comes back still withholding continue. The refusal notice counts as a
          report here: in a new document it can stand alone over a delete an earlier
          document left queued, and reload is still the only way out of that.
        -->
        <button
          v-if="(clearError || clearRefused) && clearStarted && clearFailurePhase !== 'sweep'"
          data-session-gate-reload
          type="button"
          class="ch-view-btn flex-1 min-w-[10rem] py-2"
          @click="onReload()"
        >{{ $t('session_gate.reload') }}</button>
        <button
          v-if="clearError && clearFailurePhase === 'sweep'"
          data-session-gate-dismiss
          type="button"
          class="ch-view-btn flex-1 min-w-[10rem] py-2"
          @click="dismissClearFailure()"
        >{{ $t('session_gate.dismiss') }}</button>
      </div>
    </div>
  </div>
</template>
