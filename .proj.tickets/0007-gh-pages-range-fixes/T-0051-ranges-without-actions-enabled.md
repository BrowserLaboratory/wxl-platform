---
id: T-0051
title: A teacher learns that a new range's Actions must be enabled before CI runs
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Found in T-0039's stage 8 (V05) and raised as N-1 by 0007's chain analysis; the user chose on 2026-10-24 to open it as a pending ticket."
pending_evidence: "On CXPhoenix/wxl-e2e-0007, created by create-wxl 3.0.0 and pushed twice, GET actions/runs listed only the two workflow_dispatch deploys; the Actions page showed \"Workflows aren't being run on this repository\" with \"Enable Actions on this repository\", while GET actions/permissions returned enabled: true. Recorded in T-0039's stage 8 section and in .proj.specs/0007-gh-pages-range-fixes/review/chain-analysis.md, N-1."
pending_on: 2026-10-24
revisit_when: "The next change to create-wxl's next steps or the README's deployment section, or a teacher reports a range whose CI never ran."
---

## Context

A range made with create-wxl and pushed to a new GitHub repository can have its workflows switched
off: the Actions page asks the owner to enable them. Until then no push or pull request runs
Quality Gates, so the guard test (spec 0007's B3) never runs, while a `workflow_dispatch` deploy
still does. create-wxl's next steps (N3–N5) and the README's GitHub Pages section do not mention it,
so a teacher sees no failing check and reads that as a passing one.

Spec 0007's B3 now says that the guard runs only once the repository's Actions run (revision 3.3).
When this ticket is taken up it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

create-wxl's next steps and the README's GitHub Pages section tell the teacher to open the
repository's Actions page and enable workflows if GitHub asks, and how to see that Quality Gates ran.

## Acceptance criteria

- [ ] create-wxl's next steps for `--host github-pages` name the Actions page and the enable button, in both languages, with their tests
- [ ] README.md and README.en.md say the same in the GitHub Pages part of the deployment section
- [ ] The cause of `enabled: true` beside the banner is recorded, or stated as unknown

## 給使用者（zh-TW）

用 create-wxl 建好、push 到新 GitHub repository 的靶場，Actions 可能是關閉的：Actions 頁會要求擁有者按下啟用。按下之前，push 不會跑 Quality Gates，guard test 也不會執行，但手動觸發的部署照樣會跑。老師看不到失敗的檢查，很容易以為都通過了。這張票要讓 create-wxl 的下一步說明和 README 提醒老師到 Actions 頁啟用，並說明怎麼確認 Quality Gates 有跑。

## Comments
