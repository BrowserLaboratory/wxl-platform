---
id: T-0005
title: Body and report follow the failure phase (K4 wording)
epic: 0001-truthful-clear-reports
status: todo
blocked_by: [T-0003, T-0004]
---

## Context

K4: after a sweep failure, a later run whose delete is blocked is still reported with sweep-failure wording.
G5/G7: the report follows the latest started run's phase, and the unconfirmed hint must be true for blocked,
timed-out and other rejections.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Body and report follow the selection rules for every state where a delete did not finish (P2, P3, P3x, P7,
P8, P13) and where the sweep failed (P4, P5, P9, P14). The new `clear_unconfirmed_hint` ships.

## Acceptance criteria

- [ ] Body and report rows T19–T25 match the selection rules (AC-4, AC-5); the raw error line follows its rule.
- [ ] New `clear_unconfirmed_hint` ships exactly, en and zh-TW, no banned term.
- [ ] Truth rows T32 (blocked, native connection, `versionchange` and raw-error preconditions), T33, T33x (fault replacements are real `IDBRequest` instances) and T35p pass.
- [ ] Exits are not changed in this ticket beyond what existing rules already show; T-0006 owns them.
- [ ] Comment and test locations stating that the flag decides or outranks the report are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with a native blocking connection in a second tab.

## 給使用者（zh-TW）

修 K4 的說法：刪除沒完成時（被擋住、逾時、其他失敗，不論第幾次），畫面一律走「結果無法確認」那組，
提示改成兩種情況都成立的新句子；不再在刪除被擋住時顯示掃除失敗的話。

## Comments
