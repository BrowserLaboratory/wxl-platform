---
id: T-0023
title: Git steps and next steps
epic: 0005-create-wxl
status: todo
blocked_by: [T-0022]
---

## Context

After the engine applies the setup, create-wxl turns the range into a git repository on `main` with one
commit (G0–G4), isolated from the teacher's git environment and global configuration, and prints the
next steps N1–N8 for the chosen host. Git problems are warnings: the range stays and the remaining
commands are printed.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Git steps", "Next
steps", step 12–13.

## Deliverable

A configured run ends with a repository holding exactly one commit `Create range from WXL <V>`, no hook
run, a clean status, and the next-step lines for its host; missing git, an old git, a missing identity
or a failing git command each print their warning and the commands still to run, and exit 0.

## Acceptance criteria

- [ ] C35: real git, isolated identity, a global template `post-commit` hook, `commit.gpgsign=true` → on `main`, one commit, `git ls-files` equals the range's files, clean status, hook not run (AC-15)
- [ ] C36: `runGit` rejects `ENOENT` on G0; G0 reports 2.19.0 → CW-W01, no further `runGit`, exit 0, N2 lists printed G1, G2, G4 (AC-15)
- [ ] C37: no identity (isolated `HOME`, `XDG_CONFIG_HOME`, system config off) → CW-W02 after G1–G2, no G4, not CW-W03, exit 0, N2 lists the two config commands then G4 (AC-15)
- [ ] C38: G2 exits 1 → CW-W03, G3 and G4 not run, exit 0, N2 lists printed G2 and G4 (AC-15)
- [ ] C40: success for each host → the "Next steps" lines for that case, ids in order (AC-17)
- [ ] C58: `deps.env` with `GIT_DIR=/elsewhere` → no `runGit` call receives `GIT_DIR` (AC-15)
- [ ] C59: global `core.excludesFile` ignoring `lib/`, archive file under `lib/` → the file is in the commit (AC-15)
- [ ] C70: every `runGit` env of C35 has no `GIT_*` other than `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1` (AC-15)

## 給使用者（zh-TW）

套用設定後，create-wxl 把靶場變成 git repository：`main` 分支、一個 commit，不受老師的 git 全域設定與 hook 影響；最後依主機印出下一步（建 GitHub repository、push、設定 Pages 等）。沒有 git、git 太舊、沒設身分或指令失敗都只是警告，靶場保留並印出還沒跑的指令。

## Comments
