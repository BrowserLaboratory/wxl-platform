---
id: T-0049
title: The wording of W9's third form is settled
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "A wording decision the user kept for later on 2026-10-24 (T-0034, revision 3.2)."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0034-hook-failure-paths.md:1041 (\"A R2-S4\"), :1116; scripts/pre-commit.sh:294; traceability.md W9 row and its paragraph on the three forms"
pending_on: 2026-10-24
revisit_when: "The user rules on it, or T-0039 writes the W9 documentation."
---

## Context

W9's third form is printed when a `git stash push` stopped partway on the repository's own index
after changing it (D16 (b)). Its text says the unstaged changes are back, "so git stash apply <id> is
not needed", that the entry keeps what was staged, and prints `git restore --staged --source=<id>^2
-- …` to put the index back. Review round 2 found that a test took the id from the "is not needed"
sentence; the test now takes it from the `git restore --staged` command, and the sentence was kept.
Whether the sentence helps a teacher or invites them to run `git stash apply` anyway is the user's
call.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

W9's third form reads as the user decides, and the traceability row, the tests and the documents agree with it.

## Acceptance criteria

- [ ] The user decides whether to keep, reword or drop the sentence
- [ ] If changed: `scripts/pre-commit.sh`, W9's row in traceability.md and the S5 case that checks the third form change together

## 給使用者（zh-TW）

hook 的 W9 第三種訊息裡有一句「所以不需要 `git stash apply <id>`」。這句是否保留、改寫或刪除，等使用者決定；改的話，hook、traceability 與測試要一起改。

## Comments

### 2026-10-24 — revisit trigger fired (T-0039)

T-0039 wrote the W9 documents this ticket's `revisit_when` names: the "Committing challenges" /
「commit 題目」 section of both READMEs describes the third form and H51's extra line without
quoting the sentence in question; it says that when `git restore --staged --source=<id>^2` is the
only command printed, the unstaged files are already back. That is the fact the sentence states, so
keeping, rewording or dropping it does not change the README. The ruling stays the user's and the
status stays `pending`.
