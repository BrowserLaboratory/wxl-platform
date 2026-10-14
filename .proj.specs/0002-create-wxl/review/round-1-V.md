# Stage 3 round 1：軸 2「可驗證性」（V）

審查版本：spec.en.md blob `b599e850176351a0f1a174f7ef87bd86ea481b62`、traceability.md blob `578af9f3eee43e6ba20fe595f557dcae0840a399`，HEAD `c0f7edf`。reviewer：`harness-reviewer`，凍結 prompt `review/prompt.md`（blob `06f490b5…`）。reviewer 沒有 shell，無法驗證 blob hash；parent 以 `git hash-object` 確認兩檔未變（最後修改 13:14，reviewer 13:16 啟動）。reviewer 回報缺少的脈絡：S1–S11 的定義與 Q1–Q24（含 Q5 keep list）不在兩份檔案裡，涉及 seam 的判斷是推斷。以下為報告內容，精簡但保留每一項的位置、證據、等級與建議。

另外讀過：`AGENTS.md`、`docs/agents/{runtime,review,workflow,platform-notes}.md`、`scripts/fork-init.ts` 與其測試、`fork-template-parity.test.ts`、`deploy.yml.template`、`config.mts`、`shortLink.ts`、`platform/index.md`、`package.json`、`.gitattributes`、`quality-gates.yml`、`glossary.test.ts`、`README.en.md`（fork、部署）、OQ-004/OQ-005、`VPHero.vue`。

## P0

- **V-38**（P0，信心中；reviewer 註明使用者可裁定降為 P1）AC-U3 的 surface 有歧義，「succeed」要詮釋（spec:295、326-327；T77）。本 repo 的「Browser panel」指題目頁沒有 `allow-same-origin` 的 `srcdoc` iframe（platform-notes.md:7、AGENTS.md:75），不能載入 `127.0.0.1` 的 setup 頁；過去 ticket 紀錄也用同一詞指 Claude 桌面應用程式的 Browser panel，epic 0001 第 2 輪 K-12 處理過同樣的撞名（`.proj.specs/0001-truthful-clear-reports/review/round-2.md:549`）；Codex runtime 沒有對應工具。「all succeed」沒有可觀察結果：缺 cargo 算不算 succeed？第二次存檔應看到什麼？「edit」改哪個欄位？建議：改寫成具體 surface（例如以 `/agent-browser` 或宿主原生瀏覽器開啟印出的 `http://127.0.0.1:<port>/?token=…`），每一步列出可觀察結果（狀態碼、檔案、git log）。

## P1

- **V-1** seam 只有編號沒有定義（traceability:4、Seam 欄；spec:313-314）。T79–T84 的 seam 是「—」。S3 是 CLI 還是 `runForkInit`、S5 與 S7 的界線，決定 AC-F1「exit 1」與 AC-V2「blocks saving」在哪一層觀察。建議：traceability 補 seam 定義表（seam → 進入點 → 可觀察輸出）。信心高。
- **V-2** 設定紀錄的檔名沒規定（spec:128）。AC-C8、R、G 都要讀寫它；下一個 epic 也依賴；「brand-free」需要詮釋。建議：寫死檔名。信心高。
- **V-5** AC-C6 寫「contains `..`」，規則與 T13 寫「a `..` segment」，`a..b.txt` 該拒或收不一致；`git archive` 給 commit 時寫入 pax global extended header（外部知識），照「any other entry type rejects」字面，真實 GitHub tarball 會被整包拒絕，取決於在原始 header 層或 node-tar 解析後判斷；`OldFile`、`ContiguousFile` 算不算 regular file 未說。建議：改「`..` path segment」；明訂檢查 node-tar 解析後的 entry，pax/metadata header 不算 entry，列出允許的 type。信心中。
- **V-9** pre-publish 用哪個 hook 沒說（spec:79-81、241、308）。目前沒有任何 tag（reviewer 查 `.git/refs/tags/` 與 `packed-refs`）；若用 `prepack`，`npm pack` 也會跑，AC-X1 的打包在 v3.0.0 前會失敗，AC-C12 與 AC-X1 互斥。建議：明訂 `prepublishOnly`，寫明 AC-X1 打包的套件沒有 release file、必須靠 override。信心中。
- **V-10** AC-E1 依賴 spec 裡沒有的清單（spec:103、244；T21、T22）。Q5 不在 spec；T21 的測試檔還沒有檔名；T22「shared instructions」「agent docs」要詮釋；「omits exactly」需要完整清單。建議：traceability 列出逐一 path 或 glob。信心高。
- **V-12** AC-F1 的「allowed set」沒定義，GitHub Pages 的 origin 本身帶 path（spec:248；T24）；fork:init 還要服務自訂網域。建議：fork:init 的 `origin` 寫獨立 regex。信心高。
- **V-13** AC-F2 在 parse 層判定，但 VPHero 用 `v-html`（`VPHero.vue:37`，直接讀到）；含 `<` 的名稱 parse 回來相同、AC 通過，但呈現是 HTML（與紅隊重疊）。建議：AC 加渲染層判定，或寫入前 HTML escape 並定義預期輸出。信心高。
- **V-14** AC-F6 冪等性遇到前綴重疊的 slug 失敗（fork-init.ts:267 子字串替換）：`lin/web` → `lin/web-range` 第二次跑變 `lin/web-range-range`；`BrowserLaboratory/wxl-platform-x` 同。建議：token 邊界替換，或明訂排除條件加列。信心高。
- **V-16** 「characters」「control characters」沒定義（spec:167、171、260；T26、T41）：UTF-16 code unit、code point 或 grapheme；只算 Cc 還是含 Cf（U+202E）與 U+2028/2029。建議：明訂 code point，拒絕 `\p{Cc}`、`\p{Cf}`、U+2028、U+2029。信心高。
- **V-21** AC-V2「blocks saving」沒說在哪一層（spec:266、187-188）；T49、T50 放在 S5，但 saving 在 S6、S7；只停用 UI 按鈕時直接呼叫 API 照樣存檔。建議：save API 在 git 檢查不通過時回指定狀態碼且不寫任何檔案。信心高。
- **V-22** 教學內容、標籤文字與語言沒有規格（spec:266-268、189-190；T49–T54）：教學內容與連結、git 身分設定教學都沒定義；「local development only」只有英文；每個 OS 對到空白教學也能通過 AC-V4。建議：traceability 列出教學 key → 各 OS 內容或 URL，並寫明 zh-TW 字串。信心高。
- **V-23** 「the server's origin」與兩個合法 Host 衝突（spec:184-186、275）：用 `localhost` 開頁面時 Origin 是 `http://localhost:<port>`。建議：Origin 等於 `http://` 加該請求的 Host，或兩種都接受。信心高。
- **V-24** 「state-changing request」與 API 沒定義（spec:180-186、275；T59）：路由、method、body、回應都沒有；會 spawn probe 的 GET 算不算；token 放 query、header 或 cookie 沒說（cookie 會改變 B3 分析）。建議：列出 API 表（路由 × method × 是否 state-changing × 狀態碼）。信心高。
- **V-26** AC-S4 提到的 whitelist 不存在（spec:41-43、276；T64）：edit targets 是位置不是路徑，slug 由 `walkTextFiles`（fork-init.ts:299-308、423-442）掃整個 repo，被改到的 `docs/...` 算不算合法無法判定。建議：定義為「固定路徑清單，加上 diff 只有 slug 替換的檔案」。信心高。
- **V-27** slug 替換會改寫設定紀錄與 setup module 自己，AC-S4 偵測不到（spec:134、191-195；fork-init.ts:182-185、267）：違反 spec 自己範例裡 first save 後 `upstream.repo` 仍是上游；AC-G3 的判斷常數被改寫（與 K、R 重疊）。建議：排除紀錄與 setup module 目錄，加一條「save 之後 `upstream.repo` 不變」。信心高。
- **V-29** AC-G1 的 baseline 定義與實作順序矛盾（spec:39-40「exactly as create-wxl left it」vs 192「current tree」）：老師在中間改過檔案就無法判定也無法實作。建議：定義為 current tree，或 create-wxl 寫 manifest、第一次存檔比對不一致就拒絕或警告。信心高，P1（可主張 P0）。
- **V-30** AC-G2 字面上與 G1、G5、欄位表衝突（spec:284、164；T66）：「With `.git` present」沒限定第一次存檔，第二次存檔照字面要把 baseline 設 null。建議：改成「第一次存檔時，沒有設定紀錄或 baseline 從未設定，且 `.git` 已存在」。信心高，P1（照字面互斥，可主張 P0）。
- **V-31** 「explains why」「with an explanation」「with a message」要詮釋（spec:259、284、285）。建議：每個訊息對應雙語字串 key，AC 斷言該 key 出現。信心中。
- **V-32** AC-G3 沒定義「origin 指向 upstream」怎麼比對（spec:191、285；T67）：HTTPS/SSH（`git@github.com:`、`ssh://`）、`.git` 結尾、大小寫、尾斜線。建議：寫出正規化與比對規則並列出測試 URL。信心高。
- **V-33** AC-G4 記錄重設前或重設後的版本沒寫（spec:161、286；T68）：期望值可能是 `3.0.0` 或 `0.1.0`。建議：明訂重設前讀取。信心高。
- **V-35** AC-G7 寫「exactly as T72 or T73」，但 T72、T73 只是主題清單（spec:289；T72、T73）：T73 沒給值（README.en.md:191-202 有 rustup 加 `pnpm build`、`.vitepress/dist`、`NODE_VERSION=24`，spec 沒引用）；T72 把「Commit and push」排在「create the repository」前，做不到；T73 沒有建 GitHub repo，但 Cloudflare Git integration 需要。建議：traceability 寫出兩個 host 的步驟全文（雙語 key、具體值、順序）。信心高。
- **V-37** AC-U2、AC-U4 沒有驗證 surface（spec:294、296、323-327）：UI 只自動化 key parity；stage 8 ② 不含語言預設、切換、GitHub Pages 唯讀 origin；同一瀏覽器難以同時測 `zh*` 與非 `zh`。建議：寫進 stage 8 ② 的步驟或改用 DOM 測試。信心高。
- **V-39** AC-B1 沒有 seam 也沒有測試（spec:300；T79）：Testing Decisions 與 AC-X2 都沒涵蓋；檔名有 hash，只比對檔名抓不到被 bundle 的程式碼；B6 唯一的控制沒有執行處。建議：CI build 後跑測試或在 stage 8 ③ 檢查，並明訂比對規則（例如 dist 裡不出現 setup module 的特徵字串）。信心高。
- **V-40** AC-CI1 在 S10 觀察不到，條件也互斥（spec:204-205、301、322-323；T78、T85）：S10 是 workflow 檔斷言，看不到「passes」；「passes in a range」沒有 surface；range 裡 create-wxl 測試已被移除，與「runs the three test groups」衝突，vitest 篩不到檔案預設 exit 1；「Node 22」沒固定版本。建議：拆成 workflow 檔斷言，以及「在 `git archive` 解開的樹裡跑測試指令 exit 0」。信心高。
- **V-42** AC-D3 與 AC-D1 透過 glossary 測試互相牽連（GLOSSARY.md:360、365；glossary.test.ts:159、333-342，直接讀到）：宣告為新造詞的詞不可出現在 corpus，README 在 corpus；README 自然用到就讓 AC-D3 失敗。建議：交付 D1 的同一變更移除 `_新造詞_`，寫進 AC-D3。信心高。
- **V-43** stage 8 ① 要驗證 export-ignore 假設卻沒有判定條件（spec:308、352；T83）：AC-X1 只要求「creates a range」；override 介面（flag 或環境變數、名稱）沒說。建議：AC-X1 加「T21 路徑不存在、T22 路徑存在」並寫明 override 介面。信心高。

## P2

- **V-3** AC-C1、AC-C2 需要注入的 Node 版本與 `isTTY` 沒列在 Testing Decisions；CI 的「Node 22」沒固定 minor，22.6.0 下限從未實際執行；真的舊 Node 上頂層 import 或語法可能先崩潰；T1 的 locale 要求 AC-C1 沒寫；「usage」內容未定義。建議：寫入注入點、CI 加 22.6.0、AC-C1 補 locale。信心中。
- **V-4** 下載與 probe 的 timeout 沒數值；AC-V5「without a shell」在注入 runner 的測試裡觀察不到。建議：寫數值或可注入的預設值，為真實 runner 加 `shell: false` 斷言。信心高。
- **V-6** AC-C8 只檢查 key 存在：`upstream.version`、`upstream.commit`、`createdWith.createWxl` 的值（尤其用 override 時）、「from the templates」是否逐 byte、模板檔名與位置、`.gitattributes` marker 文字都沒寫。信心高。
- **V-7** AC-C9「only network request」只能透過注入的 fetch 觀察；`https.get` 或子行程連網看不到；「no package was installed」觀察方式未定義。建議：改為「沒有 `node_modules`、沒有 spawn 子行程、所有連網經過注入的 fetch」。信心中。
- **V-8** AC-C10「is Traditional Chinese」要靠人判讀；`LANG=` 空字串算不算 set。建議：改為等於 zh-TW 字串表的某個 key、空字串視同未設定。信心中。
- **V-11** AC-E1 只在 commit 後觀察得到：`git archive HEAD` 讀 tree 裡的 `.gitattributes`，不讀工作樹（外部知識，`--worktree-attributes`）。建議：測試計畫寫明 commit 後跑，或用 `--worktree-attributes`。信心中。
- **V-15** AC-F7 沒釘 commit；AC-F8「runs」沒參數與預期；`PROJECT_ROOT` 由腳本位置決定（fork-init.ts:48），在 repo 裡直接跑會改到 repo 本身。信心中。
- **V-17** Cloudflare origin 正規化邊界：尾斜線、大寫、`https://-`、`https://a..b`。信心中。
- **V-18** AC-R2 與 T45 矛盾：GitHub Pages 時送出不符的 origin 該忽略還是回錯誤。信心中。
- **V-19** AC-R3「equal input」沒定義 key 順序。建議：依範例的順序。信心中。
- **V-20** AC-V1「reported」沒說在哪、有沒有門檻。信心中。
- **V-25** 狀態碼優先順序（403 vs 413、403 vs 409）沒規定。信心中。
- **V-28** AC-S7 只測「starts」；延遲載入的 import 會讓真正存檔失敗。建議：改成在沒有 `node_modules` 的副本完成一次 save。信心中。
- **V-34** AC-G6 的失敗注入方式（chmod 在 Windows 行為不同）與「completes」的條件未定。信心中。
- **V-36** AC-U1 只比對 key，不檢查 zh-TW 文字；setup 頁字串不在 prose-audit 或 glossary corpus。信心中。
- **V-41** AC-D1「describe」要詮釋；保留 fork:init 處理 GitHub Pages 根目錄與自訂網域那條規則沒進 AC。信心中。
- **V-44** AC-X2「carries the chosen base and origin」判定方式不明：Cloudflare 時 base 是 `/` 必然成立；GitHub Pages 的 favicon 壞掉 AC 照樣通過；stage 8 只跑一個 host。建議：寫明 grep 的檔案與字串、兩個 host 各 build 一次。信心中。
- **V-45** stage 8 surface 與 workflow.md:151-153 不一致，spec 沒標明覆蓋（主屬契約衝突軸）。信心中。

**等級統計：P0 1（V-38）、P1 26、P2 18，共 45。**
