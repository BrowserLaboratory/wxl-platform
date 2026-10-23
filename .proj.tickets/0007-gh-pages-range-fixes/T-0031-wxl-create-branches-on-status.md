---
id: T-0031
title: wxl-create Step 2 branches on create:challenge's exit status
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0030]
---

## Context

wxl-create's Step 2 runs `pnpm create:challenge` and today reads every exit status 1 as a name
collision, re-asking the name. With T-0030, status 1 means nothing was written, 2 means the
challenge was created without regenerating `_redirects`, and 3 means keygen failed after the
scaffold was written. Re-asking the name on 2 or 3 would leave an orphan scaffold that holds a
number. Step 2's plain-text menu also answers with `1` and `2`, which an agent can mistake for exit
statuses.

Spec: `traceability.md` revision 3, passage P7 and decision D13; `spec.en.md` "wxl-create".

## Deliverable

Step 2 in all four wxl-create skill files (`.claude` and `.agents`, English and Traditional
Chinese) handles each exit status as P7 requires.

## Acceptance criteria

- [ ] P7: exit status 2 → surface W1, continue to Step 3 (AC-24)
- [ ] P7: exit status 3 → surface W2 and stop, telling the teacher to run `pnpm challenge:keygen <slug>` once the cause is fixed and to resume at Step 3 (AC-24)
- [ ] P7: only exit status 1 re-asks the name; the menu's choices are words, not digits; every status is written as "exit status N" (AC-24)
- [ ] P7: Verification accepts exit status 0, and exit status 2 once its message is surfaced (AC-24)
- [ ] The four files say the same thing, each in its own language
- [ ] `python3 scripts/verify-project.py` passes

## 給使用者（zh-TW）

wxl-create 的 Step 2 依 `create:challenge` 的結束狀態分開處理：2 轉述訊息後繼續，3 轉述訊息後停下來，並請老師修好原因後重跑 keygen；只有 1 才會重問名稱。選單改用文字選項，避免和結束狀態的數字混淆。四份 skill 檔一起改。

## Comments
