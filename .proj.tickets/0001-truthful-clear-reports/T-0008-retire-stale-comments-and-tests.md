---
id: T-0008
title: Retire stale gate comments and tests
epic: 0001-truthful-clear-reports
status: todo
blocked_by: [T-0007]
---

## Context

Spec T38 and T39 list every test and comment location (at `72327e2`) that states a retired claim. Earlier
tickets update the locations they touch; this ticket checks the whole list once behaviour is final.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Every location in T38 asserts the behaviour of a named T row or is deleted as unreachable, and no
location in T38 or T39 states a retired claim.

## Acceptance criteria

- [ ] Each T38 location is checked and recorded in the ticket's Comments as asserted (with its T row) or deleted (unreachable) (AC-11).
- [ ] Each T39 location is checked; none states a retired claim; any that states a selection rule matches `traceability.md` (AC-12).
- [ ] Full unit suite and site smoke pass.

## 給使用者（zh-TW）

最後比對一次：spec 列出的每一處舊測試、舊註解，都已經改成新規則或因為走不到而刪掉；沒有任何一處還寫著
「旗標代表作品已刪」「重試只補失敗的那一半」之類的舊說法。

## Comments
