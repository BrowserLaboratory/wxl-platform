---
name: wxl-fork-init
description: Use when forking or template-cloning this repo into a new project. Drives the deterministic `pnpm fork:init` CLI to reset package.json identity, choose the deploy host and base via `--host`, set the short-link origin and site name, swap GitHub URLs, add the Pages deploy workflow, and (optionally) rebrand the `wxl` short-name — instead of hand-editing files. Keywords fork, template, 分叉, rebrand, --host, --origin, --site-name, base path, GitHub Pages 404, deploy.yml, package.json identity, ECL-2.0.
---

# WXL Fork 最小改動（script-driven）

## Overview

把本 repo fork／template-clone 成新專案時，要動的檔案其實很少，而且**全是確定性編輯**。本 skill 不再逐檔手改，而是收集意圖與參數後呼叫 `pnpm fork:init` CLI（`scripts/fork-init.ts`）完成，最後以 grep 驗收。這比 LLM 逐檔讀寫省 token，且 rebrand 的 runtime 敏感鍵處理由 CLI 分類、可測試、可審計。

兩種意圖，工作量差很多：

- **A（沿用 WXL 品牌）**：只是拿 template 加自己的題目 → `pnpm fork:init`（不帶 `--rebrand`）。
- **B（rebrand 全新產品名）**：另加 `--rebrand <newname>`。CLI **只自動改**可證明的完整 token——上游 repository slug 與四個 runtime 敏感鍵——其餘含 `wxl` 者（品牌散字、`wxlsh` 子系統、Title-case、skill/spec 目錄）以誠實的 `file:line` inventory 列出交你人工判斷；**CLI 不會宣稱 rebrand 已完成**，直到 inventory 清空為止（用 create-wxl 建立的靶場例外：根目錄 `range.json` 的上游 slug 會一直留在 inventory 裡，見 Verification）。

何時**不適用**：只是在既有 repo 內開發、或只想改幾個字串——直接編輯即可，不需本 skill。

> ⚠️ fork **不會**繼承 upstream 的 branch protection ruleset；新 repo 的保護規則要自己重設。CLI **不做**任何 GitHub 遠端操作。

### 前置需求

新環境要能 `pnpm build`：Node.js ≥ 22.6、pnpm（corepack）、Rust toolchain（rustup）、wasm-pack（`cargo install wasm-pack`）。binaryen（`wasm-opt`）與 wasm-tools 為選用：缺席時 keygen 只印警告並沿用未最佳化／未 strip 的產物，建置仍會成功。

## Workflow

### Step 1: 偵測 A/B 意圖並收集參數

- **What**: 決定 A（沿用品牌）或 B（rebrand），並收集 CLI flags。
- **How**: 以純文字問題區塊詢問並等使用者回覆：

  ```
  📋 Fork 意圖：
    1) A — 沿用 WXL 品牌（最小 fork）
    2) B — rebrand 成全新產品名
  Please reply with `1` or `2`.
  ```

  再收集：`--author <你的名字>`、`--repo <owner/repo>`（新 repo）、`--host github-pages` 或 `--host cloudflare-pages`（見下方決策；與 `--base` 互斥）、選填 `--origin <https://...>`（Cloudflare Pages 必帶，不能帶路徑；GitHub Pages 省略時會自動推導）、選填 `--site-name <靶場名稱>`（設定網站標題與首頁名稱）。B 另收集 `--rebrand <newname>`（新短名，不得含 `wxl`，且不能和 `--host`／`--origin`／`--site-name` 同時出現），選填 `--name <pkg-name>`、`--description <文案>`。
- **Verification**: 已知 `--author` 與合法 `--repo`（`owner/repo`）；A 另有已選 `--host`（Cloudflare Pages 另有合法 `--origin`）；B 另有 `--rebrand`。

`host`／`base` 決策（A 模式，沿用品牌）：
- 部署到 GitHub Pages 專案站（`<owner>.github.io/<repo>/`）、使用者站（`<owner>.github.io`），或日後要換成自訂網域 → `--host github-pages`；base path 由部署時的 `configure-pages` 動作自動算出，不用再寫死路徑。沒帶 `--origin` 時短連結網址依 `--repo` 推導；換成自訂網域要自己帶 `--origin`。
- 部署到 Cloudflare Pages → `--host cloudflare-pages`，必帶 `--origin https://<project>.pages.dev`（或你的自訂網域，不能帶路徑）。
- 完全不帶 `--host` 時，`--base '/<repo>/'`／`--base none` 才會生效，直接把路徑寫死進 `.vitepress/config.mts`；漏帶 `--host` 的症狀是：頁面能開但 CSS／JS／WASM 全 404，或部署目標換了之後路徑沒跟著變。

B 模式（`--rebrand`）決策：`--rebrand` 不能和 `--host`／`--origin`／`--site-name` 同時出現（CLI 會直接拒絕），只能用 `--base` 決定 base path：GitHub Pages 專案站用 `--base '/<repo>/'`，根目錄（使用者站、自訂網域、Cloudflare Pages）用 `--base none`。部署到 Cloudflare Pages 時，B 模式裝回的 GitHub Pages workflow 要自己手動刪除；短連結網址（`SITE_ORIGIN`）與網站標題、首頁靶場名稱也都要手動改，CLI 在 B 模式不會動這幾處。

### Step 2: dry-run 預覽

- **What**: 先預覽 CLI 規劃的所有編輯與敏感鍵處理，不落地。
- **How**: 執行 `pnpm fork:init <flags> --dry-run`，把輸出（Changed files 清單、B 模式的 sensitive keys 報告）呈現給使用者確認。
- **Verification**: 使用者確認變更清單合理；工作樹尚未被改動。

### Step 3: 正式執行

- **What**: 套用確定性編輯。
- **How**: 執行 `pnpm fork:init <flags>`（不帶 `--dry-run`）。CLI 會改 package.json 身分欄位、把固定幾處的上游 repository slug `BrowserLaboratory/wxl-platform` 錨點（README／README.en／CONTRIBUTE，各自固定的網址或指令形狀）換成 `--repo`、依 `--site-name` 設定網站標題與首頁名稱、依 `--origin`（或由 `--host github-pages` 推導）設定短連結網址，並依 `--host` 決定部署 workflow 怎麼處理——四種既有狀態（不存在／與目前範本相同／與已知舊範本相同／其他）在三種 `--host` 下各自的對應，見 README 的狀態表，這裡不重複；兩種 `--host` 都會把 `.vitepress/config.mts` 的 base 定義還原成上游那行，base path 改由部署環境決定。B 模式會先對整棵樹（排除 `.git`／`node_modules`／`.claude`／`.agents`／`.codex`、`pnpm-lock.yaml`、`.vitepress/dist`／`.vitepress/cache`、CLI 自身與其測試）做上游 repository slug 與四個 runtime 敏感鍵的結構化 rename，並列出敏感鍵報告；其餘含 `wxl` 者列於 **residual inventory**（`file:line`，如 `Wxlsh`、`wxlsh` 子系統、`scripts/wxl-solver` 路徑引用）。含 `wxl` 的 `--repo`／`--author` 由建構保證不被誤改（無 sentinel）。
- **Verification**: CLI exit 0；結尾摘要列出變更檔、（B）已改敏感鍵與 residual inventory；有殘留時訊息會聲明 rebrand 未完成。

### Step 4: 驗收

- **What**: 確認零殘留 upstream 身分並可建置。
- **How**: 跑下方 Verification 段的 grep 與 build。

## Anti-patterns

- ❌ **逐檔手動改 package.json／config.mts／README 等（繞過 CLI）。**
  - ✅ 一律 `pnpm fork:init`；機械編輯是確定性的，交給 script 省 token 又不易漏。
  - **Why**: 手改易漏欄位（尤其漏帶 `--host`，導致部署設定跟實際靶場不符、整站資源 404），且浪費 token。
- ❌ **rebrand 時用 `sed` 全域盲改 `wxl`。**
  - ✅ 用 `pnpm fork:init --rebrand`（先 `--dry-run`）。CLI **刻意不做盲目全域取代**：`wxl` 在本 repo 橫跨多個語意獨立家族（品牌短名、`wxlsh` 子系統／`X-Wxlsh-*` wire header、四個 runtime 敏感鍵、上游 repository slug、skill/spec 目錄名），盲改會把該保留者攪壞（如 `wxlsh`→`xsh`、slug 變死連結）。CLI 只自動改可證明的完整 token（slug + 4 敏感鍵，結構化替換並分類報告），其餘以 `file:line` inventory 交你按家族人工判斷，並**永不誤報 clean**。
  - **Why**: 盲 sed 會靜默改壞不同子系統或身分字串；本 CLI 把「哪些安全可自動改、哪些需人工」變成可見、可審計。改名後若涉及既有資料，仍需自行做 storage／env 遷移（fresh fork 無既有使用者則無妨）。`.claude`/`.agents`/`.codex` skill 識別字、`.vitepress/dist`、工具自身 `scripts/fork-init.ts` 與其測試不在改寫範圍內。
- ❌ **刪除 `LICENSE` 或原始 attribution。**
  - ✅ 保留 `LICENSE`（ECL-2.0）與既有著作權標示；改 `package.json.author` 後建議於 README 保留 upstream 出處；有實質修改時於顯著處註明。
  - **Why**: 違反 ECL-2.0（Apache 家族 attribution 要求）。
- ❌ **以為 CLI 會建 GitHub repo 或 push。**
  - ✅ CLI 只做本機檔案編輯；建 repo／push／設 ruleset 要自己來。

## Verification

改完後確認沒有殘留 upstream 身分：

```bash
git grep -n "BrowserLaboratory/wxl-platform" -- README.md README.en.md CONTRIBUTE.md package.json
git grep -nE "CXPh03n1x|CXPhoenix" -- .
```

第一條只在這四個檔案裡找，而且只適用 A 模式（不帶 `--rebrand`）：A 模式下，上游 repository slug 只被改寫這幾個檔案固定的錨點位置，其餘檔案（包含 `CHANGELOG.md`、`.proj.specs/`、`.proj.tickets/`）都不會被動到，所以照樣保留這個 slug 當紀錄或識別字；對整庫跑 `-- .` 會在那些地方正常命中，不代表殘留。`scripts/fork-init.ts` 與它的測試、兩棵 `wxl-fork-init/SKILL.md`（在 `.claude`／`.agents` 目錄下，兩種模式都不會被改寫）則不論哪個模式都保留這個 slug。B（`--rebrand`）模式會整樹替換，`CHANGELOG.md`、`.proj.specs/`、`.proj.tickets/` 的 slug 也會一併換掉；要判斷 B 模式有沒有殘留，請用 CLI 輸出的 **residual inventory**（`file:line`），不要用這條只適用 A 模式的 grep。第二條回傳你自己的身分或零殘留（`package.json.author` 若刻意保留 upstream attribution 則例外）。residual inventory 列出的檔案（品牌散字、Title-case 如 `Wxlsh`、`wxlsh` 子系統、路徑引用如 `scripts/wxl-solver`）需你按家族人工判斷並改名；上游 repository slug 與四個敏感鍵已由 CLI 自動改名，不會出現在這份清單裡。根目錄的 `range.json`（create-wxl 建立靶場時寫入的設定紀錄）是例外：兩種模式都不會改寫它，所以它的上游 slug 在 A 模式對整庫跑 `-- .` 時、以及 B 模式的 residual inventory 裡都會出現，屬於預期結果，不代表殘留未處理；這個靶場的 rebrand 因此會一直顯示未完成。**不要手動改掉 `range.json` 的 `upstream.repository`**：升級靠它找回上游的舊版，改掉後升級會停下並要求用 `--from` 指出版本。接手別人的靶場時，先確認 `range.json` 的 `upstream.commit` 是上游某個發布版本的 commit。CLI 在 inventory 非空時會明確聲明 rebrand 未完成，不會誤報 clean。`.claude`/`.agents`/`.codex` 為結構性 skill 識別字，刻意不由 CLI 改名（兩種模式皆然）。

本機能建置＋預覽（用 `--host` 時 base 由部署環境決定，本機預覽固定在 `/`；只有不帶 `--host` 改用 `--base` 時才要自己確認 asset 不 404）：

```bash
pnpm install && pnpm build && pnpm docs:preview
```

`--origin`（或由 `--host github-pages` 推導）已經把 `.vitepress/challenge/shortLink.ts` 的 `SITE_ORIGIN` 改成你自己的網址；只有完全沒帶 `--origin` 也沒帶 `--host` 時才需要自己手改，否則複製出去的短連結會指向原本的網站。部署在 GitHub Pages 時，短連結（`platform/public/_redirects`）不會生效，只有 Cloudflare Pages 會讀這個檔。
