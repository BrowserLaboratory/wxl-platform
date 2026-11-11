---
id: T-0073
title: First CI release of create-wxl
epic: 0009-npm-trusted-publishing
status: todo
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

Spec 0009 revision 3.

- [ ] Rows S8-01–S8-07.
- [ ] AC reached: AC-7, met by the first `v<V>` that is approved and passes RP6; every earlier
  attempt recorded with its F-row.
- [ ] The record quotes the user's reports for MN1 (six fields, single trusted publisher), the token
  revocation, the collaborator list, MN2, MN7 and MN3, each equal to its expected value.

## 給使用者（zh-TW）

第一次透過 CI 發布 create-wxl，同時是本 epic 的第 8 階段（AC-7）。你要依序做這些事：

1. 建立 tag ruleset（MN7）。
2. 設定 `npm` environment（MN2）。
3. 推 tag 前兩天內，建立 trusted publisher 並撤銷舊 token（MN1）。
4. 確認 tag 名稱與 merge SHA。
5. 在 Staged Packages 比對後核准。
6. 最後設定拒絕 token（MN3）。

我負責推單一 tag、替換 release notes、驗證 registry、provenance 與 `npm create wxl`。這張票在 PR 合併後仍維持 `review`，等 AC-7 成立才改成 `done`。

## Comments
