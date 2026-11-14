---
id: T-0074
title: Read and compare the release commit only by its full SHA and full ref names
epic: 0009-npm-trusted-publishing
status: pending
blocked_by: []
pending_reason: "Opened by epic 0009's close-out chain analysis (S-1, S-2). The user chose on 2026-11-14 to close the epic first and schedule this later, quoted: 「先結案，之後再排」."
pending_evidence: "review/chain-analysis.md (S-1, S-2; V-1 and V-2 show 3.1.1 was not affected)."
pending_on: 2026-11-14
revisit_when: "Before the next create-wxl release (the next v* tag): the chain stays open until this lands, so RP2 must not start while this ticket is pending."
---

## Context

Epic 0009's close-out chain analysis (`.proj.specs/0009-npm-trusted-publishing/review/chain-analysis.md`)
found two chains that cross B1, both medium, with one root cause: the release procedure reads and
compares the release commit through names that someone other than the user can change.

- **S-1.** GitHub's pull request page and Actions run page show only seven hex digits of a commit
  (V-3). RP5 (b) compares "the commit its GitHub Actions page shows", and RP5 (c) accepts any one
  field, so a commit ground to the same seven-digit prefix passes both. When the user reads the SHA
  in a terminal instead, a compromised agent can rewrite `refs/remotes/origin/main` in the shared
  checkout. In the first release, the agent, not the user, compared the run's commit (T-0073).
- **S-2.** `origin/main` is ambiguous. Anyone who can write a ref outside `v*` (MN7 covers only
  `v*`; two GitHub Apps hold `contents: write`, V-6) can push `refs/tags/origin/main` at a commit
  that never reached `main`. An ordinary `git fetch` follows it, and then the user's
  `git log origin/main`, the agent's RP2 check and CI's ancestry check (`publish-npm.yml:50-51`)
  all resolve to that commit, with only a warning on stderr (V-4). A tag named after the
  seven-digit prefix redirects `git show` and `git tag -a` the same way (V-5).

The user chose on 2026-11-14 to split the fixes by root cause (「依根因拆兩張」); this ticket takes
S-1 and S-2. T-0075 takes the agent and user isolation (S-3, R-3).

## Deliverable

Spec 0009 revision 3.2 and the files it governs, so that the release commit is only ever read and
compared by its full 40-digit SHA, from a server-side source, and every check against `main` names
`refs/remotes/origin/main`:

- RP2: the user reads the SHA from the merged pull request's commit link (full value) or
  `gh pr view <n> --json mergeCommit`; the agent accepts only 40 hex digits and resolves nothing by
  a short prefix.
- RP5 (b): the user compares the run's commit themselves, all 40 digits. RP5 (c): ref and commit
  are always compared; "at least one field" no longer suffices.
- W6, W12 and the agent's RP2 check: `git merge-base --is-ancestor HEAD refs/remotes/origin/main`
  (and `<SHA>` for the agent), with the W12 test covering a same-named tag.
- `docs/agents/release.md`, `release-docs.test.mjs` (R2) and the workflow tests follow.

## Acceptance criteria

To be written as rows in spec 0009 revision 3.2's `traceability.md` before stage 5. At least:

- [ ] A repository with `refs/tags/origin/main` pointing off `main` makes the ancestry step fail
  (W12 test).
- [ ] RP2 and RP5 in `release.md` name the full SHA, its server-side source, and the user as the
  one who compares (R2 string checks).
- [ ] The next release's record quotes the 40-digit SHA the user read and the 40-digit commit they
  compared (S8).

## 給使用者（zh-TW）

epic 0009 收尾的串連分析，找到兩條跨越 B1 的串連（S-1、S-2，都是 medium），根因是同一個：發布時讀取、比對 release commit 用的名稱，別人也改得動。

- **S-1**：GitHub 頁面只顯示 7 碼，RP5 (c) 又只要求比一欄，所以前綴相同的惡意 commit 騙得過去；在 terminal 讀的話，被入侵的 agent 能改共用 checkout 裡的 ref。
- **S-2**：`origin/main` 有歧義。能寫非 `v*` ref 的人推一個同名 tag，你讀到的 SHA、agent 的 RP2 自檢、CI 的祖先檢查都會指向那個 commit，只在 stderr 印出警告。

這張票做完之後：

- 你只從 PR 頁的 commit 連結或 `gh pr view` 讀 40 碼 SHA，agent 只接受 40 碼。
- RP5 由你本人逐碼比對 run 的 commit；ref 與 commit 兩欄一定要比。
- CI 與 agent 的檢查一律寫 `refs/remotes/origin/main`，測試也涵蓋同名 tag 的情況。

需要先修訂 spec 0009（revision 3.2），再走第 5～9 階段。

## Comments
- 2026-11-14, opened from the chain analysis (S-1, S-2, V-3–V-6) at the user's choice to split by
  root cause. Not started.
- 2026-11-14, set to `pending` at the user's choice to close the epic first (「先結案，之後再排」).
