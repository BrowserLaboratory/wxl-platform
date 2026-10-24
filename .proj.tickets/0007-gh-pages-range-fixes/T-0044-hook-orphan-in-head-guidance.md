---
id: T-0044
title: An orphan brief already in HEAD tells the teacher how to get unstuck
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Behaviour follows D12 as written; recorded on 2026-10-24 as a usability edge from T-0033."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0033-hook-refuses-orphan-brief.md:214-215 (Known edges, point 7), :345"
pending_on: 2026-10-24
revisit_when: "A teacher reports being unable to commit after pulling or after a --no-verify commit, or T-0039 writes the W6 documentation."
---

## Context

D12 refuses a commit whose staged snapshot holds an orphan brief, and the check reads the whole
snapshot, not the diff. An orphan that reached `HEAD` another way (`--no-verify`, a merge git
concluded itself, a pull of someone else's commit) therefore blocks every later commit that triggers
the hook, even one that only edits an unrelated challenge, until the orphan is fixed. W6 names the
brief, but a teacher who did not create the orphan may not see why their own change is refused.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

The refusal tells a teacher whose own change did not create the orphan what to do, or the documents do.

## Acceptance criteria

- [ ] Decide: keep the snapshot rule and improve W6 or the documents, or limit the refusal to orphans the commit creates
- [ ] A case at seam 0007-S5 covers an orphan in `HEAD` with an unrelated staged change and checks the wording

## 給使用者（zh-TW）

如果孤兒說明頁已經在 `HEAD` 裡（例如有人用 `--no-verify` commit），之後每一個會觸發 hook 的 commit 都會被擋，即使老師改的是別的題目。這張票要讓拒絕訊息或文件告訴老師怎麼解，或改成只擋這次 commit 造成的孤兒。

## Comments
