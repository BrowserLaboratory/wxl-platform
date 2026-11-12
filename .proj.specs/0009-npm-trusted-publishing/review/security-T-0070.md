# T-0070 安全審查（第 7 階段）

- **Skill**：專案的 `.claude/skills/security-review/SKILL.md`（明確讀檔載入）。
- **Workflow**：`wf_621cef7a-c89`。候選由一個 `harness-reviewer` 找出，每個候選再交給另一個獨立的 `harness-reviewer` 判定是否誤報。
- **範圍**：
  - checkout `/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0070/manifest-repository`；
  - base `origin/main` `08c2b14`，HEAD `924c88c`（`3775ca5`、`9038eac`、`924c88c`）；
  - 未提交的變更只有 T-0070 的票；沒有未追蹤檔案。
- **依據**：spec 0009 的 B1～B3、MR1、MR2、O1、O2，以及 0004 的 slug confinement。本票不涉及題目，ADR-0005 不適用。

## 結論

7 個候選全部被獨立審查判定為誤報，嚴重度 none。本票沒有需要修正的安全發現。

這些判斷都來自讀程式碼與 spec，沒有實際執行。

## 候選與處置

| # | 候選（候選審查者的嚴重度／信心） | 獨立判定（嚴重度／信心） | 理由摘要 |
|---|---|---|---|
| T0070-S1 | guard 依行的文字豁免，不看位置，單看 guard 會豁免任何鍵下的上游 URL（low／0.35） | 誤報（none／0.85） | O1 (a) 規定的就是逐字比對文字，self-check 也刻意不對這個檔案做結構走訪，行的位置交給 M01 的五行檢查與 C45 確認。slug confinement 是 rebrand 規則，不保護任何機密、權限或完整性 |
| T0070-S2 | create-wxl 的 `repository.url` 只和根 manifest 比，沒有和 `UPSTREAM_SLUG` 或 trusted publisher 比（low／0.3） | 誤報（none／0.88） | 既有的 upstream pristine check（0004 T67）已在 real tree 測試中，把根 manifest 的 `repository.url` 與 `git+https://github.com/<UPSTREAM_SLUG>.git` 逐字比對 |
| T0070-S3 | MR2 只排除 `.npmrc`，其他套件管理設定（`.pnpmfile.cjs`、`.yarnrc` 等）沒有涵蓋（low／0.3） | 誤報（none／0.85） | B1 已寫明 job 執行的任何程式（包括 repository 的程式碼）都能請求 OIDC token。能把這些檔案提交到上游的人，本來就有同等能力 |
| T0070-S4 | MR2 只由測試保證，tag 上執行的 gate 不檢查（low／0.2） | 誤報（none／0.85） | 本票不改 gate 或發布 job（`publish-npm.yml` 在 T-0071）。這是 spec 的分工設計，不是本 diff 的缺陷 |
| T0070-S5 | 依 U9，default mode 的 GitHub fork 會保留上游的 `repository.url`，fork 自己發布時會指向上游（low／0.2） | 誤報（none／0.85） | 只有 fork 擁有者能這樣做，而且要先改套件名稱、再用自己的憑證發布。對 token 或互動式發布，npm 不驗證這個欄位；擁有者本來就能隨意寫這個欄位。U9 的文件說明由 T-0072 處理 |
| T0070-S6 | 票的第 5 階段紀錄與程式實作的「the single line」不一致（low／0.2） | 誤報（none／0.9） | Comments 是依日期排列的紀錄。第 6 階段那一筆明確取代了第 5 階段的「first match」解讀 |
| T0070-S7 | guard 只認字面上的 slug，JSON 跳脫形式可以繞過（既有限制，low／0.15） | 誤報（none／0.9） | 這是 diff 之前就有的限制，本 diff 沒有改比對方式。slug confinement 也不是安全邊界 |

## 涵蓋範圍與限制

- **已檢查**：
  - `create-wxl/package.json`，以及兩個測試檔（guard、fixture、real tree 的讀取路徑）；
  - `create-wxl/bin/create-wxl.mjs`：只讀 `package.json` 的 `version`，下載來源來自 `dist/source.json` 的 `UPSTREAM_SLUG`，所以 `repository` 不影響 `npm create wxl` 的解析與下載；
  - `publish.mjs`：不讀 `repository`；
  - `scripts/fork-init.ts` 的 rebrand 與 A mode；
  - `.gitattributes`：`/create-wxl export-ignore`，靶場不會含 `create-wxl/`；
  - checkout 沒有 `.npmrc`、`pnpm-workspace.yaml`、`.yarnrc`；
  - `files` 沒有改，所以這個 diff 只改套件的 metadata，不改發布的檔案內容。
- **排除**：
  - 相依套件掃描；
  - 可用性與 DoS；
  - npm 對 `repository.url` 的實際比對規則（大小寫、正規化），沒有對 npm 實測；
  - `publish-npm.yml` 與 W11（T-0071）、DS1～DS3（T-0072），以及 MN1～MN7 的帳號設定。
- **限制**：
  - 候選審查者沒有直接讀 `upstream-security-review.md`、`review.md`、ADR-0005 與 0004 的 traceability，而是依 packet 與 guard 註解引用的定義判斷；
  - 獨立審查者有讀 spec 的 B1～B3 與 O1 的 self-check；
  - 全程沒有執行任何指令。

本報告不代表整個專案是安全的。
