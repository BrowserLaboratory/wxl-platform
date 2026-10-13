---
id: T-0007
title: A refused run adds a notice and keeps earlier state
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0006]
---

## Context

A run whose start record cannot be made durable currently resets `clearStarted` and replaces the error,
erasing the record that a deletion may be queued (round-1 C-1/R-1, P0). Rulings A1 and A4: a refused run
with earlier state changes nothing and adds a notice beneath the earlier report. A1 and A4 ship together:
A1 alone would show "Nothing was deleted" on a path where that is false.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

The composable exposes `clearRefused`. A refused run with earlier state keeps phase, `clearStarted` and
the error, and the gate adds `clear_retry_not_started_hint` beneath the earlier report; a refused first run
behaves as today.

## Acceptance criteria

- [x] T9, T10a, T10b, T10d–T10g hold (AC-2).
- [x] T26, T27, T28r, T29p match the selection rules, including reload on P11r and presentation on the site root (AC-4–AC-6).
- [x] New `clear_retry_not_started_hint` ships exactly, en and zh-TW, no banned term.
- [x] Truth rows T35, T35b, T35r pass using F4 and F6; P12 (T29) still shows what `72327e2` shows (AC-8).
- [x] Comment and test locations stating that a refused run always keeps continue are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with `sessionStorage.setItem` made to throw after a failed run.

## 給使用者（zh-TW）

處理「沒能開始」的全站清除：前一次留下的報告和狀態都保留，下面加一句「這次沒有刪掉任何東西，請清出儲存空間或改用
一般視窗」。第一次就沒能開始時，行為跟現在一樣。

## Comments

### 2026-10-13 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S1 composable | refused with earlier state: phase unchanged (P10 `'sweep'`, P10b `'delete'`, P11r `null`), `clearStarted` stays true, the error stays the earlier run's, `clearRefused` true | composable state | T9, T10a, T10d, T10f | refusal by a `sessionStorage` write that throws |
| S1 | refused first run: `clearStarted` false, error the not-started sentinel, `clearRefused` false (as today); `clearRefused` false when a run starts and in a new document | composable state | T10b, T10e, T10g | — |
| S2 truth | P10 (F1 then F4): `indexedDB.databases()` unchanged across the press and the delete not called; literal sweep-failure sentences then the retry hint, no `clear_not_started`; the earlier raw error; dismiss shown | rendered gate | T35, T26 | — |
| S2 | P10b and P10c (F2 or F3, then F4): the unconfirmed sentences then the retry hint; reload shown, no continue or dismiss | rendered gate | T35b, T27 | — |
| S2 | P11r (P2, then F6, then F4): `body_unconfirmed` and the retry hint only, no heading or raw error; reload shown; presented on the site root too | rendered gate | T35r, T28r, T29p | — |
| S2 | P12 (first run refused): the screen as today, literals, continue kept | rendered gate | T29, AC-8 | — |
| S2 | the retry hint has no banned term, both locales | literals | T35c | CI-1 |
| routing (mocked) | the mock gains `clearRefused`; cases stating a refused run always keeps continue are rewritten | rendered gate | T38 subset | — |
| harness | F4 via the existing `withStorageMethodReplaced`; F6, a new document keeping storage and the database | test helper | T35r | — |

Stated with the approval: the retry hint gets its own marker, `data-session-gate-retry-hint`, since it shows
beside the earlier report's hint (markup only); on P11r the report box shows with no error, holding the retry hint
alone, as T28r requires.

### 2026-10-13 — red → green log

1. S1, P10 refused: red, `expected false to be true` (`clearStarted` cleared by the refusal). Green: module-level
   `clearRefused`; whether the press has earlier state is read before the start record is attempted; a refusal
   with earlier state restores `clearStarted` to what it was, sets `clearRefused` and returns, leaving phase and
   error; a refused first run behaves as before; the error, the notice and the phase are reset only once a run starts.
2. S1, P10b, P11r (only the write fails; the earlier document's record stays readable), the refused first run, the
   reset when a run starts and the new document: passed on first run. Mutation checks: disabling the earlier-state
   branch turned 5 of these red; dropping the reset of `clearRefused` at run start turned one red; restored.
3. S2 truth rows P10, P10b, P10c, P11r (challenge page in both locales, site root in English): red, the retry notice
   absent (8) and the P11r exits. P12 stayed green, as today. Green: the report box shows when there is an error or a
   notice; the existing reports render only with an error; the raw error only with an error that is not the sentinel;
   the notice renders beneath, marked `data-session-gate-retry-hint`; reload is `(error or notice) and clearStarted and
   phase not 'sweep'`. `clear_retry_not_started_hint` ships in both locales. Mutation check: reload without the notice
   term turned the three P11r cases red; restored.
4. CI-1 for the notice passed on first run.
5. Routing: the mock gained `clearRefused`; a P10b case was added; the first-run case is named as such.
6. T38/T39 subset: comments and tests saying a refused clear keeps continue are now scoped to a refused first run
   (`useSessionGate.ts`, `SessionGate.vue`, `SessionGate.test.ts`, `unconfirmed-clear-outcome.test.ts`).

### 2026-10-13 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 refused with earlier state | P10, P10b, P11r: phase, `clearStarted`, error kept; notice set | Not measured: no coverage provider (user decision, T-0001) | T9, T10a, T10d, T10f | P10c at S1 is P10b's path after a sweep failure; covered at S2 |
| S1 refused first run, resets | first run as before; notice false at run start and in a new document | Not measured (same reason) | T10b, T10e, T10g | — |
| S2 refused runs | P10, P10b, P10c, P11r (challenge page en and zh-TW, site root en), literals and exits | Not measured (same reason) | T26, T27, T28r, T29p, T35, T35b, T35r | — |
| S2 P12 | refused first run, as today | Not measured (same reason) | T29, AC-8 | the body is checked by its last sentence; the full P0 body is pinned by the P0 test |
| S2 CI-1 | the notice, both locales | Not measured (same reason) | T35c | — |
| routing (mocked) | P10b notice case; first-run case | Not measured (same reason) | T38 subset | — |

### 2026-10-13 — verification

Surface: the local checkout (vitest on happy-dom with fake-indexeddb) and a local production build (Playwright), run
one at a time.
- vitest: 124 files, 2,170 tests passed. `pnpm build` ok. Site smoke 18/18, challenges 4/4. `verify-project.py` PASS.
- `vue-tsc --noEmit`: 100 errors, unchanged. Four of them are in `unconfirmed-clear-outcome.test.ts`, which this ticket
  touched (comments and a describe name only); the same four are reported on `main` (checked by stashing the change),
  so none is new.

### 2026-10-13 — stage 6 review and fixes

Two independent `harness-reviewer` passes over the captured diff against `origin/main`. No behaviour fault: the
earlier-state test matches the glossary (a restored start record counts), a refused press with earlier state
changes nothing but the notice, the strings match the copy table, every state P0–P15 matches every column, and the
interim states left by T-0005 and T-0006 (P10, P10b, P10c, P11r) are closed. The findings were about the tests'
power; all were fixed under the user's standing approval, none changes behaviour.

| Finding | Disposition |
|---|---|
| Standards S1 (high), Spec F1: T10c's snapshot lacked `clearRefused`, so a guard moved after the start-record attempt would survive (the refusal now restores `clearStarted`), and its comment still described the sentinel | Fixed: the snapshot includes `clearRefused`, the comment states the notice; mutation check: moving the guard there turns both T10c cases red |
| Spec F2, Standards S4: T35b and T35r preconditions (databases unchanged, the delete not called) asserted only on P10 | Fixed on P10b, P10c and P11r |
| Spec F3: the earlier raw error compared by substring | Fixed: captured before the press and compared exactly after |
| Spec F4: T11a, T12, T13 not asserted at S1 on refused states | Fixed: P10 accepts dismiss; P10b and P11r refuse continue and dismiss; P12 refuses dismiss and accepts continue |
| Spec F5, Standards S3, S11: P12 compared the body by its last sentence and did not assert the exits | Fixed: whole body literal; exits by label |
| Spec F6, Standards S5: T29p on the site root only for P11r | Fixed: P10b and P10c also mount a second gate for the site root in the same document and assert presentation, the notice and reload |
| Spec F7: the notice's place beneath the report not asserted | Fixed: document order checked on P10, P10b, P10c |
| Spec F8, Standards S6, S9: report and reload comments still stated pre-notice ordering and omitted the notice | Fixed |
| Standards S7, S8, S13: comments on the notice, the sentinel and `clearError` stated the old scope or the past | Fixed |
| Spec F10, smell J5: the S1 P11r fault replaced `sessionStorage` without `finally` | Fixed: a write-only switch in the existing storage double, reset in `finally` and in `beforeEach` |
| Standards S10: the P11r test said "held" for a timed-out delete | Fixed |
| Standards S14: the refused press wraps a bare click against the harness's own rule | Fixed: comment says why it holds (the refusal is decided before the first `await`) |
| Standards S16: P12 phase and P10 flag not asserted at S1 | Fixed |
| Smell J3: an empty `<template>` stopped the report chain | Fixed: the chain is wrapped in `v-if="clearError"` |
| Smell J1: notice naming | Comments say "refusal notice", as the glossary does; the marker stays `retry-hint`, as approved |
| Standards S2, S12, S17: status, criteria, 全站清除 in the zh-TW section, a long line in T-0006's landed entry | Fixed |
| Spec F9: sentinel and notice together would show the not-started heading | Recorded, no change: unreachable (the sentinel is set only with the notice false, and earlier state does not end within a document except on success) |
| Standards S15: batched red | Recorded, no change, as in earlier tickets |
| Smells J2, J4, J6 | No change, as in earlier tickets |
| Spec F11: preview criterion | Stage 8 |

After the fixes, run one at a time: vitest 124 files, 2,170 tests passed; `pnpm build` ok; site smoke 18/18;
`verify-project.py` PASS; `vue-tsc` 100 errors, unchanged. Challenges: two consecutive runs failed `door-is-open`
(`runtime host: initialization did not finish within 60000ms`, then `login failed for guest`); the third passed, with that
test taking 46.9 s against a usual 5–6 s. At the time, operating-system background processes were using much of the CPU.
The cause is not established; it is the same local failure already raised as a separate task, and the pull
request's challenge job is the deciding surface.

### 2026-10-13 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0007.md`. One candidate pass and an
independent false-positive pass; the base's refused path checked with `git show` (it set `clearStarted` false and
the sentinel); commit messages scanned. No confirmed security defect; the change tightens: the base offered and accepted
continue in the same document on P10b, P10c and P11r, and let the gate vanish on the site root. Two notes go to the
epic's chain analysis: a reload after storage becomes wholly unreadable lands where the start record cannot be read
(F-1), and a second refused press gives no new feedback (F-4).
