# T-0036 安全審查（stage 7）

日期：2026-10-21（報告寫於 2026-10-22）
Ticket：T-0036「Off Cloudflare Pages, the copy control shows and copies the challenge page's URL」
結論：沒有成立的 finding。這份報告只說明檢查了什麼、怎麼判定，**不代表這個專案是安全的**。

## 範圍

- Epic base：`a54e917`（`a54e917d364e46049829552db45d150a8c19526c`）
- HEAD：`a54e917`。分支上只有 epic 的文件 commit，T-0036 的實作還沒 commit，審查對象是工作樹裡的待提交變更。
- 分支：`tickets/T-0036/copy-control-gives-page-url`
- Worktree：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0036`
- 審查的待提交檔案（`git status --short`）：
  - 修改：`.proj.tickets/0007-gh-pages-range-fixes/T-0036-copy-control-gives-page-url.md`、`.vitepress/challenge/shortLink.ts`、`.vitepress/config.mts`、`.vitepress/theme/components/ChallengeList.vue`、`.vitepress/theme/components/MergedNav.vue`、`.vitepress/theme/components/ShortLinkShare.vue`、`.vitepress/theme/layouts/ChallengeLayout.vue`、`env.d.ts`、`tests/site-smoke/site-smoke.spec.ts`、`tests/unit/components/ChallengeList.test.ts`、`tests/unit/components/MergedNav.test.ts`、`tests/unit/components/ShortLinkShare.test.ts`、`tests/unit/layouts/ChallengeLayout.test.ts`、`tests/unit/site/config-base.test.ts`
  - 新增：`.vitepress/theme/linkMode.ts`、`tests/unit/challenge/shortLink.test.ts`、`tests/unit/components/ShortLinkShare.mode-default.test.ts`
- 信任邊界：依 `spec.en.md` revision 3 的 B1–B5（第 174–178 行）。本 ticket 主要碰到 B1（建置環境 → 網站）與 B4（網站 → 學習者的螢幕與剪貼簿）。
- 刻意的教學漏洞：依 ADR-0005 不算 finding。本 ticket 沒有改到任何題目，所以沒有用到這條排除規則。

## 流程

1. 一位 reviewer 讀過 diff，提出 3 個候選。
2. 每個候選交給 3 位獨立的 skeptic 嘗試推翻。至少 2 位認定成立才算 confirmed。
3. 結果：3 個候選都是 0 / 3，全部駁回，所以沒有要修的安全項目。

## 候選與處置

### S-1：smoke 測試讀寫開發者機器上的真實剪貼簿，失敗時可能把原有剪貼簿內容印進 log

- 位置：
  - `tests/site-smoke/site-smoke.spec.ts:146`：`real(text)`
  - `tests/site-smoke/site-smoke.spec.ts:451`：`grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4173' })`
  - `tests/site-smoke/site-smoke.spec.ts:457`、`:460`、`:470`、`:472`
  - 以上行號已依 2026-10-22 的兩輪修正更新（stage 7 審查時是 `:308`、`:314`、`:317`、`:327`、`:329`；第一輪插入 `expectStatusWhole` 後整段往後移 26 行，第二輪加強 `expectStatusWhole`、抽出 `reloadCompleted` 並新增收合題目的導覽列測試後，再往後移 117 行，內容沒變）
  - `playwright.site.config.ts:43`（`headless: true`）、`:54`（`reuseExistingServer: !process.env.CI`）
- 類別：資料外洩（本機剪貼簿 → 測試 log）
- 嚴重度：低。交給我的紀錄裡沒有 reviewer 原本的評等；skeptics 認為就算成立，殘餘風險也在 P2 以下。
- 信心：reviewer 自評 low。
- 攻擊者前提：沒有攻擊者能控制的輸入。只有兩種情況可能出問題：開發者自己用 headed 模式或 `channel: 'chrome'` 跑 smoke；或者 4173 port 上有一個不明的 server 被沿用。
- 資料流：測試頁的 `writeText` 寫進剪貼簿 → `navigator.clipboard.readText()` 讀回 → `expect.poll(...).toBe(...)` 失敗時，把 `Received:` 印到執行者的終端機。
- 影響：reviewer 推論，失敗訊息可能印出開發者原本複製的內容（例如密碼），但 reviewer 沒有驗證。
- 證據：reviewer 讀程式碼後推論，沒有實際執行。
- 建議修正：改用測試自己的剪貼簿替身，或限制只能在 CI 跑。
- 處置：**駁回（skeptics 0 / 3）**。理由：
  1. 這組設定是 headless Chromium，沒有指定 `channel`。skeptics 依他們對 Chromium 的了解，認為它用的是行程內的記憶體剪貼簿，不會碰 macOS 的系統 pasteboard。這點三位都沒有實測。
  2. 每個案例都在新的 browser context 裡先寫入、再讀回，所以讀到的只會是測試自己剛寫進去的公開題目頁網址。
  3. `reuseExistingServer` 是既有設定，這次 diff 沒有改它。`grantPermissions` 只作用於 Playwright 自己開的隔離 context。能占用 4173 port 的程式本來就已經在本機執行，不需要靠這個授權。
  4. 這件事不在 B1–B5 任何一個邊界內，追不到「攻擊者控制 → 可觀察的影響」這條路徑。Charter 的「學習者的作品留在學習者機器上」說的是學習者資料存放的位置，不適用於這個情況。
  - 殘留的不確定：skeptics 提出一個可行的驗證方式：先 `pbcopy` 一個哨兵值，再跑 `CI=1 pnpm test:smoke -g "what is copied"`，最後用 `pbpaste` 檢查哨兵值還在不在。stage 6/7 沒有執行這個驗證。

### S-2：ticket 紀錄的清理指令會 `kill -9` 任何在 4173 監聽的程序，包含其他 worktree 的 preview server

- 位置：`.proj.tickets/0007-gh-pages-range-fixes/T-0036-copy-control-gives-page-url.md:228`（stage 6 補寫紀錄後的行號；stage 5 時是第 201 行）。同一個指令在 `docs/agents/platform-notes.md:24` 本來就有。
- 類別：作業安全（本機程序管理）
- 嚴重度：低。原評等不在交給我的紀錄中。
- 信心：未提供。
- 攻擊者前提：沒有攻擊者。前提是維護者或 agent 照著紀錄重跑這個指令，而當時剛好有其他 worktree 的 server 在 4173 監聽。
- 資料流：無。這是本機 shell 指令，不會跟著網站部署。
- 影響：可能中斷其他 worktree 正在用的 preview server。
- 證據：讀 ticket 紀錄。
- 建議修正：只終止本 worktree 自己啟動的程序，或改用 `platform-notes.md` 的方式。
- 處置：**駁回（skeptics 0 / 3）**。理由：
  1. 這個指令和 `docs/agents/platform-notes.md:22-24` 既有的專案標準清理方式逐字相同，不是這次變更新增的。所以建議中的「改用 platform-notes.md 的方式」本身就不成立。
  2. 那一行是用過去式記錄當時做了什麼，不是哪個驗證主張的重現指令。
  3. 它不在 B1–B5 之內，也沒有攻擊者能控制的資料流。如果要調整這個清理方式，應該另開 ticket 改 `platform-notes.md`。

### S-3：page mode 下，沒跑 fork:init 的 fork 在 GitHub Pages 上複製出的題目頁網址指向 upstream（spec 已接受的殘餘風險）

- 位置：`.vitepress/challenge/shortLink.ts:37`（`SITE_ORIGIN`）、`:113`（slug 不符合 `SLUG_GRAMMAR` 時回傳 null）、`:114`（page URL 的組法）
- 類別：設定錯誤導致導向他站（open redirect 類，但沒有外部輸入）
- 嚴重度：低。reviewer 註明只是為了涵蓋完整而列出。
- 信心：reviewer 自評 medium。
- 攻擊者前提：沒有攻擊者。前提是教師自己沒跑 `pnpm fork:init`、只跑了 `--base`，或用 rebrand 模式卻沒改常數。
- 資料流：原始碼常數 `SITE_ORIGIN` → `challengeLink` 的 page 分支，把 origin 原樣接上 `/challenge/<slug>/` → Vue 的文字與屬性 binding（會跳脫）→ 畫面與剪貼簿。
- 影響：學生打開的是 upstream 的題目頁，作答紀錄存在 upstream origin 的 IndexedDB 裡。紀錄仍在學生自己的瀏覽器，沒有外洩給第三方。
- 證據：讀程式碼與 spec。
- 建議修正：在 build 時警告 `SITE_ORIGIN` 和 site base 不一致。
- 處置：**駁回（skeptics 0 / 3）**。理由：
  1. `spec.en.md:177` B4 的「Does not protect」欄已經明確列出這個情況。
  2. 建議中的 build 檢查（D10），spec 的 Out of scope 已明確排除（`spec.en.md:343`）。
  3. 在 `a54e917`，短連結同樣用 `SITE_ORIGIN`，所以不是這次變更新出現的可達路徑。
  4. `SITE_ORIGIN` 只有教師能改；slug 受 `SLUG_GRAMMAR` 限制；顯示時經過 Vue 跳脫。沒有學習者輸入，也沒有新的 request。

## 相關的已驗證事實（不屬於候選，但支撐 B1 的判定）

- page mode 的建置產物裡沒有 `__WXL_SHORT_LINKS__` 識別字：`env -u CF_PAGES pnpm docs:build` 之後，`grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` 印出 `0`（stage 6 重跑）。所以在執行期設定 `window.__WXL_SHORT_LINKS__` 切換不了模式；smoke 的 S09 也驗證了這點。
- `CI=1 pnpm test:smoke` → 48 passed（stage 6 重跑）。

## Reviewer 自述的涵蓋限制

以下照錄 reviewer 的原文：

> 我沒有執行任何指令，也沒有重現任何問題，所有結論都來自讀程式碼；特別是 headless Chromium 在 macOS 是否共用系統剪貼簿，我沒有驗證。
>
> 未涵蓋的部分：
> - 相依套件掃描（新增 import 只有 node:fs 與既有套件，沒有新相依）
> - 可用性與 rate limiting
> - 低嚴重度的 hardening
> - built bundle 的實際內容：我沒有讀 .vitepress/dist，只採信 packet 中「grep 不到 __WXL_SHORT_LINKS__」的說法
> - 跨 ticket 的串連分析（T-0030 到 T-0032、T-0037），這是 epic close-out 的工作
>
> 依指示，我沒有判定自己的候選是否為 false positive，這交給獨立 reviewer。

補充：上面「built bundle」那一項，stage 6 已重跑上述 grep 確認（結果為 `0`）。不過這只確認了那個識別字不存在，沒有對 bundle 做其他安全檢查。

## 2026-10-22 補記：stage 8 之後的修正

stage 8（V02）發現 375 寬時複製狀態文字被擠到看不清楚，修正內容如下，這裡記錄它對本報告的影響：

- `.vitepress/theme/components/ShortLinkShare.vue`：新增一個 `confirmed` ref，狀態文字的 class 依它在兩組固定字串之間切換（`'shrink-0 whitespace-nowrap'` 或 `'min-w-0 whitespace-normal'`）。class 是原始碼裡的字面值，不含任何來自頁面、網址或使用者的資料；狀態文字仍然只來自 `short_link.copied`／`short_link.copy_failed` 這兩個 message key，並經過 Vue 跳脫。
- `tests/site-smoke/site-smoke.spec.ts`：新增 `expectStatusWhole`，只讀取狀態文字的版面尺寸，不碰剪貼簿。
- 沒有新增相依套件、request、儲存位置或信任邊界；B1–B5 的判定不變。S-1 引用的行號已更新（內容不變），S-2、S-3 不受影響。
- 這次沒有重新跑 reviewer 與 skeptic 的流程，只由修正者對照上面的 diff 確認影響範圍。因為實作還沒 commit，沒有 stage 7 版本可以直接 diff；相對 stage 7，`ShortLinkShare.vue` 多出的只有 `grep -n 'confirmed' .vitepress/theme/components/ShortLinkShare.vue` 列出的幾行與狀態文字上方的註解。`git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0`。

## 2026-10-22 補記：第二輪修正

stage 6–8 之後的第二輪 review 確認了三項問題（見 ticket 的「fixes after stage 6–8」），修正內容對本報告的影響如下：

- `.vitepress/theme/components/MergedNav.vue`：手機版第二列的 📖 題目切換按鈕加上 `shrink-0 whitespace-nowrap`，並在上方加一段註解。class 是原始碼裡的字面值，按鈕文字仍只來自 `merged_nav.description_toggle_label`。
- `.vitepress/theme/components/ShortLinkShare.vue`：只改了狀態文字上方的註解，程式碼沒變。
- `tests/site-smoke/site-smoke.spec.ts`：`expectStatusWhole` 多讀狀態文字的外框、祖先元素的 overflow 與 `elementFromPoint`；新增的 `expectRowItemsWhole` 只讀第二列各項目的外框；`reloadCompleted` 是把原本寫入進度紀錄的程式碼原封不動抽成函式。新增的收合題目測試沿用 `resolve`／`reject` 兩種假剪貼簿，不讀寫真實剪貼簿，所以 S-1 的範圍不變，只有行號移動。
- 沒有新增相依套件、request、儲存位置或信任邊界；B1–B5 的判定不變，S-2、S-3 不受影響。這次同樣沒有重新跑 reviewer 與 skeptic 的流程。`git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0`。
