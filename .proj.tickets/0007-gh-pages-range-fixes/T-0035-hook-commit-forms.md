---
id: T-0035
title: The pre-commit hook gives the expected _redirects in every commit form it runs in
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0032]
---

## Context

git hands the pre-commit hook a different index file depending on how the commit was started. A plain
commit and `--amend` give the repository's own index; `-a`, `-i` and `-p` give `index.lock`; a linked
worktree gives its own index. T-0032 implements the predicate that treats these as the hook's own
index and refuses a path commit. This ticket proves, through real `git commit` invocations, that each
of the accepted forms commits the expected `_redirects`, and so does the repair E1 describes.

Spec: `traceability.md` revision 3, "Commit forms" and its measured table, seam 0007-S5.
T-0033 and T-0034 change the same hook and test file, so work these tickets one at a time.

## Deliverable

`--amend`, `-p`, `-i`, a linked worktree, the E1 repair and a merge whose `_redirects` conflict was
resolved that way, each commit the expected `_redirects`.

## Acceptance criteria

- [ ] H32: `git commit --amend` that adds a challenge → O2, expected file (AC-22)
- [ ] H34: stale committed `_redirects`; `pnpm redirects:generate`, `git add`, `git commit` → expected file (AC-22)
- [ ] H35: a merge whose `_redirects` conflict is resolved that way, concluded with `git commit` → expected file (AC-22)
- [ ] H36: `git commit -p` with its answers piped on stdin → O2, expected file (AC-22)
- [ ] H37: `git commit -i <path>` → O2, expected file (AC-22)
- [ ] H38: `git commit` in a linked worktree with unstaged files → O2; unstaged files byte-identical; the shared pre-existing entry still listed (AC-22)
- [ ] H29, H30 hold for each of these rows (AC-23)
- [ ] If `-p` hands the hook a different `GIT_INDEX_FILE` from the one the measured table infers, update the table in `traceability.md` before closing (`--only` is checked by H33 in T-0032)

## 給使用者（zh-TW）

用真的 `git commit` 驗證 hook 在每一種 commit 方式下都產生正確的 `_redirects`：`--amend`、`-p`、`-i`、linked worktree、照 E1 修復過期的檔，以及解完 `_redirects` 衝突的 merge。若實測發現 `-p` 或 `--only` 交給 hook 的 index 檔和 spec 的推論不同，先更新 traceability 再結案。

## Comments
