# 0009-npm-trusted-publishing 第 1 輪審查：Completeness 軸（C）

審查版本：`spec.en.md` blob `37699a58…`、`traceability.md` blob `9bf66b53…`（`2a3cde8`），程式碼基準是 `main` 的 `af4e1ac`。我讀的是 working tree，沒有改任何檔案。
以下「直接讀到」指我親自讀過該檔該行；「推論」指我依據讀到的內容推出、沒有實際執行驗證。

---

### C-1 R1 讓 `create-wxl/package.json` 直接寫出 upstream slug，違反 confinement 規則，而矩陣沒有任何一列涵蓋這件事
- **位置**：traceability.md:125（R1）、:184（M01）、:195–196（self-check 宣稱「no conflict with an existing rule」）；spec.en.md:70–72、:122–123。程式碼：`tests/unit/scripts/upstream-guard.test.ts:51–58`（keep list）、`:128–158`（`guardViolations`）、`:133–135`（只有根目錄 `package.json` 的 A1 URL 行豁免）、`:776–783`（upstream 才跑的 real-tree 測試）；`.proj.specs/0005-create-wxl/traceability.md:56–57`（「create-wxl's sources, tests and fixtures never spell the upstream repository slug」）。
- **違反的要求**：{type × field × boundary} 都要對到 AC；矩陣列的預期行為不能和既有規則衝突。
- **證據（直接讀到）**：`guardViolations` 對每個 tracked text file 做大小寫不敏感的 slug 比對；豁免只有 keep list（`CHANGELOG.md`、`scripts/fork-init.ts`……、`.proj.specs/`、`.proj.tickets/`）和 `path === 'package.json'` 的 `repository.url`／`bugs.url`／`homepage` 行。`create-wxl/package.json` 兩者都不是。R1 的值 `git+https://github.com/<UPSTREAM_SLUG>.git` 一代入，就是字面 slug。
- **影響（推論）**：照 R1 實作，upstream CI 上的「the guard finds no violation among the tracked files」會變紅。要讓它綠，就得改 0004 的 confinement keep list 或豁免規則，但 spec 沒有授權這項覆寫，矩陣也沒有這一列。另外，D01 要寫進 `docs/agents/workflow.md` 的內容如果照抄 B1 的 `BrowserLaboratory/wxl-platform`，同樣會觸發 guard。
- **信心**：高（事實）／中（等級）
- **建議等級**：P1。如果使用者認為覆寫 0004 的 confinement 必須在 spec 層決定，可以升成 P0。
- **建議**：R1 明確覆寫 confinement，把 `create-wxl/package.json` 的 `repository.url` 行列為豁免，並加一列 M02：guard 豁免這一行、該檔其他行照舊回報。D01 註明 workflow.md 不寫出完整 slug。

### C-2 W8 沒有任何矩陣列，AC-4 卻宣稱 W1–W8 都成立
- **位置**：traceability.md:119（W8）、:175–183（W01–W09 的 Boundary 欄依序是 W1、W2、W3、W4、W5、W6、W7、W2、W4）；spec.en.md:116。
- **違反的要求**：每條規則都要有驗收出口。
- **證據（直接讀到）**：沒有任何一列的 Boundary 是 W8。self-check :206–207 只用文字論證「pnpm install 只寫 ignored 路徑」，沒有對應的列或 AC。
- **影響**：W8／D5（X4 看到乾淨的工作樹）沒有可判定的檢查。日後有人在 gate 前加一步，或換一個會寫檔的 action，靜態測試抓不到，要到 stage 8 才發現，而那時依 D6 會燒掉一個版本號。
- **信心**：高
- **建議等級**：P1
- **建議**：加一列 W10，把 W8 落成可觀察的條件，例如「gate 之前的步驟恰好是 W6 列出的五步，`with` 只允許列舉的鍵」，或是一個在 CI checkout 形狀的 fixture 上跑 `git status --porcelain --untracked-files=all` 的測試。

### C-3 CI 上的 repository 狀態（actions/checkout 在 tag push 時的形狀）沒有建模，X3、X4、X6、X7 能否在 CI 成立只靠 stage 8 驗證
- **位置**：traceability.md:30（D5）、:97（checkout 沒有 `with`）、:206–207；spec.en.md:67–69；`.proj.research/2026-11-11-npm-trusted-publishing.md:41–43`（stage 1 已記下「X3 (local tag at HEAD), X4 (clean tree), X6 (pushed tag = HEAD) need checking against `actions/checkout` on a tag push (tag fetched? annotated? clean after install/build?)」）；`create-wxl/src/publish.mjs:163–177`（X3）、`:214–231`（X6）。
- **違反的要求**：矩陣要涵蓋各種 repository 狀態（clone、upstream、shallow、detached）。
- **證據**：直接讀到研究筆記把這件事列為待查，但 spec 和 traceability 沒有任何一列或 self-check 回應 X3／X6／X7 在 `fetch-depth: 1`、detached HEAD、tag 可能被 fetch 成 lightweight 的 checkout 上的行為。推論（沒有引用 GitHub 文件，信心中）：checkout 通常會建出 `refs/tags/v<V>`，`^{commit}` 對兩種 tag 都成立，所以多半可以通過。
- **影響**：這條假設第一次被驗證是 S01，也就是真正的 release。如果失敗屬於「repository 內的原因」，D6 要求改發下一個 patch。另外，T-0067:55–56 的教訓「tag 之前先在本機跑 `check-publish.mjs`」在新的 X9 下已經不可能完全通過，procedure（P1–P6）也沒有任何 pre-tag 預檢。
- **信心**：中
- **建議等級**：P1
- **建議**：加一列，寫明 CI checkout 的預期狀態（shallow、detached、tag ref 存在）以及 X3、X6、X7 在這個狀態下的預期結果；用 publish fixture 模擬 shallow clone 加 lightweight tag 跑一次。或是在 P 程序加一步「tag 前在本機跑 X1–X8 的方法」，並說明 X3／X6 怎麼處理。

### C-4 epic 只套用一半時的狀態（ticket 依序落地，中間有人推 `v*` tag）沒有涵蓋
- **位置**：spec.en.md:171–174；traceability.md:133（P1）、:144（N1 時機）。
- **違反的要求**：矩陣要涵蓋 half-applied 的 repository 狀態。
- **證據（推論）**：如果 workflow ticket 先落地、X9 ticket 還沒落地，CI 上會跑舊 X9（`npm view`／`whoami` 需要傳統 auth，研究筆記 :24–26、:40–41），必然失敗，依 D6 燒掉版本號。反過來，X9 先落地、workflow 還沒落地，本機 `npm publish` 一定停在 X9，這段期間完全無法發布。R1 也必須在第一個 tag 之前落地。
- **影響**：epic 進行中如果要出一個修補版，沒有規則可以遵循。
- **信心**：中
- **建議等級**：P1
- **建議**：加一條規則和一列：「epic 最後一張改動程式碼的 ticket 落地前，不推 `v*` tag」，或規定 ticket 落地順序；stage 4 的拆分也要遵守。

### C-5 X9 失敗時要不要寫出看到的值：AC-1 和 K 表互相矛盾；`''` 的邊界不完整
- **位置**：traceability.md:62–65（K1、K4 的原因沒有要求寫值，只有 K2、K3 有「names the value, or "unset"」）、:165、:168（K02、K05 的預期只寫「cause K1」「cause K4」）；spec.en.md:106–109（AC-1：對 K02–K05 的**每一個**邊界都要「naming the condition and the value seen (or "unset")」）。
- **違反的要求**：矩陣列的預期不可與 spec 的規則不一致。
- **證據（直接讀到）**：照上面的位置對照即可看出。另外 K03、K04 沒有列 `''`（AC-1 的「empty」是泛稱），`''` 和未設定的呈現方式（引號？JSON 字串？）也沒有指定。
- **影響**：照 K 表實作會過不了 AC-1，照 AC-1 實作又超出 K 表；`GITHUB_REPOSITORY=''` 的訊息形狀沒有定義。
- **信心**：高
- **建議等級**：P1
- **建議**：統一規定 K1–K4 是否都寫出值；K03、K04 補上 `''`；寫明值的呈現格式，例如沿用 0005 B5 的 JSON string literal。

### C-6 `env` 參數本身的邊界：缺少、`null`、非字串值、只有空白
- **位置**：traceability.md:39（S1：`env` 是 plain object）、:168、:172（K09 只涵蓋多傳 `npmView`）；`create-wxl/scripts/check-publish.mjs:27–33`（不是 `PublishError` 的錯誤會直接 rethrow）。
- **違反的要求**：{type × field × boundary} 要完整。
- **證據（推論）**：呼叫時漏傳 `env`（舊簽章的呼叫端、T-0068 分支的測試）會拋 `TypeError`，不是 X9。`GITHUB_ACTIONS: true`（布林）算不算「exactly `true`」沒有定義。`ACTIONS_ID_TOKEN_REQUEST_URL: ' '` 依 K4 的「non-empty」會通過。K4 只檢查 URL，沒有看 `ACTIONS_ID_TOKEN_REQUEST_TOKEN`。
- **影響**：介面錯誤會變成未分類的 crash，和 0005「每個 X check 都把自己的失敗對到自己的 id、不 crash」的精神不一致（T-0025:172）。
- **信心**：中
- **建議等級**：P2
- **建議**：K09 旁加一列「`env` 未傳或 `null` → X9 cause K1」，並寫明只接受字串值。

### C-7 D6 的「staged version 被拒絕」分支沒有矩陣列，「reject」也沒有定義
- **位置**：traceability.md:31（D6）、:48–53（vocabulary 只有 stage、staged version、approve）、:138（P6）、:191（S05 只涵蓋「staging 前失敗」）；spec.en.md:81–83、:149–150。
- **違反的要求**：每條規則的每個分支都要到達 AC。
- **證據（直接讀到）**：研究筆記 :14 記載有 reject 動作，而且不能用 OIDC；spec 和 traceability 都沒有說怎麼 reject、由誰、reject 後 tag 和 GitHub Release 怎麼處理。
- **影響**：被拒版本的路徑沒有驗收出口；workflow.md 的 release section 也沒有依據可寫。
- **信心**：高
- **建議等級**：P1
- **建議**：vocabulary 加入 reject（指令或網站操作、需要 2FA、執行者），加一列 S06：reject 後 `npm stage list` 不再列出、`latest` 不變、下一版是 patch。

### C-8 P4「檢查 staged version」要檢查什麼沒有寫；provenance 只驗有沒有，不驗內容
- **位置**：traceability.md:136（P4「is checked」）、:153（B1：approval 是唯一的檢查）、:188–189（S02 只看有列出、`latest` 沒變；S03 只看 `dist.attestations` 存在）；spec.en.md:41–42（User Story 5：provenance 指向 upstream 的 repository 和 commit）、:93–95。
- **違反的要求**：信任邊界和 user story 都要有可觀察的 AC。
- **證據（直接讀到）**：沒有任何一列要求比對 staged 版本的 provenance（repository、workflow `publish-npm.yml`、`refs/tags/v<V>`、commit）和使用者自己做的 tag。
- **影響**：B1 宣稱的唯一防線沒有操作定義；User Story 5 沒有驗收出口。
- **信心**：高
- **建議等級**：P1
- **建議**：P4 和 S02 列出核准前要比對的欄位；S03 要求 attestation 的 source repository 等於 upstream、commit 等於 tag 的 commit、workflow 等於 `publish-npm.yml@refs/tags/v<V>`。

### C-9 重跑順序和兩個 workflow 之間的組合沒有涵蓋
- **位置**：traceability.md:31、:135（P3 兩個 workflow 平行跑）、:191；`.proj.tickets/maintenance/T-0067-release-3-1-0.md:76`（直接讀到：對已 staged 的版本再發布一次會得到 `409 … previously staged version`）。
- **違反的要求**：re-run 的各種順序要到達 AC。
- **證據（推論）**：
  - `npm stage publish` 已經成功，但 job 之後失敗或被重跑（例如 post-step 失敗、誤按 re-run）時，再 stage 一次的預期結果和 D6 的歸類都沒有寫。
  - N1 建立超過 2 天已失效時，重跑的處理沒有寫。
  - `release.yml` 失敗但 `publish-npm.yml` 已 stage（或反過來）時，D6 的「a tag whose job fails」指哪個 job 不明確；要不要核准沒有規則。
- **信心**：中
- **建議等級**：P2
- **建議**：S05 拆出子列：已 staged 後重跑、N1 失效後重跑、release.yml 和 publish-npm.yml 一成一敗。

### C-10 這個 epic 的程式碼 ticket 各自的 stage 8 沒有定義；AC-7 歸哪張 ticket、epic 何時算完成也沒定
- **位置**：`docs/agents/workflow.md:160–162`（stage 8 在 ticket 的 preview 上、PR 合併前執行）；spec.en.md:127、:148–150、:173–174；traceability.md:42。
- **違反的要求**：每個 stage 8 的 AC 都要能在指定的表面上執行，矩陣要涵蓋各 ticket 的驗證時點。
- **證據（直接讀到）**：AC-7 只能在 epic 落地後的第一次 release 執行，而那次 release 由另一張「release ticket」決定版本（:173）。X9、workflow、manifest 各 ticket 在 PR 合併前的 stage 8 表面沒有寫（例如在本機跑 `node scripts/check-publish.mjs` 看 K06 的訊息）。如果 S01 因 repository 內的原因失敗，D6 → 修補 ticket → 再一次 release，這個迴圈沒有上限，也沒寫 epic 的 close-out 怎麼等待。
- **信心**：中
- **建議等級**：P1
- **建議**：寫明每類 ticket 的 stage 8 表面；寫明 AC-7 由哪張 ticket 承接（屬於本 epic 的 release ticket，或明確寫成外部依賴）以及 close-out 的條件。

### C-11 D02 要記錄的 0005 變更清單不完整，而且引用了不存在的 D12
- **位置**：traceability.md:26、:186；spec.en.md:84–86。程式碼與文件：`.proj.specs/0005-create-wxl/traceability.md:29–38`（決策表沒有 D12，D12 在 `.proj.tickets/0005-create-wxl/T-0025-publishing-documents-stage-8.md:109`）、`:45`（0005-S2 的參數只有 `npmView`）、`:364`（X9）；`.proj.specs/0005-create-wxl/spec.en.md:79–82`、`:119`（B2：「refuses to publish under a name someone else maintains (X9)」）、`:213–214`；`.proj.specs/OPEN-QUESTIONS.md:822–823`（OQ-021 的 Evidence 描述舊 X9）。
- **違反的要求**：矩陣列的預期要和實際文件一致。
- **證據（直接讀到）**：照上面的位置對照即可確認。
- **影響**：實作者會去找 0005 traceability 裡不存在的 D12。0005 的 spec.en.md 的 B2 和散文、以及 OQ-021，會繼續描述舊的 X9 語意。
- **信心**：高
- **建議等級**：P2
- **建議**：D02 寫明 D12 的出處（T-0025），並把 0005 spec.en.md 的 :79–82、:119、:213–214 和 OQ-021 的 Evidence 納入。

### C-12 K11／AC-3 只點名兩個 factory；其他相關 helper、測試和說明文字的去留沒有交代
- **位置**：traceability.md:27（D2「real implementations are removed」）、:69–70、:174（K11）；spec.en.md:113–115。程式碼：`create-wxl/src/publish-io.mjs:56–78`（`npmCommand`、`parseNpmViewMaintainers`）；`create-wxl/test/publish-io.test.mjs:11`、`:92–115`、`:144–151`；`create-wxl/src/publish.mjs:39–50`、`:54–59`；`create-wxl/scripts/check-publish.mjs:29`。
- **違反的要求**：規則和列要一致、要完整。
- **證據（直接讀到）**：
  - `parseNpmViewMaintainers` 和 `npmCommand` 的去留沒寫（AC-3 的「maintainer helpers」可能包含前者）。
  - `CHECK_EXPLANATIONS.X9` 的新文字沒有任何矩陣列。
  - X9 用自訂 message 時，訊息裡是否含 id「X9」或 `CHECK_EXPLANATIONS` 的文字沒有規定，而 `check-publish.mjs` 只印 `err.message`。
- **信心**：高
- **建議等級**：P2
- **建議**：K11 列出全部要移除或保留的 export 和測試；加一列 K12 驗 `CHECK_EXPLANATIONS.X9`，以及 message 的開頭格式。

### C-13 R1 沒有指定 `repository` 在 manifest 裡的鍵位置，但 C45 會比對鍵的順序
- **位置**：traceability.md:125、:184；`create-wxl/test/upstream-config.test.mjs:59–63`（用 `JSON.stringify` 比對，鍵順序是契約的一部分）。
- **違反的要求**：邊界要封閉。
- **證據（直接讀到）**：R1 只寫「gains」，沒說放在哪個鍵之後。
- **影響**：0005 的 listing 和 C45 期望值的位置要由 ticket 自行決定，可能和 0005 的 listing 不一致。
- **信心**：高
- **建議等級**：P2
- **建議**：R1 寫出完整的 listing，或明確指定位置（例如在 `license` 之後）。

### C-14 fork 跑過 rebrand 之後，R1 的 URL 會被改寫；這個 repository 狀態沒有對應列
- **位置**：`scripts/fork-init.ts:689`（`EXCLUDED_DIRS` 沒有排除 `create-wxl`）、`:1165`（rebrand 模式把 `UPSTREAM_SLUG` 全面替換成 `args.repo`）；traceability.md:184。
- **違反的要求**：矩陣要涵蓋 fork／rebrand 狀態。
- **證據（推論）**：過去 create-wxl 底下沒有任何檔案寫出 slug，所以 rebrand 不會動到它。R1 之後，GitHub fork 跑 `--rebrand` 會把 `create-wxl/package.json` 的 `repository.url` 改成 fork 的 repo；之後如果在 fork 跑 `pnpm --dir create-wxl test`，M01（以 `UPSTREAM_SLUG` 組出期望值）會失敗。
- **信心**：中
- **建議等級**：P2
- **建議**：加一列說明 rebrand 對 `create-wxl/package.json` 的預期（排除或接受），或明確寫成已知限制。

### C-15 npm 版本有沒有上限：W5／W05 和 workflow 範例的註解不一致
- **位置**：traceability.md:102（註解：「an exact 11.x at or above 11.15.0」）、:116（W5：只寫 ≥ 11.15.0）、:179（W05）；spec.en.md:119。
- **證據（直接讀到）**：兩處寫法不同，不一致。
- **影響**：12.x 合不合格不明。
- **信心**：高
- **建議等級**：P2

### C-16 `actions/checkout` 和 `actions/setup-node` 允許哪些 `with` 鍵沒有列舉
- **位置**：traceability.md:97–101、:115、:118、:178、:180–181。
- **證據**：直接讀到 W7 只禁止 `cache`。W04 只比對 `uses` 和 `node-version`；W06 只固定最後兩步的 `run`。推論（沒有引用 npm 或 GitHub 文件，信心低）：npm 文件的範例常帶 `registry-url`；`persist-credentials`、`fetch-depth` 和 `fetch-tags` 會影響 C-3。
- **影響**：哪些鍵允許、哪些鍵必要都沒有邊界。
- **信心**：低
- **建議等級**：P2
- **建議**：W4 寫明每個 action 的 `with` 鍵完整集合。

### C-17 新 job 要不要設定 `WXL_EXPECT_UPSTREAM` 沒有寫
- **位置**：`tests/unit/workflows/upstream-only-jobs.test.ts:13–18`、`:54–64`；`.github/workflows/release.yml:21–28`；traceability.md:113、:182。
- **證據（直接讀到）**：現有所有 upstream-only job 都同時設定 `if:` 和 `env.WXL_EXPECT_UPSTREAM`，測試的註解也寫明「five times」。W2 和 W08 沒說 `stage` 要不要設，也沒說計數改成多少。
- **信心**：中
- **建議等級**：P2

### C-18 User Story 3 只在 X1–X8 都成立時才看得到效果
- **位置**：spec.en.md:37–38；traceability.md:169（K06）、:171（K08）；`.proj.tickets/maintenance/T-0067-release-3-1-0.md:69–73`（直接讀到：本機先停在 X8，之後才到 X9）。
- **證據（推論）**：維護者在終端機最常見的狀態是沒有 tag、沒有 `dist/`、工作樹不乾淨，這時會先看到 X3、X4 或 X8，而不是「只在 CI 發布」。矩陣沒有任何一列是這種「真實終端機狀態」。這是設計選擇（X9 排最後），但 user story 的承諾只有部分兌現。
- **信心**：中
- **建議等級**：P2
- **建議**：記錄為已知限制，或另外決定 K1 是否先於 X1–X8 檢查。

### C-19 User Story 6 和 B3 只有靜態測試，沒有實際在 fork 或靶場上跑過
- **位置**：spec.en.md:43–44；traceability.md:155、:176。
- **證據**：直接讀到 W02 只解析 `if:`。推論（信心低）：在靶場推 `v*` tag（0005 N5 的 GitHub Pages 流程）時 job 會被 skip，`environment: npm` 是否因此在 fork 端被建立沒有交代。
- **信心**：低
- **建議等級**：P2

### C-20 N1 的設定內容和 N3 撤銷 token，都沒有被記錄或驗證
- **位置**：traceability.md:144（N1：stage only、environment）、:146（N3：revoke tokens）、:190（S04 只引述 N3 的 Publishing access）。
- **證據（直接讀到）**：B1 依賴 N1 的「stage only」，但沒有任何一列要求記錄使用者實際的 N1 設定；token 撤銷也沒有列。
- **信心**：高
- **建議等級**：P2
- **建議**：S04 擴充為同時引述 N1 的各欄位和 N3 的撤銷結果。

### C-21 D01 和 AC-6 對 N1–N4 要寫什麼的說法不一致
- **位置**：traceability.md:185（D01：「with their order and owners」）；spec.en.md:124–126（AC-6：N1–N4「with their timing」）。
- **證據（直接讀到）**：兩處用語不同。
- **信心**：高
- **建議等級**：P2

### C-22 維護者在本機執行 `npm stage publish` 的路徑沒有涵蓋
- **位置**：traceability.md:154（B2 只講 `npm publish`）、:210–211（不確定 `npm stage publish` 會不會跑 `prepublishOnly`）；spec.en.md:96–97、:169。
- **證據（推論）**：N3 生效之前，維護者手上的 token 加上本機的 `npm stage publish`，如果不跑 `prepublishOnly`，就會完全繞過 X9。雖然仍然需要核准，但 B2 宣稱的「X9 stops a terminal publish」在這條路徑不成立，矩陣也沒有對應列。
- **信心**：低
- **建議等級**：P2
- **建議**：B2 寫明只涵蓋 `npm publish` 和 `pnpm publish`；加一列把這條路徑記為已知缺口。

---

**檢查範圍**：本軸的 frozen prompt、0009 的 spec 和 traceability、0005 的 traceability 與 spec（Package and publishing、決策、seams、B2、AC-19、C42–C45）、`create-wxl/src/publish.mjs`、`publish-io.mjs`、`scripts/check-publish.mjs`、`scripts/prepare-dist.mjs`、`package.json`、`test/publish.test.mjs`（部分）、`test/publish-io.test.mjs`（部分）、`test/upstream-config.test.mjs`、`.github/workflows/release.yml`、`quality-gates.yml`（grep）、`tests/unit/workflows/upstream-only-jobs.test.ts`、`toolchain-parity.test.ts`、`tests/unit/scripts/upstream-guard.test.ts`（confinement 與 real tree 部分）、`scripts/fork-init.ts`（grep）、`.gitattributes`、`docs/agents/workflow.md`、`OPEN-QUESTIONS.md`（OQ-021）、`GLOSSARY.md`（grep）、T-0029／T-0067，以及兩份 stage 1 研究筆記。我沒有網路存取，C-3、C-16、C-19 涉及 GitHub 和 npm 行為的部分都已標成推論。

**合計**：P0 0、P1 8（C-1、C-2、C-3、C-4、C-5、C-7、C-8、C-10）、P2 14。
