---
id: T-0007
title: A refused run adds a notice and keeps earlier state
epic: 0001-truthful-clear-reports
status: todo
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

- [ ] T9, T10a, T10b, T10d–T10g hold (AC-2).
- [ ] T26, T27, T28r, T29p match the selection rules, including reload on P11r and presentation on the site root (AC-4–AC-6).
- [ ] New `clear_retry_not_started_hint` ships exactly, en and zh-TW, no banned term.
- [ ] Truth rows T35, T35b, T35r pass using F4 and F6; P12 (T29) still shows what `72327e2` shows (AC-8).
- [ ] Comment and test locations stating that a refused run always keeps continue are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with `sessionStorage.setItem` made to throw after a failed run.

## 給使用者（zh-TW）

處理「沒能開始」的清除：前一次留下的報告和狀態都保留，下面加一句「這次沒有刪掉任何東西，請清出儲存空間或改用
一般視窗」。第一次就沒能開始時，行為跟現在一樣。

## Comments
