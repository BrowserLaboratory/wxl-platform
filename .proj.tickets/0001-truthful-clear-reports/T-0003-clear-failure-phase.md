---
id: T-0003
title: Record which half of a clear run failed
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0001]
---

## Context

Today every gate report branches on the flag alone, so a later failure is reported as an earlier one (K4).
The spec adds `clearFailurePhase` (G5). This ticket adds the state only; routing comes in T-0005.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

The composable exposes module-level `clearFailurePhase`: `null` when a run starts, `'delete'` on any
database delete rejection, `'sweep'` when the sweep throws, replaced by each later started run. Nothing on
screen changes yet.

## Acceptance criteria

- [x] T5, T6, T6x: `'delete'` after a blocked, timed-out or otherwise rejected delete.
- [x] T7: `'sweep'` after the sweep throws.
- [x] T8: `null` when a run starts; T10: a later started run replaces the earlier value (`'sweep'` → `'delete'`).
- [x] T10c: a press while a run is in flight changes nothing.
- [x] Gate screens are unchanged (AC-8 rows and existing routing tests pass).

## 給使用者（zh-TW）

在 composable 新增「最近一次全站清除在哪一半失敗」：資料庫刪除失敗記 `'delete'`、掃除失敗記 `'sweep'`，每次開始執行時歸零。
這張只記狀態，畫面不變；畫面怎麼依它分支是 T-0005 的事。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

Seam S1: the session gate composable, with the persistence layer and both storages doubled, as in the
composable's existing test file.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S1 | P2: first run, delete rejects with the blocked message → phase `'delete'`, `databaseDeleted` stays false | composable state | T5 | first run, no earlier state |
| S1 | P3: delete rejects with the time-limit message → `'delete'` | composable state | T6 | as above |
| S1 | P3x: delete rejects with any other error → `'delete'` | composable state | T6x | as above |
| S1 | P4: delete resolves, sweep throws → `'sweep'`, `databaseDeleted` true | composable state | T7 | a clearable key present |
| S1 | P1: first run in flight → `null` | composable state | T8 | delete held pending |
| S1 | P6: `'sweep'`, then a run in flight → `null` | composable state | T8 | `'sweep'` → `null` |
| S1 | after P2, a run in flight → `null` | composable state | T8 (round-2 C-5) | `'delete'` → `null` |
| S1 | P7: `'sweep'`, then a later run's delete rejects → `'delete'` | composable state | T10 | replaced, not kept |
| S1 | a press while a run is in flight: the delete is called once; phase, error, `clearStarted`, `databaseDeleted` unchanged | composable state | T10c | press during flight |
| S1 | new document after `'sweep'` (modules re-imported) → `null` | composable state | supports T28 (P11a) | F6 |
| existing | routing tests and the P0/P1 truth tests stay green | rendered gate | AC-8 (gate screens unchanged) | no new test |

Stated limit: the persistence layer is doubled at S1, so the three rejection kinds share one code path
in the composable. The real blocked, timed-out and otherwise rejected deletes (F2, F3, F5 with real
`IDBRequest` instances) are driven at S2 in T-0005. The refused run (T9) is T-0007's.

### 2026-10-11 — red → green log

1. T5 red: `Cannot read properties of undefined (reading 'value')`, as there was no field yet. Green: module-level
   `clearFailurePhase`, exposed read-only, set to `'delete'` where the delete's rejection is caught.
2. T6 and T6x passed on first run, since they take the same catch path at S1 (the stated limit). Mutation check:
   removing the `'delete'` assignment turns T5, T6 and T6x red; restored.
3. T7 red: `expected null to be 'sweep'`. Green: `'sweep'` set where the sweep's throw is caught.
4. T8 (P1) passed on first run (characterization): `null` is the initial value.
5. T8 (P6) red: `expected 'sweep' to be null`. Green: phase set to `null` once the start record is durable,
   just before the delete is issued, so a refused run does not reach it.
6. T8 (`'delete'` → `null`, round-2 C-5) passed on first run through the same reset. Mutation check: removing
   the reset turns both "forgets a …" tests red; restored.
7. T10 passed on first run. Mutation check with the plausible wrong design, deriving the phase from the
   flag (`databaseDeleted ? 'sweep' : 'delete'` on a rejected delete): red with `expected 'sweep' to be 'delete'`; restored.
8. T10c passed on first run. Mutation check: removing the in-flight guard makes the delete be called a third
   time; red; restored.
9. New document after `'sweep'` passed on first run (characterization): module state does not survive a reload.

### 2026-10-11 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 `clearFailurePhase` on a rejected delete | 3 (blocked, timed out, other) | Not measured: no coverage provider (user decision, T-0001) | T5, T6, T6x (S1 is the seam the spec assigns to these rows) | the three rejection kinds share one path at S1; under real F2, F3 and F5 faults the phase is observed through the reports it selects (T32, T33, T33x in T-0005) |
| S1 `clearFailurePhase` on a sweep throw | 1 | Not measured (same reason) | T7 | — |
| S1 reset at run start | 3 (P1, `'sweep'` → `null`, `'delete'` → `null`) | Not measured (same reason) | T8 | a refused run (T9) is T-0007's |
| S1 replaced by a later run | 1 | Not measured (same reason) | T10 | — |
| S1 press while in flight | 1 | Not measured (same reason) | T10c | — |
| S1 new document | 1 | Not measured (same reason) | supports T28 | — |
| Gate screens | existing routing tests (all AC-8 states, with the composable mocked); P0 and P1 truth tests | Not measured (same reason) | AC-8 | P11a, P11b, P12 and P15 have no truth test yet (their own tickets add them); the claim that they are unchanged rests on the component being untouched and nothing reading the field |

### 2026-10-11 — verification

Surface: the local checkout (vitest on happy-dom) and a local production build (Playwright). The branch was
rebased onto `main` after the merge of the OQ-006 change.
- vitest: 124 files, 2,109 tests passed. One earlier full run before the rebase failed a single
  `MergedNav.test.ts` case (dark-mode toggle title in zh-TW). That file passed 3 of 3 runs alone and in the next full
  run; it does not import the session gate. Recorded as an unrelated flake.
- `pnpm build` ok. Site smoke 16/16, challenges 4/4. `verify-project.py` PASS.
- `vue-tsc --noEmit`: 100 errors, unchanged; none in the touched files.

### 2026-10-11 — stage 6 review and fixes

Two independent `harness-reviewer` passes over the captured working-tree diff against `origin/main`.
No high-severity finding; no incorrect implementation; the reset position was confirmed compatible
with T9 (T-0007). Under the user's standing approval for in-scope fixes, the following were applied
and reported afterwards; none changes behaviour or scope.

| Finding | Disposition |
|---|---|
| Standards F6 (medium): why the reset sits after the durable start record is only in the ticket | Fixed: the field's docstring now states its lifecycle, and the reset carries a comment saying a refused press started nothing |
| Spec F-1, smell J3: T10c covered P6 only, and its field check could not tell a moved guard from a kept one | Fixed: now P1 and P6; the second press runs with `sessionStorage` throwing, and the snapshot adds `shouldAsk` and `decision`. Mutation check: moving the guard behind the start-record check now turns both cases red |
| Spec F-2: nothing showed the field is module-level | Fixed: a second caller of the composable reads the first caller's `'sweep'` |
| Spec F-3: later-run states of T5 and T7 (P9, P13, P14) asserted no phase | Fixed: the existing P9, P13 and P14 flag tests also assert the phase |
| Spec F-4: a sweep that fails while listing keys had no phase test | Fixed: new test, `'sweep'` with `databaseDeleted` true |
| Spec F-5: who verifies T5, T6, T6x under real faults | Wording fixed in the coverage table: S1 is the seam the spec assigns to these rows; under real faults the phase is observed through the reports it selects (T32, T33, T33x in T-0005). No change to T-0005 |
| Spec F-6: AC-8 evidence named only P0 and P1 | Wording fixed in the coverage table |
| Spec F-7: until T-0007 lands, a refused run after a failure keeps the old phase while setting the sentinel and clearing `clearStarted` | Recorded, no change: T-0003 changes nothing on screen, and T-0007 owns the refused path (T9, T10a, T10f). T-0005 and T-0006 land before T-0007, so the intermediate builds will show this mix on P10 and P10b until T-0007 is merged |
| Spec F-8, smell J4: exported `ClearFailurePhase` | Kept: matches `GateDecision`, and T-0005's mock needs it |
| Spec F-9, smell J5: declaration away from the error; type amid the state | Fixed: state declared beside `clearErrorState`; type beside the other exported types |
| Spec F-10: `mockClear` leaves unused once-implementations queued | Recorded, no change: pre-existing pattern for the whole file; every new test consumes what it queues |
| Spec F-11, Standards F1, F2: status and checkboxes | Fixed: `review`; criteria ticked |
| Standards F3: seven tests passed on first run | Recorded, no change: each is logged above as characterization, with a mutation check where a meaningful mutant exists |
| Standards F4: plan row says "the delete is called once" while the test asserts two calls | Clarified here: the plan means the press adds no call; the earlier run made the first one. The approved plan text is left as approved |
| Standards F5: coverage not measured | No change: user decision (T-0001) |
| Standards F7: the new section split an existing test group | Fixed: moved to the end of the composable's tests |
| Standards F8: stale "the locale gone" comment beside the new line | No change: listed in T39 at `72327e2` lines 487-490, owned by T-0008 |
| Standards F9: OQ-001's revisit condition met, line references shifted | No change: T42, owned by T-0009 |
| Standards F10: single-flight comments named only `clearError` | Fixed: both now name `clearFailurePhase` too |
| Standards F11: the exposed docstring repeated the module one | Fixed: says how a reader uses it beside `clearError` |
| Standards F12: bare 清除／刪除 in the zh-TW section | Fixed: 全站清除, 資料庫刪除 |
| Standards F13: double blank line in T-0002 | Fixed |
| Standards F14: the `MergedNav` flake has no follow-up | Raised as a separate task suggestion for the user, outside this epic |
| Smell J1: three near-identical rejection tests | Fixed: one `it.each`, with a comment stating the S1 limit |
| Smells J2, J6: setup helpers and the new-document test overlap older ones | No change: kept separate so each test maps to one row |

After the fixes, same surfaces as above: vitest 124 files, 2,112 tests passed; `pnpm build` ok; site smoke
16/16; challenges 4/4; `verify-project.py` PASS; `vue-tsc` 100 errors, unchanged, none in the touched files.

### 2026-10-11 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0003.md`. One candidate pass and an
independent false-positive pass (`harness-reviewer` each); the commit messages were scanned for local paths,
email addresses and secrets. No confirmed security defect. Five candidates were judged not introduced by
this change and not crossing a trust boundary. Their owners: C1 → T-0007, C2 → T-0008, C3 → T-0005 and
T-0006 review, C4 → T-0006; C5 is unreachable.
