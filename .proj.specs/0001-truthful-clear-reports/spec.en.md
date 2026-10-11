# Spec 0001: truthful site-wide clear reports

Status: v3. Stage 3 passed with zero P0 in round 2 (`review/round-2.md`). v3 folds in the user's
rulings A1–A5 and the round-2 P1 findings; it is not re-reviewed. Source of
truth for every rule and row cited here: [`traceability.md`](traceability.md). Glossary: `CONTEXT.md`
(*session gate*, *site-wide clear*) and the glossary at the top of `traceability.md`.

## Problem Statement

On a shared machine, the session gate asks whether the stored work belongs to the person at the
keyboard and offers **Delete it and start fresh**, the site-wide clear. When a clear run stops part
way, the gate reports what happened. On three paths the report is false.

- **K2.** The database delete resolves and the local-value sweep then fails. The gate says the saved
  work "has already been deleted and cannot be brought back", although the database may have held no
  learner rows while the learner's only work, a note draft in `localStorage`, is still there.
  Reproduced on the production site on 2026-10-10 by making `removeItem` throw.
- **K3.** On the same path the gate gives that false statement as the reason continue is gone and the
  dismiss exit has appeared. Withdrawing continue is correct (a clear run was started); the reason on
  screen is not.
- **K4.** After a sweep failure the learner presses delete again, as the hint invites. The later run
  deletes the database first; if a connection that does not yield holds it, the delete is blocked.
  The gate still shows the sweep-failure wording ("closing other tabs does not remove them") beside
  the raw error "another tab still has it open", and offers to carry on in place while a deletion
  may be queued. Reproduced on the production site on 2026-10-10 with a second tab holding a native
  connection.

Severity: false reports on rare paths; no path loses data. The sweep can throw in real browsers only
through implementation-specific checks (for example Firefox with `dom.storage.enabled` turned off
while the page is open, Safari when the document is being detached) or extensions; the HTML Standard
defines no throwing step for `removeItem`, `key()` or `length`. K4 is rarer still: the site's own
connections close on `versionchange`, so another tab running the current code does not block the
delete. A tab still running code from before that handler existed, or any other connection that does
not yield, does.

The root cause: the gate records "the database delete resolved" and every sentence that reads it says
"the learner's work is gone". The guards that read the same state need exactly the fact it records;
only the sentences are wrong. The reports and exits also branch on that state alone, so a later
failure is reported as an earlier one. A refused run additionally erases the record that a deletion
may still be queued.

## Solution

The gate keeps recording when the database delete resolved, under a name that says so, and records
which half the latest started run failed in. What the learner sees follows from those facts:

- After a sweep failure the gate says the database was deleted and that some other values could not
  be removed, without claiming anything was in the database or whose it was. The hint says pressing
  delete again retries the whole site-wide clear.
- After a database delete that did not finish, on any run, the gate reports that the outcome could not
  be confirmed, offers the full-page reload as the exit, and gives a hint true for every kind of delete
  failure.
- A run refused because its start could not be recorded adds a notice beneath whatever an earlier run
  left and changes nothing else, so the earlier report stays readable and an exit that was unsafe before
  the press stays unavailable after it.
- Every changed sentence is pinned by a test that first establishes the machine state the sentence
  describes, then compares the literal text.

## User Stories

1. As a learner on a shared machine whose clear stopped after the database was deleted, I want the
   gate to say what was deleted without claiming my work was destroyed, so that I do not believe I lost
   work that is still on the machine.
2. As a learner whose later run is blocked, I want the gate to report the blocked deletion rather than
   the earlier sweep failure, so that the remedy it suggests is one that can work.
3. As a learner whose deletion may still be queued, I want the only exit offered to be a full page
   reload, so that I do not keep working on a page whose in-memory session could be written back.
4. As a learner whose deletion timed out or failed with no other tab open, I want the hint not to claim
   another tab is open, so that I am not sent looking for a tab that does not exist.
5. As a learner whose retry could not even start, I want to be told that nothing was deleted this time
   and how to fix it, without the gate forgetting what the earlier run left.
6. As a maintainer, I want each gate sentence this epic changes to be checked against the machine state
   it describes, so that rewriting it into a false sentence turns a test red.

## Implementation Decisions

**Gate state (seam S1, the object returned by the session gate composable).**

- `storedWorkGone` is renamed `databaseDeleted`; its semantics are unchanged (module-level, true from
  the moment a database delete resolves in this document, never reset within it). No alias; the old
  identifier disappears from the code and the tests. (T1–T4)
- New `clearFailurePhase`, module-level beside the error state, as defined in the glossary: `null`
  when a run starts, `'delete'` on any delete rejection, `'sweep'` when the sweep throws. (T5–T10)
- New `clearRefused`, module-level: true when a run with earlier state is refused, false when a run
  starts and in a new document. (T10d, T10e)
- **Deliberate change to current behaviour:** a refused run with earlier state changes neither
  `clearFailurePhase`, `clearStarted` nor the error; it only sets `clearRefused`. Today a refused run
  sets `clearStarted` to false and replaces the error. A refused first run (no earlier state) behaves as
  today, and continue stays offered. (T9, T10a–T10g)
- A press while a run is in flight is ignored and changes nothing (unchanged). (T10c)
- Continue and dismiss are enforced by the composable as well as mirrored by the template, using the
  rules in `traceability.md`. A later run still deletes the database before the sweep. Progress access
  stays denied while either flag is set or the question is unanswered. (T11–T16a)

**What the gate shows (seam S2, the gate component rendered against the real composable).** The body,
report, raw error line, continue, reload, dismiss and off-challenge-page presentation follow the
selection rules table in `traceability.md`, evaluated in order. In short: the report follows the
latest started run's phase; a refused run with earlier state adds the retry hint beneath that report;
reload appears when an error or a refusal notice is on screen, a run was started and the latest phase is
not `'sweep'`; dismiss appears only when an error is on screen and the latest phase is `'sweep'`; any
error the rules do not name falls through to the unconfirmed report, which offers no dismiss.
(T17–T29s)

**Copy.** Five strings, in both locales, exactly as in the copy table of `traceability.md`: four
rewritten (`body_cleared`, `sweep_failed`, `sweep_failed_hint`, `clear_unconfirmed_hint`) and one new
(`clear_retry_not_started_hint`, added beneath the earlier report whenever a refused run had earlier
state). None contains a banned term (CI-1). The unchanged strings that presuppose
saved work, including the title, are an explicit trade-off (CI-2); on the two paths where the gate asks
without detected evidence the presupposition is unbacked, which is existing behaviour tracked by a new
open question. The new strings use *site-wide clear* (全站清除) where
they name the action, following `CONTEXT.md`.

**Comments and tests.** Every comment and test location listed in T38 and T39 is brought in line with
these rules. The list is fixed at `72327e2`; locations that move during implementation are followed.

**Glossary.** `CONTEXT.md` gains *site-wide clear* (stage 1), defined conceptually so that preferences
the key declaration keeps are excluded. Its 新造詞 declaration is removed in the same change that first
ships 全站清除 in an interface string, so the glossary test stays green. (T43)

**Open questions.** OQ-003 stays open and lists exactly what this epic pins by literal comparison;
OQ-001 records that its revisit condition was met and the result of the re-check; two new entries record
the in-memory write-back and the fixed gate sentences presupposing saved work, with evidence inline.
(T40–T42, T44)

## Testing Decisions

A good test here observes behaviour from outside the gate: the state the composable exposes, the text
and controls the component renders, and the page in a real browser. It does not assert private helpers
or call order.

- **S1, composable.** Extend the existing composable tests with the rows T1–T16a. Prior art: the
  composable's own test file and the unconfirmed-clear test file.
- **S2, truth tests (new seam).** Mount the gate component with the real composable and the real
  persistence layer over fake-indexeddb. Reach each state with exactly the faults listed for it
  (F1–F6). Each truth test first asserts the preconditions in the truth matrix, reading the database only in
  the ways `traceability.md` allows, then compares each rendered sentence with a literal string written
  in the test by exact equality, in en and zh-TW. Every S2 test, not only the truth rows, compares this
  way. Fault replacements for the delete are real `IDBRequest` instances, and each fault is removed
  right after the press it targets. Expected text
  is never imported from the message files, so editing a message file into a false sentence turns a
  test red. CI-1 is checked against the same literals. Prior art: fake-indexeddb flows in the
  meaningful-stored-work tests; storage stubs restored in `finally` in the unconfirmed-clear tests.
- **S3, built site.** Two Playwright cases in the site smoke suite against the production build, English
  locale, challenge page `door-is-open`: T36 (K2) and T37 (K4). The second page's blocking connection is
  a native one opened by `page.evaluate`, so it does not yield; that page first goes to the site root. Sentences are compared with `toHaveText`,
  never `toContainText`. Only T37 waits out the delete bound.
  Prior art: the gate-scope smoke spec, which plants evidence with `addInitScript`.
- Timing follows the note under Faults in `traceability.md`.
- The existing routing tests for the gate component stay, with the mock gaining `clearFailurePhase` and `clearRefused`,
  and the cases listed in T38 rewritten.

## Out of Scope

- In-memory write-back after a sweep failure or between the marker and the reload (T41).
- Session gate copy outside the five strings above, and the remainder of OQ-003.
- Distinguishing blocked, timed-out and other delete rejections in the hint.
- A run that keeps failing with an *other* rejection: the reload exit leads back to the same gate.
  Recorded, not changed.
- The clear button staying visible while a run is in flight (a press is ignored), and the sweep-failure
  sentence being true of the exempt locale key even on success. Existing behaviour, recorded.
- A refused run that keeps being refused: the reload exit leads back to a gate whose clear is refused
  again, until the tab is closed. Recorded, not changed.
- A new document that cannot read the start record (for example storage turned off while the page was
  open) treats the machine as untouched. Existing limit, recorded.
- A first-run refusal whose start record was written but could not be read back leaves that record for
  the next load. Existing behaviour, recorded.
- Forks that customised the gate component must follow the rename; noted for the release notes.
- Masking and accessibility of the gate (OQ-002).
- User guides: they do not quote the changed strings. Aligning their wording with *site-wide clear* is
  separate work.

## Further Notes

- K2 and K4 were reproduced on the production deployment of `72327e2`, driven from an external browser (not the challenge
  page's Browser panel), with the
  sweep failure injected and, for K4, a native connection held by a second tab. The natural-trigger
  analysis is from specifications and browser source code, not from a measured run.
- Stage 8 verifies on the Cloudflare Pages preview of the ticket branch.

## Acceptance Criteria

- **AC-1** `databaseDeleted` behaves as T1–T3, and `git grep storedWorkGone -- .vitepress tests` finds
  nothing. (T1–T4)
- **AC-2** `clearFailurePhase`, `clearStarted`, `clearRefused` and the error are set, kept and reset
  exactly as T5–T10g.
- **AC-3** Continue, dismiss, a later run and progress access behave as T11–T16a, enforced by the
  composable as well as the template.
- **AC-4** In every state of T19–T29p except the AC-8 rows, the body and the presentation follow the
  selection rules.
- **AC-5** In the same states, the report and raw error line follow the selection rules.
- **AC-6** In the same states, continue, reload and dismiss follow the selection rules.
- **AC-7** Tests at seam S2 cover T30–T35c: each asserts its preconditions, then each sentence by exact
  equality with literal strings in en and zh-TW; the five changed strings equal the copy table; none
  contains a banned term.
- **AC-8** P0, P1, P11a, P11b, P12 and P15 show what they show at `72327e2`. (T17, T18, T28, T29,
  T29s)
- **AC-9** In the built site, T36 shows the literal English strings, dismiss, and no continue.
- **AC-10** In the built site, T37 shows the literal English strings and reload, and no dismiss.
- **AC-11** Every test location in T38 asserts the behaviour of a named T row or is deleted as
  unreachable, and none states a retired claim.
- **AC-12** No comment location in T39 states a retired claim, and each that states a selection rule
  states the rule in `traceability.md`.
- **AC-13** `OPEN-QUESTIONS.md` records T40, T41, T42 and T44 with the content those rows name.
- **AC-14** `CONTEXT.md` defines *site-wide clear* as T43 states, and the glossary test passes after the
  new strings ship. (T43)
