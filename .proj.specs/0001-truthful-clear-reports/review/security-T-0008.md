# 安全審查：T-0008（第 7 階段）

日期：2026-10-14。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `7c85be2`，merge-base `7c85be2`，HEAD `c26d2ba`，分支 `tickets/T-0008/retire-stale-comments-and-tests`。
- committed：`9a73a16`（T-0007 完成紀錄，只有 Markdown）、`c26d2ba`（gate 的程式註解、測試註解，以及 T-0008、T-0009 的 ticket）。
- pending：無。untracked：無相關檔案。
- 方法：
  - 候選審查一輪（`harness-reviewer`）。這一輪的 reviewer 自己也做了誤報判斷，獨立性不夠，所以主 session 再把六個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否誤報。
  - 主 session 對照 `index.ts` 確認：`evaluate` 只在 Layout mount 時呼叫一次，而且 decision watcher 看到 `cleared` 就會自己停止。
  - 主 session 掃過 commit message 本文：沒有本機路徑、email、token 或 secret。
  - 安全判斷都是程式碼推論。

## 結論

沒有確認的安全缺陷。這次變更只改註解與 Markdown，沒有任何可執行程式碼變動。兩個 reviewer 都逐行確認過，也確認新文字沒有提前結束 JSDoc（`*/`）或 HTML 註解（`-->`）。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| C1 `evaluate` 裡 `if (databaseDeletedState.value) return` 的新註解說，它能防止 `cleared` 被覆寫而放行一次跟重新載入競爭的導覽 | Low（防護說明不實），信心 0.7 | 事實成立，而且比候選描述的更明確：`evaluate` 只在 mount 時跑一次；watcher 看到 `cleared` 已經停止；marker 寫入成功的常見路徑本來就會改寫成 `not-needed`。所以註解宣稱的保護不存在。不是漏洞，信心 0.85 | 已修正（這段註解是第 6 階段寫的）：改成防護縱深，並註明現行程式中沒有路徑帶著旗標走到這裡 |
| C2 `shouldPresentGateHere` 說明寫「gate 要顯示的每個狀態 `clearStarted` 都已設定」，少了「旗標為真時」 | Low／Info，信心 0.6 | 照字面讀是錯的（第一次詢問時 `clearStarted` 為 false）；「旗標不會單獨成立」要靠 `evaluate` 只在 mount 時跑一次才成立。不是漏洞，信心 0.8 | 已修正 |
| C3 `index.ts` 說語系導向延後的目的「尚未定案」，可能有人因此把延後拿掉 | Info | 導向目標經過驗證，只在 base 內換 locale 前綴，不是 open redirect；就算拿掉延後，也只是一次站內導覽。不是漏洞，信心 0.9 | 不處理；這個問題已交給 T-0009 |
| C4 `GateDecision` 說「沒有記錄 decision 時就等待」，描述不精確 | Info | 事實成立：不顯示選擇的頁面只等 `evaluate` 跑完。只是文件精確度問題，信心 0.85 | 已修正 |
| C5 刪除失敗時的新理由只涵蓋被擋住或逾時，沒涵蓋被 error 拒絕 | Info，信心 0.3 | 大致成立：被 error 拒絕時資料庫還在，這時單獨 sweep 就是只清一半。不是漏洞，信心 0.8 | 已修正：兩種情況都寫進去，並說明這個狀態提供的 reload 會保留 start record |
| C6 `evaluate` 的 guard 與 continue `v-if` 的 `!databaseDeleted` 沒有測試碰到 | Low，既有問題 | 事實成立；屬於 upstream hard exclusion 第 7、11 項；兩者目前都不會改變可觀察的行為。不是漏洞，信心 0.9 | 已記入覆蓋率表並交給 T-0009 |

## 給 epic 收尾串連分析的備註

- C1、C2：「旗標不會單獨成立」以及 `evaluate` guard 走不到，這兩點都依賴「`evaluate` 每份文件只在 mount 時跑一次」。日後如果新增 `evaluate` 的呼叫點，這兩道防護會變成實際生效的條件，收尾時要和沒有測試的情況（C6）一起評估。
- C3：語系導向在選擇開著時的延後，目前沒有記錄理由。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 跨 ticket 的串連分析（epic 收尾時做）
- 沒有重現「兩個 `evaluate` 同時在跑」的情境，C1、C2 的相關判斷只靠推理。
