---
id: T-0004
title: Truthful copy after a sweep failure (K2)
epic: 0001-truthful-clear-reports
status: todo
blocked_by: [T-0002]
---

## Context

K2: after the database delete resolves and the sweep fails, the gate says the saved work was deleted and
cannot be brought back, while the learner's note draft can still be in `localStorage`. Reproduced on the
production site 2026-10-10. G4: fix the sentences, not the flag.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

After a sweep failure the gate shows the three new sentences from the copy table (`body_cleared`,
`sweep_failed`, `sweep_failed_hint`) in en and zh-TW, pinned by truth tests and by a built-site case.

## Acceptance criteria

- [ ] Copy table strings for `body_cleared`, `sweep_failed`, `sweep_failed_hint` ship exactly, en and zh-TW; none contains a banned term (CI-1).
- [ ] T30 (P4) and T31 (P5) pass on the harness: preconditions first, then literal sentences.
- [ ] T36 passes in the built site (English, `door-is-open`): literal strings, dismiss shown, continue and reload absent (AC-9).
- [ ] `CONTEXT.md`: the 新造詞 declaration of 全站清除 is removed in this change and the glossary test passes (T43, AC-14; round-2 K-1).
- [ ] Comment and test locations that describe these sentences or call the result destroyed work are updated (T38/T39 subset).
- [ ] Verified on the ticket's Cloudflare Pages preview with the sweep failure injected.

## 給使用者（zh-TW）

修 K2：掃除失敗後，畫面改成三句新文案（資料庫已刪除、其他項目沒能全部刪掉、再按一次會重試整個全站清除），
不再說「你的作品被刪了」。en、zh-TW 都有真話測試，建置後的網站上也有 K2 情境。「全站清除」第一次出現在介面，
`CONTEXT.md` 的新造詞標記同時拿掉。

## Comments
