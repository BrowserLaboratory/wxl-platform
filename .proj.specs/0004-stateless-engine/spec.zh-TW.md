---
synced_from: spec.en.md
synced_from_sha: 259f9ef468a26f09459a65d2bac01e587c91ee03
---

# Spec 0004：不帶狀態的 fork-init 引擎，以及保持綠燈的靶場 CI

狀態：第 2.2 版（第 2 版加上隨測試計畫核准的澄清；2.2 版另加 seam 0004-S10 與 T85，都列在 `traceability.md`）。第 1 輪對抗式審查沒有發現 P0（`review/round-1.md`），因此第 3 階段的關卡已通過；
第 2 版套用第 1 輪的裁決（`review/disposition.md`，群組 M1–M10）。本檔由英文版翻譯，以英文版為準。
本文衍生自 `traceability.md`，其中保存本規格引用的固定清單（模式與「今天」、repository slug 的文法、
第一次轉換、身分定位點 A1–A9、base 的文法、workflow 狀態、上游 repository slug 的限制與守門清單、
被覆寫的契約、字元規則、origin 文法、參數檢查順序與訊息）以及 seam 0004-S1 到 S10。第 1 階段的決定：
Q1–Q24、E1–E6 與 F1–F3（2026-10-14）。這個 epic 是從 0003-apply-engine 在其第 2 輪
（`.proj.specs/0003-apply-engine/review/round-2.md`）後拆分出來的：所有依賴設定紀錄的部分都移到後續
epic。後續 epic 規劃為 0005 create-wxl（重新規格化；0002 保留為拆分紀錄）、0006 設定紀錄與 0007
設定頁面；0005 建立在本篇之上。Vocabulary 引用的詞彙表章節「靶場與老師的工具」是第 1 階段的產出，
尚未 commit，隨本規格一起進入版本控制。

## 問題陳述

`fork:init` 把上游平台變成老師的靶場。今天它用字串替換的方式，把上游 repository slug 當成子字串
掃過每一個文字檔，因此它改寫了本該保留的歷史（更新日誌裡指向上游 pull request 的連結），也改到了
本不該碰的文字。它不會設定短連結 origin 或網站名稱，所以老師得自己動手改原始碼。它每次執行都會重設
版本號。而且，一個已設定好的靶場，自己的 CI 反而變紅：三個元件測試把上游網址寫死在程式裡，而
GitHub Pages 靶場的 base 被寫進設定檔，這會讓從 `/` 導航的網站冒煙測試與題目測試壞掉，並且讓
favicon 留在根目錄而找不到。

## 解法

沒有 `--rebrand` 時，`fork:init` 只改寫一份固定清單裡的身分定位點。每個文件型定位點都是一種固定的
URL 形式，其中的 repository slug 是萬用字元，所以不管那裡放的是上游的、靶場先前用過的，還是新的
repository slug，都會被取代；一次跑到一半中斷的執行，只要再跑一次就能完成。它會設定短連結 origin
與網站名稱，並依照 host 選擇 GitHub Pages 的 workflow。它不保留任何狀態：每次執行都要把參數完整
帶入，沒給的設定就讓對應的定位點維持原樣。GitHub Pages 靶場的 base path 是在網站部署時，從 GitHub
自己的 Pages 設定決定的，因此已設定靶場裡的每一項測試仍然在 `/` 底下執行並維持綠燈。只在上游有意義
的 CI 只在上游執行，而且有專屬上游的測試會抓出引擎曾經在上游本身被執行過的情況。`--rebrand` 維持
今天的行為。

## 詞彙

出自 `GLOSSARY.md`（章節「靶場與老師的工具」）：**靶場（range）**、**老師（teacher）**、
**上游（upstream）**。本文另外使用：

- **repository slug** — GitHub repository 的 `owner/name`。有別於詞彙表裡的 *slug（題目
  slug）*，後者指的是題目；本規格不會單獨用「slug」來指 repository slug。
- **身分定位點（identity anchor）** — A1–A9 之一：一個指出靶場自己 repository 名稱、或帶有靶場
  其中一項設定的位置。*文件型*定位點（A2–A5）是文件裡的 URL 形式；*程式碼型*定位點（A1、A6–A9）
  是網站或套件所依賴的位置。
- **anchor 模式**與 **rebrand 模式** — 指不帶與帶 `--rebrand` 的執行。
- **今天（today）** — fork-init CLI 在 `c0f7edf` 時的行為。
- **第一次轉換（first conversion）** — 定義於 `traceability.md`：manifest 仍精確地命名著上游的
  repository。
- **短連結 origin（short-link origin）** — 短連結模組 `SITE_ORIGIN` 的值，由 `--origin` 設定。
  有別於詞彙表裡的 *origin（紀錄來源）*、git 的 `origin` remote，以及 HTTP 的 `Origin`
  標頭。
- **主機（host）** — 靶場部署的位置：`github-pages` 或 `cloudflare-pages`。URL 裡的 host 部分
  稱為 **hostname**。

## 使用者故事

1. 身為老師，我希望設定我的靶場時只改到指名我靶場的地方，這樣我的題目、筆記和平台的歷史就永遠
   不會被動到。
2. 身為老師，我希望重新命名我的 repository 或改一項設定，只要再跑一次指令就好，這樣我就不用手動
   改原始碼。
3. 身為老師，我希望一次跑到一半停下來的執行，只要再跑一次同樣的指令就能完成，這樣我就不用修補一個
   設定到一半的靶場。
4. 身為老師，我希望我的網站複製出去的短連結指向我自己的網站，這樣講義就不會把班級導去別的地方。
5. 身為老師，我希望我靶場的名稱出現在瀏覽器分頁和首頁上，這樣學習者才知道這是誰的靶場。
6. 身為老師，我希望一個會弄壞頁面的名稱被拒絕並附上理由，這樣我才能換一個，而不是發布一個壞掉的
   網站。
7. 身為老師，我希望只要說出我部署在哪裡，workflow 和 base path 就會被處理好，包括 GitHub Pages
   的 user site 和自訂網域，這樣我就不需要搞懂 `--base`。
8. 身為用 `--host` 設定的老師，我希望我靶場的 CI 保持綠燈，這樣紅燈就代表是我自己弄壞了什麼。
9. 身為用早期版本 `fork:init` 設定過靶場的老師，我希望新引擎（不帶 `--rebrand`）能在上面運作、
   保留我的版本號，並且在我的設定檔、樣板或 workflow 太舊時，明確告訴我該從上游帶過來什麼，這樣
   我的網站才不會悄悄壞掉。
10. 身為上游維護者，我希望只在上游執行的 CI 不會跑進老師的 repository——即使是改過品牌的也一樣
    ——並且有測試會在引擎曾經在上游本身執行過時失敗，這樣老師就永遠收不到上游的 release，上游也
    永遠不會出貨老師的身分。

## 實作決定

### 引擎介面與錯誤

- `runForkInit(args, { projectRoot })` 仍是唯一的引擎，整個引擎留在 fork-init CLI 的這一個檔案
  裡，而 rebrand 模式本身的掃描已經排除這個檔案。它匯入 Node 內建模組與 `yaml` 套件
  （每個靶場都會安裝的開發依賴套件，用來判斷 workflow），並只使用可被抹除的
  TypeScript 語法，因此 CLI 能在 Node 的型別抹除下執行，不需要 `tsx`（錯誤類別
  裡的參數屬性寫法被移除；`fork:init` 的套件 script 仍可保留 `tsx`）。它匯出上游 repository slug
  為 `UPSTREAM_SLUG`。
- 新參數：`origin`、`siteName`、`host`（`github-pages` | `cloudflare-pages`），分別以
  `--origin`、`--site-name`、`--host` 暴露。`--author` 與 `--repo` 仍為必填。既有參數維持原本
  的意義，除非另外說明。
- 參數錯誤由 `parseForkInitArgs` 丟出為 `ForkInitArgError`——包括 Node 自己的參數解析器丟出的任何
  錯誤，以及同一旗標被給了兩次——依 `traceability.md` 的參數檢查順序。每條訊息都點名其旗標，並用
  `JSON.stringify` 引述被拒絕的值。CLI 把訊息印到 stderr 並以 exit 1 結束。
- 樹狀結構錯誤——缺失、帶 BOM、無法解析或非物件的 manifest；設定程式碼型定位點時候選行數為零或
  多個，或既有值無法解析；一個需要 A9 的設定檔缺少 A9 或其 `base: siteBase` 這一行；`--host` 下
  缺失或過舊的樣板，或在 `--host github-pages` 下不會導出 `SITE_BASE` 的樣板；在 anchor 模式下
  寫入失敗——都以 `exitCode` 1 回傳，`message` 點名定位點 id、欄位或樣板，以及該檔案（相對路徑，
  用 `/`）。談到該從上游帶過來什麼的訊息（T18、T24）含有上游的 repository URL，而限制規則只讓
  引擎這一個檔案攜帶它。CLI 只印出 `✗ ` 加上該訊息，印在 stderr，並以 exit 1 結束。成功時維持
  今天的行為，印在 stdout（T58）。
- 每一項檢查和每一項編輯都先在記憶體裡算完，才會有任何寫入動作；寫入前就發現的錯誤不會寫入任何
  東西。anchor 模式下，每個變動過的檔案先寫到旁邊的 `<file>.fork-init-tmp`，再改名覆蓋原始檔，
  同時保留其權限位元——這是一項實作要求，沒有任何測試會觀察它，由使用者在 seam S1 這樣決定。寫入
  失敗到一半，視為一個樹狀結構錯誤，告訴老師再跑一次同樣的指令就會收斂（T6）；rebrand 模式仍是
  原地寫入並維持今天的失敗方式。根目錄的 `.gitignore` 忽略 `*.fork-init-tmp`。內容不會變動的檔案
  不會被寫入。

### 身分定位點取代字串掃描（anchor 模式）

- 引擎只寫入 A1–A9（辨識規則見 `traceability.md`）與 GitHub Pages 的 workflow。文件型定位點
  A2–A5 會取代其形式的每一次出現，不管它裡面裝的是哪個 repository slug，都換成新的；一個沒有出現、
  或所在檔案不存在的文件型定位點，會產生警告。沒有一份「舊 repository slug」清單可供改寫的依據，
  因此結果只取決於這棵樹裡定位點的位置與參數。
- 一個程式碼型定位點在其值被設定時，必須恰好有一行候選行，若未被設定則沒有這項要求：A6 與 A7
  在給了 `--site-name` 時；A8 在有給定或推導出的 origin 時；A9 在給了 `--base` 或 `--host`
  時。既有 A6–A8 的值若要被設定，必須能被解析（A6 與 A8 為 JS 字串常值；A7 為單一 YAML 純量）。
  新的 A6–A8 值透過一個函式型 replacer 寫成 JSON 字串常值（因此像 `$&` 與 `$'` 這類取代樣式會
  保持原字面）。A9 是明文規定的例外：它整行寫成三種精確寫法之一，包括 `'…'` 這種形式。定位點在
  CRLF 檔案裡與在 LF 檔案裡一樣能被辨識，換行字元維持不變。
- 把短連結 origin 改成非上游值時，會附上新舊值發出警告；在 `--host` 下重設一個字面值的 A9 時，
  會附上舊的那一行與上游形式發出警告：引擎不保留任何狀態，所以一次省略 `--origin` 的執行，不能
  悄悄地替換掉一個自訂網域。
- manifest（A1）以結構化方式編輯：每次執行都改三個 repository URL 與 `author`；`version` =
  `0.1.0` 且 `license` = `ECL-2.0` 只在第一次轉換時改；`name` 與 `description` 在給定且去除
  前後空白後非空時才改。非純物件的 `repository` 或 `bugs` 會被換成物件形式，兩種模式皆然。它以
  兩空白縮排的 JSON 重新序列化，沿用既有的換行風格。
- **被覆寫的契約**，明確列出：`traceability.md` 裡「Overridden contracts」表的每一列——八個
  fork-init 測試與一個測試標題、fork-template parity 測試的 SITE_BASE 斷言與其註解、parity
  測試裡的基準線與「每個 fork 都拿到一個 workflow」的陳述、toolchain-parity 測試、樣板與凍結的
  fixture，以及 fork-init 模組的註解（含 `ForkInitArgs.base` 型別）、VitePress 設定檔、短連結
  模組、LocaleSwitcher 元件及其測試裡的註解，還有兩份 `wxl-fork-init` 技巧（skill）。其餘每一個
  既有的 fork-init 測試都原封不動通過。共用 fixture 新增新定位點所需的檔案。

### Rebrand 模式

`--rebrand` 保留今天的程式路徑：全樹範圍替換上游 repository slug、四個 key 的重新命名、殘留清點、
無條件重設 `version` 與 `license`、`name` 預設為 rebrand 名稱、manifest 以 LF 寫入、檔案原地寫入，
以及 workflow 比對與寫入失敗的方式都維持今天的作法。完整的差異清單在 T51：base 透過 A9 走（並在
workflow 不會導出 `SITE_BASE` 時發出警告）；壞掉的 manifest 視為樹狀結構錯誤，非純物件的
`repository` 或 `bugs` 會變成物件；參數規則照樣套用；錯誤在寫入前就找出來；結果裡每個路徑都用
`/`。`--rebrand` 同時搭配 `--host`、`--origin` 或 `--site-name` 是參數錯誤。因為上游 repository
slug 被限制在 `traceability.md` 列出的那幾個檔案裡，而且只在上游執行的 CI 透過 `format` 拼出它、
新測試則匯入 `UPSTREAM_SLUG`，全樹範圍的替換無法把只在上游執行的機制導向一個靶場。

### Host、base 與 origin

- VitePress 設定檔只定義一次 base，為 `const siteBase = process.env.SITE_BASE || '/'`
  （A9，本 epic 新增於上游，附帶 `base: siteBase`）；`base` 與三個 `head` 連結都使用它。解析出
  的 `siteBase` 若在 base 文法之外，設定檔會丟出錯誤並點名 `SITE_BASE`。base 文法拒絕 `.` 與
  `..` 這兩種片段，`--base` 也一樣。
- GitHub Pages 的 workflow 樣板會在 build 之前執行 `actions/configure-pages`（id 為
  `pages`），並設定 `SITE_BASE: ${{ steps.pages.outputs.base_path }}/`。GitHub 對 project
  site、user site 與自訂網域都會計算出 `base_path`（`"/my-repo"` 或 `""`，已於 2026-10-14
  對照釘選版本的 action 的 `action.yml` 驗證過），因此一個靶場永遠不必把自己的 base 寫進原始碼裡，
  並且會自己跟著重新命名和自訂網域走。一個 workflow 要*導出 SITE_BASE*，條件是它的 `pnpm build`
  步驟剛好設定了那個值，以解析 YAML 判斷。anchor 模式下，workflow 以 LF 正規化後比對。
- 引擎透過一份以 SHA-256 值記錄的已知舊輸出清單，辨識它在本 epic 之前所寫出的 workflow（初始只有
  一筆：來自 `72327e2` 的樣板，它當時是逐字寫出；一份逐字複本被加進測試 fixture，與 parity 測試
  凍結的基準線是不同的東西）。一個只在上游執行的測試釘住目前樣板的 hash，因此更改樣板會讓這個測試
  失敗，直到那個舊值被移進引擎的清單裡。
- `--host`（任一值）需要這棵樹裡的樣板存在，且不是一個已知的舊輸出，並且需要恰好一個 A9 與一個
  `base: siteBase` 行；`--host github-pages` 還需要樣板能導出 `SITE_BASE`。否則它回傳
  `exitCode` 1，內容是該從上游帶過來什麼。它把 A9 設為其上游形式。
- `--host github-pages`：workflow 在缺失時安裝；在等於目前樣板輸出時保持原樣；在等於一個已知舊
  輸出時替換（附帶警告）；其他情況則保留並附帶警告——這個警告點名 `SITE_BASE` 以及由此造成的
  404，當 workflow 不導出 `SITE_BASE` 時（包括一個設定了字面 `SITE_BASE` 的舊版上游 workflow）。
  沒有 `--origin` 時，origin 每次這樣的執行都會被推導：`https://<owner>.github.io/<name>`，或
  對於 user site `<owner>.github.io` 推導為 `https://<owner>.github.io`，owner 一律小寫。自訂
  網域需要 `--origin`。
- `--host cloudflare-pages`：不裝 workflow；一個等於目前樣板輸出或一個已知舊輸出的 workflow 會
  被移除，其他則保留並附帶警告。`--origin` 為必填，且不接受路徑：`pages.dev` 的專案名稱是在
  Cloudflare 的儀表板裡選的，引擎無從得知。
- `--host` 搭配 `--base`，或一個未知的 `--host`，都是參數錯誤。
- 沒有 `--host` 時，今天的 workflow 行為維持不變，anchor 模式下以 LF 正規化後比對（缺失時安裝
  ——包括一個 Cloudflare 靶場的 workflow 曾被先前某次執行移除過的情況，因為引擎不保留狀態——且
  永遠不替換）；當 A9 是上游形式且 workflow 不導出 `SITE_BASE` 時，兩種模式都會加上一則點名
  `SITE_BASE`、`404` 與 `--host github-pages` 的警告。A9 跟著 `--base`（`'/x/'` 或
  `'/'`）走，A8 跟著 `--origin` 走，否則維持原樣。字面值的 base 會讓網站固定在某個路徑上，因此
  靶場自己從 `/` 導航的網站冒煙測試與題目測試會在 CI 裡失敗；README 有說明這件事。

### 靶場 CI

- ShortLinkShare、MergedNav 與 ChallengeList 這三個元件測試，從它們匯入的 `SITE_ORIGIN` 組出
  預期字串，因此對任何 origin 都成立；上游自己的值則由 pristine 測試檢查。
- `release` job（release workflow）與新增的跨作業系統 job（quality-gates workflow）都帶著
  完全相同的 `if: github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')`。
  quality-gates 的 `test` job 與新 job 都設定 `WXL_EXPECT_UPSTREAM` 為同一個比較結果，因此一個
  只在上游執行的測試若錯誤地判定「不是上游」就會失敗，而不是被跳過。新 job 在 Windows、macOS 和
  Ubuntu 上搭配 Node 24、以及在 Ubuntu 上搭配 Node 22，執行 fork-init 與 upstream-guard 這兩組
  測試，不帶 Rust 工具鏈、Rust cache、install-action 或 binaryen 步驟。
- repository-slug 守門檢查每一個追蹤中的文字檔裡的每一次出現，不分大小寫，對照改寫清單與保留清單。
  它的分類邏輯、一個新的 upstream-pristine 檢查，以及兩者共用的 upstream 判定，都是在 fixture
  資料上測試的函式；守門邏輯、pristine 檢查與樣板 hash 釘選，只在真實的樹上、且只在上游執行
  （`GITHUB_REPOSITORY` 若有設定且非空；否則用 manifest 的 `repository.url` 是否精確等於上游，
  並且是一個 git 工作目錄）。pristine 檢查比對 A2–A9、`base: siteBase` 這一行、A1 的三個 URL、
  `license` 與 `author` 和上游的值，要求 `version` 不是 `0.1.0` 且沒有 deploy workflow，並以
  欄位 id 回報不相符之處。

### 文件

README 與 README.en 改寫其 fork 區段、`fork:init` 指令表的那一列，以及 Cloudflare 區段裡的
子路徑步驟，依 T77 列出的必要字串與禁止字串——其中包括：每次執行都要帶入全部參數；一個 Cloudflare
靶場每次都要帶 `--host cloudflare-pages`（沒帶 `--host` 的執行會重新安裝 GitHub Pages 的
workflow）且是部署在網域根目錄；`--base` 會讓靶場的網站冒煙測試與題目測試變紅；同一個 owner 底下
的多個 GitHub Pages 靶場共享瀏覽器的儲存空間。兩棵樹的 `wxl-fork-init/SKILL.md` 依 T78 所列改變，
並且以 `cmp` 比對應相等——這是本 epic 對「各執行環境可以自行調整自己技巧」這個自由的一項覆寫，
同時也讓兩者維持各自目前使用的語言，這是語言規則明文列出的例外，因為翻譯這個技巧不是本 epic 的
工作範圍。被覆寫契約裡的註解依 T83 所列改變。詞彙表與未決問題登記依 T79–T80 所列改變。以上全部
在第 6 階段透過 0004-S9 檢查。

## 信任邊界與威脅模型

| # | 邊界 | 保護什麼 | 不保護什麼 | 不在模型範圍內 |
|---|---|---|---|---|
| B1 | CLI 參數 → 網站建置所依據的原始碼（TypeScript 設定檔、短連結模組、YAML frontmatter、manifest）與終端機 | 沒有任何參數能把程式碼注入模組或 frontmatter（寫入前先驗證；JSON 字串常值透過函式型 replacer；A9 從固定一組寫法中選擇並驗證路徑）；沒有網站名稱能把 HTML 注入首頁（`<`、`>`、`&` 被拒絕）；被拒絕的值會以 JSON 加引號的方式回顯 | `--name` 與 `--description`，兩者只透過 JSON 序列化抵達 manifest | 老師自行刻意編輯自己的原始碼 |
| B2 | 引擎 → 老師自己的內容與平台的歷史 | anchor 模式下，寫入動作被限制在 A1–A9、workflow 與引擎自己的暫存檔；workflow 只在其 LF 正規化後的內容等於目前樣板輸出或一個已知舊輸出時才會被替換或移除；自訂的短連結 origin 不會被悄悄替換 | 老師自己在定位點檔案裡寫的某一行，剛好符合另一個 repository 的定位點形式（依設計會被改寫）；rebrand 模式的全樹範圍替換與 key 重新命名，維持今天的作法 | 定位點檔案或 workflow 路徑是符號連結或硬連結的樹；同一棵樹上同時跑兩次 |
| B3 | 上游 repository → 老師的 repository（CI） | 上游的 release 與跨作業系統 job 永遠不會在一個靶場裡執行，包括 `--rebrand` 之後；只在上游執行的測試在靶場裡會被跳過，在上游則失敗而不是跳過 | 一個靶場的其他 CI，依設計本來就會執行 | 上游組織被重新命名，這會讓只在上游執行的 job 停下來（只限大小寫層面，`WXL_EXPECT_UPSTREAM` 會讓測試失敗） |
| B4 | 一個已設定的靶場 → 上游（不小心在上游執行） | upstream-pristine 測試在任何定位點、manifest 的身分或一個 deploy workflow 不符時，會在上游 CI 裡失敗 | CI 執行前的一次本機 commit | — |
| B5 | 已部署的靶場 → 學習者 | 不變：引擎不是建置後網站的一部分；靶場仍是一個靜態網站 | 同一個 owner 底下的多個 GitHub Pages 靶場共享同一個瀏覽器 origin：它們儲存的作品會互相重疊，其中一個做了全站清除也會清掉其他的（這違反詞彙表的全站清除，T79 會為此加上註記），而且一個 user-site 靶場的題目 service worker 可能會接管同一個 owner 底下的 project-site 靶場（已記錄；OQ-018） | — |

## 驗收標準

### 定位點

- **AC-A1** 在 anchor 模式下，一個文件型定位點形式的每一次出現都換成新的 repository slug，
  不管它原本裝的是哪個 repository slug，檔案裡其他任何一個位元組都不變；一個沒有出現、或所在
  檔案不存在的形式，發出警告並附上定位點 id 與路徑。(T1, T2)
- **AC-A2** 在 anchor 模式下，A1–A9 與 workflow 之外的每個檔案逐位元組相同，A2–A9 的檔案只在其
  定位點內部改變，manifest 在 A1 之外的欄位維持原值（依 T4 的序列化方式），而一個未被設定其值的
  程式碼型定位點，保留其行內容，不需存在，且當其所在檔案裡沒有其他定位點被設定時，該檔案逐位元組
  相同。(T3–T5)
- **AC-A3** 在 anchor 模式下，對 T6 裡的每一個 X、以及 X 的寫入動作已完成的每一個子集合，執行 X
  結束後，其結果逐位元組等同於在未套用過的 fixture 上執行 X。(T6)
- **AC-A4** 在 anchor 模式下，第二次完全相同的執行，不回報任何變動的檔案，每個檔案的位元組與
  修改時間都不變，並且只送出 T7 所列、其條件仍然成立的那些警告。(T7)
- **AC-A5** 一個候選行數恰好為一的程式碼型定位點被設定時，依規定寫入（A6–A8 寫成 JSON 字串常值；
  A9 寫成其精確的那一行），完整取代既有值連同其逸出字元；候選行數為零或多個（缺失檔案算作零），
  或既有 A6–A8 值要被設定但無法解析，則回傳 `exitCode` 1，點名定位點 id 與檔案，不寫入任何
  東西。(T8–T10)
- **AC-A6** CRLF 檔案裡的定位點能被辨識（在 anchor 模式下；A9 在兩種模式下都能）；除 manifest
  以外的定位點檔案維持其換行字元與其他位元組，manifest 依照 T4 處理。(T11)
- **AC-A7** 一個缺失、帶 BOM、無法解析或非物件的 manifest 回傳 `exitCode` 1 並點名它，不寫入
  任何東西；非純物件的 `repository` 或 `bugs` 變成物件，而一個純物件保留其其他鍵值
  （`repository.type` 設為 `git`）；在 anchor 模式下，`name` 與 `description` 只在給定且去除
  前後空白後非空時才改變。(T12–T14)
- **AC-A8** 在 anchor 模式下，`version` 只在第一次轉換時精確地變成 `0.1.0`，`license` 精確地
  變成 `ECL-2.0`。(T15)

### Host 與 base

- **AC-H1** 一個未知的 `--host`，或 `--host` 搭配 `--base`，都是參數錯誤。(T16, T17)
- **AC-H2** `--host` 把 A9 設為其上游形式，若它原本不是上游形式，附上舊的那一行與上游形式發出
  警告；`--host` 或 `--base` 用在一個沒有恰好一個 A9 與一個 `base: siteBase` 行的設定檔上，
  回傳 `exitCode` 1，訊息為 T18 所列的字串，不寫入任何東西。(T18, T19, T82)
- **AC-H3** `--host github-pages` 依 T22 所述處理每一種 workflow 狀態，附上 T22 點名的警告
  字串；`--host` 搭配一個缺失、過舊、或（對 GitHub Pages 而言）不導出的樣板，回傳 `exitCode`
  1，訊息為 T24 所列的字串；樣板 hash 釘選成立。(T22, T24, T27)
- **AC-H4** `--host cloudflare-pages` 不安裝任何 workflow，移除一個等於目前樣板輸出或一個已知
  舊輸出的 workflow（列在 `changedFiles` 裡，警告含 `removed` 與路徑），並對其他任何情況保留並
  附上含 `left untouched` 與路徑的警告。(T23)
- **AC-H5** `--base` 只接受 base 文法或 `none`；`--base /x/` 與 `--base none` 在兩種模式下都
  寫出 `const siteBase = '/x/'` 與 `const siteBase = '/'`；沒有 `--host` 時，workflow 依
  T25 所述處理，而一個不導出 `SITE_BASE` 的 workflow，若旁邊是上游形式的 A9，會附上 T26 點名的
  字串發出警告，兩種模式皆然。(T20, T21, T25, T26)
- **AC-H6** 樣板在 `pnpm build` 步驟之前以 id `pages` 執行 `configure-pages`，該步驟把
  `SITE_BASE` 設為 `${{ steps.pages.outputs.base_path }}/`，其標頭含有
  `steps.pages.outputs.base_path`，且不含 T28 禁止的五個字串中任何一個。(T28)
- **AC-H7** 設定檔的 `base` 與三個連結，在 `SITE_BASE` 未設定或為空時以 `/` 開頭，在
  `SITE_BASE=/x/` 時以 `/x/` 開頭；一個解析出的 base 若在 base 文法之外，設定檔會丟出錯誤並
  點名 `SITE_BASE`。(T29–T31)

### 短連結 origin

- **AC-O1** 在 anchor 模式下，`--origin` 只有在符合 origin 文法時才被接受，然後以小寫 hostname
  設定 A8；T33 的每一種形式都被拒絕，`--host cloudflare-pages` 下帶路徑的也一樣被拒絕。
  (T32–T34)
- **AC-O2** `--host cloudflare-pages` 沒有 `--origin` 是參數錯誤，點名 `--origin` 與
  `cloudflare-pages`；`--host github-pages` 沒有 `--origin` 時，每次這樣的執行都依 T36–T37
  所述推導短連結 origin；既沒有 `--host` 也沒有 `--origin` 時，A8 維持不動；替換一個非上游值的
  A8，附上新舊值發出警告。(T35–T38, T81)

### 網站名稱

- **AC-N1** 一個合法的 `--site-name`（去除前後空白、1–60 個 code point、至少一個非
  U+200C/U+200D 的字元、符合字元規則）設定 A6 與兩個 A7；ZWJ emoji 可被接受；其他情況都是參數
  錯誤。(T39, T40, T43)
- **AC-N2** 含有 `<`、`>` 或 `&` 是參數錯誤，並點名該字元。(T41)
- **AC-N3** 對於含有 `"`、`'`、`\`、反引號、`$`、`` $` ``、`$'`、`$$` 或 `$1` 的值，寫出的 A6
  字面值求值後等於該值，且兩份 frontmatter 都能解析，使 `hero.name` 等於它。(T42)

### 守門與只在上游執行的測試

- **AC-G1** fork-init 模組匯出 `UPSTREAM_SLUG`；守門邏輯對以下情況回報違規並附上檔案與行號：
  上游 repository slug（不分大小寫）出現在一個不在任何清單上的追蹤文字檔裡，或出現在一個改寫清單
  檔案裡但不在其定位點形式之中；其他情況則不回報（二進位檔案也包括在內）。(T44, T61–T64)
- **AC-G2** upstream 判定遵循一個非空的 `GITHUB_REPOSITORY`，做精確比對；否則要求 manifest 的
  `repository.url` 精確等於上游的值，且是一個 git 工作目錄。(T65, T66)
- **AC-G3** pristine 檢查精確地回報 T67 裡與上游值不同的那些欄位 id；守門、pristine 與樣板
  hash 測試，只在 upstream 判定成立時於真實的樹上執行，當 `WXL_EXPECT_UPSTREAM` 與判定結果矛盾
  時失敗，並在本 epic 之後於上游通過。(T67–T69)

### 參數

- **AC-P1** `--repo` 的 owner 與 name 在 T45 範圍之外都是參數錯誤。(T45)
- **AC-P2** `--author` 在 T46 範圍之外，或 `--author`、`--repo` 缺失或空白，都是參數錯誤，並
  點名該旗標。(T46, T47)
- **AC-P3** Node 參數解析器丟出的任何錯誤，或同一旗標被給了兩次，都丟出 `ForkInitArgError` 並
  點名該旗標（位置參數時：`positional` 與該參數，以 JSON 加引號）；有多個失敗時，依參數檢查順序
  決定訊息內容。(T48, T49)

### Rebrand 模式

- **AC-B1** `--rebrand` 搭配 `--host`、`--origin`、`--site-name` 任何之一都是參數錯誤，並點名
  `--rebrand` 與每一個被給出的旗標。(T50)
- **AC-B2** `--rebrand` 的行為與今天一樣，每個既有的 rebrand 測試都原封不動通過，差異只在 T51
  所列的那些。(T51)
- **AC-B3** `--author x --rebrand acme --repo me/x` 以 exit 0 結束，並讓只在上游執行的 `if:`
  與 `env` 那幾行、匯入 `UPSTREAM_SLUG` 的那幾行，以及引擎檔案都逐位元組不變。(T52)

### 引擎結果與 CLI

- **AC-E1** 一個樹狀結構錯誤回傳 `exitCode` 1，訊息點名定位點 id、欄位或樣板以及檔案，由 CLI
  印在 stderr 上，內容只有 `✗ ` 加上該訊息，並以 exit 1 結束；寫入前就找出的錯誤不改變、不建立、
  不移除任何檔案；在 anchor 模式下，一次寫入失敗回傳 `exitCode` 1，點名該檔案並含有
  `run the same command again`。(T53–T55)
- **AC-E2** `--dry-run` 不寫入任何東西，在 `changedFiles` 裡列出每一項會改變的內容（包括
  workflow 的安裝、替換與移除），並回報與一次真正執行相同的錯誤與警告；結果及其訊息裡的每個路徑，
  在任何作業系統上都用 `/`。(T56, T57)
- **AC-E3** 複製進一個 fixture 的 CLI，連結上該 repository 的 `node_modules`，在不帶 `tsx` 的情況下，以
  `node --experimental-strip-types` 執行：在一個合法的 fixture 上以 exit 0 搭配 T58 的
  stdout 結束；對一個不合法的參數，以 exit 1 搭配 stderr 上的 `✗ ` 與訊息結束。(T58, T59)
- **AC-E4** 「Overridden contracts」底下列出的測試都被改寫為新的契約，其餘每一個既有的 fork-init
  測試都原封不動通過。(T60)

### CI

- **AC-C1** 三個元件測試從匯入的 `SITE_ORIGIN` 組出它們的期望值，不含任何上游 hostname，並且
  檢查 `SITE_ORIGIN` 符合 origin 文法。(T70)
- **AC-C2** `release` job 與新 job 都帶著 T71 所列、精確相同的 `if:`，`test` job 與新 job 都
  帶著其精確相同的 `env`。(T71)
- **AC-C3** 新 job 在 quality-gates workflow 裡，觸發條件不變，帶有 T72 所列四個 `include`
  項目，執行那兩個指名的測試檔案，且不新增任何 Rust 工具鏈、Rust cache、install-action 或
  binaryen 步驟。(T72)
- **AC-C4** SourceViewer 的元件測試結束時，不會留下仍在運作的 CodeMirror 編輯器，因此
  SourceViewer 測試檔的執行不會因為編輯器的計時器在測試環境拆除後才觸發，而回報 unhandled error。(T85)

### 第 8 階段

- **AC-X1** 在本 epic 最後一張票 branch 的 HEAD 上，在 0004-S7 的兩個輸出裡，每個指令都以
  exit 0 結束，且 T74 與 T75 的觀察結果在 S7 讀取它們的地方都成立。(T73–T75)
- **AC-X2** 在新增 A9 那張票的預覽部署上，三個 favicon URL 都回傳 200，`/` 與 `/zh-TW/` 裡
  每一個 script 與 stylesheet 或 modulepreload URL，都是一個同源路徑、以 `/assets/` 開頭或是
  單一根層級片段，而且在同一次檢查裡抓到的兩個 `<title>` 都等於正式站的值。(T76)

### 文件與註解

- **AC-D1** README、README.en 與兩份 `wxl-fork-init/SKILL.md`，含有 T77–T78 要求的每一個
  字串、不含任何一個禁止字串，且兩份技巧以 `cmp` 比對相等。(T77, T78)
- **AC-D2** 詞彙表在其區塊裡含有 T79 要求的每一個字串，且詞彙表測試的執行通過。(T79)
- **AC-D3** 未決問題登記在其區塊裡含有 T80 要求的每一個字串。(T80)
- **AC-D4** 「Overridden contracts」裡點名的那些註解符合 T83，根目錄的 `.gitignore` 符合
  T84。(T83, T84)

## 測試決定

- 測試在 seam 0004-S1 到 S6 斷言可觀察的行為：磁碟上的檔案連同其修改時間、引擎的結果、解析後的
  設定檔與 workflow、守門違規與 pristine 不符。沒有任何東西被 mock：元件測試讀取真正的
  `SITE_ORIGIN`。S7 與 S8 屬於第 8 階段；S9 是第 6 階段針對文件與註解的一項紀錄，內容是
  `grep -F`、`cmp` 與詞彙表測試。S10 是以 vitest 執行 SourceViewer 元件測試檔，紀錄在新增它的 ticket 裡。
- 引擎測試延伸既有的「暫存目錄裡的 fixture」模式；共用 fixture 新增 A9 與 `base: siteBase`、
  A2 與 A5 的形式、兩份首頁，以及短連結模組，而舊版設定檔形狀變成 T18 的 fixture，其樣板則變成
  一個會導出 `SITE_BASE` 的最小 workflow。冪等性（idempotence）指的是第二次執行不改變任何檔案
  的位元組或修改時間。收斂性（T6）窮舉三組固定參數集合、每一組寫入動作的每一個子集合，因此不需要
  注入任何寫入失敗。一次寫入失敗（T55）使用一個唯讀目錄裡的唯讀檔案，在 Windows 上以及以 root
  身分執行時跳過。舊版樣板輸出是 `72327e2` 那個樣板的逐字複本，對照引擎的清單檢查（T27）。
- 設定檔模組在每個案例裡都以一份全新的模組註冊表匯入；frontmatter 用 `yaml` 套件解析。字元分類
  測試只使用在 Node 22 與 24 裡分類相同的字元。
- 守門邏輯的分類、pristine 檢查與 upstream 判定，都在 fixture 上測試通過與失敗的情況；真正
  只在上游執行的測試本身，在真實的樹上執行。
- **第 8 階段的驗證面，明文列為對 workflow「預覽部署」規則以及 AGENTS.md 硬性規則 4 的覆寫：**
  沒有驅動任何真實頁面。預覽部署透過 HTTP 回應涵蓋上游網站（AC-X2）；一個已設定的靶場，由於沒有
  任何上游預覽含有它，改為透過靜態 HTML 與 JS 的本機匯出驗證（AC-X1）。這個驗證手法在本 epic
  裡是暫定的，記錄為 OQ-017。把一個已設定的靶場實際部署到兩種 host，是使用者在研習活動前的人工
  檢查項目。

## 不在範圍內

- 設定紀錄 `range.json`、把參數併入先前的參數並重放（0006）；create-wxl（0005）；設定頁面
  （0007）；升級靶場的開發模組。在 0006 之前，一個靶場沒有設定紀錄：升級動作可以從定位點讀出
  repository slug、網站名稱與短連結 origin，也能從 A9 讀出一個字面值的 base，但無法可靠地讀出
  host——在 `--host` 下，base 不在原始碼裡，而 workflow 的存在與否，是唯一的痕跡，卻會被後續一次
  不帶 `--host` 的執行抹去。
- 改變 rebrand 模式超出 T51 範圍，包括它已知的限制：它掃描整棵樹時不理會 `.gitignore`；它只改寫
  字面上的上游 repository slug，因此重新命名之後，一個改過品牌的靶場，其 A2–A5 仍留著靶場先前的
  repository slug，而 A1 則跟著 `--repo`；一個含有重新命名用 key（例如 `me/wxl-locale`）的
  `--repo`，在第二次完全相同的執行下會被破壞；它每次執行都重設 `version` 與 `license`；它無法
  使用 `--host`（T26 仍會發出警告）。
- 移除一項已經給過的設定；每個語系各自的網站名稱；其他顯示「WXL」的地方（hero 圖片的 alt 文字、
  導覽列與 About 標籤）；網站名稱裡的次級行政區旗幟 emoji（其 tag 字元屬於 Cf，會被拒絕）；
  一個其用字會被靶場的文案稽核拒絕的網站名稱。
- 一次以參數 Y 中斷、以不同參數 X 完成的執行：它會收斂到 X，除了第一次轉換在 Y 那次執行時已經
  決定的部分。
- 一個已設定靶場的 manifest 合併時用了上游的 `repository.url`：下一次執行會被視為第一次轉換，
  並重設 `version` 與 `license`。
- 一個已設定靶場的設定檔有 A9 與 `base: siteBase`，但 head 連結是字面值：favicon 在 project
  site 上會 404，而且沒有任何東西會檢查這件事。
- 一個位在 `.github/workflows/deploy.yml` 以外路徑的 GitHub Pages workflow：偵測不到。
- 同一棵樹上同時跑兩次。
- README 快速開始指南裡，在 A3 clone 那一行之後的 `cd wxl-platform`，對一個 repository 名稱
  不同的靶場而言是錯的。
- 從 GitHub 的介面切換 GitHub Pages workflow（OQ-004 剩餘部分）；在 GitHub Pages 靶場上隱藏
  複製短連結按鈕，其短連結會 404（OQ-016）。
- 把同一個 owner 底下的多個 GitHub Pages 靶場彼此隔離（已記錄；OQ-018）。
- 一個推導出的 GitHub Pages origin，其 repository 名稱與 GitHub 本身的大小寫不同（base 來自
  GitHub 本身，是對的；短連結 origin 跟著 `--repo` 打進去的原樣走）。
- release workflow 自動產生的 release note，相對於專案自己的 release note 規則（OQ-019，
  在 2026-10-16 的 release 時處理）；修訂 Charter（由 0005 決定）。
- 一個含有詞彙表標記為新造詞的用語的網站名稱，這會讓一個靶場的詞彙表測試失敗（已記錄；不太可能
  發生）。

## 補充說明

- 這些定位點是在 2026-10-14 以 `git grep -n 'BrowserLaboratory/wxl-platform'` 找出來的；
  每一個命中都是一個 A1–A5 的形式，或位於一個保留清單檔案裡。守門邏輯維持這個狀態。
- 因為一個文件型定位點的形式不管出現在哪裡都會被改寫，上游的 README 與 CONTRIBUTE 不能為另一個
  repository 保留 A2–A5 形式的範例，這些文件也不能用 URL 指向上游自己的 repository；引擎的
  訊息改為攜帶那個 URL。
- `CONTRIBUTE.md` 裡的 `git remote add upstream` 是為靶場自己的貢獻者命名 git 的 remote，
  因此它跟著靶場自己的 repository 走（A4）；它是 git 的術語，不是詞彙表裡的*上游*（T79 會為它
  加上 `_Avoid_`）。
- deploy 樣板在這個 repository 的歷史裡只有一個版本（`72327e2`），所以已知舊輸出的清單一開始只
  有一筆值。一個在這個 repository 第一次 commit 之前的樣板（parity 測試的註解裡提到過一個）不算
  已知，帶著它的靶場會收到 T22 的「其他」警告。
- 一個在儀表板裡不帶尾端斜線設定了 `SITE_BASE` 的 Cloudflare 靶場，像舊版 README 曾允許的那樣，
  在套用新設定檔之後會得到一個丟出錯誤、點名 `SITE_BASE` 的 build：是大聲的失敗，不是悄悄的
  失敗。
- 沒有設定 `titleTemplate`，所以首頁的 `<title>` 就是網站標題本身；T74 用一個含有 `$'` 與 `$1`
  的網站名稱檢查它（`$&` 無法用這種方式測試：`&` 會被拒絕）。
- 規格 0002 與 0003 連同它們的審查，被保留作為這兩次拆分的紀錄。
</content>
