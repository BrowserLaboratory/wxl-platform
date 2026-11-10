---
id: T-0064
title: G4 runs no hook from the file-system root
epic: maintenance
status: todo
blocked_by: []
---

## Context

Epic 0005's chain analysis (`.proj.specs/0005-create-wxl/review/chain-analysis.md`, spec gap 2)
found that B7's "G4 runs without hooks" does not hold. G4 commits with an empty `core.hooksPath`,
and git then looks hooks up at the file-system root (`git -c core.hooksPath= rev-parse --git-path
hooks/post-commit` prints `/post-commit`); `--no-verify` skips only `pre-commit` and `commit-msg`, so
`prepare-commit-msg`, `post-commit` and the others are looked up there. The chain analysis judged
it not a chain (only root can write `/` on POSIX, and another user on the same machine is outside
B1–B7), so this is a spec-accuracy fix. T-0061's stage 1 (2026-11-09) set it apart from T-0061, and
the user's authorisation of 2026-11-10 opened this ticket, to be done after the release that
follows epic 0006 revision 3.

## Maintenance plan (the requirement)

- R1: G4 points `core.hooksPath` at a directory this run creates and knows to be empty (for example
  a path under `<target>/.git` that does not exist), never an empty value and never `/dev/null`
  (Git for Windows resolves `/dev/null/<hook>` to `<drive>:\dev\null\<hook>`).
- R2: 0005's `traceability.md` G4 and spec B7 say so; T-0023's Deliverable's "no hook run" is
  narrowed to "no template hook run", as AC-15 already says.
- R3: a create-wxl test shows that a hook placed where the empty `core.hooksPath` would have found
  it is not run by G4.

## Deliverable

`npm create wxl` commits the new range without running any hook from outside the range, and 0005's
spec says what G4 actually does.

## Acceptance criteria

- [ ] R1
- [ ] R2
- [ ] R3

## 給使用者（zh-TW）

0005 串連分析的缺口 2：建立靶場時的第一個 commit（G4）把 `core.hooksPath` 設成空值，git 因此會到檔案系統根目錄找 hook；`--no-verify` 只略過 pre-commit 與 commit-msg，其他 hook 仍會去根目錄找。串連分析判定它不成鏈，所以這是 spec 準確度的修正：改成指向這次執行自己建立、確定是空的資料夾，並更新 0005 的 G4、B7 與 T-0023 的措辭。排在 epic 0006 revision 3 之後的發布完成後再做。

## Comments
