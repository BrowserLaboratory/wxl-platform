---
id: T-0040
title: create:challenge gives a documented status when writing the scaffold fails
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Known edge left by T-0030 (open point 5); the spec defines no status for it and the user deferred it on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0030-create-challenge-regenerates-redirects.md:205, :246, :264, :303 (open point 5); traceability.md D13"
pending_on: 2026-10-24
revisit_when: "An epic touches create:challenge again, or a teacher reports a half-written challenge directory."
---

## Context

`pnpm create:challenge` (`scripts/create-challenge.ts`, `run()`) returns 1 for "nothing was
written" (bad arguments, a name collision), 2 when `_redirects` was not regenerated (W1) and 3 when
keygen failed after the scaffold was written (W2, D13). When writing the scaffold itself fails
part-way (for example a full disk or a permission error after some files exist), the write throws
out of `run()`, so the process exits 1 through an uncaught exception, after a partial write. Status 1
then claims "nothing was written" while files exist, the case D13 was meant to avoid. T-0030 found it
and left it as open point 5; no matrix row covers it.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

A failing scaffold write ends with a documented status and message, and the teacher learns which files were left behind.

## Acceptance criteria

- [ ] The spec names the status and message for a failing scaffold write (a new status, or 3 with a message, decided at the start)
- [ ] A test at seam 0007-S4 makes a scaffold write fail after the first file and observes the status, the message and the files left
- [ ] wxl-create's Step 2 handles the status (four skill files)

## 給使用者（zh-TW）

建題時如果寫入題目骨架寫到一半失敗（例如磁碟滿了、沒有權限），`create:challenge` 現在會因為未捕捉的例外以 1 結束，但結束狀態 1 的意思是「什麼都沒寫」，實際上已經留下部分檔案。這張票要替這種情況定一個明確的結束狀態與訊息，並告訴老師留下了哪些檔案。

## Comments
