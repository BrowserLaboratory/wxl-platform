---
id: T-0006
title: Exits follow the failure phase (K4 exits)
epic: 0001-truthful-clear-reports
status: todo
blocked_by: [T-0005]
---

## Context

K4: while a deletion may still be queued, the gate offers "Close this report and carry on", which the
platform's own rule forbids (in-memory session could be written back). G6: exits follow the phase.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

Reload is offered when a run was started, a report is on screen and the latest phase is not `'sweep'`;
dismiss only when a report is on screen and the latest phase is `'sweep'`. The composable enforces dismiss
as well as the template.

## Acceptance criteria

- [ ] Exit columns of T19–T25 match the selection rules (AC-6).
- [ ] T12, T13: dismiss is accepted only with phase `'sweep'` and refused otherwise, by the composable itself (AC-3).
- [ ] T11, T11a, T16, T16a: continue and progress access unchanged.
- [ ] T37 passes in the built site: second page at the site root holds a native connection; raw error contains "another tab still has it open"; reload shown; dismiss and continue absent (AC-10).
- [ ] Comment and test locations stating the old two-fact dismiss rule are updated (T38/T39 subset).
- [ ] Verified on the ticket's preview with the K4 setup.

## 給使用者（zh-TW）

修 K4 的出口：刪除可能還在排隊時，只給「重新載入」；只有掃除失敗（資料庫確定已刪）時才給「關掉說明」。
composable 也照同一規則擋，不只靠畫面。建置後的網站上有 K4 情境。

## Comments
