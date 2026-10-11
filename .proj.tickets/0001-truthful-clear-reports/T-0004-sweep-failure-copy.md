---
id: T-0004
title: Truthful copy after a sweep failure (K2)
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0002]
---

## Context

K2: after the database delete resolves and the sweep fails, the gate says the saved work was deleted and
cannot be brought back, while the learner's note draft can still be in `localStorage`. Reproduced on the
production site 2026-10-10. G4: fix the sentences, not the flag.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

After a sweep failure the gate shows the three new sentences from the copy table (`body_cleared`,
`sweep_failed`, `sweep_failed_hint`) in en and zh-TW, pinned by truth tests and by a built-site case.

## Acceptance criteria

- [x] Copy table strings for `body_cleared`, `sweep_failed`, `sweep_failed_hint` ship exactly, en and zh-TW; none contains a banned term (CI-1).
- [x] T30 (P4) and T31 (P5) pass on the harness: preconditions first, then literal sentences.
- [x] T36 passes in the built site (English, `door-is-open`): literal strings, dismiss shown, continue and reload absent (AC-9).
- [x] `CONTEXT.md`: the 新造詞 declaration of 全站清除 is removed in this change and the glossary test passes (T43, AC-14; round-2 K-1).
- [x] Comment and test locations that describe these sentences or call the result destroyed work are updated (T38/T39 subset).
- [x] Verified on the ticket's Cloudflare Pages preview with the sweep failure injected.

## 給使用者（zh-TW）

修 K2：掃除失敗後，畫面改成三句新文案（資料庫已刪除、其他項目沒能全部刪掉、再按一次會重試整個全站清除），
不再說「你的作品被刪了」。en、zh-TW 都有真話測試，建置後的網站上也有 K2 情境。「全站清除」第一次出現在介面，
`CONTEXT.md` 的新造詞標記同時拿掉。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S2 gate + real composable + fake-indexeddb | P4, en and zh-TW: an initialization-only attack session and a note draft seeded; F1 around the settled press; then `indexedDB.databases()` lacks the database, reopening shows no object store (closed at once), the draft is still in `localStorage`; then literal `body_cleared`, `sweep_failed`, `sweep_failed_hint`, the injected raw error, the literal dismiss label; continue and reload absent | rendered gate | T30, T21 | database without learner rows |
| S2 | P5, en and zh-TW: a learner row (a note) and a clearable key seeded; same preconditions and the same literals | rendered gate | T31, T22 | learner rows before the run |
| S2 | the three new strings contain no banned term, both locales | literals in the test | T35c (three of five) | CI-1 |
| S2 harness | seed rows through the platform's own open (schema) and a native connection; read store names over a native connection that is closed at once; each with a self-test | test helper | T30, T31 (T-0002 F-13) | no connection left open |
| S3 built site, English, `door-is-open` | init script plants a note draft and patches `Storage.prototype.removeItem` with a `this === localStorage` guard; delete pressed; the three sentences by `toHaveText`; dismiss visible; continue and reload count 0 | production build | T36 (AC-9) | — |
| glossary test | 全站清除 ships in the zh-TW copy → the glossary test is red (declared coined while in use) → remove the `_新造詞_` declaration of *site-wide clear* → green | `CONTEXT.md` | T43, AC-14 | — |
| review | only comments and tests that quote the old sentences or say the learner's work was deleted on this path; selection-rule comments stay for T-0005 | comments, tests | T38/T39 subset | — |

Stated: the control assertions in the S2 rows (dismiss shown, continue and reload absent) pin what the gate
shows today on P4 and P5, as T21 and T22 require; they change no behaviour.

### 2026-10-11 — red → green log

1. Harness: three self-tests for `seedDatabase` and `storeNamesOnReopen` were written together (one helper pair,
   not one test per cycle), red with `seedDatabase is not a function`. Green: both helpers. The seed goes through
   the platform's own open for the schema, then a native connection; the read reopens natively; both close
   their connection before returning.
2. T30 (P4), en and zh-TW: red with the old `body_cleared` received. Preconditions held, as the red run showed:
   the seeded initialization-only row is not learner evidence, the database is gone, the draft stayed. Green: the three
   strings in both message files changed to the copy table.
3. T43: the change in step 2 turned the glossary test red ("site-wide clear（全站清除） does not declare itself new while
   already in use"). Green: the `_新造詞_` declaration of the entry removed from `CONTEXT.md`.
4. T31 (P5) passed on first run (the copy was already changed). Mutation check: replacing the zh-TW `sweep_failed`
   with a sentence claiming the learner's work was deleted turned the zh-TW T30 and T31 cases red; restored.
5. CI-1 for the three new strings passed on first run. The checker's own self-tests (T-0002) show it flags the
   banned terms.
6. T36 (S3): red against the previous build (`expected "This site's database…"`, received the old body),
   after its preconditions held (raw error injected, database gone, draft kept). Green after `pnpm build`.
7. T38/T39 subset: four locations that quoted the old body or said the stored work was gone on the
   sweep-failure path now say the database is gone (`SessionGate.vue` two comments, `useSessionGate.ts` one
   comment, `SessionGate.test.ts` one comment). The truth test's harness note now points at the P4 and P5 tests.
   Left for T-0006 and T-0008: the continue and dismiss comments and the test names about "stored work is gone".

### 2026-10-11 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S2 P4 | en and zh-TW: preconditions, then title, body, heading, hint, raw error and dismiss by exact equality; continue and reload absent | Not measured: no coverage provider (user decision, T-0001) | T30, T21 | — |
| S2 P5 | en and zh-TW: preconditions, then body, heading, hint, raw error; continue and reload absent | Not measured (same reason) | T31, T22 | the dismiss label is asserted under P4 only |
| S2 CI-1 | three new strings, both locales | Not measured (same reason) | T35c (three of five) | `clear_unconfirmed_hint` and `clear_retry_not_started_hint` are T-0005's and T-0007's |
| S2 harness | seed and reopen helpers, three self-tests | Not measured (same reason) | T30, T31 | — |
| S3 | T36, English, `door-is-open`, `toHaveText` | Not measured (same reason) | T36 (AC-9) | — |
| Glossary | the existing glossary test, red then green | Not measured (same reason) | T43, AC-14 | — |

### 2026-10-11 — verification

Surface: the local checkout (vitest on happy-dom with fake-indexeddb) and a local production build (Playwright).
- vitest: 124 files, 2,120 tests passed. `pnpm build` ok. Site smoke 17/17 (with T36), challenges 4/4.
  `verify-project.py` PASS. `vue-tsc --noEmit`: 100 errors, unchanged; none in the touched files.
- One earlier run of the challenge spec and of `ChallengeLayout.test.ts` failed while a second vitest process
  was running on the same machine (the runtime host's 60-second initialization bound ran out). Both passed once nothing
  else was running. Recorded as load from my own concurrent runs, not as a result.

### 2026-10-11 — stage 6 review and fixes

Two independent `harness-reviewer` passes over the captured diff against `origin/main`. No high-severity
finding. The six shipped strings match the copy table character for character in both locales.
Under the user's standing approval for in-scope fixes, the following were applied and reported
afterwards; none changes behaviour.

| Finding | Disposition |
|---|---|
| Spec 1, Standards S6 (medium): comments and test names on the sweep-failure path still said the work was destroyed or that a retry redoes only the half that failed, contradicting the new hint | Fixed within AC 5: `SessionGate.vue` (header, continue/clear note, dismiss note), `useSessionGate.ts` (`keepExistingData`, `dismissClearFailure`), `SessionGate.test.ts` (two names, two comments), `useSessionGate.test.ts` (three names, one comment) now say the database is gone and that a retry runs the whole clear again. The rules those comments state (which flag outranks which, the dismiss conjunction, "on the delete-failed path … continue is still on screen") are left for T-0005 and T-0006, which change the rules themselves; the full T38/T39 sweep stays with T-0008 |
| Standards S1, Spec 6: the initialization-only fixture's doc comment sat above another constant | Fixed |
| Spec 2, Standards S8: P5 asserted neither title nor dismiss | Fixed: P5 now asserts title, dismiss and delete labels like P4 |
| Spec 3, Standards S9: preconditions read the database through the platform's detection, outside the allowed reads | Fixed: preconditions now read rows over a native connection closed at once (`rowsOnReopen`); the seed still uses the platform's open for the schema, as the plan says |
| Spec 4: T30 did not show the seeded row existed before the run | Fixed: P4 asserts the attack-session store holds exactly the seeded initialization-only row, and no notes |
| Spec 5, smell J5: clear was not asserted, though "Clear is shown in every row" and the S3 title says "retry" | Fixed: S2 P4, P5 and S3 T36 assert the delete button's label; T36 also asserts the dismiss label |
| Standards S3: CI-1 never seen red in this ticket | Mutation check: a zh-TW literal containing 已存 turned the zh-TW CI-1 case red; restored |
| Standards S7: removing the 新造詞 line dropped the record of 整個本機資料庫, still used in the zh-TW guide | Fixed: added to the existing `_Avoid_` line with where it still appears |
| Standards S4, S5: status and checkboxes | Fixed: `review`; criteria 1–5 ticked, the preview criterion waits for stage 8 |
| Standards S2, Spec 10: three harness self-tests written together | Recorded, no change: disclosed in the red → green log |
| Standards S10: the T-0003 done record rides on this branch | No change: user decision D2 |
| Spec 7: preview verification pending | Stage 8 |
| Spec 8: the selection-rule comment still says `databaseDeleted` outranks `clearStarted`, and quotes "Nothing was deleted" | No change: T-0005 (selection rules) |
| Spec 9: S3's `indexedDB.databases()` could see a database written back by an in-memory save (T41) | Recorded, no change: no save is triggered on that page before the read; 17/17 locally |
| Smell J1: `holdDatabase` repeated the native open | Fixed: it uses the new `openNative` |
| Smell J3: the seed calls `hasAnyStoredData` for its side effect | Fixed: comment says it is called for its open |
| Smells J2, J4; wording W2–W4 | No change: J2 is the harness's own check of the seed against detection; J4 fails loudly at run time; W2–W4 concern the spec's fixed copy |

After the fixes, run one at a time on the same surfaces: vitest 124 files, 2,120 tests passed; `pnpm build` ok; site
smoke 17/17; challenges 4/4; `verify-project.py` PASS; `vue-tsc` 100 errors, unchanged, none in the touched files.

### 2026-10-11 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0004.md`. One candidate pass and an
independent false-positive pass; `git diff -U0` confirmed the two source files changed only inside comments;
commit messages scanned. No confirmed security defect. Four candidates were judged not introduced by this change.
Owners: F1 → T-0005 and T-0006, F2 → T41 in T-0009, F3 and F4 → the spec's fixed copy. Note for T-0009: T41 as worded
omits a write-back from another tab after a successful clear and reload.

### 2026-10-11 — stage 8 end-to-end on the preview deployment

Surface: the Cloudflare Pages preview for `bda6ea1` (`e280fe39.wxl-platform.pages.dev`), driven in the Claude
desktop app's Browser panel, on `door-is-open` in both locales.
- Bundle: the theme chunk carries the new zh-TW and en `sweep_failed` strings.
- P0, zh-TW and en: the untouched question as on `main`.
- P4 with F1 injected in the page (`Storage.prototype.removeItem` throws for `localStorage`), zh-TW and en: the database is gone,
  the draft is still in `localStorage`; on screen the new `body_cleared`, `sweep_failed` and `sweep_failed_hint`, exactly as in
  the copy table, the raw error `injected: removeItem refused`, the delete and dismiss buttons with their labels, no continue or
  reload. A screenshot of the zh-TW dialog showed the three sentences laid out in the report box as before.
- P11a (reloaded by hand), en: `body_unconfirmed` and the delete button only.
- P15 (delete pressed with no fault): the page went to the site root in the stored locale (`/zh-TW/`, the exempt locale key
  survives by design), no gate, the draft removed, the decision marker written.
- The challenge's Browser panel loads FileHub's sign-in page after Go.
