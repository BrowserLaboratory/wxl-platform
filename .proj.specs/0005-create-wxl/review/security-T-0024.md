# 第 7 階段資安審查：T-0024

範圍：分支 `tickets/T-0024/failures-signals-language-escaping`，base `8fb2d34`（審查時為 staged、尚未 commit）。審查 create-wxl 的失敗處理與清理（step 8–10 的 CW-E09、CW-E11 回復、step 10 重新檢查目標、CW-E14）、訊號（SIGINT／SIGTERM／SIGHUP 的 guard、各步驟窗口、CW-W05）、語言選擇，以及外來值的跳脫與含控制字元時不印出供複製的指令（C60），和它們的測試。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」（B1 下載的 archive、B4 目標資料夾、B5 終端機輸出）。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 14 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。多數是規格保證的缺口（訊號、回復、錯誤分類），已在第 6 階段一併修正。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | step 9 最後一次寫入或 step-10 檢查點收到訊號後，仍把整個靶場搬進目標 | true positive，未達門檻（low） | 已修正（第 6 階段）：之後不再開始任何檔案操作，目標維持原狀，有測試 |
| 02 | 訊號加上搬回失敗時，暫存資料夾被刪、沒有點名留下的 entry | true positive，未達門檻（low） | 已修正：保留暫存資料夾，CW-E11 點名每個 entry 與資料夾，exit 130，有測試 |
| 03 | `cd` 被扣住時，其他收尾指令仍印出 | hardening：符合規格字面（只扣含控制字元的指令） | 記錄 |
| 04 | 整個資料夾 rename、之後的 chmod／rmdir 失敗被歸成 CW-E14 | true positive，未達門檻（low） | 已修正：都是 CW-E11，可能時先搬回，有測試 |
| 05 | 重新檢查與逐項搬入之間，目標被換成符號連結 | 模型外（B4：另一個行程同時寫入目標） | 記錄 |
| 06 | 失敗路徑裡的清理本身失敗時，變成 rejection | hardening：需要外部行程改權限，屬模型外 | 記錄 |
| 07 | step 11–13 的 CW-E14 沒有列出剩下的指令 | true positive（無資安影響） | 已修正，有測試 |
| 08 | 雙向控制字元、零寬字元原樣印出 | hardening：規格只要求處理 C0、DEL、C1 | 記錄 |
| 09 | 新的跳脫寫法讓孤立代理原樣輸出（舊版 `JSON.stringify` 會跳脫） | true positive（無資安影響，本 diff 的退化） | 已修正：寫成 `\uXXXX`，有測試 |
| 10 | `CREATE_WXL_COMMIT` 格式不對時印出它的值 | 誤報：C60 matrix 要求印出；環境變數屬受信任範圍 | 不需修改 |
| 11 | 值裡的換行寫成 `\u000a`，與已核准的 D10（`\n`）相反 | true positive（規格符合度） | 已修正：依 D10 改回 `\n`，其他 C0、DEL、C1 為 `\uXXXX` |
| 12 | Node 的 `ERR_*` 錯誤被當成檔案系統錯誤（CW-E09） | true positive（無資安影響） | 已修正：歸為 CW-E14，有測試 |
| 13 | CW-W05 列出其實已經成功的 git 指令 | true positive（無資安影響） | 已修正，有測試 |
| 14 | 收到訊號後才發現的失敗以 exit 1 結束，而不是 130 | true positive（無資安影響） | 已修正 step 4、6 的情況，有測試；`runForkInit` 是同步呼叫，期間的訊號在之後的檢查點處理 |

## 沒有涵蓋

dependency scanning、可用性；真實終端機送出的訊號、TTY 的 readline `SIGINT`、`bin` 對 `process` 的接線（T-0025 的 0005-S4）；Windows 上的行為（T-0025 的 cross-OS CI）。所有判斷來自讀碼與行程內測試。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。
