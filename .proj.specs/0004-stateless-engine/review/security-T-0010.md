# 第 7 階段資安審查：T-0010

範圍：分支 `tickets/T-0010/upstream-base-from-site-base`，base 與 merge-base `c0f7edf`，HEAD `0c03bda`（`0769135` 文件、`0c03bda` 程式）。審查 `git diff main...HEAD`，排除 `.proj.specs/`、`.proj.tickets/`、`GLOSSARY.md`（純文件）。沒有 pending 或 untracked 變更。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，都只讀檔、沒有執行程式。依 ADR-0005，題目的刻意弱點不算 finding；本次變更只涉及平台與 CI。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 5 項，全部 LOW，經獨立篩選都判定不擋 landing。

| 候選 | 位置 | 內容 | 引入或既有 | 篩選判定 | 處置 |
|---|---|---|---|---|---|
| C1 | `scripts/templates/deploy.yml.template` workflow 層級 `permissions` | build job 繼承 `pages: write`、`id-token: write`；configure-pages 只需 `pages: read` | 既有（與凍結基準相同） | reject：hardening，沒有具體攻擊路徑；移動 configure-pages 沒有讓不受信任的程式更早拿到更多權限（`pnpm install` 兩版都在它之前） | 記錄為既有 hardening 建議：權限下放到 job 層級 |
| C2 | 範本的 `actions/checkout` | 預設 `persist-credentials: true` | 既有 | reject：token 只留在 runner 本機，上傳的 artifact 是 `.vitepress/dist`、不含 `.git` | 記錄為既有 hardening 建議 |
| C3 | 範本、config、`challenge-sw.js` 的 `REGISTER_CHALLENGE` | 同一個 owner 的 GitHub Pages 靶場共用 origin，SW 不檢查訊息來源 | 既有；SW 的 scope 與 origin 模型沒變（專案站以前 `--base /<repo>/`、現在 `SITE_BASE=/<repo>/`，scope 相同） | reject：spec 0004 B5 已列為不保護、OQ-018 追蹤；同源本來就能完全控制，補 `event.source` 守不住這條邊界 | OQ-018 附註：本 ticket 讓專案站的 base 自動化，可運作的同源靶場可能變多 |
| C4 | `scripts/fork-init.ts` 的 `setViteBase`、`BASE_RE` | 現行 `--base` 會把 `base: siteBase,` 收成字面值，favicon 仍跟 `SITE_BASE`；`BASE_RE` 接受 `/../` | 混合：不一致的形式由本 diff 造成，但結果不比以前差（以前 favicon 也不跟字面值 base） | reject（資安）：只影響可用性；字元集排除引號與 `$`，無法注入（B1 仍成立） | 功能面由 T-0014 承接（見該 ticket 紀錄） |
| C5 | 範本的 Rust toolchain、apt `binaryen`、cache | 浮動的 stable、沒釘版的 apt 套件 | 既有 | reject：hardening；cache 只在同 repo 的 ref 範圍，觸發條件不接受 fork PR | 記錄為既有供應鏈 hardening 建議 |

## 已檢查、沒有發現問題

- `SITE_BASE` 寫進 head href：base 文法的正規式只允許 ASCII unreserved 字元、每段至少一個字元（擋掉 `//evil/`）、不用 `m` flag；VitePress 渲染屬性時也會跳脫。錯誤訊息以 `JSON.stringify` 回顯，只出現在 build log。
- GitHub Actions expression：`${{ steps.pages.outputs.base_path }}` 放在 `env:`，沒有進 `run:`；值來自 GitHub 的 Pages 設定。
- 觸發條件仍只有 `v*` tag 與 `workflow_dispatch`；所有 action 仍以 SHA 釘版，沒有新增 action。
- configure-pages 沒設 `enablement`、`static_site_generator`，只輸出 outputs，不改檔也不改 Pages 設定。

## 沒有涵蓋

dependency scanning、可用性與 rate limiting、低嚴重度 hardening 的修正（只記錄）；`quality-gates.yml`、`release.yml` 不在本次 diff，只確認它們沒有讀取 `SITE_BASE`。本報告不代表整個專案沒有安全問題。跨 ticket 的 chain analysis 留到 epic 收尾。
