# Stage 3 round 1：軸 4「紅隊」（R）

審查版本：spec.en.md blob `b599e850176351a0f1a174f7ef87bd86ea481b62`、traceability.md blob `578af9f3eee43e6ba20fe595f557dcae0840a399`，HEAD `c0f7edf`。reviewer：`harness-reviewer`，凍結 prompt `review/prompt.md`（blob `06f490b5…`）。reviewer 沒有 shell，無法自行驗證 blob hash；parent 於 13:2x 以 `git hash-object` 確認兩檔未變（最後修改 13:14，reviewer 13:16 啟動）。以下為報告內容；P1 保留全文要點，P2 精簡。

對照過的檔案：`scripts/fork-init.ts`、`scripts/templates/deploy.yml.template`、`.vitepress/config.mts`、`.vitepress/challenge/shortLink.ts`、兩個首頁 frontmatter、`package.json`、`.gitattributes`、`.gitignore`、`.github/workflows/quality-gates.yml`、`release.yml`、`scripts/pre-commit.sh`、`tests/unit/site/glossary.test.ts`、帶上游 origin 的元件測試、兩個 Playwright config、OQ-004/OQ-005、已安裝的 VitePress `VPHero.vue`。

## P1

**R-1 寫入 `settings` 後的 slug 改寫會改掉設定紀錄本身**（spec:128、160、166、191-197；T70；fork-init.ts:172-185、267、299-308）。直接讀到：`runForkInit` 對整棵樹非二進位檔做 `split(UPSTREAM_SLUG).join(args.repo)`，排除清單不含設定紀錄；spec 先寫 `settings` 再呼叫 `runForkInit`。推論：`upstream.repo` 被改成老師的 repo；後續 save 時磁碟上 `applied.repo` 也被改成新值，apply 中途失敗後下一次 save 是「新→新」，舊 slug 永遠殘留，AC-G6 失效。信心高。建議：紀錄加入排除清單、只由 setup module 以記憶體物件整份重寫；T70 驗證失敗後 `upstream` 與 `applied` 位元組不變。

**R-2 slug 改寫也會改到 setup module、create-wxl 與它們的測試**（spec:177-179、101-103；T85；fork-init.ts:182-185）。`SELF_EXCLUDE` 只保護 fork-init 自己。推論：setup module 裡比對上游的常數與 fallback、測試 fixture、GitHub fork 裡保留的 create-wxl 目錄都會被改寫；B5 判斷錯誤；T85 只驗「沒有上游專用測試」，沒驗「save 之後」。信心：機制高、受影響檔案中。建議：上游 slug 只從 fork-init 匯出；相關目錄與測試加入排除；T85 改為「完成一次 save 之後仍通過」。

**R-3 slug 用子字串取代，前綴關係會重複疊加**（spec:114-116、196-197；AC-F6、AC-G6；fork-init.ts:267）。推論：`lin/web` → `lin/web-range` 失敗重試後變 `lin/web-range-range`；repo 含上游 slug（如 `BrowserLaboratory/wxl-platform-2026`）時每次 save 多一個後綴，AC-F6 不成立（現行 fork:init 已有此問題，spec 把它延伸成每次 save 觸發）；Windows 檔案被鎖（EBUSY）正是 T70 情境。信心高。建議：token 邊界匹配（前後不能是 `[A-Za-z0-9._-]`）；T35、T70 加入這兩種案例。

**R-4 `applied.repo` 太短或太常見時改掉無關文字**（spec:166、168；T32、T69；fork-init.ts:74、299-308）。`REPO_RE` 接受 `a/b`、`s/t`；`scripts/templates` 含 `s/t`、`data/bin` 含 `a/b`（直接讀到）。推論：老師先填佔位值再改，就大範圍損壞原始碼與教材。信心中高。建議：token 邊界之外，只在 URL 或 slug 語境取代（例如 `github.com/<slug>`），或在 save 回應列出被改到的非 edit-target 檔案並要求確認。

**R-5 AC-S4 的白名單實際上沒有限制寫入範圍**（spec:41-43、276；T64；fork-init.ts:172-179；.gitignore:12、66）。edit targets 把「the upstream slug」列為一個位置，但它出現在 10 個檔案；走訪沒有排除 `.vitepress/wasm/`、`chall-wasm/target/`、`tmp/`、`test-results/` 等 gitignore 產物目錄（直接讀到）。推論：T64 用 fixture 驗不到真實樹的額外寫入，save 時間隨產物增加。信心中高。建議：slug 改寫限制在明確檔案清單或 glob；走訪排除 gitignored 路徑；T64 改用 `git archive HEAD` 的真實匯出樹當 fixture。

**R-6 baseline 標稱「create-wxl 剛產生的樹」但沒有驗證**（spec:38-40、192；AC-G1；T65）。推論：老師在第一次 save 前可能已 `pnpm install`（改 lockfile）、手動 `fork:init`、改頁面或加題目，都會被記成上游 baseline，升級時被覆蓋或遺失。信心高。建議：create-wxl 寫入樹的 manifest 雜湊，setup 比對一致才建 baseline，不一致就拒絕或標示「baseline 不可信」；或改由 create-wxl 直接 init 並 commit（與 Q14 衝突，需使用者裁決）。

**R-7 git 步驟失敗或卡住會永久變成「沒有 baseline」**（spec:192-193、197；AC-G1、AC-G2；T65、T66）。判斷依據是「有沒有 `.git`」，spec 沒對 save 流程的 git 指令規定 timeout（直接讀到）。推論：`git init` 成功但 commit 失敗（全域 `commit.gpgsign`、`core.hooksPath` 的 hook、磁碟滿、Windows 長路徑）後 `.git` 已存在，下一次 save 走 fork 分支，baseline 永遠 null；簽章等待輸入會卡住，鎖沒在 `finally` 釋放就一直 409。信心高。建議：失敗時刪除剛建立的 `.git`，或以「紀錄有 `createdWith`、baseline 為 null、repo 沒有 commit」判定可補建；git 指令加 timeout、`-c commit.gpgsign=false`、`-c core.hooksPath=`、`GIT_TERMINAL_PROMPT=0`；鎖在 `finally` 釋放。

**R-8 AC-G2 照字面套用到後續 save 會清掉 baseline**（AC-G2、AC-G5；T66、T69）。AC-G2 條件是「`.git` present → baseline null」，第一次 save 後每次都符合。信心中。建議：AC-G2 限定「沒有紀錄或 baseline 為 null，且 `.git` 存在」；AC-G5 明訂 baseline 不變。

**R-9 已套用設定後 `.git` 消失會建立假的新 baseline**（spec:192；T65）。推論：老師用壓縮檔複製、刪 `.git` 或搬資料夾，下一次 save 會把已套用設定的樹 commit 成新 baseline，覆蓋原值。信心中。建議：只在 `baseline` 與 `applied` 都為 null 時建 baseline；其他情況 init 但不記錄並警告。

**R-10 B5 的上游拒絕可被繞過，URL 比對規則沒定義**（spec:191-192、222；AC-G3；T67）。只在「沒有設定紀錄」時檢查（直接讀到）。推論：上游根目錄意外出現一份紀錄（測試寫進根目錄、stage 8 在錯的目錄執行）就失效；SSH 形式（`git@github.com:…`、`ssh://git@ssh.github.com:443/…`）、無 `.git` 後綴、大小寫、`insteadOf` 未定義；這個條件放寬沒有好處。信心中高。建議：origin（及 `upstream` 以外所有 remote）正規化後等於上游就一律拒絕，不看紀錄；正規化規則與案例寫進 T67。

**R-11 開發用 override 實際上能下載任何 fork 的 commit**（spec:82-84、219；AC-C4；T8）。推論（GitHub 已知行為，非本 repo 程式碼）：同一 fork network 任何 fork 的 commit 都能用上游路徑從 codeload 取得，含已刪除的 commit；攻擊者推惡意 commit 再騙老師用 override，之後 `pnpm install` 或 `range:setup` 就執行它。spec 沒規定 override 的傳遞方式；若是環境變數，殘留設定會靜默生效。信心高。建議：override 只接受 CLI flag、執行時顯眼警告；B2 補上「override 指向的 commit 不保證屬於上游」；或驗證 commit 可從上游分支或 tag 到達（多一次網路請求，與 AC-C9 衝突，需裁決）。

**R-12 發布的套件可能沒帶 release 檔，或指向 GitHub 上不存在的 commit**（spec:79-81；AC-C12；T20）。推論：release 檔若 gitignore、`package.json` 沒有 `files`，npm 會用 `.gitignore` 排除它；`npm publish --ignore-scripts` 跳過 pre-publish；本機 tag 沒推上去 codeload 會 404；npm 版本不可覆寫，研習前一天的風險。信心中。建議：`files` 白名單列入 release 檔；`prepack` 或測試驗證 `npm pack --dry-run` 含 release 檔；pre-publish 用 `git ls-remote` 確認遠端 tag 存在且指向同一 commit。

**R-13 `create-wxl` 的 npm 名稱沒有預先保留**（spec:20、218、349-351）。推論（reviewer 無法查 registry）：發布前被搶註，README 教老師執行的指令就會跑別人的程式碼；README 沒鎖版本。信心低。建議：發版前確認並先發 placeholder；README 寫版本範圍；B1 補上名稱搶註。

**R-14 `siteName` 會以 `v-html` 渲染在首頁 hero**（spec:120-121、171、221；AC-F2；T27；`node_modules/vitepress/dist/client/theme-default/components/VPHero.vue`:37；`platform/index.md`:5；`platform/zh-TW/index.md`:5）。直接讀到：VitePress 2.0.0-alpha.16 的 VPHero 用 `<span v-if="name" v-html="name">`，專案沒有覆寫 VPHero，spec 明確接受含 `<` 的名稱。推論：`<img src=x onerror=…>` 成為部署站上的 stored XSS，所有學生都會載入；`A<B 靶場`、`Tom & Jerry` 渲染錯誤，與跳脫過的 `<title>` 不一致。B4 只談語法層、漏了渲染層。信心高。建議：寫入 hero 時 HTML 跳脫（`&`、`<`、`>`、`"`）或拒絕 `<` 與 `&`；B4 補渲染層；T27 加上 build 後 DOM 文字比對。

**R-15 套用設定後 range 與 fork 的既有 CI 會轉紅**（spec:204-205、101-103；AC-CI1；T85；ShortLinkShare.test.ts:53-76；ChallengeList.test.ts:121-145；MergedNav.test.ts:449、464；quality-gates.yml:8-11、63-64；release.yml:60-61；config.mts:18-20；playwright.config.ts:31；playwright.site.config.ts:20）。直接讀到：多個元件測試寫死 `wxl.browserlab.online`，setup 會改寫 `SITE_ORIGIN`；quality-gates 在 push main 時跑 `pnpm test --run`；release.yml 在 `v*` 跑全套，而 T72 要老師推 `v*`。推論：fork 保留的 version-alignment 測試在版本重設為 `0.1.0` 後必然失敗；GitHub Pages range 的 base 成為 `/<name>/`，Playwright baseURL 在根目錄，site-smoke 與 challenge-verify 很可能失敗（中信心）。信心：origin 測試與 version-alignment 高、Playwright 中。建議：測試改讀 `SITE_ORIGIN` 常數；version-alignment 在沒有 create-wxl 目錄時略過；T85 改為「save 後整套 `pnpm test --run` 通過」。

## P2

- **R-16** range 繼承 `release.yml`（release.yml:3-12、69-79），推 `v*` 會建立帶 wxl 品牌的 GitHub Release（`contents: write`、`wxl-<tag>.zip`）。建議：列為上游專用或納入處理；T72 說明副作用。信心高。
- **R-17** 新 CI job 在老師 repo 跑 macOS、Windows runner，私人 repo 的分鐘數分別以 10 倍、2 倍計。建議：加 `if: github.repository == '<upstream>'` 或列為上游專用。信心中。
- **R-18** GitHub Pages range 的 favicon 404（config.mts:69-80「MUST edit these hrefs」；不在 edit targets）。信心高。
- **R-19** create-wxl 後處理與移入目標的先後沒定義；先移入再寫紀錄、中途失敗會留下沒紀錄的 range，被當成 fork；清理時遞迴刪除既有空目錄有誤刪風險。建議：後處理全在暫存目錄完成，最後才 rename。信心中。
- **R-20** 移入既有空目錄的競態；Windows rename 不能覆蓋既有目錄；目標為 `.` 無法 rename。建議：移入當下再檢查、絕不遞迴刪除目標、`mkdtemp`、明訂 `.`。信心中。
- **R-21** Ctrl-C（SIGINT）會留下暫存目錄。信心中。
- **R-22** 解壓政策細節：GitHub tarball 開頭有 pax global header（type `g`）、GNU 長檔名 `L`/`K`，若當成 entry 會拒絕所有真實 tarball，fixture 可能沒有這些 header；`..` 沒規定 `\`、磁碟代號（`C:x`）、大小寫碰撞；沒規定 mode（setuid、world-writable）與 root 執行時的 owner。信心中。
- **R-23** 下載沒有大小上限（gzip bomb）；timeout 是連線、閒置還是總時長不明；redirect 是否跟隨、能否跨主機未定。信心中。
- **R-24** 校園網路 TLS 攔截會逼老師設 `NODE_TLS_REJECT_UNAUTHORIZED=0`，B2 直接失效；Node fetch 預設不用 OS 憑證庫、不讀 `HTTP_PROXY`。建議：錯誤訊息導向 `--use-system-ca` 或 `NODE_EXTRA_CA_CERTS`。信心中。
- **R-25** token 在第一次載入後如何傳遞沒規定；若用 cookie（不分 port），`127.0.0.1` 上其他本機服務的 XSS 可讀；沒規定 `Referrer-Policy: no-referrer`、`Cache-Control: no-store`、`history.replaceState` 移除 token。信心中。
- **R-26** `Host` 允許 `localhost` 但 `Origin` 只規定單數「the server's origin」；`localhost` 解析到 `::1` 時只綁 IPv4 連不上。信心中。
- **R-27** save 鎖只在單一程序內有效，兩個終端機各跑一次會同時改寫。建議：lock 檔跨程序互斥。信心中。
- **R-28** 頁面若用 innerHTML 顯示紀錄值、git stderr 或檔名，別人提供的 fork 副本裡造好的紀錄可在帶 token 的頁面執行 script；靜態路由對應檔案系統時 `%2e%2e` 可讀任意檔（仍需 token）。建議：一律 textContent、靜態路由固定白名單。信心低。
- **R-29** Windows：Node 拒絕不經 shell 執行 `.cmd`/`.bat`，npm 裝的 `wasm-pack` shim 會被誤判為缺少；執行檔搜尋先找目前目錄（range 根目錄的 `git.exe`）；`start` 是 cmd 內建，不經 shell 開瀏覽器要改用 `explorer.exe` 或 `rundll32`。信心中。
- **R-30** `REPO_RE`（fork-init.ts:74、78）接受 `./..`、含 `_`/`.` 的 owner，產生 `https://my_org.github.io/…`、base `/../`；repo 名為 `<owner>.github.io` 的 user site 沒被拒絕。建議：owner 照 GitHub 規則、name 排除 `.`/`..`、偵測 `*.github.io` 時拒絕並引導用 `fork:init`。信心：regex 高、實際填寫中。
- **R-31** 依舊版 README 跑過 `fork:init` 的 fork：版本已是 `0.1.0`、slug 已是 X，第一次 setup 記 `upstream.version = "0.1.0"` 且只從上游 slug 取代，X 殘留。建議：非發行版號時警告；`fromRepo` 可從 package.json 的 `repository` 推得。信心中。
- **R-32** Cloudflare 主機名稱只檢查 `[a-z0-9.-]`，`-`、`..`、單一 label、`localhost`、IP 都會通過。建議：每段 1-63、不以 `-` 開頭結尾、至少兩段。信心高。
- **R-33** 用文字方式定位 hero 與 title（不能用 `yaml` 套件），老師改成不加引號、多行或加入其他 `name:` 鍵時可能改錯或靜默沒改。建議：限定在 frontmatter 的 `hero:` 區塊，找不到唯一目標就報錯。信心中。
- **R-34** GitHub「Download ZIP」或 main 快照沒有 `.git` 與紀錄，`upstream.version` 記成 package 版號，內容可能比該版新。信心低。

**等級統計：P0 0、P1 15（R-1～R-15）、P2 19（R-16～R-34）。**
