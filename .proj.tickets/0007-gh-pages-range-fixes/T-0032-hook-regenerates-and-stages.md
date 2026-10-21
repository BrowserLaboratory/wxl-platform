---
id: T-0032
title: The pre-commit hook regenerates and stages _redirects from the staged snapshot
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: []
---

## Context

Today the pre-commit hook only validates staged `platform/challenge/` paths, so every challenge
change reaches CI with a stale `_redirects`. This ticket makes the hook regenerate and stage the
file. It triggers whenever a commit carries a change at a watched path: either challenge tree, or
`_redirects` itself (D5). It generates over the staged snapshot with the per-tree index slugs, and
puts the teacher's other unstaged work back byte for byte. On an index other than its own, it
refuses, so this ticket can land without the later hook tickets and still leaves `main` safe.

Spec: `traceability.md` revision 3, "The hook" (trigger, commit forms, constraints, O1–O4), the
vocabulary for index slugs and the expected `_redirects`, messages W3, W4, W5 and W8, and seam
0007-S5. S5 replaces the test's own copy of the hook with the real one.

## Deliverable

A commit that adds, translates, deletes, renames or un-retires a challenge, or hand-edits
`_redirects`, carries the expected `_redirects`. Untracked and ignored challenge directories are
left out. Every other unstaged change and untracked file under `platform/` is restored. A path
commit that triggers is refused with W8.

## Acceptance criteria

- [ ] H01–H05: new challenge (two working-tree variants, no W3), Traditional Chinese brief, deletion and rename of both trees, application-only change → O2 with the expected file (AC-12)
- [ ] H06: nothing at a watched path → O1 (AC-13)
- [ ] H07: only `_redirects` hand-edited, through `git commit` → O2, W3; git records a commit that changes nothing (AC-12)
- [ ] H08–H10, H19: untracked challenge, unstaged tracked changes, a different unstaged `_redirects` (W3 and W4), overlapping hunks → as the rows say (AC-12, AC-14)
- [ ] H11: hand-edited staged `_redirects` with a challenge change → replaced, W3 (AC-12)
- [ ] H12, H13, H15: validator failure → O3; Traditional Chinese number mismatch → O4 with W5; today's cases keep their statuses (AC-15)
- [ ] H14: only a Traditional Chinese brief → O2, validator does not run (AC-16)
- [ ] H16: bypasses are left to the guard; stage 6 confirms the guard is unchanged (AC-17)
- [ ] H18, H20, H23, H24, H40, H43: missing `_redirects`; ignored directory; un-retire; type change to a symbolic link; only the brief deleted; unstaged number edit → as the rows say (AC-12)
- [ ] H29, H30: the pre-existing stash entry kept; the real repository's `_redirects`, index and stash list unchanged (AC-23)
- [ ] H31: `git commit -a` after a `create:challenge`-like change → expected file without the untracked rule, W3 and W4 (AC-22)
- [ ] H33: `git commit -- <path>` and `--only <path>` → exit 1, W8, nothing changed, no commit (AC-22)
- [ ] H44: a range whose committed `_redirects` has the pre-0007 header → O2 with the new header (AC-22)
- [ ] P6: the hook's header comment and the generator's `includeSlug` comment describe the watched paths, the index-slug rule, D3 and the unchanged `ACMRD` filter (AC-24)
- [ ] G01 at stage 6: the guard test's assertion, inclusion rule and CI steps unchanged; `includeSlug`'s new locale argument leaves the guard's call unchanged (AC-17)
- [ ] Stage 8: V03 as far as this ticket's change reaches (AC-20)

## 給使用者（zh-TW）

pre-commit hook 會在 commit 帶有題目變更、或帶有 `_redirects` 本身的變更時，依 staged 的內容重新產生並 stage `_redirects`。未追蹤、被忽略的目錄不會算進去，其他尚未 commit 的工作會原樣還原。帶路徑的 commit（`git commit -- <path>`）在這種情況下會被拒絕，並說明改用 stage 後再 commit。孤兒說明頁、中斷與還原失敗分別由 T-0033、T-0034 處理。

## Comments
