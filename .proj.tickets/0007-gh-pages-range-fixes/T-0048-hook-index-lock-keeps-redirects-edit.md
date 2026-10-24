---
id: T-0048
title: On an index.lock failure the pre-commit hook puts back the teacher's own edit of _redirects
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "A decision the user kept for later on 2026-10-24 (T-0034, revision 3.2): O5 allows the current behaviour."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0034-hook-failure-paths.md:1076-1078 (H52, \"B R2-S4\"), :1116; traceability.md O5 row (D16 (b)) and the `_redirects` constraint (around :292, :307)"
pending_on: 2026-10-24
revisit_when: "The user rules on it, or a teacher reports a lost hand edit of _redirects."
---

## Context

When a commit runs on `index.lock` (`git commit -a`, `-i`, `-p`) and is interrupted or fails
after the hook has started staging `_redirects`, git discards the lock, so `.git/index` keeps its old
`_redirects`. The working tree's `_redirects`, however, holds the expected content the hook wrote,
and a hand edit the teacher had made to it is gone. O5's working-tree column allows this on
`index.lock` (D16 (b)); H52 asserts it. The hook keeps the original bytes in `$WORK/saved` during the
run and could put them back on this path too, which would add a guarantee (global rule 5: check side
effects first).

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

The user's ruling is applied: either the hook puts the teacher's `_redirects` bytes back on an `index.lock` failure, or the documents say the hand edit is replaced.

## Acceptance criteria

- [ ] The user decides between the two
- [ ] If restored: a case at seam 0007-S5 (extending H52) observes the original bytes, and O5's row is revised
- [ ] If documented: T-0039's or a later document names it

## 給使用者（zh-TW）

在 `git commit -a`／`-i`／`-p` 中途失敗時，working tree 的 `_redirects` 會變成 hook 產生的內容，老師原本的手動修改不會放回去（spec 3.2 版的 O5 允許這樣）。這張票等使用者決定：要讓 hook 把原本的內容放回去，還是在文件寫明會被取代。

## Comments
