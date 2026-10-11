# 安全審查：T-0004（第 7 階段）

日期：2026-10-11。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `2197d5b`，merge-base `2197d5b`，HEAD `af9e6e9`，分支 `tickets/T-0004/sweep-failure-copy`。
- committed：`34bac92`（T-0003 完成紀錄，只有 Markdown）、`af9e6e9`（三句 gate 文案、註解、`CONTEXT.md`、測試與 ticket）。
- pending：無。untracked：無相關檔案。
- 方法：
  - 候選審查一輪（`harness-reviewer`）。
  - 四個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否誤報。
  - 主 session 用 `git diff -U0` 確認 `SessionGate.vue` 與 `useSessionGate.ts` 的增刪行都在註解裡。
  - 主 session 掃過兩個 commit 的 message 本文，沒有本機路徑、email、token 或 secret。
  - 安全判斷都是程式碼推論。測試與建置結果記在 T-0004 ticket。

## 結論

沒有確認的安全缺陷。產品上唯一的改動是 en、zh-TW 各三句靜態文案，經 `$t` 以文字插值輸出，沒有 `v-html`，也沒有新的插值參數；文案裡沒有 vue-i18n 的特殊字元（`{`、`}`、`@`、`$`、`|`）。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| F1 掃除失敗後，下一次執行的刪除被擋住時，畫面仍依 `databaseDeleted` 顯示「資料庫已刪除」與 `sweep_failed` | Low，信心 0.45／0.8 | 屬實，但不是本次引入：選擇邏輯只改了註解，舊文案在同一狀態下同樣不實。新的 hint 去掉了「關掉其他分頁也不會刪掉」這個與原始錯誤矛盾的補救，比舊文案好。不跨信任邊界：進度存取仍被擋，不寫 marker。不是安全缺陷，信心 0.9 | 不處理；依 phase 選 body 與報告是 T-0005（T19～T25），dismiss 出口是 T-0006 |
| F2 「救不回來」可能被另一個分頁記憶體裡的 attack session 寫回推翻 | Info／Low，信心 0.4 | 機制屬實，與舊文案相同。寫回的分頁本來就在目前學習者眼前，不跨信任邊界。不是安全缺陷，信心 0.85 | 不處理；屬 T41，由 T-0009 寫進 `OPEN-QUESTIONS.md` |
| F3 「其他項目」沒有說出殘留可能是前一位學習者的草稿與已存請求 | Low／Info，信心 0.35 | 與舊文案同樣籠統；zh-TW 的「項目」是 round-2 R-11 為了改善揭露而定的。按下刪除前，目前學習者本來就讀得到這些殘留。不是安全缺陷，信心 0.9 | 不處理；文案由 spec 逐字固定，要改需修訂 spec |
| F4 hint 的「delete」與按鈕標籤不逐字對應 | Info（UX） | 與舊文案相同；畫面上只有一個刪除按鈕。不是安全缺陷，信心 0.95 | 不處理 |

排除的候選：vue-i18n 語法造成 render 或 build 失敗、XSS、只在測試瀏覽器生效的 `Storage.prototype.removeItem` patch、詞彙表措辭。

## 給 T-0009 與 epic 收尾的備註

- T41 的字面只涵蓋「掃除失敗之後」與「寫 marker 到重新載入之間」。複核另外指出一段：成功清除並重新載入之後，另一個仍開著的分頁把記憶體裡的 attack session 寫回；這時 marker 已存在，gate 不會再問。這不是本次引入，也不跨信任邊界，但 T-0009 寫 T41 時應一併記錄。信心 0.4，P2。
- F1 與 T-0003 審查的 C1、C4 同屬「刪除可能還在排隊時，畫面描述或出口不符現況」，待 T-0005、T-0006 合併後在收尾串連分析中重新確認。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 跨 ticket 的串連分析（epic 收尾時做）
- F1、F2 的路徑沒有在瀏覽器重現。
