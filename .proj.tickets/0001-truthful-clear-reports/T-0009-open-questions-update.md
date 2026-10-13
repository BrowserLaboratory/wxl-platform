---
id: T-0009
title: Update open questions for this epic
epic: 0001-truthful-clear-reports
status: review
blocked_by: [T-0007]
---

## Context

This epic resolves part of OQ-003, meets OQ-001's revisit condition, and leaves two known issues that must be
tracked (in-memory write-back; fixed gate sentences presupposing saved work).

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

`OPEN-QUESTIONS.md` records what this epic pinned, the OQ-001 re-check, and two new entries, each with
evidence inline.

## Acceptance criteria

- [x] T40: OQ-003 stays `open` and lists exactly the keys and states pinned by literal comparison.
- [x] T42: OQ-001 records that its revisit condition was met, that the in-flight withdrawal still holds (T11a, T13), and has updated line references.
- [x] T41 and T44: new entries with evidence quoted inline and their revisit conditions (AC-13).
- [x] No tracked content mentions anything outside this repository (rule R1).

## 給使用者（zh-TW）

更新 OPEN-QUESTIONS：OQ-003 記下這次釘住了哪些句子；OQ-001 記下重查結果；新增兩條，分別追蹤「記憶體中紀錄
寫回」和「gate 固定句子預設有已存紀錄」。

## Comments

### 2026-10-11 — handed over from T-0001 review

- `OPEN-QUESTIONS.md` OQ-001 still cites the old flag identifier, which T-0001 removed; update it with T42 (round-2 K-13).
- Record a new open question: the project has no test coverage provider, so every coverage report table in this epic reads "not measured". The user chose not to add one during this epic (T-0001 stage 6, S2 option A); revisit after the 10/17 workshop.


### 2026-10-11 — handed over from T-0001 security review (user: decide later, record now)

- Record an open question: should `scripts/verify-project.py` (or CI) reject absolute local paths such as `/Users/`, `/home/` or `~/` in tracked files? Found when review records carried them (T-0001 S-1); existing skill files under `.claude/skills/` also contain such paths.
- Record an open question: should `vue-tsc --noEmit` run in CI? Today nothing typechecks, so a renamed export silently becomes `undefined` in a consumer (T-0001 S-2); 100 existing errors must be cleared first.

### 2026-10-14 — handed over from T-0008 review (scope for the user to confirm at T-0009's plan)

- Candidate open question: the locale redirect in `.vitepress/theme/index.ts` is held until the session has a recorded decision. The reason its comment gave (a clear deletes `wxl-locale`) no longer holds: the key is exempt from the clear. What the hold should guard while the choice is open is not settled; the `cleared` decision's own hold, against a navigation racing the reload, is not in question.
- Candidate record: two defensive guards are reached by no test — `evaluate`'s `if (databaseDeletedState.value) return` (no path reaches it with the flag set today: `evaluate` runs once per document, at mount, before any clear) and the `!databaseDeleted` term of the continue `v-if` (never alone, since `clearStarted` is set in every state where the choice shows with the flag set).

### 2026-10-14 — test plan table (approved by the user before the first change: "follow your recommendations")

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| — | OQ-003 stays `open` and lists every key and state that `SessionGate-truth.test.ts` compares by exact equality, both locales | `OPEN-QUESTIONS.md` | T40 | the list checked against the test file, no more and no fewer |
| — | new OQ-007: the in-memory attack session saved back, with the save path's missing gate check, the sweep failure's missing reload and the marker before the reload quoted with current line numbers; adds T-0004 security's case of another tab writing back after a successful clear | `OPEN-QUESTIONS.md` | T41 | line references match the current code |
| — | OQ-001: revisit condition met; the in-flight withdrawal still holds (T11a, T13); old identifier and line references updated | `OPEN-QUESTIONS.md` | T42 | as above |
| — | new OQ-008: CI-2's two paths where the gate asks without detected evidence (start record restored; detection threw), with line references | `OPEN-QUESTIONS.md` | T44 | as above |
| — | handed-over entries: OQ-009 coverage provider; OQ-010 local absolute paths in tracked files; OQ-011 `vue-tsc` in CI; OQ-012 the locale redirect's hold; OQ-013 the two guards no test reaches | `OPEN-QUESTIONS.md` | — (Comments above) | each with evidence and a revisit condition that is a state |
| — | no tracked content names anything outside this repository | diff | R1 | a grep over the diff |
| regression | `pnpm vitest run`, `python3 scripts/verify-project.py`, the prose audit where it runs locally | — | — | test count unchanged |

No code changes, so no mutation check and no build, smoke or challenge run beyond what CI does.

### 2026-10-14 — scope added by the user: T34

While listing OQ-003's pinned keys, T34 (P11a at seam S2, AC-7) turned out to have no test: no ticket in this epic claimed
it and `SessionGate-truth.test.ts` has no P11a case. The user chose option A: add it here rather than record the gap
(B) or open T-0010 (C). Option A as presented: en and zh-TW, preconditions first (start record present, reopening the
database shows no learner rows), then `body_unconfirmed` by exact equality, through `inNewDocument`. The site-root case
was added after the choice, as P11r does it, and stated to the user in the same turn. Added row:

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S2 truth | P11a (P5, then a new document): the start record is in `sessionStorage`, `indexedDB.databases()` is empty and reopening the database shows no stores; then `title`, `body_unconfirmed` and `clear` by exact equality, no report heading, hint, raw error or retry hint, and no continue, reload or dismiss | rendered gate | T34, T28, AC-7 | en and zh-TW on a challenge page, en on the site root |

This supersedes two lines of the plan above: the regression boundary "test count unchanged" (now 2170 → 2173) and "No
code changes, so no mutation check" (the new test gets one). The Deliverable and the zh-TW summary at the top name two
new entries; seven were added (OQ-007 to OQ-013), the five beyond T41 and T44 from the handed-over items.

### 2026-10-14 — red → green and records

Surface for the checks below: vitest with happy-dom and fake-indexeddb, not a browser.

1. T34 (P11a), en and zh-TW on a challenge page and en on the site root: green on first run, as expected, since the
   behaviour already existed. After stage 6 strengthened the preconditions and added `title`, `clear` and the retry hint,
   the mutation checks were run again, each restored: the zh-TW `body_unconfirmed` replaced with a sentence claiming the
   work was deleted turned the zh-TW case red; dropping the restore of the start record in `evaluate` turned all three
   red (on a challenge page the standing body showed; on the site root the gate did not show at all); letting reload show
   without a report turned all three red.
2. `OPEN-QUESTIONS.md`:
   - OQ-001 (T42): re-checked; line references updated; the in-flight withdrawal still holds (T11a, T13); the old flag
     name recorded as renamed (round-2 K-13).
   - OQ-003 (T40): stays `open`; lists every `session_gate` key with the states S2 compares it in, checked against
     `SessionGate-truth.test.ts` one `it.each` at a time (round-2 V-12), including the site-root comparisons and the new
     P11a case; names what is not compared.
   - OQ-007 (T41): the in-memory write-back, with code quoted at the save path, the sweep failure's return and the
     marker before the reload, and T-0004 security's case of another tab after a successful clear, marked inferred.
   - OQ-008 (T44): CI-2's two unbacked paths, code quoted with line references.
   - OQ-009 to OQ-013: the five handed-over items above (coverage provider, local paths, `vue-tsc` in CI, the locale
     redirect's hold, the two untested guards). For OQ-013, each guard was deleted in turn and the unit suite run: 2173
     passed both times, restored.
   - Round-2 V-13 (T41 and T42 had no criteria): met by the content those rows name, quoted above.
3. R1, read as "nothing outside this repository and its declared dependencies": added lines grepped for URLs, local
   paths, `.com`, `.tw`, `@` and platform names; the hits are the `@vitest/coverage-*` package name and the
   `/Users/<name>` pattern OQ-010 describes. Packages named (`fake-indexeddb`, `vue-tsc`) are dependencies in
   `package.json`.

For the epic close-out: P11b (a new document after the reload exit) has no S2 literal test; T28 gives it P11a's columns
and T-0003 expected "their own tickets" to add such states, but none did. The spec's S2 rows do not name it.

### 2026-10-14 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S2 truth (vitest, happy-dom, fake-indexeddb) | P11a: three cases (en and zh-TW on a challenge page, en on the site root); 124 files, 2173 tests (2170 before) | Not measured: no coverage provider (user decision, T-0001; now OQ-009) | T34, T28, AC-7 | P11b is not compared by literal (above) |
| Documents | `OPEN-QUESTIONS.md` entries checked against the code and test files named in them | Not measured | T40, T41, T42, T44, AC-13, R1 | — |
| Configuration and types | `python3 scripts/verify-project.py` PASS; `vue-tsc` 100 errors, the baseline, none in the test file; the prose audit skips `.proj` paths | Not measured | — | — |

### 2026-10-14 — stage 6 code review

Two `harness-reviewer` subagents, Standards (22 findings) and Spec (17), over the uncommitted change against `2099b9b`.
Both verified every `path:line` and the OQ-003 table cell by cell. All findings were within the ticket and changed no
product behaviour, so they were fixed under the user's standing authorisation unless stated.

| Finding | Disposition |
|---|---|
| Standards 1, Spec F3: OQ-003's Reason and Evidence still said a false hint turns no test red | Fixed: split into before and since epic 0001; Blocks names what is still not compared |
| Spec F2: "compares each rendered string" | Fixed: "the strings below" |
| Standards 6, Spec F1: site-root comparisons listed only P11a and P11r in en | Fixed: P10b and P10c in both locales added, with the keys compared |
| Standards 2, Spec F8: "between `writeMarker()` and `reload()`" is synchronous | Fixed: the window is after `reload()` and before unload; a save already awaiting `getDb()` added as inferred |
| Standards 3, Spec F5: the P11a precondition was vacuous and broke the helper's order | Fixed: `indexedDB.databases()` then `storeNamesOnReopen()`, as P5 |
| Spec F4, Standards 14: `retry-hint`, `title` and `clear` not asserted | Fixed; OQ-003 now lists P11a under `title` and `clear` |
| Standards 4, Spec F12: OQ-011 overclaimed; `vue-tsc` not run here | Fixed: run (100); wording narrowed; T-0005's interim 101 noted |
| Standards 5, Spec F16: OQ-009's revisit condition was a date | Fixed: a state |
| Standards 7, Spec F11: OQ-010 missed test fixtures and `~/` | Fixed |
| Standards 8: T-0004's write-back case marked verified | Fixed: under "Inferred" |
| Standards 9: OQ-013 "turns nothing red" unverified | Fixed: verified by deleting each guard |
| Standards 10, Spec F6: plan row said P4, test does P5 | Fixed: the row says P5 |
| Standards 11, Spec F13: plan lines and Deliverable not updated | Recorded as superseded under the T34 section; the ticket body is left as written |
| Standards 12: the added row's approval | Recorded what option A contained and that the site-root case came after |
| Standards 13: no verification surface stated | Fixed |
| Standards 15, Spec F10: OQ-008 had no quoted code | Fixed |
| Standards 16: bare "session" | Fixed: "attack session", "browser session" |
| Standards 17: paragraphs outside the entry shape | OQ-003's moved into Evidence; OQ-001's "Re-checked" kept as the resolution of a resolved entry |
| Standards 18, 19, Spec F9, F17: missing or loose line numbers | Fixed (`en.json:132`, `traceability.md:61-85`, `useAttackSession.ts:92`, `:599`/`:601`, `:409-415`, `index.ts:120-170`) |
| Standards 20: R1 undefined in the repository | Recorded how it was read |
| Standards 21: P11a setup repeats P5's | No change: the file writes each setup out |
| Standards 22: "every table records Not measured" | Fixed: "or '—' for a whole-project row" |
| Spec F7: the mutation note was wrong for the site-root case | Fixed in the re-run record |
| Spec F14: round-2 V-12, V-13, K-13 not dispositioned | Fixed: recorded under the records |
| Spec F15: P11b untested | Recorded for the epic close-out |

### 2026-10-14 — stage 7 security review

Report: `.proj.specs/0001-truthful-clear-reports/review/security-T-0009.md`. One candidate pass, unfiltered, then an
independent false-positive pass over all ten candidates; the parent read the read and write paths the second pass cited;
commit messages scanned. No confirmed security defect and none at the reporting threshold. Fixed under the standing
authorisation, as documentation accuracy within OQ-007 (T41's "in-memory write-back"): the entry now covers every
write path without a gate check, not only the attack session's, and the second pass's finding that notes and the code
draft are loaded at mount whatever the gate says — so after a sweep failure acknowledged with dismiss, one edit can
write the previous learner's content back (verified by reading `usePentestNotes.ts:44-50`, `CodeEditorPanel.vue:178`).
The title widened from "the attack session" to "state held in memory"; the timing during the delete and whose attack
session is written back were corrected and kept as inferred. For the epic's chain analysis: this is the strongest
"writes after the delete" link found in the epic.

### 2026-10-14 — stage 8 end-to-end

Surface: the Cloudflare Pages preview of `eca83f1`, in the Claude desktop app's Browser panel, zh-TW `door-is-open`.
The ticket changes no product code, so the check is that the built site serves the gate as on `main`: with a note draft
planted and `sessionStorage` cleared, a reload showed P0 — the title, the standing body, continue and clear, no dismiss or
reload. The new P11a behaviour was checked in this browser on T-0008's preview (stage 8 there).
