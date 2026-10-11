# 安全審查：T-0001（第 7 階段）

日期：2026-10-11。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `main` = `72327e2`，merge-base `72327e2`，HEAD `6b39d2a`，分支 `tickets/T-0001/rename-database-deleted-flag`。
- committed：`71bc8af`（spec、審查紀錄、ticket、`CONTEXT.md`）、`6b39d2a`（旗標改名、兩段說明、單元測試）。
- pending：無。untracked：無。
- 方法：候選審查一輪（`harness-reviewer`），每個候選再交給另一個獨立的 `harness-reviewer` 判斷是否為誤報。兩輪都只讀程式碼推論，沒有執行建置、測試或瀏覽器。

## 結論

沒有確認的安全缺陷。三個候選經獨立複核，都判定為「不是安全缺陷」；其中一個違反專案規則，一個推翻了先前的一句說法，處置列在下方。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| S-1 已 commit 的審查報告含本機 home 絕對路徑與指向 `node_modules`、`dist` 雜湊檔的引用 | Low，`data_exposure`／違反專案規則 | 違規屬實，不是安全缺陷（使用者名稱在 base 已公開；沒有憑證；不進建置產物）。違規信心 0.7，可被利用 0.05 | 待使用者裁決（見 ticket 紀錄） |
| S-2 改名不留別名，加上專案沒有型別檢查，自訂過 gate 元件的 fork 會在建置時靜默拿到 `undefined` | Low，UI 層防護失效／fork 相容性 | 作為安全缺陷是誤報（composable 內的防護都讀內部狀態，照常拒絕「沿用」與進度存取；沒有資料外洩路徑）。但「建置或型別檢查會明確報錯」這句說法不成立：建置以 esbuild 剝除型別、不做型別檢查，CI 也不跑 `vue-tsc` | PR 說明與 release note 要寫明「舊名稱會靜默變成 `undefined`」；修正先前的說法 |
| S-3 其他註解與測試名稱仍寫「作品已刪」，跟新的旗標說明矛盾 | Informational | 屬實，不是安全缺陷；所有位置都在 T38／T39 清單內，由 T-0008 處理 | 維持由 T-0008 處理 |

### S-2 的建置期依據（獨立複核讀過的工具鏈）

- VitePress 2.0.0-alpha.16 內建 `@vitejs/plugin-vue` 6.0.7、vite 7.3.3、esbuild 0.27.7（`pnpm-lock.yaml`）。
- `.vitepress/config.mts` 的 plugins 沒有型別檢查；`package.json` 沒有 typecheck script；`.github/workflows/quality-gates.yml` 不呼叫 `vue-tsc`。
- `<script setup lang="ts">` 的解構會編譯成一般 JS，讀不到的鍵得到 `undefined`，不會有編譯錯誤。

## 涵蓋範圍限制

- 未做：依賴套件弱點掃描（lockfile 未變動）、可用性與阻斷服務、低嚴重度 hardening、跨 ticket 的串連分析（epic 收尾時做）。
- 本變更沒有碰到 `platform/challenge/*/src/`，不涉及 ADR-0005 的刻意教學弱點。
- 所有判斷都是程式碼推論；`vue-tsc` 100 個既有錯誤的數字來自 T-0001 ticket 紀錄，複核者沒有重跑。
- 本報告不代表整個專案沒有安全問題。base 既有檔案裡也有本機路徑（例如 `.claude/skills/humane-prose-audit/` 內），不在本次 diff 範圍。
