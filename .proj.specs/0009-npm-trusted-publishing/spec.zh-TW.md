---
synced_from: spec.en.md
synced_from_sha: 7b60bebb2fce0b554bcd08e9416ac8e7bbce334a
---

# Spec 0009：npm trusted publishing——由 CI 把 create-wxl 送進 npm 的 staged，上游核准後才上架

狀態：第 3.1 版（2026-11-13）。

對抗式審查已跑兩輪：

- 第 1 輪找到一個 P0，第 2 版已處理。
- 第 2 輪沒有 P0（`review/round-2.md`），第 3 階段的閘門已達成。

第 3 版套用第 2 輪的處置（`review/disposition-2.md`）與使用者的裁決 U8–U10。兩輪是上限，所以第 3 版只做自我檢查，不再送審。第 3.1 版（2026-11-13）加入 D11–D14，來自 T-0071 與 T-0072 第 7 階段的安全審查，同樣只做自我檢查：MN7 拆成兩條 ruleset、F6 先把 `latest` 移回前一版、commit 一律比對，以及 MN7 與 MN2 要在任何 `v*` tag 之前完成。

本文由 `traceability.md` 推導，那份檔案收錄：

- 決定（Q1–Q4、U1–U10、D1–D14）與被覆寫的契約 O1–O5；
- seam 0009-S1 到 S5 與名詞表；
- 新的 X9（K1–K4，訊息 XM）、workflow（W1–W8）、manifest 規則 MR1–MR2；
- 發布流程（RP0–RP7）、使用者步驟（MN1–MN7）與失敗表（F1–F7）；
- 信任邊界 B1–B3、文件規則 R2 與 DS1–DS3，以及 K、W、M、D、S8 各列。

第 1 階段的紀錄在兩份本機研究筆記：`.proj.research/2026-11-11-trusted-publishing-stage1.md` 與 `.proj.research/2026-11-11-npm-trusted-publishing.md`。

## 問題陳述

`npm create wxl` 背後的套件是 create-wxl。上游目前手動發布它：在 `create-wxl/` 裡執行 `npm publish`，靠的是存在自己電腦上的 npm 登入。

到目前為止的兩次發布，都卡在這個登入：

- **3.0.0（T-0029）**：發布閘門通過了，上傳時卻得到 `E404`。原因是 token 已經過期，而閘門不檢查登入。
- **3.1.0（T-0067）**：登入又過期了，閘門的 X9 回報「npm 名稱已經由別人維護」，可是唯一的維護者就是發布者本人。

放在筆電上的憑證也可能外洩。拿到它的人可以發布一個版本，之後每位老師的 `npm create wxl` 和 `pnpm range:upgrade` 都會執行它。npm 本身也正在限制「能繞過 2FA 的 token」直接發布。

## 解法

推送 release tag 後，GitHub Actions 透過 trusted publishing（OIDC）把 create-wxl 送進 npm 的 staged。任何地方都不存 token。上游先拿這個 staged 版本去比對產生它的 run 和自己確認過的 commit，再到 npmjs.com 用 2FA 核准，版本才能被安裝。

發布閘門在這個 job 裡執行，前面還有一道 guard，確認被 tag 的 commit 在 `main` 上。閘門的 X9 改成確認自己是在上游、為這個版本執行的 publish workflow 裡。所以在其他任何地方開始的發布，都會在送到 npm 之前停下，並說明原因。

原本靠登入把關的部分，改由 npm 與 GitHub 的設定接手：

- npm 只接受那個 workflow，而且要在只允許 `v*` tag 部署的 environment 裡執行。
- 兩條 tag ruleset 讓這些 tag 不能被移動或刪除，連上游自己的憑證也一樣。
- 設定 trusted publisher 的同時撤銷舊 token。
- 第一個 staged 版本核准之後，套件就拒絕任何 token。

每個版本都帶有 provenance 聲明，寫明建置它的 repository、workflow、tag 與 commit。

## 使用者故事

1. 身為上游，我希望推送 release tag 就能把 create-wxl 送進 npm 的 staged，這樣我就不必為了發布而維持、更新 npm 登入。
2. 身為上游，我希望 staged 版本要等我用 2FA 核准，而且核准前要比對哪些項目寫得清清楚楚，這樣老師拿到的每個版本都經過我檢查。
3. 身為上游，我希望從自己終端機開始的發布永遠到不了 npm，而且會說出是哪一項檢查擋下的，這樣我不會去追一個不存在的「維護者問題」。
4. 身為上游，我希望發布步驟（包括我自己要做的）都寫在同一個地方，這樣下一次發布不必靠記憶。
5. 身為老師，我希望每個 create-wxl 版本都帶著 provenance，寫明上游的 repository、workflow、tag 與 commit，這樣我能確認自己執行的程式從哪裡來。
6. 身為 fork 或建立靶場的老師，我希望靶場裡的 publish workflow 什麼都不做，這樣我推任何 tag 都不會意外發布東西。

## 實作決定

- **改寫閘門的 X9（D1、D2）。**
  - `checkPublish` 照 spec 0005 跑完 X1–X8，再檢查 X9。
  - X9 讀注入的環境。環境缺少、不是物件或是陣列時，視為空的；只有 own property 的字串值才算有設定。
  - 依序檢查四個條件，全部成立才通過：K1，在 GitHub Actions 裡執行；K2，repository 是上游；K3，workflow 參照是上游 `publish-npm.yml` 在 tag `v<V>` 上；K4，可以要求 OIDC token。
  - 失敗時丟出一行訊息：以 `X9 (` 開頭，點名第一個不成立的條件，附上固定的原因文字與看到的值（JSON，或 `unset`），最後接一句固定的結尾句，說明 create-wxl 是怎麼發布的。
  - X9 不再向 npm 查維護者或登入者。`checkPublish` 拿掉這兩個參數，npm 輔助函式與它們的測試一併移除。
- **guard 與 control（D8）。**
  - X9 和祖先檢查只防誤操作。它們跑在被 tag 的 commit 自己的 workflow 裡，擋不住刻意的修改。
  - 真正的 control 是：npm 的 trusted publisher 設定、environment 的 tag 規則、tag ruleset、核准前的比對與核准，以及拒絕 token（B1、B2）。
- **新的 workflow 是唯一的發布者（D3）。**
  - **觸發與 job**：`publish-npm.yml` 在推送 `v*` tag 時執行，一次只跑一個。它只有一個 job，只在上游執行（和 `release.yml` 用同一個比較式），在 GitHub environment `npm` 裡，使用 GitHub 提供的 runner。
  - **權限**：workflow 最上層不給任何權限；job 只拿 contents 的讀取權，以及要求 OIDC token 的權利。
  - **步驟，剛好八步，依序**：
    1. 在 tag 上 checkout 完整的 clone，不保留憑證。
    2. 設定 pnpm。
    3. 設定 Node 24，不使用 package-manager cache。
    4. 安裝一個確切的 npm 11 版本，不低於 11.15.0（第一個提供 `npm stage publish` 的版本）。
    5. 確認 commit 是 `origin/main` 的祖先（U7）。
    6. 依 create-wxl 的 lockfile 只安裝 runtime 相依套件，不執行 install script。
    7. 跑發布閘門。
    8. 送進 npm 的 staged。
  - **永遠不做的事**：使用 secret、token 或 npm 設定覆寫；設定環境變數；直接 publish 或移動 dist-tag；加 provenance 旗標（provenance 會自動產生）；還原 cache；使用封閉集合以外的任何鍵。
  - 各個 action 使用和 `release.yml` 相同的 pin，結尾的版本註解也相同。
- **閘門明確地執行（D5）。** npm 的文件沒有說 `npm stage publish` 會不會跑 `prepublishOnly`，所以 job 把閘門當成獨立的一步。X1–X8 在 detached 於 tag 的完整 clone 上執行；之前的步驟只寫入被忽略的路徑或 repository 以外的地方，所以「工作樹乾淨」這項檢查會成立。
- **manifest 寫明 repository（D4、U1、U9）。**
  - create-wxl 的 manifest 在 `license` 之後加上 `repository`，一行一個鍵：type `git`、根目錄 manifest 的 repository URL、directory `create-wxl`。npm 要求這個 URL 和 workflow 的 repository 完全一致。repository 不追蹤任何 `.npmrc`。
  - 這會讓一個 spec 0004 要求不得出現上游 slug 的檔案寫出 slug。本 spec 明確覆寫那條規則（O1、O2）：這一行成為第三類位置，只有 fork 的 rebrand 會改寫它；upstream guard 也只豁免這一行，而且是逐字比對。
  - 在 GitHub fork 裡，fork-init 的預設模式會讓這一行繼續指向上游；fork-init 的 skill 與 README 都會寫明這一點。
  - create-wxl 自己的測試只在上游執行。在轉換過的 fork 上，manifest 測試本來就會因版本號失敗，本 spec 不改變這件事。
- **把發布流程寫成文件（D7、U5、U8）**：新增 `docs/agents/release.md`，標明只適用於上游，並從 `AGENTS.md` 與 `CONTRIBUTE.md` 連過去。內容包括：
  - **每張 code ticket 的第 8 階段**：在終端機確認 manifest 的 repository，以及閘門會拒絕發布；在 CI 確認 workflow 的測試通過。
  - **發布變更**：合併時附上由 release-note skill 產生的 CHANGELOG 條目；這個 skill 只負責產生條目。
  - **推 tag**：使用者確認 tag 名稱與 merge commit 的 SHA；SHA 由使用者自己讀出，不是確認 agent 提出的值（D13）。agent 先確認這個 tag 還不存在，再只推這一個 tag。永遠不用 `git push --tags`（在這個 repo 裡優先於使用者的一般規則），而且一次只推一個 tag。
  - **CI**：建立 GitHub Release 並送進 npm 的 staged；agent 把 release notes 換成 CHANGELOG 條目。
  - **使用者的比對與核准**：只有一筆 staged entry；兩個 run 都成功，而且 publish run 的 commit 等於確認過的 SHA（D13）；npm 顯示的每個欄位都和 run、和確認過的 SHA 相符，而且至少比對到一個欄位，否則由使用者自行決定。之後才核准。
  - **agent 的驗證（重試有上限）**：registry、provenance 聲明的內容，以及一次全新的 `npm create wxl`。
  - **使用者的一次性與每次發布的步驟**，依序是：
    1. 建立兩條 `v*` 的 tag ruleset：一條限制建立，只有上游能 bypass；另一條禁止更新與刪除，不設任何 bypass（D11）。
    2. 把 `npm` environment 限制成只允許 `v*` tag，不設 reviewer。第 1、2 步都要在任何 `v*` tag 之前完成（D14）。
    3. 在第一個 tag 前兩天內建立 trusted publisher（填六個欄位，而且必須是唯一的一組），同時撤銷所有能發布的 token。
    4. 第一次核准之後，設定要求 2FA 並拒絕 token。
    5. 每次發布時核准或退回。
    6. 改名之前先刪除 trusted publisher。
    7. 設定過期時重建，並重新回報欄位。
  - **失敗表**：
    - 只有在沒有任何東西送進 npm 的 staged、而且原因不在 commit 裡時，才能重跑。
    - 原因在 commit 裡時，開一張新的 code ticket 修正，並以下一個 patch 發布。
    - 比對不過的 staged 版本要退回。
    - 核准要等 `release.yml` 成功。
    - 核准後的檢查失敗時，先把 `latest` 移回前一版，再 deprecate 該版本，然後發下一個 patch（D12）。
    - 已核准或已退回的 tag 永不重跑。
  - tag 永遠不移動、不刪除。沒有在 npm 上成為可安裝版本的 tag，對 ADR-0009 來說仍然算上游發布版，GLOSSARY 也會這樣寫。

  這份文件永遠不寫出上游 slug。
- **時機與 ticket 狀態（D10、U4、O3、O4）。**
  - 在本 epic 的 code ticket 落地期間，不推 `v*` tag。
  - 本 epic 的最後一張 ticket 就是第一次 CI 發布。它的 PR 在第 6～7 階段之後合併，它的第 8 階段就是 AC-7。
  - 這張 ticket 維持 `review` 到 AC-7 成立，才改為 `done`。close-out 要等它。
  - npm 頁面上的證據由使用者回報；新的 open question OQ-028 記錄這種驗證方式。
- **其他 spec 一併記錄變更（DS1–DS3）。**
  - 0005 改為第 2.4 版：X9、D4、seam 0005-S2、C42、C43、C45、listing、Seams 的註記，以及 spec 中關於 X9、B2、CI、`main`、「事先詢問」的句子。寫進 0005 的 0009 編號一律加上「0009's」前綴。
  - 0004 加上 O1 的註記；fork-init 的 skill 與兩份 README 寫明這一行會被保留。
  - ADR-0009、0006 的 B2、OQ-021、GLOSSARY 的「設定紀錄」條目都加上註記。
  - OQ-027 詢問 Staged Packages 頁面在核准前會顯示什麼；OQ-028 記錄第 8 階段的驗證方式。
  - 未合併的 T-0068 分支裡 0005 的第 2.4 版不會落地。

## 信任邊界與威脅模型

- **B1：npm 與上游的 Actions job 之間，經由 OIDC。**
  - **保護的事**：只有上游的 `publish-npm.yml`，在 environment `npm` 裡、從上游建立的 `v*` tag 部署時，才能把 create-wxl 送進 staged，而且只能送進 staged。上游把 staged entry 和 run、和自己確認過的 SHA 比對之後，用 2FA 核准，版本才能被安裝。token 撤銷並被拒絕之後，外洩的 token 也無法發布。
  - **不保護：在任意 commit 上打 tag。** 任何持有上游 push 憑證的人（包括 agent）都能在任意 commit 上推 `v*` tag，而執行的會是那個 commit 自己的 workflow，guard 也一樣。能抓到這種情況的，是拿 commit 和確認過的 SHA 比對。
  - **不保護：job 裡的程式碼。** job 裡執行的任何程式碼都能要求 OIDC token，包括各個 action、pnpm、Node、npm CLI、create-wxl 的 runtime 相依套件，以及 repository 本身的程式碼。不裝 devDependencies、不跑 script，只排除了這兩類。
  - **接受的殘餘風險**：上游仍然可以用互動式 2FA 直接發布。
- **B2：上游自己的電腦與 npm 之間。**
  - **保護的事**：`npm publish` 和 `pnpm publish` 會在第一個不通過的檢查停下，到不了 npm。
  - **不是 control**：`--ignore-scripts`，或在終端機執行 `npm stage publish`，可能跳過閘門。但兩者都需要一個已被撤銷、也會被拒絕的憑證，而且非預期的 staged entry 會被退回。
- **B3：上游與 fork 或老師的靶場之間。**
  - **保護的事**：這個 workflow 和發布文件會進到靶場（建立時，以及透過 `pnpm range:upgrade`），但這個 job 在上游以外會被跳過；npm 的 trusted publisher 只指名上游；`create-wxl/` 也不在 release 封存檔裡。
  - **不保護**：證據是靜態的，第 8 階段不包含在 fork 上實際執行。
- **不在威脅模型內**：GitHub、npm 與它們簽發的 OIDC；提供 npm 本身的 registry；對 repository 或 npm 帳號有 admin 權限的任何人。

## 驗收條件

- **AC-1**：在 X1–X8 都成立的前提下：
  - K1–K4 成立時，`checkPublish` 通過。
  - K02–K05 各列的每個輸入，都會丟出 `checks` 為 `['X9']`、訊息為 XM 的錯誤，並依 traceability 的規定點名該列的條件和看到的值。
  - 有多個條件不成立時，只出現 K1–K4 順序中的第一個。
  - `CHECK_EXPLANATIONS.X9` 與預設訊息符合 K13。

  （K01–K05、K07、K13）
- **AC-2**：K06 的每一種環境（空的、缺少、`null`、字串、陣列、從 prototype 繼承變數的物件）下，X9 都點名 K1 並顯示 `unset`；訊息以結尾句收尾，版號已代入。（K06）
- **AC-3**：閘門保留原有行為，並移除 npm：
  - X1–X8 的違規會在 X9 之前丟出；X1–X8 各自仍照 0005 的 C42 失敗。
  - 多傳 `npmView`／`npmWhoami` 不會改變任何結果。
  - wiring 傳入 `process.env`。
  - `publish-io.mjs` 只 export K11 列出的四個函式。
  - K11 列出的檔案都不含 K11 的字串，被移除的 export 也沒有測試。
  - 在 K12 的兩種 CI checkout 形狀上，X3、X4、X6、X7 都成立。

  （K08–K12）
- **AC-4**：`publish-npm.yml` 符合 W1–W8，traceability 要求逐字的地方逐字相同，包括：
  - 觸發條件；
  - 一個只在上游執行的 job；
  - 權限、concurrency、environment；
  - pin 好的 action，連同註解與確切的輸入；
  - 第 4 步是 npm 11.y（y ≥ 15）；
  - 剛好八步，指令逐字相同；
  - 沒有任何被禁止的字串或鍵；
  - 封閉的鍵集合。

  upstream-only 測試與 rebrand 不變式的測試，依 W09、W10 涵蓋它；祖先檢查指令的行為符合 W12。（W01–W10、W12）
- **AC-5**：manifest 與相關檢查：
  - create-wxl 的 manifest 的 `repository` 符合 MR1：位置、鍵、值與那五行都相同，URL 等於根目錄 manifest 的 URL；其餘部分仍等於 0005 的 listing。
  - rebrand 之後，這個 URL 仍等於根目錄的。
  - guard 只豁免這一行，檔案裡其他出現 slug 的地方都照 M02 回報。
  - repository 不追蹤 `.npmrc`。

  （W11、M01–M03）
- **AC-6**：文件：
  - `release.md`、`AGENTS.md`、`CONTRIBUTE.md` 通過 R2 的每一項行檢查與字串檢查，`release.md` 不寫出上游 slug。
  - DS1–DS3 指名的每個地方都完成它的變更並註明 0009，在第 6 階段判定。

  （D01、D02）
- **AC-7**：發布 ticket 的第 8 階段（RP1–RP7、U4），由第一個被核准、而且通過 RP6 的 `v<V>` 達成：
  - 它的 `publish-npm.yml` run、祖先檢查步驟與閘門步驟都以 success 結束，`npm stage publish` 以 0 結束。
  - 使用者回報：整體只有一筆 staged entry，而且是 `<V>`；兩個 run 都成功；頁面顯示了哪些欄位、每一個都相符。這時 `latest` 仍是前一版。看到的欄位寫進 OQ-027。
  - RP6 的 (a)–(c) 都成立。
  - 發布 ticket 引述使用者回報的以下各項，每一項都等於預期值：MN1 的六個欄位、只有一組 trusted publisher、token 撤銷、collaborator 名單、MN2 的規則、MN7 的兩條 ruleset、MN3 的選項。全部回報之前，AC-7 不算達成。
  - 先前的每一次嘗試，都依它對應的 F 列記錄；F3、F4、F6 若發生，依 S8-06、S8-07 記錄。

  （S8-01–S8-07）
- **AC-8**：每張 code ticket 的第 8 階段，在 PR 合併前記錄 RP0 的三項輸出：
  - `npm pkg get repository` 印出 MR1 的物件；
  - `check-publish.mjs` 以 1 結束，並點名某一項檢查；
  - PR 的 CI 通過 workflow 測試。

  （S8-08）

## 測試決定

- 測試只檢查 seam 上的行為，不測 seam 裡面的輔助函式：
  - `checkPublish` 丟出的檢查 id 與訊息（0009-S1）；
  - 解析後的 workflow、它的原始文字，以及祖先檢查指令（0009-S2）；
  - manifest、guard 與被追蹤的路徑（0009-S3）；
  - 發布文件（0009-S5）。
- **0009-S1** 延伸 0005 的發布測試（`create-wxl/test/publish.test.mjs`）。X1–X8 的案例保持原樣，只是改用滿足 K1–K4 的 `env` 執行。K11 是靜態讀檔。T-0068 分支裡有針對舊 X9 原因的測試，只沿用它們的結構。
- **0009-S2** 延伸三處：
  - `tests/unit/workflows/upstream-only-jobs.test.ts`；
  - `tests/unit/scripts/fork-init.test.ts` 裡的 T52；
  - `fork-template-parity.test.ts` 已經在做的 pin 原始文字比對。

  `toolchain-parity.test.ts` 仍只負責題目建置用的 toolchain。
- **0009-S3** 延伸 `create-wxl/test/upstream-config.test.mjs`（0005 的 C45）與 `tests/unit/scripts/upstream-guard.test.ts`。
- **0009-S5** 放在 `create-wxl/test/`，所以永遠不會進到靶場。做法比照 0005 的 U 項：行檢查用修剪過的行，字串檢查先把連續空白收成一個。
- **0009-S4** 只在發布 ticket 裡執行，由使用者核准。實際送進 npm 的 staged 是安全的：核准之前什麼都裝不到，錯誤的 staged 版本會被退回。

## 範圍外

- 發布 create-wxl 以外的任何東西，以及對 `release.yml` 或網站 release asset 的任何修改。OQ-019 的 release notes 問題仍然 open，RP4 繼續手動替換 notes。
- 在 pull request 上試跑或測試發布：npm 沒有獨立於正式套件之外的 staging 目標。
- 在 `npm` environment 上設定 required reviewer（Q4）。
- fork 發布自己的 create-wxl。fork 會被跳過（B3），套件仍屬於上游。
- 把閘門和送進 staged 拆成兩個 job。npm 的文件沒有提到把事先打包好的 tarball 送進 staged，而且 OIDC 權利仍然會在負責 staged 的那個 job 裡。
- 讓 fork-init 的預設模式改寫 `create-wxl/package.json`（U9）。
- 稽核 create-wxl 的相依套件與 pin 住的 action（除了維持目前的 pin 之外）。

## 補充說明

- **本 spec 依賴的 npm 事實**（2026-11-11 從 npm 文件讀取，研究筆記列出了頁面）：
  - trusted publishing 需要 npm ≥ 11.5.1 與 Node ≥ 22.14.0；送進 staged 需要 npm ≥ 11.15.0。
  - job 需要 `id-token: write`，而且只支援 GitHub 提供的 runner。
  - trusted publisher 要寫 workflow 的檔名（含副檔名），`repository.url` 必須完全一致。
  - 設定建立後兩天內沒有成功的第一次發布，就會過期。
  - trusted publisher 可以限制成只能送進 staged。
  - 核准與退回一律需要 2FA。
  - 公開的 repository、公開的套件會自動產生 provenance。
- **npm 文件沒有寫、所以不依賴的事**：
  - `npm stage publish` 會不會跑 `prepublishOnly`、會不會印出 shasum；
  - staged 版本會保留多久；
  - Staged Packages 頁面在核准前會顯示什麼（OQ-027）；
  - 先 staged 再核准的版本會不會帶 provenance（RP6 會檢查）；
  - 光是送進 staged 算不算第一次成功發布（MN6 兩種情況都處理）；
  - 被退回的版號能不能重用（從不嘗試）；
  - OIDC job 裡的 `npm whoami` 會不會回應。
- **套件會被建置兩次。** `npm stage publish` 經由 `prepack` 打包，`prepack` 會在閘門檢查過之後重建 `dist/`。輸入（HEAD、引擎、同一個 Node）相同，所以內容也相同；但閘門檢查的是那一次建置，不是實際上傳的位元組。
- **ticket 編號。** T-0068 已經被未合併的分支 `tickets/T-0068/x9-npm-login-message` 使用。第 4 階段會把它記為「由本 epic 取代」，本 epic 的 ticket 編號接在它之後。
- **第一次 CI 發布的版號**由發布 ticket 決定。本 epic 修改的程式碼會隨套件出貨，所以至少是一個 patch 版。
