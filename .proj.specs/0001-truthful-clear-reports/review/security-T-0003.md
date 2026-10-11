# 安全審查：T-0003（第 7 階段）

日期：2026-10-11。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `f480dcf`，merge-base `f480dcf`，HEAD `7badeb0`，分支 `tickets/T-0003/clear-failure-phase`。
- committed：`410f125`（T-0002 完成紀錄，只有 Markdown）、`7badeb0`（`useSessionGate` 新增 `clearFailurePhase`、composable 測試、ticket）。
- pending：無。untracked：無相關檔案。
- 方法：
  - 候選審查一輪（`harness-reviewer`）。
  - 五個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否為誤報。
  - 主 session 另外掃過兩個 commit 的 message 本文，沒有本機路徑、email、token 或 secret。
  - 全部是程式碼推論，沒有在瀏覽器實測。

## 結論

沒有確認的安全缺陷。

- 產品程式碼的改動只有一個 module-level 狀態：在兩個 catch 區塊裡設定，在 start record 確定寫入後歸零，並以唯讀方式暴露。
- 目前沒有任何元件或存取判斷讀這個欄位：`isProgressAccessAllowed`、`hasGateDecision`、`shouldPresentGateHere`、`keepExistingData`、`dismissClearFailure` 都不讀它。
- 成功路徑的條件沒有改變。
- 單次執行的 guard 仍在最前面，到歸零之間沒有 `await`。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| C1 前一輪失敗後，被拒的按壓保留舊 phase，但仍把 error 換成 sentinel、把 `clearStarted` 清成 false | INFO | 屬實，但只有 P10b 會讓「繼續」被接受（P10 有 `databaseDeleted` 擋著）。sentinel 與 `clearStarted` 的處理在 base 就存在（traceability 的 `clearStarted` 列：`72327e2` 的 `useSessionGate.ts:479`）；保留 phase 正是 T9 的要求。不跨信任邊界：「繼續」本來就是把資料交給目前學習者的選項，排隊中的刪除只影響目前學習者自己的資料。不是安全缺陷，信心 0.85 | 不處理；正確性由 T-0007 負責（T9、T10a、T10f），ticket 已記錄為 Spec F-7 |
| C2 `clearInFlight` 註解說「request outstanding 時為 true」，但逾時或被擋的刪除被拒後，請求仍在排隊 | LOW／INFO | 註解不精確屬實；這句在 base 就有，本次只延伸後半句。刪除被拒後允許再按是 P7 與 T10 依賴的行為；重複刪除同一個資料庫是冪等的。不是安全缺陷，信心 0.9 | 不處理；留給 T-0008（註解清理） |
| C3 新文件裡 phase 是 null，但 `clearStarted` 會還原 | INFO | 刻意設計（module-level，只描述本文件的執行），有測試釘住。存取由 `clearStarted` 擋下，不依賴 phase。「未來的讀者誤讀 null」是對還不存在的程式碼的假設。不是安全缺陷，信心 0.9 | 不處理；T-0005、T-0006 審查時確認選擇規則先看 `clearStarted` |
| C4 composable 的 `dismissClearFailure` 還沒檢查 phase === 'sweep' | INFO | 屬實，在 base 就存在，本次沒有改動。dismiss 不寫 marker，進度存取仍被擋；前一位學習者的資料庫在第一輪已經刪除。不是安全缺陷，是 spec 合規缺口，信心 0.9 | 不處理；由 T-0006 負責（T12、T13） |
| C5 catch 裡的 `String(err)` 遇到特殊值會拋錯，phase 不會被設定，刪除路徑的 `clearInFlight` 會卡住 | INFO | 理論上成立，實際上到不了：`deleteDatabase` 只會以 `Error` 或 `DOMException` reject，外部無法控制。卡住的條件在 base 就有。sweep 的 catch 執行時 `clearInFlight` 早已歸零，候選對這點的描述有誤。不是安全缺陷，信心 0.95 | 不處理 |

## 給 epic 收尾串連分析的備註

C1 與 C4 都屬於「刪除可能還在排隊時，gate 接受了答案或被關閉」。兩者疊在一起，後果仍只落在目前學習者自己的資料上，看不出能組成跨邊界的攻擊鏈。T-0006、T-0007 合併後要重新確認。信心 0.3，P2。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 呈現層審查（元件沒有改動）
  - 跨 ticket 的串連分析（epic 收尾時做）
- 沒有執行測試、建置或瀏覽器來驗證這些結論；測試與建置的結果記在 T-0003 ticket 的驗證段落。
