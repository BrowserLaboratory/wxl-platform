# 安全審查：T-0006（第 7 階段）

日期：2026-10-13。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `5cb77af`，merge-base `5cb77af`，HEAD `3d7bcb3`，分支 `tickets/T-0006/exits-by-phase`。
- committed：`379c372`（T-0005 完成紀錄，只有 Markdown）、`3d7bcb3`（reload 與 dismiss 依失敗階段決定、composable 的 dismiss 檢查、測試、ticket）。
- pending：審查後修正的兩段註解（見「審查後的修正」），沒有程式行為改動。untracked：無相關檔案。
- 方法：
  - 候選審查一輪（`harness-reviewer`）。
  - 四個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否為誤報。
  - 主 session 掃過 commit message 本文，沒有本機路徑、email、token 或 secret。
  - 判斷都是程式碼推論。

## 結論

沒有確認的安全缺陷。

這次變更收緊了出口：新的 dismiss 條件只在 phase 是 `'sweep'` 時成立。這時本輪的刪除已經 resolve，`databaseDeleted` 一定是 true，所以新條件是舊條件的嚴格子集。reload 只在 P7、P8 新增出現，其他狀態不變。progress access 與 continue 的規則沒有改。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| I-1 P7、P8 改走 reload 到站台根目錄後，新文件會還原 `clearStarted`，延後的語系導向會一直等；`index.ts` 有一段說 `wxl-locale` 會被刪的過時註解 | Info，信心 0.75 | 行為屬實，但 P2、P3 早就是這樣，spec 的 P11b 也明列 P7、P8；導向除了清除成功之外，也可以在下一次停在掃除時 dismiss 放行。不跨信任邊界。不是安全缺陷，信心 0.95 | 不處理；過時註解交給 T-0008 |
| I-2 gate 不是 modal，後方頁面仍可操作；沒有檢查 gate 的 save 會在排隊的刪除完成後重建資料庫 | Info，信心 0.6 | 屬實，屬既有設計。寫入的只會是目前學習者的新 session（`hasGateDecision()` 為 false）。不跨信任邊界。不是安全缺陷，信心 0.9 | 不處理行為；dismiss 理由的說法已收窄，見下方；記入 epic 收尾串連分析 |
| I-3 dismiss 的說明「nothing is still pending」跨分頁時太滿 | Info，信心 0.5 | 措辭由本 ticket 引入；同一分頁內成立，跨分頁時另一個分頁之後才發出的刪除可能還在排隊；只影響目前學習者自己的資料。不是安全缺陷，信心 0.9 | 已修正措辭 |
| I-4 dismiss 的推論依賴「同一資料庫的刪除依序處理」，只在 Chromium 實測 | Info，信心 0.4 | 依序處理是 IndexedDB 規格的要求，不是實作細節；Firefox、WebKit 沒有實測；最壞情況只影響目前學習者自己的資料。不是安全缺陷，信心 0.9 | 記為跨瀏覽器驗證缺口，交給 epic 收尾 |

獨立複核另外逐一代入各狀態，沒有找到本次引入、而候選審查沒提出的安全缺陷。P10c 失去 dismiss 在安全上是收緊；沒有任何出口這件事，已在第 6 階段由使用者選 A 接受。

## 審查後的修正

只改註解：
- `useSessionGate.ts` 的 `dismissClearFailure` 說明與 `SessionGate.vue` 的 dismiss 註解，改成「在它之前發出的刪除都不會還在排隊」。
- 原本說「頁面留下就會把 attack session 寫回」，改成「關掉報告會讓學習者以為清除已完成而繼續，記憶體裡的 session 會在刪除完成後寫回；reload 會丟掉這個 session」。

## 給 epic 收尾串連分析的備註

- I-2：gate 不是 modal，而且大部分 save 沒有檢查 gate。拿掉 dismiss 只是不再邀請學習者原地繼續，後方頁面的寫入空窗仍在。這和 T-0003 的 C1、C4，T-0004 的 F1，T-0005 的 F-1、F-2、F-4 同屬「刪除可能還在排隊時」一類。
- I-4：Firefox、WebKit 沒有實測刪除的處理順序。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 跨 ticket 的串連分析（epic 收尾時做）
- 沒有在瀏覽器重現 I-1 到 I-4。
