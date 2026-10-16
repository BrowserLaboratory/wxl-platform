# 第 7 階段資安審查：T-0022

範圍：分支 `tickets/T-0022/setup-questions-and-engine`，base `6fbb1c2`（審查時為 staged、尚未 commit）。審查 create-wxl 的 step 3 資料夾提問、step 4 的互動重問、step 5 的非互動旗標與互動 S1–S6（含第二輪與 EOF），step 11 以 engine 套用設定（CW-E12、warnings），以及它們的測試。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」（B1 下載的 archive、B4 目標資料夾、B5 終端機輸出）。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 6 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | engine warnings 原樣印到終端機，warning 裡可能有從靶場讀到的檔名（B5） | true positive，未達門檻（low）：能控制 archive 的人本來就能經由 `pnpm install` 執行程式碼 | 已修正（第 6 階段）：warnings 以 JSON 字串字面值印出，有測試；DEL、C1 的跳脫已在 T-0021 加入 `jsonValue` |
| 02 | 上面那一點沒有測試保護 | true positive，未達門檻（low） | 已修正，與 01 同一個測試 |
| 03 | CW-E12 的收尾命令與 N1 會印出使用者給的資料夾與答案，含控制字元時會到終端機 | true positive，未達門檻（low） | 延後：「含控制字元時不印命令」與 `./` 前綴屬 T-0024 的 C60；單引號跳脫正確，沒有 shell injection |
| 04 | step 4 檢查目標之後到 step 10 搬移之間，人工作答讓競態窗口變長，之後 engine 又寫入目標 | 模型外（B4：另一個行程同時寫入目標） | 延後：step 10 的重新檢查屬 T-0024 的 C53／C54；建議 T-0024 加一列「作答期間目標被換成 symlink」 |
| 05 | 兩次提問之間抵達的輸入行沒有 listener，會遺失（先打字或一次貼上多行） | hardening（可用性與設定完整性） | 已修正（第 6 階段）：輸入行先進佇列再取用，有測試 |
| 06 | 回答 `~` 之後又印出一次過時的 CW-E04 | hardening（無資安影響） | 已修正（第 6 階段），有測試 |

## 沒有涵蓋

dependency scanning、可用性；真實終端機上的提問（TTY、Ctrl-C、type-ahead 的實際行為，T-0025 的 0005-S4）；訊號（T-0024 的 C56）；git 步驟（T-0023）。所有判斷來自讀碼。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。
