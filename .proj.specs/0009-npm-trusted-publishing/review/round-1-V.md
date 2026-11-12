# 第 1 輪對抗式審查：Verifiability（軸 2），epic 0009-npm-trusted-publishing

審查版本：`spec.en.md` blob `37699a5`、`traceability.md` blob `9bf66b5`（commit `2a3cde8`，分支 `spec/0009-npm-trusted-publishing`），程式碼基準為 `main` `af4e1ac`。我讀的是 working tree 檔案。另外直接讀過：`create-wxl/src/publish.mjs`、`publish-io.mjs`、`scripts/check-publish.mjs`、`scripts/prepare-dist.mjs`、`package.json`、`test/upstream-config.test.mjs`、`test/publish.test.mjs`（grep）、`.github/workflows/release.yml`、`tests/unit/workflows/upstream-only-jobs.test.ts`、`toolchain-parity.test.ts`、`docs/agents/workflow.md`、0005 traceability 的 X1–X9／C42／C43／C45，以及 `.proj.research/2026-11-11-npm-trusted-publishing.md`。我沒有網路；凡是依賴 npm 或 GitHub 行為的判斷，都在信心欄註明。

本輪找到的問題都可以在 ticket 內解決，因此沒有 P0。不過 V-10、V-25 若照嚴格標準讀，可能升為 P0，請使用者裁決。

## P1：真實問題，可在 ticket 內解決

**V-1：「naming the condition」該怎麼判定，沒有定義**
- 位置：spec.en.md:106-109（AC-1）、traceability.md:60-65（K 表「Cause named on failure」欄）、:170（K07）
- 違反：AC 必須能不經詮釋判定 pass/fail。
- 證據：AC-1 要求 X9 失敗時「naming the condition」。K 表同時給了 id（K1–K4）和描述句（例如 `not running in GitHub Actions`），但沒說訊息裡應該出現哪一個、是否逐字。K07 要求「cause K1 only」，所以測試必須斷言「K3 的原因沒有出現」。如果不知道 K3 原因的確切字串，就無法斷言它不存在。
- 影響：寫測試的人只能自己選字串（id、描述句或子字串）。K07 的「只列第一個」可能被一個過寬或過窄的斷言判為通過。
- 信心：high
- 請求等級：P1
- 建議：在 K 表把每個條件失敗時的確切訊息片段寫成逐字字串，並寫明是否含 id `K<n>`。

**V-2：K1、K4 失敗時要不要列出觀察到的值，AC-1 與 traceability 互相矛盾**
- 位置：spec.en.md:107-108、traceability.md:62、:65、:165、:168
- 違反：AC 必須能判定；spec 必須從 traceability 派生。
- 證據：AC-1 寫「For each boundary of K02–K05 … naming the condition and the value seen (or "unset")」，四個條件一律套用。但 K 表只在 K2、K3 列了「names the value, or "unset"」；K1（`not running in GitHub Actions`）和 K4（`no OIDC token available`）沒有列值。K02、K05 兩列的期望也只寫「X9, cause K1」「X9, cause K4」。另外，值要怎麼呈現沒有規定：`'true '`（尾端空白）和 `''`（空字串）如果直接印出來，肉眼看不出差別，「names the value seen」就判不出來。
- 影響：K1、K4 的實作要不要印值，兩份文件給出相反的答案；同一個實作會被兩份文件判出相反結果。
- 信心：high
- 請求等級：P1
- 建議：統一成一種規則（例如四個條件都印值，用 `JSON.stringify` 引號包住；未設定時印 `unset`），寫進 K 表，並同步 K02、K05 兩列。

**V-4：結尾那句話的確切文字不固定**
- 位置：spec.en.md:52-54、:110-112（AC-2）、traceability.md:67-68、:169（K06）
- 違反：AC 必須能判定。
- 證據：spec 寫的是「create-wxl is published only by upstream's publish workflow on a `v<V>` tag and then approved on npmjs.com」；traceability 寫的是「create-wxl is published only by upstream's `publish-npm.yml` workflow when a `v<V>` tag is pushed, and is then approved on npmjs.com.」兩者用字不同。另外有三點沒說清楚：
  - traceability 那句是不是逐字字串；
  - `v<V>` 要不要代入實際版號；
  - 反引號是否屬於訊息內容。
  AC-2 的判定是「ends with」，需要一個確切字串才能比對。
- 影響：同一個實作，照 spec 或 traceability 會判出不同結果。
- 信心：high
- 請求等級：P1
- 建議：traceability 給出一句逐字句子，寫明 `<V>` 會代入版號、有沒有反引號、結尾標點；spec 改成引用這一句。

**V-6：「The gate spawns no npm command」在指定的 seam 觀察不到**
- 位置：spec.en.md:114（AC-3）、traceability.md:39（0009-S1 的 Observed 欄）、:172（K09）
- 違反：AC 必須能在 spec 指定的 seam 上觀察到。
- 證據：0009-S1 的觀察對象只有「the returned or thrown `PublishError`: its `checks` and its message」。但 `checkPublish` 只透過注入的 `runGit`／`archive` 對外互動，要直接 spawn `npm` 的話會走 `node:child_process`（現行做法在 `publish-io.mjs:80-96`），並不經過任何注入介面。拋出的錯誤無法證明「沒有 spawn」。另外，vocabulary 對「the gate」的定義（traceability.md:52）同時包含 `prepare-dist.mjs`，而 S1 只涵蓋 `checkPublish`。
- 影響：K09 的後半句無法在 S1 上判定；可能只靠「npmView 沒被呼叫」間接推論，或者乾脆不驗。
- 信心：high
- 請求等級：P1
- 建議：指定觀察方法。例如用 `vi.mock('node:child_process')` 記錄所有 spawn，或對 `src/` 做靜態掃描不得出現 `npmCommand(`／`'npm'`；並寫明範圍是否包含 `prepareDist`。

**V-9：AC-4 說滿足 W1–W8，但 W8 沒有 matrix 列，也無法在 0009-S2 上觀察**
- 位置：spec.en.md:116（AC-4「satisfies W1–W8」）、traceability.md:119（W8）、:175-183（W01–W09 對應 W1–W7、W2、W4，沒有 W8）、:40（S2 觀察的是解析後的 YAML）
- 違反：每條規則都要有驗收出口，而且能在指定的 seam 觀察到。
- 證據：W8「No step before the gate writes a file outside `.gitignore`d paths」講的是執行時期行為。光解析 YAML 判斷不了 `pnpm install`、`npm install --global` 實際寫了什麼。self-check（:206-207）的論證只是推理，不是觀察。實際能觀察到 W8 的只有 stage 8 的 X4 通過（S01），而 S01 沒提到 W8。
- 影響：AC-4 宣稱涵蓋 W8，但沒有任何測試或紀錄能判定 W8；一旦違反，要到真實 release 才會發現，而且依 D6 會耗掉一個版號。
- 信心：high
- 請求等級：P1
- 建議：新增 W10 列。可以把 W8 降為由 W06 的步驟白名單推出的設計理由，也可以在 S01 明確寫「gate 步驟中 X4 通過即為 W8 的證據」。

**V-10：「The upstream-only and toolchain tests cover the new workflow」用的是模糊動詞**
- 位置：spec.en.md:120-121、traceability.md:182（W08）、:183（W09）
- 違反：AC 必須能判定。按 prompt，模糊詞（類似「as needed」）可評 P0；這裡因為 W08、W09 有部分具體化，我請求 P1。
- 證據：
  - W08 要求 `upstream-only-jobs.test.ts`「counts the new `if:` occurrence」。但該檔的「five times」計數只寫在註解裡（`upstream-only-jobs.test.ts:15-18`），沒有任何斷言在計數，所以「counts」對應不到可判定的測試結果。
  - W09 要求 `toolchain-parity.test.ts`「covers `publish-npm.yml` (Node 24, the shared pins)」。但這支測試目前完全沒有對 Node 版本或 checkout／pnpm／setup-node pin 的斷言（`toolchain-parity.test.ts:58-155` 只檢查 install-action、rust-cache、binaryen），而且它的範圍註解（:6-18）限定在「builds challenge artifacts」的 job。把 `publish-npm.yml` 加進 `WORKFLOWS`，對它不會產生任何斷言，所以要怎樣才算「covers」沒有定義。
  - spec 又要求「extended rather than duplicated」，而 W04 本身就要驗同一組 pin，兩者分工不明。
- 影響：W09 可能以零斷言通過，也可能在兩支測試裡重複出現。
- 信心：high
- 請求等級：P1（嚴格讀法可為 P0）
- 建議：逐條列出要新增的斷言，例如「`upstream-only-jobs.test.ts` 新增 `it`：`publish-npm.yml` 的 `jobs.stage.if === EXPECTED_IF`，並更新註解計數為 3 個 `if:`」「`toolchain-parity.test.ts` 新增：三個 action 的 `uses` 與 `release.yml` 相同、`node-version === 24`」，並指明 W04 由哪一支測試承擔。

**V-14：R1 沒規定 `repository` 的 key 位置，但 C45 會比對 key 順序**
- 位置：traceability.md:125（R1）、:184（M01）、spec.en.md:122-123（AC-5）、`create-wxl/test/upstream-config.test.mjs:59-63`
- 違反：AC 必須能判定。
- 證據：C45 用 `JSON.stringify(createWxlPkg) === JSON.stringify(expected)` 比對，註解寫明「the listing's key order matters too」。R1 只說「gains `"repository": {...}`」，沒說放在哪個 key 之後；AC-5 卻要求「otherwise still equals 0005's listing」。R1 物件內部的順序（`type`、`url`、`directory`）也沒說是否固定。
- 影響：同一份 manifest 可能被不同的 C45 寫法判出不同結果；0005 的 listing（D02）要寫在哪個位置也沒有依據。
- 信心：high
- 請求等級：P1
- 建議：在 R1 寫明位置（例如緊接在 `license` 之後），並註明內部 key 順序依所列。

**V-15：AC-6 的文件驗收沒有逐字字串，也沒有 seam**
- 位置：spec.en.md:124-126（AC-6）、traceability.md:129、:185-186（D01、D02）、:35-42（S1–S4 都不涵蓋文件）
- 違反：AC 必須能判定，而且要能在指定的 seam 觀察到。
- 證據：AC-6 要求 workflow.md「has a release section listing P1–P6 with their owners and order, N1–N4 with their timing, and D6」。但以下都沒有指定：
  - 章節標題；
  - 是否要出現 P1–P6／N1–N4 的 id；
  - 要用哪些逐字字串。
  0005 處理文件時，用的是「checked with `grep -F` after collapsing runs of whitespace」（0005 traceability.md:371）加逐字字串。本 spec 的 seam 表沒有任何一個涵蓋文件。D02 的「records revision 2.4 … naming 0009」比較可判定，但「X9's row, D4, D12 … changed by this epic」是否到位，仍要靠閱讀者判斷。另外 `docs/agents/workflow.md` 目前完全沒有 release／npm 字樣（我 grep 過），只能靠新增章節本身判定。
- 影響：「lists … with their owners and order」要靠審查者主觀判斷改寫過的文字是否等義。
- 信心：high
- 請求等級：P1
- 建議：仿照 0005 的 U 項，固定章節標題和每一步必須出現的字串（或要求 P/N id 出現），並新增一個 seam（或沿用 0005-S3 的做法）用測試驗。

**V-16：D6 在 spec 與 traceability 的措辭不同，「before staging」與內外因的分類也要詮釋**
- 位置：spec.en.md:81-83、traceability.md:31（D6）、:138（P6）、:191（S05）
- 違反：AC 必須能判定；spec 必須從 traceability 派生。
- 證據：
  - spec 的可重跑原因是「registry, network, a missing npm setting」，traceability D6 只有「registry or network」。S05 舉「N1 missing」當外因，等於採用 spec 的版本。
  - 「fails before staging」也沒有定義邊界。N1 缺少或過期（兩天）時，失敗會發生在 `npm stage publish` 步驟本身，不是之前。
  - 如果 gate 因為 `actions/checkout` 的 tag 處理而失敗（研究筆記 :41-43 已列為待確認），算 repository 內因還是外因，也要靠詮釋。
- 影響：AC-6 要寫進文件的 D6 是哪一版、S05 的判定結果，都會因為讀的是哪份文件而不同。依 D6，判錯就會耗掉一個版號，或錯誤地重跑。
- 信心：high
- 請求等級：P1
- 建議：traceability D6 以單一列表列舉可重跑的原因（例如 registry 5xx、網路錯誤、N1／N2 缺少或過期）；把「before staging」改成「nothing was staged」；其餘一律算 repository 內因。

**V-17：AC-7 第 4 點不論內容都會通過，而且沒有期限**
- 位置：spec.en.md:132、traceability.md:146（N3）、:190（S04）
- 違反：AC 必須能判定；stage 8 必須觀察真實行為。
- 證據：「after the user disallows tokens, the record quotes what they report」——只要紀錄引用了使用者的回報就算通過，不管回報說的是「已設定」還是「還沒做」。N3 的時機只寫「after the first staged version is approved」，沒有截止點：stage 8 收尾時使用者還沒做 N3，AC-7 算 pass、fail 還是 pending，無從判定。紀錄放在哪裡（哪個 ticket 檔）也沒指名。B1、B2 都說「N3 is the control」，但這條 AC 驗不到 control 是否到位。
- 影響：spec 自稱的唯一安全控制，在 stage 8 可能沒被驗證就結案。
- 信心：high
- 請求等級：P1
- 建議：寫明期限（例如 AC-7 在 N3 完成前不算通過）和判準（使用者回報 Publishing access 頁面顯示的確切選項文字）；必要時加上可由 agent 觀察的指令（npm CLI 是否有可查詢 MFA／token 設定的指令，我不確定，信心 low）。

**V-18：首次執行失敗時，AC-7 第 1 點與第 5 點互相衝突**
- 位置：spec.en.md:128、:133-134、traceability.md:187、:191
- 違反：AC 必須能判定。
- 證據：第 1 點要求「the tag's `publish-npm.yml` run concludes success」；第 5 點允許首次失敗，之後重跑或改發下一個 patch。若依 D6 改發下一個 patch，「the tag」就換成新的 tag。由新 tag 達成第 1 到第 4 點能不能讓 AC-7 通過、首次失敗那個 tag 的 run 結論是否不計入，都沒寫。S05 的「re-running the job is allowed」描述的是許可，不是可觀察的結果。
- 影響：首次失敗時，AC-7 判不出 pass 或 fail。
- 信心：high
- 請求等級：P1
- 建議：改寫成「第 1 到第 4 點由第一個 staging 成功的 `v<V>`（可能是重跑或下一個 patch）達成；之前每次失敗都記錄原因與 D6 分類」。

**V-19：S03 只驗 provenance「present」，判定不了 user story 5**
- 位置：spec.en.md:41-42（story 5）、:130、traceability.md:189（S03）
- 違反：每個 user story 都需要能判定的 AC。
- 證據：story 5 要求 provenance「pointing at upstream's repository and commit」，但 S03 只要求 `dist.attestations` present。attestation 存在，不代表它指向 `BrowserLaboratory/wxl-platform` 和 tag 的 commit。
- 影響：story 5 沒有被判定；provenance 指向錯誤的 repository 或 commit 也會通過。
- 信心：medium（attestation 的確切欄位我沒有用網路確認）
- 請求等級：P1
- 建議：加一條可觀察的判準，例如 npmjs.com 版本頁的 provenance 區塊顯示的 source repository、commit 與 `git rev-parse v<V>^{commit}` 一致，或使用 `npm audit signatures` 等指令（需確認）。

**V-20：stage 8 只能在 merge 之後執行，與 workflow.md「stage 8 在 PR merge 前」衝突，spec 也沒指名 merge 前的 stage 8 surface**
- 位置：spec.en.md:127、:148-150、traceability.md:42（0009-S4）、`docs/agents/workflow.md:160-161`、`:178-179`、`:88-89`
- 違反：prompt 要求「each stage 8 criterion names a surface that can actually be exercised」。
- 證據：0009-S4「cannot run before the epic lands」。但 workflow.md:178-179 規定 PR 要等「the ticket's stage 8 record is written」才能標為 ready；:160-161 寫「stage 8 runs there before the pull request merges」。spec 沒說實作 ticket 的 stage 8 surface 是什麼，也沒有明確宣告覆寫這個順序（與 Contract 軸重疊，這裡只就可驗證性回報）。
- 影響：實作 ticket 的 stage 8 gate 無法依規達成，到 stage 4／5 才會卡住；或者被默默略過。
- 信心：high
- 請求等級：P1
- 建議：spec 明確說明實作 ticket 的 stage 8 是什麼（例如在 CI 上以 `act` 或 dry-run 驗 X9 及 workflow 解析），並明確覆寫順序：AC-7 由 epic 之後的 release ticket 執行。

**V-22：P4 的「checked」沒有內容，而 B1 把這次核准當成唯一的防線**
- 位置：traceability.md:136（P4）、:153（B1 的 Does not protect）、spec.en.md:93-95
- 違反：AC 必須能判定（AC-6 要求文件列出 P4，AC-7 要求 P4 被執行）。
- 證據：P4 只寫「The staged version is checked (`npm stage list`, the Staged Packages tab) and approved」。B1 說「approval (P4) is the only check, so the maintainer approves only a version whose tag they made」，但沒有規定要檢查什麼，例如：
  - staged 版本的 provenance commit 是否等於自己打的 tag；
  - workflow run 的 URL 是否吻合；
  - tarball 內容。
  「whose tag they made」無法觀察。
- 影響：寫進文件的 P4 和 stage 8 的 P4 都判不出有沒有做到 B1 需要的檢查。
- 信心：medium
- 請求等級：P1
- 建議：P4 列出逐項檢查（版號、staged 版本的來源 run 和 commit 等於 `v<V>^{commit}`），並在 S02 記錄比對結果。

## P2：值得記錄

**V-3：AC-1 括號裡的邊界清單和各 K 列不一致**
- 位置：spec.en.md:107-108、traceability.md:165-168
- 證據：AC-1 括號列了「unset, empty, wrong case, trailing space, …」，看起來像是要套用到 K02–K05 每一列。但 K03 沒有 empty 和 trailing space，K04 沒有 empty，K05 只有 unset 和 `''`。K4 的「non-empty string」對只含空白的 `' '` 怎麼判，也沒說。
- 影響：測試清單是取聯集還是各列分開，要靠詮釋。
- 信心：medium
- 請求等級：P2
- 建議：AC-1 改成直接引用 K02–K05 各列，不另列括號。

**V-5：`CHECK_EXPLANATIONS.X9` 的新文字沒有 AC，訊息怎麼組成也沒有規定**
- 位置：traceability.md:69-70、`create-wxl/src/publish.mjs:49`、`:54-57`
- 證據：traceability 規定 `CHECK_EXPLANATIONS.X9` 改成新字串，但沒有任何 matrix 列或 AC 驗它。`PublishError` 只有在沒給 message 時才會用 explanations 組訊息，X9 帶自訂訊息時，這個字串會不會出現在訊息裡沒有規定。
- 影響：這是一條沒有驗收出口的規則。
- 信心：high
- 請求等級：P2

**V-7：「helpers no longer exist」的範圍不清**
- 位置：spec.en.md:114-115、traceability.md:174（K11）、`create-wxl/src/publish-io.mjs:56-78`、`create-wxl/test/publish-io.test.mjs:11`、`:92-151`
- 證據：K11 只點名 `createNpmView`、`createNpmWhoami`。只服務它們的 `parseNpmViewMaintainers`、`npmCommand` 及其測試要不要一起移除，D2 的「their real implementations are removed」沒說。Testing Decisions 也完全沒提 `publish-io.test.mjs`。
- 影響：保留或刪除都可以主張符合規格。
- 信心：high
- 請求等級：P2

**V-8：`check-publish.mjs passes process.env` 只能靠讀原始碼觀察**
- 位置：traceability.md:39、:174
- 證據：`check-publish.mjs` 把 root 寫死為它的上層目錄（`check-publish.mjs:15-16`）。在開發 checkout 執行時，X3／X6 會先失敗，根本走不到 X9，所以無法用行為觀察 `env` 有沒有傳對。
- 影響：只能做靜態檢查，但 spec 沒說明這一點。
- 信心：medium
- 請求等級：P2
- 建議：寫明以靜態方式判定，或抽出可注入 root 的 wiring。

**V-11：npm 版本上限與「first」的說法前後不一**
- 位置：traceability.md:102（註解「an exact 11.x」）、:116（W5「at or above 11.15.0」）、spec.en.md:63、:119（AC-4「installed first」）、traceability.md:117（W6 把 npm 放第 4 步）
- 證據：
  - `npm@12.0.0` 依 W5 合格，依註解不合格。
  - AC-4 說「first」，但 W6 把它排在第 4 步。
  - W5 的「before any other npm command」：用字串比對 `npm` 會誤中 `pnpm …`。pnpm/action-setup 內部會不會呼叫 npm，我沒有確認（信心 low）。
- 信心：high（措辭不一）／low（action 內部行為）
- 請求等級：P2

**V-12：W7／AC-4 禁止清單的範圍和替代判準**
- 位置：spec.en.md:119-120、traceability.md:118、:181
- 證據：
  - AC-4 寫「no secret, token variable」，範圍是開放的；W7 卻是封閉清單（`secrets.`、`NODE_AUTH_TOKEN`、`NPM_TOKEN`）。
  - W7 只檢查「step」，job-level 或 workflow-level 的 `env:` 帶入 token 會照字面通過。
  - `setup-node` 的 `registry-url` 輸入沒有列入。
  - 「no step restores a cache」用「沒有 `cache` input」來代替判定。但 setup-node v5 以後有 `package-manager-cache` 自動快取（我記得只對 npm 生效；根目錄 `packageManager` 是 `pnpm@10.28.0`，所以目前可能不受影響）；pnpm/action-setup 有沒有快取輸入我也不確定。
- 信心：medium／low
- 請求等級：P2
- 建議：把掃描範圍擴大到整份 YAML；明確列出禁止的 input（`cache`、`package-manager-cache`、`registry-url`）。

**V-13：W06「the seven steps in order」沒說是否必須剛好七步**
- 位置：traceability.md:117、:180
- 證據：沒規定能不能多加步驟（例如 `npm --version`），能不能加 `name:`，前五步的 `run` 是否要逐字相符。
- 信心：medium
- 請求等級：P2

**V-21：S02 由誰觀察、需要什麼授權，沒有說明**
- 位置：traceability.md:188、研究筆記 :14
- 證據：研究筆記記錄「Stage list/view/approve/reject cannot use OIDC tokens」，所以 `npm stage list` 需要傳統登入，而這次問題的起因正是本機 token 已過期。S02 沒說由 agent 還是使用者觀察；「`latest` is still the previous version」也沒給指令（例如 `npm view create-wxl dist-tags.latest`）。
- 信心：medium
- 請求等級：P2

**V-23：AC-2 和 user story 3 只在 seam 上用 `{}` 驗證**
- 位置：spec.en.md:37-38、:110-112、AGENTS.md hard rule 4
- 證據：在真正的終端機執行 `npm publish` 時，通常會先在 X3／X4／X6 失敗（HEAD 不在 tag 上、tree 不乾淨），不會走到 X9 給出「只由 CI 發布」的理由。AC-7 也沒有一條是在真實 surface 上觀察 B2 的。
- 影響：story 3 宣稱的使用者體驗沒有在真實 surface 上驗證過。
- 信心：medium
- 請求等級：P2

**V-24：S01「log shows the gate passing」在 log 裡沒有正面訊息可看**
- 位置：traceability.md:187、`create-wxl/scripts/check-publish.mjs:18-34`、`prepare-dist.mjs:14-23`
- 證據：這兩支腳本成功時都不輸出任何內容，只能從步驟的結論看出有沒有通過。
- 信心：high
- 請求等級：P2
- 建議：改寫成「the gate step concludes success」。

**V-25：N3「revoke tokens no longer needed」用的是近似「as needed」的模糊詞；self-check 的「within the session of the release」也很模糊**
- 位置：traceability.md:146、:211-212、spec.en.md:80
- 證據：「no longer needed」要靠詮釋。它出現在使用者步驟，而對應的 S04 只要求引用回報，所以我請求 P2。若把 N3 視為 AC 的一部分，按 prompt 規則應評 P0，請使用者裁決。
- 信心：medium
- 請求等級：P2（嚴格讀法可為 P0）
- 建議：改成「撤銷所有可以發布 create-wxl 的 token」。

## 我檢查過但沒有發現問題的部分

- K02（GITHUB_ACTIONS 的五種邊界）、K07 的順序、K08、K10 引用 C42：都可以在 S1 判定。
- W01–W04 的解析結果可以和 `release.yml` 的字面值逐字比對：`if:` 在 :19，三個 `uses` 在 :32、:53、:56，`node-version: 24` 在 :58。
- S03 的 `range.json` 欄位（`upstream.version`、`upstream.commit`，`pristine.mjs:100-103`）可以判定。

共計：P0 0 件、P1 14 件、P2 11 件。
