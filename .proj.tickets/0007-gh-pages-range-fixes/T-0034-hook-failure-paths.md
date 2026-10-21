---
id: T-0034
title: The pre-commit hook ends cleanly on interruption, git failures and a first commit
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0032]
---

## Context

T-0032's hook stashes the teacher's other unstaged work under `platform/` while it generates. This
ticket makes every way that run can end safe:
- A signal or a failed git command restores the work and drops only the hook's own entry (O5).
- A restore that fails keeps the entry and prints its id (O7).
- The hook never restores into an index file that git has already removed.
- It identifies its entry by the change to `refs/stash`. A push that saves nothing must not make it
  touch the teacher's own entry.
- A first commit with unstaged files is refused (O6).
- It works under macOS's `/bin/bash` 3.2, where an empty array under `set -u` ends the shell.

Spec: `traceability.md` revision 3, "The hook" constraints, outcomes O5–O7, messages W7 and W9,
seam 0007-S5 (generator stubs, the path with a space and non-ASCII characters, `GIT_*` removed).

## Deliverable

Interruption, git failures, a failed restore and a first commit each end in their documented
outcome. No unstaged file is lost, and no stash entry other than the hook's own is applied or
dropped.

## Acceptance criteria

- [ ] H25: SIGINT, SIGTERM, SIGHUP to the hook's process group while a generator stub blocks → O5 (AC-23)
- [ ] H26: a generator stub leaves `.git/index.lock`, so `git add` and the restore fail → O7, W9; `git stash apply` of the printed id restores the files byte for byte once the lock is gone (AC-23)
- [ ] H27, H28: first commit with an unstaged file → O6 with W7; everything staged → O2, on their own fixture (AC-23)
- [ ] H42: only `_redirects` differs in the working tree → no entry of the hook's own; the pre-existing entry is neither applied nor dropped (AC-23)
- [ ] H45: H02, H07, H14 and H34 under `/bin/bash` 3.2 give their bash 5 outcomes; run on a Mac at stage 5, and the coverage report says so (AC-23)
- [ ] H46: `.git/index.lock` exists before a direct run → O5 before any change (AC-23)
- [ ] H47: SIGINT to a `git commit -a`'s process group → O5 or O7; `.git/index` unchanged, no commit, no unstaged file lost (AC-23)
- [ ] H29, H30 hold for each of these rows except H27 and H28, which have no pre-existing entry (AC-23)

## 給使用者（zh-TW）

讓 hook 在各種意外下都乾淨收尾：
- 被 Ctrl-C 或其他訊號中斷、git 指令失敗時，會把老師的修改放回去。
- 放不回去時保留 stash entry，並印出它的 id 與復原指令。
- 第一個 commit 還有沒 stage 的檔案時，會說明原因並拒絕。
- 在 Mac 內建的 bash 3.2 底下也照樣運作。

## Comments
