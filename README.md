# Web eXploitation Laboratory (WXL)

**繁體中文** | [English](README.en.md)

> 完全跑在瀏覽器裡、以 WebAssembly 驅動的 web 資安練習平台，不需要任何後端伺服器。

[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)
[![License: ECL-2.0](https://img.shields.io/badge/License-ECL--2.0-blue.svg)](LICENSE)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha.16-green.svg)](https://vitepress.dev)
[![pnpm](https://img.shields.io/badge/pnpm-10.28.0-orange.svg)](https://pnpm.io)

## 簡介

**Web eXploitation Laboratory（WXL）** 是 CTF 風格的 web 資安練習平台。每一題都完全在瀏覽器裡執行：WebAssembly 模擬出真實的後端環境，所以不必架設任何伺服器就能部署和使用。

它的目標是讓老師不用架伺服器就能備課，也讓學生回家可以繼續練習。fork 這個 repo、執行 `pnpm fork:init`，就能把自己的靶場發布到 Cloudflare Pages 或 GitHub Pages。這個 repo 附有四道示範題，線上網站在 <https://wxl.browserlab.online>。

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
- **wasm-pack**（`cargo install wasm-pack`）：它不是套件相依，要安裝到 Rust 工具鏈裡
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
| `pnpm fork:init` | fork 之後改寫專案身分（作者、GitHub 網址，以及選擇性的 VitePress `base`）。必須帶 `--author` 和 `--repo`；套件名稱只在帶 `--name` 或 `--rebrand` 時才會改，腳本也從不寫入 `SITE_BASE` 環境變數 |
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

### fork 之後：改寫專案身分

帶必要參數執行 `fork:init`：

```bash
pnpm fork:init --author "<你的名字>" --repo <owner>/<repo> --base <見下方說明>
```

它會改寫 `package.json`、把上游的 GitHub 網址換成你的、依 `--base` 設定或清除 VitePress 的 `base`，並把 `scripts/templates/deploy.yml.template` 複製成 `.github/workflows/deploy.yml`，這是一份可以直接使用的 GitHub Pages workflow。這個 repo 本身沒有 deploy workflow（它透過下一節的 Cloudflare Pages 發布），所以新 fork 在那個位置沒有檔案，複製會成功。如果你已經在那裡放了自己的 workflow，腳本不會覆蓋，只會發出警告。

**`--base` 決定你的網站資源載不載得到。** VitePress 會把 base 路徑寫進每一個資源網址：

- **GitHub Pages 專案網站**（`https://<owner>.github.io/<repo>/`）→ `--base /<repo>/`。這個參數會把路徑直接寫進 `.vitepress/config.mts`。複製過去的 workflow 刻意不設 `SITE_BASE` 環境變數，所以子路徑網站能運作，全靠這行寫死的路徑。
- **使用者或組織網站、根目錄的自訂網域、Cloudflare Pages** → `--base none`，移除 `base` 宣告，讓 VitePress 從 `/` 提供網站。

不帶 `--base` 時，上游那行依環境變數決定的 `base: process.env.SITE_BASE ?? '/'` 會保留下來。這個寫法是給本 repo 自己的工具用的，`SITE_BASE` 可能由建置環境提供；在 fork 裡沒有人設定它，所以網站會建在 `/`。部署在根目錄時這是對的，部署成 GitHub Pages 專案網站時則每個資源都會 404。

> **用 `--base /<repo>/` 之後在本機測試要注意。** 寫死的 base 對每一次建置都有效，包括本機。`pnpm test:smoke` 和 `pnpm challenge:verify` 的 L3 階段會開根目錄相對路徑，對子路徑建置的網站會 404。測試時請暫時清掉 base，或把測試的網址改成子路徑。

`fork:init` 不會改短連結的網址。請把 `.vitepress/challenge/shortLink.ts` 的 `SITE_ORIGIN` 改成你自己網站的網址，否則你網站複製出去的短連結都會指回這個網站。

> **短連結只在 Cloudflare Pages 上有效。** 短連結是 `platform/public/_redirects` 裡的規則，Cloudflare Pages 會讀這個檔，GitHub Pages 不會。在 GitHub Pages 的 fork 上，所有頁面都正常，但印在講義上的短連結會連到 404。

GitHub Pages 的 fork 還有兩個設定在 GitHub 介面上，不在 repo 裡：

1. **Settings → Pages → Source** 要設成 **GitHub Actions**。
2. **`github-pages` environment** 除了允許 `main` 分支（`workflow_dispatch` 需要它），還要允許從 `v*` tag 部署。沒有這條規則，由 tag 觸發的部署 job 會被拒絕。

### 部署到 Cloudflare Pages

<https://wxl.browserlab.online> 就是用這個方式發布的。

1. 在 Cloudflare Pages 建立新專案，連結 GitHub repo。
2. 設定建置指令：

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
     && . "$HOME/.cargo/env" \
     && cargo install wasm-pack \
     && pnpm install \
     && pnpm build
   ```

3. 輸出目錄設成 `.vitepress/dist`。
4. 環境變數加上 `NODE_VERSION=24`。
5. 網站放在子路徑時，加上 `SITE_BASE` 並設成那個路徑（部署在根網域時不要設）。

> **注意**：Cloudflare Pages 預設沒有 Rust 工具鏈。`wasm-pack` 是 Rust 執行檔，不是套件相依，`pnpm install` 不會提供它，所以上面的建置指令會先裝最小的 Rust 工具鏈和 `wasm-pack` 再建置。這裡沒有安裝 `wasm-tools`。`pnpm build` 會執行 `pnpm challenge:keygen`，它的 strip 與 mutate 會用到 `wasm-tools`，但沒有這個工具時只會各印一則警告，建置仍會成功，只是少了這兩個步驟。如果希望正式建置也做 strip 與 mutate，請在安裝那行加上 `cargo install wasm-tools --version 1.249.0 --locked`（與 CI 相同的版本）。

## 授權

本專案採用 [Educational Community License, Version 2.0（ECL-2.0）](LICENSE) 授權。
