# 0009-npm-trusted-publishing 第 2 輪審查：Completeness 軸（C）

審查版本：`spec.en.md` blob `1016f19f…`、`traceability.md` blob `cb637c82…`（`6779b55`，revision 2），程式碼基準是 `main` 的 `af4e1ac`。我讀的是 working tree，沒有改任何檔案。
用語說明：「直接讀到」表示我親自讀過該檔該行；「推論」表示根據讀到的內容推出，沒有實際執行驗證。我沒有網路存取，凡涉及 GitHub 或 npm 行為、而 spec 沒有引用來源的地方，都已標成推論並調低信心。

---

### C-1 workflow 有幾個鍵沒有規則也沒有矩陣列，self-check 卻說「Every key in the shape is pinned」
- **位置**：traceability.md:138（`runs-on: ubuntu-latest`）、:122（`name:`）、:162–170（W1–W7）、:261–267（W01–W07）、:293（self-check）；spec.en.md:274（Further Notes：只支援 GitHub-hosted runner）。
- **違反的要求**：每個 `{type × field × boundary}` 組合都要對到一條 AC；self-check 的全稱說法要成立。
- **證據**：
  - 直接讀到：W1–W7 沒有任何一條提到 `runs-on`。
  - 直接讀到：W6 只允許額外加 `name:`；W06 只比對第 4–8 步的 `run` 和第 7–8 步的 `working-directory`；W7 只禁止 workflow 層與 job 層的 `env`。
  - 推論：沒有任何一列限制下面這些鍵的「完整集合」：
    - 步驟層：`if:`、`continue-on-error`、`env`、`shell`、`timeout-minutes`；
    - job 層：`continue-on-error`、`defaults`、`container`、`strategy`、`needs`、`services`；
    - workflow 層：`defaults`、`run-name`。
- **影響**：
  - 在第 5 步（main 祖先檢查）或第 7 步（gate）加上 `continue-on-error: true` 或 `if: ${{ false }}`，W01–W09 全部照樣通過，但 staging 不會再被這兩步擋下。
  - `runs-on` 改成 self-hosted 時，靜態測試也不會失敗；npm 只支援 GitHub-hosted runner，要到 stage 8 才會發現，屆時依 D6 會用掉一個版本號。
  - workflow 層的 `defaults.run.working-directory` 會改變第 4–6 步執行的目錄。
- **信心**：高
- **建議等級**：P1
- **建議**：新增一條 W 規則和一列，把三層的鍵集合寫死：
  - workflow 層 = {`name`, `on`, `permissions`, `concurrency`, `jobs`}；
  - job 層 = {`if`, `runs-on`, `environment`, `permissions`, `steps`}，且 `runs-on` 等於 `ubuntu-latest`；
  - 每個步驟只能是 {`uses`, `with`, `name`} 或 {`run`, `name`, `working-directory`}。
  - 同時把 self-check :293 改成與實際一致。

### C-2 MN2（U2：environment 只允許 `v*` tag）沒有驗收出口；F1 把「MN2 缺漏」當成會失敗的原因，可能不成立
- **位置**：traceability.md:35（U2）、:205（MN2）、:215（F1：「MN1 or MN2 missing or expired」）、:228（B1：「deploying to environment `npm` from a `v*` tag」）、:274（S8-01 的輸入列出「after MN1, MN2」）、:277（S8-04 只引述 MN1 和 MN3）；spec.en.md:227–228。
- **違反的要求**：使用者裁決 U2 的落實要有 AC；矩陣列的預期不能和實際行為不一致。
- **證據**：
  - 直接讀到：S8-04 只要求引述 MN1 的六個欄位、token 撤銷和 MN3 的選項文字，沒有 MN2 的設定（沒有 reviewer、selected、唯一一條 tag 規則 `v*`）。
  - 推論（信心中高，依 GitHub 文件的記憶，spec 沒有引用）：job 引用一個不存在的 environment 時，GitHub 會自動建立同名、沒有任何保護規則的 environment。所以 MN2 沒做時，run 不會失敗，只會留下一個不限 tag 的 `npm` environment。這和 F1 的分類相反。
- **影響**：B1「只有從 `v*` tag 部署的 job 能 stage」所依賴的 tag 規則，在整個 epic 裡沒有任何證據要求。如果漏做 MN2，S8-01 照樣會通過。
- **信心**：高（缺列這件事）／中（GitHub 自動建立 environment 的行為）
- **建議等級**：P1
- **建議**：
  - S8-04 和 AC-7 加上「記錄引述使用者回報的 MN2 設定」；
  - F1 刪掉「MN2 missing」，或改成「MN2 缺漏不會使 run 失敗，必須在推 tag 前確認」。

### C-3 AC-7 綁定「第一個 stage 成功的 `v<V>`」，遇到 F3 拒絕或核准後驗證失敗時就無法達成；核准後的失敗也沒有 F 列
- **位置**：spec.en.md:218–232（AC-7：「The rows below are met by the first `v<V>` that stages successfully」）；traceability.md:196–197（RP5、RP6）、:213–219（F1–F5）、:275–279（S8-02、S8-03、S8-05、S8-06）。
- **違反的要求**：re-run 的各種順序都要能到達 AC；AC 不能因為規則內的分支而變成無法達成。
- **證據**：
  - 直接讀到：S8-05 說 S8-01～S8-04 由「第一個 stage 成功的」版本達成。如果這一版在 RP5 不合格而被拒絕（F3、S8-06），它的 S8-02「each shown field matched」不成立；下一個 patch 又不是「第一個 stage 成功的」版本，所以照字面 AC-7 永遠達不到。
  - 直接讀到：F1–F5 只處理核准前的狀況。RP6(a)/(b) 在核准後失敗時（attestation 不存在或欄位不對、`npm create wxl@latest` 失敗、`latest` 沒有移動）沒有任何列處理。推論：已核准的版本無法撤回核准。
- **影響**：發布 ticket 會停在 `processing` 而且出不去，close-out 也無法完成；核准後出錯要怎麼處理（deprecate？下一個 patch？AC-7 改由哪一版承接？）沒有規則可以依循。
- **信心**：高
- **建議等級**：P1
- **建議**：
  - AC-7 和 S8-05 改成「第一個被核准、而且通過 RP6 的 `v<V>`」；
  - 新增 F6：核准後 RP6 失敗時的處置（例如 `npm deprecate`，加上下一個 patch，並記錄 F 列），再加對應的 S8 列。

### C-4 M02 沒有規定怎麼找出要豁免的那一行，MR1 也沒有規定 `repository` 的排版；沿用既有的 structural walk 會失效
- **位置**：traceability.md:181（MR1，範例寫成單行 inline 物件）、:271（M02）、:59（O1：「exempts that one line」）；程式碼：`tests/unit/scripts/upstream-guard.test.ts:82–103`（`manifestA1UrlLines`，Note 7：每行一個鍵、兩格縮排）、`:133`（只有 `path === 'package.json'` 走 manifest 分支）；`create-wxl/package.json:6`、`:8`（`"bin": { … },`、`"engines": { … },` 都是單行 inline 物件）。
- **違反的要求**：邊界要封閉；M02 的預期要可以實作。
- **證據**：
  - 直接讀到：walker 遇到 `"key": {` 就 push，只有在「以 `}` 開頭的行」才 pop。
  - 推論：create-wxl 的 manifest 有兩行 inline 物件，push 之後永遠不會 pop，所以 `repository.url` 的路徑會被算成 `bin.engines.repository.url`，不會被豁免。如果照 MR1 的範例把 `repository` 寫成單行，walker 只會 push、根本不會算出 `url` 的路徑。兩種排版都不會被豁免。
- **影響**：如果實作者把 `isManifest` 直接擴大到 `create-wxl/package.json`，upstream 的 real-tree guard 會變紅；兩種排版都可以，但「exactly one line」的位置沒有定義。
- **信心**：高（walker 的行為）／中（等級）
- **建議等級**：P2
- **建議**：MR1 寫明 `repository` 要單行還是多行；M02 寫明豁免條件（例如「路徑等於 `create-wxl/package.json`，而且該行是 `repository` 物件中含 `"url"` 的那一行」），並加一個 inline 排版的 fixture。

### C-5 fork 和 rebrand 狀態下的 M01：spec 說測試「still passes」不成立；GitHub fork 的 default mode 這個狀態沒有列
- **位置**：spec.en.md:105–106（「the manifest test compares the two, so it still passes」）；traceability.md:59（O1：「which keeps M01 true」、「create-wxl/ never enters a range」）、:270（M01：「the rest of C45 unchanged」）；程式碼：`scripts/fork-init.ts:1216–1219`（rebrand 或 first conversion 時，根目錄 manifest 的 `version` 改成 `0.1.0`）、`:1335–1353`（rebrand 的整樹替換）；`create-wxl/test/upstream-config.test.mjs:43`（C45 的 `version: rootPkg.version`）；`.proj.specs/0005-create-wxl/traceability.md:46`（0005-S3：「exist only upstream」）；`tests/unit/scripts/upstream-guard.test.ts:482–570`（`pristineMismatches`）。
- **違反的要求**：矩陣要涵蓋 fork、rebrand、half-applied 等 repository 狀態，列的預期要和實際行為一致。
- **證據**：
  - 直接讀到：rebrand 和 default mode 的 first conversion 都會把根目錄 `version` 重設成 `0.1.0`，而 `create-wxl/package.json` 的 `version` 不變。推論：在任何轉換過的 fork 上，C45（M01 包含「其餘 C45 不變」）本來就會失敗，所以「still passes」只對 URL 這一項成立。
  - 推論：GitHub fork 是完整的 clone，會含有 `create-wxl/`（U1 只管 archive）。default mode 只改根目錄的 A1，所以 M01 的 URL 比對也會失敗。這個狀態沒有列。
  - 直接讀到：create-wxl 的 `repository.url` 列入 rewrite list 之後，要不要加進 upstream guard 的 pristine／expectation 檢查（`pristineMismatches`），spec 沒有說。
  - 推論：透過 `pnpm range:upgrade` 升級的既有靶場也會收到 `publish-npm.yml` 和 `release.md`，B3 沒有列出這個狀態。
- **影響**：低。create-wxl 的測試只在 upstream-only 的 `fork-init-cross-os` job 跑，但 spec 的說法和事實不符。
- **信心**：高（事實）
- **建議等級**：P2
- **建議**：改成「URL 一項在 rebrand 後仍成立；C45 在已轉換的 fork 上本來就不成立（version），create-wxl 的測試只在上游執行」。另外加一列 GitHub fork 在 default mode 下的預期，並寫明 pristine 檢查要不要納入這個欄位。

### C-6 D6 的 F 表和 RP5 漏掉的狀態與順序
- **位置**：traceability.md:196（RP5 (a)–(d)）、:209（MN6，When 欄是「Before re-running under D6」）、:213–219（F1–F5）、:309–311（self-check 說 F1–F5 已完整分割）。
- **違反的要求**：re-run 的順序和各種結果都要到達 AC。
- **證據與缺口**：
  - RP5 的四項檢查不包含「`release.yml` 已成功」。F4 只處理 `release.yml`「failed」，沒有處理 in progress、cancelled 或 skipped。直接讀到。
  - 推論（依 GitHub concurrency 語意，信心中）：同一個 group 最多只保留一個 pending run，第三個 run 進來時，前一個 pending 的 run 會被取消。F5 寫的「queues it」只在兩個 run 的情況成立。結論是 `cancelled` 的 run 屬於哪一個 F 列，沒有規定。
  - 已 staged 但 run 失敗（例如 post-step 失敗）時，只能從 RP5(b) 間接走到 F3，沒有明寫。
  - 核准後有人重跑 `publish-npm.yml`：推論會得到 409 而失敗，分類沒有規定。
  - F2 因為 main 祖先檢查失敗時，`release.yml` 已經在非 `main` 的 commit 建好 GitHub Release 和 zip，這個 Release 要怎麼處理沒有寫。
  - MN6 的時機只寫「重跑之前」。F2／F3 之後的下一個 patch tag 如果晚於 2 天，同樣需要 MN6。
- **影響**：發布 ticket 遇到這些狀態時沒有規則可以依循；記錄 F 列（S8-05）時會找不到分類。
- **信心**：中
- **建議等級**：P2
- **建議**：
  - RP5 加 (e)「`release.yml` 對 `v<V>` 的 run 以 success 結束」；
  - F 表補上 cancelled、核准後重跑、非 main 的 Release 三種情況；
  - MN6 的時機改成「任何新的 tag 或重跑之前，只要設定已經過期」。

### C-7 B1 假設只有一組 trusted publisher 設定、只有上游一人能核准，但沒有任何列記錄這兩件事
- **位置**：traceability.md:204（MN1）、:228（B1）、:277（S8-04）；`.proj.research/2026-11-11-npm-trusted-publishing.md:17`（直接讀到：每個套件最多可以有 10 組設定）。
- **違反的要求**：信任邊界依賴的事實要有驗收出口。
- **證據**：
  - 直接讀到：S8-04 只引述 MN1 那一組設定的六個欄位，沒有要求列出套件上所有的 trusted publisher 設定。
  - 推論：B1 的「沒有上游以 2FA 核准，就不會變成可安裝」，前提是上游是這個套件唯一的 maintainer；舊 X9 檢查過 maintainer，新 X9 不再檢查，而且沒有任何列記錄 maintainer 名單。
- **影響**：多出來的設定，或其他 maintainer，都會在 B1 宣稱的保護之外，而且沒有被發現的機會。
- **信心**：中
- **建議等級**：P2
- **建議**：S8-04 加上「Trusted publishing 頁面上的設定總數為 1」，以及 `npm access list collaborators create-wxl`（或 `npm view create-wxl maintainers`）的輸出。

### C-8 RP0 和 AC-8／S8-08 不一致；「code ticket」沒有定義；`npm pack --dry-run` 看不到 `repository`
- **位置**：traceability.md:191（RP0 有三項，第三項是「CI's parse tests for the workflow pass on the PR」）、:281（S8-08 只有兩項）、:53（D10 使用「code ticket」）；spec.en.md:233–235（AC-8）；`.proj.tickets/maintenance/T-0067-release-3-1-0.md:75`（直接讀到：npm 發布輸出的欄位是檔案數、大小、shasum）。
- **違反的要求**：規則和列要一致；每個 stage 8 的 AC 要能在指定的表面上觀察。
- **證據**：
  - 直接讀到：RP0 的第三項不在 AC-8 裡。
  - 直接讀到：vocabulary 沒有「code ticket」這個詞。docs ticket（R2、DS1–DS3）算不算、要不要做 RP0，沒有規定。
  - 推論：`npm pack --dry-run` 的輸出（Tarball Contents／Details）不會印出 manifest 的 `repository`，所以「listing the package with MR1's `repository`」在這個輸出裡看不到。
  - 推論：`prepack` 會匯入 `yaml` 和 `tar`，所以 RP0 之前要先跑 `pnpm --dir create-wxl install`，但 spec 沒寫。
- **信心**：中
- **建議等級**：P2
- **建議**：
  - 在 vocabulary 定義 code ticket；
  - AC-8 和 RP0 對齊；
  - `repository` 改用 `npm pkg get repository`，或用 `tar -xOf` 讀出 tarball 裡的 `package.json` 來觀察。

### C-9 AC-3 的「references npm」比 K11 的字串清單寬，和 XM 衝突
- **位置**：spec.en.md:187–188（AC-3：「none of the three files K11 names references npm」）；traceability.md:258（K11 只列 `npmCommand`、`'npm'`、`npm.cmd`、`npmView`、`npmWhoami`）、:104（XM 的結尾句含 `npmjs.com`）；`create-wxl/scripts/check-publish.mjs:3`（註解提到 npm）。
- **違反的要求**：AC 和它引用的列要一致。
- **證據**：直接讀到。XM 一定會放在 `publish.mjs` 裡，而 XM 含有「npmjs.com」；照 AC-3 的字面讀，實作一定違反 AC-3，照 K11 讀則不違反。
- **信心**：高
- **建議等級**：P2
- **建議**：AC-3 改成「none of the three files K11 names contains K11's strings」。

### C-10 D02 沒有對應的 seam；R2 的行結構在 S5 的觀察方式下看不到；OQ-027 分兩段完成沒有建模
- **位置**：traceability.md:72（0009-S5 只涵蓋 `release.md` 和 `AGENTS.md`，並把空白合併成一個空格）、:239（R2：「one line per … each starting with its id」）、:242（DS3：OQ-027 由發布 ticket 填入）、:273（D02）；spec.en.md:239–244。
- **違反的要求**：每列都要能在某個 seam 上觀察。
- **證據**：
  - 直接讀到：D02 涵蓋的 0005／0004 traceability、ADR-0009、OPEN-QUESTIONS 都不在任何 seam 上，Testing Decisions 也沒有提。
  - 推論：S5 把空白合併成一個空格之後，「每行以 id 開頭」這種行結構就看不到了；F1–F5 如果寫成 Markdown 表格，那一行會以 `|` 開頭，不是 id。
  - 推論：S5 的測試如果放在根目錄的 `tests/`，會跟著 archive 進入靶場。測試位置沒有規定。
  - 推論：OQ-027 在 docs ticket 建立、在發布 ticket 才填入內容；D02 要在哪一張 ticket 判定，沒有分階段。
- **信心**：中
- **建議等級**：P2
- **建議**：
  - 新增 seam，或寫明 D02 在 stage 6 以人工方式判定；
  - S5 的測試指定放在 `create-wxl/test/`（0005 的 U-items 就在那裡）；
  - R2 的「行首 id」改用不合併空白的逐行檢查；
  - OQ-027 拆成兩列：建立，和填入。

### C-11 DS1 漏了 0005 的 C43
- **位置**：traceability.md:240（DS1 列出 X9 列、D4、0005-S2、C42、listing、Seams note）；`.proj.specs/0005-create-wxl/traceability.md:456`（C43：「all hold … `checkPublish` passes」）；frozen prompt 第 30 行（把 C43 列為這個 spec 會改到的列）。
- **違反的要求**：矩陣列的預期要和實際文件一致。
- **證據**：直接讀到。新的 X9 之下，C43 的「all hold」必須包含一個滿足 K1–K4 的 `env`，但 DS1 沒有列 C43。
- **信心**：高
- **建議等級**：P2
- **建議**：DS1 加上「C43：all hold 包含滿足 K1–K4 的 `env`」。

### C-12 K 列對型別與空白的涵蓋不完整
- **位置**：traceability.md:89–90（「A variable is *set* when its value is a string」）、:249–252（K02–K05）。
- **證據**：
  - 直接讀到：只有 K02 列了非字串值（布林 `true`）；K2–K4 沒有非字串的案例（數字、布林）。
  - 直接讀到：「set」要不要求是自有屬性，沒有規定。推論：`env` 是陣列，或從 prototype 繼承來的屬性時，結果不明。
  - 推論：K4 的「whitespace」指 JS 的 `trim()`，還是只限 ASCII（例如 ` `、`\n`），沒有規定。
- **信心**：中
- **建議等級**：P2
- **建議**：K03–K05 各加一個非字串值；寫明 set 指自有屬性；寫明 whitespace 依 `String.prototype.trim` 判定。

### C-13 K12 的 CI checkout 形狀可能和實際不同
- **位置**：traceability.md:259（K12：「detached at an annotated tag」）。
- **證據**：推論（信心低，依 actions/checkout 長期存在的 issue 的記憶）：tag push 時，checkout 可能把觸發的 tag 寫成本機的 lightweight ref，而遠端仍是 annotated tag。
  - X3 用 `^{commit}`，X6 用 ls-remote 的 `^{}` 行，所以結果多半一樣。
  - 但 K12 只建模了「本機 annotated」這一種形狀。
- **信心**：低
- **建議等級**：P2
- **建議**：K12 加一個子案例：本機是 lightweight、遠端（ls-remote stub）是 annotated。

### C-14 W4 要求「同樣的尾端 tag 註解」，但沒有列檢查
- **位置**：traceability.md:117–118、:264（W04 只比對解析後的 `uses`）。
- **證據**：推論。YAML 解析後的 `uses` 不含註解，所以「trailing tag comment」沒有驗收出口。
- **信心**：高
- **建議等級**：P2
- **建議**：W04 加上對原始文字的比對，可以參考 `fork-template-parity.test.ts:72–81` 的做法。

### C-15 會改變 `npm stage publish` 行為的 npm 設定來源，沒有列涵蓋
- **位置**：traceability.md:170（W7 只禁止 `registry-url` 等字串）、:172–175。
- **證據**：推論（信心中）：
  - 有被追蹤的 `create-wxl/.npmrc` 或根目錄 `.npmrc`（例如 `registry=`）時，X4 依然認為工作樹乾淨。
  - 步驟層的 `env: { NPM_CONFIG_REGISTRY: … }`、`npm_config_*`、`--registry`，都不在 W7 的禁止清單裡。
  - C45 鎖住了 manifest，所以 `publishConfig` 已經被涵蓋。
- **影響**：staging 的目標 registry 或設定可能被改掉，而所有靜態列照樣通過。
- **信心**：中
- **建議等級**：P2
- **建議**：
  - W7 加上 `NPM_CONFIG`、`npm_config_`、`--registry`；
  - 新增一列：repository 裡不追蹤任何 `.npmrc`，可以用 `git ls-files` 檢查。

### C-16 有些觀察依賴 npm 文件沒有寫的輸出或時序
- **位置**：traceability.md:196（RP5(c)(d)：「run log printed」的 shasum）、:197（RP6）、:276（S8-03）；spec.en.md:281–286（未知事項清單）。
- **證據**：推論。
  - `npm stage publish` 會不會在 log 裡印出 shasum，不在 spec 列出的 npm 事實裡；T-0067:75 只證明 `npm publish` 會印。
  - RP6 在核准後立刻檢查 `dist-tags.latest` 和 `npm create wxl@latest`，沒有等待或重試的規則。registry 或 CDN 延遲造成的失敗，在 F 表裡沒有分類。
- **信心**：低
- **建議等級**：P2
- **建議**：把 shasum 的輸出列進「Not in npm's documentation」；如果 log 沒有 shasum，改由 agent 在第 7 步以 `npm pack --dry-run --json` 印出。RP6 加上重試的上限。

### C-17 main 祖先檢查的負向路徑沒有列
- **位置**：traceability.md:154（第 5 步）、:216（F2）、:300–301（self-check：tag 不在 `main` 上時這一步會失敗）。
- **證據**：直接讀到。只有 W06 的靜態文字比對，和 S8-01 的成功路徑。「tag 不在 `main` 上」和「沒有 `origin/main`」（例如預設分支改名）的預期結果，都沒有可判定的列。
- **信心**：中
- **建議等級**：P2
- **建議**：加一列，以 fixture 執行 `git merge-base --is-ancestor`：不在 `main` 上時以非 0 結束；或在 RP0 加一個本機示範。

### C-18 B2 的 `npm publish`／`pnpm publish` 路徑在 0009 沒有列
- **位置**：traceability.md:229（B2）；spec.en.md:160–163、:233–235（AC-8 直接執行 `check-publish.mjs`，沒有經過 npm lifecycle）。
- **證據**：直接讀到。B2 宣稱 `npm publish` 和 `pnpm publish` 在到達 npm 之前就會停下，但 0009 沒有任何列以 lifecycle 的方式驗證這件事，只依賴 0005。
- **信心**：低
- **建議等級**：P2
- **建議**：RP0 或 AC-8 加上 `npm publish --dry-run`（或在 lifecycle 中執行 `prepublishOnly`）停在某個 X 檢查的紀錄；或明寫依賴 0005 的哪一列。

### C-19 F2「修正落地」的 ticket 和本 epic、D10、U4 的關係沒有定義
- **位置**：traceability.md:37（U4）、:53（D10）、:216（F2）、:278（S8-05）；spec.en.md:136–137。
- **證據**：推論。F2 要求修正落地後發下一個 patch，但沒有寫：
  - 這個修正屬於哪一張 ticket（新 ticket？算不算本 epic 的 code ticket？）；
  - 發布 ticket 在 `processing` 期間，能不能有新的 ticket 在它之後落地，而 U4 又說發布 ticket 是「最後一張」；
  - D10 的時間窗要不要重新計算。
- **信心**：中
- **建議等級**：P2
- **建議**：寫明 F2 的修正以 maintenance ticket 處理，或以本 epic 新增的 ticket 處理，並說明它和 U4、D10 的關係。

---

**檢查範圍**：
- 本軸的 frozen prompt；0009 的 `spec.en.md`、`traceability.md`；第 1 輪的 `round-1-C.md` 與 `disposition.md`。
- 0005 的 traceability（Seams、Package and publishing、C42–C45）與 spec（:79–82、:119、:147、:204、:213–214）；0004 traceability 的 confinement 段落；ADR-0009；`OPEN-QUESTIONS.md`（OQ-019～OQ-026 的標題、OQ-021）；T-0067。
- `create-wxl/package.json`、`src/publish.mjs`、`src/publish-io.mjs`、`scripts/check-publish.mjs`、`test/upstream-config.test.mjs`；`test/publish.test.mjs` 以 grep 查看。
- `.github/workflows/release.yml`；`tests/unit/workflows/` 下的 `upstream-only-jobs`、`trigger-branches`、`toolchain-parity`、`fork-template-parity` 四個測試；`tests/unit/scripts/upstream-guard.test.ts`（confinement、`pristineMismatches`）；`fork-init.test.ts` 的 T52；`scripts/fork-init.ts`（rebrand 的整樹替換、A1、`sensitiveRenames`）。
- `.gitattributes`、`docs/agents/language.md`、`scripts/verify-project.py`、根目錄 `package.json` 的 `range:upgrade`，以及兩份 stage 1 研究筆記。

**合計**：P0 0、P1 3（C-1、C-2、C-3）、P2 16（C-4～C-19）。

相關檔案（絕對路徑）：
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0009-npm-trusted-publishing/traceability.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0009-npm-trusted-publishing/spec.en.md
- /Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/upstream-guard.test.ts
- /Users/phoenix/dev/browserlab/wxl-platform/create-wxl/test/upstream-config.test.mjs
- /Users/phoenix/dev/browserlab/wxl-platform/scripts/fork-init.ts
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0005-create-wxl/traceability.md
