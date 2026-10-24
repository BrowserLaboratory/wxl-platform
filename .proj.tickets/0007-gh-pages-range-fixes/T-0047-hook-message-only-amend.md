---
id: T-0047
title: A message-only --amend of a commit with a stale _redirects is repaired or refused
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Follows the trigger rule as written; known edge from T-0035 open point 3. Deferred on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0035-hook-commit-forms.md:125-129, :168-172 (open point 3), :263"
pending_on: 2026-10-24
revisit_when: "A teacher reports a CI guard failure after amending, or an epic changes the hook trigger."
---

## Context

The hook triggers when "the staged snapshot differs from `HEAD` at a watched path". Under
`git commit --amend`, `HEAD` is the commit being amended. When that commit bypassed the hook (for
example `--no-verify`) and carries a stale `_redirects`, amending only its message changes no watched
path, so the hook does not run and the stale file stays. CI's guard (B3) fails the push, and E1's
repair fixes it, but the local commit did not catch it. H32 does not pin whether the trigger compares
with `HEAD` or `HEAD~1`; only this case would tell them apart.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

A message-only amend of such a commit either regenerates `_redirects` or is refused locally, as the spec decides.

## Acceptance criteria

- [ ] Decide whether the trigger also checks the committed `_redirects` against the expected one
- [ ] A case at seam 0007-S5 covers a message-only amend of a stale commit and pins the trigger's base

## 給使用者（zh-TW）

如果某個 commit 當初用 `--no-verify` 帶著過期的 `_redirects` 進來，之後只改訊息的 `--amend` 不會觸發 hook，過期檔會留著，要等 push 後 CI 才擋。這張票要決定是否在本機修正或拒絕，並補上測試。

## Comments
