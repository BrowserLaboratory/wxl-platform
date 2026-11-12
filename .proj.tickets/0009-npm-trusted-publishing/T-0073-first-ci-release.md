---
id: T-0073
title: First CI release of create-wxl
epic: 0009-npm-trusted-publishing
status: review
blocked_by: [T-0069, T-0070, T-0071, T-0072]
---

## Context

Spec 0009's U4 makes the first release through `publish-npm.yml` this epic's last ticket; its stage
8 is AC-7, which runs after its own PR merges (O3, O4). The version is at least a patch over 3.1.0,
since the epic changes code that ships in the package. The user's settings come first, in order:
MN7, MN2, MN1 (within 2 days before the tag, with every publishing token revoked).

## Deliverable

- RP1: versions and the CHANGELOG entry from `/tw-emoji-release-note` land on `main`.
- RP2: after the user confirms the tag name and the merge SHA, one annotated tag `v<V>` is pushed
  alone, never with `--tags`.
- RP3: CI runs. RP4: the release notes are replaced with the CHANGELOG entry.
- RP5: the user compares and approves.
- RP6: the agent verifies the registry, the provenance statement and a fresh `npm create wxl`.
- MN3: after approval, the user sets the package to disallow tokens.
- OQ-027 is filled with the fields the Staged Packages tab showed.
- Status stays `review` after the PR merges until AC-7 holds (O4).

## Acceptance criteria

Spec 0009 revision 3.1 (D11–D14 change MN7, MN2's timing, RP2, RP5 (b), F6 and S8-04).

- [ ] Rows S8-01–S8-07.
- [ ] AC reached: AC-7, met by the first `v<V>` that is approved and passes RP6; every earlier
  attempt recorded with its F-row.
- [ ] The record quotes the user's reports for MN1 (six fields, single trusted publisher), the token
  revocation, the collaborator list, MN2, MN7 and MN3, each equal to its expected value.

## 給使用者（zh-TW）

第一次透過 CI 發布 create-wxl，同時是本 epic 的第 8 階段（AC-7）。你要依序做這些事：

1. 建立兩條 tag ruleset（MN7，D11）：一條限制建立、只有你能 bypass；一條禁止更新與刪除、不設 bypass。
2. 設定 `npm` environment（MN2）。第 1、2 步都要在任何 `v*` tag 之前完成（D14）。
3. 推 tag 前兩天內，建立 trusted publisher、撤銷舊 token，並確認 collaborator 只有你（MN1）。
4. 確認 tag 名稱，並自己從已合併的 PR 頁讀出 merge SHA 告訴我（RP2，D13）。
5. 確認 publish run 的 commit 等於那個 SHA，在 Staged Packages 比對後核准（RP5）。
6. 最後設定拒絕 token（MN3）。

我負責推單一 tag、替換 release notes、驗證 registry、provenance 與 `npm create wxl`。這張票在 PR 合併後仍維持 `review`，等 AC-7 成立才改成 `done`。

## Test plan

### 2026-11-13 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准）

這張票的程式變更只有版號（RP1）。版號一致與格式由既有測試把關，不新增 seam；AC-7 的各列是第 8 階段在真實 GitHub Actions、npm 與使用者回報上的驗證（0009-S4，O3），不是自動測試。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S3（既有） | 兩份 manifest 的版號相同而且精確 | `upstream-config.test.mjs` 的 C45 | RP1 | 兩者都是 `3.1.1`。確認型：既有測試在版號改動後仍應全綠 |
| 0005-S2（既有） | X2：create-wxl 的版號等於根 manifest | `publish.test.mjs` | RP1 | 同上，確認型 |
| 0005-S2（既有） | CHANGELOG 仍有 `## [Unreleased]`（P1 的標記） | `publish.test.mjs` 的 X7 與 archive 規則 | RP1 | 新條目放在 `## [Unreleased]` 之下。確認型 |
| 0009-S4 | 第一次 CI 發布 | 真實的 tag、兩個 workflow run、Staged Packages、registry、`npm create wxl` | S8-01～S8-07 / AC-7 | 依 RP2～RP6；使用者回報的部分（MN7、MN2、MN1、MN3、RP5）逐字引用；每一次失敗的嘗試記錄它的 F 列 |

### 2026-11-13 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S2、0005-S3（既有） | C45、X2、X7 與 archive 規則的既有測試 | not measured。重現：`pnpm --dir create-wxl test` | RP1 | — |
| 0009-S4 | 沒有自動測試 | — | S8-01～S8-07 / AC-7 | 依 O3，第 8 階段在 PR 合併之後於真實的 GitHub Actions 與 npm 上進行，證據是 run 與 registry，以及使用者回報的設定頁（OQ-028） |

## Comments
- 2026-11-13, stage 5 (RP1), on a branch cut from T-0072's tip `10a7f46` while PR #88 ran its CI,
  to be rebased onto `main` once #88 lands:
  - Version 3.1.1: spec 0009 asks for at least a patch, and the handoff of 2026-11-12 planned
    3.1.1. The release-note skill maps a `feat` commit to a MINOR bump; here every change is
    release infrastructure (CI, the gate, the manifest's metadata, documents), and creating and
    upgrading a range behave as in 3.1.0, so a security-focused patch (🔒) fits. The user confirms
    the tag name at RP2.
  - Both manifests' `version` → `3.1.1`; `CHANGELOG.md` gains the 3.1.1 entry under
    `## [Unreleased]`, generated with the project's `/tw-emoji-release-note`
    (`.claude/skills/tw-emoji-release-note/scripts/sanitize_release_note.py`), citing #82, #84,
    #86 and #88. The skill only produced the entry; no tag was created or pushed.
  - `pnpm --dir create-wxl test` → `Test Files 38 passed (38) / Tests 787 passed | 1 skipped
    (788)`.
  - `pnpm test --run` → `Test Files 137 passed (137) / Tests 4910 passed | 1 skipped (4911)`.
