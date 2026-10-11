---
id: T-0001
title: Rename the gate flag to databaseDeleted
epic: 0001-truthful-clear-reports
status: todo
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
