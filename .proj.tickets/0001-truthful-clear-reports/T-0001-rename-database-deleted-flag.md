---
id: T-0001
title: Rename the gate flag to databaseDeleted
epic: 0001-truthful-clear-reports
status: review
blocked_by: []
---

## Context

The session gate's flag records that the database delete resolved, but its name (`storedWorkGone`) and its
own doc comment say the learner's work is gone. That mismatch is the root of K2–K4 (spec
`.proj.specs/0001-truthful-clear-reports/spec.en.md`). This is the prefactor: rename first, so later
tickets change behaviour under an honest name.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

The flag is exposed as `databaseDeleted` with unchanged semantics, every caller and test uses the new
name, and the flag's own doc comment states the fact it records. No behaviour changes.

## Acceptance criteria

- [ ] `git grep storedWorkGone -- .vitepress tests` finds nothing (T4, AC-1).
- [ ] `databaseDeleted` behaves as T1–T3: true from the moment a delete resolves in this document, never reset within it, false in a new document.
- [ ] The flag's declaration comment and the exported doc comment (T39 locations for the flag) state "the database delete resolved", not that the learner's work is gone.
- [ ] The full unit suite, site smoke and challenge suites pass unchanged (no behaviour change; AC-8 holds).

## 給使用者（zh-TW）

把 gate 的旗標 `storedWorkGone` 改名為 `databaseDeleted`，名字和說明改成它真正記的事：「刪除資料庫已經回來」。
只改名稱和說明，畫面與行為完全不變；做完後找不到舊名稱，所有既有測試照樣綠燈。

## Comments

### 2026-10-11 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S1 gate composable return object | exposes `databaseDeleted`, no key under the old name (written red first) | public interface | AC-1 (T4) | whole key list; no alias |
| S1 | true once the delete resolves (existing test, renamed) | composable | AC-1 (T1) | delete resolves, sweep throws |
| S1 | stays true when a later run fails (existing assertions, renamed) | composable | AC-1 (T2) | delete rejected on retry |
| S1 | false in a new document (new assertion) | composable | AC-1 (T3) | module reset |
| Existing suites | behaviour unchanged | whole project | AC-8 | rename only |
| Static | `git grep storedWorkGone -- .vitepress tests` empty | tracked files | AC-1 (T4) | ignores untracked build output |

### 2026-10-11 — red → green log

1. Red: `names the flag after the fact it records` failed with `Cannot read properties of undefined (reading 'value')` (no `databaseDeleted`). Green: renamed the flag in the composable, component and tests; rewrote the flag's declaration and exported doc comments. The test first used the old name as a string literal, which contradicts T4's grep; it now asserts the whole public key list instead.
2. `starts a new document with the database delete not yet resolved` passed on first run (existing behaviour, characterization). Mutation check: initial value forced to `true` turned it red; restored.

### 2026-10-11 — stage 6 review and fixes

Standards and Spec reviews ran on the uncommitted change at `71bc8af` (two `harness-reviewer` passes,
no drift). The user approved fixes 1–8 and chose to leave coverage tooling out of this epic (S2 option A).

- **Correction to the test plan above.** Its T2 row claimed existing assertions covered "stays true when a
  later run fails". They did not: every existing assertion reads the flag after a first run only (Standards
  S3, Spec F1). Tests were added for T2 and the rows below record what is covered now.
- Added tests (all characterization: the behaviour already held). Each passed on first run; mutation checks:
  - reset the flag when a run starts → `keeps the flag set when a later run's delete is rejected` red;
  - restore the flag from the start record during `evaluate` → both new-document tests red;
  - set the flag when a delete is rejected → `leaves the flag unset…rejected again`, `sets the flag when a later run's delete resolves…` and two existing tests red.
  Source restored after each mutation (compared byte for byte).
- The key-list assertion was replaced: no public key may start with `stored`, and `databaseDeleted` exists.
  It no longer breaks when later tickets add keys (Standards J1, Spec F5) and still keeps the old name out of
  `git grep`. The duplicated flag assertion was removed (J2).
- Doc comment wording: "can resolve on a database whose object stores held no learner rows"; the clear
  cannot be taken back "from the moment the delete resolved" (Spec F6, Standards J4).

Round-2 P2 findings touching T1–T4 (Spec F4):

| Finding | Disposition |
|---|---|
| C-5 (T1 missing P15 and later resolving runs) | P15 covered by the existing reload-after-success test; later resolving run covered by the new P14 test |
| C-7 (flag stays false in P2, P3, P3x, P10b, P11r, P12, P13) | P2/P3x by existing tests, P13 by a new test, P11b by a new test; P3 timeout, P10b, P11r and P12 need F3/F4 and belong to T-0005 and T-0007 |
| R-12 (no alias breaks customised forks) | Accepted; to be stated in the stage 9 PR description and the release note |
| K-13 (OQ-001 cites the old identifier) | Handed to T-0009 |

Known transitional state (Standards S6, Spec F7): after this ticket lands, comments and test names elsewhere in
the gate still state retired claims next to the new name, contradicting the rewritten flag comments. They are
listed in T38/T39 and owned by T-0005–T-0008. Existing smells recorded, not changed here: three booleans
recombined across the gate (J3); the quoted offer text presupposing saved work (J5, same family as T44).

### 2026-10-11 — coverage report table (after stage 6 fixes)

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 | T1: existing resolve test, P14 (new); T2: later run's delete rejected (new), later run's sweep fails again, P9 (new); T3: new document after a sweep failure (P11a) and after a rejected delete (P11b), each running `evaluate` (new); T4: no `stored…` key (new) plus `git grep`; P13 flag stays false (new) | Not measured: no coverage provider is configured; the user chose not to add one in this epic | AC-1 (T1–T4) | T1 for P5 is the existing test's setup; P3 timeout, P10b, P11r, P12 states need faults introduced by T-0005 and T-0007 |
| Component routing | existing `SessionGate.test.ts` cases with the renamed mock | Not measured (same reason) | AC-8 | Behaviour unchanged by construction |
| Whole project | see verification below | — | AC-8 | `vue-tsc --noEmit`: 100 errors before and after, none in touched files; no typecheck is configured as a project check or in CI |

### 2026-10-11 — verification after stage 6 fixes

Surface for every check below: the local checkout and a local production build (`pnpm build`), driven by
vitest (happy-dom) and Playwright against that local build. None of it ran on a preview deployment; stage 8
covers the Cloudflare Pages preview of this branch.

- vitest: 123 files, 2,083 tests passed.
- `pnpm build`: success. Site smoke (Playwright, local build): 16/16. Challenge specs (Playwright, local build): 4/4.
- `git grep storedWorkGone -- .vitepress tests`: no output.
- `python3 scripts/verify-project.py`: PASS.

### 2026-10-11 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0001.md`. No confirmed security defect. Three
candidates, each judged by an independent reviewer:

- S-1, committed review records contained absolute local home paths and references to untracked package and
  build files: a project-rule violation (`docs/agents/runtime.md`), not a security defect. Fixed before the
  first push by rewriting the two unpushed commits (user choice A): paths are repository-relative, package
  references give package@version, and each record carries a note saying so.
- S-2, no alias plus no typecheck anywhere: not a security defect (the composable's own guards still refuse
  continue and progress access), but it corrects an earlier claim. A fork component still reading the old name
  does **not** fail at build or typecheck; it silently reads `undefined`. The stage 9 PR description and the
  release note must say this. The commit message of this ticket was corrected accordingly.
- S-3, retired claims left in other comments: not a security defect; owned by T-0008.
