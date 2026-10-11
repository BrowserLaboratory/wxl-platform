---
id: T-0003
title: Record which half of a clear run failed
epic: 0001-truthful-clear-reports
status: todo
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

- [ ] T5, T6, T6x: `'delete'` after a blocked, timed-out or otherwise rejected delete.
- [ ] T7: `'sweep'` after the sweep throws.
- [ ] T8: `null` when a run starts; T10: a later started run replaces the earlier value (`'sweep'` → `'delete'`).
- [ ] T10c: a press while a run is in flight changes nothing.
- [ ] Gate screens are unchanged (AC-8 rows and existing routing tests pass).

## 給使用者（zh-TW）

在 composable 新增「最近一次清除失敗在哪一半」：刪除失敗記 `'delete'`、掃除失敗記 `'sweep'`、開始時歸零。
這張只記狀態，畫面不變；畫面怎麼依它分支是 T-0005 的事。

## Comments
