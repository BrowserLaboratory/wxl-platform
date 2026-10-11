# 安全審查：T-0002（第 7 階段）

日期：2026-10-11。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `main` = `52bc03f`，merge-base `52bc03f`，HEAD `9337045`，分支 `tickets/T-0002/gate-truth-test-harness`。
- committed：`46a9adb`（T-0001 完成紀錄）、`9337045`（真話測試架構、`SessionGate.vue` 定位屬性、traceability 與 ticket）。
- pending：無。untracked：無。
- 方法：候選審查一輪（`harness-reviewer`）；兩則觀察再交給另一個獨立的 `harness-reviewer` 判斷是否為誤報。主 session 另外掃過兩個 commit 的 message 本文，沒有本機路徑、email、token 或 secret。全部是程式碼推論，沒有執行建置或瀏覽器。

## 結論

沒有確認的安全缺陷。產品程式碼唯一的改動是 `SessionGate.vue` 上五個沒有值的 `data-*` 屬性，條件、handler 與結構都沒變；其餘是只在 vitest 執行的測試程式與 Markdown。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| O-1 新的 `data-session-gate-*` 屬性會出現在正式版 DOM | Informational，信心 0.05 | 不是安全缺陷，信心 0.95。題目 iframe 是 `sandbox="allow-scripts allow-forms"`、沒有 `allow-same-origin`（`.vitepress/theme/components/BrowserPanel.vue:484`），讀不到父文件；父頁的 `postMessage` handler 檢查 `event.source` 並只接受兩種訊息型別（`BrowserPanel.vue:366-419`）；同源 script 本來就能直接讀 storage；能操作 gate 的標記在 base 就已存在 | 不處理 |
| O-2 `data-session-gate-raw-error` 標出原始錯誤字串 | Informational，信心 0.05 | 不是安全缺陷，信心 0.95。顯示在 base 就已存在；以 Vue 插值輸出，會跳脫；內容是瀏覽器產生的錯誤描述，只顯示給操作中的使用者 | 不處理 |
| O-3 測試 helper 還原 storage 方法後，實例上留下一個自有屬性 | 不是安全問題（測試品質） | — | 嘗試改成刪除自有屬性，但 happy-dom 的 storage 是 Proxy，`deleteProperty` 不允許刪除方法名稱；改回重新定義的做法，並在 helper 註解寫明這個限制。呼叫行為與替換前相同 |

## 給 epic 收尾串連分析的備註

O-1 的判斷以題目 iframe 不帶 `allow-same-origin` 為前提（`BrowserPanel.vue:484`）。這個屬性若被改掉，問題在 sandbox 本身，與這次的標記無關。信心 0.3，P2。

## 涵蓋範圍限制

- 未做：依賴套件弱點掃描（lockfile 未變動）、可用性與阻斷服務、低嚴重度 hardening、跨 ticket 的串連分析（epic 收尾時做）。
- 「測試程式不會進正式版 bundle」是從 `.vitepress/config.mts` 的 `srcDir`、import 關係與 `devDependencies` 推論，沒有實際檢查 bundle 內容。
- 本變更沒有碰到 `platform/challenge/*/src/`，不涉及 ADR-0005 的刻意教學弱點。
- 本報告不代表整個專案沒有安全問題。
