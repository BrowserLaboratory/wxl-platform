---
id: T-0045
title: The pre-commit hook's finish path handles four rare failures that were only read from the code
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Rare ends recorded as known edges in T-0034, none reproduced; deferred on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0034-hook-failure-paths.md:377-385, :400-402 (Known edges); scripts/pre-commit.sh `finish`, `restore_entry` (:195), `behind_link` (:179)"
pending_on: 2026-10-24
revisit_when: "A teacher reports a stash entry the hook left unexplained, or an epic changes the hook's restore."
---

## Context

Each of these ends is read from the code and was not run:

1. **A second failed `rev-parse` of `refs/stash`.** After a push that saved an entry, `finish`
   reads `refs/stash` again to claim the entry it gained. If that read fails too, the entry stays
   unidentified: no restore, no W9, and the entry is left in `git stash list`.
2. **A failed `git stash drop` after a completed restore.** The entry stays listed and the exit
   status does not change, so nothing tells the teacher about the extra entry.
3. **A signal in the first two statements of `finish`.** A signal that arrives after a `set -e` exit
   has entered `finish` and before its `trap ''` ends the shell there, without the restore. The
   window is two shell statements long.
4. **A path skipped behind a symbolic link during the restore.** `restore_entry` skips a path whose
   parent is a link (`behind_link`), ends with a failure, and W9's first form is printed (H50 covers
   the other partial-restore cause, not this one).

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

Each of the four ends either is made impossible or ends in a documented outcome with a message, and has a case that reproduces it.

## Acceptance criteria

- [ ] For each item, a reproducing case at seam 0007-S5 (git wrapper or generator stub), or a recorded reason why it cannot be reproduced
- [ ] Items 1 and 2 tell the teacher which entry is left
- [ ] Item 3's window is closed or measured
- [ ] Item 4 has a case and its W9 form is checked

## 給使用者（zh-TW）

hook 收尾時有四種很少見、只從程式碼推論過的情況：第二次讀 `refs/stash` 也失敗、還原後 `git stash drop` 失敗、`finish` 前兩行之間收到訊號、還原時略過 symbolic link 底下的路徑。這張票要逐項重現，並讓每一種都有明確的結束方式與訊息。

## Comments
