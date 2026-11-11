# Stage 3 round 1：總覽 — epic 0009-npm-trusted-publishing

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`。

- 送審版本：`spec.en.md` blob `37699a5`、`traceability.md` blob `9bf66b5`，commit `2a3cde8`；程式碼基準為 `main` `af4e1ac`。
- 審查方式：四位 reviewer 都是 `harness-reviewer`，各審一個軸，依凍結 prompt `review/prompt.md`（blob `f3d556b`）。
- 四份報告都是從 subagent transcript 原文取出存檔，沒有改寫。

## 統計

| 軸 | P0 | P1 | P2 |
|---|---|---|---|
| C 完整性 | 0 | 8 | 14 |
| V 可驗證性 | 0 | 14 | 11 |
| K 契約衝突 | 1 | 3 | 10 |
| R 紅隊 | 0 | 5 | 13 |
| 合計 | 1 | 30 | 48 |

P0：K-1（C-1 是同一件事，C 軸請求 P1，並註明可以升為 P0）。另外，V-10、V-25 的 reviewer 註明照嚴格讀法可以升為 P0。

## 主 session 的查證

以下幾項是直接讀檔確認的，沒有交給 subagent。

- **K-1／C-1 成立**：
  - `tests/unit/scripts/upstream-guard.test.ts:51-58` 的 keep list 只有 `CHANGELOG.md`、`scripts/fork-init.ts`、測試檔、兩份 skill，以及 `.proj.specs/`、`.proj.tickets/` 兩個前綴。
  - `:133` 的 A1 豁免只看 `path === 'package.json'`。
  - 所以 R1 一寫進 `create-wxl/package.json`，guard 測試就會轉紅。
- **K-5／C-11 成立**：0005 `traceability.md` 沒有 `| D12 ` 這一列。D12 是 T-0025 ticket 層的決策。
- **R-13／C-14 成立**：`scripts/fork-init.ts:689` 的 `EXCLUDED_DIRS` 是 `.git`、`node_modules`、`.claude`、`.agents`、`.codex`，不含 `create-wxl`。
- **K-2／C-10／V-20 成立**：`docs/agents/workflow.md:160-161` 寫「stage 8 runs there before the pull request merges」。
- **K-3 成立**：`.github/workflows/release.yml:91` 仍是 `generate_release_notes: true`。

## 群組與處置提案

「需要裁決」一欄標的是要使用者決定的群組（U1～U7），其餘是機械修正，照提案直接改進 revision 2。

| 群 | 主題 | 發現 | 處置提案 | 需要裁決 |
|---|---|---|---|---|
| G1 | slug 侷限規則與 rebrand | K-1（P0）、C-1、R-13、C-14 | R1 明確覆寫 0004 的 confinement：`create-wxl/package.json` 的 `repository.url` 比照根目錄 manifest 的 A1 欄位，列入 rewrite list。fork 跑 rebrand 時一起改寫，這是預期行為。M01 的期望值改從根目錄 manifest 的 `repository` 推出，不再寫死 `UPSTREAM_SLUG`，所以 rebrand 後的 fork 仍然通過。guard 測試、0004:121-126、0005:56-57 在同一個變更裡一起改，並新增一節 Overridden contracts | U1 |
| G2 | environment 沒有部署規則、job 的攻擊面 | R-1、R-6、R-7、R-14、R-17、C-16 | 一、N2 增加：environment `npm` 的 deployment branches and tags 只允許 tag `v*`。這不是 reviewer，但 Out of Scope 原本排除了它。二、機械修正：<br>• 安裝改用 `--prod`，不裝 devDependencies；<br>• checkout 設 `persist-credentials: false`；<br>• setup-node 設 `package-manager-cache: false`；<br>• 加上 `concurrency`；<br>• W7 改成掃描整份檔案，頂層與 job 層都不得有 `env:` | U2 |
| G3 | 核准是唯一的檢查，但判準是空的 | R-2、R-3、C-8、V-22、V-19、R-12、K-12 | P4 列出核准前要逐項比對的欄位：<br>• `<V>` 只有一筆 staged entry；<br>• 來源 repository、workflow `publish-npm.yml`、ref `refs/tags/v<V>`、commit 都等於 tag；<br>• 如果 npm 在核准前看不到這些欄位，記成 open question，並在 B1 承認這個限制。<br>S03 改成驗證 attestation 的內容。由誰推 tag 要決定（R-3 與 K-12） | U3 |
| G4 | stage 8 只能在 epic 合併後執行，epic 生命週期沒有定義 | K-2、C-10、V-20、V-18、C-4、C-3 | 新增 override 一節：<br>• 程式碼 ticket 的 stage 8 是本機終端機跑 `check-publish.mjs`，看 K06 的訊息，加上在 CI 形狀的 fixture 上跑 X1～X8；<br>• AC-7 由本 epic 的最後一張 ticket（第一次 CI 發布）承接，close-out 等它完成；<br>• 程式碼 ticket 全部落地之前不推 `v*` tag；<br>• 加一列 CI checkout 形狀（shallow、detached、tag ref）；<br>• AC-7 的第 1～4 點由第一個 stage 成功的 `v<V>` 達成，之前的失敗逐次記錄 | U4 |
| G5 | D6 的重跑與 reject 語意 | R-5、V-16、C-7、C-9、R-15、K-14 | 機械修正：<br>• 只有在 log 證明 `npm stage publish` 沒有執行或執行失敗、而且 `npm stage list` 沒有這個版本時，才可以重跑；<br>• 被 reject 的 tag 永不重跑；<br>• 名詞表定義 reject；<br>• N1 失效時刪除重建；<br>• 刪掉 self-check 的「答案無關緊要」；<br>• 註明這種 tag 在升級的 base 判定上仍算上游發布版（ADR-0009），但 npm 上沒有這個版本 | 否 |
| G6 | X9 訊息不精確 | V-1、V-2、V-4、C-5、C-6、K-13、V-5、C-12、V-3 | 機械修正：<br>• 寫出完整、逐字的訊息格式：開頭 `X9 (`、條件 id、JSON 字串化的值或 `unset`、固定結尾句；<br>• `env` 缺少或為 `null` 時算 K1；只接受字串值；<br>• K4 只含空白的值算不成立；<br>• 列出 `CHECK_EXPLANATIONS.X9` 的用途；<br>• K11 列出要移除的 export 與測試 | 否 |
| G7 | 測試與 seam 的落點 | V-6、V-9／C-2、V-10、K-7、K-8、C-17、V-13、V-11／C-15、V-8、V-24 | 機械修正：<br>• W8 改由 W6 的步驟白名單推出，並在 S01 以「gate 步驟通過（X4 成立）」作為證據；<br>• 逐條寫出新增的斷言與承接的測試檔，新斷言放在 upstream-only-jobs，不放 toolchain-parity；<br>• 延伸 T52 的 rebrand 不變式；<br>• `WXL_EXPECT_UPSTREAM` 照現有 job 設定，計數改為六；<br>• npm 版本上限是 11.x；<br>• 「no npm command」以靜態掃描判定 | 否 |
| G8 | 發布文件放哪裡、release note 步驟 | K-3、K-6、V-15、C-21、K-11、K-10 | 一、P1 明寫用 `/tw-emoji-release-note` 產生 CHANGELOG 條目；P3 之後加一步「用該條目取代 GitHub Release notes，標題 WXL <V>」；註記 OQ-019。二、文件位置要決定。三、文件驗收用逐字字串，比照 0005 的 U 項。四、編號加前綴；用語改成 publish gate、upstream maintainer | U5 |
| G9 | 與 0005 同步 | K-4、K-5、C-11 | 機械修正：<br>• D02 擴大到 0005 `spec.en.md` 的 :79-82、:119（B2）、:198、:204、:213-214；<br>• D12 改稱「T-0025 的 D12」，並註明 0005-S2 從未登記 `npmWhoami`；<br>• ADR-0009:35 與 OQ-021 補註 0009 | 否 |
| G10 | token 與殘餘風險 | R-9、R-10、R-8、C-22、R-4、C-20、V-17、R-18、V-21、V-25、V-23、C-18、R-16、C-19、R-11 | 一、撤銷舊 token 提前到 N1。二、gate 前加一步，檢查 tag 的 commit 是 `origin/main` 的祖先；P2 只推單一 tag。三、機械修正：<br>• S04 引述 N1 的各個欄位與 N3 的結果，N3 完成前 AC-7 不算通過；<br>• S02 改由使用者在 Staged Packages 頁面觀察；<br>• B2 寫明 `--ignore-scripts` 與本機 `npm stage publish` 這兩個缺口；<br>• N3 改成「撤銷所有可以發布 create-wxl 的 token」；<br>• 記錄 repo 改名前先刪除 N1；<br>• 記錄 prepack 會重建 `dist/` 這個已知行為 | U6、U7 |

## 需要使用者裁決

| # | 問題 | 建議 |
|---|---|---|
| U1 | `create-wxl/package.json` 的 `repository.url` 會寫出上游 slug，要怎麼處理 0004 的侷限規則？ | 列入 rewrite list（fork rebrand 一起改寫），M01 改從根目錄 manifest 推出期望值 |
| U2 | environment `npm` 要不要加部署規則，只允許 `v*` tag？ | 加。它不是 reviewer，Q4 不變，但要把 Out of Scope 裡那一項移除 |
| U3 | 誰推 release tag？ | agent 在使用者明確確認後推單一 tag，P4 改成比對 provenance 欄位，不再用「核准自己打的 tag」這個說法 |
| U4 | 第一次 CI 發布要不要算本 epic 的最後一張 ticket？ | 算。close-out 等它完成；程式碼 ticket 全部落地之前不推 tag |
| U5 | 發布流程文件放在哪裡？ | 新增 `docs/agents/release.md`（wxl 專用），AGENTS.md 的 Reference 加一行，不改通用的 workflow.md |
| U6 | 舊 token 什麼時候撤銷？ | 提前到 N1，也就是建立 trusted publisher 的時候。「disallow tokens」維持在第一次核准之後 |
| U7 | 要不要檢查 tag 的 commit 在 `main` 上？ | 要，在 gate 前加一步 `git merge-base --is-ancestor` |
