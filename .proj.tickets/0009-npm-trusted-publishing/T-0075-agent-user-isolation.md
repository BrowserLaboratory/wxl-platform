---
id: T-0075
title: Keep npm sign-ins and the admin credential out of the agent's reach
epic: 0009-npm-trusted-publishing
status: pending
blocked_by: []
pending_reason: "Opened by epic 0009's close-out chain analysis (S-3, R-3). The user chose on 2026-11-14 to close the epic first and schedule this later, quoted: 「先結案，之後再排」."
pending_evidence: "review/chain-analysis.md (S-3, R-3; V-1 and V-2 show 3.1.1 was not affected)."
pending_on: 2026-11-14
revisit_when: "Before the next create-wxl release (the next v* tag): the chain stays open until this lands, so RP2 must not start while this ticket is pending."
---

## Context

Epic 0009's close-out chain analysis (`.proj.specs/0009-npm-trusted-publishing/review/chain-analysis.md`)
found that the agent and the user run as the same macOS account and share the checkout,
`~/.npmrc` and `gh`'s credential, and that the credential is a repository admin.

- **S-3** (low to medium). `release.md` says "never sign in to npm in a shell the agent can use"
  only at RP5 (c), while MN1 asks the user to sign in for `npm access list collaborators` and F6
  for `npm dist-tag add` and `npm deprecate`. Under one account no shell is out of the agent's
  reach. After T-0073, `npm whoami` in the agent's shell printed `cxphoenix` (V-8): MN1's sign-in
  was still valid there. MN3's actual option refuses only "bypass 2fa tokens", not a session.
- **R-3.** B1 lists the agent as an adversary, while the threat model excludes "anyone with admin
  rights on the repository" (`spec.en.md:206-207`); the agent holds that admin right (it pushed
  `v3.1.1` under a ruleset whose only bypass is admin). PC-4 follows: that credential can disable
  the no-bypass ruleset and move a release tag, while D11 and `CHANGELOG.md:23` say tags cannot be
  moved or deleted.
- MN3's documented label ("…and disallow tokens") is not the label npm shows ("…and disallow bypass
  2fa tokens (recommended)"); the next person following `release.md` may pick the other option.

The user chose on 2026-11-14 to split the fixes by root cause (「依根因拆兩張」); this ticket takes
S-3, R-3 and the wording that depends on them. T-0074 takes the SHA sources (S-1, S-2).

## Deliverable

Spec 0009 revision 3.2 (shared with T-0074) and the files it governs:

- Every step that needs an npm sign-in (MN1's collaborator check, RP5 by CLI, F6) is done on
  npmjs.com or in a macOS account the agent does not run as; each release records `npm whoami`
  from the agent's shell returning 401.
- R-3 decided by the user and written into B1 and the threat model: for example, the agent works
  with a credential without admin and the user pushes the tag, or admin stays with the agent and
  the spec says what that leaves unprotected.
- D11 and the documents no longer say a tag cannot be moved: only disabling a ruleset can, and the
  audit log keeps it. MN3, traceability and R2 use npm's actual label.
- `release.md`, `release-docs.test.mjs` and `CHANGELOG.md`'s wording follow.

## Acceptance criteria

To be written as rows in spec 0009 revision 3.2's `traceability.md` before stage 5. At least:

- [ ] `release.md` puts every npm sign-in outside the agent's account and asks for the
  `npm whoami` check (R2 string checks).
- [ ] B1 and the threat model no longer contradict each other about the agent's admin credential.
- [ ] MN3's label in `release.md`, traceability and R2 is npm's actual label.

## 給使用者（zh-TW）

epic 0009 收尾的串連分析發現：agent 跟你用同一個 macOS 帳號，共用 checkout、`~/.npmrc` 和 `gh` 的 admin 認證。

- **S-3**：文件只在 RP5 (c) 寫「不要在 agent 能用的 shell 登入 npm」，MN1 和 F6 卻要你登入；而同一個帳號下沒有 agent 用不到的 shell。T-0073 之後，agent 的 shell 跑 `npm whoami` 回的是 `cxphoenix`。
- **R-3**：spec 把 agent 列為對手，又把 admin 排除在威脅模型外，但 agent 實際持有 admin；這個認證能停用 ruleset 再移動 tag，文件卻說 tag 不能移動。
- MN3 文件上的選項文字跟 npm 介面不同。

這張票做完之後：

- 需要登入 npm 的步驟只在網頁或另一個 macOS 帳號做，每次發布都記錄 agent 的 shell 跑 `npm whoami` 回 401。
- R-3 由你決定怎麼處理，寫進 spec。
- tag 與 MN3 的說法改成實際情況。

需要先修訂 spec 0009（revision 3.2，和 T-0074 共用），再走第 5～9 階段。

## Comments
- 2026-11-14, opened from the chain analysis (S-3, R-3, PC-4, V-6, V-8) at the user's choice to
  split by root cause. Not started. R-3 needs the user's decision before stage 2 of the revision.
- 2026-11-14, set to `pending` at the user's choice to close the epic first (「先結案，之後再排」).
