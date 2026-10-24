---
id: T-0046
title: The hook tests' git wrapper wait loops cannot hang under a signal
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "One unexplained 60 s timeout in T-0034 round 2; not reproduced. Deferred on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0034-hook-failure-paths.md:409 (Known edges, \"The git wrapper's wait loop under a signal\"); tests/__helpers__/preCommitRepo.ts `gitWrapper`"
pending_on: 2026-10-24
revisit_when: "A hook test times out again in CI or locally."
---

## Context

During T-0034's round 2 rerun, one changed-index case timed out after 60 s while its blocker still
waited in a `sleep 0.05` shell loop. The likely cause, not reproduced: a shell that gets SIGINT while
it reaps a `sleep` that exited normally can carry on, and the loop then holds the process group's
output open. That blocker now `exec`s a single `sleep`, but `gitWrapper`'s `block` and
`run-then-block` loops, which the H25 boundary case and the push SIGINT case signal, still loop. No
timeout has been seen there yet.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

No helper used by a signalled case waits in a shell loop that a signal can leave running.

## Acceptance criteria

- [ ] `block` and `run-then-block` wait without a polling shell loop, or the loop is shown safe
- [ ] `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` passes ten times in a row under load, recorded

## 給使用者（zh-TW）

hook 測試的 git wrapper 在等待時用 shell 迴圈輪詢，T-0034 第 2 輪有一次 60 秒逾時，推測是訊號打在迴圈上造成的（未重現）。這張票要把剩下兩種等待方式改成不會被訊號卡住，並以連跑多次證明不再逾時。

## Comments
