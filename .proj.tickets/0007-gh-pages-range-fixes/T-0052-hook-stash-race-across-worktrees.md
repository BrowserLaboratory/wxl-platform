---
id: T-0052
title: The pre-commit hook claims only its own stash entry when another worktree commits at the same time
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Raised as N-2 by 0007's chain analysis (chain B); spec B2 lists it outside the model, but upstream's own parallel sessions use worktrees of one repository. The user chose on 2026-10-24 to state the exception in B2 and open this ticket."
pending_evidence: "scripts/pre-commit.sh claims the entry by comparing refs/stash before and after its push (lines 431-443, and in finish at 306-310) and, on index.lock, drops it (335-341) through drop_entry (228-237). Worktrees of one repository share refs/stash. The old hook (3b52e65:scripts/pre-commit.sh lines 29 and 47) used git stash pop, which takes stash@{0} the same way. The timing was not reproduced. Recorded in .proj.specs/0007-gh-pages-range-fixes/review/chain-analysis.md, chain B and N-2."
pending_on: 2026-10-24
revisit_when: "A session's hook restores or drops another session's entry, or an epic changes the hook's stash handling."
---

## Context

When two worktrees of one repository commit at the same time, the second stash push can land
between the first hook's push and its read of `refs/stash`. The first hook then restores the other
worktree's unstaged files into its own working tree, or on `index.lock` drops the other entry, and
its own entry goes unnamed. No data is lost before `git gc` prunes it, but a commit can end in O2 with
another session's changes mixed in. Spec 0007's B2 now states this as an exception for upstream's
parallel sessions (revision 3.3).

A guard was proposed and not checked: a one-time nonce in the push message, claiming only when
`stash@{0}` carries it and its first parent is `HEAD`, and comparing the id again just before a drop.
It must be checked against outcomes O1–O7 before it is adopted, since a new guarantee can conflict
with them.

## Deliverable

The hook names, restores and drops only the entry its own push made, even when another worktree
pushes to `refs/stash` during the commit.

## Acceptance criteria

- [ ] A design that is checked against O1–O7 and the existing S5 cases before code is written
- [ ] A case at seam 0007-S5 with a second push to `refs/stash` between the hook's push and its claim, and the hook leaving that entry alone

## 給使用者（zh-TW）

同一個 repository 的兩個 worktree 同時 commit 時，hook 可能把另一個 worktree 的 stash entry 當成自己的，把別人的變更還原到自己的工作目錄，或在 `index.lock` 上把它 drop 掉。spec 原本把這列在模型外，但 upstream 自己平行開發時就會用多個 worktree。這張票要讓 hook 只處理自己 push 的那一筆；動手前，要先確認新的防護不會和 O1～O7 衝突。

## Comments
