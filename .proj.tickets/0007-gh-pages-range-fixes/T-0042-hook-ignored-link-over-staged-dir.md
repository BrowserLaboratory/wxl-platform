---
id: T-0042
title: The pre-commit hook keeps an ignored symbolic link that replaced a directory of newly staged files
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Known edge found in T-0032 stage 6; it predates the epic and no work is lost outside the repository. Deferred on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0032-hook-regenerates-and-stages.md:676 (known edge 6, with the probe that reproduces it); review/security-T-0032.md \"已知、未修的邊界情況\""
pending_on: 2026-10-24
revisit_when: "A teacher reports a vanished directory after a commit, or an epic changes how the hook stashes."
---

## Context

A teacher stages new files under `platform/` (for example `<slug>/src/app.py`), then moves
`src/` out of the repository and links it back with a symbolic link that is ignored (for example in
`.git/info/exclude`). When another unstaged change under `platform/` makes the hook stash,
`git stash push --keep-index --include-untracked` turns the link back into a real directory holding
the staged files. Ignored entries do not enter the stash, so nothing restores the link, and the
hook's removal step then removes those files: `src` disappears from the working tree. The files
outside the repository stay intact and the hook exits 0, so B2 holds as written, but the teacher's
link is gone. `a54e917`'s hook used the same push; its `stash pop` left `src` a real directory.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

After the hook runs, an ignored link that replaced a directory of staged files is still a link, or the hook refuses before stashing and says why.

## Acceptance criteria

- [ ] A case at seam 0007-S5 reproduces T-0032's probe and observes the link after the run
- [ ] The fix keeps every other S5 case green under /bin/bash 3.2 and bash 5

## 給使用者（zh-TW）

老師把已 stage 的資料夾搬出 repo、再用被忽略的 symbolic link 接回來時，hook 暫存再還原後，這個 link 會消失（repo 外的檔案不受影響）。這張票要讓 link 保留下來，或在暫存前拒絕並說明原因。

## Comments
