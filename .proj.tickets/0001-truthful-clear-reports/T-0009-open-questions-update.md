---
id: T-0009
title: Update open questions for this epic
epic: 0001-truthful-clear-reports
status: todo
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

- [ ] T40: OQ-003 stays `open` and lists exactly the keys and states pinned by literal comparison.
- [ ] T42: OQ-001 records that its revisit condition was met, that the in-flight withdrawal still holds (T11a, T13), and has updated line references.
- [ ] T41 and T44: new entries with evidence quoted inline and their revisit conditions (AC-13).
- [ ] No tracked content mentions anything outside this repository (rule R1).

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
