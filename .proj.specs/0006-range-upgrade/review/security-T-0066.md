# T-0066 第 7 階段安全審查

依專案版 `.claude/skills/security-review/SKILL.md`（不是內建的同名指令）。

## 範圍

- checkout：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0066/chain-fixes`。
- base `de9c0d4017c39f264b9d371947c1dfefb553ef14`（`main`），HEAD `4c4679fbb727f404fbfabfb8a1ad561cc73648a8`。
- 已 commit 的變更：`git diff de9c0d4...4c4679f`（568 行），內容包括：
  - `merge-plan.mjs` 的 P-10；
  - `upgrade-report.mjs` 的 `restoreCommandLine()`；
  - `messages.mjs` 的 UP-E09；
  - 4 個測試檔；
  - spec revision 3.4 與 revision 3 的串連分析。
- pending 變更 0 筆，untracked 0 筆。

## 方法

workflow `wf_b07a05bc-ec4`（2026-11-10），與第 6 階段的兩軸 code review 一起跑。

1. 一個 `harness-reviewer` 列出所有候選，不自行判定誤報。
2. 每個候選交給另一個獨立的 `harness-reviewer` 判定。

全部只讀。攻擊者位置有三種：

- `--from <commit>` 的 archive 內容（D17）；
- B3；
- 老師的環境，包括 WSL `/mnt/c`、PowerShell 5.1 與 7、cmd，以及 git 2.26 以上。

## 結論

確認 2 項，都是 low，而且都不是可利用的缺陷，已在這張 ticket 修正：

- **C7（low，0.88）：** AC-10 沒有跟著 D23 改。spec 同步漏改，已修正。
- **C10（low，0.6）：** R5 與 UP-E09 沒有說明這一行要在靶場最上層執行。這是既有的前提，spec 沒有寫出來。已在 spec 的「Nothing is committed」段補上，同一段也補上 PowerShell 5.1 的替代做法。

另外 8 個候選判定為誤報（信心 0.78～0.86）。本報告只代表這次 diff 沒有發現新的可利用缺陷。

## 被排除的候選

| 候選 | 處置與理由 |
|---|---|
| C1 PowerShell 5.1 不接受 `&&`，老師可能自己拆成兩個指令 | 誤報（0.85）。PowerShell 5.1 會拒絕整行，兩個指令都不會執行，所以是 fail-closed。D23 之前印的就是兩個獨立指令，所以沒有變差。spec 已補上替代做法 |
| C2 `&&` 讓 clean 不執行，但沒說失敗之後要怎麼做 | 誤報（0.85）。升級不會動 ignore 檔（P-7），檔案層級的別名也有 P-10 擋下，所以照 R5 在其他改動之前還原，不會刪掉被 ignore 的檔案 |
| C3 P-10 不檢查上層資料夾 | 誤報（0.8）。這個缺口在本 diff 之前就存在，本 diff 把它縮小了；B4 列為接受的殘餘風險，新路徑只來自 T（B2） |
| C4 P-10 的錯誤處理用 `err.message` | 誤報（0.86），只是一致性問題。已改為 `err?.message ?? String(err)` |
| C5 P-10 一律報 UP-A15，但它也會攔下不是別名的情況 | 誤報（0.8）。結果是保守的；revision 3.4 的自我檢查已寫明其他可能的情況 |
| C6 測試沒有驗證「checkout 失敗時 clean 不跑」 | 誤報（0.85）。這是測試覆蓋的觀察，不是缺陷。`&&` 的語意由 shell 決定；第 8 階段已在終端機以 shell 執行印出的那一行 |
| C8 UP-E09 在指令後面直接接自然語言，複製時容易選多 | 誤報（0.78）。本 diff 之前就是這樣；這屬於體驗問題 |
| C9 `git` 被包裝成 shim 時，沒有傳回 git 的結束碼 | 誤報（0.8）。這是老師自己的環境，與本 diff 無關 |

## 排除的涵蓋範圍

- 沒有做相依套件掃描。
- 沒有在 WSL、PowerShell 5.1 或 cmd 上實測；`&&` 在各 shell 的行為依它們的文件推論。
- 跨 ticket 的串連分析見 `chain-analysis-revision-3.md`。這張 ticket 就是它開出來的修正。
