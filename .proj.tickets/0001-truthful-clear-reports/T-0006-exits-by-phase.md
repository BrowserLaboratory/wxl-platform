---
id: T-0006
title: Exits follow the failure phase (K4 exits)
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0005]
---

## Context

K4: while a deletion may still be queued, the gate offers "Close this report and carry on", which the
platform's own rule forbids (in-memory session could be written back). G6: exits follow the phase.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Reload is offered when a run was started, a report is on screen and the latest phase is not `'sweep'`;
dismiss only when a report is on screen and the latest phase is `'sweep'`. The composable enforces dismiss
as well as the template.

## Acceptance criteria

- [x] Exit columns of T19–T25 match the selection rules (AC-6).
- [x] T12, T13: dismiss is accepted only with phase `'sweep'` and refused otherwise, by the composable itself (AC-3).
- [x] T11, T11a, T16, T16a: continue and progress access unchanged.
- [x] T37 passes in the built site: second page at the site root holds a native connection; raw error contains "another tab still has it open"; reload shown; dismiss and continue absent (AC-10).
- [x] Comment and test locations stating the old two-fact dismiss rule are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with the K4 setup.

## 給使用者（zh-TW）

修 K4 的出口：資料庫刪除可能還在排隊時，只給「重新載入」；只有掃除失敗（資料庫確定已刪）時才給「關掉說明」。
composable 也照同一規則擋，不只靠畫面。建置後的網站上有 K4 情境。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S1 composable | dismiss accepted only with phase `'sweep'` (P4, P5, P9, P14: gate closes, decision `dismissed`, no marker); refused on P7 (flag set, phase `'delete'`), P2 and P6 | composable state | T12, T13 | the composable enforces it, not only the template |
| S1 | continue and progress access tests unchanged and green | composable state | T11, T11a, T16, T16a | — |
| S2 truth | exit assertions added to the existing truth tests, labels as literals: P2, P3, P3x, P7, P8, P13 show reload and neither dismiss nor continue; P4, P5, P9, P14 show dismiss and no reload; P6 shows none | rendered gate | T19–T25 exit columns, AC-6 | — |
| routing (mocked) | the "error and flag" dismiss cases rewritten to follow the phase | rendered gate | T38 subset | — |
| S3 built site | T37: as T36, then a second page at the site root opens a native blocking connection by `page.evaluate`; delete pressed again; the real bound waited out; raw error contains "another tab still has it open"; literal en `body_unconfirmed`, `clear_unconfirmed`, new hint; reload shown; dismiss and continue absent | production build | T37, AC-10 | real 5-second wait |
| review | comments stating the two-fact dismiss rule now state the phase rule | comments | T39 subset | — |

Stated with the approval: the spec's reload rule reads "error present or `clearRefused`"; `clearRefused` is
T-0007's, so this ticket implements the error half.

### 2026-10-11 — red → green log

1. T13 at S1: red, `expected 'dismissed' to be 'undecided'`. P7 (flag set by the earlier run, phase `'delete'`)
   accepted dismiss. Green: `dismissClearFailure` guards on an error and phase `'sweep'`, no longer on the flag; its
   docstring states the phase rule.
2. T12 at S1 for P9 and P14 passed on first run (characterization); P4 was already covered.
3. S2 exit assertions with literal labels added to P2, P3, P3x, P6, P7, P8, P9, P13, P14: P7 and P8 red (dismiss
   shown, reload absent), the rest already right. Green: the template's reload is `clearError && clearStarted &&
   phase !== 'sweep'`, dismiss is `clearError && phase === 'sweep'`; the dismiss comment states the phase rule.
4. Routing: the case asserting continue and no dismiss after "a delete that destroyed nothing" (unreachable: a
   failed run has started) is rewritten as P2 with reload; a K4 case is added (flag set, phase `'delete'`: reload,
   no dismiss). The section comment no longer states the two-fact rule.
5. Mutation check: the template's dismiss condition put back on the flag turned P7, P8 (en, zh-TW) and the routing
   K4 case red, 5 tests; restored.
6. T37 (S3): red against the previous build at `Reload and start over` after its preconditions and the three
   unconfirmed sentences passed; green after `pnpm build`. It waits out the real five-second bound.
7. T38/T39 subset: one more retired claim ("a retry throws at the same line") in a dismiss test comment.

### 2026-10-11 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 dismiss | accepted on P4, P9, P14; refused on P7, P2, P6 and with no error (stage 6 added P6); progress denied after dismiss (T16a, added in stage 6) | Not measured: no coverage provider (user decision, T-0001) | T12, T13, T16a | P5 acceptance is the P4 path with learner rows; not separate at S1 |
| S1 continue, progress | existing tests, unchanged and green | Not measured (same reason) | T11, T11a, T16, T16a | — |
| S2 exits | P2, P3, P3x, P7, P8, P13: reload only; P4, P5, P9, P14: dismiss only; P6: none; labels literal, en and zh-TW | Not measured (same reason) | T19–T25 exit columns, AC-6 | refused-run rows (T26–T28r) are T-0007's |
| routing (mocked) | P2 and K4 reload cases; existing dismiss cases on P4 | Not measured (same reason) | AC-6, T38 subset | — |
| S3 | T37, English, `door-is-open`, real bound | Not measured (same reason) | T37, AC-10 | — |
| S2 later run | T15: F1 through both runs, F2 on the later one (added in stage 6 by user decision) | Not measured (same reason) | T15, AC-3 | — |

### 2026-10-11 — verification

Surface: the local checkout (vitest on happy-dom with fake-indexeddb) and a local production build (Playwright), run
one at a time.
- vitest: 124 files, 2,147 tests passed. `pnpm build` ok. Site smoke 18/18 (with T37). `verify-project.py` PASS.
  `vue-tsc --noEmit`: 100 errors, unchanged, none in the touched files.
- Challenges: the first run failed `door-is-open` with `login failed for guest`, with nothing else running; the
  immediate rerun was 4/4. Its cause is not established (raised as a separate task); see the correction in T-0004.

### 2026-10-11 — stage 6 review and fixes

Two independent `harness-reviewer` passes over the captured diff against `origin/main`. No high-severity
finding. Both checked the reload and dismiss conditions and the composable guard against the selection rules,
and every state P0–P15 against the exit columns: all match outside the refused-run states that T-0007 owns.
In-scope fixes were applied under the user's standing approval and reported afterwards; none changes behaviour.

| Finding | Disposition |
|---|---|
| Spec F1 (medium): until T-0007 lands, P10c (a refused press after a held later delete) has no exit at all: continue withdrawn by the flag, reload by `clearStarted` set false by the refusal, dismiss by the phase. Under T-0005 it showed dismiss | User decision (option A): accept and record; T-0007 follows next. Rejected: B, a temporary reload rule without `clearStarted`, which the spec does not have and which would widen reload elsewhere. A manual reload leaves the state; progress stays denied and no marker is written |
| Spec F2: P10b and P11r offer continue and no reload until T-0007 (unchanged by this ticket) | Recorded with F1; T-0007 (T10a, T11a) |
| Standards S1, Spec F3 (medium): a composable dismiss test still stated the two-fact rule and that continue is honoured after a blocked delete | Fixed: rewritten as P2 with the phase asserted and the reload reason |
| Standards S2, Spec F4: a test comment claimed to isolate the report guard through the flag | Fixed: the comment states the finished-clear case; the error guard is noted as defensive, since the composable never records a phase without an error |
| Standards S5, Spec F7: the planned S1 refusal on P6 had no test | Fixed: added |
| Spec F5: T16a (progress access after dismiss) had no test, though the coverage table claimed it | Fixed: added |
| Standards S6: P9 and P14 acceptances did not assert the gate closes; P14 lacked its intermediate preconditions | Fixed |
| Standards S3, S4, Spec F10: routing names and fixtures still keyed on the flag or in unreachable states | Fixed: names follow the phase; fixtures are P6 and P2 |
| Standards F1 (medium): T37's delete could queue behind the site's own versioned open held by the second page | Fixed: the second page waits up to five seconds for the site to create the database before opening; a first version that required it failed one of five runs because the site does not always create it from those pages; the final version passed T36 and T37 six times each |
| Standards F2, F3, F5, F6; Spec F14 | Fixed: per-test timeout 60 s; the holder closed in `finally`; the init script on the holder noted; describe renamed; delete label asserted |
| Spec F9: the dismiss rule's reason did not say earlier queued deletes have finished | Fixed: stated (deletes of one database are processed in order) |
| Comment C1, C2, C5 | Fixed: "rejected" for delete rejections, keeping "refused" for refused runs; the flag sentence states the present; a comment reflowed |
| Standards S7, S8, S9, S10 | Fixed: status `review`; criteria 1–5 ticked; a long line in T-0005's landed entry; 資料庫刪除 in the zh-TW section |
| Spec F6: T15 (a later run deletes again: F1 and F2 both in place, phase `'delete'`, the draft still there) is owned by no ticket and asserted whole by no test | User decision (option A): added to this ticket as one S2 test, F1 kept through both runs with F2 on the later one; it asserts the held connection was asked to make way, phase `'delete'`, the blocked reason and the draft. Passed on first run; mutation check: skipping the delete when the flag is set turned it red; restored |
| Spec F8: an empty error message is falsy in the template but not null in the composable | Recorded, no change: existing behaviour; not reachable from the platform's own rejections |
| Spec F11; Comment C4: other flag-first sentences (`useSessionGate.ts` on presentation and on the failed-delete path; the continue comment) | Left for T-0008 |
| Comment C3, smells J1–J5 | No change: the template mirrors the composable's rule as the spec asks; the rest as in earlier tickets |

After the fixes and T15, run one at a time: vitest 124 files, 2,150 tests passed; `pnpm build` ok; site smoke 18/18;
T36 and T37 repeated six times each, 12/12; challenges 4/4; `verify-project.py` PASS; `vue-tsc` 100 errors, unchanged.

### 2026-10-13 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0006.md`. One candidate pass and an
independent false-positive pass; commit messages scanned. No confirmed security defect: the new dismiss
condition is a strict subset of the old one, and reload is newly offered only on P7 and P8. Two comments I wrote
were narrowed after review (no delete issued *before* the latest one is pending; what acknowledging would actually
invite). The non-modal gate with unguarded saves, and the untested ordering of deletes in Firefox and WebKit, go to
the epic's chain analysis; a stale comment in `.vitepress/theme/index.ts` goes to T-0008.
