# 串連分析：epic 0008（翻譯不存在時的保底）

日期：2026-11-06。依 `docs/agents/review.md` 的「Epic close-out: chain analysis」執行。

## 範圍與方法

- **程式碼基準**：`main` = `9ed47ef`（T-0057 與它的落地紀錄合併後）。分析讀的是 `74a5e5e` 的 working tree，和 `ef13b2b` 的 tree 相同（`git diff 74a5e5e ef13b2b` 為空）；`9ed47ef` 只多了 T-0057 ticket 的落地紀錄。
- **epic 起點**：`5d3c173`（epic 0007 收尾之後）。
- **合併順序**：

  | Ticket | 合併 commit | 紀錄 PR |
  |---|---|---|
  | T-0053 | `d05976e`（#50） | `c7c2e30`（#51） |
  | T-0054 | `e5a1c36`（#52） | `fd2ef09`（#53） |
  | T-0056 | `95c05bc`（#54） | `e4fdb46`（#55） |
  | T-0055 | `293678f`（#56） | `c97e8ae`（#57） |
  | T-0057 | `ef13b2b`（#58） | `9ed47ef`（#59） |

- **輸入**：
  - `review/security-T-0053.md`～`security-T-0057.md` 的全部候選，不分等級，含只做記錄的項目與「沒有涵蓋的範圍」。
  - 五張 ticket 第 6、7 階段的處置，以及 T-0056 交給使用者的兩項 hook 既有問題。
  - `spec.en.md` 3.1 的 Trust Boundaries and Threat Model（B1–B5，`:144-152`）與 Out of Scope；`traceability.md` 3.5 的 D1–D17 與 V 表。
  - ADR-0005、ADR-0006；`OPEN-QUESTIONS.md` 的 OQ-018、OQ-023。
  - 最終程式碼：`.vitepress/theme/i18n/`（`arrival.ts`、`index.ts`、`pages.ts`、`lookup.ts`）、`composables/useArrivals.ts`、`theme/index.ts`、`LocaleSwitcher.vue`、`MissingTranslationLine.vue`、`ChallengeList.vue`、`HomeContent.vue`、`ShortLinkShare.vue`、`MergedNav.vue`、`BrowserPanel.vue`、`.vitepress/challenge/shortLink.ts`、`platform/shared/`、`scripts/generate-redirects.ts`、`scripts/pre-commit.sh`、`scripts/templates/deploy.yml.template`、`platform/public/challenge-sw.js`、`package.json`。
- **分工**：workflow `wf_b77cc044-d48`，全部唯讀。
  - 第一關：兩位 `harness-reviewer` 從不同角度找候選串連。一位逐一走信任邊界（by-boundary），一位從攻擊者的位置出發（by-attacker）。兩位各自盤點輸入的發現（55 項、51 項）。
  - 第二關：每一條候選串連交給一位獨立的 `harness-challenger` 嘗試反駁，共 23 位。
  - 第三關：一位 `harness-reviewer` 做完整性檢查，找漏掉的輸入、沒檢查到的邊界和沒提出的串連。
- **parent 親自查證**：下文「親自查證」一節的 HTTP 與 URL 正規化結果，以及完整性檢查提出的兩項推論。
- **標記方式**：**讀碼驗證**附 `檔案:行號`（行號是 `74a5e5e` 的）；**推論**是依賴主機或瀏覽器、沒有直接觀察的行為；**親自查證**是 parent 在本機或正式站上執行過的。

## 信任邊界與攻擊者模型

沿用 spec 的 B1–B5，另補題目 runtime 與平台之間的邊界。

| 邊界 | 保護什麼 | 不保護什麼 |
|---|---|---|
| B1 建置 → 送到 client 的頁面清單 | 清單只含建置會發布的頁面；不新增揭露（每頁本來就帶 VitePress 的 page hash map） | 只靠網址才找得到的頁面本來就不是隱藏的；static host 在模型外 |
| B2 網址 → 學習者被送到哪裡 | 導向目標一定是 base 加上清單項目，經 router 導覽；精心構造的路徑不能把人送出站、送到未發布的頁面或錯誤 | 指向另一個語系真實頁面的路徑會把人送過去，這就是用途 |
| B3 建好的網站 → 學習者的螢幕與剪貼簿 | 連結文字只來自 `SITE_ORIGIN`、補零編號與合乎文法的 slug，經 Vue 跳脫；那一行是固定訊息 | `SITE_ORIGIN` 指錯站時連結開到那個站（0007 D10）；同一 GitHub Pages owner 的靶場共用偏好（OQ-018） |
| B4 學習者的選擇 → 儲存的偏好 → 路由 | 只認 `en`、`zh-TW`；只有學習者的選擇會寫入：切換器，以及打開 `/zh-TW/` 底下的網址（D5、D13） | 任何頁面都能連到 `/zh-TW/` 網址，打開就把語言設成繁中；改 storage 的學習者可以選任一語言 |
| B5 Session gate → 導覽（ADR-0006） | gate 保護網站對已存作答紀錄所做陳述的歸屬與真實性；冷載入導向、not-found 導向與它們產生的那一行都等 gate 決定 | 切換器選擇產生的那一行不等（D17）；ADR-0006 已說明 gate 不保護的一切 |
| （B0）題目 runtime ↔ 平台 | 題目的刻意弱點不是 finding（ADR-0005）；本 epic 沒有改任何題目 | — |

攻擊者位置：第三方頁面上的連結；同一 owner 的另一個 GitHub Pages 靶場（共用 origin）；繞過 hook 的作者內容；共用電腦的前一位學習者（依 ADR-0006 不是攻擊者，只做備註）。

## 結論

**沒有跨越受保護信任邊界的串連，不需要開 ticket。** 兩位 finder 共提出 23 條候選串連，23 位獨立反駁者全部判定「已反駁、未跨越邊界」：每條的結果都落在某個邊界的「不保護」欄，或在同源、已發布的頁面範圍內，而且沒有權限提升。完整性檢查另提出 5 條，同樣沒有跨越邊界。

下面把兩位 finder 重疊的候選合併成 11 組。

## 候選串連與判定

| # | 串連 | 組成 | 碰到的邊界 | 判定與理由 |
|---|---|---|---|---|
| C-1 | 第三方連結經別名或編碼路徑寫入 `zh-TW`，再影響同 owner 的其他靶場 | T-0054 S-1、T-0055 S-4、S-6、T-0056 S-7、T-0057 S-4、T-0054 S-4、S-7；完整性檢查 PC-1、PC-2 | B4、B3 | 已反駁。冷載入已發布的 `/zh-TW/` 頁面會寫入 `zh-TW`（讀碼驗證：`useArrivals.ts:175-180`、`i18n/index.ts:200-202`），這正是 B4 不保護欄寫明的「任何頁面都能連到 `/zh-TW/` 網址」；跨靶場共用是 OQ-018。沒有任何連結能寫入 `en`（`persistLocale` 只以 `'zh-TW'` 呼叫，`useArrivals.ts:179`）。結果只是語言改變，頁面仍同源、已發布 |
| C-2 | 同 owner 的另一個靶場（舊版本，或塞滿 storage quota）改寫或卡住偏好 | T-0055 S-5、S-6、T-0054 S-4、OQ-018 | B3、B4 | 已反駁。同 origin 的靶場本來就能直接寫 `wxl-locale`，這條串連沒有比直接寫入更強；quota 塞滿時選擇記在分頁記憶體（D14），不會拋例外 |
| C-3 | 作者繞過 hook 放一份只有繁中的 brief：進英文清單與首頁冒充、改變排序、page mode 下複製出 `/zh-TW/` 網址給全班 | T-0057 S-2、S-3、S-4、S-5、S-11；完整性檢查 M6、B-b | B1、B4 | 已反駁。作者本來就能改英文 brief，權限沒有提升；每個效果都是已記錄的邊界情況。反駁理由需要更正，見下方 N-1 |
| C-4 | 作者控制的目錄名或檔名 → `_redirects` 規則、導向或切換器目標 | T-0056 S-1、S-2、S-3、S-4、T-0054 S-6、T-0055 S-1、S-10、T-0057 S-10、T-0053 S-5 | B2、B3 | 已反駁。切換器與導向目標都是清單項目，含 `//` 或 `\` 的路徑在 `pages.ts:64` 就被拒絕，再經 `router.go` 導覽（讀碼驗證）；`_redirects` 的目標前綴固定為站內路徑。親自查證：正式站的 `/en/c/%2F%2Fevil.example` 302 到同源的 `/challenge/%2F%2Fevil.example/`。結果是同源的壞連結，屬穩健度 |
| C-5 | 第三方連結帶格式錯誤的 hash → 導向或切換器的 `router.go` 被拒 | T-0053 S-6、T-0054 S-9、T-0055 S-2 | B2 | 已反駁。初次載入就由 VitePress 自己的 bootstrap 失敗，本 epic 的導向沒有機會執行；保留 hash 是既有、刻意的行為 |
| C-6 | 本機 build 或 Direct Upload 把 untracked 草稿放進清單與 `_redirects` | T-0057 S-5、T-0056 S-6、T-0056 Spec F7、T-0053 頁面清單、T-0054 S-7；完整性檢查 PC-3 | B1 | 已反駁。清單與建置發布的內容一致，hash map 本來就列出每個發布的頁面；這是受信任的老師自己部署了不乾淨的工作樹。`pnpm build` 會從工作樹重新產生 `_redirects`（讀碼驗證：`package.json:30`） |
| C-7 | gate 詢問期間的寫入與導覽：D17 的選擇、W2 先於 gate、只放行一次、導覽競速 | T-0055 S-3、S-7、S-8、T-0054 S-2、S-3、S-5、S-8、T-0053 S-4、S-4b | B5 | 已反駁。B5 只約束導向與那一行；選擇是學習者自己的動作（D17）；`wxl-locale` 依 `localStorageKeys.ts:135` 不受清除影響，是已接受的代價。gate 是通知，不是存取控制（ADR-0006） |
| C-8 | 題目 runtime 的刻意弱點 → 平台的語系路由 | T-0055 S-9、S-11、T-0057 S-7；完整性檢查 B-a | B0 | 已反駁。iframe 是 `sandbox="allow-scripts allow-forms"`，沒有 same-origin 與 top-navigation（讀碼驗證：`BrowserPanel.vue:484`）；iframe 的 message 解析成 Request 後只交給頁內 runtime 的 `dispatch`（`BrowserPanel.vue:103-104,375-418`、`ChallengeLayout.vue:149-157`），不會發到網路，也不驅動平台的 router；service worker 只攔截 `challenge-*.localhost`（`challenge-sw.js:13,202`）；平台不讀網址的 query 或 hash 來決定語系 |
| C-9 | 沒設 `SITE_ORIGIN` 的 fork 發出帶語系代碼、卻開到上游的連結 | T-0056 S-8、S-4、T-0057 S-10 | B3 | 已反駁。落在 B3 不保護欄（0007 D10）；語系代碼不改變這個既有代價 |
| C-10 | untracked 目錄名的控制字元經 W4 印到老師的終端機 | T-0056 S-5、S-6 | 老師的本機 | 已反駁。不在 B1–B5 之內；既有行為，T-0056 已記錄 |
| C-11 | （模型外，只做備註）共用電腦上前一位學習者的語言留給下一位 | T-0054 S-5、T-0055 S-3、S-5 | — | 依 ADR-0006，前一位學習者不是攻擊者；`wxl-locale` 不受清除影響是已接受的代價 |

完整性檢查另外查過兩條，確認不存在：導向迴圈（冷載入導向只對未加前綴的頁面執行，`i18n/index.ts:246`，而且只執行一次，`useArrivals.ts:121,134`；not-found 導向的目標一定是清單項目，chunk 沒載到就歸為 failed load，`arrival.ts:40`），以及 D14 的記憶值與 W2 寫入衝突（W2 在 mount 時由 `theme/index.ts:98,115` 呼叫 `recordColdLoad` 執行，`useArrivals.ts:175-180`；記憶值在重新載入後消失，`i18n/index.ts:161`）。

## 親自查證

| 檢查 | 指令 | 結果 | 影響 |
|---|---|---|---|
| 編碼斜線的別名路徑 | `curl -s -o /dev/null -w '%{http_code}' https://wxl.browserlab.online/zh-TW%2Fchallenges`，再讀 `<title>` | 200，`<html lang="zh-TW">`、`挑戰` | T-0054 S-1 與 C-1 在 Cloudflare 上可達：host 直接把它當成繁中清單頁送出。`/zh-TW_challenges` 的 HTTP 狀態是 404；client 端是否仍顯示繁中清單（T-0054 Spec F14）沒有在正式站觀察。仍在 B4 之內 |
| `:slug` 帶入點段 | `curl … /zh-TW/c/%2e%2e`；`node -e 'new URL(…)'` | 302 到 `/zh-TW/challenge/%2e%2e/`（親自查證）；Node 的 WHATWG `new URL` 把它正規化成 `/zh-TW/`，真實瀏覽器沒有實測（推論） | 依推論，PC-2 是 C-1 的另一個入口，仍同源、仍在 B4 之內 |
| 編碼的斜線與 host | `curl … /en/c/%2F%2Fevil.example`、`/zh-TW/c/..%2F..%2Fchallenges` | 302 到同源的 `/challenge/%2F%2Fevil.example/`、`/zh-TW/challenge/..%2F..%2Fchallenges/`，`new URL` 不改變它們 | C-4 的 `_redirects` 部分留在站內 |
| GitHub Pages 範本的部署 | 讀 `scripts/templates/deploy.yml.template:38-48,98-105` | 由 `v*` tag 與 `workflow_dispatch` 觸發，只跑 `pnpm build`，沒有測試步驟 | 見 N-1 |
| hook 何時安裝 | 讀 `package.json:41-44` | `prepare: simple-git-hooks`，只在 `pnpm install` 之後才裝上 | 見 N-1 |

## 完整性檢查補上的輸入

兩位 finder 的盤點漏了下列項目。補上之後，前述判定都不變。

- **M1** T-0053 第 6 階段 Spec F5（已修）：not-found 的 counterpart 不能仍在同一語系（`lookup.ts:14`）。
- **M2** T-0053 第 6 階段 Spec F3、F6、F13（已修）：那一行等落地頁的 gate、即將被導走的頁面不顯示、client 端導覽也會顯示。
- **M3** T-0054 第 6 階段 Spec F9、F10（已修）：F9，導向與那一行在 gate 放行時讀同一個儲存值；F10，gate 詢問期間，冷載入導向不套用到學習者自己點進的頁面。
- **M4** T-0055 第 6 階段 Spec F12、F13、Std F18／Spec F16（已修）：導向的 carry 還沒落地時做選擇、從被 gate 擋住的 not-found 頁 push、`rememberChoice` 在 SSR 時共用 module 狀態（現有 `typeof window` guard，`i18n/index.ts:269`）。
- **M5** T-0056 第 6 階段 Spec F12（已修）：工作樹不乾淨時兩個 CI oracle 的結論不一致。
- **M6** T-0057 第 6 階段 Std F11／Spec F9：page mode 下，英文清單的「只有繁中」條目有複製控制，複製出來的是 `/zh-TW/challenge/<slug>/` 網址（`ChallengeList.vue:114,466`、`shortLink.ts:123`）。這是 traceability 3.5 記錄的 E3 page mode 解讀；它讓 T-0057 S-4 從「點一下」變成「把網址發給全班」，併入 C-3。
- **M7** T-0054～T-0057 報告的「沒有涵蓋的範圍」：主機對 `%2F`、大小寫、`:slug` 擷取的實際行為。本分析以上表的 `curl` 補了一部分；GitHub Pages 上的對應行為仍未驗證。
- **M8** T-0057 S-1 只驗證 title、description、category、tags；`difficulty`、`date`、`id` 仍原樣跨樹進入兩份清單（`mergeChallenges.ts:44,50,52,72`）。沒找到會拋例外的讀取點；「Invalid Date 不會拋例外」是推論。
- **M9** 非安全項目：CI 的偶發逾時（`door-is-open` 的 challenge-verify、Windows 上 create-wxl 的 `bin.test.mjs`），見 T-0055 的落地紀錄與 T-0050。

## 交使用者的事項

沒有一項需要在宣告 epic 完成前開 ticket。依使用者 2026-11-06 的常設指示（之後的問題都照建議處理），處置如下：

| # | 事項 | 建議與處置 |
|---|---|---|
| N-1 | T-0057 S-3、S-4 與 C-3 的反駁理由寫「hook 與 CI 會擋下只有繁中的 brief」，但這個前提不完整。GitHub Pages 範本的部署只跑 `pnpm build`、不跑測試；hook 要在 `pnpm install` 之後才裝上，沒裝 hook 的 clone 裡 commit 不會經過它；在 GitHub 網頁介面 commit 也不會（這一項是推論）。結論不變：作者本來就能改內容。 | 在這份分析記錄正確的理由（就是本列）；per-ticket 報告維持原樣，作為當時的判斷 |
| N-2 | M8：`difficulty`、`date`、`id` 沒有型別檢查 | 只做記錄。沒有會拋例外的讀取點；之後碰到 `mergeChallenges.ts` 時順手處理 |
| N-3 | T-0056 S-1、S-4：`generate-redirects.ts` 不檢查 slug 文法；全數字的 slug 會被另一題的號碼規則遮蔽。S-2：不強制 500 題的上限 | S-1、S-4 開成 pending ticket T-0059；S-2 依 spec 0008 的 Out of Scope 維持只寫明、不強制，不開 ticket |
| N-4 | T-0056 的兩項 hook 既有問題與 S-5：只有 `git rm -r --cached` 時 stash 中斷；整棵樹 untracked 時 W4 不列出任何東西；W4 原樣印出目錄名的控制字元 | 開成 pending ticket T-0058 |
