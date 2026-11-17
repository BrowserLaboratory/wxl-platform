# Web eXploitation Laboratory (WXL)

**繁體中文** | [English](README.en.md)

> 完全跑在瀏覽器裡、以 WebAssembly 驅動的 web 資安練習平台，不需要任何後端伺服器。

[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)
[![License: ECL-2.0](https://img.shields.io/badge/License-ECL--2.0-blue.svg)](LICENSE)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha.16-green.svg)](https://vitepress.dev)
[![pnpm](https://img.shields.io/badge/pnpm-10.28.0-orange.svg)](https://pnpm.io)

## 簡介

**Web eXploitation Laboratory（WXL）** 是 CTF 風格的 web 資安練習平台。每一題都完全在瀏覽器裡執行：WebAssembly 模擬出真實的後端環境，所以不必架設任何伺服器就能部署和使用。

它的目標是讓老師不用架伺服器就能備課，也讓學生回家可以繼續練習。fork 這個 repo、執行 `pnpm fork:init`，或執行 `npm create wxl`，就能把自己的靶場發布到 Cloudflare Pages 或 GitHub Pages。這個 repo 附有四道示範題，線上網站在 <https://wxl.browserlab.online>。

### 主要功能

- **純前端執行**：Service Worker 攔截 HTTP 請求，在瀏覽器裡模擬後端行為。
- **多種後端 runtime**：支援 Python Flask／FastAPI（透過 Pyodide）與 PHP（透過 php-wasm）。
- **加密的虛擬檔案系統**：flag 與應用程式檔案以 AES-GCM-256 加密存放，無法直接讀取。
- **靜態部署**：建置結果是純靜態檔案，可以放在任何靜態網站服務上（GitHub Pages、Cloudflare Pages 等）。

## 技術架構

| 層級 | 技術 |
|------|------|
| 文件框架 | [VitePress](https://vitepress.dev) 2.0.0-alpha.16 |
| UI 框架 | [Vue 3](https://vuejs.org) 3.5 + [UnoCSS](https://unocss.dev) |
| 狀態管理 | [Pinia](https://pinia.vuejs.org) 3 |
| Python runtime | [Pyodide](https://pyodide.org) 0.29 |
| PHP runtime | [php-wasm](https://github.com/seanmorris/php-wasm) |
| WASM 模組 | Rust 2021 + [wasm-pack](https://rustwasm.github.io/wasm-pack/) |
| 攻擊紀錄保存 | IndexedDB（`idb` 套件） |
| 套件管理 | [pnpm](https://pnpm.io) 10.28 |

## 環境需求

- **Node.js** >= 22.6：`challenge:keygen`、`create:challenge`、`challenge:validate`、`challenge:analyze` 透過 `node --experimental-strip-types` 執行，較舊的版本沒有這個功能。其餘 TypeScript 腳本走內建的 `tsx`，沒有版本下限。CI 用 Node 24 建置。
- **git** >= 2.26：`npm create wxl` 的 `git init` 與第一個 commit，以及 `pnpm range:upgrade`，都需要這個版本以上（Ubuntu 20.04 內建的 2.25.1 不支援）
- **pnpm** >= 10（`npm install -g pnpm`）
- **Rust** 工具鏈（用 [rustup](https://rustup.rs/) 安裝）
- **wasm-pack**（`cargo install wasm-pack --version 0.14.0 --locked`）：版本與 CI 相同。它不是套件相依，要安裝到 Rust 工具鏈裡
- **wasm-tools**（`cargo install wasm-tools --version 1.249.0 --locked`，或 `pnpm wasm:tools`）：版本與 CI 相同。`pnpm challenge:verify` 的 L2 階段要用它對產生的 payload 執行 `wasm-tools validate`。`pnpm challenge:keygen` 的 strip 與 mutate 也會用到，沒有安裝時只會各印一則警告。
- **Playwright 用的 Chromium**：第一次執行 `pnpm challenge:verify` 或 `pnpm test:smoke` 之前要裝好。`pnpm install` 之後執行一次：

  ```bash
  pnpm exec playwright install chromium
  ```

## 快速開始

```bash
# 1. 下載專案
git clone https://github.com/BrowserLaboratory/wxl-platform.git
cd wxl-platform

# 2. 安裝 Node.js 相依套件
pnpm install

# 3. 建置 WASM 模組並啟動開發伺服器
pnpm dev
```

開發伺服器預設在 `http://localhost:5173`。

## 可用指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 建置 WASM 模組並啟動開發伺服器 |
| `pnpm build` | 建置 WASM 模組並輸出靜態網站 |
| `pnpm docs:dev` | 只啟動 VitePress 開發伺服器（跳過 WASM 建置） |
| `pnpm docs:build` | 只建置 VitePress 靜態網站 |
| `pnpm docs:preview` | 預覽建置好的靜態網站 |
| `pnpm test` | 執行 TypeScript／JavaScript 單元測試（Vitest）。直接執行會停在 watch 模式，跑一次就結束請用 `pnpm test --run` |
| `pnpm test:smoke` | 對建置好的網站執行 Playwright smoke 測試；要先用 `WXL_SMOKE_PAGES=1 pnpm build` 建置 |
| `pnpm wasm:build` | 建置所有 Rust WASM 模組 |
| `pnpm wasm:test` | 執行 Rust 單元測試（`cargo test`） |
| `pnpm wasm:tools` | 嘗試把 `wasm-tools` 裝進 Rust 工具鏈；失敗也不會報錯、一律以 0 結束，請用 `wasm-tools --version` 確認 |
| `pnpm fork:init` | fork 之後改寫專案身分（作者、GitHub 網址、靶場網址、網站名稱，以及依 `--host` 決定的部署設定）。必須帶 `--author` 和 `--repo`；每次執行都要帶齊參數，`--host` 與 `--base` 互斥；套件名稱只在帶 `--name` 或 `--rebrand` 時才會改 |
| `pnpm challenge:keygen` | 為每一題產生加密的 WASM 模組 |
| `pnpm create:challenge` | 依參數建立新題目的骨架；必須帶 `--name <slug>`，不帶參數會印出用法並以 1 結束 |
| `pnpm challenge:validate` | 檢查每一題的題目宣告、每一份說明頁與檔案結構 |
| `pnpm challenge:analyze` | 列出一題的內容與設定 |
| `pnpm challenge:retype` | 修改既有題目的 backend／難度／tags／分類 |
| `pnpm challenge:verify` | 對一題執行分層驗證閘門（L1 lint、L2 build、L3 Playwright e2e） |
| `pnpm challenge:verify:blind` | 單獨執行 L4 盲解（也可以用 `pnpm challenge:verify <slug> --blind`） |
| `pnpm challenge:verify:cross` | L4 多 agent 交叉驗證：用 `claude,codex,gemini` 各跑一次盲解並彙整結果 |
| `pnpm prepare` | 安裝 git hooks（`simple-git-hooks`）；`pnpm install` 之後會自動執行 |

## 架構

```
Browser
├── VitePress site (Vue 3 + UnoCSS)
│   ├── Challenge pages (Markdown + YAML frontmatter)
│   └── IndexedDB (attack-session persistence + tool state)
├── Service Worker (platform/public/challenge-sw.js)
│   └── Intercepts HTTP requests and routes them to the matching WASM runtime
└── WASM runtimes
    ├── virtual-fs      Encrypted virtual filesystem (Rust)
    ├── asgi-bridge     Python ASGI/WSGI bridge layer (Rust)
    ├── python-bridge   Pyodide integration (TypeScript)
    └── php-bridge      php-wasm integration (TypeScript)
```

兩個 Rust crate 放在 `chall-wasm/`，由 `pnpm wasm:build` 建置。

### 請求流程

1. 使用者在題目頁操作，對「後端」發出 HTTP 請求。
2. Service Worker 攔截請求，依題目設定交給對應的 runtime。
3. Python 或 PHP runtime 處理請求，回傳 HTTP 回應。
4. 題目頁顯示結果。

### 題目設定格式

每一題的設定寫在一份題目宣告裡，也就是 `platform/challenge/<slug>/challenge.yaml`，所有語系共用。以 `platform/challenge/door-is-open/challenge.yaml` 為例：

```yaml
number: 1
difficulty: easy
category: web
backend: fastapi         # 必填：flask | fastapi | php
app: app.py              # 必填：相對於該題 src/ 的路徑
packages: []             # 透過 micropip 額外安裝的 Python 套件
tools: [ browser, network, repeater, code ]   # 省略時就是這四個；
                                              # 明確列出可以縮小範圍，
                                              # 但拿掉 browser 也會被加回來
source_visible: false    # true = 白箱題，false = 黑箱題（預設）
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
wasmModule: /challenge/door-is-open/runtime.wasm  # 由 keygen 產生
```

說明頁依語系放在 `platform/<語系代碼>/challenge/<slug>/index.md`：主語系那一份必備，其他語系的是翻譯，可以沒有。frontmatter 只留三個 key：

```yaml
---
title: Need to Know      # 必填
layout: challenge        # 套用題目介面；每份說明頁都要有這行
description: ...         # 題目的摘要
---
```

題目的原始碼由掃描該題的 `src/` 目錄取得。

## 參與貢獻

分支策略、PR 流程與 commit 慣例請見 [CONTRIBUTE.md](CONTRIBUTE.md)。

## commit 題目

每個改到題目或 `platform/public/_redirects` 的 commit，pre-commit hook 都會重新產生這個檔；hook 擋下 commit 時，訊息會說明怎麼做。以下幾種情況，光是重新 commit 不夠：

- **靶場的第一個 commit**：改到題目或 `_redirects` 的第一個 commit，只要 `platform/` 底下除了 `_redirects` 以外還有沒 stage 或沒追蹤的檔案就會被擋，因為第一個 commit 之前 git 沒辦法 stash。把它們 stage（或移除不該放進來的檔案），再 commit 一次。
- **hook 沒辦法把變更放回去**：hook 會把你在 `platform/` 底下還沒 stage 的變更和未追蹤的檔案留在一個 stash entry，並印出它的 commit id。照訊息執行 `git stash apply <id>`。apply 拒絕時，訊息印出的 `git restore` 指令會用 entry 裡的版本覆寫 `platform/` 底下的檔案，所以要在改動那裡的任何東西之前執行。apply 回報衝突時（兩處變更改到同一行或相鄰的行就會這樣），用 `git checkout <id> -- <path>` 從 entry 取回那個檔案。這時 git 會把那個檔案，以及 entry 裡其他已經套用的變更，都留在 stage 的狀態；執行 `git restore --staged --source=<id>^2 -- ':(top)platform/' ':(top,exclude)platform/public/_redirects'` 可以放回 commit 之前 stage 的內容，所以 commit 之前先看一下 `git status`。
- **hook 沒辦法把 stage 的變更放回去**：git 的 stash 做到一半停下、又改動了 index 時，訊息會說明，並印出 `git restore --staged --source=<id>^2 -- …`。這個指令會用 commit 之前 stage 的內容覆寫 `platform/` 底下已 stage 的內容，所以要等檔案都放回來、而且還沒 stage 那裡的任何東西時執行。訊息只印這個指令時，你沒 stage 的檔案已經放回來了；否則先照上一項的指令做。
- **修復過期的 `_redirects`**：`pnpm redirects:generate` 會讀整個工作目錄，所以未追蹤的題目草稿在 `challenge.yaml` 裡還沒有 `number` 時會拒絕，訊息會指出是哪一份草稿。先修好或移走草稿；或是 stage 一個題目變更再 commit，hook 會依 stage 的內容重新產生這個檔。
- **缺主語系說明頁、或缺題目宣告的題目**：說明頁沒有主語系的那一份、說明頁沒有對應的 `challenge.yaml`，以及 `challenge.yaml` 沒有主語系說明頁，這幾種 commit 都會被擋。如果之前已經用 `--no-verify` commit 進去，之後每個題目 commit 都會被擋，直到補上缺的那一份：寫好 `platform/<語系代碼>/challenge/<slug>/` 底下的說明頁，或把整道題目移到 `.archive/challenge/<slug>/` 下架。

前面兩項「沒辦法放回去」的情況裡，hook 的 stash entry 會一直留在 `git stash list` 裡。檔案和 index 都放回來之後，用 `git stash list --format='%gd %H'` 找出 id 和訊息印出的一樣的那一行，再用那一行的 `git stash drop stash@{<n>}` 刪掉它；`git stash drop` 不接受 id 本身。

## 部署

建置結果放在 `.vitepress/dist/`，是純靜態檔案，可以部署到任何靜態網站服務。

### 建置步驟

```bash
# 1. 安裝相依套件
pnpm install

# 2. 完整建置（WASM + keygen + VitePress）
pnpm build
```

### 用 `npm create wxl` 建立靶場

不想 fork 整個 repo，也可以用這個指令直接建立一個全新的靶場資料夾（需要 Node.js >= 22.6；要自動 `git init` 並 commit 還需要 git >= 2.26）：

```bash
npm create wxl <資料夾>
# 或
pnpm create wxl <資料夾>
```

互動模式會依序詢問作者、GitHub repository、部署主機、網站網址、網站名稱，套用設定之後會自動執行
`git init` 並建立第一個 commit；靶場裡會多一個 `range.json`，記下它是從哪一版上游建立的設定紀錄。

不想互動回答，也可以直接帶齊參數：

```bash
npm create wxl <資料夾> -- --author "<你的名字>" --repo <owner>/<repo> --host github-pages
```

只想要還沒套用任何設定的檔案、不建立 git repository，可以加 `--no-setup`：

```bash
npm create wxl <資料夾> -- --no-setup
```

> `create-wxl` 從 3.0.0 起發布在 npm 上；指令會下載與套件同一版的上游來建立靶場。

### 升級靶場：`pnpm range:upgrade`

上游發布新版之後，在靶場的最上層執行：

```bash
pnpm range:upgrade
```

它會下載靶場建立時的上游版本與最新版本，再和你的靶場做三方合併：上游改了、你沒改的檔案直接更新；兩邊都改過的地方標上衝突標記；拿不準的路徑保持你的版本，列在報告的注意項目裡。升級不會 commit，也不會動到被 ignore 的檔案；報告最後一行附上還原指令，在做其他變更之前執行就能整個撤銷。

需要 git 2.26 以上，而且工作樹必須是乾淨的。用 3.0.0 建立的靶場還沒有 `range:upgrade` 這個 script，第一次升級改用：

```bash
npx --yes create-wxl@latest upgrade
```

> 靶場若不是由 `npm create wxl` 建立（沒有 `range.json`），加上 `--from <版本>` 指出它從哪一版上游建立。

### 設定紀錄與主語系

靶場最上層的 `range.json` 是設定紀錄。其中的 `primaryLocale` 決定靶場的主語系：網站根網址底下放的是哪一個語系的內容，每一道題目一定要有的說明頁，也是這個語系的那一份。

- `primaryLocale` 可用的值就是語系清單：`en`、`zh-TW`；大小寫要完全相同，前後也不能有空白。
- 檔案不存在、或檔案裡沒有 `primaryLocale` 這個 key 時，主語系是 `zh-TW`。
- 讀不了或值不對時，建置會中止，訊息以下列代碼開頭：PL-E01 `range.json` 不是一般檔案（目錄、符號連結等，符號連結不會被跟隨）；PL-E02 讀不到檔案（訊息附 errno 代碼）；PL-E03 內容不是合法的 JSON；PL-E04 內容不是 JSON 物件；PL-E05 `primaryLocale` 不是字串；PL-E06 `primaryLocale` 的值不在語系清單上。
- 在 epic 0011 之前沒有工具代勞：老師要改主語系，就自己編輯這個檔案。
- 翻譯語系的首頁只能連到該翻譯自己有的頁面，連結從該語系的首頁寫起、不帶語系代碼；違反時建置以 PL-E12 中止。
- 重跑 `pnpm fork:init --site-name` 的靶場，兩個語系的首頁都要留著，因為 `fork:init` 仍然要求兩份首頁都在。
- `range.json` 沒有 `upstream` 欄位時，`pnpm range:upgrade` 要帶 `--from <版本>`。

#### 之後改主語系

事後改主語系沒有工具代勞，要自己做，而且有代價：

- 編輯 `range.json` 的 `primaryLocale` 並 commit；pre-commit hook 會重新產生 `platform/public/_redirects`，也可以自己執行 `pnpm redirects:generate`。
- 重新啟動 `pnpm dev`，改動才會生效。
- 網站根網址換成新主語系的語言，`/c/NNN` 開的也是新主語系的頁面。
- 已經發出去、不帶語系代碼的連結，開的是新主語系的頁面；`/<舊主語系>/…` 開頭的連結，只靠舊網址規則（舊主語系是 `zh-TW` 時，每個頂層頁面與資料夾各一條）或找不到頁面那一頁把前綴去掉，才會回到根。
- 每道題目必備的說明頁改成新主語系的那一份。某道題目缺這一份時，pre-commit hook 會擋下 commit，並印出一行指出是哪一題、缺的是哪一份說明頁，要先把它寫好。
- 首頁的 hero 與 nav 連結自己會跟著走，不用改。
- `challenge.yaml` 的修改在題目清單重新整理後就看得到，在題目頁要重新啟動 `pnpm dev` 才會更新。

### 搬到語系資料夾

每個語系有一個語系資料夾 `platform/<語系代碼>/`，裡面放該語系的全部頁面。不是用 `npm create wxl` 建立、也沒有用 `pnpm range:upgrade` 升級的靶場（例如直接 fork 的靶場），頁面可能還在舊版面：至少有一個頁面不在任何語系資料夾裡。舊版面的靶場建置不起來，要自己搬家，照下面的步驟依序做：

1. **先合併新版**：合併上游的新版，包含新的 `.vitepress/`、`scripts/`、`platform/shared/`、`platform/public/`、`package.json`、`pnpm-lock.yaml`，以及上游搬過的頁面。在舊的程式碼上搬沒有意義。合併停在一個上游改了名、你的 fork 又改過的頁面時，保留上游的新路徑，再把你的修改帶到那裡。
2. **把語系資料夾以外的每一個頁面搬到 `platform/en/`**，路徑維持不變。
3. **把每份英文說明頁的 frontmatter 裡，`title`、`description`、`layout` 以外的行**，原樣寫進 `platform/challenge/<slug>/challenge.yaml`，並從每一份說明頁（每個語系）刪掉。
4. **每個語系資料夾裡的每個清單與首頁**，改成 import `../shared/challenges.data.ts`（取代 `./shared/challenges.data.ts` 與已經不存在的 `../shared/challenges.zh-TW.data.ts`），並把 `:challenges="data"` 改成 `:lists="data"`。
5. **每個首頁連結都從該語系自己的首頁寫起**，拿掉 `/zh-TW` 前綴（`/zh-TW/challenges/` 改成 `/challenges/`）；翻譯語系的首頁只能連到該翻譯有的頁面。
6. **搬移被留在原處的相依檔**：搬過去的頁面用到、卻沒有跟著搬的檔案。
7. **在 `range.json` 加上 `"primaryLocale": "en"`**（沒有這個檔就建立它），讓英文維持在根網址。沒有 `range.json`、或檔案裡沒有這個 key 的 fork，現在根網址放的是繁體中文，即使它沒有自己的頁面要搬也一樣。
8. **執行 `pnpm build`**。

根目錄有了 `range.json`，這個樹就算靶場：上游專用的測試會略過它，和任何靶場一樣。沒有 `upstream` 欄位的 `range.json`，`pnpm range:upgrade` 只能帶 `--from <版本>`，否則會停在 UP-E06（原因是 `upstream`），在 epic 0011 之前都是如此。還沒 commit 的 `range.json` 只影響本機建置。

`smoke-fixtures/` 是保留名稱。頁面搬進 `platform/en/smoke-fixtures/` 之類的資料夾（手動搬或升級搬都一樣）後，正式建置不會發布它們。

自己寫頁面時請注意：頁面裡用 raw HTML 寫的連結，以及由元件組出來的連結，建置不會檢查。

建置擋下版面問題時，訊息的第一行以代碼開頭：

- **PL-E01**：`range.json` 不是一般檔案。把它換成真正的檔案；符號連結不會被跟隨。
- **PL-E02**：`range.json` 讀不到。依訊息裡的 errno 代碼（例如 `EACCES`）修好權限或檔案。
- **PL-E03**：`range.json` 不是合法的 JSON（空檔、開頭的 BOM、註解、尾巴多出來的文字都算）。改成合法的 JSON。
- **PL-E04**：`range.json` 的內容不是 JSON 物件。改成 `{ … }`。
- **PL-E05**：`primaryLocale` 不是字串。改成語系清單上的語系代碼字串。
- **PL-E06**：`primaryLocale` 不在語系清單上。改成清單上的值，大小寫要完全相同。
- **PL-E07**：頁面搜尋範圍裡有符號連結（包含語系資料夾本身）。把每一個換成檔案或資料夾本身。
- **PL-E08**：有頁面在語系資料夾之外：直接放在 `platform/` 底下、放在 `platform/challenge/` 裡但不在 `<slug>/src/` 底下，或放在名字不是語系代碼的資料夾。照本節的步驟搬進語系資料夾。
- **PL-E09**：語系資料夾裡有項目的名稱（或去掉 `.md` 之後的名稱）和某個語系代碼相同，網址會和該語系的前綴衝突。改名。
- **PL-E10**：主語系沒有首頁，也就是缺 `platform/<主語系>/index.md`。補上這個檔案。
- **PL-E11**：頁面裡有連結指名主語系的資料夾（例如 `/zh-TW/guide/`），但主語系的頁面網址沒有那段。拿掉語系代碼前綴。
- **PL-E12**：首頁的 `hero.actions[*].link` 或 `features[*].link` 不合規則：不是字串、以 `//` 開頭、是相對連結、已經帶語系前綴，或指向沒有發布的頁面。從該語系的首頁寫起，例如 `/guide/`，前綴由建置加上。
- **PL-E13**：說明頁設了 `layout: challenge`，卻沒有 `platform/challenge/<slug>/challenge.yaml`。補上題目宣告。
- **PL-E14**：`challenge.yaml` 不是單一個 YAML mapping（原因是 `invalid-yaml`、`multi-document` 或 `not-a-mapping`）。改成一份 YAML mapping。
- **PL-E15**：說明頁的 frontmatter 有 `title`、`description`、`layout` 以外的 key。把那些 key 移到 `challenge.yaml`。
- **PL-E16**：`challenge.yaml` 裡有說明頁的 key（`title`、`description` 或 `layout`）。把它們移到說明頁。
- **PL-E17**：題目的說明頁沒有設 `layout: challenge`。加上這一行。
- **PL-E18**：`layout: challenge` 設在別的頁面上，只有 `platform/<語系代碼>/challenge/<slug>/index.md` 可以用它。拿掉。

### fork 之後：改寫專案身分

帶必要參數執行 `fork:init`：

```bash
# 部署到 GitHub Pages
pnpm fork:init --author "<你的名字>" --repo <owner>/<repo> --host github-pages --site-name "<你的靶場名稱>"

# 部署到 Cloudflare Pages
pnpm fork:init --author "<你的名字>" --repo <owner>/<repo> --host cloudflare-pages --origin https://<你的專案>.pages.dev --site-name "<你的靶場名稱>"
```

它會改寫 `package.json` 的身分欄位、把上游的 GitHub 網址換成你的、依 `--site-name` 設定網站標題與兩個首頁的靶場名稱、依 `--origin`（或由 `--host github-pages` 推導）設定靶場網址（複製出來的每一條連結都從它開始），並依下表決定要不要從 `scripts/templates/deploy.yml.template` 把 `.github/workflows/deploy.yml` 裝上——這個 repo 本身沒有 deploy workflow（它透過下一節的 Cloudflare Pages 發布），所以新 fork 在那個位置沒有檔案，安裝會成功；如果你已經放了自己的 workflow，腳本不會覆蓋，只會發出警告。

| 既有 `.github/workflows/deploy.yml` | `--host github-pages` | `--host cloudflare-pages` | 不帶 `--host` |
|---|---|---|---|
| 不存在 | 安裝目前範本，並提示補 tag 規則 | 不動 | 安裝目前範本，並提示補 tag 規則 |
| 與目前範本相同 | 不動，不警告 | 刪除，並警告 | 不動，不警告 |
| 與已知舊範本輸出相同 | 取代為目前範本，並警告它是舊版輸出 | 刪除，並警告 | 保持原樣，警告內容不同、需要手動合併 |
| 其他（兩者皆非，可能是你自己客製的版本） | 能推導出 `SITE_BASE` 就保持並警告；不能就保持並警告改用 `--host github-pages` | 保持原樣，並警告 | 保持原樣，警告內容不同、需要手動合併 |

`create-wxl/package.json` 的 `repository.url` 這一行不會被改寫，在 GitHub fork 裡會繼續指向上游：它是上游發布 create-wxl 時 npm 比對用的欄位，只有 rebrand 模式（`--rebrand`）會連同其他上游網址一起換掉。用 `npm create wxl` 建立的靶場沒有 `create-wxl/` 資料夾，不受影響。

**`fork:init` 不保留任何狀態，每次執行都要帶齊參數**：它不會記得你上一次用了什麼設定，這一次沒帶的參數就當作「這次不改」，而不是「沿用上一次」——但有兩個例外，不管這次帶了什麼都照樣會動：(a) 不帶 `--host` 時，只要 `.github/workflows/deploy.yml` 還不存在就會裝回（見上表）；(b) `--host github-pages` 沒帶 `--origin` 時，靶場網址每次都會依 `--repo` 重新推導並覆寫，覆寫一個不是上游預設值的舊網址時會警告新舊網址。**Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages`**——如果某一次忘了帶、改用不帶 `--host` 的指令，**不帶 `--host` 執行會重新裝回 GitHub Pages workflow**，而這份 workflow 對一個 Cloudflare Pages 靶場毫無用處；自訂網域的 GitHub Pages 靶場同理每次都要帶 `--origin`，否則下一次沒帶 `--origin` 的 `--host github-pages` 執行會把靶場網址覆寫回推導值。rebrand 模式（`--rebrand`）不能和 `--host`／`--origin`／`--site-name` 一起用，部署設定要另外手動處理，細節見 `wxl-fork-init` skill。

`--host` 與 `--base` 互斥：帶 `--host`（不論哪一種）時，`.vitepress/config.mts` 的 base 定義一律回到上游這一行：

```ts
const siteBase = process.env.SITE_BASE || '/'
```

- **GitHub Pages 專案網站**（`https://<owner>.github.io/<repo>/`）→ `--host github-pages`。裝好的 workflow 會在部署時先執行 `configure-pages`，由 GitHub 自己算出這個網站的 base path 再交給建置流程，不管是專案網站、使用者網站還是未來換了自訂網域都一樣，原始碼裡再也沒有任何路徑寫死。沒有帶 `--origin` 時，靶場網址會依 `--repo` 推導成 `https://<owner>.github.io/<repo>`（使用者網站 `<owner>.github.io` 則省略路徑）；用了自訂網域要自己帶 `--origin`。
- **Cloudflare Pages 靶場** → `--host cloudflare-pages`，必須帶 `--origin https://<你的專案>.pages.dev`（或你的自訂網域，不能帶路徑）；這個指令不會裝 GitHub Pages 的 workflow。

> **短連結只在 Cloudflare Pages 上有效。** 短連結是 `platform/public/_redirects` 裡的規則，只有 Cloudflare Pages 會讀這個檔，所以在 GitHub Pages 的靶場上，短連結開不到題目。每道題目旁的複製按鈕，只有在 Cloudflare Pages 建置的靶場上才會複製短連結；其他靶場複製的是題目頁的網址。題目改名之後這個網址就會失效；而且只有 `.vitepress/challenge/shortLink.ts` 的 `SITE_ORIGIN` 是靶場的網址時，它才會開到這個靶場。
>
> `platform/public/_redirects` 由題目自動產生，不要手改；`pnpm create:challenge` 與 pre-commit hook 會在題目變動時重新產生它。它要跟題目一起 commit：GitHub Pages 不讀這個檔，但 CI 會檢查它和題目是否一致。如果 CI 回報它過期，執行 `pnpm redirects:generate` 再 commit 結果。
>
> 複製出來的短連結，兩種主語系下都帶它所在的頁面或清單的語系代碼：在英文頁面或清單上是 `/en/c/NNN`，在繁體中文的是 `/zh-TW/c/NNN`。每道有永久編號的題目，每個語系的連結都有；該語系沒有這道題目的版本時，開的是主語系的頁面。`/c/NNN` 是主語系的頁面。舊版發出的 `/c/NNN` 與 `/zh/c/NNN` 照樣打得開，只是不再發出。
>
> 主語系代碼的短連結與 `/c/NNN`，會跟著學習者的語系偏好走：選過翻譯語系的學習者，在這道題目有那個翻譯時會被帶到翻譯；沒有語系偏好的學習者，留在他打開的網址的語系，網站不替他換語系。翻譯代碼的短連結不跟著語系偏好走：這道題目有那個翻譯時，不論語系偏好為何都開那個翻譯；沒有時，開主語系那一頁。直接打開帶語系代碼的頁面（輸入、貼上、重新整理），會把學習者的語系偏好設成那個語系；帶主語系代碼的短連結開的是根目錄底下的頁面，不設定任何東西。
>
> 英文是主語系時，`/en/c/NNN` 開的是根目錄底下的英文頁，語系偏好是繁體中文的學習者可能被帶到繁體中文翻譯；繁體中文是主語系時，`/en/c/NNN` 開的是 `/en/challenge/<slug>/`，任何學習者都會看到英文。繁體中文是主語系的靶場，舊的 `/zh-TW/…` 網址會回到根：Cloudflare Pages 靠 `_redirects` 的規則，`/zh-TW/` 本身一條、`platform/zh-TW/` 的每個頂層頁面各一條、每個放有頁面的頂層資料夾各一條；其他任何舊網址，以及其他主機上的每個舊網址，靠找不到頁面的那一頁。`platform/public/zh-TW/` 底下的檔案照它自己的網址提供，不再被轉走；例外是路徑以這類資料夾的名稱開頭的檔案（例如 `platform/public/zh-TW/guide/…`），那個資料夾的規則仍會轉走它。新增或移除頂層頁面或資料夾會改變這些規則；pre-commit hook 會重新產生 `_redirects`。改了 `primaryLocale` 之後，要 commit `range.json`（pre-commit hook 會重新產生 `_redirects`）或執行 `pnpm redirects:generate`。還沒 commit 的 `range.json` 只改本機建置。從舊版升級到這一版的靶場，要重新產生 `_redirects` 才會有新的規則：CI 回報它過期時，執行 `pnpm redirects:generate` 再 commit 結果。

不帶 `--host` 時，這一行只依 `--base` 改寫；沒帶 `--base` 就維持原狀，可能還是上游原本那一行，也可能是前一次 `--base` 留下的字面值。`--base /<repo>/` 把這段路徑寫死進 `.vitepress/config.mts`；`--base none` 寫成字面值 `const siteBase = '/'`（不是清掉這一行）。**用 `--base` 的靶場，CI 的 site smoke 與 challenge 測試會失敗**——這兩種測試都從 `/` 出發操作頁面，寫死的子路徑會讓它們 404；改用 `--host github-pages` 把 base 交給部署當下決定，本機與 CI 的每一次建置都停在 `/`，就不會遇到這個問題。

`--site-name` 同時設定網站標題與兩個首頁的靶場名稱，接受大部分符號（包含引號、反斜線與 `$`），但拒絕 `<`、`>`、`&`，長度上限 60 個 Unicode code point（不是位元組或字母數）；部分不可見字元與控制字元（Cc、Cs、Zl、Zp 類別，以及大多數 Cf 類別）也會被拒絕，只有零寬連接符 U+200C／U+200D 例外。

GitHub Pages 的 fork 還有兩個設定在 GitHub 介面上，不在 repo 裡：

1. **Settings → Pages → Source** 要設成 **GitHub Actions**。
2. **`github-pages` environment** 除了允許 `main` 分支（`workflow_dispatch` 需要它），還要允許從 `v*` tag 部署。沒有這條規則，由 tag 觸發的部署 job 會被拒絕。

**同一個 owner 的 GitHub Pages 靶場共用瀏覽器儲存空間**：同一個 GitHub 帳號底下的每個 GitHub Pages 靶場，學習者的瀏覽器看到的是同一個瀏覽器 origin（scheme 加 host；跟 GLOSSARY.md 另一個標著攻擊紀錄是本機還是匯入來的 origin 詞條只是同名），一個靶場留下的紀錄，另一個靶場也讀得到、也清得掉；詳見 `.proj.specs/OPEN-QUESTIONS.md` 的 OQ-018。

### 部署到 Cloudflare Pages

<https://wxl.browserlab.online> 就是用這個方式發布的。

1. 在 Cloudflare Pages 建立新專案，連結 GitHub repo。
2. 設定建置指令：

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
     && . "$HOME/.cargo/env" \
     && cargo install wasm-pack --version 0.14.0 --locked \
     && pnpm install \
     && pnpm build
   ```

3. 輸出目錄設成 `.vitepress/dist`。
4. 環境變數加上 `NODE_VERSION=24`。
5. **Cloudflare Pages 靶場部署在網域根目錄**：只要是用 `--host cloudflare-pages` 設定出來的靶場，base 定義已經回到上游那行 `process.env.SITE_BASE || '/'`——Cloudflare Pages 的建置環境本身不會自動設定 `SITE_BASE`，所以這裡不需要加任何環境變數。但如果你先前在 Cloudflare Pages 專案設定裡手動加過 `SITE_BASE`，請現在刪除：留著的話它照樣會蓋掉這行字面值，而 `.vitepress/config.mts` 要求這個值要嘛是 `/`、要嘛是以 `/` 結尾的路徑，少了結尾斜線會讓建置直接丟出錯誤中止。

> **注意**：Cloudflare Pages 預設沒有 Rust 工具鏈。`wasm-pack` 是 Rust 執行檔，不是套件相依，`pnpm install` 不會提供它，所以上面的建置指令會先裝最小的 Rust 工具鏈和 `wasm-pack` 再建置。`wasm-pack` 固定為 CI 使用的 0.14.0，並加上 `--locked` 使用 wasm-pack 自己的 lockfile：不加的話 cargo 會重新解析最新的相容相依版本，某個相依的相容版本若全部被撤回（yanked），建置就會失敗（2026-10-16 的 `zip` 2.x 就是如此）。這裡沒有安裝 `wasm-tools`。`pnpm build` 會執行 `pnpm challenge:keygen`，它的 strip 與 mutate 會用到 `wasm-tools`，但沒有這個工具時只會各印一則警告，建置仍會成功，只是少了這兩個步驟。如果希望正式建置也做 strip 與 mutate，請在安裝那行加上 `cargo install wasm-tools --version 1.249.0 --locked`（與 CI 相同的版本）。

## 授權

本專案採用 [Educational Community License, Version 2.0（ECL-2.0）](LICENSE) 授權。
