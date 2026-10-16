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
| `pnpm test:smoke` | 對建置好的網站執行 Playwright smoke 測試 |
| `pnpm wasm:build` | 建置所有 Rust WASM 模組 |
| `pnpm wasm:test` | 執行 Rust 單元測試（`cargo test`） |
| `pnpm wasm:tools` | 嘗試把 `wasm-tools` 裝進 Rust 工具鏈；失敗也不會報錯、一律以 0 結束，請用 `wasm-tools --version` 確認 |
| `pnpm fork:init` | fork 之後改寫專案身分（作者、GitHub 網址、短連結網址、網站名稱，以及依 `--host` 決定的部署設定）。必須帶 `--author` 和 `--repo`；每次執行都要帶齊參數，`--host` 與 `--base` 互斥；套件名稱只在帶 `--name` 或 `--rebrand` 時才會改 |
| `pnpm challenge:keygen` | 為每一題產生加密的 WASM 模組 |
| `pnpm create:challenge` | 依參數建立新題目的骨架；必須帶 `--name <slug>`，不帶參數會印出用法並以 1 結束 |
| `pnpm challenge:validate` | 檢查每一題的 frontmatter 與檔案結構 |
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

每一題是一個 Markdown 檔，用 YAML frontmatter 宣告設定：

```yaml
---
title: Need to Know      # 必填
layout: challenge        # 套用題目介面；沒有這行會顯示成一般文件頁
backend: fastapi         # 必填：flask | fastapi | php
app: app.py              # 必填：相對於該題 src/ 的路徑
difficulty: easy
category: web
packages: []             # 透過 micropip 額外安裝的 Python 套件
tools: [ browser, network, repeater, code ]   # 省略時就是這四個；
                                              # 明確列出可以縮小範圍，
                                              # 但拿掉 browser 也會被加回來
source_visible: false    # true = 白箱題，false = 黑箱題（預設）
wasmModule: /challenge/door-is-open/runtime.wasm  # 由 keygen 產生
---
```

題目的原始碼由掃描該題的 `src/` 目錄取得。舊的 `fs:` 對應寫法為了相容仍可使用，但驗證工具會發出棄用警告，新題目一律用 `src/` 掃描。

## 參與貢獻

分支策略、PR 流程與 commit 慣例請見 [CONTRIBUTE.md](CONTRIBUTE.md)。

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

不想 fork 整個 repo，也可以用這個指令直接建立一個全新的靶場資料夾（需要 Node.js >= 22.6）：

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

> 這個指令要等 `create-wxl` 發布到 npm 之後才能用；這份 README 隨本次變更先合進 main，發布前執行會拿到還沒正式發布的佔位版本。

### fork 之後：改寫專案身分

帶必要參數執行 `fork:init`：

```bash
# 部署到 GitHub Pages
pnpm fork:init --author "<你的名字>" --repo <owner>/<repo> --host github-pages --site-name "<你的靶場名稱>"

# 部署到 Cloudflare Pages
pnpm fork:init --author "<你的名字>" --repo <owner>/<repo> --host cloudflare-pages --origin https://<你的專案>.pages.dev --site-name "<你的靶場名稱>"
```

它會改寫 `package.json` 的身分欄位、把上游的 GitHub 網址換成你的、依 `--site-name` 設定網站標題與兩個首頁的靶場名稱、依 `--origin`（或由 `--host github-pages` 推導）設定短連結網址，並依下表決定要不要從 `scripts/templates/deploy.yml.template` 把 `.github/workflows/deploy.yml` 裝上——這個 repo 本身沒有 deploy workflow（它透過下一節的 Cloudflare Pages 發布），所以新 fork 在那個位置沒有檔案，安裝會成功；如果你已經放了自己的 workflow，腳本不會覆蓋，只會發出警告。

| 既有 `.github/workflows/deploy.yml` | `--host github-pages` | `--host cloudflare-pages` | 不帶 `--host` |
|---|---|---|---|
| 不存在 | 安裝目前範本，並提示補 tag 規則 | 不動 | 安裝目前範本，並提示補 tag 規則 |
| 與目前範本相同 | 不動，不警告 | 刪除，並警告 | 不動，不警告 |
| 與已知舊範本輸出相同 | 取代為目前範本，並警告它是舊版輸出 | 刪除，並警告 | 保持原樣，警告內容不同、需要手動合併 |
| 其他（兩者皆非，可能是你自己客製的版本） | 能推導出 `SITE_BASE` 就保持並警告；不能就保持並警告改用 `--host github-pages` | 保持原樣，並警告 | 保持原樣，警告內容不同、需要手動合併 |

**`fork:init` 不保留任何狀態，每次執行都要帶齊參數**：它不會記得你上一次用了什麼設定，這一次沒帶的參數就當作「這次不改」，而不是「沿用上一次」——但有兩個例外，不管這次帶了什麼都照樣會動：(a) 不帶 `--host` 時，只要 `.github/workflows/deploy.yml` 還不存在就會裝回（見上表）；(b) `--host github-pages` 沒帶 `--origin` 時，短連結網址每次都會依 `--repo` 重新推導並覆寫，覆寫一個不是上游預設值的舊網址時會警告新舊網址。**Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages`**——如果某一次忘了帶、改用不帶 `--host` 的指令，**不帶 `--host` 執行會重新裝回 GitHub Pages workflow**，而這份 workflow 對一個 Cloudflare Pages 靶場毫無用處；自訂網域的 GitHub Pages 靶場同理每次都要帶 `--origin`，否則下一次沒帶 `--origin` 的 `--host github-pages` 執行會把短連結網址覆寫回推導值。rebrand 模式（`--rebrand`）不能和 `--host`／`--origin`／`--site-name` 一起用，部署設定要另外手動處理，細節見 `wxl-fork-init` skill。

`--host` 與 `--base` 互斥：帶 `--host`（不論哪一種）時，`.vitepress/config.mts` 的 base 定義一律回到上游這一行：

```ts
const siteBase = process.env.SITE_BASE || '/'
```

- **GitHub Pages 專案網站**（`https://<owner>.github.io/<repo>/`）→ `--host github-pages`。裝好的 workflow 會在部署時先執行 `configure-pages`，由 GitHub 自己算出這個網站的 base path 再交給建置流程，不管是專案網站、使用者網站還是未來換了自訂網域都一樣，原始碼裡再也沒有任何路徑寫死。沒有帶 `--origin` 時，短連結網址會依 `--repo` 推導成 `https://<owner>.github.io/<repo>`（使用者網站 `<owner>.github.io` 則省略路徑）；用了自訂網域要自己帶 `--origin`。
- **Cloudflare Pages 靶場** → `--host cloudflare-pages`，必須帶 `--origin https://<你的專案>.pages.dev`（或你的自訂網域，不能帶路徑）；這個指令不會裝 GitHub Pages 的 workflow。

> **短連結只在 Cloudflare Pages 上有效。** 短連結是 `platform/public/_redirects` 裡的規則，只有 Cloudflare Pages 會讀這個檔。在 GitHub Pages 的靶場上，所有頁面都正常，但印在講義上的短連結會連到 404。

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
