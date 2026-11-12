# 第 2 輪對抗式審查：Verifiability（軸 2），epic 0009-npm-trusted-publishing

審查版本：`spec.en.md` blob `1016f19`、`traceability.md` blob `cb637c8`（commit `6779b55`，分支 `spec/0009-npm-trusted-publishing`，revision 2）。程式碼基準為 `main` `af4e1ac`。我讀的是 working tree 檔案。

**直接讀過的檔案：**
- 規格與審查：`review/prompt.md`、`round-1-V.md`、`disposition.md`
- create-wxl：`create-wxl/src/publish.mjs`、`publish-io.mjs`、`scripts/check-publish.mjs`、`package.json`、`test/upstream-config.test.mjs`、`test/publish.test.mjs`（grep）
- workflow 與測試：`.github/workflows/release.yml`、`tests/unit/workflows/upstream-only-jobs.test.ts`、`trigger-branches.test.ts`、`tests/unit/scripts/upstream-guard.test.ts`、`fork-init.test.ts`（T52）
- 其他：`scripts/fork-init.ts`（rebrand 的 walk 與 `transformText`）、`.proj.research/2026-11-11-npm-trusted-publishing.md`

我沒有網路。凡是依賴 npm 或 GitHub 行為的判斷，都在信心欄註明。

**整體結論：**
- 規格裡沒有「appropriately」「as needed」這類模糊詞，所以沒有 P0。
- 第 1 輪的 V-1～V-25 大多已確實修正。
- 本輪發現集中在三處：revision 2 新增的規範表面（R2／S5 的行結構、RP0 與 AC-8、RP5 的 shasum、AC-7 的「first that stages」）、只是部分修正的舊問題（V-17 的殘餘），以及完全沒有驗收出口的控制（MN2）。

## P1：真實問題，可在 ticket 內解決

**V-1：R2 的行結構規則在 0009-S5 上觀察不到**
- 位置：traceability.md:72（0009-S5）、:239（R2）、spec.en.md:253
- 違反：AC 必須能在指定的 seam 上判定（AC-6、D01）。
- 證據（直接讀到）：
  - S5 的觀察方式是「read as text in a test, with whitespace runs collapsed to one space」，只觀察「presence of R2's strings」。
  - R2 卻要求三種行結構：
    - 「a first line containing `upstream only`」
    - 「one line per RP0–RP7 and MN1–MN6, each starting with its id」
    - 「D6's table rows F1–F5, each starting with its id」
  - 空白（含換行）收合成單一空白之後，就沒有「行」可言，「第一行」「每行以 id 開頭」都判定不了。
  - 另外，F1～F5 寫成 Markdown 表格列時開頭是 `| F1 |`，不是 `F1`，「starting with its id」要不要忽略前導的 `|`、`- `、`**`，需要詮釋。
- 影響：寫測試的人只能自己挑方法，可能只驗「字串存在」而略過行結構，也可能改用逐行檢查，偏離 S5。同一份文件會因為測試寫法不同而得出不同結果。
- 信心：high
- 請求等級：P1
- 建議：S5 分成兩種觀察：逐行（`split('\n')` 後 trim，並規定可忽略的前綴，例如 `| `、`- `）用於行結構規則；收合空白用於字串規則。或者把行結構規則改寫成逐字子字串，例如 `RP0 `。

**V-2：R2 的「heading」與「first line」互相衝突**
- 位置：traceability.md:185、:239；spec.en.md:107-108
- 違反：AC 必須能不經詮釋判定（AC-6）。
- 證據：R2 同時要求「the heading `# Releasing create-wxl and WXL`」和「a first line containing `upstream only`」。traceability.md:185 寫「Its first line says it applies to upstream only」。如果標題在第 1 行，第 1 行就不含 `upstream only`。「first line」指檔案第一行，還是標題後第一個非空行，沒有寫。
- 影響：實作把標題放第一行時，照字面就違反 R2。改成把說明放在標題之前，又違反 Markdown 慣例與其他文件的結構。
- 信心：high
- 請求等級：P1
- 建議：寫明「標題之後第一個非空行」，或把標題本身改成含 `upstream only`。

**V-3：AC-8／RP0 的「`npm pack --dry-run` listing the package with MR1's `repository`」在該 surface 上觀察不到**
- 位置：spec.en.md:233-235（AC-8）、traceability.md:191（RP0）、:281（S8-08）
- 違反：stage 8 的 AC 必須指名一個實際能觀察到該事實的 surface。
- 證據：
  - 依我對 npm 的了解（推論，沒有用網路確認）：`npm pack --dry-run` 的 `npm notice` 輸出只列 Tarball Contents（檔案與大小）和 Tarball Details（name、version、filename、package size、unpacked size、shasum、integrity、total files）。`--json` 版本也一樣，不會印出 `package.json` 的 `repository` 欄位。
  - 所以紀錄下來的終端機輸出無法證明 MR1 的 `repository` 存在。
- 影響：AC-8 第一項永遠判不出 pass。不然就只能把「輸出裡列了 `package.json`」當成通過，這等於沒驗。
- 信心：medium（npm CLI 的輸出格式沒有實測）
- 請求等級：P1
- 建議：改成可以觀察的指令，例如 `npm pack` 之後執行 `tar -xOf create-wxl-<V>.tgz package/package.json`，或 `npm pkg get repository`（在 `create-wxl/` 內執行）。也可以直接改由 M01（C45）承擔，從 AC-8 移除。

**V-4：AC-7 的「the first `v<V>` that stages successfully」與 F3（被 reject）衝突**
- 位置：spec.en.md:218-232（AC-7）、traceability.md:278（S8-05）、:279（S8-06）、:217（F3）
- 違反：AC 必須能判定。
- 證據：
  - AC-7 寫「The rows below are met by the first `v<V>` that stages successfully」。
  - S8-05 也寫「S8-01–S8-04 are met by the first `v<V>` that stages successfully」。
  - 但 F3、S8-06 允許「staging 成功，RP5 比對失敗，被 reject」。照字面讀，第一個 staging 成功的版本被 reject 之後，S8-03（核准後 `latest` 等於 `<V>`）永遠達不到，AC-7 永遠 fail。
  - 照意圖讀，應該是「下一個 patch」來達成，但文字沒這樣寫。
- 影響：只要第一次 staging 被 reject，AC-7 的判定就要靠詮釋。
- 信心：high
- 請求等級：P1
- 建議：改成「由第一個被核准（approved）的 `v<V>` 達成 S8-01～S8-04；在它之前每一個 staging 成功但被 reject 的版本，依 S8-06 記錄」。

**V-5：AC-7 第 4 點只要求「引用回報」，不論內容都會通過（第 1 輪 V-17 的殘餘）**
- 位置：spec.en.md:227-228、traceability.md:277（S8-04）、:204（MN1）
- 違反：AC 必須能判定 pass 或 fail。
- 證據：
  - 「the record quotes the user's report of the trusted publisher's six fields, the token revocation, and the Publishing access option selected」。
  - MN3 已補上「AC-7 is not met before MN3 is reported done」。
  - 但 MN1 的六個欄位、token 撤銷，都只要求「引用」，沒寫期望值。使用者回報 environment 是 `production`、allowed actions 含 direct publish，或「找不到 token 可撤銷」，照字面仍算通過。
  - 「six fields」沒有逐一列出。MN1 列了 provider、owner、repository、workflow file、environment、allowed actions，而 allowed actions 本身又有三個開關（stage／direct publish／dist-tag），算 6 個還是 8 個要詮釋。
  - 「the record」放在哪個檔案（release ticket？）也沒指名。
- 影響：B1、D8 所依賴的 npm 端控制，可能在設定錯誤的狀態下結案。
- 信心：high
- 請求等級：P1
- 建議：S8-04 改成「回報的每個欄位等於 MN1 列出的值（逐一列出 6 個欄位名）；token 撤銷回報為『撤銷後清單內沒有可發布 create-wxl 的 token』；MN3 的選項文字逐字等於 MN3」，並指名紀錄寫在 release ticket 檔。

**V-6：MN2（environment 的 `v*` tag 規則、不設 reviewer）完全沒有驗收出口**
- 位置：traceability.md:205（MN2）、:51（D8 把它列為控制之一）、:228（B1）、:274（S8-01 只寫「after MN1, MN2」）
- 違反：每條規則都要有驗收出口。
- 證據：
  - D8 把「the environment's tag rule (MN2)」列為四個安全控制之一。
  - 但 S8-04 只引用 MN1 和 MN3。S8-01 只把 MN2 當成前提，沒有任何一列觀察 MN2 的狀態。
  - 沒有 tag 規則時 workflow 一樣會成功，所以 S8-01 的 run 成功不能證明 MN2 到位。
- 影響：一個宣稱的控制可能從未設定，epic 照樣結案。
- 信心：high
- 請求等級：P1
- 建議：新增 S8 列，由 agent 觀察。例如 `gh api repos/{owner}/{repo}/environments/npm`（`protection_rules` 為空、`deployment_branch_policy.custom_branch_policies` 為 true），加上 `.../environments/npm/deployment-branch-policies`（只有一筆 `{name: "v*", type: "tag"}`）。GitHub API 的確切欄位名我沒有用網路確認，信心 medium。也可以改成引用使用者回報的頁面設定。

**V-7：RP5 的 shasum 比對，來源不明，也依賴 npm 沒有寫在文件裡的行為**
- 位置：traceability.md:196（RP5 (c)、(d)）、spec.en.md:114-115、:281-286（unknowns 清單）
- 違反：AC 必須能判定（S8-02 要求回報「whether each matched」）。
- 證據：
  - (c) 要求「tarball shasum = the one the run log printed」。(d) 要求「The run log's shasum is the one the agent reports」。
  - 第一個問題：agent 回報的 shasum 從哪裡來，沒有寫。
    - 如果 agent 也是讀 run log，(d) 就是同一來源自我比對，沒有意義。
    - 如果 agent 在本機 `npm pack`，`dist/fork-init.mjs` 經過 `module.stripTypeScriptTypes` 處理，輸出可能隨 Node 版本不同，可能產生假的不一致。這是推論；Further Notes 也只說「the same Node」。
  - 第二個問題：`npm stage publish` 會不會在 log 印出 shasum，research note 沒記錄，spec 的 unknowns 清單也沒列。這是推論，信心 low。
- 影響：(c) 或 (d) 可能判不出來，也可能誤判為不一致而 reject，依 F3 耗掉一個版號。
- 信心：medium
- 請求等級：P1
- 建議：指定 agent 的 shasum 來源（例如「agent 從 run log 的 `npm notice shasum:` 行讀取」，並刪除 (d)；或「agent 在 Node 24、npm `<x.y.z>` 下於 tag 處 `npm pack` 計算」）。把「`npm stage publish` 是否印出 shasum」加進 unknowns，並寫明沒有印出時的處理方式。

**V-8：W1–W7 沒有封閉 workflow 的鍵集合；「complete」範本與 AC-4 的「satisfies W1–W7」判定結果不同**
- 位置：traceability.md:117-119（「complete apart from `<sha>` and the npm version」）、:166-170（W3、W6、W7）、spec.en.md:193-203（AC-4）
- 違反：AC 必須能不經詮釋判定。
- 證據：
  - W6 只說「Steps 4–8 have the `run` … verbatim. A `name:` may be added」，沒寫能不能加入其他步驟層級的鍵，例如 `continue-on-error: true`、`if:`、步驟層級的 `env:`、`shell:`、`timeout-minutes:`。
  - job 層級也一樣：`runs-on`、`timeout-minutes`、`continue-on-error`、`defaults`、`container`、`services` 都沒有任何 W 規則限制。
  - 特別是 `runs-on: ubuntu-latest`：它只出現在範本裡，沒有任何 W 列固定它。而 spec.en.md:274 的 npm 事實是「only GitHub-hosted runners are supported」。
  - 舉例：在第 7 步加上 `continue-on-error: true`，gate 就失去作用，但照字面仍滿足 W1–W7。照「complete」範本讀，它卻不合格。
- 影響：同一份 workflow 會因為讀的是 AC-4 還是範本而判出相反結果。gate 是否擋得住，取決於測試寫法。
- 信心：high
- 請求等級：P1
- 建議：新增一條規則：job 的鍵集合恰好是 `{if, runs-on, environment, permissions, steps}`，`runs-on` 等於 `ubuntu-latest`；每個步驟的鍵集合只能是範本列出的鍵加上 `name`。並在 W06 或新增的 W 列測試。

**V-9：M02 的「that one line」在 MR1 的寫法下沒有定義**
- 位置：traceability.md:181（MR1）、:271（M02）、spec.en.md:204-210（AC-5）；`create-wxl/package.json:6`；`tests/unit/scripts/upstream-guard.test.ts:82-103`、`:133`
- 違反：AC 必須能判定。
- 證據（直接讀到）：
  - MR1 把 `repository` 寫成單行物件 `"repository": { "type": "git", "url": "<repository-url>", "directory": "create-wxl" }`。create-wxl 的 manifest 本身也採用單行物件風格（`:6` 的 `"bin": { ... }`）。
  - 現行 guard 只有在 `path === 'package.json'` 時（`:133`）才用 `manifestA1UrlLines` 做結構式豁免。這個 walk 假設「一行一個鍵、`}` 單獨一行」（`:79-81`，Note 7）。單行物件會讓它的 stack 失準。
  - MR1 沒有規定 `repository` 要寫成單行還是多行，所以「`repository.url` 那一行」是哪一行、豁免要用什麼方法辨認（結構式，或 regex 比對 `"url":`），都要詮釋。
  - 如果寫成單行，「that one line」同時含 `type`、`url`、`directory`，豁免範圍比「`repository.url` only」（O1）寬。
- 影響：M02 的實作與判定取決於格式。C45 用 `JSON.stringify` 比對，看不到格式差異，兩種寫法都能通過 M01，M02 卻會得出不同結果。
- 信心：medium
- 請求等級：P1
- 建議：MR1 規定 `repository` 寫成多行（每個鍵一行），並寫明 M02 的辨認方式，例如沿用 `manifestA1UrlLines`，套用在 `create-wxl/package.json`，只豁免 `repository.url`。

## P2：值得記錄

**V-10：OQ-027 的內容由哪張 ticket 驗，沒有出口**
- 位置：traceability.md:242（DS3）、:273（D02）、spec.en.md:143、:214-215
- 證據：
  - AC-6 要求 OQ-027「carry DS1–DS3's changes」。
  - 但 DS3 說 OQ-027 是「filled in by the release ticket from RP5」。
  - 程式碼 ticket 做 AC-6 時只能建立空殼。AC-7、S8-02 只要求使用者回報看到哪些欄位，沒有要求寫進 OQ-027。
- 影響：AC-6 在程式碼 ticket 上能不能接受空殼，要詮釋。OQ-027 最後有沒有填，沒有任何 AC 判定。
- 信心：high
- 請求等級：P2（也可以視為 P1）
- 建議：AC-6 只要求 OQ-027 的標題與標準欄位存在；S8-02 加上「回報內容寫入 OQ-027 的 Evidence」。

**V-11：AC-3 的「references npm」與 K11 的封閉清單用詞不一**
- 位置：spec.en.md:187-188、traceability.md:258（K11）
- 證據：
  - AC-3 寫「none of the three files K11 names references npm」。
  - K11 是封閉清單：`npmCommand`、`'npm'`、`npm.cmd`、`npmView`、`npmWhoami`。
  - 新的 XM 結尾句「approved on npmjs.com」會出現在 `publish.mjs` 裡，照 AC-3 的字面可能被判為「references npm」。
  - 另外，K11 的「`publish-io.test.mjs` has no test of the removed exports」沒寫判定方法，例如「不出現這四個名稱」。
- 信心：high
- 請求等級：P2
- 建議：AC-3 改成「contains none of K11's strings」。

**V-12：K12 的 X6 在 0009-S1 上是自證（tautological）的，「full clone」也沒有定義**
- 位置：traceability.md:259（K12）、:68（S1：`ls-remote` stubbed）、spec.en.md:189-190
- 證據：
  - S1 的 `ls-remote` 是 stub，X6 是否成立完全取決於 stub 回傳什麼，跟 checkout 的形狀無關。
  - 在暫存 repo 裡，「a full clone」「`origin/main` present」要怎麼構成（建一個 bare origin 再 clone？），沒有寫。
  - 現有的 `publish.test.mjs:166` 已經用 annotated tag 驗過「X1–X9 全部成立」。K12 新增的只有 detached HEAD。
- 影響：AC-3 最後一項不提供 CI 形狀的實質證據。實質證據只有 S8-01。
- 信心：medium
- 請求等級：P2

**V-13：AC-8 的「without contacting npm」沒有觀察方法，RP0 的代理指標也沒有鑑別力**
- 位置：spec.en.md:233-235、traceability.md:191、:281
- 證據：
  - AC-8 本身沒寫怎麼判定「沒有聯絡 npm」。
  - RP0 的代理指標是「no npm log is written」。但 `node scripts/check-publish.mjs` 根本不經過 npm CLI，所以這條恆真。
  - 在開發 checkout 上，X3（或 `dist/` 缺少時的 X8）一定先失敗（`publish.mjs:132-177`），不論實作有沒有 npm 呼叫，都走不到 X9。
  - 另外，RP0 有第三項「CI's parse tests for the workflow pass on the PR」，AC-8 與 S8-08 卻只列兩項終端機輸出。
- 影響：這項觀察無論實作如何都會通過。RP0 的第三項沒有出口。
- 信心：high
- 請求等級：P2
- 建議：刪掉這個代理指標，「不聯絡 npm」只靠 K11 的靜態判定。AC-8 補上 CI 那一項，或把它從 RP0 刪掉。

**V-14：「code ticket」沒有定義；D10 沒有出口，與 F2 的修正 ticket 互相纏繞**
- 位置：traceability.md:53（D10）、:61（O3 (a)）、:216（F2）、spec.en.md:136-137、:233
- 證據：
  - 只改文件的 ticket（release.md、DS1～DS3）算不算「code ticket」？要不要做 RP0？沒有寫。
  - D10「from the first code ticket lands until its last code ticket lands」沒有任何列可以判定（例如比對 tag 時間與 merge 時間）。
  - 如果第一次發布落入 F2，修正要以新的 ticket 落地。它在 release ticket 推 tag 之後才落地，算不算「last code ticket」？D10 的區間要怎麼算？
- 信心：medium
- 請求等級：P2

**V-15：RP6 (a) 的 provenance 檢查沒寫取得方法；核准後的失敗沒有 F 列**
- 位置：traceability.md:197（RP6）、:276（S8-03）、:278（S8-05）、spec.en.md:270-286
- 證據：
  - `dist.attestations` 只給出 URL。要讀到「names the upstream repository … and the tag's commit」，必須抓下 DSSE envelope、解碼 payload，再對應 SLSA 欄位（例如 `externalParameters.workflow.repository`／`path`／`ref`、`resolvedDependencies[].digest.gitCommit`）。這是推論，沒有用網路確認。spec 沒寫方法，也沒寫 repository 用 URL 還是 slug 比對。
  - 「staged 之後再核准的版本是否帶 provenance」：research note 只記錄 trusted publishing 下 provenance 是自動的，沒有針對 staging 的說法，unknowns 清單也沒列。
  - RP6 失敗（沒有 provenance、`npm create` 失敗、CDN 還沒更新到 `latest`）時，D6 的 F1～F5 都不適用，S8-05 的「each failure is recorded with its F-row」無法分類。
- 信心：medium／low（npm 行為）
- 請求等級：P2

**V-16：RP5 (c) 在頁面不顯示任何欄位時會空洞地成立**
- 位置：traceability.md:196、:275（S8-02）、spec.en.md:222-223
- 證據：「Each field the page shows matches」加上「A field the page does not show … is listed in OQ-027」。Staged Packages 頁面在核准前完全不顯示這些欄位時，(c) 會零比對就通過，AC-7 照樣成立。
- 影響：可以判定，但沒有鑑別力。B1 依賴的「comparison」可能等於沒做。
- 信心：medium
- 請求等級：P2
- 建議：寫明至少要有哪個欄位可比對；全部看不到時，改用替代證據（例如 `npm stage list` 或 view 的輸出，需要使用者用傳統登入）。

**V-17：W08 和 W4 的「註解」要求只能靠閱讀判定**
- 位置：traceability.md:268（W08）、:118（「the same trailing tag comment」）、:264（W04）；`tests/unit/workflows/upstream-only-jobs.test.ts:13-18`；`trigger-branches.test.ts:61`
- 證據：
  - W08 要求 header 註解「counts `format(…)` six times across three files」，以及 `trigger-branches.test.ts:61` 的註解提到 `publish-npm.yml`。兩者都沒有逐字字串，只能人工閱讀。
  - workflow 一節要求 `<sha>` 帶「the same trailing tag comment」。但 W04 比對的是解析後的 `uses`，YAML 解析會丟掉註解，所以這條要求沒有出口。
- 信心：high
- 請求等級：P2

**V-18：D02 沒有 seam；AGENTS.md 的「a line linking」沒有逐字字串**
- 位置：traceability.md:72（S5 只涵蓋 release.md 與 AGENTS.md）、:240-242、:273；spec.en.md:211-217
- 證據：
  - DS1 的「X9's row (to D1's conditions)」「D4 (superseded)」等，只能靠人工閱讀判定，沒有任何 seam 涵蓋。
  - R2 的「`AGENTS.md`'s Reference gains a line linking `docs/agents/release.md`」不是字串。範圍是整份檔案還是 `## Reference` 一節，也沒有寫。
- 信心：high
- 請求等級：P2

**V-19：D01「不寫出 upstream slug」的判定範圍，與 MN1 需要的 owner／repository 值有張力**
- 位置：traceability.md:185-187、:204、:239、:272
- 證據：
  - MN1 要使用者填 owner `BrowserLaboratory`、repository `wxl-platform`。R2 要求 release.md 每個 MN 都有一行。
  - 把兩個名稱分開寫算不算「spell the upstream slug」？guard 只比對 `BrowserLaboratory/wxl-platform`（不分大小寫，`upstream-guard.test.ts:121`），分開寫不會被抓到；但照「ships in ranges」的意圖讀，可能不應該寫。
  - 此外，real-tree 的 guard 只在 upstream 上執行（`:776`，`describe.runIf(REAL_DECISION)`）。
- 信心：medium
- 請求等級：P2

**V-20：spec 與 traceability 的派生不一致**
- 位置：spec.en.md:82-90 對照 traceability.md:169；spec.en.md:129-130 對照 traceability.md:215
- 證據：
  - spec 的步驟清單編號 1～7（「Set up pnpm, and Node 24」合為一步），但 W6 與 AC-4 都說「exactly eight steps」，npm 是「step four」。只讀 spec 的人會數出 7 步。
  - spec 的可重跑原因寫「a missing or expired npm or GitHub setting」，範圍比 F1 的「MN1 or MN2 missing or expired」寬，例如 Actions 被停用、其他 environment 設定。這類原因要歸 F1 還是 F2，兩份文件給出不同答案。
- 信心：high
- 請求等級：P2

**V-21：O1「rebrand 會改寫這一行，M01 仍成立」沒有任何列驗證**
- 位置：traceability.md:59（O1）、:269（W09）、:270（M01）；`scripts/fork-init.ts:1165`、`:689`；`fork-init.test.ts:4257-4306`
- 證據：
  - 我讀了 `transformText`：它在 sensitive rename 之後，把 `UPSTREAM_SLUG` 替換成 `args.repo`。`EXCLUDED_DIRS` 不含 `create-wxl`。所以這個主張很可能成立（推論）。
  - 但 W09 擴充的 T52 只把 workflow 檔放進 fixture，沒有任何列在 rebrand 之後比對 `create-wxl/package.json` 與根目錄的 `repository.url`。
- 信心：medium
- 請求等級：P2
- 建議：T52 加一個斷言：把 `create-wxl/package.json` 放進 fixture，rebrand 後兩邊的 url 相等。

**V-22：AC-7 標題宣稱涵蓋 RP1–RP7，但 RP1、RP2、RP4 沒有 S8 列**
- 位置：spec.en.md:218、traceability.md:192-195、:274-280
- 證據：以下都沒有任何列觀察：
  - RP1：CHANGELOG 由 `/tw-emoji-release-note` 產生；
  - RP2：annotated tag、訊息 `WXL <V>`、只推單一 tag、使用者明確確認在先（U3）；
  - RP4：GitHub Release notes 被取代。
  另外，S8-01 的前提「after MN1, MN2」也沒有要求記錄時序（例如 MN1 是否在 tag 前兩天之內）。
- 信心：high
- 請求等級：P2

**V-23：S8-06、S8-07 由誰觀察、怎麼觀察，沒有寫**
- 位置：traceability.md:279-280；research note:14
- 證據：
  - 「the staged entry is gone」：research note 記錄 `npm stage list` 無法使用 OIDC，需要傳統登入。agent 看不到，只能由使用者回報，但 spec 沒說。
  - S8-07 的「no approval before `release.yml` succeeds」要用什麼證據（核准時間與 run 結束時間的比對），也沒寫。
- 信心：medium
- 請求等級：P2

**V-24：F4 的「Re-run it if F1's causes apply」與 F1 的原因對不上**
- 位置：traceability.md:218（F4）、:215（F1）
- 證據：
  - 「it」指的是 `release.yml`。但 F1 的原因（registry、MN1／MN2）幾乎不可能是 `release.yml` 失敗的原因，因為它建置網站與 GitHub Release。
  - 「network error」包不包括 GitHub runner 或 action 下載的基礎設施故障，也要詮釋。
  - 例如 `release.yml` 因 Rust 工具鏈下載暫時失敗：照字面要 reject，照意圖應該重跑。
- 信心：medium
- 請求等級：P2

**V-25：XM「one line」與 `env` 邊界的定義細節**
- 位置：traceability.md:89-91、:101-109
- 證據：
  - `JSON.stringify` 不會跳脫 U+2028、U+2029，值含這兩個字元時，「one line」的判定會因為換行的定義而不同。
  - 「A variable is *set* when its value is a string」沒說是否只看 own property（原型鏈上繼承的屬性算不算）。
- 信心：low
- 請求等級：P2

## 我檢查過但沒有發現問題的部分

- K01～K07、K13：原因字串、值的格式、結尾句都是逐字固定，可以在 S1 判定。第 1 輪的 V-1～V-5 已解決。
- K09（多傳參數被忽略）、K10（引用 C42）、K11 的 export 清單：都可以判定。
- W01～W05：都可以和 `release.yml` 的字面值逐字比對，包括 `if:`（`release.yml:19`）、三個 `uses`（`:32`、`:53`、`:56`）、`node-version: 24`（`:58`）。
- W09 的計數：可以由 T52 的 `ifLinesBefore.length` 判定（`fork-init.test.ts:4282`，2 改為 3）。
- M01：可以在 C45 的 `JSON.stringify` 比對上判定，MR1 已固定位置與內部 key 順序。
- S8-01（步驟結論）、S8-03 的 `npm view` 兩項、`range.json` 欄位：都可以判定。
- `check-publish.mjs` 的輸出前綴是 `checkPublish failed: `（`:29`），不影響 XM 以 `X9 (` 開頭的判定。
- 全文沒有出現「appropriately／reasonably／as needed／where possible」這類模糊詞。

共計：P0 0 件、P1 9 件、P2 16 件。
