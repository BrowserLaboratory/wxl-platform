---
id: T-0002
title: Truth-test harness for the session gate
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0001]
---

## Context

The existing gate component tests mock the whole composable and only check which message group is
routed (OQ-003, K13). The spec requires tests that build the real machine state and compare literal
sentences (seam S2, G1/G9). This ticket builds that harness and proves it on screens that do not change.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

A test module can mount the gate component with the real composable and the real persistence layer over
fake-indexeddb, inject fault F1, assert preconditions with the allowed database reads, and compare each
rendered sentence with a literal string by trimmed exact equality, in en and zh-TW. It is exercised by
pinning P0 and P1 as they are today.

## Acceptance criteria

- [ ] Harness mounts the gate against the real composable and fake-indexeddb; faults are removed in `finally` right after the press they target (traceability: Faults).
- [ ] Sentences are compared by trimmed exact equality against literals written in the test; nothing is imported from the message files.
- [ ] A CI-1 checker exists that fails when a given literal contains a banned term in either locale.
- [ ] P0 (T17) and P1 (T18) are pinned with literal en and zh-TW strings, showing what `72327e2` shows (AC-8).
- [ ] Editing the P0 body in a message file into a different sentence turns a harness test red (demonstrated once, then reverted).

## 給使用者（zh-TW）

建立「說的是真的」測試架構：用真的 composable 和 fake-indexeddb 掛載 gate，可以注入掃除失敗，並用測試裡寫死的
字串做完全相等比對（en、zh-TW）。先拿它把 P0、P1 現在的畫面釘住；把 message 檔改掉一句，測試就會變紅。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S2 gate component + real composable + real persistence (fake-indexeddb) | harness: fresh fake IndexedDB, both storages cleared, modules reset per test; `evaluate()` before mount | test helper | AC1 | no state leaks between tests |
| S2 | P0 (T17): note draft, new browsing session; title, body and both buttons compared with literal strings by exact equality, en and zh-TW | rendered gate | AC-8, AC4 | shown with a draft; not shown without |
| S2 | P1 (T18): delete pressed and still pending; `body_unconfirmed`, delete only | rendered gate | AC-8, AC4 | a native connection keeps the delete pending (F2), closed after the assertions |
| S2 | fault F1 (sweep throws), restored in `finally` | test helper | AC1 | happy-dom `localStorage` instance |
| S2 | CI-1 banned-term checker flags bad strings and passes clean ones, en and zh-TW | test helper | AC3 | list from `traceability.md` CI-1 |
| manual | editing the P0 body in a message file turns an S2 test red; reverted | — | AC5 | once, recorded here |

User decisions with the approval: add `data-session-gate-body`, `-report-heading`, `-report-hint` and `-raw-error`
locators to the gate markup (markup only, no behaviour change); introduce the F2 helper here for P1.

### 2026-10-11 — red → green log

1. Red: `asks in English, with every sentence as written` failed with `expected null to be 'This browser already holds saved work…'` — the title matched (the harness really mounts a presented gate) but the body had no locator. Green: added `data-session-gate-body` to the body paragraph. The other three locators (report heading, report hint, raw error) are left for the tickets whose tests first need them.
2. P0 in Traditional Chinese and "no evidence, no gate" passed on first run (characterization).
3. P1 in en and zh-TW passed on first run (characterization), with preconditions asserted first: the held native connection saw `versionchange`, the start record exists, the database is still listed.
4. Harness self-tests: F1 is installed only inside the guarded block and restored even when the block throws; the CI-1 checker returns exactly the banned terms for seven en/zh-TW samples (including "Network and framework", which must not match `work`).
5. AC5 demonstration: the en P0 body in the message file was changed to "Nothing here belongs to anyone else." — `asks in English…` turned red, while all 29 routing tests in the existing component test file stayed green. The message file was restored (empty `git diff`).

### 2026-10-11 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S2 harness | 2 F1 self-tests, 7 CI-1 checker cases; every S2 test exercises reset and mount | Not measured: no coverage provider (user decision, T-0001) | AC1, AC3 | F2 is exercised by P1 only; its blocked-delete path (`another tab` error) is T-0005's |
| S2 P0 | en and zh-TW literal title, body and both buttons; no gate without evidence | Not measured (same reason) | AC-8 (T17), AC4 | — |
| S2 P1 | en and zh-TW literal body and the single delete button, with preconditions | Not measured (same reason) | AC-8 (T18), AC4 | — |
| Message file → test | manual demonstration, recorded above | — | AC5 | done once by hand, not automated |

### 2026-10-11 — verification

Surface: the local checkout (vitest on happy-dom with fake-indexeddb) and a local production build (Playwright).
- vitest: 124 files, 2,097 tests passed. `pnpm build` ok. Site smoke 16/16, challenges 4/4. `verify-project.py` PASS.
- `vue-tsc --noEmit`: 100 errors, unchanged; none in the new or touched files.

### 2026-10-11 — stage 6 review and fixes

Standards and Spec reviews ran on the uncommitted change over `main` `52bc03f`. The user approved fixes 1–11 and
the three recommendations (D1–D3). Numbering note for this ticket: "ticket AC n" is the n-th checkbox above;
"AC-n" is the spec's acceptance criterion.

- **Correction:** the approved decision was to add four locators; the first green step added one and deferred
  three without asking (Spec F-1, Standards S5). D1: all four are now added, plus `data-session-gate-title`
  (Standards J5), and P0/P1 assert that the report locators are absent.
- **F1 through the gate** (Spec F-2): the component fires the run without awaiting it, so a fault wrapped
  around the bare click is restored before the sweep runs. Added `pressClearAndSettle`, which waits for a
  report or a navigation, and a self-test that reaches a sweep failure through the delete button with F1
  wrapped around the settled press (state only; T-0004 pins its sentences).
- Harness: `sentence()` takes a fixed union of parts and fails on more than one match (J1, J9); navigation is
  recorded instead of performed (F-8); F2 is closed in `finally`, distinguishes a delete request from an
  upgrade, and closing is idempotent (F-7, J6); mounted gates are unmounted after each test (F-14); a shared
  `withStorageMethodReplaced` backs F1 and will back F4 (J3); `mountRealGate` has a typed result (S8); the
  unused `startNewDocument` and extra exports were removed (F-9, J2); comment wording (J10, F-10).
- Tests: P0 also asserts reload and dismiss absent (F-3); P1 compares the title (F-4); P1 ends by releasing F2
  and asserting the run completes with a navigation to the site root.
- CI-1 (D3, Spec F-5): English terms match any word beginning with them; the clarification is recorded in
  `traceability.md` CI-1. Samples added for "Learners keep yours and it works".
- File renamed to `SessionGate-truth.test.ts`, matching the hyphenated facet naming in that directory (S7).
- `traceability.md`: P1 notes it is held by F2 in S2 tests (F-6); the native blocking connection is defined as
  one that does not close on `versionchange` (F-10).
- T-0001's `done` record (D2) is committed separately on this branch and lands with this ticket; its pull
  request reference no longer names the repository slug, which `fork:init` would rewrite (S1, S9, S10).
- Recorded, not changed: the harness has no helper yet for reading or seeding object stores (F-13); T-0004
  adds it when T30–T31 first need it. The duplicated database name and record keys are deliberate: truth
  tests state the facts they read independently of the code under test (J4).
- AC5 demonstration repeated after the rename: the false en body turned `asks with every sentence as written
  (en)` red; the 29 routing tests stayed green; the message file was restored.

### 2026-10-11 — coverage report table (after stage 6 fixes)

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S2 harness | F1 self-tests (2), F1 through the gate (1), CI-1 checker (8 samples); P0/P1 tests exercise reset, mount, F2, navigation recording and unmount | Not measured: no coverage provider (user decision, T-0001) | ticket AC1, AC3 | F2's blocked-delete error path is T-0005's |
| S2 literal comparison | every S2 sentence compared by exact equality to literals in the test; no message file imported by the test file | Not measured | ticket AC2 | The helper imports the message files only to render the component, as `traceability.md` allows ("expected text is never imported") |
| S2 P0 | en and zh-TW title, body, both buttons; report parts, reload and dismiss absent; no gate without evidence | Not measured | AC-8 (T17), ticket AC4 | — |
| S2 P1 | en and zh-TW title, body, delete button; other parts absent; preconditions first; run completes after release | Not measured | AC-8 (T18), ticket AC4 | — |
| Message file → test | manual demonstration, twice | — | ticket AC5 | by hand, not automated |

Verification after the fixes (local checkout with vitest on happy-dom and fake-indexeddb; local production build
with Playwright): vitest 124 files, 2,099 tests passed; `pnpm build` ok; site smoke 16/16; challenges 4/4;
`verify-project.py` PASS; `vue-tsc --noEmit` 100 errors, unchanged, none in new or touched files.
