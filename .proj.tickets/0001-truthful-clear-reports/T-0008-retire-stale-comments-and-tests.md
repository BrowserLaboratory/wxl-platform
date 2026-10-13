---
id: T-0008
title: Retire stale gate comments and tests
epic: 0001-truthful-clear-reports
status: done
blocked_by: [T-0007]
---

## Context

Spec T38 and T39 list every test and comment location (at `72327e2`) that states a retired claim. Earlier
tickets update the locations they touch; this ticket checks the whole list once behaviour is final.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Every location in T38 asserts the behaviour of a named T row or is deleted as unreachable, and no
location in T38 or T39 states a retired claim.

## Acceptance criteria

- [x] Each T38 location is checked and recorded in the ticket's Comments as asserted (with its T row) or deleted (unreachable) (AC-11).
- [x] Each T39 location is checked; none states a retired claim; any that states a selection rule matches `traceability.md` (AC-12).
- [x] Full unit suite and site smoke pass.

## 給使用者（zh-TW）

最後比對一次：spec 列出的每一處舊測試、舊註解，都已經改成新規則或因為走不到而刪掉；沒有任何一處還寫著
「旗標代表作品已刪」「重試只補失敗的那一半」之類的舊說法。

## Comments

### 2026-10-13 — test plan table (approved by the user before the first change)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| — | no new behaviour tests: the ticket changes no behaviour, only comments, test comments and test names; no assertion changes | — | — | changing an assertion is out of scope and goes back to the user |
| S1 composable, S2 component (mocked) | each T38 location recorded as asserted (with its T row) or deleted (unreachable); all expected to be asserted | Comments table | AC-11 | a mocked state must be one the real composable reaches (`databaseDeleted` implies `clearStarted` until a successful clear) |
| — | each T39 location recorded as free of retired claims, or as changed and to what; a stated selection rule matches the order in `traceability.md` | Comments table | AC-12 | the five retired claims checked one by one |
| full suite | `pnpm vitest run`, `pnpm build`, `pnpm test:smoke`, `pnpm test:challenges`, `verify-project.py`, `vue-tsc` (baseline 100 errors), one at a time | regression | AC 3 | test count identical before and after |
| — | a keyword sweep for the retired claims over the composable, the component, `index.ts` and the three test files, recorded | evidence | AC-11, AC-12 | "the database is gone" is a true statement about the database, not a retired claim |

No mutation check: no assertion is added or changed, so there is nothing to mutate.

Candidate locations found before the change (current line numbers): B1 `useSessionGate.ts` 49, 51-52 (`cleared` and the locale
preference, which the clear now exempts); B2 `index.ts` 120-123 (T-0006 security I-1); B3 `clearInFlight` doc (T-0003 security C2);
B4 `useSessionGate.ts` 432-437 (T-0005 Spec 11); B5 452-453 and B8 581-583 (T-0006 Spec F11); B6 478; B7 569-571 (T-0003
Standards F8); B9 `SessionGate.vue` 209-213; A1 `useSessionGate.test.ts` 460-462, 657-661; A2 `SessionGate.test.ts` 394-397.
The guard at `useSessionGate.ts` 438 is not dead code (it holds between a successful clear's `forgetClearStarted` and the
reload), so only its comment changes.


The last sentence above was wrong: see the stage 6 table (Standards F1, Spec F3) and stage 7 (C1). No path reaches the
guard with the flag set today (`evaluate` runs once per document, at mount, before any clear), and no test reaches it; it
is kept as a defence in depth.

### 2026-10-14 — AC-11: each T38 location (line numbers at `72327e2`)

No location is deleted: every state the locations set up is one the real composable reaches (`databaseDeleted` implies
`clearStarted` until a successful clear forgets its start record). Earlier tickets renamed or rewrote most of them; this
ticket changed only test comments, no assertion and no test name. T rows are the ones each test's assertions check.

| File @ `72327e2` | Lines | Then | Now | Disposition |
|---|---|---|---|---|
| `SessionGate.test.ts` | 11-14, 36-55, 72-82 | mock refs, mocked module, reset | same, with `clearFailurePhase` and `clearRefused` (T-0003, T-0007) | asserted: the inputs of the selection rules; the mocked `shouldPresentGateHere` is the "Presented off challenge pages" rule. Changed here: the flag's comment said it alone "decides whether continuing is still something to offer" (claim 4); now one of two facts, beside `clearStarted` |
| | 113-140 | section comment; "each action calls …"; "offers a way past the report only once the delete has destroyed the work"; "offers no way past a delete that destroyed nothing" | section comment; same; "offers a way past the report after a run that stopped at the sweep"; "offers reload, not a way past, after a first delete that did not finish"; "… after a later delete that did not finish (K4)" | asserted: T11 (P0); T21, T12 (P4); T19, T13 (P2); T24, T13 (P7). Changed here: the section comment said a retry "stops there again" unconditionally (claim 2); now "while its cause persists" |
| | 151-156 | "offers no way past a clear that is still running" | "offers no way past an unanswered choice with nothing yet attempted"; "offers no way past a later run that is still running" | asserted: T17 with the Dismiss rule (P0); T23, T13 (P6) |
| | 165 | "the way past calls the composable and answers nothing itself" | same | asserted: T12 |
| | 221-240 | "reports a delete that could not be confirmed as unknown, in both directions" | same | asserted: T19 |
| | 251-270 | "offers a full page load …"; "reports a clear that never began …" | same; "reports a first clear that never began as not started, and keeps continue" | asserted: T19 (reload column, P2); T29, T11 (P12) |
| | 286-327 | "a completed deletion outranks a started clear when both are true"; "reports a failed sweep as its own failure …"; "withdraws the continue offer once the stored work has been deleted" | "reports a later delete that did not finish as unconfirmed, whatever the flag says"; "reports a sweep failure by its phase, with both flags set"; "reports a failed sweep as its own failure …"; "withdraws the continue offer once the database has been deleted" | asserted: T24; T21; T21; T11a with T21's body. The outranking claim (4) went with the old test in T-0005. Changed here: the last test's comment names the `clearStarted`-only case |
| | 456-463 | "renders the report away from the challenge pages after the delete succeeded" | same | asserted: "Presented off challenge pages" rule in P4 (both flags set), T21's dismiss column |
| `useSessionGate.test.ts` | 454-470 | section comment "no stored work left for 'continue with this work' to mean"; helper `reachStoredWorkGone` | section comment; helper `reachDeletedDatabase` (P4) | asserted through the tests that use it (T1, T7, T11a, T12); the helper reaches P4 with the real composable. Changed here: the section comment (claim 1) |
| | 472 | "records that the stored work is gone once the delete has resolved" | "records that the database is gone once the delete has resolved" | asserted: T1 |
| | 484 | "continuing after the stored work is gone changes nothing" | "continuing after the database is gone changes nothing" | asserted: T11a |
| | 529 | "a later check does not dismiss the choice by itself once the stored work is gone" | "… once the database is gone" | asserted: P4 under a re-run of `evaluate` (gate stays, no marker, decision `undecided`); no T row names a re-run, the nearest is T21's gate column. Changed here: its comment said the setup reached the `!hasData` branch; `evaluate` returns on `clearStarted` first |
| | 551-552 | "acknowledging the report releases the page …" | same | asserted: T12. Changed here: "returns early on the same flag" (claim 4) now names `clearStarted` |
| | 570-573 | "acknowledging does nothing on a deletion that never happened" | "acknowledging does nothing after a first run whose delete did not finish" | asserted: T13 (P2) |
| | 612-618 | "acknowledging does not overwrite the outcome of a clear that finished" | same | asserted: T29s (P15) with the Dismiss rule (no error) |
| `unconfirmed-clear-outcome.test.ts` | 171, 183-184 | "issues no delete request and keeps continue offered" | same, under "a first clear that cannot be recorded is not started at all" | asserted: T10b, T10g, T11 (P12). The name reads as general alone; the `describe` scopes it to a first run (round-2 K-5) |

Outside the T38 list, changed for the same reason: `useSessionGate.test.ts` "a failed clear leaves the local keys alone"
said "the locale would be gone" (the T-0003 F8 sentence); the locale is exempt, so the comment now names the Repeater
snapshots as the key that shows the sweep did not run.

### 2026-10-14 — AC-12: each T39 location

| File | Lines @ `72327e2` | What it is | Finding | Disposition |
|---|---|---|---|---|
| `useSessionGate.ts` | 44-49 | `GateDecision` | `dismissed` "a clear that stopped after the delete" (round-2 K-4) is compatible with the phase rule: only a sweep-phase report reaches it. `cleared` said "everything local was deleted"; the next paragraph gave the clear deleting the locale as the reason for the locale redirect's hold | changed (B1): `cleared` is a confirmed success; the hold is described in one place, `index.ts` (B2) |
| | 96-106 | private flag doc | rewritten in T-0001; no retired claim | unchanged |
| | 141-144 | `shouldPresentGateHere` doc | "`databaseDeleted` is the same state one step later … and it outlives `clearStarted`" (claim 4; T-0006 F11 "on presentation") | changed: the flag is a second guard; `clearStarted` is set in every state where the gate is asked to show |
| | 294-309 | public `databaseDeleted` and `clearStarted` docs | rewritten in T-0001 and T-0005; `clearStarted`'s states the body order of `traceability.md` | unchanged |
| | 378-383 | `evaluate` guard | "the object stores really are empty" (T-0005 Spec 11); the scenario it gave returns on `clearStarted` first (claim 4) | changed (B4): a defence in depth that no path reaches today; corrected again in stage 7 (C1) |
| | 398-404 | `keepExistingData` | "There is nothing left to continue with" (claim 1; T-0006 F11) | changed (B5) |
| | 418-433 | `dismissClearFailure` doc | rewritten in T-0006 and T-0007 to the Dismiss rule; "returns early on the same flag" left (claim 4) | changed (B6) |
| | 473-477 | start-record comment in `clearEverything` | "continuing really is still true and the offer stays" (claim 3) was scoped to a first run in T-0007 | unchanged |
| | 487-501 | failed-delete catch; flag assignment | "the locale gone" (T-0003 F8); "the failed-delete path above leaves everything intact, and continuing there is still exactly true" (claim 3; T-0006 F11) | changed (B7, B8); "may still go through" narrowed to a held or timed-out delete, since a delete rejected by an error event has ended |
| `SessionGate.vue` | 14-19 | file header | rewritten in T-0004 and T-0006 ("for as long as its cause persists") | unchanged |
| | 80-85 | `clearNotStarted` doc | scoped to a first run in T-0007 | unchanged |
| | 122-135 | body comment | rewritten in T-0005; states the order phase, `clearStarted`, flag, standing body, as `traceability.md` | unchanged |
| | 148-158 | report comment | rewritten in T-0004 and T-0005; states the Report rule | unchanged |
| | 185-189 | continue comment | withdrawal stated on the flag alone, retry "the half that failed" (claims 2, 4); the second was fixed in T-0004 | changed (B9): `clearStarted` withdraws; the flag is a second guard |
| | 205-211 | dismiss comment | rewritten in T-0006 to the Dismiss rule | unchanged |
| | 217-222 | reload comment | added in T-0006; no retired claim | unchanged |

Carried from earlier tickets: B2 `.vitepress/theme/index.ts` (T-0006 security I-1) now says the hold is not about the
preference (exempt) and that what it should guard while the choice is open is not settled; B3 the `clearInFlight` doc
(T-0003 security C2) now says it is set while this document awaits a delete, not that the request is outstanding.
T-0004's open continue and dismiss comments and test names, and T-0005 Spec 11's test sentence ("the work really is
gone"): no longer present, removed in T-0004–T-0007.

Phrase sweep after the change, over the composable, the component, `index.ts` and the three test files, for the five
retired claims (phrases, not single words: "work is gone", "stored work … gone", "really are", "half that failed", "at the
same line", "always keeps", "outranks", "alone decides", "the same flag", "locale gone", "everything intact", "nothing left
to continue", "about to be deleted", "is outstanding", run with `grep -i -E`): four hits, none a retired claim — a
negation (`useSessionGate.ts` "It is not 'the learner's work is gone'"), the old name's history in a test comment, the
stale decision marker that `clearStarted` outranks, and the URL deciding the locale. The single word "gone" (`grep -w`)
hits 25 lines; each is about the database, which a resolved delete does remove, about local keys, the two answers, a
layout or a page, or is a negation or a quoted old claim. Separately, `useSessionGate.ts` "where the work was then lost"
in the `clearStarted` doc is an account of the measured incident that motivated the record, kept.

### 2026-10-14 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 composable, S2 component (mocked) | unchanged assertions; 124 files, 2170 tests before and after | Not measured: no coverage provider (user decision, T-0001) | AC-11, AC-12 (tables above) | `useSessionGate.ts` `if (databaseDeletedState.value) return` in `evaluate` and the `!databaseDeleted` term of the continue `v-if` are reached by no test; the first by no path today (`evaluate` runs once, at mount), the second never alone. Adding tests is outside this ticket; recorded for T-0009 |
| S3 built site | `pnpm build`; `pnpm test:smoke` (18); `pnpm test:challenges` (4) | Not measured | AC 3 (unit suite and smoke) | — |
| Configuration and types | `python3 scripts/verify-project.py` PASS; `vue-tsc` 100 errors, the baseline (the one in `index.ts` at line 216 predates this change) | Not measured | — | — |

### 2026-10-14 — stage 6 code review

Two `harness-reviewer` subagents, Standards and Spec, over the uncommitted change against `9a73a16`. Both confirmed the
change is comments and ticket records only. All findings were within the ticket and changed no behaviour, so they were
fixed under the user's standing authorisation unless stated.

| Finding | Disposition |
|---|---|
| Standards F1, Spec F3: B4's comment gave the wrong window and reason; "not dead code" overstated; "finds no rows" restated the round-2 K-4 claim | Fixed, but the new reason (protecting `cleared` from a redirect racing the reload) was itself wrong; corrected in stage 7 (C1) |
| Standards F2, Spec F7: "the locale would be gone" in a test comment | Fixed (outside the T38 list, recorded under AC-11) |
| Standards F3, Spec F8: the keyword-sweep record could not be reproduced | Fixed: the sweep is recorded as a phrase sweep with its phrases, and the single word "gone" is accounted for |
| Standards F4: coverage table columns | Fixed: the workflow's five columns |
| Standards F5, Spec F15: "the one above" pointed at the wrong test | Fixed: names the test |
| Standards F6, Spec F15: the `evaluate` guard and `!databaseDeleted` are reached by no test | Recorded in the coverage table for T-0009; no test added (no new tests in this ticket) |
| Standards F7: "stays withdrawn once … `databaseDeleted`" implied a visible state held by the flag alone | Fixed: the flag is a second guard |
| Standards F8, Spec F13: history in comments, duplicated in two files; the hold left without a reason | Fixed: one description, in `index.ts`, stating what the hold is not about and that its purpose while the choice is open is not settled; the composable points there. The open question goes to T-0009 |
| Standards F9: "The sweep does not run:" followed by the reason not to reload | Fixed: both reasons stated |
| Standards F10: "its `clearStarted` returned above" | Fixed with B4 |
| Standards F11, Spec F14: long lines | Fixed: reflowed to the surrounding width |
| Standards F12: status went from `todo` to `review` | No change: it was set to `processing` before the first edit and to `review` before this review; the diff shows only the net change |
| Standards F13: "AC 3", two line-number bases, "test names" in the plan | No change to the approved plan's record; the tables above state their base (`72327e2`), and no test name changed |
| Spec F1: T38 `useSessionGate.test.ts` 454-470 mapped to the wrong test | Fixed: it is the section comment and the P4 helper |
| Spec F2: several T39 locations mapped to the wrong code | Fixed: the AC-12 table is rebuilt from `git show 72327e2` |
| Spec F4: T-0006 F11 "on presentation" not dispositioned | Fixed: `shouldPresentGateHere`'s doc (T39 141-144) |
| Spec F5: unconditional "stops there again on retry" (claim 2) | Fixed |
| Spec F6: the mock's flag comment said it alone decides continue | Fixed |
| Spec F9: "where the work was then lost" | Kept: an account of the measured incident; recorded under the sweep |
| Spec F10: "may still go through" applied to every rejected delete | Fixed in the lines this ticket wrote (B7, B8); B3 already said "a held delete"; the older dismiss doc says "may still go through" of a delete that "did not finish", left |
| Spec F11: T rows imprecise | Fixed: each test's assertions mapped to the row they check |
| Spec F12: candidate list missed a changed comment | No change to the plan record; the AC-11 table lists every change |
| Spec F16: round-2 P2 items and T-0005 Spec 11's test half not dispositioned | Fixed: K-4's `dismissed` sentence under AC-12; "the work really is gone" recorded as removed earlier; C-3 and V-5 are the T38 mapping itself, now rebuilt |
| Spec F17: "keeps continue offered" reads as general | No change: scoped by its `describe`; recorded under AC-11 |
| Spec F18: "Both answers are gone" beside clear always shown | No change: existing wording, qualified by "while its cause persists" |

### 2026-10-14 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0008.md`. One candidate pass, then an independent
false-positive pass over all six candidates, since the candidate reviewer had filtered its own; the parent checked
`index.ts` for `evaluate`'s single call site and the decision watcher; commit messages scanned. No confirmed security
defect; the change is comments and Markdown only. Fixed under the standing authorisation (in scope, no behaviour): C1 —
the `evaluate` guard's comment written in stage 6 claimed a protection that does not exist (the watcher stops on
`cleared`, and `evaluate` runs once, at mount); it now states a defence in depth that no path reaches today. C2, C4, C5:
wording made exact. C3 left (the hold's purpose goes to T-0009); C6 already recorded for T-0009. A note for the epic's chain
analysis: the guards' unreachability rests on `evaluate` running once per document.

### 2026-10-14 — stage 8 end-to-end

Surface: the Cloudflare Pages preview of `4374fc1`, in the Claude desktop app's Browser panel, one tab, zh-TW
`door-is-open` (the stored locale redirected there). The change has no behaviour, so the check is that the gate behaves as
on `main`:

- P0: a note draft planted and `sessionStorage` cleared, then a reload: the standing body; continue and clear; no report,
  dismiss or reload.
- P4: `Storage.prototype.removeItem` made to throw for `localStorage` in the page, then clear: the cleared body, the sweep
  report and hint, the raw error "injected: removeItem refused"; clear and dismiss, no continue or reload;
  `indexedDB.databases()` empty and the draft still there.
- P11a: a reload by hand: the unconfirmed body with no report; clear only; the start record in `sessionStorage`.
- P15: clear again (the fault gone with the reload): the page went to the site root and on to `/zh-TW/`; no gate; the draft
  removed, `wxl-locale` kept, the decision marker written, no database.
- FileHub: the challenge page with no gate, and the in-page browser's Go loaded the FileHub sign-in page.

### 2026-10-14 — landed

Squash-merged into `main` as `fb2091d` by the user, through pull request #9 of this repository; every check
on the pull request passed (test, build, prose-audit, site-smoke, challenge-verify, Cloudflare Pages). Status set
to `done`.
