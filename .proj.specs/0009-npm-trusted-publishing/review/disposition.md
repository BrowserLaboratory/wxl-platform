# Round 1 處置 — epic 0009-npm-trusted-publishing

依據：`round-1.md` 的群組 G1～G10。2026-11-12，使用者對 U1～U7 都選了建議選項，原話如下：

| # | 裁決 |
|---|---|
| U1 | 「Add to rewrite list (Recommended)」 |
| U2 | 「Restrict to v* tags (Recommended)」 |
| U3 | 「Agent, after you confirm (Recommended)」 |
| U4 | 「Count it in the epic (Recommended)」 |
| U5 | 「New docs/agents/release.md (Recommended)」 |
| U6 | 「When N1 is set up (Recommended)」 |
| U7 | 「Add the check (Recommended)」 |

「套用」表示寫進 revision 2；「記錄」表示寫進 spec 的已知限制或 Further Notes，不改規則；「不採用」附理由。下表引用的是 revision 2 的編號：RP 是發布步驟，MN 是使用者步驟，O 是覆寫的契約。

## C 軸

| ID | 處置 |
|---|---|
| C-1 | 套用（G1、U1）。O1 覆寫 0004 的 confinement：`create-wxl/package.json` 的 `repository.url` 列入 rewrite list，guard 豁免這一行。新增 M02，該檔其他行照舊回報。release.md 不寫出 slug，以「上游 repository（`scripts/fork-init.ts` 的 `UPSTREAM_SLUG`）」稱呼 |
| C-2 | 套用（G7）。W8 不再是獨立規則：W6 改為八步的確切清單，W8 由它推出。S01 以「gate 步驟通過（X4 成立）」作為執行時的證據 |
| C-3 | 套用（G4）。W4 規定 checkout 帶 `fetch-depth: 0`，取得完整 clone，所有 tag 與 `origin/main` 都在。新增 K12 列描述 CI checkout 的形狀：detached HEAD 在 tag 的 commit、annotated tag 存在。X3、X6、X7 在這個形狀上的預期由 C42 的 annotated 案例承接。至於 tag 前沒有本機預檢這件事：X3 和 X6 需要已推送的 tag，所以本機無法完整預檢。這點記錄為已接受的代價：只要 gate 的失敗出在 repo 內，D6 就會用掉一個版號 |
| C-4 | 套用（G4）。新增 D10：從第一張程式碼 ticket 落地到最後一張落地之間，不推 `v*` tag |
| C-5 | 套用（G6）。四個條件都印出值，格式是 JSON 字串，或 `unset`；K03、K04 補上 `''` |
| C-6 | 套用（G6）。`env` 缺少、為 `null` 或不是物件時，一律當作 `{}`；值不是字串時算 `unset`；K4 的值只含空白時不成立。`ACTIONS_ID_TOKEN_REQUEST_TOKEN` 不檢查：它由 runner 和 URL 一起提供，npm 自己會用它，X9 只是防呆（D8） |
| C-7 | 套用（G5）。名詞表加入 reject；新增 S06 |
| C-8 | 套用（G3、U3）。RP5 列出核准前要比對的欄位；S03 驗證 attestation 的內容 |
| C-9 | 套用（G5）。D6 改寫：允許重跑的三個條件；release.yml 與 publish-npm.yml 一成一敗時怎麼處理；MN6 處理設定過期。新增 S07、S08 |
| C-10 | 套用（G4、U4）。O3 覆寫 stage 8 的時機：程式碼 ticket 的 stage 8 在終端機執行（RP0）；AC-7 由本 epic 最後一張 ticket（第一次 CI 發布）承接；close-out 等它完成 |
| C-11 | 套用（G9）。D02 擴大範圍，D12 改稱「T-0025 的 D12」 |
| C-12 | 套用（G6）。K11 列出要移除的 export（`npmCommand`、`parseNpmViewMaintainers`、`createNpmView`、`createNpmWhoami`）及其測試；`CHECK_EXPLANATIONS.X9` 與訊息格式由新增的 K13 驗 |
| C-13 | 套用（G1）。R1 給出完整的 listing：`repository` 放在 `license` 之後，內部鍵順序依所列 |
| C-14 | 套用（G1、U1）。rebrand 的整樹替換會改寫這一行，這是預期行為；M01 改成與根目錄 manifest 的 `repository.url` 比對，所以 fork 在 rebrand 後仍然通過 |
| C-15 | 套用（G7）。npm 限定 11.x，而且 ≥ 11.15.0 |
| C-16 | 套用（G2、G7）。W4 列出每個 action 的 `with` 鍵完整集合；`registry-url` 列入禁止清單 |
| C-17 | 套用（G7）。`stage` job 不設 `env`（W7 禁止 job 層的 `env`），因為這個 job 不跑 `pnpm test`。upstream-only-jobs 的註解計數改成 `format` 共出現六次（`if:` 三次、`env:` 三次） |
| C-18 | 記錄。X9 照舊排在最後：在真實終端機上，會先停在第一個不成立的 X 檢查，例如沒有 tag 時停在 X3。user story 3 改寫成「publish 在終端機上不會到達 npm，並說出停下的原因」 |
| C-19 | 記錄。fork 推 tag 時 job 會被 `if:` 跳過，被跳過的 job 不會建立 environment（這是推論，沒有實測）。B3 的證據限定為靜態測試（W02、W08） |
| C-20 | 套用（G10）。S04 引述 MN1 的每一個欄位、MN1 時撤銷 token 的結果，以及 MN3 的選項文字 |
| C-21 | 套用（G8）。D01 和 AC-6 統一寫成「順序、執行者、時機」 |
| C-22 | 套用（G10）。B2 的「不保護」欄寫明本機 `npm stage publish` 與 `--ignore-scripts` 這兩個缺口 |

## V 軸

| ID | 處置 |
|---|---|
| V-1 | 套用（G6）。四個原因字串都逐字固定，訊息帶有條件 id |
| V-2 | 套用（G6）。四個條件都印出值，格式統一 |
| V-3 | 套用（G6）。AC-1 改為直接引用 K02～K05 各列，不再另列括號清單 |
| V-4 | 套用（G6）。結尾句逐字固定，寫在 traceability；`<V>` 代入實際版號、沒有反引號、以句號結尾；spec 改為引用它 |
| V-5 | 套用（G6）。K13 驗 `CHECK_EXPLANATIONS.X9` 的文字，並寫明它只在沒有自訂訊息時使用 |
| V-6 | 套用（G7）。「不 spawn npm」改用靜態判定，見 K11：`create-wxl/src/publish.mjs`、`publish-io.mjs`、`scripts/check-publish.mjs` 都不含 `npmCommand`、`'npm'`、`npm.cmd`。範圍只限 `checkPublish` 和它的 wiring，`prepareDist` 本來就不碰 npm |
| V-7 | 套用（G6）。見 C-12 |
| V-8 | 套用（G7）。K11 寫明 wiring 用靜態方式判定 |
| V-9 | 套用（G7）。見 C-2 |
| V-10 | 套用（G7）。W08、W09 改成逐條列出要新增的斷言，並指定由 `upstream-only-jobs.test.ts` 承接；`toolchain-parity.test.ts` 不動（K-7） |
| V-11 | 套用（G7）。npm 限定 11.x；「first」改成「W6 的第 4 步，在任何其他 `npm` 指令之前」；`pnpm` 不算 `npm` 指令，判定方式是看 `run` 是否以 `npm ` 開頭 |
| V-12 | 套用（G2、G7）。W7 改成掃描整份檔案，列出確切的禁止字串與禁止的鍵；workflow 和 job 層都不得有 `env:` |
| V-13 | 套用（G7）。剛好八步；允許 `name:`；第 4～8 步的 `run` 逐字比對 |
| V-14 | 套用（G1）。見 C-13 |
| V-15 | 套用（G8、U5）。發布文件改放 `docs/agents/release.md`，章節與字串依 R2 逐字列出；新增 seam 0009-S5，以測試用 `grep -F` 驗證 |
| V-16 | 套用（G5）。D6 用一張表列出可以重跑的原因；「before staging」改成「`npm stage publish` 沒有執行，或以非 0 結束」 |
| V-17 | 套用（G10）。MN3 完成前 AC-7 不算通過；判準是使用者回報 Publishing access 頁面上選項的確切文字 |
| V-18 | 套用（G4）。AC-7 的第 1～4 點由第一個 stage 成功的 `v<V>` 達成，之前的每次失敗都記錄原因與 D6 的分類 |
| V-19 | 套用（G3）。見 C-8 |
| V-20 | 套用（G4）。見 C-10 |
| V-21 | 套用（G10）。S02 由使用者在 Staged Packages 頁面觀察；`latest` 用 `npm view create-wxl dist-tags.latest` 判定 |
| V-22 | 套用（G3）。見 C-8 |
| V-23 | 記錄。見 C-18；AC-2 只在 seam 上判定 |
| V-24 | 套用（G7）。S01 改寫成「gate 步驟以 success 結束」 |
| V-25 | 套用（G10）。MN1 改成「撤銷所有可以發布 create-wxl 的 token」；self-check 的「within the session」刪掉 |

## K 軸

| ID | 處置 |
|---|---|
| K-1（P0） | 套用（G1、U1）。新增 Overridden contracts 一節：O1 對應 0004:117-130 與 guard 測試；O2 對應 0005:56-57。guard 測試、0004 的 traceability 與 0005 的 traceability 都在同一張 ticket 裡修改。rebrand 改寫這一行是預期行為 |
| K-2 | 套用（G4、U4）。O3 寫明：AC-7 由哪張 ticket 承接；那張 ticket 在等 tag 期間的狀態維持 `processing`；close-out 等它完成；workflow.md:88-91 為什麼不適用（npm 沒有獨立的 staging 目標）；OQ-022 的適用範圍延伸到 0009 |
| K-3 | 套用（G8）。RP1 用 `/tw-emoji-release-note` 產生條目；RP2 規定 tag 訊息為 `WXL <V>`；RP4 用條目取代 GitHub Release notes；註記 OQ-019 仍然 open |
| K-4 | 套用（G9）。見 C-11；ADR-0009:35 加註，OQ-021 的 Evidence 加註 |
| K-5 | 套用（G9）。見 C-11 |
| K-6 | 套用（G8、U5）。改放 `docs/agents/release.md`，AGENTS.md 的 Reference 加一行；workflow.md 不改。release.md 會跟著範本進到靶場，這是已知限制，並在檔案開頭寫明它只適用於上游 |
| K-7 | 套用（G7）。`toolchain-parity.test.ts` 不動；新斷言放進 `upstream-only-jobs.test.ts`；W08 列出要更新的註解（upstream-only-jobs:13-18、trigger-branches:61） |
| K-8 | 套用（G7）。延伸 T52（`fork-init.test.ts`）：rebrand 不動 `publish-npm.yml` 的 `if:`，計數改為 `if:` 三行 |
| K-9 | 套用（G1）。見 C-13；listing 的 placeholder 從四個改為五個 |
| K-10 | 套用（G8）。改用 publish gate 與 upstream maintainer；zh-TW 一律稱「上游」，不用「維護者」 |
| K-11 | 套用（G8）。改用前綴：RP1～RP7、MN1～MN6、manifest 規則 MR1；矩陣列改為 S8-01 等 |
| K-12 | 套用（G3、U3）。RP2 規定 agent 只在使用者明確確認後推 tag，這與 0005 spec:198「each asked first」一致，不構成覆寫 |
| K-13 | 套用（G6）。訊息格式寫成完整的逐字格式 |
| K-14 | 套用（G5）。D6 註明：沒有出現在 npm 上的 `v<V>` 仍然是上游發布版（ADR-0009 以 tag 判定），升級可以把它當成 base |

## R 軸

| ID | 處置 |
|---|---|
| R-1 | 套用（G2、U2）。MN2 規定 environment `npm` 只允許 tag `v*`；Out of Scope 刪掉這一項；B1 改寫 |
| R-2 | 套用（G3）。RP5 規定：`<V>` 只能有一筆 staged entry；能看到的欄位逐項比對；看不到的欄位寫進新的 OQ，B1 承認這個限制 |
| R-3 | 套用（G3、U3）。不再用「whose tag they made」，改用 RP5 的欄位比對；B1 點出推 tag 的是 agent |
| R-4 | 套用（G10）。見 C-20 |
| R-5 | 套用（G5）。見 V-16、C-9；被 reject 的 tag 永遠不重跑；加上 `concurrency`；self-check 刪掉「does not matter」 |
| R-6 | 部分套用（G2）。改用 `--prod --ignore-scripts` 安裝。拆成兩個 job 不採用：npm 文件沒有寫 `npm stage publish <tgz>`，而且 OIDC 能力仍然只在同一個 job 裡。剩下的風險寫進 B1 |
| R-7 | 套用（G2）。見 V-12 |
| R-8 | 套用（G10）。見 C-22；self-check 的全稱說法改成有限定 |
| R-9 | 套用（G10、U6）。撤銷 token 提前到 MN1；B1 寫明：維護者用 2FA 互動直接發布，是接受的殘餘風險 |
| R-10 | 套用（G10、U7）。W6 的第 5 步執行 `git merge-base --is-ancestor HEAD origin/main`；RP2 只推單一 tag |
| R-11 | 記錄（G10）。prepack 會在 gate 之後重建 `dist/`；因為輸入是確定的，內容相同，寫進 Further Notes |
| R-12 | 套用（G3）。見 C-8 |
| R-13 | 套用（G1、U1）。見 C-14 |
| R-14 | 套用（G2）。checkout 設 `persist-credentials: false` |
| R-15 | 套用（G5）。新增 MN6：設定過期時刪除重建；「staging 算不算第一次成功發布」記為未知數 |
| R-16 | 套用（G10）。新增 MN5：org 或 repo 改名、轉移之前，先刪除 MN1 的設定 |
| R-17 | 套用（G2）。setup-node 明確設 `package-manager-cache: false`；`pnpm/action-setup` 不帶 `with`。npm 安裝沒有 integrity 這點記錄下來：registry 不在威脅模型內 |
| R-18 | 套用（G10）。見 V-21 |
