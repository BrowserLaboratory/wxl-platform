---
id: T-0005
title: Body and report follow the failure phase (K4 wording)
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0003, T-0004]
---

## Context

K4: after a sweep failure, a later run whose delete is blocked is still reported with sweep-failure wording.
G5/G7: the report follows the latest started run's phase, and the unconfirmed hint must be true for blocked,
timed-out and other rejections.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Body and report follow the selection rules for every state where a delete did not finish (P2, P3, P3x, P7,
P8, P13) and where the sweep failed (P4, P5, P9, P14). The new `clear_unconfirmed_hint` ships.

## Acceptance criteria

- [x] Body and report rows T19–T25 match the selection rules (AC-4, AC-5); the raw error line follows its rule.
- [x] New `clear_unconfirmed_hint` ships exactly, en and zh-TW, no banned term.
- [x] Truth rows T32 (blocked, native connection, `versionchange` and raw-error preconditions), T33, T33x (fault replacements are real `IDBRequest` instances) and T35p pass.
- [x] Exits are not changed in this ticket beyond what existing rules already show; T-0006 owns them.
- [x] Comment and test locations stating that the flag decides or outranks the report are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with a native blocking connection in a second tab.

## 給使用者（zh-TW）

修 K4 的說法：刪除沒完成時（被擋住、逾時、其他失敗，不論第幾次），畫面一律走「結果無法確認」那組，
提示改成兩種情況都成立的新句子；不再在刪除被擋住時顯示掃除失敗的話。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S2 truth, real composable, fake-indexeddb | P7, en and zh-TW: F1 then a held native connection (F2) on the later run; preconditions: the handle saw `versionchange`, the raw error contains "another tab still has it open", after closing the handle the database is no longer listed; literal `body_unconfirmed`, `clear_unconfirmed`, new `clear_unconfirmed_hint`; no `sweep_failed_hint` | rendered gate | T32, T24 | the delete bound is crossed with fake `setTimeout`/`clearTimeout` only |
| S2 | P3 and P8, en and zh-TW: F3 (a real `IDBRequest` that fires nothing); raw error contains "within the time limit"; the same three literals | rendered gate | T33, T20, T25 | P8 after F1 |
| S2 | P3x, en and zh-TW: F5 (a real `IDBRequest` that fires `error`); raw error carries the injected error; the same three literals | rendered gate | T33x, T20 | — |
| S2 | P2, P6, P9, P13, P14: each state's defining fault; body and report per T19, T23, T22, T25 | rendered gate | T35p | P14: P2, release the handle, then F1 |
| S2 | new `clear_unconfirmed_hint` has no banned term, both locales | literals | T35c | CI-1 |
| S2 harness | F3 and F5 helpers, each with a self-test; restored in `finally` | test helper | T33, T33x | fake-indexeddb `IDBRequest` instances |
| routing (mocked composable) | the mock gains `clearFailurePhase`; cases that say the flag decides the report are rewritten; flag with phase `'delete'` → unconfirmed report; phase `'sweep'` → sweep report | rendered gate | AC-4, AC-5, T38 subset | — |
| review | comments that say `databaseDeleted` decides or outranks the report now state the selection rules of `traceability.md` | comments | T39 subset | exits stay for T-0006 |

Stated with the approval: the S2 rows assert body, report and raw error only, not the exit buttons. On P7 the
existing rule still shows dismiss, which the spec makes wrong; T-0006 changes the exits, and asserting them
here would pin the wrong behaviour.

### 2026-10-11 — red → green log

1. Harness: the F3 and F5 self-tests (one per helper, written together) were red with `withDeleteNeverSettling is not a function`.
   Green: both replace `indexedDB.deleteDatabase` on the current factory with one returning a real `IDBRequest`
   (fake-indexeddb's global); F5 fires `error` carrying the injected `DOMException` on `request.error`. fake-indexeddb's
   event target accepts only its own events, and the package's main entry exports only the version-change event, so
   F5 dispatches that with type `error`. A first version imported it from a subpath without types and raised `vue-tsc`
   to 101; corrected to the main entry, back to 100.
2. T32 (P7), en and zh-TW: red. The preconditions held (the handle saw `versionchange`, the raw error said another tab
   held it), and the body read "This site's database … has been deleted": K4 on screen. Green: body and report
   follow `clearFailurePhase` before `clearStarted` and the flag. The new `clear_unconfirmed_hint` then failed alone
   and went green when the copy shipped. The 5-second bound is crossed with fake `setTimeout`/`clearTimeout`
   only (`pressClearPastDeleteBound`).
3. Routing tests: two cases went red ("a completed deletion outranks a started clear", and the sweep report keyed
   on the flag). They are rewritten as T38 asks: a flag set with phase `'delete'` gives the unconfirmed report; a sweep
   failure is reported by its phase. The mock gained `clearFailurePhase`.
4. T33 (P3, P8), T33x (P3x) and T35p (P2, P6, P9, P13, P14), en and zh-TW, passed on first run, since the
   routing was already in place. P13 first failed on my precondition: the second delete queues behind the held
   first one and only the head of the queue is told it is blocked, so its reason is the time limit. The
   precondition was corrected; the code is unchanged.
5. Mutation check: putting the flag back in front of the phase (body and report) turned T32, P8, P6 and the routing
   K4 case red, 7 tests in all; restored.
6. CI-1 for the new hint passed on first run; the checker's own self-tests show it flags the banned terms.
7. T39 subset: the body and report comments in `SessionGate.vue` and the `clearStarted` docstring in
   `useSessionGate.ts` now state the order of the selection rules instead of "`databaseDeleted` outranks".

### 2026-10-11 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S2 delete not finished | P7 (T32), P3 and P8 (T33), P3x (T33x), P2 and P13 (T35p), en and zh-TW | Not measured: no coverage provider (user decision, T-0001) | T19, T20, T24, T25, T32, T33, T33x, T35p | exits are asserted by T-0006 |
| S2 sweep failed | P9, P14 (T35p), with P4 and P5 from T-0004 | Not measured (same reason) | T21, T22, T35p | — |
| S2 in flight | P6 (T35p) | Not measured (same reason) | T23 | — |
| S2 CI-1 | new `clear_unconfirmed_hint`, both locales | Not measured (same reason) | T35c | `clear_retry_not_started_hint` is T-0007's |
| S2 harness | F3, F5 self-tests; `pressClearPastDeleteBound` exercised by every bound-crossing test | Not measured (same reason) | T33, T33x | — |
| routing (mocked) | phase `'delete'` with the flag set; phase `'sweep'` with both flags | Not measured (same reason) | AC-4, AC-5, T38 subset | — |

### 2026-10-11 — verification

Surface: the local checkout (vitest on happy-dom with fake-indexeddb) and a local production build (Playwright), run
one at a time.
- vitest: 124 files, 2,143 tests passed. `pnpm build` ok. Site smoke 17/17, challenges 4/4. `verify-project.py` PASS.
- `vue-tsc --noEmit`: 100 errors, unchanged, none in the touched files (after the import correction in step 1).

### 2026-10-11 — stage 6 review and fixes

Two independent `harness-reviewer` passes over the captured diff against `origin/main`. No high-severity
finding. The selection of body and report follows the traceability rules in order; `clear_unconfirmed_hint`
matches the copy table character for character in both locales. In-scope fixes were applied under the user's
standing approval and reported afterwards; none changes behaviour.

| Finding | Disposition |
|---|---|
| Spec 1 (medium): until T-0007 lands, P10 (a refused run after a sweep failure) shows `body_cleared` with the not-started report ("Nothing was deleted") and dismiss; before this change it showed the sweep report | User decision (option A): accept the interim and record it here and in the pull request; T-0006 and T-0007 follow in the same session. Rejected: B, a temporary rule the spec does not have; C, holding this ticket unmerged against `blocked_by`. Progress access stays denied and no marker is written on that path |
| Spec 2, 3: the same interim on P10c and P10b | Recorded with Spec 1; T-0006 and T-0007 own the exits and the refused path |
| Spec 4: on P7 and P8 the hint says to reload while dismiss, not reload, is offered | Recorded: the approved plan leaves exits to T-0006 |
| Standards B3, Spec 5 (medium): the report comment still said a delete that did not finish "deleted nothing and really is another tab's doing", and did not say the sentinel is read first | Fixed |
| Spec 6: the body comment's first sentence tied the change of body to the delete resolving | Fixed |
| Standards B7: the `clearStarted` docstring stated the order as if for every rule | Fixed: it is the body's order |
| Standards B4, Spec 10: routing fixtures in states the composable cannot reach (flag and error without phase or start) | Fixed: the fixtures are P4 or P2 now; their exit assertions are unchanged (T-0006) |
| Standards B5: tests never seen red | Mutation checks: disabling the sweep branch of the report turned P4, P5, P8, P9, P14 red (10 cases); a banned term in the new hint literal turned its CI-1 case red; restored |
| Spec 7: T32 read `indexedDB.databases()` after the strings | Fixed: handle closed and the database checked first |
| Spec 9: P9 and P14 did not assert the raw error line | Fixed |
| Standards H1: P2 and P13 left queued deletes running after the test | Fixed: both wait until the database is gone |
| Standards H2: the bound crossing allowed one macrotask per fake second | Fixed: five per second |
| Smell J2: why deleting the replaced method restores it | Fixed: comment |
| Smell J4: group name and the P7 test name | Fixed |
| Standards B1, B2, B8: status, checkboxes, two long lines | Fixed |
| Standards B6: F3 and F5 self-tests written together | Recorded, no change |
| Standards H3, H4; Spec 8, 12, 13 | No change: a bounded negative observation; global versus imported fake-indexeddb types are one implementation; "no handle held" is structural in T33; empty error messages are existing behaviour; the F5 event class is noted in the helper |
| Smells J1, J3, J5, J6 | No change: the template keeps the rules readable against the traceability table; the repeated three assertions match P4 and P5 |
| Spec 11: other retired claims in T38/T39 (`useSessionGate.test.ts` "the work really is gone", `useSessionGate.ts` "the object stores really are empty") | Left for T-0008 |
| Spec 14: preview criterion | Stage 8 |

After the fixes, run one at a time on the same surfaces: vitest 124 files, 2,143 tests passed; `pnpm build` ok;
challenges 4/4; `verify-project.py` PASS; `vue-tsc` 100 errors, unchanged. Site smoke: the first run after the
build exited non-zero and its output was not kept, so which case failed is not known; the next three runs
were 17/17 each. Recorded as an unidentified failure, not as a pass.

### 2026-10-11 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0005.md`. One candidate pass and an
independent false-positive pass; the base's raw error condition checked with `git show`; commit messages scanned.
No confirmed security defect. The change removes the one dangerous direction (claiming the database is deleted
while a delete is unconfirmed: P6, P7, P8). The interim states that remain until T-0006 and T-0007 land (P10, P10b, P10c
reports; P7 and P8 hint against the dismiss exit) are listed in the report; P10 was accepted by the user in stage 6,
the rest is put to the user before merging.
