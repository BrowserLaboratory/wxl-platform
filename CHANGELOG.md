# Changelog

All notable changes to **Web eXploitation Laboratory (WXL)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## ✨ [3.1.0] - 2026-11-11

> 靶場可以升級了：在靶場裡執行 `pnpm range:upgrade`，就能用三方合併把上游的新版本帶進來，老師的修改會保留下來。另外，短連結改為帶語系代碼，題目清單也會列出每一道題目。

### ✨ 新增 (Added)

- `create-wxl upgrade`（靶場裡的 `pnpm range:upgrade`）會把上游新版本以三方合併帶進靶場：
  - 上游改了、老師沒改的檔案直接更新；兩邊都改過的地方標上三個標籤的衝突標記；拿不準的路徑保留老師的版本，列在注意項目裡。
  - 升級不會 commit，不會碰被 ignore 的檔案與 submodule，也不會跟隨符號連結。
  - 報告依序列出計數、刪掉的每個檔案、注意項目與後續步驟，最後附上一行還原指令。
  - 用 3.0.0 建立的靶場還沒有這個 script，第一次升級請執行 `npx --yes create-wxl@latest upgrade`。
  ([#65]、[#67]、[#70]、[#72]、[#74]、[#78])
- 題目短連結帶語系代碼：複製按鈕改發 `/en/c/NNN` 或 `/zh-TW/c/NNN`，每道題目產生四條 redirect 規則；舊的 `/c/NNN` 與 `/zh/c/NNN` 照樣打得開。 ([#54])
- 每個語系的題目清單與首頁都列出每一道題目，還沒翻譯的題目帶語系標記。 ([#58])
- 打開不存在的翻譯網址時，改走保底頁並顯示提示；切換語系時，如果那個語系沒有對應版本，就留在原頁，並提供回到頁面本身語系的選項。 ([#50]、[#52]、[#56])
- 非 Cloudflare Pages 的建置（例如 GitHub Pages）中，複製按鈕改為顯示並複製題目頁的網址；點一下網址文字就會全選。 ([#39]、[#42])
- pre-commit hook 依 staged 的內容重新產生並 stage `_redirects`；`pnpm create:challenge` 建題後也會重新產生，並以結束狀態 1、2、3 區分結果。 ([#36]、[#38]、[#43]、[#44])

### 🔄 變更 (Changed)

- 建立靶場與升級都需要 git 2.26 以上；Ubuntu 20.04 內建的 git 2.25.1 不再支援。用較舊的 git 建立靶場時，靶場照樣建立，但會印出 CW-W01，列出要自己執行的 git 指令。 ([#76])
- 語系偏好只在使用者明確選擇時才寫入，冷載入只會導向實際存在的翻譯。 ([#50]、[#52])

### 🐛 修復 (Fixed)

- `create-wxl` 與 `pnpm fork:init` 把 `--origin` 正確說明成靶場網址，不再只說是短連結的網址。 ([#41])
- pre-commit hook 在中斷、git 失敗與第一個 commit 時都能乾淨收尾；失去英文題目的繁中說明頁會被拒絕。 ([#43]、[#44])

### 🔒 安全性 (Security)

- 升級只接受上游的發布版作為 base：`range.json` 記錄的 commit 必須是該版本 tag 的 commit，否則以 UP-E12 停下。這樣就算有人改了 `range.json`，也無法讓升級拿 fork 裡的內容當成上游。 ([#70])
- 磁碟上名稱和上游不同的路徑一律保持不動（UP-A15），包括 8.3 短檔名、大小寫或 Unicode 正規化不同的名稱；`realpath` 不回報實際名稱的檔案系統（例如 WSL 的 `/mnt/c`）也涵蓋。archive 裡 git 視為 `.git` 的名稱（`git~1`、`.git:`、HFS+ 會忽略的字元）一律拒絕。 ([#72]、[#78])
- 還原指令改為 `git checkout -- . && git clean -fd`：先還原 ignore 檔，`checkout` 失敗時也不會執行 `clean`，老師被 ignore 的檔案不會因此被刪掉。 ([#74]、[#78])

[#36]: https://github.com/BrowserLaboratory/wxl-platform/pull/36
[#38]: https://github.com/BrowserLaboratory/wxl-platform/pull/38
[#39]: https://github.com/BrowserLaboratory/wxl-platform/pull/39
[#41]: https://github.com/BrowserLaboratory/wxl-platform/pull/41
[#42]: https://github.com/BrowserLaboratory/wxl-platform/pull/42
[#43]: https://github.com/BrowserLaboratory/wxl-platform/pull/43
[#44]: https://github.com/BrowserLaboratory/wxl-platform/pull/44
[#50]: https://github.com/BrowserLaboratory/wxl-platform/pull/50
[#52]: https://github.com/BrowserLaboratory/wxl-platform/pull/52
[#54]: https://github.com/BrowserLaboratory/wxl-platform/pull/54
[#56]: https://github.com/BrowserLaboratory/wxl-platform/pull/56
[#58]: https://github.com/BrowserLaboratory/wxl-platform/pull/58
[#65]: https://github.com/BrowserLaboratory/wxl-platform/pull/65
[#67]: https://github.com/BrowserLaboratory/wxl-platform/pull/67
[#70]: https://github.com/BrowserLaboratory/wxl-platform/pull/70
[#72]: https://github.com/BrowserLaboratory/wxl-platform/pull/72
[#74]: https://github.com/BrowserLaboratory/wxl-platform/pull/74
[#76]: https://github.com/BrowserLaboratory/wxl-platform/pull/76
[#78]: https://github.com/BrowserLaboratory/wxl-platform/pull/78

## 💥 [3.0.0] - 2026-10-17

> WXL 平台的第一個版本：一個讓老師不用架伺服器就能備課、讓學生回家也能練習的純前端 web 資安靶場，附四道示範題，網站在 https://wxl.browserlab.online；老師可以 fork 後執行 `pnpm fork:init`，或用 `npm create wxl` 直接建立自己的靶場。

### ✨ 新增 (Added)

- 純前端的題目執行環境：Service Worker 攔截 HTTP 請求，交給在瀏覽器裡執行的 Flask／FastAPI（Pyodide）或 PHP（php-wasm）處理，flag 與題目檔案以 AES-GCM-256 加密存放。
- 題目頁的四個工具面板：Browser、Network、Repeater、Code（Python 攻擊腳本），以及 Pentest Notes 筆記。
- 攻擊紀錄保存在學習者自己的瀏覽器裡，可以匯出、匯入與按題目清除；共用電腦會先詢問是否沿用前一位的紀錄。
- 四道示範題：#1 知的必要（IDOR）、#2 僅限員工（SQL injection）、#8 只是預覽而已（SSTI，白箱）、#10 精選節錄（IDOR 串 SSTI，白箱）。
- 中英雙語的使用手冊與攻擊紀錄匯出格式說明。
- 題目短連結（`/c/001`、`/zh/c/001`），網址以 `wxl.browserlab.online` 為準；短連結只在 Cloudflare Pages 上有效。
- `pnpm fork:init`：fork 之後一次改好作者、GitHub 網址、網站名稱與短連結網址，並依 `--host` 決定部署方式（GitHub Pages 會裝上部署 workflow，Cloudflare Pages 部署在網域根目錄）；每次執行都要帶齊參數，結果與先前跑過幾次無關。 ([#15]、[#16]、[#17]、[#18]、[#20])
- `npm create wxl`（`create-wxl` 套件）：不必 fork，直接下載對應版本的上游、建立全新的靶場資料夾；互動模式依序詢問作者、GitHub repository、部署主機、網站網址與網站名稱，也可以用參數非互動執行，或以 `--no-setup` 只取得原廠檔案。套用設定後會自動 `git init` 並建立第一個 commit，靶場多一個記下上游版本的 `range.json`；下載內容逐筆檢查，任何失敗或 Ctrl-C 都不會留下半成品。 ([#26]、[#27]、[#28]、[#29]、[#30]、[#31])
- 帶有 `range.json` 設定紀錄的靶場不會被上游專用的檢查當成上游，`pnpm fork:init` 也會保留這份紀錄。 ([#24])
- 出題工具鏈：`pnpm create:challenge`、`challenge:verify`（L1–L3 閘門，加 `--blind` 跑 L4 盲解）與 `challenge:retype`。
- harness-agile 九階段開發流程：Claude Code 與 Codex 兩套 skill、agent 角色、流程文件與 ADR；每個 ticket 以 squash 合進 `main`。
- 新的品牌素材：首頁 hero 圖與 favicon，亮色與暗色兩版。

### 🔄 變更 (Changed)

- 上游網站的 VitePress `base` 改由 `SITE_BASE` 環境變數決定，GitHub Pages 的部署 workflow 會自動設定。 ([#14])
- 只屬於上游的 CI job（release、部署相關檢查）只在上游 repository 執行，fork 推 tag 不會建立 GitHub Release。 ([#19]、[#22])

### 🐛 修復 (Fixed)

- 共用電腦的全站清除只完成一半時，詢問畫面的回報改說真話：資料庫已刪、但本站的其他值沒刪完時，改說「資料庫已刪除，其他值沒能全部刪掉」，不再說「作品已刪、救不回來」；再按一次刪除時，會從資料庫開始重試整個全站清除。 ([#4]、[#5])
- 掃除失敗後，下一次刪除如果被另一個分頁擋住，畫面改報「結果無法確認」，只提供重新載入，不再沿用前一次掃除失敗的說法，也不再讓學習者原地繼續。 ([#6]、[#7])
- 按下刪除時，如果瀏覽器不讓本站記下「全站清除已開始」，畫面會保留前一次的報告並加上一則說明，不再說「什麼都沒刪」，也不再重新提供「沿用這些紀錄」。 ([#8])
- README 的 `wasm-pack` 安裝指令固定為 CI 使用的 0.14.0 並加上 `--locked`，避免相依套件被撤回時 Cloudflare Pages 建置失敗。 ([#25])

### 💥 Breaking Changes

- **session gate composable 的旗標改名**：`storedWorkGone` → `databaseDeleted`，不保留別名。它記錄的是「這份文件裡有一次資料庫刪除已經完成」，不是「學習者的作品已經不見」。
  遷移方式：在 `3.0.0` 之前 fork 了 `main`、又自訂 session gate 畫面的老師，請把 `storedWorkGone` 改成 `databaseDeleted`。讀舊名稱會靜默拿到 `undefined`，專案目前沒有型別檢查會擋下（見 OQ-011）；不過 continue 與 dismiss 的防護由 composable 本身執行，照常生效。 ([#1])
- **`pnpm fork:init` 的參數規則**：一定要帶 `--author` 與 `--repo`，`--host` 與 `--base` 不能同時使用，套件名稱只在帶 `--name` 或 `--rebrand` 時才會改。
  遷移方式：在 `3.0.0` 之前 fork、用舊參數寫過腳本的老師，請改照 README「fork 之後：改寫專案身分」帶齊參數。 ([#15])

[#1]: https://github.com/BrowserLaboratory/wxl-platform/pull/1
[#4]: https://github.com/BrowserLaboratory/wxl-platform/pull/4
[#5]: https://github.com/BrowserLaboratory/wxl-platform/pull/5
[#6]: https://github.com/BrowserLaboratory/wxl-platform/pull/6
[#7]: https://github.com/BrowserLaboratory/wxl-platform/pull/7
[#8]: https://github.com/BrowserLaboratory/wxl-platform/pull/8
[#14]: https://github.com/BrowserLaboratory/wxl-platform/pull/14
[#15]: https://github.com/BrowserLaboratory/wxl-platform/pull/15
[#16]: https://github.com/BrowserLaboratory/wxl-platform/pull/16
[#17]: https://github.com/BrowserLaboratory/wxl-platform/pull/17
[#18]: https://github.com/BrowserLaboratory/wxl-platform/pull/18
[#19]: https://github.com/BrowserLaboratory/wxl-platform/pull/19
[#20]: https://github.com/BrowserLaboratory/wxl-platform/pull/20
[#22]: https://github.com/BrowserLaboratory/wxl-platform/pull/22
[#24]: https://github.com/BrowserLaboratory/wxl-platform/pull/24
[#25]: https://github.com/BrowserLaboratory/wxl-platform/pull/25
[#26]: https://github.com/BrowserLaboratory/wxl-platform/pull/26
[#27]: https://github.com/BrowserLaboratory/wxl-platform/pull/27
[#28]: https://github.com/BrowserLaboratory/wxl-platform/pull/28
[#29]: https://github.com/BrowserLaboratory/wxl-platform/pull/29
[#30]: https://github.com/BrowserLaboratory/wxl-platform/pull/30
[#31]: https://github.com/BrowserLaboratory/wxl-platform/pull/31
