# 第 7 階段資安審查：T-0020

範圍：分支 `tickets/T-0020/no-setup-tracer`，base `de397ca`（審查時為 staged、尚未 commit）。審查新的 `create-wxl/` 套件：`run(argv, io, deps)` 的 `--no-setup` 路徑（文法、套件來源紀錄與引擎雜湊、目標資料夾、下載、`tar` 嚴格解析、解壓、P1–P4、搬移、下一步）與它的測試。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 12 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。下載的 archive 是信任邊界（B1），但本 ticket 只交付 happy path；嚴格的 entry 規則由後續 ticket 依已認領的列實作，在那之前 create-wxl 不會發布。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | entry 路徑沒有封閉在暫存目錄內（`..` 等） | 模型外／由後續列涵蓋：規則 3 屬 T-0021（C18）；上游 tree 不會有 `..` | T-0021 實作規則 3，並在寫入前確認路徑留在暫存目錄內 |
| 02 | 可能寫出 `.git` 路徑 | 同上（規則 3） | T-0021 |
| 03 | 沒有比對 pax `comment` 與第一層路徑 | hardening：規則 2 屬 T-0021（C19） | T-0021 |
| 04 | 連結、裝置等型別沒有拒絕 | hardening：規則 1 屬 T-0021（C17） | T-0021 |
| 05 | step 10 沒有重查 target | 模型外（並行改寫的行程）：C53 屬 T-0024 | T-0024；本 ticket 的 Notes 誤寫為此處實作，已在 coverage report 更正 |
| 06 | rename 之後的 `chmod` 理論上可能跟隨被替換的連結 | 模型外 | 記錄：縱深防禦，可之後評估 |
| 07 | `lstat(target)` 的任何錯誤都當作不存在 | hardening | 已修正（第 6 階段）：只有 `ENOENT` 算不存在 |
| 08 | DEL、C1 沒有跳脫；錯誤訊息沒有經過跳脫 | hardening：C60 屬 T-0024 | 錯誤訊息的跳脫已修正（第 6 階段）；DEL、C1 留給 T-0024 |
| 09 | 第 8–10 步失敗時沒有清理暫存目錄 | hardening：C30、C54 屬 T-0021／T-0024 | 後續 ticket |
| 10 | 非數字的 Node 版本字串被當成合格 | hardening | 已修正（第 6 階段），有測試 |
| 11 | 父目錄是 symlink 時誤判為不存在 | 誤報（不是資安問題，是功能缺陷） | 已修正（第 6 階段），有測試 |
| 12 | coverage report 沒有如實列出未涵蓋的部分 | 屬實，非資安 | 已更正 ticket 紀錄 |

## 沒有涵蓋

dependency scanning（`tar` 7.5.22、`yaml` 2.9.0）、可用性；真正的下載器與 `bin`（T-0025）；所有判斷來自讀碼，沒有重現。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。
