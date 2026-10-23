---
synced_from: spec.en.md
synced_from_sha: 0700a2b7f9c68a1539e6d9d179537a27c3adc6d6
---

# Spec 0007：GitHub Pages 靶場修正——會自己跟上的 `_redirects`，以及打得開的連結

狀態：第 3 版（2026-10-21）。第 1、2 輪對抗式審查都沒有發現 P0（`review/round-1.md`、`review/round-2.md`），
因此第 3 階段的關卡已通過。第 3 版套用第 2 輪的處置（`review/disposition-2.md`）與使用者的裁決 D12–D15。
審查上限是兩輪，所以第 3 版只自審，不再送審（D15）。第 3.1 版（2026-10-24）新增 D16，
寫明 T-0034 審查時實測到的兩種 O7 結束方式。本檔由英文版翻譯，以英文版為準。本文衍生自
`traceability.md`，其中保存：

- 決策（S8、Q4–Q11、Q33、D1–D16）；
- seam 0007-S1 到 S8；
- 詞彙表與模式規則；
- 連結形式與範例 X1–X6；
- 規範句 E1、Z1、E2、Z2，以及它們的 sentence map 與比對規則；
- 要改寫的段落 P1–P8，以及訊息 W1–W9；
- hook 的觸發條件、commit 形式規則、約束與結果 O1–O7；
- M、L、N、S、C、H、G、F、T、V 各列。

第 1 階段的紀錄在本機研究筆記 `.proj.research/2026-10-18-dev-image-gh-pages-grill.md`。

## 問題陳述

在 2026-10-17 的工作坊，部署到 GitHub Pages 的老師遇到兩個問題。

第一，老師新增一道題目、push 上去，CI 就失敗了。`platform/public/_redirects` 由題目產生並 commit
進 repo，CI 會檢查 commit 進去的檔案和題目是否一致。可是只有 `pnpm dev` 與 `pnpm build` 會重新產生
它：`pnpm create:challenge` 不會，commit 也不會。文件叫老師不要手改這個檔，卻沒有一處說它必須跟題目
一起 commit，而 GitHub Pages 靶場根本不讀它。翻譯說明頁、刪除題目或改名題目也都會改到這個檔，結果
一樣。

第二，每道題目旁的複製按鈕給的是短連結（`/c/001`）。短連結是 `_redirects` 裡的規則，只有 Cloudflare
Pages 讀這個檔，所以在 GitHub Pages 靶場上，老師發出去的連結會連到 404。按鈕無從得知自己跑在哪個主機上。

## 解法

`_redirects` 會自己跟上。`pnpm create:challenge` 在 keygen 之後馬上重新產生它。只要一個 commit 帶有
任一語系題目的變更，或帶有這個檔本身的變更，pre-commit hook 就會重新產生並 stage 它。無論哪條路，
commit 都會帶著 CI 期望的檔，老師不必知道這個檔存在，CI 也會通過。老師其他尚未 commit 的工作會維持
原狀；hook 若無法放回，就保留在一個 stash entry 裡，並印出它的 id。如果一個 commit 會讓某個繁中說明頁
失去對應的英文題目，hook 會拒絕並說明原因，因為 CI 反正會讓它失敗。sentence map 裡的每個檔，對
`_redirects` 都說同一句話，包括過期時怎麼修復。

複製控制項跟著建置走。Cloudflare Pages 建置網站時（`CF_PAGES=1`），它照舊顯示並複製短連結。其他任何
建置都顯示並複製題目頁的網址（`https://<owner>.github.io/<repo>/zh-TW/challenge/<slug>/`），靜態主機
不需要轉址規則就能提供它。放不下的網址會用省略號截斷，但不會窄於六個字元，滑鼠停留時顯示全文。直接
點一下就會選取它，方便手動複製。不需要任何設定，也不記錄任何東西：既有靶場升級就會拿到這些修正。CI
guard、部署方式，以及 commit `_redirects` 的決定，都不變。

有兩個限制仍在。第一，題目頁網址只有在 `SITE_ORIGIN` 指向靶場的真實網址時才打得開。第二，網站既有的
語系轉址會把沒有儲存偏好的學習者，從英文頁導到對應的繁中頁；沒有繁中說明頁的題目沒有這一頁
（OQ-023）。

## 使用者故事

1. 作為 GitHub Pages 靶場的老師，我想新增一道題目並 push 上去而 CI 不會失敗，這樣我不必認識 `_redirects` 也能發布題目。
2. 作為老師，我想讓翻譯說明頁、刪除、改名或下架的題目，跟對應的 `_redirects` 一起 commit，這樣每一種題目變更都能通過 CI。
3. 作為老師，我想在 commit 之後，尚未 commit 的修改與新檔案都維持原狀，這樣 commit 這一步永遠不會讓我損失工作。
4. 作為老師，我想在 `_redirects` 無法重新產生、或 CI 會拒絕這棵題目樹時，commit 被拒絕並附上原因，這樣我能在 CI 替我發現之前先修好。
5. 作為 GitHub Pages 靶場的老師，我想讓複製按鈕給出題目頁的網址，這樣我發給班上的連結不依賴主機會忽略的轉址規則。
6. 作為 Cloudflare Pages 靶場的老師，我想讓短連結維持不變，這樣我的講義在題目改名後仍然有效。
7. 作為老師，我想讓畫面上的網址就是會被複製的那一個，而且在手機上看得清楚、不會擠掉題目標題，這樣複製失敗時我可以手動選取它。
8. 作為老師，我想讓文件與 skill 對 `_redirects`、以及複製按鈕給的是什麼，說法一致，這樣我知道要 commit 什麼、過期時怎麼修，以及改名會弄壞什麼。
9. 作為擁有既有靶場的老師，我想讓這些修正隨升級而來、不需要新設定，這樣我什麼都不用重新設定。
10. 作為上游，我想在真實的 GitHub Pages 靶場上重跑老師原本的情境，這樣修正就在問題出現的地方得到證明。

## 實作決策

- **連結模式。** 網站設定在建置時讀一次 `CF_PAGES`，交給網站 bundle 一個編譯期常數
  `__WXL_SHORT_LINKS__`。它和設定裡其他 flag 的定義方式相同：只有確切字串 `1` 時是原始碼文字
  `true`，其餘是 `false`（模式規則）。控制項透過一個小模組讀取模式，元件測試以 `vi.mock` 取代它。這個
  模組把未定義的常數（例如在 vitest 底下）當成 page mode。在建置中，常數於編譯期被替換，所以執行期
  設定的任何東西都改不了模式（S09），伺服器產生的 HTML 與 hydrate 後的頁面也一致。網站的 base 與 head
  連結不依賴它。
- **連結 helper。** `.vitepress/challenge/shortLink.ts` 新增一個純函式 helper，依模式、號碼、slug、
  語系與 origin，回傳複製出的網址與顯示文字，或回傳 none（連結形式）。它收 number，原樣接在 origin
  後面，不做正規化。既有的短連結 helper 行為不變。這個模組不引用該常數，因為建置腳本會在 Node 底下經由
  `challenge-numbers.ts` 匯入它，而那裡不存在這個常數。fork:init 在這個檔與 `config.mts` 的定位行仍各
  只有一行。
- **複製控制項。** `ShortLinkShare` 在 `number`、`locale` 之外新增 `slug` prop。
  - 沒有有效號碼時不顯示；在 page mode，slug 不符合 slug 文法時也不顯示。字串號碼照舊先以 `Number()`
    轉換。
  - 網址文字是一個不換行的非 inline 方塊。放不下時以省略號截斷，寬度不小於它的 6ch 寬度（D14），並以
    複製出的網址作為 `title`。
  - 在它上面不按修飾鍵的主要按鍵點擊，會阻止預設動作並選取全部文字，所以在列表的整列連結裡，它不再
    開啟題目（D4）。按著 Ctrl、Meta、Shift 或 Alt 的點擊交給瀏覽器處理（L21）。列表其他地方照樣開啟
    題目。
  - 狀態文字可以換行，讓 `short_link.copy_failed` 既不會撐寬這一列，也不會把網址文字擠到最小寬度以下。
  - 兩個地方用同一份 markup（D2）。所有介面字串與 message key 不變，元件名稱也不變。
- **呼叫端。** `ChallengeList` 傳入每一列的 slug，也就是列路徑的最後一段，與 `slugOf` 今天的推導方式
  相同。`MergedNav` 新增 `slug` prop，由 `ChallengeLayout` 從頁面取得並與 `number` 一起提供，再傳給桌面
  版與手機版兩個控制項。在導覽列裡，網址文字先讓出寬度，標題後讓，直到網址文字的最小寬度（D7、D14）。
  狀態顯示時，手機版那一列可以變高。題目頁網址是 `SITE_ORIGIN` 接上頁面在網站內的路徑，不另加 base，
  因為 fork:init 推導出的 origin 已經帶有 GitHub Pages 專案網站的路徑。
- **create:challenge。** 腳本新增一個匯出的進入點，接收 argv、`root` 與一個 keygen 執行器，回傳結束
  狀態。CLI 的 guard 以 repository 根目錄與 `pnpm challenge:keygen <slug>` 呼叫它。keygen 成功後，它以
  `writeRedirects` 對整個工作樹重寫 `platform/public/_redirects`，與 `pnpm dev`、`pnpm build` 相同，並在
  輸出中指名這個檔。結束狀態：
  - 參數錯誤或名稱衝突：狀態 1，在寫入任何檔案之前。
  - 骨架寫好之後 keygen 失敗：狀態 3（D13），附 W2。`_redirects` 不動，骨架留著。
  - keygen 成功之後重新產生失敗，原因是產生器拒絕這棵樹或寫檔失敗：狀態 2（D8），附 W1。W1 說明題目
    已建立，以及 commit 時會依 staged 的內容重新產生 `_redirects`。`_redirects` 與骨架都維持原樣。
- **pre-commit hook。** `scripts/pre-commit.sh` 在監看路徑有任何 staged 變更時觸發：`platform/challenge/`、
  `platform/zh-TW/challenge/` 或 `platform/public/_redirects`（D5）。
  - **commit 形式。** 它以 `GIT_INDEX_FILE` 分辨自己的 index 與其他 index。在自己的 index 上，套用各個
    結果；在其他 index 上（例如 `git commit <pathspec>` 用的那種），只要觸發就以 W8 拒絕。
  - **驗證**仍只涵蓋今天 `ACMRD` 篩選選出的 staged `platform/challenge/` 路徑，而且只在至少有一條時才
    執行。hook 在 macOS 的 `/bin/bash` 3.2 底下也能運作。
  - **孤兒說明頁**：staged 快照裡有孤兒說明頁時，在產生之前就以 W6 拒絕（D12）。
  - **stash** 永遠不放 `_redirects`。只有 `platform/` 底下還有其他 unstaged 或未追蹤的東西時，hook 才會
    stash，而且只把 `refs/stash` 新增的那個 entry 當成自己的。每次結束，包括被中斷與 git 指令失敗，
    它都會還原那個 entry，並且只在還原完成後才 drop。還原失敗時，它保留 entry，並以 W9 印出它的 id（O7）。
  - **重新產生**在驗證通過之後執行。hook 以每棵樹各自的 index slugs，對 staged 快照產生，所以被忽略與
    未追蹤的目錄都不會算進去。它以自己 repository 的頂層作為 root，再寫入並 stage `_redirects`。
  - **結果 O1–O7** 涵蓋矩陣測到的所有結束方式。成功之後，工作樹的 `_redirects` 等於 staged 的版本
    （D3）；hook 換掉老師自己做的版本時，W3 會指名這個檔。失敗之後，index 與工作樹都維持原狀。第一個
    commit 若有 unstaged 的檔案，hook 以 W7 拒絕。
- **wxl-create。** 四份 skill 檔（兩棵樹、兩種語言）的 Step 2 依 P7 對結束狀態分支：
  - exit status 2：轉述 W1，繼續到 Step 3。
  - exit status 3：轉述 W2，然後停下來。
  - 只有 exit status 1 才重問名稱，選單選項用文字。
- **產生器 header 與文件。** `generateRedirects` 的 header 帶有 E1，commit 進去的 `_redirects` 在同一個
  commit 重新產生。`includeSlug` 會多收到頁面的語系；guard 只傳一個參數的呼叫方式不變。sentence map 的
  每個檔都帶有它的句子：
  - E1 或 Z1 說明 `_redirects` 是什麼、怎麼修復。
  - E2 或 Z2 說明複製按鈕給的是什麼、改名會弄壞什麼，以及只有 `SITE_ORIGIN` 是靶場網址時才開得到這個
    靶場。

  P1–P8 依段落表的要求改寫，包括：
  - README 的說明與 wxl-fork-init 的段落；
  - 每一處把 `SITE_ORIGIN` 或 `--origin` 說成只是短連結 origin 的文字，分布在兩份 README、wxl-fork-init
    skill、fork:init 的註解與警告，以及 create-wxl 的摘要行；
  - D2、D4、D7、D14 推翻的元件註解；
  - hook 與產生器的註解；
  - GLOSSARY 的兩句話。

  兩份 wxl-fork-init 檔仍以繁體中文為語言。
- **不變的部分。** guard test、它的納入規則，以及執行它的 CI 步驟；部署範本；fork:init 的行為；
  `range.json`；`SITE_ORIGIN` 的文法；列表的 `#NNN` 徽章與格狀檢視；commit `_redirects` 的決定；語系轉址
  （OQ-023）；validator 的篩選條件。
- **GLOSSARY。** 除了第 1 階段的四處修改之外不新增詞條，這四處隨本 epic 一起進版本控制：`article` 詞條、
  老師與上游的 `_Avoid_` 行，以及短連結詞條裡說明複製按鈕給什麼的那句，那句和 Z2 一樣稱為「題目頁的
  網址」。P8 改寫兩句既有的話。spec 英文版對複製出的完整網址一律稱為「page URL」。

## 信任邊界與威脅模型

| # | 邊界 | 保護什麼 | 不保護什麼 | 模型之外 |
|---|---|---|---|---|
| B1 | 建置環境 → 建好的網站（`CF_PAGES`） | 只有確切值 `1` 會選擇短連結。其他每一種建置都給題目頁網址，不需要轉址規則。這個選擇在建置時固定，所以送出的 HTML 與 hydrate 後的頁面一致，執行期設定的東西也切換不了它（S09） | 在 Cloudflare Pages 之外手動設定 `CF_PAGES=1` 的建置，會送出只在讀 `_redirects` 的地方才有效的短連結。`SITE_ORIGIN` 仍指向別的主機的 Cloudflare 建置（GitHub Pages 靶場搬到 Cloudflare 卻沒有重跑 fork:init），會送出指向那個主機的短連結。preview 部署的短連結指向正式站。Cloudflare Direct Upload 或 Workers 建置會送出題目頁網址（Q8，已接受） | Cloudflare 的建置平台本身 |
| B2 | pre-commit hook → 老師的 index 與工作樹 | 結果 O1–O7 與 hook 的約束。hook 只 stage `platform/public/_redirects`，而且只依 staged 快照與 index slugs 推導。它把 `platform/` 底下其他每一個 unstaged 變更與未追蹤檔案逐 byte 還原；或者把它們保留在自己的 stash entry 裡，並印出 entry 的 id（O7）。它從不 apply 或 drop 別的 entry。第一個 commit 有 unstaged 檔案、在別的 index 上、或遇到孤兒說明頁時，它拒絕而不猜測。它不寫 `platform/` 以外的工作樹檔案，也不寫別的 repository 的檔案 | `--no-verify`、`pnpm install` 從沒裝過 hook 的 clone，或跳過 hook、沒有 Node 的 git 工具。git 不跑 pre-commit 就建立的 commit：git 自行完成的 merge、`cherry-pick`、`revert`、`rebase`、`am`，以及 GitHub 網頁介面。這些情況留下的過期檔由 B3 抓到。unstaged 的 `_redirects` 會被取代（D3），並附 W3。`platform/` 底下的空目錄不會還原。symbolic link 會被跟隨。產生器腳本從工作樹執行，所以它們 unstaged 的修改會生效 | commit 期間另一個行程改動 repository，包括同一個 repository 另一個 worktree 裡的 commit。SIGKILL 與斷電 |
| B3 | CI guard test → merge 與部署 | 不變：它在每個靶場、每種主機上執行，本 epic 既不跳過也不削弱它（Q9） | 老師自己改過 CI 設定的靶場 | — |
| B4 | 建好的網站 → 學習者的螢幕與剪貼簿 | 文字只來自 `SITE_ORIGIN`、補零的號碼，以及符合 slug 文法的 slug，經由 Vue 會跳脫的文字與屬性綁定輸出。`SITE_ORIGIN` 由 fork:init 設定，或依 wxl-fork-init skill 的說明手改。不涉及學習者輸入，也沒有新的請求 | `SITE_ORIGIN` 沒有指向靶場真實網址時，連結打不開，或開到它所指的網站（D10）。fork 從沒跑過 fork:init、只帶 `--base` 跑過、或用 rebrand 模式跑過卻沒有手改這個常數時，會保留上游的 origin。這時連結會開到上游的網站，學習者的紀錄也存在上游的 origin 底下。repository 改名、自訂網域卻沒帶 `--origin`，以及手改時多了結尾斜線，也都會讓連結壞掉。沒有儲存偏好的學習者，會從英文題目頁網址被導到繁中頁，而那一頁可能不存在（D6、OQ-023） | — |
| B5 | `create:challenge` → 老師的工作樹 | 除了既有的檔案，它只寫 `_redirects`。產生器在寫入之前就拒絕不一致的樹，並有自己的狀態（2）；keygen 失敗也有自己的狀態（3） | 與產生內容不同的 `_redirects` bytes 會被取代（C08） | — |

沒有動到任何題目刻意設計的漏洞，所以不適用 ADR-0005。

## 驗收標準

- **AC-1** 以 `CF_PAGES` = `1` 匯入時，網站設定的 `__WXL_SHORT_LINKS__` 是字串 `'true'`。未設定、空字串、`0`、`true`、` 1` 與 `1 ` 都得到 `'false'`。不論 `CF_PAGES` 是什麼，`base` 與 `head` 都完全照 `config-base.test.ts` 的斷言跟著 `SITE_BASE`。常數未定義時，控制項是 page mode。（M01–M04、L19）
- **AC-2** 在 short mode，helper 與控制項給出 X1 與 X2，把 42 補成 `042`，1234 不變，而且不需要 slug。（L01–L03）
- **AC-3** 在 page mode，helper 給出的正好是 X3、X4、X5；控制項以真實的 `SITE_ORIGIN` 給出相同結果，並跟著頁面語系。origin 的路徑保留，不加 base。（L04–L07）
- **AC-4** 兩種模式下，網址文字的 `title` 都是複製出的網址。（L08）
- **AC-5** 什麼情況不給任何東西：
  - 號碼缺少、`null`、`0`、`-1`、`1.5`、`""` 或 `"abc"` 時，兩種模式的控制項都不顯示。字串照舊先以 `Number()` 轉換，所以 `"7"` 顯示為 7。
  - 號碼為 undefined、`0`、`-1` 或 `1.5` 時，helper 回傳 none。
  - 在 page mode，slug 缺少、空字串或不符合 slug 文法（`My Chall`、`a_b`、`-a`）時，兩者都不給任何東西。
  - 在 short mode，缺少 slug 仍顯示短連結。（L09–L11、L16、L20）
- **AC-6** 兩種模式下：
  - 複製成功時顯示 `short_link.copied`，fake timer 經過 2000 ms 後狀態恢復為空。
  - 複製被拒絕或沒有剪貼簿時，顯示 `short_link.copy_failed`，fake timer 經過 2000 ms 後仍然顯示。沒有任何 rejection 漏出去。
  - 按鈕的標籤是 `short_link.copy_label`。它的 click 事件設了 `defaultPrevented`，外層的 anchor 不會導頁。
  - 每個字串都跟著頁面語系。stage 6 對照 diff 確認沒有新增、移除或修改任何 message key。（L12–L15、L18）
- **AC-7** 這些控制項會傳入題目的號碼、slug 與頁面語系：
  - 列表檢視中，英文與繁中列表每一列的控制項；
  - 英文與繁中題目頁上導覽列的兩個控制項。

  格狀檢視沒有控制項。在 page mode，複製出的網址等於連結形式的題目頁網址，其中 s 是列的 slug 或導覽列的 `slug`。不論 fixture 路徑有沒有結尾斜線、`withBase` 是否加上 `/my-range/`，都成立。在建好的兩種語言 `selected-excerpts` 頁面上，導覽列複製出的網址就是該頁的題目頁網址。列表的 `#NNN` 徽章在兩種模式下都不變。（N01–N07）
- **AC-8** 互動與版面：
  - 在網址文字上不按修飾鍵的主要按鍵 click 事件，設了 `defaultPrevented`，也不會執行複製的處理函式。按著 Ctrl、Meta、Shift 或 Alt 的點擊則沒有設。
  - 建好的網站以 page mode 檢查兩個列表與兩個 `selected-excerpts` 頁面，viewport 為 360×740、375×812、768×1024、1024×768 與 1280×800。每個 viewport 都檢查每一種狀態：靜止、顯示 `short_link.copied` 時、顯示 `short_link.copy_failed` 時，以及題目頁上題目已完成時。
  - 文件永遠不會橫向捲動。
  - 每個顯示中的網址文字，computed `display` 都不是 `inline`，並且是 `white-space: nowrap`、`overflow: hidden` 與 `text-overflow: ellipsis`。它的 `clientWidth` 至少是它的 6ch 寬度減 1 px。溢出時，內容仍是完整的顯示文字，`title` 是複製出的網址。
  - 在列表第一列與導覽列上，靜止時與顯示 `short_link.copy_failed` 時，直接點它一下，會選取全部顯示文字，頁面網址不變。點列表那一列的其他地方，會開啟那道題目。
  - 在導覽列，標題被截斷的地方，顯示中的網址文字 `clientWidth` 至多是它的 6ch 寬度加 1 px。
  - 僅上游：在 375×812，繁中 `selected-excerpts` 導覽列的網址文字會溢出。（L17、L21、S01–S03、S06–S08、S10）
- **AC-9** 在 AC-8 的每個頁面上：
  - 送出的 HTML 裡、腳本執行前的每一個網址文字，都等於它 hydrate 之後的文字。
  - 在任何頁面腳本之前設定 `window.__WXL_SHORT_LINKS__ = true`，它仍是題目頁網址。
  - 在每個語系，按下某一列與導覽列的複製按鈕，剪貼簿裡就是那道題目的題目頁網址。（S04、S05、S09）
- **AC-10** keygen 成功時，執行之後 root 的 `platform/public/_redirects` 等於 `generateRedirects(root)`，並含有新號碼指向 `/challenge/<slug>/` 的 `/c/NNN` 規則。即使這個檔原本的 bytes 和產生內容不同，也成立。stdout 含有 `platform/public/_redirects`，狀態為 0。（C01、C02、C08）
- **AC-11** `create:challenge` 失敗的情況：
  - 參數錯誤或 slug 已存在：在寫入任何檔案之前以狀態 1 結束。
  - keygen 失敗：以狀態 3 結束（D13）。stderr 含有 W2，`_redirects` 與之前逐 byte 相同，骨架留著。
  - keygen 之後重新產生失敗：以狀態 2 結束（D8），stderr 含有 W1。情況有：
    - 兩道題目用同一個號碼；
    - 一個題目目錄的 `index.md` 沒有號碼；
    - 繁中說明頁的號碼不同；
    - `_redirects` 無法寫入。

    每種情況骨架都留著。產生器拒絕時，`_redirects` 與之前逐 byte 相同。（C03–C07、C09）
- **AC-12** 下列每一種情況，hook 都以 O2 結束，並 stage staged 快照的期望 `_redirects`：
  - 新題目：檔案多了它的 `/c/NNN` 規則，而且不印 W3。
  - 繁中說明頁：多了 `/zh/c/NNN` 規則。
  - 兩個目錄都刪除：兩條規則都消失。
  - 兩個目錄都改名：規則指向新的 slug。
  - 下架題目，並在同一個 commit 刪除它的繁中說明頁：兩條規則都消失。
  - 只刪除繁中說明頁：`/zh/c/NNN` 規則消失。
  - 取消下架：規則回來。
  - 只改應用程式、改成內容相同的 symbolic link（型別變更），以及已追蹤頁面上 unstaged 的號碼修改：維持 `HEAD` 的 bytes。
  - 手改過的 staged `_redirects`，單獨或與其他變更一起：換成期望的檔，並印 W3。它是唯一變更時，git 仍然記錄這個 commit，而這個 commit 沒有任何變更。
  - 沒有 `_redirects`：把它加進去。
  - 未追蹤或被忽略的題目目錄：不算進去。（H01–H05、H07、H08、H11、H18、H20、H23、H24、H39、H40、H43）
- **AC-13** 監看路徑沒有任何 staged 變更的 commit，以 O1 結束：exit 0，index、工作樹與 `git stash list` 都不變。（H06）
- **AC-14** O2 執行開始時，有 unstaged 的已追蹤變更、未追蹤檔案、一個 staged 與 unstaged 變更重疊的檔案，以及一個和期望內容不同的 unstaged `_redirects`。執行之後：
  - `_redirects` 以外的每個檔都逐 byte 相同，未追蹤檔案仍是未追蹤。
  - 工作樹的 `_redirects` 等於 staged 的版本。stderr 含有 W3，以及指名該未追蹤題目的 W4。
  - `git stash list` 不變。（H08–H10、H19）
- **AC-15** hook 失敗時，index、工作樹（含 `_redirects`）與 `git stash list` 都等於 hook 執行前的狀態（O3、O4）：
  - validator 失敗時，hook 以 validator 的狀態結束。今天 `tests/pre-commit-sh.test.ts` 的每個案例，在 S5 的 fixture 中對真正的 hook 執行，都得到它今天斷言的狀態。
  - 產生失敗時，hook 以 exit 1 與 W5 結束。情況是 staged 的繁中說明頁號碼和英文頁不同。
  - 孤兒說明頁以 exit 1 與 W6 結束（D12）。情況有：對有繁中說明頁的題目，只下架、只刪除或只改名英文目錄；以及只改名繁中目錄。（H12、H13、H15、H17、H21、H22、H41）
- **AC-16** 只 stage 一個繁中說明頁（只有 `index.md` 的目錄），以 O2 結束，validator 不會執行。（H14）
- **AC-17** guard test 的斷言與納入規則，以及執行 `pnpm test` 的 CI 步驟，本 epic 都不改。stage 6 對照 diff 檢查這一點。以新 header 重新產生、commit 進去的 `_redirects` 通過 guard。繞過 hook 的 commit 交給 CI 裡不變的 guard：`--no-verify`、沒有安裝 hook，或 git 不跑 pre-commit 就建立的 commit。這由 guard 的斷言推得，不另做實驗。（G01、G02、H16）
- **AC-18** 依比對規則，sentence map 裡列有 E1 的五列都含有它，列有 Z1 的五列也都含有它。這項檢查只在 upstream decision 成立時執行，由 stage 6 對照 diff 確認。（T01、T02、T04）
- **AC-19** 依比對規則，`README.en.md` 含有 E2，`README.md` 與兩份 wxl-fork-init skill 檔含有 Z2。（T03）
- **AC-20** 在 Cloudflare 與本機的 stage 8，由最後 land 的 ticket 對含有整個 epic 的 commit 執行：
  - 在 ticket 分支的 Cloudflare Pages preview 上，列表與導覽列以兩種語言顯示並複製帶 `SITE_ORIGIN` 的短連結。題目頁要開著 Browser panel 檢查。在 preview 自己的主機上請求 `/c/NNN` 與 `/zh/c/NNN`，會開到對應的題目。
  - 沒有 `CF_PAGES` 的本機 `pnpm build`，由 `pnpm docs:preview` 提供，以 `/agent-browser` 或宿主的原生瀏覽器工具操作，寬度為 375 與 1280×800。題目頁要開著 Browser panel 檢查。列表與導覽列顯示並複製題目頁網址。在 375 寬時，放不下的網址以省略號結尾，`title` 是完整網址，點它會選取而不離開頁面。
  - 下一項檢查使用 ticket 分支在 scratch 目錄的暫時本機 clone。它已跑過 `pnpm install`、有 Rust，並在一個從不 push、事後刪除的拋棄式分支上進行。在其中執行 `pnpm create:challenge --backend php`、`git add` 新題目，再經 `/tw-emoji-commit` 執行 `git commit`，得到的 commit 含有期望的 `_redirects`，guard test 在它上面通過。沒有任何步驟手動處理 `_redirects`。
  - ticket PR 的 CI 通過。（V01–V03）
- **AC-21** GitHub Pages 的 stage 8 使用一個暫時的專案網站 repository，名稱不是 `<owner>.github.io`。它以 create-wxl 建立（`--host github-pages`，`CREATE_WXL_COMMIT` 設為已 push 的 ticket commit），push 後以 Run workflow 部署：
  - 在每種語言，從列表與導覽列各複製一個網址，都會開到對應的題目。題目頁要開著 Browser panel 檢查。英文網址在儲存語言為英文的瀏覽器 profile 中開啟。
  - 執行 `pnpm create:challenge --backend php`、`git add`、經 `/tw-emoji-commit` 的 `git commit` 與 `git push` 之後，靶場的 CI 通過。`Run tests` step 的 log 顯示 guard test 的案例通過。下一次部署之後，從列表複製新題目的題目頁網址，會開到它。
  - 事後由使用者刪除這個 repository。
  - 每一個對外動作，執行前都先向使用者確認。（V04、V05）
- **AC-22** commit 形式，每一種都透過真的 `git commit` 執行：
  - 在類似 `create:challenge` 的變更之後用 `-a`，commit 的是期望的 `_redirects`，不含那道未追蹤題目的規則，並印 W3 與 W4。
  - 下列每一種都以 O2 結束，並 commit 期望的 `_redirects`：新增題目的 `--amend`、以 stdin 送入回答的 `-p`、`-i <path>`，以及在 linked worktree 裡的 commit。
  - 會觸發的 `-- <path>` 與 `--only <path>` 以 exit 1 與 W8 拒絕，什麼都不改，也沒有 commit。
  - 下列每一種也都 commit 期望的 `_redirects`：
    - 以 `pnpm redirects:generate`、`git add` 與 `git commit` 修復過期的檔；
    - 以同樣方式解決 `_redirects` 衝突後完成的 merge；
    - 在 commit 進去的 `_redirects` 仍帶本 epic 之前 header 的靶場裡，commit 一道題目。（H31–H38、H44）
- **AC-23** 穩健性：
  - 下列情況以 O5 結束：產生期間收到 SIGINT、SIGTERM 或 SIGHUP，以及 hook stash 之前就有 git 指令失敗。
  - 還原失敗以 O7 結束。W9 指名 hook 的 entry，它仍列在清單裡並保存著 unstaged 檔案；套用後就能把它們帶回來，D16 列出的兩種情況除外。
  - 第一個 commit 若 `platform/` 底下有 unstaged 檔案，以 O6 與 W7 結束；全部都已 stage 的第一個 commit 以 O2 結束。
  - 對被中斷的 `git commit -a` 送 SIGINT，依 race 的結果以 O5 或 O7 結束。兩種情況下 `.git/index` 都不變、沒有 commit，每個 unstaged 檔案不是已經回來，就是在被指名的 entry 裡。
  - 工作樹裡只有 `_redirects` 不同時，hook 不建立自己的 entry，也不碰別的 entry。
  - 每個有既存 entry 的 hook 案例，那個 entry 仍以同一個 commit id 列在清單裡。每個案例中，真實 repository 的 `_redirects`、index 與 stash list 都不變。
  - 在 Mac 上，H02、H07、H14 與 H34 在 `/bin/bash` 3.2 底下得到相同的結果。（H25–H30、H42、H45–H47）
- **AC-24** stage 6 確認 P1–P8 每一段都依段落表的要求改寫，包括四份 skill 檔中 wxl-create 對 exit status 2 與 3 的處理。（T05）
- **AC-25** `shortLink.ts` 與 `.vitepress/config.mts` 對每個 fork:init 定位點仍各只有一行符合，`fork-init.test.ts` 與 `upstream-guard.test.ts` 通過。（F01）

## 測試決策

- 好的測試在 seam 上觀察行為：控制項顯示與複製了什麼、設定的公開欄位、檔案與結束狀態，以及 git 回報的
  index 與工作樹。它從不觀察模組是怎麼算出這些的。
- **S1** 沿用 `tests/unit/site/config-base.test.ts` 的做法：對每個 `CF_PAGES` 值重新匯入設定，讀取它的
  公開欄位。
- **S8** 是連結 helper 的新單元測試。X1–X6 與 L20 是它的案例，origin 以參數傳入。0004 的 T70/AC-C1
  約束的是元件輸出，不是這個 helper。
- **S2** 在 happy-dom 底下擴充 `ShortLinkShare.test.ts`、`ChallengeList.test.ts` 與 `MergedNav.test.ts`。
  L08、L09、L12–L15、L17–L19 與 L21 只在這裡執行。
  - 期望值由真實的 `SITE_ORIGIN` 以單純的字串操作組出（T70/AC-C1）。
  - 模式以 `vi.mock` 取代控制項讀取模式的模組來設定。今天的短連結斷言在 short mode 下執行，因為未定義
    的常數表示 page mode。
  - 在 N 各列，`vitepress` mock 的 `withBase` 會加上 `/my-range/`，所以錯誤加上的 base 會出現在複製出
    的網址裡。
  - 版面與執行期覆寫在 S3 斷言，不在這裡。
- **S3** 在 `tests/site-smoke/site-smoke.spec.ts` 新增案例，照今天一樣在 Chromium 執行。
  - CI 建置時沒有 `CF_PAGES`，所以 smoke 端到端涵蓋 page mode。
  - init script 製造 `copy_failed` 狀態與執行期覆寫（S09）。done badge 來自網站自己的進度儲存。
  - 建好的網站在 short mode 下的行為，在 stage 8 由 Cloudflare preview 涵蓋（V01），那是唯一一個建置
    會設定這個變數的地方。
  - S08 依賴上游自己的 origin，只在 upstream decision 成立時執行。其餘在每個靶場都執行，並開啟示範題
    `selected-excerpts`，就像今天的 smoke 開啟 `door-is-open`。
- **S4** 是 create-challenge 匯出進入點的新測試，使用一個含 `platform/public/` 的暫時 root 與一個 keygen
  替身。它從不在真實的樹裡執行：在那裡它會在 guard test 平行執行時改寫 commit 進去的 `_redirects`。
  先例：create-wxl 的 `run(argv, deps)`（0005-S1）。`pnpm` 會原樣傳遞進入點的狀態：鎖定的版本 pnpm
  10.28.0 會原樣回傳 script 的 2 與 3（2026-10-21 實測）。
- **S5** 在暫時的 repository 裡執行真正的 hook，包括直接執行，以及在裝好 hook 的情況下透過真的
  `git commit` 執行。它取代測試裡自己那份 hook 副本，所以 hook 的變更不再可能對著過期的副本通過。
  - repository 的路徑含有空白與非 ASCII 字元。fixture 有 `platform/public/`，裡面是與樹一致、已 commit
    的 `_redirects` 和另一個檔，另外還有一個執行前就存在的 stash entry。H27 與 H28 使用自己的 fixture。
  - 測試啟動的行程，環境中所有 `GIT_*` 變數都會移除，讓外層的 hook 或 `git rebase -x` 無法把它們指向
    真實的 repository。
  - 案例可以把 hook 呼叫的某支腳本換成替身，H25 與 H26 就是這樣掌握中斷與失敗的時間點。
  - 今天的案例保留（H15），O1–O7 與各種 commit 形式也都成為案例。commit 形式透過真的 `git commit`
    執行。
  - 每個案例也都檢查真實 repository 的 `_redirects`、index 與 stash list。
  - H45 需要 bash 3.2，只有 macOS 有。stage 5 在 Mac 上執行它，ticket 的 coverage report 要註明。
- **S6** 是針對 sentence map 的新 vitest，以 upstream decision 為執行條件。先例：
  `tests/unit/site/glossary.test.ts`，以及 `upstream-guard.test.ts` 的 upstream decision。
- guard test 本身不修改（AC-17）。
- **stage 8 覆寫 preview 部署規則**（D9）。
  - `docs/agents/workflow.md` 與 `AGENTS.md` 的 stage 8 關卡，要求在 ticket 的 preview 部署上驗證行為。
    Cloudflare preview 會設定 `CF_PAGES=1`，page mode 不可能出現在那裡。所以 page mode 在本機建置
    （V02）與真實的 GitHub Pages 靶場（V04、V05）上驗證，preview 負責 short mode（V01）。
  - 這沿用 OQ-017 的先例，0004 與 0005 都把它記為明文覆寫；本 epic 也把這次覆寫記在那裡。
  - hard rule 4 仍然適用：題目頁要開著 Browser panel 檢查。
  - 最後 land 的 ticket，對含有整個 epic 的 commit 執行 V01–V05。較早的 ticket 能呈現哪幾列 V，由
    stage 4 指派。

## 不在範圍內

- 讓短連結在 GitHub Pages 上生效的機制，例如會轉址的 404 頁面（Q10）。
- 在任何地方記錄主機：`range.json`、fork:init 或部署範本（Q8）。在建置時檢查 `SITE_ORIGIN` 是否符合網站 base（D10），或把它正規化。
- 為沒有繁中版的頁面修改語系轉址（D6、OQ-023）。
- 在任何主機上跳過或削弱 guard test（Q9）；為 `_redirects` 新增 `challenge:verify` 的 L1 檢查（Q5）；不再 commit `_redirects`（Q4）。
- 讓 hook 在被繞過時也有作用（H16），包括為 git 自行完成的 merge 安裝 `pre-merge-commit` hook。讓它在 `PATH` 上沒有 Node 時也能運作；這時執行以 shell 自己的狀態結束。hook 在 Windows 上超出 CI 所執行範圍的行為。
- 讓 hook 執行 staged 版本的產生器腳本，而不是工作樹的版本（B2）。
- 拒絕 `platform/` 底下的 symbolic link：hook 與 `create:challenge` 會跟隨它們，與 `pnpm build` 相同；還原空的未追蹤目錄。
- 以 `CF_PAGES=1` 建置的 smoke，以及在 WebKit 或觸控裝置上執行 smoke。
- Cloudflare 靶場在本機 preview 中的短連結，或 Cloudflare Direct Upload、Workers 建置中的短連結（Q8，已接受的代價）。
- 修改介面字串或 message key；把 `ShortLinkShare` 改名；改變 wxl-fork-init skill 檔的語言。
- `CONTRIBUTE.md` 中關於在本機測試轉址規則的段落，它仍然正確。
- 讓 `create:challenge` 或產生器拒絕 `.gitignore` 會忽略的 slug，或拒絕手動建立、不符合 slug 文法的目錄名稱。
- 題目被刪除而不是下架之後號碼被重複使用，以及兩個分支指派同一個下一號：兩者都是本 epic 不改的編號行為。一個帶進兩道同號題目、以 `git commit` 完成的 merge，會以 O4 與產生器的訊息結束。
- 第 1 階段的另外兩個 epic：不需要 Rust 就能開始（預建 WASM 與 Quick start），以及容器開發環境。另外還有新的區段型頁面，例如 `kb/` 樹、GUI 或 TUI，以及設定紀錄的設定那一半與設定頁面（OQ-020）。

## 補充說明

- **已知代價（Q8、Q10、D6、D10）。**
  - 在本機 preview 的 Cloudflare 靶場會複製題目頁網址。
  - 在 GitHub Pages 靶場，改名題目的舊題目頁網址會失效；靶場搬家而 `SITE_ORIGIN` 仍是舊網址時，所有題目頁網址都會失效。E2 與 Z2 都說明了這一點。
  - 沒有儲存偏好的學習者開啟英文題目頁網址時，會被導到繁中頁。建立時沒有繁中說明頁的題目缺少那一頁，這是 OQ-023；短連結今天也會走到同一個轉址。
  - 手機沒有 hover。取得完整網址的方法是複製按鈕，以及點一下網址文字。在列表裡用中鍵或按著修飾鍵點網址文字，會像任何連結一樣開啟題目。
  - GitHub Pages 靶場仍然維護一個它從不讀取的 `_redirects`，但沒有任何事要求老師去碰它。
  - 建好的網站在 short mode 下只在 stage 8 檢查，smoke 也只在 Chromium 執行。
  - 題目頁網址假設題目是 per-folder 結構，而 `create:challenge` 只建立這種結構。樹裡沒有任何舊式的扁平頁面。
  - 名稱跟被忽略目錄相同的題目（`dist`、`logs`、`tmp`）永遠不會被追蹤，所以 hook 不會算它，CI 也看不到它。手動建立、名稱不符合 slug 文法的目錄，照舊會得到產生器的規則。
- **hook 會改到的 commit。**
  - 手改 `_redirects` 是唯一的 staged 變更時，hook 把期望的檔放回去，git 記錄一個沒有任何變更的 commit（實測）。W3 會說明發生了什麼。
  - `/tw-emoji-commit` 依 `git diff --cached` 撰寫訊息，這發生在 hook stage `_redirects` 之前。上游自己的 commit 與 stage 8 若要讓訊息涵蓋這個檔，可以在工作樹沒有未追蹤題目時，先執行 `pnpm redirects:generate` 並 stage 它。
  - E1 的修復步驟會對整個工作樹執行。沒有號碼的未追蹤草稿會讓它拒絕，訊息會指名那份草稿。先修好或移走草稿就行；stage 任何題目變更、讓 hook 重新產生這個檔也可以。
- **本機 guard 不一致。** guard test 讀的是工作樹，所以本機的 `pnpm test` 有兩種情況會跟 CI 不一致：
  - 在 `pnpm create:challenge` 之後、stage 新題目之前。stage 之後就會消失，而 `pnpm dev` 今天也會造成
    同樣的不一致。
  - commit 一道題目時，它的繁中說明頁還沒追蹤。guard 會算進那份說明頁，而 commit 沒有帶它。

  這兩種情況下，CI 都與 hook 一致。反向的情況，也就是說明頁已追蹤、但英文 `index.md` 還沒 stage，屬於
  孤兒說明頁，會被拒絕（D12）。
- **在 hook 之後被中止的 commit**（訊息為空、被 commit-msg hook 拒絕），會讓重新產生的 `_redirects`
  留在 staged 區與工作樹。下一個 commit 的 hook 會再重新產生一次。
- **未決問題。**
  - 本 spec 決定了 OQ-016，0007 落地時關閉：不隱藏按鈕，而是在短連結無法生效的地方，於 B4 的限制內
    給出題目頁網址。
  - 它新增 OQ-023，處理語系轉址。
  - 它把 stage 8 的覆寫記在 OQ-017。
  - 它重排 OQ-020 的編號：0007 是本 epic，第 1 階段的另外兩個 epic 接在後面，設定那一半與設定頁面在
    排入時取下一個空號。
- **不寫 ADR。** 第 1 階段沒有找到一個同時符合「難以回頭、沒有脈絡會讓人意外、而且是真正取捨」的決定。
  在建置時偵測主機很容易回頭。
- **落地方式。** 與 0005、0006 相同，spec、traceability、OPEN-QUESTIONS 的修改，以及第 1 階段的
  GLOSSARY 修改，隨本 epic 的第一個 ticket PR 一起進入版本控制。
- **stage 8 的對外動作。** 建立 GitHub repository、啟用 Pages 與 push，執行前都各自先向使用者確認，
  repository 由使用者刪除。在暫時的 clone 或 repository 裡執行 `create:challenge` 需要 Rust，直到下一個
  epic 移除這項需求。
