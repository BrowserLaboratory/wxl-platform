# T-0073 安全審查（第 7 階段，只涵蓋 RP1）

- **Skill**：專案的 `.claude/skills/security-review/SKILL.md`（明確讀檔載入）。
- **Workflow**：`wf_20ae2897-2f0`。候選由一個 `harness-reviewer` 找出，每個候選再交給另一個獨立的 `harness-reviewer` 判定是否誤報。
- **範圍**：
  - 分支 `tickets/T-0073/first-ci-release`，base `10a7f46`，HEAD `ced130a`（`d0bd1e3`、`ced130a`）；
  - 內容是兩份 manifest 的版號 3.1.1、CHANGELOG 條目，以及票的紀錄；
  - AC-7（RP2～RP7）依 O3 (b) 在 PR 合併後進行，不在本次範圍。
- **依據**：spec 0009 revision 3.1、`docs/agents/release.md`。

## 結論

9 個候選中，1 個被確認（low），8 個誤報。版號變更不會讓閘門錯誤地通過或失敗：

- 兩份 manifest 都是精確的 `3.1.1`，X2 成立；
- `## [Unreleased]` 仍是獨立的一行，X7 與 P1 成立；
- X5 沒有改動；
- X3、X6、K3 要求 tag `v3.1.1` 在 HEAD 上，tag 或 SHA 錯了會 fail closed（F2）。

這個 diff 沒有建立任何 tag：`.git/refs/tags` 與 `packed-refs` 裡都沒有 `v3.1.1`。

## 確認的候選

| # | 候選 | 獨立判定 | 處置 |
|---|---|---|---|
| T0073-C7 | MN7 的兩條 tag ruleset 沒有規定 enforcement status；設成 Evaluate 或 Disabled 時不會擋任何事 | 確認（low／0.5）：是程序與驗證的缺口，會讓 control 變弱，但不能直接利用 | `release.md` 的 MN7、traceability 的 MN7 與 S8-04 都寫明兩條都要是 "Active"；票的給使用者步驟也要求回報 enforcement status |

## 誤報，但順手修正的候選

| # | 候選 | 處置 |
|---|---|---|
| T0073-C1 | CHANGELOG 叫老師用 `npm view … dist.attestations`「查證」，但這個指令只印出 URL 與 predicate type | 改成「只能確認有沒有 provenance」，內容請看 npmjs.com 的套件頁（第 6 階段的 STD-01 也是同一件事） |
| T0073-C2 | 摘要把「每個版本都帶 provenance」寫成事實 | 改成「從這一版起應帶有」，並說明 3.1.0 以前沒有 |
| T0073-C3 | 摘要把 guard 也寫成安全保證 | 只寫「CI 發布的版本」要經過核准，閘門與祖先檢查放在 Changed |
| T0073-C4 | 「`npm publish` 會在 X9 停下」聽起來像是 control | 改成「最晚會在 X9 停下並說明原因」，與 B2 一致 |
| T0073-C6 | RP2 推 tag 前沒有檢查 SHA 在 `main` 上、版號相符；MN7 會讓錯的 tag 永遠留著 | `release.md` 與 traceability 的 RP2 加上：agent 先確認 SHA 是 `origin/main` 的祖先、兩份 manifest 在該 SHA 都是 `<V>`，否則停下 |

## 誤報，不修改的候選

| # | 候選 | 理由摘要 |
|---|---|---|
| T0073-C5 | 票的使用者步驟沒有列出讓 MN1、MN2、MN7、RP5 成為 control 的設定值 | 這次的 diff 讓步驟變得更詳細。第 6 階段的 SPEC-13 已讓每一步列出要回報的內容，並指向 `release.md` |
| T0073-C8 | 票沒有重述「永不 `git push --tags`」 | 票的 Deliverable 與 `release.md` 的 RP2 都寫了 |
| T0073-C9 | CHANGELOG 描述 #88 的內容，但 #88 還沒合併 | 依計畫在 #88 合併後 rebase，合併前再核對一次 |

## 涵蓋範圍與限制

- **已檢查**：
  - 這個 diff 改到的四個檔案；
  - `publish.mjs` 的 X2、X3、X5、X6、X7；
  - `pristine.mjs` 的 P1；
  - `publish-npm.yml`；
  - spec 0009 revision 3.1 與 `release.md`；
  - 硬編碼的 3.1.0 只剩在測試 fixture 與歷史紀錄裡。
- **排除**：
  - 相依套件；
  - 可用性；
  - npm、GitHub 與 OIDC；
  - RP2～RP7 的實際執行。
- **限制**：全程唯讀，沒有執行任何指令或測試。

本報告不代表整個專案是安全的。
