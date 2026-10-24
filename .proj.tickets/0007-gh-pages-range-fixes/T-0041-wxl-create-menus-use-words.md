---
id: T-0041
title: wxl-create's Step 1 and Step 7 menus answer with words, not digits
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Out of T-0031's scope (P7 covers Step 2 only); recorded on 2026-10-24 so it is not lost."
pending_evidence: ".claude/skills/wxl-create/SKILL.md Step 1 (the per-round block \"1) <option-A> 2) <option-B>\", the confirmation \"1) 確認 2) 修改參數\"); .proj.tickets/0007-gh-pages-range-fixes/T-0031-wxl-create-branches-on-status.md:171, :185"
pending_on: 2026-10-24
revisit_when: "An epic edits the wxl-create skill, or an agent is seen to confuse a menu digit with an exit status."
---

## Context

T-0031 changed wxl-create's Step 2 menu to answer with words (`change`, `cancel`) so that an
agent cannot mistake a menu digit for `create:challenge`'s exit status (D13). Step 1's per-round
option blocks (`1) flask 2) fastapi 3) php`, `1) easy 2) medium 3) hard`), its confirmation block
(`1) 確認 2) 修改參數`, "on `2`, re-ask") and Step 7 still answer with digits, and Step 7 still
says "exit 0". Stage 6 of T-0031 rejected widening the scope (findings 7, 20, 21): no exit status is
in play in Step 1, so the collision D13 addresses cannot happen there. The inconsistency remains.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

Every menu in the four wxl-create skill files answers with words, or the files say once why digits are safe outside Step 2.

## Acceptance criteria

- [ ] Decide: words everywhere, or a stated rule for when digits are allowed
- [ ] The four files (`.claude` and `.agents`, English and Traditional Chinese) say the same thing
- [ ] `python3 scripts/verify-project.py` passes

## 給使用者（zh-TW）

wxl-create 的 Step 2 已改成用文字回覆，但 Step 1 的選項與確認選單、Step 7 仍用數字。這張票要決定是否全部改成文字，或寫明 Step 2 以外為什麼可以用數字，並讓四份 skill 檔一致。

## Comments
